"use client";

import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useApplications, useUpdateApplicationStatus, applicationKeys } from "@/lib/hooks/useApplications";
import { screeningApi, applicationsApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Send, Mail, Paperclip, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Application {
  id: string;
  status: string;
  match_score?: number;
  ai_score?: number;
  expected_salary?: number;
  candidate?: { full_name?: string; email?: string };
  job?: { title?: string };
}

type ColumnDef = {
  key: string;
  title: string;
  headerClass: string;
  textClass: string;
  stages: string[];
  icon: any;
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
        label: "Interview Email Sent",
        status: "INTERVIEW_INVITED",
        topStrip: "bg-purple-500",
        headerText: "text-purple-700",
        countBg: "bg-purple-100",
        countText: "text-purple-700",
        avatarBg: "bg-purple-100",
        avatarText: "text-purple-700",
        cardsBg: "bg-purple-50/30",
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
// "SENT" is a legacy alias for INTERVIEW_INVITED (email sent, not yet scheduled);
// "RESPONDED" is a legacy alias for INTERVIEW_SCHEDULED (candidate responded/booked).
NEXT_STATUS["SENT"] = NEXT_STATUS["INTERVIEW_INVITED"];
NEXT_STATUS["RESPONDED"] = NEXT_STATUS["INTERVIEW_SCHEDULED"];

// Build a reverse map: status → previous status
const PREV_STATUS: Record<string, string> = {};
COLUMNS.forEach((col, i) => {
    if (i > 0) {
        PREV_STATUS[col.status] = COLUMNS[i - 1].status;
    }
});
PREV_STATUS["SENT"] = PREV_STATUS["INTERVIEW_INVITED"];
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

    if (!nextStatus) return;

    setMoving(app.id, true);

    // Optimistic UI Update for < 1 second response feel
    queryClient.setQueryData(applicationKeys.lists(), (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((a: Application) => a.id === app.id ? { ...a, status: nextStatus } : a);
    });

    try {
      await updateStatus.mutateAsync({ id: app.id, status: nextStatus });
      toast.success(`Moved to ${nextStatus.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update candidate stage");
      // Rollback on failure
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
    } finally {
      setMoving(app.id, false);
    }
  };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
    const router = useRouter();
    const [movingIds, setMovingIds] = useState<Set<string>>(new Set());
    const [screeningTarget, setScreeningTarget] = useState<Application | null>(null);
    const [rawQuestionsText, setRawQuestionsText] = useState("");
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(10);

    // Compose-email dialog (Offer Extended / Offer Accepted) — a blank, Gmail-style
    // composer: HR picks the candidate and everything else starts empty.
    const [emailTarget, setEmailTarget] = useState<Application | null>(null);
    const [emailCc, setEmailCc] = useState("");
    const [emailBcc, setEmailBcc] = useState("");
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [emailFiles, setEmailFiles] = useState<File[]>([]);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const emailFileRef = useRef<HTMLInputElement>(null);

    const { data: applications = [], isLoading } = useApplications();
    const updateStatus = useUpdateApplicationStatus();
    const queryClient = useQueryClient();

    // Recomputed only when the applications list actually changes (new data from
    // the server), not on every render — this page previously re-scanned the full
    // applications array up to 15 times (8 columns + 7 summary stats) on every
    // render, including every 10s background poll tick and every local UI state
    // change (hovering, moving a card) that had nothing to do with the data itself.
    const grouped = useMemo(
        () =>
            COLUMNS.map((col) => ({
                ...col,
                cards: applications.filter((app) => {
                    const s = (app.status || "").toUpperCase();
                    if (col.status === "INTERVIEW_INVITED") {
                        return s === "INTERVIEW_INVITED" || s === "SENT";
                    }
                    if (col.status === "INTERVIEW_SCHEDULED") {
                        return s === "INTERVIEW_SCHEDULED" || s === "RESPONDED";
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

    // Special handler for Shortlisted → Screening Test:
    // calls POST /screening/create which creates the test, sends the email,
    // and updates the application status all in one request.
    const handleSendScreeningTest = async (e: React.MouseEvent, app: Application) => {
        e.stopPropagation();
        setScreeningTarget(app);
        setRawQuestionsText("");
        setTimeLimitMinutes(10);
    };

    const handleCloseScreeningDialog = () => {
        setScreeningTarget(null);
        setRawQuestionsText("");
        setTimeLimitMinutes(10);
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

    const openEmailDialog = (e: React.MouseEvent, app: Application) => {
        e.stopPropagation();
        setEmailTarget(app);
        setEmailSubject("");
        setEmailBody("");
        setEmailCc("");
        setEmailBcc("");
        setShowCc(false);
        setShowBcc(false);
        setEmailFiles([]);
    };

    const handleCloseEmailDialog = () => {
        setEmailTarget(null);
        setEmailSubject("");
        setEmailBody("");
        setEmailCc("");
        setEmailBcc("");
        setShowCc(false);
        setShowBcc(false);
        setEmailFiles([]);
    };

    const addEmailFiles = (incoming: FileList | null) => {
        if (!incoming) return;
        setEmailFiles((prev) => [...prev, ...Array.from(incoming)]);
    };

    const removeEmailFile = (index: number) => {
        setEmailFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSendCandidateEmail = async () => {
        if (!emailTarget) return;
        if (!emailSubject.trim()) {
            toast.error("Please add a subject.");
            return;
        }
        if (!emailBody.trim()) {
            toast.error("Please write a message.");
            return;
        }

        setIsSendingEmail(true);
        try {
            const formData = new FormData();
            formData.append("subject", emailSubject.trim());
            formData.append("message", emailBody.trim());
            formData.append("cc", emailCc.trim());
            formData.append("bcc", emailBcc.trim());
            emailFiles.forEach((f) => formData.append("attachments", f));

            await applicationsApi.sendEmail(emailTarget.id, formData);
            await queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
            toast.success(`Email sent to ${emailTarget.candidate?.email ?? "candidate"}`);
            handleCloseEmailDialog();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to send email";
            toast.error(message);
        } finally {
            setIsSendingEmail(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }
  };

  // Skeleton card shown inline per column — no full-screen spinner blocker
  const SkeletonCard = () => (
    <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-3 space-y-2 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-slate-100" />
        <div className="flex-1 space-y-1">
          <div className="h-2.5 bg-slate-100 rounded w-3/4" />
          <div className="h-2 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded w-full" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Active Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">Visually track your top candidates through the hiring process.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <Link href="/dashboard/jobs/new">
            <button className="btn-dribbble">
              <Plus className="w-4 h-4" /> Add Candidate
            </button>
          </Link>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="flex gap-6 overflow-x-auto pb-6 pt-2">
        {KANBAN_COLUMNS.map((col) => {
          const data = columnData[col.key];

          return (
            <div
              key={col.key}
              className="flex-shrink-0 w-80 lg:w-[340px] flex flex-col min-h-[700px] bg-slate-50/50 rounded-2xl border border-slate-200/60 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)]"
            >
              {/* Distinct Column Header */}
              <div className={`p-4 rounded-t-2xl border-t-[6px] ${col.headerClass}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <col.icon className={`w-5 h-5 ${col.textClass}`} />
                    <h2 className={`text-sm font-black uppercase tracking-wide ${col.textClass}`}>{col.title}</h2>
                  </div>
                  <div className="bg-white/80 px-2 py-0.5 rounded-md shadow-sm border border-white/40 text-xs font-bold text-slate-700">
                    {data.count}
                  </div>
                </div>
                
                {/* Stage Stats */}
                <div className={`flex items-center justify-between mt-2 pt-2 border-t border-current/20`}>
                  <span className={`text-xs font-medium opacity-70 ${col.textClass}`}>Avg Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-black/10 rounded-full overflow-hidden">
                      <div className="h-full bg-current rounded-full opacity-60" style={{ width: `${data.avgScore}%` }}></div>
                    </div>
                    <span className={`text-xs font-bold ${col.textClass}`}>{data.avgScore}%</span>
                  </div>
                </div>
              </div>

              {/* Column Candidate Cards List */}
              <div className="p-3 space-y-4 flex-1 overflow-y-auto">
                {(isLoading && (!applications || applications.length === 0)) ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : data.apps.length === 0 ? (
                  <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 mb-3"></div>
                    <span className="text-xs font-medium">Drop candidates here</span>
                  </div>
                ) : (
                  data.apps.map((app: Application) => {
                    const name = app.candidate?.full_name || "Unknown Candidate";
                    const role = app.job?.title || "Unassigned Position";
                    const score = app.match_score ?? app.ai_score ?? 0;
                    const salary = app.expected_salary ? `PKR ${Number(app.expected_salary).toLocaleString()}` : null;
                    const isMoving = movingIds.has(app.id);
                    
                    const statusClass = app.status === 'HIRED' ? 'border-status-hired' : 
                                        app.status?.includes('INTERVIEW') ? 'border-status-interview' :
                                        app.status === 'SHORTLISTED' ? 'border-status-screening' : 'border-status-applied';

                    return (
                      <div
                        key={app.id}
                        onClick={() => router.push(`/dashboard/applications/${app.id}`)}
                        className={`card-glass p-4 cursor-pointer group ${statusClass}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Avatar & Info */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-sm shadow-md">
                              {name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                                {name}
                              </h3>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{role}</p>
                            </div>
                          </div>
                          
                          {/* Circular Score */}
                          <div className="relative w-10 h-10 flex-shrink-0">
                            <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90 drop-shadow-sm">
                              <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path
                                className={score > 75 ? "text-blue-600" : "text-blue-500"}
                                strokeDasharray={`${score}, 100`}
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-slate-800">
                              {score}
                            </span>
                          </div>
                        </div>

                        {/* Middle Info */}
                        <div className="mt-4 flex items-center justify-between text-xs">
                          {salary ? (
                            <span className="font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">
                              {salary}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">Salary pending</span>
                          )}
                          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                            {app.status || 'APPLIED'}
                          </span>
                        </div>

                        {/* Bottom Actions */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          
                          <button
                            onClick={(e) => handleMoveStage(e, app, "prev")}
                            disabled={isMoving || !PREV_STAGE[app.status?.toUpperCase() || "APPLIED"]}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-slate-500 text-[0.7rem] font-bold hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          >
                            &larr; Back
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEmailTarget(app); }}
                              className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:shadow-sm transition-all"
                              title="Email candidate"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>

                            {NEXT_STAGE[app.status?.toUpperCase() || "APPLIED"] && (
                              <button
                                onClick={(e) => handleMoveStage(e, app, "next")}
                                disabled={isMoving}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 text-[0.7rem] font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                              >
                                {isMoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Move to Next Stage &rarr;</>}
                              </button>
                            )}
                            Send Screening Test
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Compose Email — Offer Extended / Offer Accepted */}
            <Dialog open={!!emailTarget} onOpenChange={(open) => !open && handleCloseEmailDialog()}>
                <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Mail className="h-4 w-4 text-emerald-600" />
                            New Message
                        </DialogTitle>
                        <DialogDescription>
                            {emailTarget?.candidate?.full_name ?? "Candidate"} · {emailTarget?.job?.title ?? "—"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[65vh] overflow-y-auto">
                        {/* To / Cc / Bcc block */}
                        <div className="px-5 py-2 border-b border-slate-100 space-y-1.5">
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400 w-8 flex-shrink-0">To</span>
                                <span className="flex-1 text-sm text-slate-700 truncate">
                                    {emailTarget?.candidate?.email || "No email on file"}
                                </span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {!showCc && (
                                        <button
                                            type="button"
                                            onClick={() => setShowCc(true)}
                                            className="text-xs text-slate-400 hover:text-slate-600"
                                        >
                                            Cc
                                        </button>
                                    )}
                                    {!showBcc && (
                                        <button
                                            type="button"
                                            onClick={() => setShowBcc(true)}
                                            className="text-xs text-slate-400 hover:text-slate-600"
                                        >
                                            Bcc
                                        </button>
                                    )}
                                </div>
                            </div>

                            {showCc && (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400 w-8 flex-shrink-0">Cc</span>
                                    <input
                                        type="text"
                                        value={emailCc}
                                        onChange={(e) => setEmailCc(e.target.value)}
                                        placeholder="cc@example.com, another@example.com"
                                        className="flex-1 text-sm py-1 outline-none placeholder:text-slate-300"
                                    />
                                </div>
                            )}

                            {showBcc && (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400 w-8 flex-shrink-0">Bcc</span>
                                    <input
                                        type="text"
                                        value={emailBcc}
                                        onChange={(e) => setEmailBcc(e.target.value)}
                                        placeholder="bcc@example.com, another@example.com"
                                        className="flex-1 text-sm py-1 outline-none placeholder:text-slate-300"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Subject */}
                        <div className="px-5 border-b border-slate-100">
                            <input
                                type="text"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                placeholder="Subject"
                                className="w-full text-sm font-medium py-2.5 outline-none placeholder:text-slate-300 placeholder:font-normal"
                            />
                        </div>

                        {/* Body */}
                        <div className="px-5 py-3">
                            <textarea
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                placeholder="Write your message…"
                                rows={10}
                                className="w-full text-sm leading-relaxed outline-none resize-none placeholder:text-slate-300"
                            />
                        </div>

                        {/* Attachments */}
                        {emailFiles.length > 0 && (
                            <div className="px-5 pb-3 flex flex-wrap gap-2">
                                {emailFiles.map((f, i) => (
                                    <span
                                        key={`${f.name}-${i}`}
                                        className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 rounded-full pl-3 pr-1.5 py-1"
                                    >
                                        <Paperclip className="h-3 w-3 flex-shrink-0" />
                                        <span className="max-w-[160px] truncate">{f.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeEmailFile(i)}
                                            className="hover:bg-slate-200 rounded-full p-0.5"
                                        >
                                            <XIcon className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <input
                        ref={emailFileRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            addEmailFiles(e.target.files);
                            e.target.value = "";
                        }}
                    />

                    <DialogFooter className="px-5 py-3 border-t border-slate-100 flex-row items-center sm:justify-between">
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Attach files"
                                onClick={() => emailFileRef.current?.click()}
                            >
                                <Paperclip className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" onClick={handleCloseEmailDialog}>
                                Discard
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSendCandidateEmail}
                                disabled={isSendingEmail || !emailTarget?.candidate?.email}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isSendingEmail ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Send
                            </Button>
                        </div>
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

                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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

                                                        {/* Email Candidate — Offer Extended & Offer Accepted only */}
                                                        {(col.status === "OFFER_EXTENDED" || col.status === "OFFER_ACCEPTED") && (
                                                            <button
                                                                onClick={(e) => openEmailDialog(e, app)}
                                                                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 transition-colors"
                                                            >
                                                                <Mail className="h-3.5 w-3.5" />
                                                                Email Candidate
                                                            </button>
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
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">Message</label>
              <textarea
                rows={5}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <button onClick={() => setEmailTarget(null)} className="btn-glass text-sm" disabled={isSendingEmail}>Cancel</button>
            <button onClick={handleSendEmail} className="btn-dribbble text-sm" disabled={isSendingEmail}>
              {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Message
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
