"use client";

import { use, useState } from "react";
import { useJob, usePublishJob, useCloseJob } from "@/lib/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Globe, Users, Archive, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DashboardJobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: job, isLoading, error } = useJob(id);
    const publishMutation = usePublishJob();
    const closeMutation = useCloseJob();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
                <p className="text-muted-foreground mb-6">The job you are looking for could not be found or has been deleted.</p>
                <Link href="/dashboard/jobs">
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
                    </Button>
                </Link>
            </div>
        );
    }

    const isActive = job.status === "published";
    const isDraft = job.status === "draft";

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <Link href="/dashboard/jobs" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Jobs
                </Link>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{job.title}</h1>
                        <div className="flex items-center gap-3 mt-2">
                            <Badge variant={isActive ? "default" : "secondary"} className="capitalize">
                                {job.status}
                            </Badge>
                            <span className="text-muted-foreground text-sm">•</span>
                            <span className="text-muted-foreground text-sm">{job.department || "No Department"}</span>
                            <span className="text-muted-foreground text-sm">•</span>
                            <span className="text-muted-foreground text-sm">{job.location || "Remote"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isDraft && (
                            <Button
                                onClick={() => publishMutation.mutate(job.id)}
                                disabled={publishMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                {publishMutation.isPending ? "Publishing..." : "Publish Job"}
                            </Button>
                        )}
                        {isActive && (
                            <Button variant="outline">
                                <Globe className="w-4 h-4 mr-2" /> View Live
                            </Button>
                        )}
                        <Button variant="outline">
                            <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Link href={`/dashboard/jobs/${job.id}/candidates`}>
                            <Button variant="secondary">
                                <Users className="w-4 h-4 mr-2" /> Candidates
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent className="prose dark:prose-invert max-w-none">
                            <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                                {job.description}
                            </p>
                        </CardContent>
                    </Card>

                    {job.requirements && job.requirements.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Requirements</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                    {job.requirements.map((req: string, i: number) => (
                                        <li key={i}>{req}</li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Job Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Employment Type</h4>
                                <p className="font-medium">{job.type || "Full-time"}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Salary Range</h4>
                                <p className="font-medium">{job.salary_range || "Not specified"}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Posted Date</h4>
                                <p className="font-medium">{job.created_at ? new Date(job.created_at).toLocaleDateString() : "N/A"}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Hiring Team
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                    HR
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Hiring Manager</p>
                                    <p className="text-xs text-muted-foreground">Admin</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {isActive && (
                        <Card className="border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
                            <CardContent className="pt-6">
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => closeMutation.mutate(job.id)}
                                    disabled={closeMutation.isPending}
                                >
                                    <Archive className="w-4 h-4 mr-2" />
                                    {closeMutation.isPending ? "Closing..." : "Close Job Posting"}
                                </Button>
                                <p className="text-xs text-center text-muted-foreground mt-2">
                                    No longer accepting applications
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
