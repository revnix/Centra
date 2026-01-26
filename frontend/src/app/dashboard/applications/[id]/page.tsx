"use client";

import { use } from "react";
import { MOCK_APPLICATIONS, MOCK_JOBS } from "@/lib/mock-data";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Download, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const app = MOCK_APPLICATIONS.find(a => a.id === parseInt(id));

    if (!app) notFound();

    const job = MOCK_JOBS.find(j => j.id === app.jobId);
    const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

    return (
        <div className="space-y-6 max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/applications">
                        <Button variant="outline" size="icon" className="rounded-full">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {app.candidateName}
                            <StatusBadge status={app.status} showIcon={false} />
                        </h1>
                        <p className="text-muted-foreground">Applying for <span className="font-medium text-foreground">{job?.title}</span></p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" /> Resume
                    </Button>
                    <Button variant="destructive">
                        <ThumbsDown className="w-4 h-4 mr-2" /> Reject
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <ThumbsUp className="w-4 h-4 mr-2" /> Hire Candidate
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Col: Summary & Score */}
                <div className="space-y-6 md:col-span-2">
                    <Card className="border-border shadow-sm overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-indigo-500" />
                                AI Evaluation Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 leading-relaxed">
                                {app.summary}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Technical Skills</h4>
                                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 w-[85%]" />
                                    </div>
                                    <span className="text-xs font-bold float-right mt-1">High</span>
                                </div>
                                <div className="p-4 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Communication</h4>
                                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-[90%]" />
                                    </div>
                                    <span className="text-xs font-bold float-right mt-1">Excellent</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-sm">
                        <CardHeader>
                            <CardTitle>Interview Transcript</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 text-sm">
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">AI</div>
                                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg rounded-tl-none">
                                        Could you tell me about a challenging project you worked on?
                                    </div>
                                </div>
                                <div className="flex gap-4 flex-row-reverse">
                                    <Avatar className="w-8 h-8 h-8 w-8">
                                        <AvatarFallback className="text-xs">{getInitials(app.candidateName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg rounded-tr-none">
                                        In my last role, I led the migration of a legacy monolith to microservices...
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">AI</div>
                                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg rounded-tl-none">
                                        That sounds complex. How did you handle data consistency?
                                    </div>
                                </div>
                                {/* Mock Transcript End */}
                                <div className="text-center text-xs text-muted-foreground pt-4">
                                    End of Transcript
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Col: Details */}
                <div className="space-y-6">
                    <Card className="border-border shadow-sm">
                        <CardContent className="pt-6 text-center space-y-4">
                            <div className="flex justify-center">
                                <ScoreRing score={app.aiScore} size="lg" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{app.aiScore}/100</div>
                                <div className="text-sm text-muted-foreground">Overall Match Score</div>
                            </div>
                            <Separator />
                            <div className="text-left space-y-3 pt-2">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    {app.candidateEmail}
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <StatusBadge status={app.status} className="w-fit" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
