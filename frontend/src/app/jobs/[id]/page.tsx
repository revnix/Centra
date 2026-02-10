"use client";

import { use } from "react";
import { useJob } from "@/lib/hooks/useJobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Briefcase,
    MapPin,
    DollarSign,
    Clock,
    Users,
    Sparkles,
    CheckCircle2,
    Building2,
    Calendar,
    Share2,
    Bookmark,
    ArrowLeft,
    ArrowRight,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: job, isLoading, error } = useJob(id);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-slate-900">Job Not Found</h1>
                    <p className="text-slate-600">The job posting you are looking for does not exist or has been removed.</p>
                    <Link href="/jobs">
                        <Button>Browse All Jobs</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/jobs" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                        <ArrowLeft className="h-5 w-5" />
                        <span>Back to Jobs</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => {
                            navigator.share?.({
                                title: job.title,
                                text: `Check out this ${job.title} role at ${job.company_name}`,
                                url: window.location.href
                            }).catch(() => { });
                        }}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                        </Button>
                        <Button variant="outline" size="sm">
                            <Bookmark className="h-4 w-4 mr-2" />
                            Save
                        </Button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Job Header */}
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 uppercase">
                                            {(job.company_name || "C")[0]}
                                        </div>
                                        <div className="flex-1">
                                            <h1 className="text-3xl font-bold text-slate-900">{job.title}</h1>
                                            <p className="text-lg text-slate-700 font-medium mt-1">{job.company_name || "Confidential Company"}</p>

                                            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-4 w-4" />
                                                    {job.location || "Remote"}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Briefcase className="h-4 w-4" />
                                                    {job.job_type ? job.job_type.replace('_', ' ') : "Full Time"}
                                                </div>
                                                {job.salary_range && (
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="h-4 w-4" />
                                                        {job.salary_range}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    {job.created_at ? format(new Date(job.created_at), 'PPP') : "Recently"}
                                                </div>
                                            </div>

                                            {job.tags && job.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-4">
                                                    {job.tags.map((tag: string) => (
                                                        <Badge key={tag} variant="secondary" className="bg-blue-50 text-blue-700">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Description */}
                            <Card>
                                <CardContent className="p-6 space-y-6">
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900 mb-3">About the Role</h2>
                                        <div className="prose prose-slate max-w-none text-slate-600">
                                            <p className="whitespace-pre-wrap">{job.description}</p>
                                        </div>
                                    </div>

                                    {job.required_skills && job.required_skills.length > 0 && (
                                        <>
                                            <Separator />
                                            <div>
                                                <h2 className="text-xl font-semibold text-slate-900 mb-3">Requirements</h2>
                                                <ul className="space-y-2">
                                                    {job.required_skills.map((item: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2">
                                                            <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                                            <span className="text-slate-600">{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </>
                                    )}

                                    {job.benefits && job.benefits.length > 0 && (
                                        <>
                                            <Separator />
                                            <div>
                                                <h2 className="text-xl font-semibold text-slate-900 mb-3">Benefits</h2>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {job.benefits.map((item: string, i: number) => (
                                                        <div key={i} className="flex items-start gap-2">
                                                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                            <span className="text-slate-600">{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4">
                            {/* Apply Card */}
                            <Card className="sticky top-24">
                                <CardContent className="p-6 space-y-4">
                                    {job.status === 'PUBLISHED' ? (
                                        <Link href={`/jobs/${job.id}/apply?source_url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}>
                                            <Button
                                                size="lg"
                                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 text-base"
                                            >
                                                Apply Now
                                                <ArrowRight className="ml-2 h-5 w-5" />
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            size="lg"
                                            disabled
                                            className="w-full bg-slate-200 text-slate-500 h-12 text-base cursor-not-allowed hover:bg-slate-200"
                                        >
                                            {job.status === 'CLOSED' ? 'Position Closed' : 'Not Open For Applications'}
                                        </Button>
                                    )}

                                    <p className="text-sm text-slate-500 text-center">
                                        {job.status === 'PUBLISHED' ? 'Takes 2 minutes • No account required' : 'This position is currently not accepting applications.'}
                                    </p>

                                    <Separator />

                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar className="h-4 w-4" />
                                            <span>Posted {job.created_at ? format(new Date(job.created_at), 'MMM d, yyyy') : "Recently"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Users className="h-4 w-4" />
                                            <span>{job.department || "Engineering"} Department</span>
                                        </div>
                                        {job.company_size && (
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Building2 className="h-4 w-4" />
                                                <span>{job.company_size} employees</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
