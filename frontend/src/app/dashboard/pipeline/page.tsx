"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useApplications, useUpdateApplicationStatus, applicationKeys } from "@/lib/hooks/useApplications";
import { screeningApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Send, Sparkles, Plus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Application {
    id: string;
    status: string;
    match_score?: number;
    ai_score?: number;
    email_delivery_status?: string;
    candidate?: { full_name?: string; email?: string };
    job?: { title?: string };
    screening_test?: { status: string; score: number | null; correct_count?: number | null; total_questions?: number | null };
}

const parseRawQuestions = (value: string) =>
    value
        .split(/\n+/)
        .map((question) => question.replace(/^\s*(?:\d+[\).\-\s]+|[-*]\s+)/, "").trim())
        .filter(Boolean);

// ─── Column config ────────────────────────────────────────────────────────────

type ColumnDef = {
    label: string;
    status: string;
    topStrip: string;
    headerText: string;
    countBg: string;
    countText: string;
    avatarBg: string;
    avatarText: string;
    cardsBg: string;
    muted?: true;
    showNotes?: true;
};

const COLUMNS: ColumnDef[] = [
    {
        label: "Applied",
        status: "APPLIED",
        topStrip: "bg-indigo-500",
        headerText: "text-indigo-700",
        countBg: "bg-indigo-100",
        countText: "text-indigo-700",
        avatarBg: "bg-indigo-100",
        avatarText: "text-indigo-700",
        cardsBg: "bg-indigo-50/30",
    },
    {
        label: "Screening",
        status: "SCREENING",
        topStrip: "bg-blue-500",
        headerText: "text-blue-700",
        countBg: "bg-blue-100",
        countText: "text-blue-700",
        avatarBg: "bg-blue-100",
        avatarText: "text-blue-700",
        cardsBg: "bg-blue-50/30",
    },
    {
        label: "Shortlisted",
        status: "SHORTLISTED",
        topStrip: "bg-violet-500",
        headerText: "text-violet-700",
        countBg: "bg-violet-100",
        countText: "text-violet-700",
        avatarBg: "bg-violet-100",
        avatarText: "text-violet-700",
        cardsBg: "bg-violet-50/30",
    },
    {
        label: "Screening Test",
        status: "SCREENING_TEST",
        topStrip: "bg-sky-500",
        headerText: "text-sky-700",
        countBg: "bg-sky-100",
        countText: "text-sky-700",
        avatarBg: "bg-sky-100",
        avatarText: "text-sky-700",
        cardsBg: "bg-sky-50/30",
    },
    {
        label: "Interview Scheduled",
        status: "INTERVIEW_SCHEDULED",
        topStrip: "bg-amber-500",
        headerText: "text-amber-700",
        countBg: "bg-amber-100",
        countText: "text-amber-700",
        avatarBg: "bg-amber-100",
        avatarText: "text-amber-700",
        cardsBg: "bg-amber-50/30",
    },
    {
        label: "Interview Completed",
        status: "INTERVIEW_COMPLETED",
        topStrip: "bg-orange-500",
        headerText: "text-orange-700",
        countBg: "bg-orange-100",
        countText: "text-orange-700",
        avatarBg: "bg-orange-100",
        avatarText: "text-orange-700",
        cardsBg: "bg-orange-50/30",
    },
    {
        label: "Rejected",
        status: "REJECTED",
        topStrip: "bg-slate-400",
        headerText: "text-slate-500",
        countBg: "bg-slate-100",
        countText: "text-slate-500",
        avatarBg: "bg-slate-100",
        avatarText: "text-slate-500",
        cardsBg: "bg-slate-50/60",
        muted: true,
    },
    {
        label: "Reference Check",
        status: "REFERENCE_CHECK",
        topStrip: "bg-cyan-500",
        headerText: "text-cyan-700",
        countBg: "bg-cyan-100",
        countText: "text-cyan-700",
        avatarBg: "bg-cyan-100",
        avatarText: "text-cyan-700",
        cardsBg: "bg-cyan-50/30",
        showNotes: true,
    },
    {
        label: "Offer Extended",
        status: "OFFER_EXTENDED",
        topStrip: "bg-emerald-500",
        headerText: "text-emerald-700",
        countBg: "bg-emerald-100",
        countText: "text-emerald-700",
        avatarBg: "bg-emerald-100",
        avatarText: "text-emerald-700",
        cardsBg: "bg-emerald-50/30",
    },
    {
        label: "Offer Accepted",
        status: "OFFER_ACCEPTED",
        topStrip: "bg-teal-500",
        headerText: "text-teal-700",
        countBg: "bg-teal-100",
        countText: "text-teal-700",
        avatarBg: "bg-teal-100",
        avatarText: "text-teal-700",
        cardsBg: "bg-teal-50/30",
    },
    {
        label: "Hired",
        status: "HIRED",
        topStrip: "bg-green-500",
        headerText: "text-green-700",
        countBg: "bg-green-100",
        countText: "text-green-700",
        avatarBg: "bg-green-100",
        avatarText: "text-green-700",
        cardsBg: "bg-green-50/30",
    },
];

