"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { onboardingApi } from "@/lib/api/onboarding";
import { screeningApi } from "@/lib/api/screening";
import { apiClient, resolveUrl } from "@/lib/api/client";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Eye, ThumbsUp, ThumbsDown, MessageSquare, ExternalLink, Loader2, Code2, User as UserIcon, Bot as BotIcon, Zap, Monitor, DollarSign, RotateCcw, Paperclip, X as XIcon, FileText } from "lucide-react";
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

function getViewableResumeUrl(url: string): string {
    if (!url.includes('cloudinary.com')) return url;
    if (url.includes('/raw/upload/')) {
        return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }
    return url;
}

// Inline Markdown link & list formatter for real-time onboarding dialog preview
const parseInlineMarkdown = (inlineText: string): React.ReactNode[] => {
    const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
    const parts = inlineText.split(regex);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('[') && part.includes('](')) {
            const closingBracket = part.indexOf(']');
            const text = part.slice(1, closingBracket);
            const url = part.slice(closingBracket + 2, -1);
            return (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium hover:text-blue-800">
                    {text}
                </a>
            );
        }
        return part;
    });
};

const renderMarkdownToHtml = (text: string) => {
    if (!text) return <p className="text-slate-400 italic">No message content.</p>;

    const lines = text.split("\n");
    const renderedLines: React.ReactNode[] = [];
    let currentListLevel = 0;
    let listItems: React.ReactNode[] = [];

    const flushList = (keyPrefix: string) => {
        if (listItems.length > 0) {
            renderedLines.push(
                <ul key={`ul-${keyPrefix}`} className="list-disc pl-5 my-1 space-y-1">
                    {listItems}
                </ul>
            );
            listItems = [];
            currentListLevel = 0;
        }
    };

    lines.forEach((line, lineIdx) => {
        const lineStripped = line.trim();
        if (!lineStripped) {
            flushList(`empty-${lineIdx}`);
            renderedLines.push(<div key={`br-${lineIdx}`} className="h-2" />);
            return;
        }

        const listMatch = line.match(/^(\s*)([\*\-])\s+(.*)$/);
        if (listMatch) {
            const indent = listMatch[1].length;
            const content = listMatch[3];
            const targetLevel = indent === 0 ? 1 : 2;
            const parsedContent = parseInlineMarkdown(content);

            if (targetLevel === 2) {
                listItems.push(
                    <li key={`li-sub-${lineIdx}`} className="ml-4 list-circle list-item text-slate-600">
                        {parsedContent}
                    </li>
                );
            } else {
                listItems.push(
                    <li key={`li-${lineIdx}`} className="list-item font-semibold text-slate-700">
                        {parsedContent}
                    </li>
                );
            }
        } else {
            flushList(`nolist-${lineIdx}`);
            renderedLines.push(
                <div key={`p-${lineIdx}`} className="text-slate-800 my-1 leading-relaxed whitespace-pre-wrap">
                    {parseInlineMarkdown(lineStripped)}
                </div>
            );
        }
    });

    flushList("final");
    return <div className="space-y-1 bg-slate-50 p-4 border border-slate-200 rounded-md text-sm text-slate-800 max-h-[300px] overflow-y-auto">{renderedLines}</div>;
};

