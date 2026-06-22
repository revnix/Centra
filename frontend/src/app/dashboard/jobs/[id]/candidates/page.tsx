"use client";

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Trophy,
    Medal,
    ChevronRight,
    TrendingUp,
    Users,
    Loader2,
    AlertCircle,
    Star,
} from 'lucide-react';
import Link from 'next/link';
import { applicationsApi } from '@/lib/api/applications';

// ── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

const getScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return 'text-slate-500 bg-slate-100';
    if (score >= 80) return 'text-green-700 bg-green-100';
    if (score >= 60) return 'text-amber-700 bg-amber-100';
    return 'text-red-700 bg-red-100';
};

const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
        APPLIED: 'bg-blue-100 text-blue-700',
        SHORTLISTED: 'bg-indigo-100 text-indigo-700',
        INTERVIEW_INVITED: 'bg-purple-100 text-purple-700',
        INTERVIEW_SCHEDULED: 'bg-violet-100 text-violet-700',
        INTERVIEW_IN_PROGRESS: 'bg-orange-100 text-orange-700',
        INTERVIEW_COMPLETED: 'bg-teal-100 text-teal-700',
        OFFER_EXTENDED: 'bg-cyan-100 text-cyan-700',
        OFFER_ACCEPTED: 'bg-emerald-100 text-emerald-700',
        ONBOARDING: 'bg-green-100 text-green-700',
        HIRED: 'bg-green-200 text-green-800',
        REJECTED: 'bg-red-100 text-red-700',
        WITHDRAWN: 'bg-slate-100 text-slate-500',
    };
    return map[status] || 'bg-slate-100 text-slate-700';
};

const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-medium text-slate-500">{rank}</span>;
};

const getAvatarClass = (index: number) => {
    if (index === 0) return 'bg-yellow-100 text-yellow-700';
    if (index === 1) return 'bg-slate-200 text-slate-700';
    if (index === 2) return 'bg-amber-100 text-amber-700';
    return 'bg-indigo-50 text-indigo-700';
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CandidatePipelinePage() {
    const params = useParams();
    const router = useRouter();
    const jobId = params.id as string;

    const { data: applications = [], isLoading, isError } = useQuery({
        queryKey: ['job-applications', jobId],
        queryFn: () => applicationsApi.getByJob(jobId),
        enabled: !!jobId,
    });

    // ── Derived stats ────────────────────────────────────────────────────────
    const scored = applications.filter((a: any) => a.match_score != null);
    const avgScore = scored.length
        ? Math.round(scored.reduce((s: number, a: any) => s + a.match_score, 0) / scored.length)
        : null;
    const topScore = scored.length
        ? Math.round(Math.max(...scored.map((a: any) => a.match_score)))
        : null;
    const above80 = applications.filter((a: any) => (a.match_score ?? 0) >= 80).length;

    // ── Loading / Error states ────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-72 gap-4 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p>Loading candidates…</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-72 gap-4 text-red-500">
                <AlertCircle className="h-8 w-8" />
                <p>Failed to load candidates. Please try again.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/jobs" className="text-slate-500 hover:text-slate-900 transition-colors">
                            Jobs
                        </Link>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                        <h1 className="text-3xl font-bold text-slate-900">Candidate Leaderboard</h1>
                    </div>
                    <p className="text-slate-500 mt-1">Ranked by AI match score • real applicants only</p>
                </div>
                <Badge className="bg-indigo-600 text-white px-4 py-2 text-sm">
                    {applications.length} Candidate{applications.length !== 1 ? 's' : ''}
                </Badge>
            </div>

            {/* ── Stats Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Avg Score</p>
                                <p className="text-2xl font-bold">{avgScore != null ? `${avgScore}%` : '—'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Trophy className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Top Score</p>
                                <p className="text-2xl font-bold">{topScore != null ? `${topScore}%` : '—'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Applied</p>
                                <p className="text-2xl font-bold">{applications.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Star className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">80%+ Score</p>
                                <p className="text-2xl font-bold">{above80}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Leaderboard Table ── */}
            <Card>
                <CardHeader>
                    <CardTitle>All Candidates</CardTitle>
                </CardHeader>
                <CardContent>
                    {applications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                            <Users className="h-12 w-12" />
                            <p className="text-lg font-medium">No applications yet</p>
                            <p className="text-sm">Candidates who apply to this job will appear here.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16 text-center">Rank</TableHead>
                                    <TableHead>Candidate</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>Qualification</TableHead>
                                    <TableHead className="text-right w-28">AI Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applications.map((app: any, index: number) => {
                                    const candidate = app.candidate;
                                    const name = candidate?.full_name || candidate?.email || 'Unknown';
                                    return (
                                        <TableRow
                                            key={app.id}
                                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => router.push(`/dashboard/applications/${app.id}`)}
                                        >
                                            <TableCell className="text-center">
                                                <div className="flex justify-center">
                                                    {getRankDisplay(index + 1)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarFallback className={`text-sm font-semibold ${getAvatarClass(index)}`}>
                                                            {getInitials(name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{name}</p>
                                                        {candidate?.email && (
                                                            <p className="text-xs text-slate-400">{candidate.email}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={getStatusColor(app.status)}>
                                                    {app.status?.replace(/_/g, ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-600 text-sm">
                                                {app.city || '—'}
                                            </TableCell>
                                            <TableCell className="text-slate-600 text-sm">
                                                {app.qualification || '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {app.match_score != null ? (
                                                    <span className={`px-3 py-1 rounded-full font-bold text-sm ${getScoreColor(app.match_score)}`}>
                                                        {Math.round(app.match_score)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-sm italic">Pending</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
