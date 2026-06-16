"use client";

import { motion } from "framer-motion";
import {
    Users, Briefcase, Zap, ArrowRight, FileText, TrendingUp,
    CheckCircle2, Clock, Loader2, Sparkles, BarChart3,
    Target, ArrowUpRight, ArrowDownRight, Circle,
    GitPullRequest, UserCheck, Calendar, ChevronRight, Flame
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats } from "@/lib/hooks/useJobs";

// ─── Animation Variants ────────────────────────────────────────────────────────
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    }),
};

// ─── Tiny Sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 80, h = 32;
    const points = data
        .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
        .join(" ");
    return (
        <svg width={w} height={h} className="opacity-70">
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
    );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: React.ElementType;
    trend?: { value: number; positive: boolean };
    sparkData?: number[];
    gradient: string;
    iconBg: string;
    sparkColor: string;
    href: string;
    index: number;
}

function StatCard({ title, value, subtitle, icon: Icon, trend, sparkData, gradient, iconBg, sparkColor, href, index }: StatCardProps) {
    return (
        <motion.div custom={index} variants={fadeUp} initial="hidden" animate="visible">
            <Link href={href}>
                <div className={`relative group overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${gradient}`}>
                    {/* Glow blob */}
                    <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-2xl group-hover:scale-125 transition-transform duration-500" />

                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-2.5 rounded-xl ${iconBg} shadow-lg`}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            {trend && (
                                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${trend.positive ? 'bg-emerald-500/20 text-emerald-100' : 'bg-red-500/20 text-red-100'}`}>
                                    {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {trend.value}%
                                </span>
                            )}
                        </div>

                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">{title}</p>
                                <p className="text-4xl font-bold text-white tabular-nums">{value}</p>
                                <p className="text-white/60 text-xs mt-1">{subtitle}</p>
                            </div>
                            {sparkData && <Sparkline data={sparkData} color="rgba(255,255,255,0.6)" />}
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