// Build a map from status → next status for quick lookup
const NEXT_STATUS: Record<string, string> = {};
COLUMNS.forEach((col, i) => {
    if (i < COLUMNS.length - 1) {
        NEXT_STATUS[col.status] = COLUMNS[i + 1].status;
    }
});
NEXT_STATUS["INTERVIEW_INVITED"] = NEXT_STATUS["INTERVIEW_SCHEDULED"];
NEXT_STATUS["SENT"] = NEXT_STATUS["INTERVIEW_SCHEDULED"];
NEXT_STATUS["RESPONDED"] = NEXT_STATUS["INTERVIEW_SCHEDULED"];

// Build a reverse map: status → previous status
const PREV_STATUS: Record<string, string> = {};
COLUMNS.forEach((col, i) => {
    if (i > 0) {
        PREV_STATUS[col.status] = COLUMNS[i - 1].status;
    }
});
PREV_STATUS["INTERVIEW_INVITED"] = PREV_STATUS["INTERVIEW_SCHEDULED"];
PREV_STATUS["SENT"] = PREV_STATUS["INTERVIEW_SCHEDULED"];
PREV_STATUS["RESPONDED"] = PREV_STATUS["INTERVIEW_SCHEDULED"];

// ─── Summary bar config ───────────────────────────────────────────────────────

