"use client";

import { api } from "@/lib/api";
import { gmailApi } from "@/lib/api/gmail";
import { useApplications, applicationKeys } from "@/lib/hooks/useApplications";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Search, Loader2, Trash2, Mail, Send, Download, Filter, ChevronRight, Zap, Users, Briefcase, UserPlus, Globe } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const LinkedinIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);

interface Application {
  id: string;
  status: string;
  source?: string;
  match_score?: number;
  ai_score?: number;
  city?: string;
  qualification?: string;
  expected_salary?: number;
  salary_filter_status?: string;
  created_at?: string;
  candidate?: { full_name?: string; email?: string; candidate_profile?: { resume_url?: string } };
  job?: { title?: string };
}

const getResumeExtension = (resumeUrl: string): string => {
  try { const m = new URL(resumeUrl).pathname.match(/\.([a-zA-Z0-9]+)$/); if (m) return `.${m[1].toLowerCase()}`; } catch {}
  const m = resumeUrl.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  return m ? `.${m[1].toLowerCase()}` : ".pdf";
};

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Invite modal state
  const [inviteApp, setInviteApp] = useState<Application | null>(null);
  const [inviteSubject, setInviteSubject] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data: applications = [], isLoading, isError, error, refetch } = useApplications();

  useEffect(() => {
    if (applications.length > 0) setSelectedIds(new Set((applications as any[]).map((a) => a.id)));
  }, [applications]);

  useEffect(() => {
    gmailApi.syncReplies()
      .then(res => { if (res.updated > 0) queryClient.invalidateQueries({ queryKey: applicationKeys.lists() }); })
      .catch(() => {});
  }, [queryClient]);

  const handleImportCandidates = async () => {
    setIsSyncing(true);
    try {
      const res = await gmailApi.syncApplications();
      if (res.created > 0) {
        toast.success(`Imported ${res.created} new candidate application(s)!`);
        queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      } else {
        toast.info(res.message || "No new candidate applications found in email inbox.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to import applications.");
    } finally {
      setIsSyncing(false);
    }
  };

  const renderSourceBadge = (source?: string) => {
    const s = (source || "web").toLowerCase();
    if (s === "linkedin") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.68rem] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
          <LinkedinIcon className="w-3.5 h-3.5 text-blue-600" /> LinkedIn
        </span>
      );
    }
    if (s === "indeed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.68rem] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
          <Briefcase className="w-3.5 h-3.5 text-indigo-600" /> Indeed
        </span>
      );
    }
    if (s === "email" || s === "gmail") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.68rem] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
          <Mail className="w-3.5 h-3.5 text-rose-600" /> Gmail
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.68rem] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
        <Globe className="w-3.5 h-3.5 text-slate-500" /> Direct Portal
      </span>
    );
  };

  const openInviteModal = (app: Application) => {
    const name = app.candidate?.full_name || "Candidate";
    const job = app.job?.title || "position";
    setInviteApp(app);
    setInviteSubject(`Interview Invitation – ${job}`);
    setInviteMessage(`Hi ${name},\n\nWe would like to invite you for an interview for the ${job} position. Please let us know your availability.\n\nBest regards,\nHR Team`);
  };

  const handleSendInvite = async () => {
    if (!inviteApp) return;
    if (!inviteSubject.trim() || !inviteMessage.trim()) { toast.error("Subject and message are required."); return; }
    setIsSending(true);
    try {
      await api.applications.invite(inviteApp.id, inviteSubject.trim(), inviteMessage.trim());
      toast.success(`Invite sent to ${inviteApp.candidate?.email}!`);
      setInviteApp(null);
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
    } catch (err: any) {
      toast.error(`Failed: ${err.message || "Please try again."}`);
    } finally { setIsSending(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete application for ${name}?`)) return;
    try {
      await api.applications.delete(id);
      toast.success("Application deleted");
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
    } catch (err: any) { toast.error(`Failed: ${err.message || "Unauthorized"}`); }
  };

  const handleDownloadSingle = async (app: Application) => {
    try {
      const url = app.candidate?.candidate_profile?.resume_url;
      if (!url) return;
      const blob = await (await fetch(url)).blob();
      const name = (app.candidate?.full_name || "Unknown").replace(/\s+/g, "_");
      const job = (app.job?.title || "Job").replace(/\s+/g, "_");
      const { saveAs } = await import("file-saver");
      saveAs(blob, `${name}_${job}${getResumeExtension(url)}`);
    } catch { toast.error("Failed to download resume"); }
  };

  const handleDownloadResumes = async () => {
    const toDownload = applications.filter((a) => selectedIds.has(a.id) && a.candidate?.candidate_profile?.resume_url);
    if (toDownload.length === 0) { toast.error("No resumes for selected applications"); return; }
    setIsDownloading(true);
    try {
      const [{ default: JSZip }, { saveAs }] = await Promise.all([import("jszip"), import("file-saver")]);
      const zip = new JSZip();
      await Promise.all(toDownload.map(async (app) => {
        try {
          const url = app.candidate?.candidate_profile?.resume_url!;
          const blob = await (await fetch(url)).blob();
          const n = (app.candidate?.full_name || "Unknown").replace(/\s+/g, "_");
          const j = (app.job?.title || "Job").replace(/\s+/g, "_");
          zip.file(`${n}_${j}${getResumeExtension(url)}`, blob);
        } catch {}
      }));
      saveAs(await zip.generateAsync({ type: "blob" }), `resumes_${new Date().toISOString().split("T")[0]}.zip`);
      toast.success(`${toDownload.length} resume(s) downloaded`);
    } catch { toast.error("Failed to create ZIP"); }
    finally { setIsDownloading(false); }
  };

  const [selectedJob, setSelectedJob] = useState<string>("all");

  // Group applications by Job Title
  const jobGroups = useMemo(() => {
    if (!Array.isArray(applications)) return [];
    const groups: { [key: string]: { title: string; count: number; hired: number; shortlisted: number; topScore: number } } = {};

    applications.forEach((app: any) => {
      const title = app.job?.title || "Unassigned Position";
      if (!groups[title]) {
        groups[title] = { title, count: 0, hired: 0, shortlisted: 0, topScore: 0 };
      }
      groups[title].count += 1;
      if (app.status === "HIRED") groups[title].hired += 1;
      if (app.status === "SHORTLISTED") groups[title].shortlisted += 1;
      const score = app.match_score ?? app.ai_score ?? 0;
      if (score > groups[title].topScore) groups[title].topScore = score;
    });

    return Object.values(groups);
  }, [applications]);

  const filteredApps = useMemo(() =>
    Array.isArray(applications) ? applications.filter((app) => {
      const term = searchTerm.toLowerCase();
      const matchSearch = (app.candidate?.full_name || "").toLowerCase().includes(term) ||
        (app.job?.title || "").toLowerCase().includes(term) ||
        (app.candidate?.email || "").toLowerCase().includes(term);
      const matchCity = cityFilter === "all" || (app.city || "unknown").toLowerCase() === cityFilter;
      const matchStatus = statusFilter === "all" || app.status === statusFilter;
      const matchJob = selectedJob === "all" || (app.job?.title || "Unassigned Position") === selectedJob;
      return matchSearch && matchCity && matchStatus && matchJob;
    }) : []
  , [applications, searchTerm, cityFilter, statusFilter, selectedJob]);

  const allSelected = filteredApps.length > 0 && filteredApps.every((a) => selectedIds.has(a.id));
  const someSelected = filteredApps.some((a) => selectedIds.has(a.id));

  const toggleAll = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (allSelected) filteredApps.forEach((a) => next.delete(a.id));
    else filteredApps.forEach((a) => next.add(a.id));
    return next;
  });

  const toggleOne = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  if (isError) return (
    <div className="panel-elevated p-12 text-center">
      <p className="text-base font-bold text-rose-600 mb-4">{(error as Error)?.message || "Failed to load candidates"}</p>
      <button onClick={() => refetch()} className="btn-glass text-sm">Retry Connection</button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Applications</h1>
          <p className="text-sm text-slate-500 mt-1">Review applications grouped by job postings, AI match scores, and dispatch invitations.</p>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button onClick={handleDownloadResumes} disabled={isDownloading} className="btn-glass text-sm border-indigo-200 hover:border-indigo-400 text-indigo-700">
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-indigo-600" />}
              Export {selectedIds.size} Resumes
            </button>
          )}
        </div>
      </div>

      {/* Job Panels Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-indigo-500" /> Filter Applications By Job Posting
          </h3>
          {selectedJob !== "all" && (
            <button onClick={() => setSelectedJob("all")} className="text-xs font-semibold text-indigo-600 hover:underline">
              Show All ({applications.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* All Jobs Panel */}
          <div
            onClick={() => setSelectedJob("all")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedJob === "all"
                ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-600 shadow-md scale-[1.01]"
                : "bg-white text-slate-800 border-slate-200/80 hover:border-indigo-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                selectedJob === "all" ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700"
              }`}>
                All Positions
              </span>
              <Users className={`w-4 h-4 ${selectedJob === "all" ? "text-white/80" : "text-slate-400"}`} />
            </div>
            <p className="font-extrabold text-base line-clamp-1">All Job Postings</p>
            <p className={`text-xs mt-1 font-semibold ${selectedJob === "all" ? "text-indigo-100" : "text-slate-500"}`}>
              {applications.length} total applications
            </p>
          </div>

          {/* Individual Job Panels */}
          {jobGroups.map((job) => {
            const isSelected = selectedJob === job.title;
            return (
              <div
                key={job.title}
                onClick={() => setSelectedJob(job.title)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-600 shadow-md scale-[1.01]"
                    : "bg-white text-slate-800 border-slate-200/80 hover:border-indigo-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {job.count} Applicant{job.count !== 1 ? 's' : ''}
                  </span>
                  {job.topScore > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                      isSelected ? "bg-emerald-400/30 text-emerald-100" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      ⚡ {job.topScore}% Top AI
                    </span>
                  )}
                </div>
                <p className="font-extrabold text-base line-clamp-1">{job.title}</p>
                <p className={`text-xs mt-1 font-medium ${isSelected ? "text-indigo-100" : "text-slate-500"}`}>
                  {job.hired > 0 ? `${job.hired} Hired` : `${job.shortlisted} Shortlisted`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-lg">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search by candidate name, email, or job role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto flex-wrap sm:flex-nowrap">
          {selectedJob !== "all" && (
            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1.5">
              Job: {selectedJob}
              <button onClick={() => setSelectedJob("all")} className="hover:text-indigo-900 font-extrabold ml-1">✕</button>
            </span>
          )}

          <select className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option value="all">🌍 All Locations</option>
            <option value="haripur">Haripur</option>
            <option value="islamabad">Islamabad</option>
            <option value="lahore">Lahore</option>
            <option value="karachi">Karachi</option>
          </select>

          <select className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">⚡ All Stages</option>
            <option value="APPLIED">Applied</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
            <option value="HIRED">Hired</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <button
            onClick={handleImportCandidates}
            disabled={isSyncing}
            className="btn-dribbble py-2.5 px-4 text-xs font-bold flex items-center gap-2 flex-shrink-0 shadow-sm cursor-pointer"
            title="Import candidate applications from Gmail"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <UserPlus className="w-4 h-4 text-white" />
            )}
            {isSyncing ? "Importing..." : "Import Applications"}
          </button>
        </div>
      </div>

      {/* Applications Table Card */}
      <div className="panel-elevated overflow-hidden border-0 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <th className="w-12 pl-6 py-4">
                  <input type="checkbox" checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                </th>
                <th className="py-4">Candidate</th>
                <th className="py-4">Position</th>
                <th className="py-4">Status</th>
                <th className="py-4">Applied</th>
                <th className="py-4">Applied Through</th>
                <th className="py-4 text-right">Salary Exp.</th>
                <th className="py-4 text-center">AI Score</th>
                <th className="py-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.map((app) => {
                const name = app.candidate?.full_name || "Unknown Candidate";
                const score = app.match_score ?? app.ai_score ?? 0;
                const salary = app.expected_salary ? `PKR ${Number(app.expected_salary).toLocaleString()}` : null;

                return (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="pl-6 py-4">
                      <input type="checkbox" checked={selectedIds.has(app.id)}
                        onChange={() => toggleOne(app.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    </td>

                    <td className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{name}</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">{app.candidate?.email || "—"}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 font-semibold text-slate-700 text-sm">{app.job?.title || "—"}</td>

                    <td className="py-4">
                      <span className="badge-glow-indigo text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
                        {app.status || "APPLIED"}
                      </span>
                    </td>

                    <td className="py-4 text-slate-500 font-medium text-sm">
                      {app.created_at ? formatDistanceToNow(new Date(app.created_at), { addSuffix: true }) : "—"}
                    </td>

                    <td className="py-4">
                      {renderSourceBadge(app.source)}
                    </td>

                    <td className="py-4 text-right">
                      {salary ? (
                        <span className="font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md shadow-sm text-sm">
                          {salary}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="py-4">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-2">
                          <Zap className={`w-3.5 h-3.5 ${score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`} />
                          <span className="font-black text-slate-800 text-sm">{score}%</span>
                        </div>
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${score >= 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-indigo-400 to-indigo-500'}`} style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        {app.candidate?.candidate_profile?.resume_url && (
                          <button onClick={() => handleDownloadSingle(app)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-sm transition-all" title="Download CV">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => openInviteModal(app)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-sm transition-all" title="Send Email">
                          <Mail className="w-4 h-4" />
                        </button>
                        <Link href={`/dashboard/applications/${app.id}`}>
                          <button className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-400 hover:shadow-sm transition-all" title="View Profile">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <button onClick={() => handleDelete(app.id, name)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:border-rose-300 hover:shadow-sm transition-all" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-sm font-medium text-slate-400">
                    No candidates found matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <Dialog open={!!inviteApp} onOpenChange={(open) => !open && setInviteApp(null)}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" /> Send Notification
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500">
              To: {inviteApp?.candidate?.full_name} ({inviteApp?.candidate?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">Subject</label>
              <input value={inviteSubject} onChange={(e) => setInviteSubject(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">Message</label>
              <textarea rows={5} value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <button onClick={() => setInviteApp(null)} className="btn-glass text-sm" disabled={isSending}>Cancel</button>
            <button onClick={handleSendInvite} className="btn-dribbble text-sm" disabled={isSending}>
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Invite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
