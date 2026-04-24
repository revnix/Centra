"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    CheckCircle2,
    Circle,
    Clock,
    Calendar,
    FileText,
    Video,
    Code,
    MessageSquare,
    Mail,
    ChevronRight,
    ExternalLink
} from 'lucide-react';
import { applicationsApi } from '@/lib/api/applications';
import Link from 'next/link';
import { motion } from 'framer-motion';

/**
 * Application Status Page - Candidate Portal
 * Shows real-time application progress
 */

export default function PortalStatusPage() {
    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchApps = async () => {
            try {
                const data = await applicationsApi.getMyApplications();
                setApplications(data);
            } catch (err) {
                console.error("Failed to fetch applications:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchApps();
    }, []);

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { label: string; color: string; icon: any }> = {
            'APPLIED': { label: 'Applied', color: 'bg-blue-100 text-blue-700', icon: Circle },
            'SCREENING': { label: 'In Review', color: 'bg-purple-100 text-purple-700', icon: Clock },
            'SHORTLISTED': { label: 'Shortlisted', color: 'bg-indigo-100 text-indigo-700', icon: CheckCircle2 },
            'INTERVIEW_INVITED': { label: 'Interview Scheduled', color: 'bg-amber-100 text-amber-700', icon: Video },
            'HIRED': { label: 'Hired', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
            'REJECTED': { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: Circle },
        };
        return configs[status.toUpperCase()] || { label: status, color: 'bg-slate-100 text-slate-700', icon: Circle };
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-64 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    if (applications.length === 0) {
        return (
            <Card className="text-center py-16">
                <CardContent>
                    <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-slate-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold">No Applications Yet</CardTitle>
                    <CardDescription className="max-w-xs mx-auto mt-2">
                        You haven't applied to any positions yet. Browse our job board to find your next role.
                    </CardDescription>
                    <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700 text-white">
                        <Link href="/jobs">Browse Jobs</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Your Journey</h1>
                    <p className="text-slate-500 mt-2 text-lg">Track your application status and next steps.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" asChild>
                        <Link href="/jobs" className="gap-2">Browse More Jobs <ExternalLink className="w-4 h-4" /></Link>
                    </Button>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 gap-8">
                {applications.map((app, index) => {
                    const config = getStatusConfig(app.status);
                    const StatusIcon = config.icon;
                    const isOnboarding = app.status === 'HIRED';

                    return (
                        <motion.div
                            key={app.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className={`overflow-hidden border-0 shadow-xl transition-all hover:shadow-2xl ${isOnboarding ? 'ring-2 ring-green-500 bg-green-50/10' : ''}`}>
                                <div className="p-6 md:p-8">
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        <div className="space-y-4 flex-1">
                                            <div className="flex items-center gap-3">
                                                <Badge className={`${config.color} border-none px-3 py-1 text-xs font-semibold uppercase tracking-wider`}>
                                                    {config.label}
                                                </Badge>
                                                {app.match_score && (
                                                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                                                        {app.match_score}% Match
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <h2 className="text-2xl font-bold text-slate-900">{app.job?.title}</h2>
                                                <p className="text-slate-500 flex items-center gap-2 mt-1">
                                                    {app.job?.company_name || 'Evalyn AI'} • {app.job?.location}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4" />
                                                    Applied {new Date(app.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                                            {isOnboarding ? (
                                                <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 py-6 text-lg font-bold group">
                                                    <Link href={`/portal/onboarding/${app.id}`}>
                                                        Start Onboarding
                                                        <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                    </Link>
                                                </Button>
                                            ) : app.status === 'INTERVIEW_INVITED' && app.interview_session?.token ? (
                                                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 py-6 text-lg font-bold group">
                                                    <Link href={`/interview/${app.interview_session.token}`}>
                                                        Take AI Interview
                                                        <Video className="ml-2 w-5 h-5" />
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <Button variant="secondary" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-6 font-semibold" disabled>
                                                    {app.status === 'APPLIED' ? 'Awaiting Review' : 'In Progress'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Simplified Timeline/Progress */}
                                    <div className="mt-8 pt-8 border-t border-slate-100">
                                        <div className="relative flex justify-between items-center max-w-2xl">
                                            {[
                                                { id: 'APPLIED', label: 'Applied' },
                                                { id: 'SCREENING', label: 'Screening' },
                                                { id: 'INTERVIEW_INVITED', label: 'Interview' },
                                                { id: 'HIRED', label: 'Hired' }
                                            ].map((step, i, arr) => {
                                                const currentStepIndex = arr.findIndex(s => s.id === app.status) || 0;
                                                const isCompleted = i <= currentStepIndex;
                                                const isCurrent = step.id === app.status;

                                                return (
                                                    <div key={step.id} className="flex flex-col items-center relative z-10">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                                            isCompleted ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
                                                        } ${isCurrent ? 'ring-4 ring-blue-100 animate-pulse' : ''}`}>
                                                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-4 h-4" />}
                                                        </div>
                                                        <span className={`text-[10px] md:text-xs font-bold mt-2 uppercase tracking-tighter ${isCompleted ? 'text-blue-600' : 'text-slate-400'}`}>
                                                            {step.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-100 -z-0" />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Support section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                <Card className="bg-slate-900 text-white border-0 overflow-hidden relative">
                    <CardHeader>
                        <CardTitle className="text-xl">Technical Support</CardTitle>
                        <CardDescription className="text-slate-400">Facing issues with the AI interview or portal?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0">
                            <Mail className="w-4 h-4 mr-2" /> Contact Support
                        </Button>
                    </CardContent>
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl" />
                </Card>

                <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-0">
                    <CardHeader>
                        <CardTitle className="text-xl">Career Advice</CardTitle>
                        <CardDescription className="text-indigo-100">Prepare for your upcoming AI assessment.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                            Read Interview Tips
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
