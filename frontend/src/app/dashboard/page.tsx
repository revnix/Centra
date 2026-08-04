'use client';

import { useApplications } from '@/lib/hooks/useApplications';
import { useJobs } from '@/lib/hooks/useJobs';
import {
  Users, Briefcase, TrendingUp, Sparkles, ArrowRight,
  Loader2, CheckCircle2, Zap, MoreHorizontal, Clock, Calendar
} from 'lucide-react';
import Link from 'next/link';
import type { Application, Job } from '@/lib/types';
import { useMemo, useState } from 'react';

export default function DashboardHome() {
  const { data: applications = [], isLoading: appsLoading } = useApplications();
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const [filterStage, setFilterStage] = useState('ALL');

  const isLoading = appsLoading || jobsLoading;

  const metrics = useMemo(() => {
    const totalApps = applications.length;
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((j: Job) => j.status === 'PUBLISHED').length;
    const avgScore = totalApps > 0
      ? Math.round(applications.reduce((acc: number, a: Application) => acc + (a.match_score ?? a.ai_score ?? 0), 0) / totalApps)
      : 0;
    const hiredCount = applications.filter((a: Application) => (a.status || '').toUpperCase() === 'HIRED').length;

    return { totalApps, totalJobs, activeJobs, avgScore, hiredCount };
  }, [applications, jobs]);

  const recentApps = useMemo(() => {
    let list = [...applications];
    if (filterStage !== 'ALL') {
      list = list.filter(a => (a.status || '').toUpperCase() === filterStage);
    }
    return list.slice(0, 5);
  }, [applications, filterStage]);

  const formatTimeAgo = (dateInput?: string | Date): string => {
    if (!dateInput) return 'Recently';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const activityLogs = useMemo(() => {
    const logs: Array<{ id: string; title: string; time: string; icon: any; date: Date }> = [];

    // Process Applications into Activity items
    applications.forEach((app: Application) => {
      const candName = app.candidate?.full_name || 'Candidate';
      const jobTitle = app.job?.title || 'Position';
      const dateStr = app.created_at || app.applied_at;
      const dateObj = dateStr ? new Date(dateStr) : new Date(0);

      const statusUpper = (app.status || '').toUpperCase();
      if (statusUpper === 'HIRED') {
        logs.push({
          id: `app-hired-${app.id}`,
          title: `${candName} hired for ${jobTitle}`,
          time: formatTimeAgo(dateStr),
          icon: CheckCircle2,
          date: dateObj,
        });
      } else if (statusUpper.includes('INTERVIEW')) {
        logs.push({
          id: `app-interview-${app.id}`,
          title: `Interview scheduled with ${candName}`,
          time: formatTimeAgo(dateStr),
          icon: Users,
          date: dateObj,
        });
      } else {
        logs.push({
          id: `app-screened-${app.id}`,
          title: `AI Screened ${candName}`,
          time: formatTimeAgo(dateStr),
          icon: Zap,
          date: dateObj,
        });
      }
    });

    // Process Jobs into Activity items
    jobs.forEach((job: Job) => {
      const dateStr = job.created_at;
      const dateObj = dateStr ? new Date(dateStr) : new Date(0);
      logs.push({
        id: `job-created-${job.id}`,
        title: `Job Posting: ${job.title}`,
        time: formatTimeAgo(dateStr),
        icon: Briefcase,
        date: dateObj,
      });
    });

    // Sort descending by date
    logs.sort((a, b) => b.date.getTime() - a.date.getTime());
    return logs.slice(0, 5);
  }, [applications, jobs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-100 border border-blue-300 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">HQ Overview</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome to Evalyn</h1>
          <p className="text-base text-slate-500 mt-1">Your AI-powered recruitment engine is running smoothly.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-glass flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" /> Last 30 Days
          </button>
        </div>
      </div>

      {/* Striking Metric Cards with Mini-Charts (Simulated) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Openings', value: metrics.activeJobs, trend: '+2', trendUp: true, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Applicants', value: metrics.totalApps, trend: '+14%', trendUp: true, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'AI Match Avg',  value: `${metrics.avgScore}%`, trend: '+5%', trendUp: true, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Hired Candidates', value: metrics.hiredCount, trend: 'Steady', trendUp: true, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((m) => (
          <div key={m.label} className="panel-elevated p-5 relative overflow-hidden group">
            {/* Background decorative blob */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${m.bg} opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>
            
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200`}>
                {m.trend}
              </span>
            </div>
            
            <div className="relative z-10">
              <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">{m.value}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">{m.label}</p>
            </div>

            {/* Simulated mini chart */}
            <div className="absolute bottom-0 left-0 right-0 h-10 opacity-20 pointer-events-none">
              <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-blue-600 stroke-current">
                <path d="M0,20 L10,15 L20,18 L30,5 L40,12 L50,8 L60,15 L70,2 L80,10 L90,5 L100,20" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Split */}
      <div className="grid lg:grid-cols-3 gap-8">

        {/* Candidate Feed (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Talent Pipeline</h2>
            
            <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
              {['ALL', 'APPLIED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStage(st)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    filterStage === st ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st.split('_')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {recentApps.length === 0 ? (
              <div className="panel-elevated p-12 text-center text-slate-400 font-medium">
                No candidates found.
              </div>
            ) : recentApps.map((app: Application, idx: number) => {
              const name = app.candidate?.full_name || 'Unknown';
              const role = app.job?.title || 'Open Position';
              const score = app.match_score ?? app.ai_score ?? 0;
              const statusClass = app.status === 'HIRED' ? 'border-status-hired' : 
                                  app.status?.includes('INTERVIEW') ? 'border-status-interview' :
                                  app.status === 'SHORTLISTED' ? 'border-status-screening' : 'border-status-applied';

              return (
                <Link key={app.id} href={`/dashboard/applications/${app.id}`} className="block">
                  <div
                    className={`panel-elevated p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] cursor-pointer group ${statusClass}`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 shadow-sm flex items-center justify-center font-bold text-lg text-slate-700 flex-shrink-0 group-hover:scale-105 transition-transform">
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-slate-500 truncate">{role}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="text-xs font-semibold text-blue-600">{app.status || 'APPLIED'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0 justify-between sm:justify-end">
                      {/* Circular Score */}
                      <div className="flex items-center gap-3 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-100">
                        <div className="relative w-8 h-8">
                          <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
                            <path
                              className="text-slate-200"
                              strokeWidth="3"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className={score > 75 ? "text-blue-600" : "text-blue-500"}
                              strokeDasharray={`${score}, 100`}
                              strokeWidth="3"
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[0.6rem] font-bold text-slate-700">
                            {score}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-600 hidden sm:block">Match</span>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          
          <Link href="/dashboard/applications" className="block">
            <button className="w-full py-4 text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-center gap-2">
              View All Candidates <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* Right Sidebar: Timeline & AI */}
        <div className="space-y-6">
          <div className="panel-elevated p-6 bg-slate-900 text-white border-none shadow-[0_10px_40px_-10px_rgba(37,99,235,0.4)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">AI Copilot Active</h3>
                <p className="text-xs text-blue-200">Evaluating {metrics.totalApps} applications</p>
              </div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 mb-2">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${metrics.avgScore > 0 ? metrics.avgScore : 100}%` }}></div>
            </div>
            <p className="text-xs text-blue-200/70 text-right">{metrics.avgScore > 0 ? `${metrics.avgScore}% Evaluated` : '100% Active'}</p>
          </div>

          <div className="panel-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Activity Log</h3>
              <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-5 h-5" /></button>
            </div>
            
            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No recent activity logged.</p>
            ) : (
              <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {activityLogs.map((item, i) => (
                  <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-50 text-blue-600 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-900 truncate" title={item.title}>{item.title}</h4>
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" /> {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
