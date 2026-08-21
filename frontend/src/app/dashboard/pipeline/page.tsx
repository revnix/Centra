"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useApplications, useUpdateApplicationStatus, applicationKeys } from "@/lib/hooks/useApplications";
import { applicationsApi } from "@/lib/api";
import { gmailApi } from "@/lib/api/gmail";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, Send, Mail, Ban, ArrowRight, Zap, Search, Plus, MoreHorizontal, CheckCircle2, ChevronDown,
  MailX, Hourglass, Wallet, PauseCircle
} from "lucide-react";
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

const KANBAN_COLUMNS: ColumnDef[] = [
  { key: "applied",              title: "Applied",              headerClass: "bg-yellow-50  border-yellow-300",                   textClass: "text-yellow-800",    stages: ["APPLIED"],                                                icon: Search },
  { key: "screening",            title: "Screening",            headerClass: "bg-yellow-100 border-yellow-400",                   textClass: "text-yellow-900",    stages: ["SCREENING"],                                              icon: Zap },
  { key: "shortlisted",          title: "Shortlisted",          headerClass: "bg-yellow-200 border-yellow-500",                   textClass: "text-yellow-900",    stages: ["SHORTLISTED"],                                            icon: Zap },
  { key: "no_response",          title: "No Response",          headerClass: "bg-slate-100  border-slate-300",                    textClass: "text-slate-700",     stages: ["NO_RESPONSE"],                                            icon: MailX },
  { key: "screening_test",       title: "Screening Test",       headerClass: "bg-orange-100 border-orange-300",                   textClass: "text-orange-900",    stages: ["SCREENING_TEST"],                                         icon: Zap },
  { key: "interview_scheduled",  title: "Interview Scheduled",  headerClass: "bg-sky-100    border-sky-300",                      textClass: "text-sky-900",       stages: ["INTERVIEW_SCHEDULED", "INTERVIEW_INVITED", "SENT", "RESPONDED"], icon: Mail },
  { key: "interview_completed",  title: "Interview Completed",  headerClass: "bg-sky-200    border-sky-400",                      textClass: "text-sky-900",       stages: ["INTERVIEW_COMPLETED"],                                    icon: CheckCircle2 },
  { key: "pending_review",       title: "Pending Review",       headerClass: "bg-purple-100 border-purple-300",                   textClass: "text-purple-900",    stages: ["PENDING_REVIEW"],                                         icon: Hourglass },
  { key: "offer_extended",       title: "Offer Extended",       headerClass: "bg-stone-200   border-stone-400",                   textClass: "text-stone-800",     stages: ["OFFER_EXTENDED"],                                         icon: Send },
  { key: "offer_accepted",       title: "Offer Accepted",       headerClass: "bg-stone-500   border-stone-700  text-white",       textClass: "text-white",         stages: ["OFFER_ACCEPTED"],                                         icon: CheckCircle2 },
  { key: "declined",             title: "Declined",             headerClass: "bg-rose-400   border-rose-600   text-white",        textClass: "text-white",         stages: ["DECLINED"],                                               icon: Ban },
  { key: "unaffordable",         title: "Unaffordable",         headerClass: "bg-amber-200  border-amber-400",                    textClass: "text-amber-900",     stages: ["UNAFFORDABLE"],                                           icon: Wallet },
  { key: "reference_check",      title: "Reference Check",      headerClass: "bg-blue-50    border-blue-200",                     textClass: "text-blue-900",      stages: ["REFERENCE_CHECK"],                                        icon: Search },
  { key: "rejected",             title: "Rejected",             headerClass: "bg-red-500    border-red-600    text-white",        textClass: "text-white",         stages: ["REJECTED"],                                               icon: Ban },
  { key: "hired",                title: "Hired",                headerClass: "bg-green-800  border-green-900  text-white",        textClass: "text-white",         stages: ["HIRED"],                                                  icon: CheckCircle2 },
  { key: "on_hold",              title: "On Hold",              headerClass: "bg-violet-200 border-violet-400",                   textClass: "text-violet-900",    stages: ["ON_HOLD"],                                                icon: PauseCircle },
];

const NEXT_STAGE: Record<string, string> = {
  APPLIED: "SCREENING",
  SCREENING: "SHORTLISTED",
  SHORTLISTED: "NO_RESPONSE",
  NO_RESPONSE: "INTERVIEW_SCHEDULED",
  SCREENING_TEST: "INTERVIEW_SCHEDULED",
  INTERVIEW_INVITED: "INTERVIEW_SCHEDULED",
  INTERVIEW_SCHEDULED: "INTERVIEW_COMPLETED",
  INTERVIEW_COMPLETED: "REFERENCE_CHECK",
  PENDING_REVIEW: "OFFER_EXTENDED",
  OFFER_EXTENDED: "OFFER_ACCEPTED",
  OFFER_ACCEPTED: "DECLINED",
  DECLINED: "UNAFFORDABLE",
  UNAFFORDABLE: "REFERENCE_CHECK",
  REFERENCE_CHECK: "REJECTED",
  REJECTED: "HIRED",
  SENT: "INTERVIEW_SCHEDULED",
  RESPONDED: "INTERVIEW_COMPLETED",
};

