'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Users, TrendingUp, Clock, Plus, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

/**
 * Jobs Dashboard Page
 * Modern, attractive overview of job postings with gradient cards and animations
 */

export default function JobsPage() {
    // TODO: Fetch from API using useJobs hook
    const mockJobs = [
        {
            id: '1',
            title: 'Senior Frontend Engineer',
            department: 'Engineering',
            status: 'interviewing' as const,
            candidateCount: 12,
            pendingActionCount: 3,
        },
        {
            id: '2',
            title: 'Product Manager',
            department: 'Product',
            status: 'posted' as const,
            candidateCount: 8,
            pendingActionCount: 1,
        },
        {
            id: '3',
            title: 'UX Designer',
            department: 'Design',
            status: 'draft' as const,
            candidateCount: 0,
            pendingActionCount: 1,
        },
    ];

    const getStatusConfig = (status: string) => {
        const configs = {
            draft: {
                bg: 'bg-slate-100',
                text: 'text-slate-700',
                border: 'border-slate-200'
            },
            posted: {
                bg: 'bg-gradient-to-r from-blue-100 to-indigo-100',
                text: 'text-indigo-700',
                border: 'border-indigo-200'
            },
            interviewing: {
                bg: 'bg-gradient-to-r from-amber-100 to-orange-100',
                text: 'text-amber-700',
                border: 'border-amber-200'
            },
            closed: {
                bg: 'bg-gradient-to-r from-emerald-100 to-green-100',
                text: 'text-green-700',
                border: 'border-green-200'
            },
        };
        return configs[status as keyof typeof configs] || configs.draft;
    };

    const stats = [
        {
            title: 'Total Jobs',
            value: mockJobs.length,
            icon: Briefcase,
            gradient: 'from-indigo-500 to-purple-600',
            iconBg: 'bg-indigo-100',
            iconColor: 'text-indigo-600'
        },
        {
            title: 'Total Candidates',
            value: mockJobs.reduce((sum, job) => sum + job.candidateCount, 0),
            icon: Users,
            gradient: 'from-emerald-500 to-teal-600',
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-600'
        },
        {
            title: 'Active Interviews',
            value: mockJobs.filter((j) => j.status === 'interviewing').length,
            icon: TrendingUp,
            gradient: 'from-blue-500 to-cyan-600',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600'
        },
        {
            title: 'Needs Review',
            value: mockJobs.reduce((sum, job) => sum + job.pendingActionCount, 0),
            icon: Clock,
            gradient: 'from-amber-500 to-orange-600',
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            highlight: true
        },
    ];

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent">
                        Job Postings
                    </h1>
                    <p className="text-slate-500 mt-1">Manage your hiring pipeline with ease</p>
                </div>
                <Link href="/dashboard/jobs/new">
                    <Button size="lg" className="btn-premium text-white border-0 gap-2 group">
                        <Plus className="h-5 w-5 transition-transform group-hover:rotate-90 duration-300" />
                        Create New Job
                        <Sparkles className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, index) => (
                    <Card
                        key={stat.title}
                        className="stat-card border-0 shadow-lg overflow-hidden animate-fade-in-up"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                    <p className={`text-3xl font-bold ${stat.highlight ? 'text-amber-600' : 'text-slate-900'}`}>
                                        {stat.value}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-xl ${stat.iconBg} icon-container`}>
                                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                                </div>
                            </div>
                            <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${stat.gradient} opacity-30`} />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Jobs grid */}
            <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Active Positions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mockJobs.map((job, index) => {
                        const statusConfig = getStatusConfig(job.status);
                        return (
                            <Card
                                key={job.id}
                                className="glass border border-white/40 shadow-lg card-glow animate-fade-in-up group"
                                style={{ animationDelay: `${(index + 4) * 100}ms` }}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                                                {job.title}
                                            </CardTitle>
                                            <CardDescription className="mt-1 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400" />
                                                {job.department}
                                            </CardDescription>
                                        </div>
                                        <Badge
                                            className={`${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} capitalize text-xs px-2.5 py-0.5`}
                                        >
                                            {job.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Candidates
                                        </span>
                                        <span className="font-semibold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs">
                                            {job.candidateCount}
                                        </span>
                                    </div>

                                    {job.pendingActionCount > 0 && (
                                        <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-lg">
                                            <div className="relative">
                                                <Clock className="h-4 w-4 text-amber-600" />
                                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                                            </div>
                                            <span className="text-sm font-medium text-amber-800">
                                                {job.pendingActionCount} action{job.pendingActionCount !== 1 ? 's' : ''} needed
                                            </span>
                                        </div>
                                    )}

                                    <Link href={`/dashboard/jobs/${job.id}/candidates`}>
                                        <Button
                                            variant="outline"
                                            className="w-full mt-2 group/btn hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all"
                                        >
                                            View Candidates
                                            <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

