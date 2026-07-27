"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useApplications, useUpdateApplicationStatus, applicationKeys } from "@/lib/hooks/useApplications";
import { applicationsApi } from "@/lib/api";
import { gmailApi } from "@/lib/api/gmail";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, Send, Mail, Ban, ArrowRight, Zap, Search, Plus, MoreHorizontal, CheckCircle2, ChevronDown
} from "lucide-react";
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

const KANBAN_COLUMNS: ColumnDef[] = [
  { key: "applied",              title: "Applied",              headerClass: "bg-yellow-50  border-yellow-300",                   textClass: "text-yellow-800",    stages: ["APPLIED"],                                                icon: Search },
  { key: "screening",            title: "Screening",            headerClass: "bg-yellow-100 border-yellow-400",                   textClass: "text-yellow-900",    stages: ["SCREENING"],                                              icon: Zap },
  { key: "shortlisted",          title: "Shortlisted",          headerClass: "bg-yellow-200 border-yellow-500",                   textClass: "text-yellow-900",    stages: ["SHORTLISTED"],                                            icon: Zap },
  { key: "screening_test",       title: "Screening Test",       headerClass: "bg-orange-100 border-orange-300",                   textClass: "text-orange-900",    stages: ["SCREENING_TEST"],                                         icon: Zap },
  { key: "interview_scheduled",  title: "Interview Scheduled",  headerClass: "bg-sky-100    border-sky-300",                      textClass: "text-sky-900",       stages: ["INTERVIEW_SCHEDULED", "INTERVIEW_INVITED", "SENT", "RESPONDED"], icon: Mail },
  { key: "interview_completed",  title: "Interview Completed",  headerClass: "bg-sky-200    border-sky-400",                      textClass: "text-sky-900",       stages: ["INTERVIEW_COMPLETED"],                                    icon: CheckCircle2 },
  { key: "rejected",             title: "Rejected",             headerClass: "bg-red-500    border-red-600    text-white",        textClass: "text-white",         stages: ["REJECTED"],                                               icon: Ban },
  { key: "reference_check",      title: "Reference Check",      headerClass: "bg-blue-50    border-blue-200",                     textClass: "text-blue-900",      stages: ["REFERENCE_CHECK"],                                        icon: Search },
  { key: "offer_extended",       title: "Offer Extended",       headerClass: "bg-stone-200   border-stone-400",                   textClass: "text-stone-800",     stages: ["OFFER_EXTENDED"],                                         icon: Send },
  { key: "offer_accepted",       title: "Offer Accepted",       headerClass: "bg-stone-500   border-stone-700  text-white",       textClass: "text-white",         stages: ["OFFER_ACCEPTED"],                                         icon: CheckCircle2 },
  { key: "hired",                title: "Hired",                headerClass: "bg-green-800  border-green-900  text-white",        textClass: "text-white",         stages: ["HIRED"],                                                  icon: CheckCircle2 },
];

const NEXT_STAGE: Record<string, string> = {
  APPLIED: "SCREENING",
  SCREENING: "SHORTLISTED",
  SHORTLISTED: "SCREENING_TEST",
  SCREENING_TEST: "INTERVIEW_SCHEDULED",
  INTERVIEW_INVITED: "INTERVIEW_SCHEDULED",
  INTERVIEW_SCHEDULED: "INTERVIEW_COMPLETED",
  INTERVIEW_COMPLETED: "REFERENCE_CHECK",
  REFERENCE_CHECK: "OFFER_EXTENDED",
  OFFER_EXTENDED: "OFFER_ACCEPTED",
  OFFER_ACCEPTED: "HIRED",
  SENT: "INTERVIEW_SCHEDULED",
  RESPONDED: "INTERVIEW_COMPLETED",
};

const PREV_STAGE: Record<string, string> = {
  SCREENING: "APPLIED",
  SHORTLISTED: "SCREENING",
  SCREENING_TEST: "SHORTLISTED",
  INTERVIEW_INVITED: "SCREENING_TEST",
  INTERVIEW_SCHEDULED: "SCREENING_TEST",
  INTERVIEW_COMPLETED: "INTERVIEW_SCHEDULED",
  REFERENCE_CHECK: "INTERVIEW_COMPLETED",
  OFFER_EXTENDED: "REFERENCE_CHECK",
  OFFER_ACCEPTED: "OFFER_EXTENDED",
  HIRED: "OFFER_ACCEPTED",
  REJECTED: "APPLIED",
  SENT: "SCREENING_TEST",
  RESPONDED: "SCREENING_TEST",
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
                {isLoading ? (
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
                    const salary = app.expected_salary ? `$${Number(app.expected_salary).toLocaleString()}` : null;
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
                          </div>

                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
