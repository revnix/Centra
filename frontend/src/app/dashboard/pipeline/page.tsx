"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
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
}

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
        label: "Onboarding",
        status: "ONBOARDING",
        topStrip: "bg-sky-500",
        headerText: "text-sky-700",
        countBg: "bg-sky-100",
        countText: "text-sky-700",
        avatarBg: "bg-sky-100",
        avatarText: "text-sky-700",
        cardsBg: "bg-sky-50/30",
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

// ─── Summary bar config ───────────────────────────────────────────────────────

const SUMMARY: { label: string; statuses: string[] | null; color: string }[] = [
    { label: "Total", statuses: null, color: "text-indigo-700" },
    { label: "Applied", statuses: ["APPLIED"], color: "text-indigo-600" },
    { label: "Shortlisted", statuses: ["SHORTLISTED"], color: "text-violet-600" },
    {
        label: "Interviewing",
        statuses: ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"],
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
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [movingIds, setMovingIds] = useState<Set<string>>(new Set());

    const fetchApplications = useCallback(() => {
        return api.applications
            .list()
            .then((res) => setApplications(res as Application[]))
            .catch(console.error);
    }, []);

    useEffect(() => {
        fetchApplications().finally(() => setIsLoading(false));
    }, [fetchApplications]);

    const handleRefCheck = useCallback(
        async (e: React.MouseEvent, app: Application, targetStatus: "OFFER_EXTENDED" | "REJECTED") => {
            e.stopPropagation();
            setMovingIds((prev) => new Set(prev).add(app.id));
            try {
                await api.applications.updateStatus(app.id, targetStatus);
                if (targetStatus === "OFFER_EXTENDED") {
                    toast.success("Reference cleared! Moving to Offer Extended.");
                } else {
                    toast.error("Reference failed. Candidate rejected.");
                }
                await fetchApplications();
            } catch {
                toast.error("Failed to update candidate");
            } finally {
                setMovingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(app.id);
                    return next;
                });
            }
        },
        [fetchApplications]
    );

    const handleMoveToNext = useCallback(
        async (e: React.MouseEvent, app: Application) => {
            e.stopPropagation();
            const nextStatus = NEXT_STATUS[app.status?.toUpperCase()];
            if (!nextStatus) return;

            setMovingIds((prev) => new Set(prev).add(app.id));
            try {
                await api.applications.updateStatus(app.id, nextStatus);
                const nextLabel =
                    COLUMNS.find((c) => c.status === nextStatus)?.label ?? nextStatus;
                toast.success(`Candidate moved to ${nextLabel}`);
                await fetchApplications();
            } catch {
                toast.error("Failed to move candidate");
            } finally {
                setMovingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(app.id);
                    return next;
                });
            }
        },
        [fetchApplications]
    );

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const grouped = COLUMNS.map((col) => ({
        ...col,
        cards: applications.filter(
            (app) => (app.status || "").toUpperCase() === col.status
        ),
    }));

    const statCount = (statuses: string[] | null) =>
        statuses === null
            ? applications.length
            : applications.filter((a) =>
                  statuses.includes((a.status || "").toUpperCase())
              ).length;

    return (
        <div className="space-y-6">
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
                        className={`rounded-xl border px-4 py-3 flex flex-col gap-0.5 bg-white border-slate-200 shadow-sm ${
                            statuses === null ? "ring-1 ring-indigo-200 border-indigo-200 bg-indigo-50/50" : ""
                        }`}
                    >
                        <span className={`text-2xl font-bold ${color}`}>
                            {statCount(statuses)}
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
                            className={`w-[260px] flex flex-col rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${
                                col.muted ? "opacity-75" : ""
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

                                                        {/* AI Score badge */}
                                                        {score > 0 ? (
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

                                                        {/* Reference Check notes */}
                                                        {col.showNotes && (
                                                            <RefCheckNotes appId={app.id} />
                                                        )}

                                                        {/* Reference Check actions */}
                                                        {col.status === "REFERENCE_CHECK" && (
                                                            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                                                        )}

                                                        {/* Move to Next Stage (all other columns) */}
                                                        {col.status !== "REFERENCE_CHECK" && nextLabel && (
                                                            <button
                                                                onClick={(e) => handleMoveToNext(e, app)}
                                                                disabled={isMoving}
                                                                className="w-full flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