const PREV_STAGE: Record<string, string> = {
  SCREENING: "APPLIED",
  SHORTLISTED: "SCREENING",
  NO_RESPONSE: "SHORTLISTED",
  SCREENING_TEST: "SHORTLISTED",
  INTERVIEW_INVITED: "SCREENING_TEST",
  INTERVIEW_SCHEDULED: "NO_RESPONSE",
  INTERVIEW_COMPLETED: "INTERVIEW_SCHEDULED",
  SENT: "SCREENING_TEST",
  RESPONDED: "SCREENING_TEST",
  PENDING_REVIEW: "INTERVIEW_COMPLETED",
  OFFER_EXTENDED: "PENDING_REVIEW",
  OFFER_ACCEPTED: "OFFER_EXTENDED",
  DECLINED: "OFFER_ACCEPTED",
  UNAFFORDABLE: "DECLINED",
  REFERENCE_CHECK: "UNAFFORDABLE",
  REJECTED: "REFERENCE_CHECK",
  HIRED: "REJECTED",
};

export default function PremiumKanbanPipelinePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: applications = [], isLoading } = useApplications();
  const updateStatus = useUpdateApplicationStatus();

  const [searchQuery, setSearchQuery] = useState("");
  const [movingIds, setMovingIds] = useState<Set<string>>(new Set());

  // Email state
  const [emailTarget, setEmailTarget] = useState<Application | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailFromAlias, setEmailFromAlias] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Gmail aliases for From selector
  const { data: aliasesData } = useQuery({
    queryKey: ['gmail', 'aliases'],
    queryFn: gmailApi.getAliases,
    staleTime: 10 * 60 * 1000,
  });
  const aliases = aliasesData?.aliases ?? [];

  // Group applications into columns
  const columnData = useMemo(() => {
    const map: Record<string, { col: ColumnDef; apps: Application[]; count: number; avgScore: number }> = {};

    KANBAN_COLUMNS.forEach((c) => {
      map[c.key] = { col: c, apps: [], count: 0, avgScore: 0 };
    });

    const filtered = applications.filter((app: Application) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (app.candidate?.full_name || "").toLowerCase().includes(q) ||
        (app.job?.title || "").toLowerCase().includes(q)
      );
    });

    filtered.forEach((app: Application) => {
      const st = (app.status || "APPLIED").toUpperCase();
      let matchedCol = KANBAN_COLUMNS.find((c) => c.stages.includes(st));
      if (!matchedCol) matchedCol = KANBAN_COLUMNS[0];

      map[matchedCol.key].apps.push(app);
    });

    KANBAN_COLUMNS.forEach((c) => {
      const item = map[c.key];
      item.count = item.apps.length;
      if (item.count > 0) {
        const sum = item.apps.reduce((acc, a) => acc + (a.match_score ?? a.ai_score ?? 0), 0);
        item.avgScore = Math.round(sum / item.count);
      }
    });

    return map;
  }, [applications, searchQuery]);

  const setMoving = (id: string, val: boolean) =>
    setMovingIds((prev) => {
      const s = new Set(prev);
      val ? s.add(id) : s.delete(id);
      return s;
    });

  const handleMoveStage = async (e: React.MouseEvent, app: Application, direction: "next" | "prev") => {
    e.stopPropagation();
    const current = (app.status || "").toUpperCase();
    
    let nextStatus = current;
    if (direction === "next") {
        nextStatus = NEXT_STAGE[current] || "SHORTLISTED";
    } else {
        nextStatus = PREV_STAGE[current];
    }

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

  const handleSendEmail = async () => {
    if (!emailTarget) return;
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Subject and message body are required.");
      return;
    }
    setIsSendingEmail(true);
    try {
      const formData = new FormData();
      formData.append("subject", emailSubject.trim());
      formData.append("message", emailBody.trim());
      if (emailFromAlias) formData.append("from_email", emailFromAlias);
      await applicationsApi.sendEmail(emailTarget.id, formData);
      await queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      toast.success("Email sent to candidate");
      setEmailTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }

    const isSendingScreening = screeningTarget ? movingIds.has(screeningTarget.id) : false;

    return (
        <div className="space-y-6">
            <Dialog open={!!screeningTarget} onOpenChange={(open) => !open && handleCloseScreeningDialog()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Send Screening Test</DialogTitle>
                        <DialogDescription>
                            Add the questions candidate will see after clicking Start Test in the email.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid gap-2 sm:max-w-[220px]">
                            <label className="text-sm font-medium text-slate-700">Time limit (minutes)</label>
                            <Input
                                type="number"
                                min={1}
                                max={180}
                                value={timeLimitMinutes}
                                onChange={(event) =>
                                    setTimeLimitMinutes(Math.min(180, Math.max(1, Number(event.target.value) || 1)))
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Questions</label>
                            <Textarea
                                value={rawQuestionsText}
                                onChange={(event) => setRawQuestionsText(event.target.value)}
                                placeholder={"Paste questions here, one per line.\nExample:\n1. What is React?\n2. Explain REST API.\n3. What is database indexing?"}
                                className="min-h-[280px] font-mono text-sm"
                            />
                            <p className="text-xs text-slate-500">
                                {parseRawQuestions(rawQuestionsText).length} question(s). LLM will generate options and correct answers before the email is sent.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCloseScreeningDialog}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSubmitScreeningQuestions} disabled={isSendingScreening}>
                            {isSendingScreening ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
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
          );
        })}
      </div>

      {/* Email Compose Dialog */}
      <Dialog open={!!emailTarget} onOpenChange={(open) => !open && setEmailTarget(null)}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" /> Send Message
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium">
              To: {emailTarget?.candidate?.full_name} &lt;{emailTarget?.candidate?.email}&gt;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* From alias selector */}
            {aliases.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">From</label>
                <div className="relative">
                  <select
                    value={emailFromAlias}
                    onChange={e => setEmailFromAlias(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none pr-9"
                  >
                    {aliases.map(a => (
                      <option key={a.email} value={a.email}>
                        {a.formatted || a.email}{a.is_default ? ' (default)' : ''}
                      </option>
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
