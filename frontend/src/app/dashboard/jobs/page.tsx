import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Users, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';

/**
 * Jobs Dashboard Page
 * Overview of all job postings and their status
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

    const getStatusColor = (status: string) => {
        const colors = {
            draft: 'bg-slate-100 text-slate-700',
            posted: 'bg-blue-100 text-blue-700',
            interviewing: 'bg-amber-100 text-amber-700',
            closed: 'bg-green-100 text-green-700',
        };
        return colors[status as keyof typeof colors] || colors.draft;
    };

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Job Postings</h1>
                    <p className="text-slate-500 mt-1">Manage your hiring pipeline</p>
                </div>
                <Link href="/dashboard/jobs/new">
                    <Button size="lg">
                        <Briefcase className="h-5 w-5 mr-2" />
                        Create New Job
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                        <Briefcase className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockJobs.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                        <Users className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {mockJobs.reduce((sum, job) => sum + job.candidateCount, 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Interviews</CardTitle>
                        <TrendingUp className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {mockJobs.filter((j) => j.status === 'interviewing').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {mockJobs.reduce((sum, job) => sum + job.pendingActionCount, 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Jobs grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockJobs.map((job) => (
                    <Card key={job.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-lg">{job.title}</CardTitle>
                                    <CardDescription className="mt-1">{job.department}</CardDescription>
                                </div>
                                <Badge className={getStatusColor(job.status)} variant="secondary">
                                    {job.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Candidates</span>
                                <span className="font-medium">{job.candidateCount}</span>
                            </div>
                            {job.pendingActionCount > 0 && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
                                    <Clock className="h-4 w-4 text-amber-600" />
                                    <span className="text-sm text-amber-900">
                                        {job.pendingActionCount} action{job.pendingActionCount !== 1 ? 's' : ''} needed
                                    </span>
                                </div>
                            )}
                            <Link href={`/dashboard/jobs/${job.id}/candidates`}>
                                <Button variant="outline" className="w-full mt-2">
                                    View Candidates
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