const SUMMARY: { label: string; statuses: string[] | null; color: string }[] = [
    { label: "Total", statuses: null, color: "text-indigo-700" },
    { label: "Applied", statuses: ["APPLIED"], color: "text-indigo-600" },
    { label: "Shortlisted", statuses: ["SHORTLISTED"], color: "text-violet-600" },
    {
        label: "Interviewing",
        statuses: ["INTERVIEW_SCHEDULED", "INTERVIEW_INVITED", "INTERVIEW_COMPLETED", "SENT", "RESPONDED"],
        color: "text-amber-600",
    },
    {
        label: "Offers",
        statuses: ["OFFER_EXTENDED", "OFFER_ACCEPTED"],
        color: "text-emerald-600",
    },
    { label: "Hired", statuses: ["HIRED"], color: "text-green-600" },
    { label: "Rejected", statuses: ["REJECTED"], color: "text-slate-500" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
    name
        ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
        : "??";

const scoreStyle = (score: number): string => {
    if (score > 70) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (score >= 40) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
};

const emailPill = (
    status: string | undefined
): { cls: string; dotCls: string; label: string } => {
    if (status === "SENT")
        return {
            cls: "bg-emerald-50 text-emerald-700",
            dotCls: "bg-emerald-500",
            label: "Email Sent",
        };
    if (status === "FAILED")
        return {
            cls: "bg-red-50 text-red-600",
            dotCls: "bg-red-500",
            label: "Email Failed",
        };
    return { cls: "bg-slate-100 text-slate-500", dotCls: "bg-slate-400", label: "Pending" };
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
    const router = useRouter();
    const [movingIds, setMovingIds] = useState<Set<string>>(new Set());
    const [screeningTarget, setScreeningTarget] = useState<Application | null>(null);
    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
    const [rawQuestionsText, setRawQuestionsText] = useState("");
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(20);
    const [questionCountToGenerate, setQuestionCountToGenerate] = useState(20);
    const [editorTab, setEditorTab] = useState<'list' | 'bulk'>('list');

    const { data: applications = [], isLoading } = useApplications();
    const updateStatus = useUpdateApplicationStatus();
    const queryClient = useQueryClient();

    const grouped = useMemo(
        () =>
            COLUMNS.map((col) => ({
                ...col,
                cards: applications.filter((app) => {
                    const s = (app.status || "").toUpperCase();
                    if (col.status === "INTERVIEW_SCHEDULED") {
                        return s === "INTERVIEW_SCHEDULED" || s === "INTERVIEW_INVITED" || s === "SENT" || s === "RESPONDED";
                    }
                    return s === col.status;
                }),
            })),
        [applications]
    );

    const summaryCounts = useMemo(
        () =>
            SUMMARY.map(({ statuses }) =>
                statuses === null
                    ? applications.length
                    : applications.filter((a) => statuses.includes((a.status || "").toUpperCase())).length
            ),
        [applications]
    );

    const handleGenerateQuestionsForApp = async (appId: string) => {
        setIsGeneratingQuestions(true);
        try {
            const count = Math.min(50, Math.max(1, Number(questionCountToGenerate) || 20));
            const res = await screeningApi.generateQuestions(appId, count);
            if (res.questions && res.questions.length > 0) {
                setRawQuestionsText(res.questions.map((q, i) => `${i + 1}. ${q}`).join("\n"));
                toast.success(`Generated ${res.questions.length} questions via LLM!`);
            } else {
                toast.error("No questions generated");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to generate AI questions");
        } finally {
            setIsGeneratingQuestions(false);
        }
    };

    // Special handler for Shortlisted → Screening Test:
    // calls POST /screening/create which creates the test, sends the email,
    // and updates the application status all in one request.
    const handleSendScreeningTest = async (e: React.MouseEvent, app: Application) => {
        e.stopPropagation();
        setScreeningTarget(app);
        setTimeLimitMinutes(20);
        handleGenerateQuestionsForApp(app.id);
    };

    const handleCloseScreeningDialog = () => {
        setScreeningTarget(null);
    };

    const handleSubmitScreeningQuestions = async () => {
        if (!screeningTarget) return;
        const rawQuestions = parseRawQuestions(rawQuestionsText);
        if (rawQuestions.length === 0) {
            toast.error("Please add at least one question.");
            return;
        }

        const app = screeningTarget;
        setMovingIds((prev) => new Set(prev).add(app.id));
        try {
            await screeningApi.create(app.id, {
                raw_questions: rawQuestions,
                time_limit_minutes: timeLimitMinutes,
            });
            await queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
            handleCloseScreeningDialog();
            toast.success("Screening test sent! Candidate moved to Screening Test.");
        } catch {
            toast.error("Failed to send screening test");
        } finally {
            setMovingIds((prev) => {
                const next = new Set(prev);
                next.delete(app.id);
                return next;
            });
        }
    };

    const handleRefCheck = async (
        e: React.MouseEvent,
        app: Application,
        targetStatus: "OFFER_EXTENDED" | "REJECTED"
    ) => {
        e.stopPropagation();
        setMovingIds((prev) => new Set(prev).add(app.id));
        try {
            await updateStatus.mutateAsync({ id: app.id, status: targetStatus });
            if (targetStatus === "OFFER_EXTENDED") {
                toast.success("Reference cleared! Moving to Offer Extended.");
            } else {
                toast.error("Reference failed. Candidate rejected.");
            }
        } catch {
            toast.error("Failed to update candidate");
        } finally {
            setMovingIds((prev) => {
                const next = new Set(prev);
                next.delete(app.id);
                return next;
            });
        }
    };

    const handleMoveToNext = async (e: React.MouseEvent, app: Application) => {
        e.stopPropagation();
        const nextStatus = NEXT_STATUS[app.status?.toUpperCase()];
        if (!nextStatus) return;

        setMovingIds((prev) => new Set(prev).add(app.id));
        try {
            await updateStatus.mutateAsync({ id: app.id, status: nextStatus });
            const nextLabel =
                COLUMNS.find((c) => c.status === nextStatus)?.label ?? nextStatus;
            toast.success(`Candidate moved to ${nextLabel}`);
        } catch {
            toast.error("Failed to move candidate");
        } finally {
            setMovingIds((prev) => {
                const next = new Set(prev);
                next.delete(app.id);
                return next;
            });
        }
    };

    const handleMoveBack = async (e: React.MouseEvent, app: Application) => {
        e.stopPropagation();
        const prevStatus = PREV_STATUS[app.status?.toUpperCase()];
        if (!prevStatus) return;
        setMovingIds((prev) => new Set(prev).add(app.id));
        try {
            await updateStatus.mutateAsync({ id: app.id, status: prevStatus });
            const prevLabel = COLUMNS.find((c) => c.status === prevStatus)?.label ?? prevStatus;
            toast.success(`Candidate moved back to ${prevLabel}`);
        } catch {
            toast.error("Failed to move candidate back");
        } finally {
            setMovingIds((prev) => {
                const next = new Set(prev);
                next.delete(app.id);
                return next;
            });
        }
    };

    const handleInterviewAction = async (
        e: React.MouseEvent,
        app: Application,
        targetStatus: "REFERENCE_CHECK" | "REJECTED"
    ) => {
        e.stopPropagation();
        setMovingIds((prev) => new Set(prev).add(app.id));
        try {
            await updateStatus.mutateAsync({ id: app.id, status: targetStatus });
            if (targetStatus === "REFERENCE_CHECK") {
                toast.success("Moving to Reference Check");
            } else {
                toast.error("Candidate rejected");
            }
        } catch {
            toast.error("Failed to update candidate");
        } finally {
            setMovingIds((prev) => {
                const next = new Set(prev);
                next.delete(app.id);
                return next;
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const isSendingScreening = screeningTarget ? movingIds.has(screeningTarget.id) : false;

    return (
        <div className="space-y-6">
            <Dialog open={!!screeningTarget} onOpenChange={(open) => !open && handleCloseScreeningDialog()}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between text-xl">
                            <span className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-indigo-600" />
                                Send Screening Test
                            </span>
                            {screeningTarget && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerateQuestionsForApp(screeningTarget.id)}
                                    disabled={isGeneratingQuestions || movingIds.has(screeningTarget.id)}
                                    className="text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                >
                                    {isGeneratingQuestions ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-3.5 w-3.5" />
                                    )}
                                    {isGeneratingQuestions ? `Generating ${questionCountToGenerate} AI Questions...` : "Regenerate AI Questions"}
                                </Button>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 overflow-y-auto pr-1 flex-1 my-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-800">Time Limit (Minutes)</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={180}
                                    value={timeLimitMinutes}
                                    onChange={(event) =>
                                        setTimeLimitMinutes(Math.min(180, Math.max(1, Number(event.target.value) || 1)))
                                    }
                                    className="h-9 text-sm font-bold text-slate-800 bg-white"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-800">AI Question Quantity</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={questionCountToGenerate}
                                    onChange={(event) =>
                                        setQuestionCountToGenerate(Math.min(50, Math.max(1, Number(event.target.value) || 1)))
                                    }
                                    className="h-9 text-sm font-bold text-indigo-700 bg-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    Screening Questions ({parseRawQuestions(rawQuestionsText).length})
                                </label>
                                <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setEditorTab('list')}
                                        className={`px-2.5 py-1 rounded-md transition-all ${editorTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Interactive List
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditorTab('bulk')}
                                        className={`px-2.5 py-1 rounded-md transition-all ${editorTab === 'bulk' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Bulk Text
                                    </button>
                                </div>
                            </div>

                            {isGeneratingQuestions ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-3 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/30">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                                    <p className="text-sm font-medium text-indigo-900">AI is crafting 20 screening questions based on candidate background &amp; job description...</p>
                                </div>
                            ) : editorTab === 'list' ? (
                                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                                    {parseRawQuestions(rawQuestionsText).length === 0 ? (
                                        <div className="p-6 text-center border-2 border-dashed rounded-xl text-sm text-slate-400">
                                            No questions yet. Click &quot;Regenerate AI Questions&quot; above or &quot;Add Question&quot; below.
                                        </div>
                                    ) : (
                                        parseRawQuestions(rawQuestionsText).map((qText, idx) => (
                                            <div key={idx} className="flex items-center gap-2 group">
                                                <span className="text-xs font-bold text-indigo-600 w-6 shrink-0 text-right">
                                                    {idx + 1}.
                                                </span>
                                                <Input
                                                    value={qText}
                                                    onChange={(e) => {
                                                        const current = parseRawQuestions(rawQuestionsText);
                                                        current[idx] = e.target.value;
                                                        setRawQuestionsText(current.map((q, i) => `${i + 1}. ${q}`).join("\n"));
                                                    }}
                                                    className="flex-1 text-sm font-sans"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                                                    onClick={() => {
                                                        const current = parseRawQuestions(rawQuestionsText);
                                                        const updated = current.filter((_, i) => i !== idx);
                                                        setRawQuestionsText(updated.map((q, i) => `${i + 1}. ${q}`).join("\n"));
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const current = parseRawQuestions(rawQuestionsText);
                                            current.push("Enter new question text here");
                                            setRawQuestionsText(current.map((q, i) => `${i + 1}. ${q}`).join("\n"));
                                        }}
                                        className="w-full mt-2 border-dashed text-xs text-slate-600 hover:text-indigo-600 hover:border-indigo-300 gap-1.5"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add Question
                                    </Button>
                                </div>
                            ) : (
                                <Textarea
                                    value={rawQuestionsText}
                                    onChange={(event) => setRawQuestionsText(event.target.value)}
                                    placeholder={"Paste or edit questions here, one per line.\nExample:\n1. What is React?\n2. Explain REST API.\n3. What is database indexing?"}
                                    className="min-h-[280px] font-mono text-sm"
                                />
                            )}

                            <p className="text-xs text-slate-500">
                                {parseRawQuestions(rawQuestionsText).length} question(s). LLM will auto-generate options and correct answers when sent.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={handleCloseScreeningDialog}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmitScreeningQuestions}
                            disabled={!screeningTarget || movingIds.has(screeningTarget.id) || isGeneratingQuestions}
                        >
                            {screeningTarget && movingIds.has(screeningTarget.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            Send Screening Test
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Page header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Candidate Pipeline</h1>
                <p className="text-muted-foreground mt-1">
                    Track every candidate&apos;s journey in real time.
                </p>
            </div>

            {/* Summary bar */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {SUMMARY.map(({ label, statuses, color }, i) => (
                    <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`rounded-xl border px-4 py-3 flex flex-col gap-0.5 bg-white border-slate-200 shadow-sm ${statuses === null ? "ring-1 ring-indigo-200 border-indigo-200 bg-indigo-50/50" : ""
                            }`}
                    >
                        <span className={`text-2xl font-bold ${color}`}>
                            {summaryCounts[i]}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    </motion.div>
                ))}
            </div>

            {/* Kanban board */}
            <div className="overflow-x-auto pb-6">
                <div className="flex gap-4" style={{ minWidth: "max-content" }}>
                    {grouped.map((col, colIndex) => (
                        <motion.div
                            key={col.status}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: colIndex * 0.04 }}
                            className={`w-[260px] flex flex-col rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${col.muted ? "opacity-75" : ""
                                }`}
                            style={{ minHeight: 500 }}
                        >
                            {/* Colored top strip */}
                            <div className={`h-1.5 w-full flex-shrink-0 ${col.topStrip}`} />

                            {/* Column header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
                                <span className={`text-sm font-semibold ${col.headerText}`}>
                                    {col.label}
                                </span>
                                <span
                                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${col.countBg} ${col.countText}`}
                                >
                                    {col.cards.length}
                                </span>
                            </div>

                            {/* Cards area */}
                            <div className={`flex-1 flex flex-col gap-2.5 p-3 ${col.cardsBg}`}>
                                {col.cards.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-xs text-muted-foreground select-none">
                                        No candidates
                                    </div>
                                ) : (
                                    col.cards.map((app) => {
                                        const name = app.candidate?.full_name || "Unknown";
                                        const score = app.match_score ?? app.ai_score ?? 0;
                                        const ep = emailPill(app.email_delivery_status);
                                        const nextStatus = NEXT_STATUS[app.status?.toUpperCase()];
                                        const nextLabel =
                                            nextStatus
                                                ? COLUMNS.find((c) => c.status === nextStatus)?.label
                                                : null;
                                        const prevStatus = PREV_STATUS[app.status?.toUpperCase()];
                                        const prevLabel =
                                            prevStatus
                                                ? COLUMNS.find((c) => c.status === prevStatus)?.label
                                                : null;
                                        const isMoving = movingIds.has(app.id);

                                        return (
                                            <motion.div
                                                key={app.id}
                                                whileHover={{ scale: 1.025 }}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 320,
                                                    damping: 22,
                                                }}
                                            >
                                                <Card
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/applications/${app.id}`
                                                        )
                                                    }
                                                    className="cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-200 border-border bg-white"
                                                >
                                                    <CardContent className="p-3 space-y-2.5">
                                                        {/* Avatar + name */}
                                                        <div className="flex items-center gap-2.5">
                                                            <Avatar className="h-9 w-9 border-2 border-white shadow-sm flex-shrink-0">
                                                                <AvatarFallback
                                                                    className={`${col.avatarBg} ${col.avatarText} text-xs font-bold`}
                                                                >
                                                                    {getInitials(name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold truncate leading-tight">
                                                                    {name}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {app.job?.title || "—"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="border-t border-slate-100" />

                                                        {/* AI Score badge — hidden on Screening Test column (replaced by test block) */}
                                                        {col.status === "HIRED" ? (
                                                            <span className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 w-full">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                Hired
                                                            </span>
                                                        ) : col.status === "SCREENING_TEST" ? null : score > 0 ? (
                                                            <Badge
                                                                variant="outline"
                                                                className={`w-full justify-center text-xs font-semibold h-6 ${scoreStyle(score)}`}
                                                            >
                                                                AI Score: {score}%
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className="w-full justify-center text-xs font-medium h-6 bg-slate-50 text-slate-400 border-slate-200"
                                                            >
                                                                No Score
                                                            </Badge>
                                                        )}

                                                        {/* Email status pill */}
                                                        <div
                                                            className={`flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${ep.cls}`}
                                                        >
                                                            <span
                                                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ep.dotCls}`}
                                                            />
                                                            {ep.label}
                                                        </div>

                                                        {/* Screening Test Info — only shown in the Screening Test column */}
                                                        {col.status === "SCREENING_TEST" && (
                                                            <div className="flex flex-col gap-1 text-[11px] p-2 bg-sky-50 border border-sky-100 rounded-lg">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-slate-500">Test:</span>
                                                                    <span className={`font-semibold ${app.screening_test?.status === "COMPLETED"
                                                                        ? "text-emerald-600"
                                                                        : "text-amber-600"
                                                                        }`}>
                                                                        {app.screening_test?.status === "COMPLETED" ? "Completed" : "Pending"}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-slate-500">Score:</span>
                                                                    <span className={`font-bold ${app.screening_test?.status === "COMPLETED"
                                                                        ? "text-indigo-600"
                                                                        : "text-slate-400"
                                                                        }`}>
                                                                        {app.screening_test?.correct_count != null && app.screening_test?.total_questions != null
                                                                            ? `${app.screening_test.correct_count}/${app.screening_test.total_questions}`
                                                                            : "—"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Reference Check notes */}
                                                        {col.showNotes && (
                                                            <RefCheckNotes appId={app.id} />
                                                        )}

                                                        {/* Reference Check actions */}
                                                        {col.status === "REFERENCE_CHECK" && (
                                                            <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex gap-1.5">
                                                                    <button
                                                                        onClick={(e) => handleRefCheck(e, app, "OFFER_EXTENDED")}
                                                                        disabled={isMoving}
                                                                        className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {isMoving ? <Loader2 className="h-3 w-3 animate-spin" /> : "✓ Cleared"}
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => handleRefCheck(e, app, "REJECTED")}
                                                                        disabled={isMoving}
                                                                        className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {isMoving ? <Loader2 className="h-3 w-3 animate-spin" /> : "✗ Failed"}
                                                                    </button>
                                                                </div>
                                                                {prevLabel && (
                                                                    <button
                                                                        onClick={(e) => handleMoveBack(e, app)}
                                                                        disabled={isMoving}
                                                                        className="w-full text-xs border border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 rounded px-2 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        ← Back
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Interview Completed: Reference Check or Reject */}
                                                        {col.status === "INTERVIEW_COMPLETED" && (
                                                            <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex gap-1.5">
                                                                    <button
                                                                        onClick={(e) => handleInterviewAction(e, app, "REFERENCE_CHECK")}
                                                                        disabled={isMoving}
                                                                        className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {isMoving ? <Loader2 className="h-3 w-3 animate-spin" /> : "✓ Reference Check"}
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => handleInterviewAction(e, app, "REJECTED")}
                                                                        disabled={isMoving}
                                                                        className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {isMoving ? <Loader2 className="h-3 w-3 animate-spin" /> : "✗ Reject"}
                                                                    </button>
                                                                </div>
                                                                {prevLabel && (
                                                                    <button
                                                                        onClick={(e) => handleMoveBack(e, app)}
                                                                        disabled={isMoving}
                                                                        className="w-full text-xs border border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 rounded px-2 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        ← Back
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Move to Next Stage + Move Back (all other columns) */}
                                                        {col.status !== "REFERENCE_CHECK" && col.status !== "INTERVIEW_COMPLETED" && (nextLabel || prevLabel) && (
                                                            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                {prevLabel && (
                                                                    <button
                                                                        onClick={(e) => handleMoveBack(e, app)}
                                                                        disabled={isMoving}
                                                                        className="text-xs border border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 rounded px-2 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                                                    >
                                                                        ← Back
                                                                    </button>
                                                                )}
                                                                {nextLabel && (
                                                                    <button
                                                                        onClick={(e) =>
                                                                            col.status === "SHORTLISTED"
                                                                                ? handleSendScreeningTest(e, app)
                                                                                : handleMoveToNext(e, app)
                                                                        }
                                                                        disabled={isMoving}
                                                                        className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {isMoving ? (
                                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                                        ) : (
                                                                            <>
                                                                                <span>→</span>
                                                                                <span>Move to {nextLabel}</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Reference Check Notes ────────────────────────────────────────────────────

function RefCheckNotes({ appId }: { appId: string }) {
    const key = `ref_check_notes_${appId}`;
    const [notes, setNotes] = useState(() => {
        if (typeof window === "undefined") return "";
        return localStorage.getItem(key) ?? "";
    });

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setNotes(value);
        localStorage.setItem(key, value);
    };

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-medium text-cyan-700 mb-1">Reference Notes</p>
            <textarea
                value={notes}
                onChange={handleChange}
                placeholder="e.g. Police clearance pending, Previous employer confirmed..."
                rows={3}
                className="w-full text-xs rounded-lg border border-cyan-200 bg-cyan-50/60 px-2 py-1.5 text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
        </div>
    );
}
