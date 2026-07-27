"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { onboardingApi } from "@/lib/api/onboarding";
import { screeningApi } from "@/lib/api/screening";
import { apiClient, resolveUrl } from "@/lib/api/client";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Eye, ThumbsUp, ThumbsDown, MessageSquare, Loader2, Monitor, RotateCcw, Send, Phone, MapPin, GraduationCap, Briefcase, Linkedin, Zap, FileText, Paperclip, X as XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import Link from "next/link";
import { toast } from "sonner";

const parseRawQuestions = (value: string) =>
    value.split(/\n+/).map((q) => q.replace(/^\s*(?:\d+[\).\-\s]+|[-*]\s+)/, "").trim()).filter(Boolean);

function getViewableResumeUrl(url: string): string {
    if (!url.includes('cloudinary.com')) return url;
    if (url.includes('/raw/upload/')) {
        return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }
    return url;
}

export default function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [app, setApp] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isSendingScreening, setIsSendingScreening] = useState(false);
    const [screening, setScreening] = useState<any>(null);
    const [isScreeningDialogOpen, setIsScreeningDialogOpen] = useState(false);
    const [rawQuestionsText, setRawQuestionsText] = useState("");
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(10);

    const [emailDialogMode, setEmailDialogMode] = useState<'onboarding' | 'reject' | 'documents' | null>(null);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [isEmailSending, setIsEmailSending] = useState(false);
    const [emailFiles, setEmailFiles] = useState<File[]>([]);
    const emailEditorRef = useRef<HTMLDivElement>(null);
    const attachFileRef = useRef<HTMLInputElement>(null);
    const emailDialogModeRef = useRef(emailDialogMode);
    useEffect(() => { emailDialogModeRef.current = emailDialogMode; }, [emailDialogMode]);

    const handleAddFiles = (incoming: FileList | null) => {
        if (!incoming) return;
        setEmailFiles(prev => [...prev, ...Array.from(incoming)]);
    };
    const handleRemoveFile = (index: number) => {
        setEmailFiles(prev => prev.filter((_, i) => i !== index));
    };

    const openScreeningDialog = () => {
        setRawQuestionsText("");
        setTimeLimitMinutes(10);
        setIsScreeningDialogOpen(true);
    };

    const closeScreeningDialog = () => {
        setIsScreeningDialogOpen(false);
        setRawQuestionsText("");
        setTimeLimitMinutes(10);
    };

    const handleSendScreeningTest = async () => {
        const rawQuestions = parseRawQuestions(rawQuestionsText);
        if (rawQuestions.length === 0) {
            toast.error("Please add at least one question.");
            return;
        }

        setIsSendingScreening(true);
        try {
            await screeningApi.create(id, {
                raw_questions: rawQuestions,
                time_limit_minutes: timeLimitMinutes,
            });
            toast.success("Screening test sent!");
            closeScreeningDialog();
            const [updatedApplication, updatedScreening] = await Promise.all([
                api.applications.get(id),
                screeningApi.getResult(id),
            ]);
            setApp(updatedApplication);
            setScreening(updatedScreening);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to send screening test");
        } finally {
            setIsSendingScreening(false);
        }
    };

    useEffect(() => {
        let hasLoadedOnce = false;

        const fetchApplication = async () => {
            try {
                const data = await api.applications.get(id);
                setApp(data);
            } catch (error) {
                if (!hasLoadedOnce) setApp(null);
            } finally {
                setIsLoading(false);
                hasLoadedOnce = true;
            }
        };
        const fetchScreening = async () => {
            try {
                const data = await screeningApi.getResult(id);
                setScreening(data);
            } catch {}
        };
        fetchApplication();
        fetchScreening();

        const interval = setInterval(() => {
            if (emailDialogModeRef.current) return;
            fetchApplication();
        }, 20_000);
        return () => clearInterval(interval);
    }, [id]);

    const openEmailDialog = (mode: 'onboarding' | 'reject' | 'documents') => {
        const candidateName = app?.candidate?.full_name || "Candidate";
        const jobTitle = app?.job?.title || "the position";
        if (mode === 'onboarding') {
            setEmailSubject(`Congratulations! Job Offer for ${jobTitle} at Revnix`);
            setEmailMessage(`Dear ${candidateName},\n\nWe are thrilled to inform you that after carefully reviewing your application and interview performance, we have decided to extend an official offer of employment for the ${jobTitle} position at Revnix!\n\nWe were exceptionally impressed by your background, technical skills, and passion. We are confident that you will be a fantastic addition to our team and play a pivotal role in driving our mission forward.\n\nPlease click the button below to complete your onboarding, review guidelines, and upload your required documents.\n\nWelcome to the team!\n\nRespectfully,\nPeople Operations\nRevnix Inc.`);
        } else if (mode === 'documents') {
            setEmailSubject("Welcome to the Team – Onboarding Resources & Documents");
            setEmailMessage(`<p>Dear ${candidateName},</p>
<p>We're introducing our official workflow for you at the office! This email is designed to guide you through the onboarding process.</p>
<p>We believe in maintaining a healthy work-life balance, and one way to do that is by keeping personal and work tools separate for a more organised workspace.</p>
<p>Your separate identities (accounts) at Revnix are all set up.</p>
<p><strong>Email Details:</strong><br>
• ID: <em>(will be shared separately)</em><br>
• Password: <em>(will be shared separately)</em></p>
<p><strong>Basecamp Details:</strong><br>
• Invite sent</p>
<p>Feel free to update your passwords and enhance security by enabling the Passkey and Security Keys feature and 2FA using Google Authenticator on your accounts.</p>
<p>Please review the following documents to gain a better understanding of the culture at Revnix.</p>
<ul>
  <li>Resource Central - Everyone (Employee Self-Service)
    <ul>
      <li>Complete Your HR Profile (#1 Priority)</li>
      <li>Daily Sync - Everyone (EoD Update)</li>
    </ul>
  </li>
  <li>Applications Workflow Guide
    <ul>
      <li>GDrive LinkDeck - Everyone (Important Links)</li>
      <li>GDrive Walker - Technical</li>
    </ul>
  </li>
  <li>Intern Handbook</li>
</ul>
<p>Please acknowledge by replying to this email once you set up your profiles and the handbook is reviewed. Also, do not hesitate to reach out if you have any suggestions.</p>
<p>Respectfully,<br><strong>People Operations</strong></p>`);
        } else {
            setEmailSubject(`Update on Your Application – ${jobTitle}`);
            setEmailMessage(`Dear ${candidateName},\n\nThank you for applying for the ${jobTitle} position and participating in our selection process.\n\nAfter careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\nBest regards,\nHR Team`);
        }
        setEmailFiles([]);
        setEmailDialogMode(mode);
    };

    const handleSendEmailAction = async () => {
        if (!emailDialogMode) return;
        const currentMode = emailDialogMode;
        const subject = emailSubject.trim();
        const message = emailEditorRef.current ? emailEditorRef.current.innerHTML.trim() : emailMessage.trim();
        const files = emailFiles.length > 0 ? [...emailFiles] : undefined;

        // Close dialog instantly for zero UI latency
        setEmailDialogMode(null);
        setEmailFiles([]);
        
        if (currentMode === 'onboarding') {
            toast.success("Onboarding email sent!");
        } else if (currentMode === 'documents') {
            toast.success("Documents email sent!");
        } else {
            toast.success("Rejection email sent!");
        }

        try {
            if (currentMode === 'onboarding') {
                await Promise.all([
                    onboardingApi.sendWelcomeEmail(Number(id), files, subject, message),
                    api.applications.updateStatus(id, 'HIRED')
                ]);
            } else if (currentMode === 'documents') {
                const formData = new FormData();
                formData.append('subject', subject);
                formData.append('message', message);
                if (files) files.forEach(f => formData.append('attachments', f));
                await apiClient.post(`/applications/${id}/send-documents`, formData);
            } else {
                await Promise.all([
                    api.applications.invite(id, subject, message, files),
                    api.applications.updateStatus(id, 'REJECTED')
                ]);
            }
            const updated = await api.applications.get(id);
            setApp(updated);
        } catch (error: any) {
            toast.error(`Error: ${error.message || "Failed to send email"}`);
        }
    };

    const handleReset = async () => {
        if (!confirm("Reset email status?")) return;
        setIsResetting(true);
        try {
            const updated = await api.applications.resetEmailStatus(id);
            setApp(updated);
            toast.success("Email status reset.");
        } catch (error: any) {
            toast.error(`Reset failed: ${error.message || "Please try again"}`);
        } finally {
            setIsResetting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!app) notFound();

    const candidate = app.candidate;
    const profile = candidate?.candidate_profile;
    const job = app.job;
    const score = app.match_score ?? app.ai_score ?? 0;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            
            {/* Header / Top Navigation */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard/pipeline" className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Application Details</span>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-3">
                        {candidate?.full_name || "Unknown Candidate"}
                        <span className="badge-glow-indigo text-xs font-bold px-2.5 py-1 rounded-md tracking-widest uppercase">
                            {app.status || "APPLIED"}
                        </span>
                    </h1>
                </div>
            </div>

            {/* Action Bar */}
            <div className="panel-elevated p-3 flex flex-wrap items-center gap-2 bg-white">
                {profile?.resume_url && (
                    <a href={getViewableResumeUrl(resolveUrl(profile.resume_url))} target="_blank" rel="noopener noreferrer" className="btn-glass border-slate-200 hover:border-indigo-300 hover:text-indigo-600 flex items-center gap-1.5 text-xs h-9 px-4">
                        <Eye className="w-4 h-4" /> View Resume
                    </a>
                )}

                {app.status === 'SCREENING' && (
                    <button
                        onClick={async () => {
                            setIsActionLoading(true);
                            try {
                                await api.applications.shortlist(id);
                                toast.success("Shortlisted!");
                                const updated = await api.applications.get(id);
                                setApp(updated);
                            } catch (error) { toast.error("Failed to shortlist"); }
                            finally { setIsActionLoading(false); }
                        }}
                        disabled={isActionLoading} className="btn-dribbble text-xs h-9 px-4 flex items-center gap-1.5"
                    >
                        {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Shortlist
                    </button>
                )}

                <button onClick={openScreeningDialog} disabled={isSendingScreening} className="btn-glass border-slate-200 hover:border-indigo-300 hover:text-indigo-600 flex items-center gap-1.5 text-xs h-9 px-4">
                    <FileText className="w-4 h-4" /> Screening Test
                </button>

                <button onClick={handleReset} disabled={isResetting} className="btn-glass border-slate-200 hover:border-amber-300 hover:text-amber-600 flex items-center gap-1.5 text-xs h-9 px-4">
                    <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} /> Reset
                </button>

                <div className="flex-1"></div>

                <button onClick={() => openEmailDialog('reject')} disabled={app.status === 'REJECTED' || app.status === 'HIRED'} className="btn-glass border-slate-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 text-xs h-9 px-4">
                    <ThumbsDown className="w-4 h-4" /> Reject
                </button>

                <button onClick={() => openEmailDialog('onboarding')} disabled={app.status === 'REJECTED' || app.status === 'HIRED'} className="btn-dribbble text-xs h-9 px-4 flex items-center gap-1.5 shadow-md">
                    <ThumbsUp className="w-4 h-4" /> Hire Candidate
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side: Main Content */}
                <div className="space-y-6 lg:col-span-2">
                    
                    {/* AI Evaluation Panel */}
                    <div className="panel-elevated p-6 space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <MessageSquare className="w-4 h-4" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">AI Evaluation Summary</h3>
                        </div>
                        
                        <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {app.interview_session?.feedback || app.ai_feedback || "No AI evaluation feedback recorded yet."}
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 mt-4">Detected Skills & Tags</h4>
                            <div className="flex flex-wrap gap-2">
                                {profile?.skills && profile.skills.length > 0 ? (
                                    profile.skills.map((skill: string, i: number) => (
                                        <span key={i} className="px-3 py-1 bg-white border border-slate-200 shadow-sm rounded-md text-xs font-semibold text-slate-700">
                                            {skill}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm italic text-slate-400">No skills identified by AI.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Personal & Application Info Panel */}
                    <div className="panel-elevated p-6 space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Monitor className="w-4 h-4" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Application Details</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {app.phone_number && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm font-medium">
                                    <Phone className="w-4 h-4 text-emerald-500" /> {app.phone_number}
                                </div>
                            )}
                            {app.city && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm font-medium capitalize">
                                    <MapPin className="w-4 h-4 text-emerald-500" /> {app.city}
                                </div>
                            )}
                            {app.qualification && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm font-medium">
                                    <GraduationCap className="w-4 h-4 text-emerald-500" /> {app.qualification}
                                </div>
                            )}
                            {typeof profile?.experience_years === "number" && profile.experience_years > 0 && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm font-medium">
                                    <Briefcase className="w-4 h-4 text-emerald-500" /> {profile.experience_years} years exp.
                                </div>
                            )}
                            {profile?.linkedin_url && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm font-medium sm:col-span-2">
                                    <Linkedin className="w-4 h-4 text-blue-500" />
                                    <a href={profile.linkedin_url.startsWith("http") ? profile.linkedin_url : `https://${profile.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                        {profile.linkedin_url}
                                    </a>
                                </div>
                            )}
                        </div>

                        {app.cover_letter && (
                            <div className="pt-4 mt-2 border-t border-slate-100">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Cover Letter</h4>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap italic">
                                    "{app.cover_letter}"
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Video Recording Panel (If Exists) */}
                    {screening?.status === 'COMPLETED' && screening.recording_url && (
                        <div className="panel-elevated p-6 space-y-4 border-2 border-indigo-100 shadow-md">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                                Candidate Video Recording
                            </h3>
                            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-inner">
                                <video src={screening.recording_url} controls className="w-full h-full" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right side: Scores & Actions */}
                <div className="space-y-6">
                    
                    {/* Score Panel */}
                    <div className="panel-elevated p-6 text-center space-y-5">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">AI Match Index</h3>
                        <div className="flex justify-center my-4">
                            <div className="relative w-32 h-32 flex-shrink-0">
                                <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90 drop-shadow-md">
                                    <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path
                                        className={score >= 70 ? "text-emerald-500" : score >= 40 ? "text-indigo-500" : "text-rose-500"}
                                        strokeDasharray={`${score}, 100`}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-slate-800 tracking-tighter">
                                    {score}
                                </span>
                            </div>
                        </div>

                        {screening?.status === 'COMPLETED' && screening.score != null && (
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Screening Score</span>
                                <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold rounded-md">
                                    {screening.correct_count != null ? `${screening.correct_count}/${screening.total_questions}` : `${Math.round(screening.score)}%`}
                                </span>
                            </div>
                        )}

                        <div className="pt-4 border-t border-slate-100 text-left">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Candidate Contact</span>
                            <a href={`mailto:${candidate?.email}`} className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 transition-colors truncate">
                                <Mail className="w-4 h-4 flex-shrink-0" /> {candidate?.email}
                            </a>
                        </div>
                    </div>

                    {/* Salary Panel */}
                    {app.expected_salary && (
                        <div className="panel-elevated p-6 space-y-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/20">
                            <span className="text-xs font-bold text-emerald-100 uppercase tracking-widest block">Expected Salary</span>
                            <div className="text-3xl font-black tracking-tight">{Number(app.expected_salary).toLocaleString()} PKR</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dialogs */}
            <Dialog open={isScreeningDialogOpen} onOpenChange={(open) => !open && closeScreeningDialog()}>
                <DialogContent className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900">Send Screening Test</DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">Configure questions and time limit for the candidate.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">Time Limit (Minutes)</label>
                            <input
                                type="number" min={1} max={180} value={timeLimitMinutes}
                                onChange={(e) => setTimeLimitMinutes(Math.min(180, Math.max(1, Number(e.target.value) || 1)))}
                                className="w-full sm:w-32 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">Questions (One per line)</label>
                            <textarea
                                value={rawQuestionsText} onChange={(e) => setRawQuestionsText(e.target.value)}
                                placeholder="1. What is React?\n2. Explain REST API." rows={8}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-3">
                        <button className="btn-glass text-sm" onClick={closeScreeningDialog}>Cancel</button>
                        <button onClick={handleSendScreeningTest} disabled={isSendingScreening} className="btn-dribbble text-sm">
                            {isSendingScreening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Test
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!emailDialogMode} onOpenChange={(open) => { if (!open) { setEmailDialogMode(null); setEmailFiles([]); } }}>
                <DialogContent className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            {emailDialogMode === 'onboarding' && <><ThumbsUp className="w-5 h-5 text-indigo-600" /> Onboarding Welcome Email</>}
                            {emailDialogMode === 'documents' && <><Paperclip className="w-5 h-5 text-teal-600" /> Send Onboarding Documents</>}
                            {emailDialogMode === 'reject' && <><ThumbsDown className="w-5 h-5 text-rose-500" /> Rejection Email</>}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 mt-1">
                            To: <span className="font-semibold text-slate-700">{candidate?.full_name}</span> &mdash; {candidate?.email}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Subject */}
                        <div>
                            <label className="text-xs font-bold text-slateate-600 uppercase tracking-wide block mb-1.5">Subject</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                value={emailSubject}
                                onChange={e => setEmailSubject(e.target.value)}
                                placeholder="Email subject..."
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">Message</label>
                            {emailDialogMode === 'documents' ? (
                                // Rich contentEditable for HTML email content
                                // key forces a fresh mount each time dialog opens, dangerouslySetInnerHTML populates initial HTML
                                <div
                                    key={`editor-${emailDialogMode}`}
                                    ref={emailEditorRef}
                                    contentEditable
                                    suppressContentEditableWarning
                                    dangerouslySetInnerHTML={{ __html: emailMessage }}
                                    className="w-full min-h-[220px] max-h-[320px] overflow-y-auto bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 leading-relaxed"
                                    style={{ wordBreak: 'break-word', listStyleType: 'disc', listStylePosition: 'inside' }}
                                />
                            ) : (
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed"
                                    rows={9}
                                    value={emailMessage}
                                    onChange={e => setEmailMessage(e.target.value)}
                                    placeholder="Write your message here..."
                                />
                            )}
                        </div>

                        {/* Attachments — shown for documents & onboarding modes */}
                        {(emailDialogMode === 'documents' || emailDialogMode === 'onboarding') && (
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-2">Attachments</label>

                                {/* File chips */}
                                {emailFiles.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {emailFiles.map((f, i) => (
                                            <div key={i} className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700">
                                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                                <span className="max-w-[120px] truncate">{f.name}</span>
                                                <button type="button" onClick={() => handleRemoveFile(i)} className="ml-0.5 text-slate-400 hover:text-rose-500 transition-colors">
                                                    <XIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => attachFileRef.current?.click()}
                                    className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl py-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 transition-all"
                                >
                                    <Paperclip className="w-5 h-5" />
                                    <span className="text-xs font-semibold">Attach Files</span>
                                </button>
                                <input
                                    ref={attachFileRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={e => handleAddFiles(e.target.files)}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-3 mt-2">
                        <button className="btn-glass text-sm" onClick={() => { setEmailDialogMode(null); setEmailFiles([]); }}>Cancel</button>
                        <button onClick={handleSendEmailAction} disabled={isEmailSending} className="btn-dribbble text-sm">
                            {isEmailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {emailDialogMode === 'documents' ? 'Send Documents' : emailDialogMode === 'onboarding' ? 'Send & Onboard' : 'Send Email'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