export default function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [app, setApp] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isSendingScreening, setIsSendingScreening] = useState(false);
    const [screening, setScreening] = useState<any>(null);

    // Editable email dialog for Onboarding & Reject
    const [emailDialogMode, setEmailDialogMode] = useState<'onboarding' | 'reject' | 'documents' | null>(null);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [isEmailSending, setIsEmailSending] = useState(false);
    const [emailFiles, setEmailFiles] = useState<File[]>([]);
    const [dialogTab, setDialogTab] = useState<'write' | 'preview'>('write');
    const emailFileRef = useRef<HTMLInputElement>(null);
    const emailEditorRef = useRef<HTMLDivElement>(null);

    const addFiles = useCallback((setter: React.Dispatch<React.SetStateAction<File[]>>, incoming: FileList | null) => {
        if (!incoming) return;
        setter(prev => [...prev, ...Array.from(incoming)]);
    }, []);

    const removeFile = useCallback((setter: React.Dispatch<React.SetStateAction<File[]>>, index: number) => {
        setter(prev => prev.filter((_, i) => i !== index));
    }, []);

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
        const fetchScreening = async () => {
            try {
                const data = await screeningApi.getResult(id);
                setScreening(data);
            } catch {
                // no screening test yet — ignore 404
            }
        };
        fetchApplication();
        fetchScreening();

        // Auto-refresh the application status every 10 seconds in the background
        const interval = setInterval(fetchApplication, 10_000);
        return () => clearInterval(interval);
    }, [id]);

    const openEmailDialog = (mode: 'onboarding' | 'reject' | 'documents') => {
        const candidateName = app?.candidate?.full_name || "Candidate";
        const jobTitle = app?.job?.title || "the position";
        if (mode === 'onboarding') {
            setEmailSubject(`Congratulations! You've Been Selected – ${jobTitle}`);
            setEmailMessage(`Dear ${candidateName},\n\nWe are thrilled to inform you that after carefully reviewing your application and interview performance, we have decided to extend an offer for the ${jobTitle} position.\n\nPlease click the button below to complete your onboarding and upload the required documents.\n\nWelcome to the team!\n\nBest regards,\nHR Team`);
        } else if (mode === 'documents') {
            setEmailSubject("Welcome to the Team – Onboarding Resources & Documents");
            setEmailMessage(`Dear ${candidateName},<br/><br/>We're introducing our official workflow for you at the office! This email is designed to guide you through the onboarding process.<br/><br/>We believe in maintaining a healthy work-life balance, and one way to do that is by keeping personal and work tools separate for a more organised workspace.<br/><br/>Your separate identities (accounts) at Revnix are all set up.<br/><br/><strong>Email Details:</strong><br/>• ID: <em>(will be shared separately)</em><br/>• Password: <em>(will be shared separately)</em><br/><br/><strong>Basecamp Details:</strong><br/>• Invite sent<br/><br/>Feel free to update your passwords and enhance security by enabling the Passkey and Security Keys feature and 2FA using Google Authenticator on your accounts.<br/><br/>Please review the following documents to gain a better understanding of the culture at Revnix.<br/><br/>• <a href="https://docs.google.com/document/d/15q_tC1AiWCWhKWt57RJM4jALle07UXH1HZiJ4qf9aU0/edit?tab=t.0" target="_blank" style="color: #1155cc; text-decoration: underline;">Resource Central - Everyone</a> (Employee Self-Service)<br/>&nbsp;&nbsp;&nbsp;&nbsp;◦ Complete Your HR Profile (#1 Priority)<br/>&nbsp;&nbsp;&nbsp;&nbsp;◦ <a href="https://docs.google.com/document/d/1Kw7l0xU2B387d0V8NlIlOAzIxs83PMp3TTUaSF9KjY0/edit?tab=t.0" target="_blank" style="color: #1155cc; text-decoration: underline;">Daily Sync - Everyone</a> (EoD Update)<br/>• <a href="https://docs.google.com/document/d/1zux5VdQpEmPDVhSzhhG5wkjbL-10h5dL2tSDyMHZ_Bk/edit?tab=t.0#heading=h.uumvefgpfyt4" target="_blank" style="color: #1155cc; text-decoration: underline;">Applications Workflow Guide</a><br/>&nbsp;&nbsp;&nbsp;&nbsp;◦ <a href="https://docs.google.com/document/d/1SJY3XGF6_fJ_8n1PpPkq4BWBDBYA3PVm-Mbo6sosF80/edit?tab=t.0" target="_blank" style="color: #1155cc; text-decoration: underline;">GDrive LinkDeck - Everyone</a> (Important Links)<br/>&nbsp;&nbsp;&nbsp;&nbsp;◦ <a href="https://docs.google.com/document/d/1OIe4WWJa06oYpsFoQNSqM2z6cEaysj-vwOJuc_phprk/edit?tab=t.0" target="_blank" style="color: #1155cc; text-decoration: underline;">GDrive Walker - Technical</a><br/>• <a href="https://docs.google.com/document/d/1sJrAhsgFAAtMqSWERWu9abLrDBLCfKdD95z70x0N6KM/edit?tab=t.0" target="_blank" style="color: #1155cc; text-decoration: underline;">Intern Handbook</a><br/><br/>Please acknowledge by replying to this email once you set up your profiles and the handbook is reviewed. Also, do not hesitate to reach out if you have any suggestions.<br/><br/>Respectfully,<br/><strong>People Operations</strong>`);
        } else {
            setEmailSubject(`Update on Your Application – ${jobTitle}`);
            setEmailMessage(`Dear ${candidateName},\n\nThank you for applying for the ${jobTitle} position and participating in our selection process.\n\nAfter careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\nWe appreciate your interest and wish you the very best in your future endeavors.\n\nBest regards,\nHR Team`);
        }
        setEmailFiles([]);
        setEmailDialogMode(mode);
        setDialogTab('write');
    };

    const handleSendEmailAction = async () => {
        if (!emailDialogMode) return;
        setIsEmailSending(true);
        try {
            if (emailDialogMode === 'onboarding') {
                // Send onboarding welcome email with HR's custom text + portal link appended automatically
                await onboardingApi.sendWelcomeEmail(
                    Number(id),
                    emailFiles.length > 0 ? emailFiles : undefined,
                    emailSubject.trim(),
                    emailMessage.trim(),
                );
                await api.applications.updateStatus(id, 'HIRED');
                toast.success("Onboarding email sent! Candidate can now complete their onboarding.");
            } else if (emailDialogMode === 'documents') {
                // POST as multipart/form-data so backend receives subject + message + optional attachments
                const finalMessage = emailEditorRef.current ? emailEditorRef.current.innerHTML : emailMessage;
                const formData = new FormData();
                formData.append('subject', emailSubject.trim());
                formData.append('message', finalMessage.trim());
                emailFiles.forEach(f => formData.append('attachments', f));
                await apiClient.post(`/applications/${id}/send-documents`, formData);
                toast.success("Documents email sent to candidate!");
            } else {
                await api.applications.invite(id, emailSubject.trim(), emailMessage.trim(), emailFiles);
                await api.applications.updateStatus(id, 'REJECTED');
                toast.success("Rejection email sent!");
            }
            setEmailDialogMode(null);
            setEmailFiles([]);
            const updated = await api.applications.get(id);
            setApp(updated);
        } catch (error: any) {
            toast.error(`Failed to send email: ${error.message || "Please try again"}`);
        } finally {
            setIsEmailSending(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Reset email status? This will allow sending emails again for this application.")) return;
        setIsResetting(true);
        try {
            const updated = await api.applications.resetEmailStatus(id);
            setApp(updated);
            toast.success("Email status reset. You can now send emails again.");
        } catch (error: any) {
            toast.error(`Reset failed: ${error.message || "Please try again"}`);
        } finally {
            setIsResetting(false);
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

    const candidate = app.candidate;
    const profile = candidate?.candidate_profile;
    const job = app.job;

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
                            {candidate?.full_name || "Unknown Candidate"}
                            <StatusBadge status={app.status} showIcon={false} />
                        </h1>
                        <p className="text-muted-foreground">Applying for <span className="font-medium text-foreground">{job?.title || "Unknown Job"}</span></p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {profile?.resume_url && (
                        <a href={getViewableResumeUrl(resolveUrl(profile.resume_url))} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline">
                                <Eye className="w-4 h-4 mr-2" /> View Resume
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
                        disabled={isSendingScreening || isActionLoading}
                        onClick={async () => {
                            setIsSendingScreening(true);
                            try {
                                await apiClient.post(`/screening/create/${id}`);
                                toast.success("Screening test email sent! Candidate has 72 hours to complete it.");
                            } catch (err: any) {
                                toast.error(err?.message || "Failed to send screening test");
                            } finally {
                                setIsSendingScreening(false);
                            }
                        }}
                    >
                        {isSendingScreening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        {isSendingScreening ? "Sending…" : "Send Screening Test"}
                    </Button>

                    <Button
                        variant="outline"
                        className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                        onClick={handleReset}
                        disabled={isResetting || isActionLoading}
                    >
                        <RotateCcw className="w-4 h-4" />
                        {isResetting ? "Resetting..." : "Reset"}
                    </Button>

                    <Button
                        variant="destructive"
                        onClick={() => openEmailDialog('reject')}
                        disabled={isActionLoading || app.status === 'REJECTED' || app.status === 'HIRED'}
                    >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Reject
                    </Button>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => openEmailDialog('onboarding')}
                        disabled={isActionLoading || app.status === 'REJECTED' || app.status === 'HIRED'}
                    >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Onboarding Email
                    </Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={isActionLoading}
                        onClick={() => openEmailDialog('documents')}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Documents Sent
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

                    {/* Screening Screen Recording */}
                    {screening?.status === 'COMPLETED' && (
                        <Card className="border-border shadow-sm overflow-hidden">
                            <CardHeader className="bg-violet-50/50 dark:bg-violet-950/20 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-violet-500" />
                                    Screening Test – Screen Recording
                                </CardTitle>
                            </CardHeader>
                            <CardContent className={screening.recording_url ? "p-0" : "p-6"}>
                                {screening.recording_url ? (
                                    <div className="aspect-video bg-black">
                                        <video src={screening.recording_url} controls className="w-full h-full" />
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                        Recording was not captured for this session. The candidate may have denied screen share permission or the upload failed.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Transcript & Recording */}
                    {app.interview_session?.recording_path && (
                        <Card className="border-border shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-indigo-500" />
                                    Interview Screen Recording
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="aspect-video bg-black">
                                    <video src={resolveUrl(app.interview_session.recording_path)} controls className="w-full h-full" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {app.interview_session?.transcript && app.interview_session.transcript.length > 0 && (
                        <Card className="border-border shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <BotIcon className="w-5 h-5 text-indigo-500" />
                                    Transcript
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="max-h-[500px] overflow-y-auto p-6 space-y-6">
                                {app.interview_session.transcript.map((msg: any, i: number) => (
                                    <div key={i} className={`flex gap-4 ${msg.role === 'ai' ? '' : 'flex-row-reverse'}`}>
                                        <div className={`p-4 rounded-2xl text-sm ${msg.role === 'ai' ? 'bg-slate-100' : 'bg-indigo-600 text-white'}`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Col: Stats & Job */}
                <div className="space-y-6">
                    <Card className="border-border shadow-sm">
                        <CardContent className="pt-6 text-center space-y-4">
                            <div className="flex justify-center">
                                <ScoreRing score={app.match_score || 0} size="lg" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{app.match_score ? `${app.match_score}/100` : "N/A"}</div>
                                <div className="text-sm text-muted-foreground">Match Score</div>
                            </div>

                            {screening?.status === 'COMPLETED' && screening.score != null && (
                                <>
                                    <Separator />
                                    <div>
                                        <div className="flex justify-center mb-2">
                                            <ScoreRing score={Math.round(screening.score)} size="lg" />
                                        </div>
                                        <div className="text-2xl font-bold">{Math.round(screening.score)}/100</div>
                                        <div className="text-sm text-muted-foreground">Screening Score</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {screening.total_questions} questions
                                        </div>
                                    </div>
                                </>
                            )}

                            {screening && screening.status !== 'COMPLETED' && (
                                <>
                                    <Separator />
                                    <div>
                                        <div className="text-sm font-medium capitalize text-amber-600">
                                            Screening: {screening.status?.toLowerCase() ?? 'pending'}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">Test not completed yet</div>
                                    </div>
                                </>
                            )}

                            <Separator />
                            <div className="text-left space-y-3 pt-2">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    {candidate?.email}
                                </div>
                                <StatusBadge status={app.status} className="w-fit" />
                            </div>
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
                                <div>
                                    <span className="text-[10px] uppercase font-black text-muted-foreground">Expected</span>
                                    <div className="text-lg font-bold">{Number(app.expected_salary).toLocaleString()}</div>
                                </div>
                                {app.salary_filter_status === 'above_budget' && (
                                    <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">
                                        Candidate is above job budget.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Dialogs */}
            <Dialog open={!!emailDialogMode} onOpenChange={(open) => { if (!open) setEmailDialogMode(null); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {emailDialogMode === 'onboarding' ? 'Send Onboarding Welcome Email'
                                : emailDialogMode === 'documents' ? 'Send Onboarding Documents'
                                    : 'Rejection Email'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {emailDialogMode === 'onboarding' ? (
                            <>
                                <p className="text-sm text-slate-500 bg-blue-50 border border-blue-100 rounded-md p-2">
                                    The <strong>onboarding portal link</strong> will be automatically added at the bottom of your message.
                                </p>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Subject</label>
                                    <input type="text" className="w-full p-2 border rounded-md font-sans text-sm" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Message</label>
                                    <textarea className="w-full p-2 border rounded-md min-h-[180px] font-mono text-xs" value={emailMessage} onChange={e => setEmailMessage(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Attachments <span className="text-slate-400 font-normal">(optional — e.g. offer letter)</span></label>
                                    <div className="border-2 border-dashed p-4 rounded-md text-center cursor-pointer hover:bg-slate-50" onClick={() => emailFileRef.current?.click()}>
                                        <Paperclip className="h-4 w-4 mx-auto mb-2" />
                                        <span className="text-sm text-slate-500">Attach Files</span>
                                        <input ref={emailFileRef} type="file" multiple className="hidden" onChange={e => addFiles(setEmailFiles, e.target.files)} />
                                    </div>
                                    {emailFiles.length > 0 && (
                                        <ul className="text-xs space-y-1">
                                            {emailFiles.map((f, i) => (
                                                <li key={i} className="flex justify-between items-center bg-slate-100 p-2 rounded">
                                                    <span>{f.name}</span>
                                                    <button onClick={() => removeFile(setEmailFiles, i)}><XIcon className="h-3 w-3" /></button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Subject</label>
                                    <input type="text" className="w-full p-2 border rounded-md font-sans text-sm" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                                </div>
                                {emailDialogMode === 'documents' ? (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Message</label>
                                        <div
                                            contentEditable
                                            suppressContentEditableWarning
                                            ref={emailEditorRef}
                                            className="w-full p-3 border border-slate-200 rounded-md min-h-[320px] max-h-[460px] overflow-y-auto bg-white font-sans text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 leading-relaxed outline-none"
                                            dangerouslySetInnerHTML={{ __html: emailMessage }}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Message</label>
                                        <textarea className="w-full p-2 border rounded-md min-h-[220px] font-sans text-sm" value={emailMessage} onChange={e => setEmailMessage(e.target.value)} />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Attachments</label>
                                    <div className="border-2 border-dashed p-4 rounded-md text-center cursor-pointer hover:bg-slate-50" onClick={() => emailFileRef.current?.click()}>
                                        <Paperclip className="h-4 w-4 mx-auto mb-2" />
                                        <span className="text-sm text-slate-500">Attach Files</span>
                                        <input ref={emailFileRef} type="file" multiple className="hidden" onChange={e => addFiles(setEmailFiles, e.target.files)} />
                                    </div>
                                    {emailFiles.length > 0 && (
                                        <ul className="text-xs space-y-1">
                                            {emailFiles.map((f, i) => (
                                                <li key={i} className="flex justify-between items-center bg-slate-100 p-2 rounded">
                                                    <span>{f.name}</span>
                                                    <button onClick={() => removeFile(setEmailFiles, i)}><XIcon className="h-3 w-3" /></button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEmailDialogMode(null)}>Cancel</Button>
                        <Button onClick={handleSendEmailAction} disabled={isEmailSending}>
                            {isEmailSending ? "Sending..."
                                : emailDialogMode === 'onboarding' ? "Send Onboarding Email"
                                    : emailDialogMode === 'documents' ? "Send Documents Email"
                                        : "Send Email"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
