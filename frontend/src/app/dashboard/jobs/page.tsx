'use client';

import { useJobs } from '@/lib/hooks/useJobs';
import { Briefcase, Users, TrendingUp, Clock, Plus, ArrowRight, Sparkles, Loader2, MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import type { Job } from '@/lib/types';
import { useState } from 'react';

const STATUS_META: Record<string, { label: string; className: string }> = {
  DRAFT:             { label: 'Draft',            className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  PUBLISHED:         { label: 'Published',        className: 'badge-glow-emerald' },
  APPROVED:          { label: 'Approved',         className: 'badge-glow-indigo' },
  CHANGES_REQUESTED: { label: 'Action Needed',    className: 'bg-rose-50 text-rose-600 border border-rose-200' },
  INTERVIEWING:      { label: 'Interviewing',     className: 'badge-glow-amber' },
  CLOSED:            { label: 'Closed',           className: 'bg-slate-50 text-slate-400 border border-slate-200' },
};

export default function JobsPage() {
  const { data: realJobs, isLoading } = useJobs();
  const jobs = realJobs || [];
  const [searchQuery, setSearchQuery] = useState("");

  const published = jobs.filter((j: Job) => j.status === 'PUBLISHED').length;
  const totalCandidates = jobs.reduce((sum: number, job: Job) => sum + (job.application_count || job.candidateCount || 0), 0);
  const needsReview = jobs.filter((j: Job) => ['DRAFT', 'CHANGES_REQUESTED'].includes(j.status)).length;

  const filteredJobs = jobs.filter((job: Job) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (job.title || '').toLowerCase().includes(q) || (job.department || '').toLowerCase().includes(q);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Job Postings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage {jobs.length} positions across your organization.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/generated-jobs">
            <button className="btn-glass flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-indigo-500" /> AI Generator
            </button>
          </Link>
          <Link href="/dashboard/jobs/new">
            <button className="btn-dribbble text-sm">
              <Plus className="w-4 h-4" /> New Posting
            </button>
          </Link>
        </div>
      </div>

      {/* Striking Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Jobs',      value: jobs.length,     icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Active Postings', value: published,       icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Total Applicants',value: totalCandidates, icon: Users,     color: 'text-blue-500',   bg: 'bg-blue-50' },
          { label: 'Needs Review',    value: needsReview,     icon: Clock,     color: 'text-amber-500',  bg: 'bg-amber-50' },
        ].map((m) => (
          <div key={m.label} className="panel-elevated p-5 relative overflow-hidden group">
            {/* Background decorative blob */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${m.bg} opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>
            
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
            </div>
            
            <div className="relative z-10">
              <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">{m.value}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search by job title or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Job list */}
      {filteredJobs.length === 0 ? (
        <div className="panel-elevated p-16 text-center bg-white border-0">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No jobs found</h3>
          <p className="text-sm text-slate-500 mb-6">Create a position to start accepting applications.</p>
          <Link href="/dashboard/jobs/new">
            <button className="btn-dribbble">
              <Plus className="w-4 h-4" /> Create First Job
            </button>
          </Link>
        </div>
      ) : (
        <div className="panel-elevated overflow-hidden border-0 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <th className="py-4 pl-6">Position</th>
                  <th className="py-4">Department</th>
                  <th className="py-4">Status</th>
                  <th className="py-4 text-center">Applicants</th>
                  <th className="py-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.map((job: Job) => {
                  const meta = STATUS_META[job.status] || STATUS_META.DRAFT;
                  const candCount = job.candidateCount ?? job.application_count ?? 0;
                  return (
                    <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-5 pl-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                            <Briefcase className="w-4 h-4 text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{job.title}</p>
                            {job.location && (
                              <p className="text-[0.7rem] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" /> {job.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-5">
                        <span className="font-medium text-slate-700 text-sm bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                          {job.department || '—'}
                        </span>
                      </td>
                      
                      <td className="py-5">
                        <span className={`${meta.className} text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md`}>
                          {meta.label}
                        </span>
                      </td>
                      
                      <td className="py-5 text-center">
                        <div className="inline-flex items-center justify-center min-w-[2.5rem] h-8 px-2 bg-slate-100 text-slate-700 font-bold font-mono text-sm rounded-lg border border-slate-200">
                          {candCount}
                        </div>
                      </td>
                      
                      <td className="py-5 pr-6 text-right">
                        <Link href={`/dashboard/jobs/${job.id}/candidates`}>
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-sm transition-all text-xs font-bold">
                            Review <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