// ─── Pipeline Stage Bar ────────────────────────────────────────────────────────
const pipelineStages = [
    { label: "Applied", count: 38, color: "bg-indigo-500", light: "bg-indigo-50 text-indigo-700" },
    { label: "Screening", count: 24, color: "bg-violet-500", light: "bg-violet-50 text-violet-700" },
    { label: "Interview", count: 14, color: "bg-amber-500", light: "bg-amber-50 text-amber-700" },
    { label: "Offer", count: 6, color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700" },
    { label: "Hired", count: 3, color: "bg-teal-500", light: "bg-teal-50 text-teal-700" },
];

function PipelineFunnel() {
    const max = Math.max(...pipelineStages.map(s => s.count));
    return (
        <div className="space-y-3">
            {pipelineStages.map((stage, i) => (
                <motion.div
                    key={stage.label}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center gap-4"
                >
                    <span className="text-xs font-medium text-slate-500 w-16 text-right shrink-0">{stage.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <motion.div
                            className={`h-full rounded-full ${stage.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(stage.count / max) * 100}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                        />
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.light} w-8 text-center shrink-0`}>
                        {stage.count}
                    </span>
                </motion.div>
            ))}
        </div>
    );
}

// ─── Activity Feed ─────────────────────────────────────────────────────────────
const recentActivity = [
    { icon: FileText, color: "text-indigo-600 bg-indigo-50", label: "New application", sub: "Senior React Developer", time: "2m ago", badge: "Applied" },
    { icon: UserCheck, color: "text-emerald-600 bg-emerald-50", label: "Candidate shortlisted", sub: "Backend Engineer", time: "18m ago", badge: "Shortlisted" },
    { icon: Calendar, color: "text-violet-600 bg-violet-50", label: "Interview scheduled", sub: "Product Designer", time: "1h ago", badge: "Interview" },
    { icon: CheckCircle2, color: "text-teal-600 bg-teal-50", label: "Offer accepted", sub: "DevOps Engineer", time: "3h ago", badge: "Hired" },
    { icon: GitPullRequest, color: "text-amber-600 bg-amber-50", label: "Job post published", sub: "ML Engineer", time: "5h ago", badge: "Published" },
];

const badgeColors: Record<string, string> = {
    Applied: "bg-indigo-100 text-indigo-700",
    Shortlisted: "bg-emerald-100 text-emerald-700",
    Interview: "bg-violet-100 text-violet-700",
    Hired: "bg-teal-100 text-teal-700",
    Published: "bg-amber-100 text-amber-700",
};

// ─── Quick Action ──────────────────────────────────────────────────────────────
interface QuickActionProps {
    icon: React.ElementType;
    title: string;
    description: string;
    href: string;
    accent: string;
    index: number;
}

function QuickAction({ icon: Icon, title, description, href, accent, index }: QuickActionProps) {
    return (
        <motion.div custom={index} variants={fadeUp} initial="hidden" animate="visible">
            <Link href={href}>
                <div className="group flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all duration-200 cursor-pointer">
                    <div className={`p-2.5 rounded-xl ${accent} shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                        <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{title}</p>
                        <p className="text-xs text-slate-500 truncate">{description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
            </Link>
        </motion.div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const { data: stats, isLoading } = useDashboardStats();

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    const statCards: StatCardProps[] = [
        {
            title: "Total Applications",
            value: 12,
            subtitle: "+2 since yesterday",
            icon: Users,
            trend: { value: 16, positive: true },
            sparkData: [5, 7, 6, 9, 8, 10, 12],
            gradient: "bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600",
            iconBg: "bg-white/20",
            sparkColor: "#a5b4fc",
            href: "/dashboard/applications",
            index: 0,
        },
        {
            title: "Active Positions",
            value: stats?.total_jobs ?? 0,
            subtitle: "Open job postings",
            icon: Briefcase,
            trend: { value: 8, positive: true },
            sparkData: [30, 36, 38, 40, 41, 43, stats?.total_jobs ?? 44],
            gradient: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600",
            iconBg: "bg-white/20",
            sparkColor: "#6ee7b7",
            href: "/dashboard/jobs",
            index: 1,
        },
        {
            title: "Pending Actions",
            value: stats?.pending_actions ?? 0,
            subtitle: "Jobs needing review",
            icon: Zap,
            trend: { value: 4, positive: false },
            sparkData: [30, 28, 27, 26, 28, 25, stats?.pending_actions ?? 25],
            gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500",
            iconBg: "bg-white/20",
            sparkColor: "#fcd34d",
            href: "/dashboard/generated-jobs",
            index: 2,
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
                        <Loader2 className="h-8 w-8 animate-spin text-white absolute inset-0 m-auto" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium animate-pulse">Loading your workspace…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">

            {/* ── Header ── */}
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Flame className="h-5 w-5 text-amber-500" />
                        <span className="text-sm font-medium text-slate-500">{greeting}, Admin 👋</span>
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 bg-clip-text text-transparent">
                        Dashboard Overview
                    </h1>
                    <p className="text-slate-500 mt-1.5 text-sm">
                        Here's what's happening across your hiring workspace today.
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-3">
                    <Link href="/dashboard/jobs/new">
                        <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 gap-2 rounded-xl">
                            <Sparkles className="h-4 w-4" />
                            New Job Post
                        </Button>
                    </Link>
                </div>
            </motion.div>

            {/* ── Stat Cards ── */}
            <div className="grid gap-5 md:grid-cols-3">
                {statCards.map((card) => (
                    <StatCard key={card.title} {...card} />
                ))}
            </div>

            {/* ── Middle Row ── */}
            <div className="grid gap-6 lg:grid-cols-7">

                {/* Recent Activity */}
                <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
                            <div>
                                <h2 className="text-base font-semibold text-slate-800">Recent Activity</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Latest actions across your workspace</p>
                            </div>
                            <Link href="/dashboard/applications">
                                <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                                    View all <ArrowRight className="h-3 w-3" />
                                </button>
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {recentActivity.map((item, i) => (
                                <motion.div
                                    key={i}
                                    custom={i}
                                    variants={fadeUp}
                                    initial="hidden"
                                    animate="visible"
                                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors group cursor-pointer"
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                                        <p className="text-xs text-slate-500 truncate">{item.sub}</p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColors[item.badge]}`}>
                                            {item.badge}
                                        </span>
                                        <span className="text-xs text-slate-400">{item.time}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Right column */}
                <div className="lg:col-span-3 flex flex-col gap-6">

                    {/* Hiring Pipeline */}
                    <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4 text-indigo-500" />
                                        Hiring Pipeline
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Candidate flow this month</p>
                                </div>
                                <Link href="/dashboard/pipeline">
                                    <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                                        Pipeline <ArrowRight className="h-3 w-3" />
                                    </button>
                                </Link>
                            </div>
                            <PipelineFunnel />
                            <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                                    <span className="font-medium text-emerald-600">7.9%</span> conversion rate
                                </span>
                                <span className="text-slate-400">Last 30 days</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <Target className="h-4 w-4 text-violet-500" />
                                Quick Actions
                            </h2>
                            <div className="space-y-2">
                                <QuickAction icon={Briefcase} title="Post New Job" description="Create a manual job posting" href="/dashboard/jobs/new" accent="bg-gradient-to-br from-indigo-500 to-violet-600" index={7} />
                                <QuickAction icon={Sparkles} title="Generate with AI" description="Let AI write the job description" href="/dashboard/jobs/new" accent="bg-gradient-to-br from-violet-500 to-purple-600" index={8} />
                                <QuickAction icon={Users} title="View Applications" description="Review candidate submissions" href="/dashboard/applications" accent="bg-gradient-to-br from-emerald-500 to-teal-600" index={9} />
                                <QuickAction icon={TrendingUp} title="Candidate Pipeline" description="Track hiring progress" href="/dashboard/pipeline" accent="bg-gradient-to-br from-amber-500 to-orange-600" index={10} />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ── Bottom Strip ── */}
            <motion.div custom={11} variants={fadeUp} initial="hidden" animate="visible">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Avg. Time to Hire", value: "14 days", icon: Clock, color: "text-indigo-600 bg-indigo-50" },
                        { label: "Offer Acceptance", value: "87%", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
                        { label: "Active Interviewees", value: "14", icon: UserCheck, color: "text-violet-600 bg-violet-50" },
                        { label: "Positions Filled", value: "3 / 10", icon: Target, color: "text-amber-600 bg-amber-50" },
                    ].map((item, i) => (
                        <motion.div key={item.label} custom={i + 11} variants={fadeUp} initial="hidden" animate="visible">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                                <div className={`p-2.5 rounded-xl ${item.color} flex-shrink-0`}>
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-900 tabular-nums">{item.value}</p>
                                    <p className="text-xs text-slate-500">{item.label}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

        </div>
    );
}
