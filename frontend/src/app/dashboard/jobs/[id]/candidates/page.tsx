"use client";

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
    Mail
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Candidate Leaderboard Page
 * Single table showing all candidates ranked by score
 */

// Mock data
const mockCandidates = [
    { id: '1', name: 'Sarah Chen', role: 'Frontend Engineer', score: 96, avatar: 'SC' },
    { id: '11', name: 'Omar Hassan', role: 'Data Scientist', score: 95, avatar: 'OH' },
    { id: '5', name: 'Marcus Williams', role: 'Backend Engineer', score: 94, avatar: 'MW' },
    { id: '8', name: 'Jessica Park', role: 'Product Designer', score: 92, avatar: 'JP' },
    { id: '2', name: 'Alex Johnson', role: 'Frontend Engineer', score: 91, avatar: 'AJ' },
    { id: '12', name: 'Nina Patel', role: 'Data Scientist', score: 90, avatar: 'NP' },
    { id: '6', name: 'Priya Patel', role: 'Backend Engineer', score: 89, avatar: 'PP' },
    { id: '3', name: 'Emily Rodriguez', role: 'Frontend Engineer', score: 88, avatar: 'ER' },
    { id: '9', name: 'Michael Torres', role: 'Product Designer', score: 87, avatar: 'MT' },
    { id: '7', name: 'James Lee', role: 'Backend Engineer', score: 85, avatar: 'JL' },
    { id: '4', name: 'David Kim', role: 'Frontend Engineer', score: 82, avatar: 'DK' },
    { id: '10', name: 'Lisa Wang', role: 'Product Designer', score: 78, avatar: 'LW' },
].sort((a, b) => b.score - a.score);

const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
};

const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
        'Frontend Engineer': 'bg-blue-100 text-blue-700',
        'Backend Engineer': 'bg-purple-100 text-purple-700',
        'Product Designer': 'bg-pink-100 text-pink-700',
        'Data Scientist': 'bg-green-100 text-green-700',
    };
    return colors[role] || 'bg-slate-100 text-slate-700';
};

const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-medium text-slate-500">{rank}</span>;
};

export default function CandidatePipelinePage({ params }: { params: { id: string } }) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/jobs" className="text-slate-500 hover:text-slate-900">
                            Jobs
                        </Link>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                        <h1 className="text-3xl font-bold text-slate-900">Candidate Leaderboard</h1>
                    </div>
                    <p className="text-slate-500 mt-1">Ranked by AI match score</p>
                </div>
                <Badge className="bg-blue-600 text-white px-4 py-2">
                    {mockCandidates.length} Candidates
                </Badge>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Avg Score</p>
                                <p className="text-2xl font-bold">88%</p>
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
                                <p className="text-sm text-slate-500">Top Scorer</p>
                                <p className="text-2xl font-bold">96%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Medal className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Roles</p>
                                <p className="text-2xl font-bold">4</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">90+ Scores</p>
                                <p className="text-2xl font-bold">{mockCandidates.filter(c => c.score >= 90).length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Single Leaderboard Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Candidates</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16 text-center">Rank</TableHead>
                                <TableHead>Candidate</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right w-24">Score</TableHead>
                                <TableHead className="w-[180px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockCandidates.map((candidate, index) => (
                                <TableRow
                                    key={candidate.id}
                                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => window.location.href = `/dashboard/candidates/${candidate.id}`}
                                >
                                    <TableCell className="text-center">
                                        <div className="flex justify-center">
                                            {getRankDisplay(index + 1)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarFallback className={`text-sm font-semibold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-slate-100 text-slate-700' :
                                                        index === 2 ? 'bg-amber-100 text-amber-700' :
                                                            'bg-blue-50 text-blue-700'
                                                    }`}>
                                                    {candidate.avatar}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium text-slate-900">{candidate.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={getRoleBadgeColor(candidate.role)}>
                                            {candidate.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={`px-3 py-1 rounded-full font-bold ${getScoreColor(candidate.score)}`}>
                                            {candidate.score}%
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                alert(`Onboarding initiated for ${candidate.name}. Email sent!`);
                                            }}
                                        >
                                            <Mail className="mr-2 h-3.5 w-3.5" />
                                            Initiate Onboarding
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
