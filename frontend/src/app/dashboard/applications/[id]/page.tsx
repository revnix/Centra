"use client";

import { useState, useEffect, use } from "react";
import { api } from "@/lib/api";
import { resolveUrl } from "@/lib/api/client";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Download, ThumbsUp, ThumbsDown, MessageSquare, ExternalLink, Loader2, Code2, User as UserIcon, Bot as BotIcon, Zap, Monitor, DollarSign, RotateCcw } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [app, setApp] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showResendDialog, setShowResendDialog] = useState(false);
    const [resendSubject, setResendSubject] = useState("");
    const [resendMessage, setResendMessage] = useState("");
    const [isResending, setIsResending] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchApplication = async () => {
            try {
                const data = await api.applications.get(id);
                setApp(data);
            } catch (error) {
                console.error("Failed to fetch application:", error);
                setApp(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchApplication();
    }, [id]);

    const handleReject = async () => {
        setIsActionLoading(true);
        try {
            await api.applications.reject(id);
            toast.success("Candidate rejected successfully");
            // Refresh data
            const updated = await api.applications.get(id);
            setApp(updated);
        } catch (error) {
            toast.error("Failed to reject candidate");
            console.error(error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleHire = async () => {
        setIsActionLoading(true);
        try {
            await api.applications.hire(id);
            toast.success("Candidate hired! Offer letter sent via email.");
            // Refresh data
            const updated = await api.applications.get(id);
            setApp(updated);
        } catch (error) {
            toast.error("Failed to hire candidate");
            console.error(error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const openResendDialog = () => {
        const candidateName = app?.candidate?.full_name || "Candidate";
        const jobTitle = app?.job?.title || "the position";
        const status = app?.status;

        if (status === "REJECTED") {
            setResendSubject(`Application Status Update – ${jobTitle}`);
            setResendMessage(`Dear ${candidateName},\n\nThank you for applying for the ${jobTitle} position. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\nWe appreciate your interest and wish you the best in your job search.\n\nBest regards,\nHR Team`);
        } else if (status === "HIRED") {
            setResendSubject(`Congratulations! Job Offer – ${jobTitle}`);
            setResendMessage(`Dear ${candidateName},\n\nCongratulations! We are pleased to offer you the ${jobTitle} position. Please reply to confirm your acceptance.\n\nBest regards,\nHR Team`);
        } else {
            setResendSubject(`Interview Invitation – ${jobTitle}`);
            setResendMessage(`Dear ${candidateName},\n\nWe are pleased to inform you that after reviewing your application for the ${jobTitle} position, we would like to invite you for an interview.\n\nPlease reply to this email or contact us to schedule a convenient time.\n\nWe look forward to speaking with you.\n\nBest regards,\nHR Team`);
        }
        setShowResendDialog(true);
    };

    const handleResendEmail = async () => {
        setIsResending(true);
        try {
            if (app?.status === "REJECTED") {
                await api.applications.reject(id);
            } else if (app?.status === "HIRED") {
                await api.applications.hire(id);
            } else {
                await api.applications.shortlist(id);
            }
            toast.success("Email resent successfully!");
            setShowResendDialog(false);
            setResendMessage("");
            const updated = await api.applications.get(id);
            setApp(updated);
        } catch (error: any) {
            toast.error(`Failed to resend email: ${error.message || "Please try again"}`);
        } finally {
            setIsResending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!app) notFound();

    const getInitials = (name: string) => name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "??";
    const candidate = app.candidate;
    const profile = candidate?.candidate_profile;
    const job = app.job;

    return (
        <>
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
                            {candidate?.full_name || "Unknown Candidate"}
                            <StatusBadge status={app.status} showIcon={false} />
                        </h1>
                        <p className="text-muted-foreground">Applying for <span className="font-medium text-foreground">{job?.title || "Unknown Job"}</span></p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {profile?.resume_url && (
                        <a href={resolveUrl(profile.resume_url)} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline">
                                <Download className="w-4 h-4 mr-2" /> View Resume
                            </Button>
                        </a>
                    )}

                    {app.status === 'SCREENING' && (
                        <Button
                            variant="secondary"
                            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                            onClick={async () => {
                                setIsActionLoading(true);
                                try {
                                    await api.applications.shortlist(id);
                                    toast.success("Candidate shortlisted & interview invite sent!");
                                    const updated = await api.applications.get(id);
                                    setApp(updated);
                                } catch (error) {
                                    toast.error("Failed to shortlist candidate");
                                    console.error(error);
                                } finally {
                                    setIsActionLoading(false);
                                }
                            }}
                            disabled={isActionLoading}
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            {isActionLoading ? 'Sending Invite...' : 'Shortlist & Invite'}
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        onClick={openResendDialog}
                        disabled={isActionLoading}
                    >
                        <RotateCcw className="w-4 h-4" />
                        <Mail className="w-4 h-4" />
                        Resend Email
                    </Button>

                    <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={isActionLoading || app.status === 'REJECTED' || app.status === 'HIRED'}
                    >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        {isActionLoading ? 'Processing...' : 'Reject'}
                    </Button>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleHire}
                        disabled={isActionLoading || app.status === 'REJECTED' || app.status === 'HIRED'}
                    >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        {isActionLoading ? 'Processing...' : 'Hire Candidate'}
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
                                {app.interview_session?.feedback || app.ai_feedback || "No AI feedback available yet for this application."}
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-4 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Keywords & Skills</h4>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {profile?.skills && profile.skills.length > 0 ? (
                                            profile.skills.map((skill: string, i: number) => (
                                                <span key={i} className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-border text-xs font-medium">
                                                    {skill}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground">No skills listed</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-sm">
                        <CardHeader>
                            <CardTitle>Candidate Bio</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed italic">
                                "{profile?.bio || "No biography provided by the candidate."}"
                            </p>
                        </CardContent>
                    </Card>

                    {/* Screen Recording */}
                    {app.interview_session?.recording_path && (
                        <Card className="border-border shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-indigo-500" />
                                    Interview Screen Recording
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="aspect-video bg-black flex items-center justify-center">
                                    <video
                                        src={resolveUrl(app.interview_session.recording_path)}
                                        controls
                                        className="w-full h-full"
                                        poster="/video-poster.png"
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Interview Conversation Transcript */}
                    {app.interview_session?.transcript && app.interview_session.transcript.length > 0 && (
                        <Card className="border-border shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <BotIcon className="w-5 h-5 text-indigo-500" />
                                    Interview Conversation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[500px] overflow-y-auto p-6 space-y-6">
                                    {app.interview_session.transcript.map((msg: any, i: number) => (
                                        <div key={i} className={`flex gap-4 ${msg.role === 'ai' ? '' : 'flex-row-reverse'}`}>
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'ai' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {msg.role === 'ai' ? <BotIcon className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                                            </div>
                                            <div className={`flex-1 p-4 rounded-2xl text-sm ${msg.role === 'ai' ? 'bg-slate-100 dark:bg-slate-800 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
                                                <div className="font-bold mb-1 flex justify-between items-center">
                                                    <span>{msg.role === 'ai' ? 'Evalyn (AI)' : 'Candidate'}</span>
                                                    <span className="text-[10px] opacity-70 font-normal">
                                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>
                                                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Coding Submission */}
                    {app.interview_session?.code_submission && (
                        <Card className="border-border shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                        <Code2 className="w-5 h-5" />
                                        Coding Challenge Solution
                                    </div>
                                    {app.interview_session?.programming_language && (
                                        <span className="text-xs font-mono px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-300 dark:border-slate-700">
                                            {app.interview_session.programming_language.charAt(0).toUpperCase() + app.interview_session.programming_language.slice(1)}
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <pre className="p-6 bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
                                    {app.interview_session.code_submission}
                                </pre>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Col: Details */}
                <div className="space-y-6">
                    <Card className="border-border shadow-sm">
                        <CardContent className="pt-6 text-center space-y-4">
                            <div className="flex justify-center">
                                <ScoreRing score={app.match_score || 0} size="lg" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{(app.interview_session?.overall_score || app.match_score) ? `${(app.interview_session?.overall_score || app.match_score)}/100` : "N/A"}</div>
                                <div className="text-sm text-muted-foreground">Overall AI Match Score</div>
                            </div>

                            {app.interview_session?.overall_score && (
                                <div className="grid grid-cols-2 gap-3 w-full pt-2">
                                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-border">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Technical</div>
                                        <div className="text-lg font-bold text-indigo-600">{app.interview_session.technical_score || 0}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-border">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Communication</div>
                                        <div className="text-lg font-bold text-emerald-600">{app.interview_session.communication_score || 0}</div>
                                    </div>
                                </div>
                            )}

                            <Separator />
                            <div className="text-left space-y-3 pt-2">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    {candidate?.email}
                                </div>
                                {profile?.linkedin_url && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                            LinkedIn Profile
                                        </a>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-sm">
                                    <StatusBadge status={app.status} className="w-fit" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Job Details</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                            <div className="font-medium mb-1">{job?.title}</div>
                            <div className="text-muted-foreground mb-2">{job?.company_name} • {job?.location}</div>
                            <Link href={`/jobs/${job?.id}`}>
                                <Button variant="link" size="sm" className="px-0 h-auto text-indigo-600">
                                    View Job Description
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {app.expected_salary && (
                        <Card className="border-border shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                                    Salary Expectation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Expected</span>
                                    <span className="text-lg font-bold">
                                        {Number(app.expected_salary).toLocaleString()}
                                    </span>
                                </div>
                                {app.job?.salary_max && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Job Budget Max</span>
                                        <span className="text-sm font-medium text-muted-foreground">
                                            {Number(app.job.salary_max).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    {app.salary_filter_status === 'within_budget' && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                            Within Budget
                                        </span>
                                    )}
                                    {app.salary_filter_status === 'above_budget' && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-3 py-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                                            Above Budget
                                        </span>
                                    )}
                                    {app.salary_filter_status === 'not_checked' && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
                                            No budget set on job
                                        </span>
                                    )}
                                </div>
                                {app.salary_filter_status === 'above_budget' && (
                                    <p className="text-[11px] text-muted-foreground bg-rose-50 dark:bg-rose-950/20 border border-rose-100 rounded p-2">
                                        Shortlist email was skipped due to salary. HR can still manually shortlist this candidate.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {(app.email_delivery_status && app.email_delivery_status !== 'PENDING') && (
                        <Card className="border-border shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center justify-between">
                                    Email Communication
                                    <div className={`w-2 h-2 rounded-full ${
                                        app.email_delivery_status === 'SENT' ? 'bg-emerald-500' :
                                        app.email_delivery_status === 'SKIPPED' ? 'bg-amber-400' :
                                        'bg-rose-500'
                                    }`} />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Delivery Status</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold ${
                                            app.email_delivery_status === 'SENT' ? 'text-emerald-600' :
                                            app.email_delivery_status === 'SKIPPED' ? 'text-amber-600' :
                                            'text-rose-600'
                                        }`}>
                                            {app.email_delivery_status}
                                        </span>
                                    </div>
                                </div>
                                {app.email_logs && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Logs / Details</span>
                                        <p className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800 break-words italic">
                                            {app.email_logs}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

            </div>
        </div>

        <Dialog open={showResendDialog} onOpenChange={setShowResendDialog}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-indigo-600" />
                        Resend Email to {candidate?.full_name || "Candidate"}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Subject</label>
                        <input
                            type="text"
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950"
                            value={resendSubject}
                            onChange={(e) => setResendSubject(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Message</label>
                        <textarea
                            className="flex min-h-[280px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 resize-none"
                            value={resendMessage}
                            onChange={(e) => setResendMessage(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            The candidate's name will be added as a greeting automatically.
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setShowResendDialog(false)} disabled={isResending}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        onClick={handleResendEmail}
                        disabled={isResending}
                    >
                        {isResending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Mail className="h-4 w-4" />
                        )}
                        {isResending ? "Sending..." : "Send Email"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
