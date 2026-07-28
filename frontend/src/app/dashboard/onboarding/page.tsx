"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { onboardingApi, OnboardingResponse, getDocumentViewUrl } from "@/lib/api/onboarding";
import { apiClient } from "@/lib/api/client";
import { api } from "@/lib/api";
import { gmailApi } from "@/lib/api/gmail";
import {
    AlertCircle, CheckCircle2, Search, Clock, ShieldCheck, MonitorCheck,
    MapPin, UserCheck, Briefcase, Mail, Paperclip, X as CloseIcon, Loader2,
    Send, ThumbsUp, FileText, Plus, Trash2, User, Phone, Home, CreditCard, ChevronDown
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminOnboardingDashboard() {
    const queryClient = useQueryClient();
    const { data: onboardings = [], isLoading, error: listError } = useQuery({
        queryKey: ['onboarding', 'list'],
        queryFn: () => onboardingApi.getAll(),
        staleTime: 5 * 60_000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        placeholderData: (prev: any) => prev,
    });
    const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
    const { data: detailedInfo = null, isFetching: detailLoading } = useQuery({
        queryKey: ['onboarding', 'detail', selectedCandidateId],
        queryFn: () => onboardingApi.getHrDetails(selectedCandidateId!),
        enabled: selectedCandidateId !== null,
        staleTime: 60_000,
    });

    const selectedCandidate = useMemo(() => {
        if (!selectedCandidateId) return null;
        return onboardings.find(o => o.application_id === selectedCandidateId) || null;
    }, [onboardings, selectedCandidateId]);

    const cleanFilename = (name: string): string => {
        if (!name) return "";
        return name
            .replace(/\.jfif\.jpg$/i, '.jfif')
            .replace(/\.jfif\.png$/i, '.jfif')
            .replace(/\.jpeg\.jpg$/i, '.jpeg')
            .replace(/\.jpg\.jpg$/i, '.jpg')
            .replace(/\.png\.jpg$/i, '.png')
            .replace(/\.png\.png$/i, '.png')
            .replace(/\.pdf\.pdf$/i, '.pdf')
            .replace(/\.pdf\.jpg$/i, '.pdf');
    };

    const getFilenameFromUrl = (url: string | undefined, fallback: string): string => {
        if (!url) return fallback;
        const name = url.split('/').pop();
        if (!name) return fallback;
        try { return cleanFilename(decodeURIComponent(name)); } catch { return cleanFilename(name); }
    };

    const instantDocs = useMemo(() => {
        if (!selectedCandidate) return [];
        const list: { id: string; file_name: string; file_url: string; file_type: string; uploaded_at?: string }[] = [];

        if (selectedCandidate.doc_resume_url) {
            list.push({ id: 'resume', file_name: getFilenameFromUrl(selectedCandidate.doc_resume_url, 'Resume / CV'), file_url: selectedCandidate.doc_resume_url, file_type: 'PDF' });
        }
        if (selectedCandidate.doc_id_card_url) {
            list.push({ id: 'cnic', file_name: getFilenameFromUrl(selectedCandidate.doc_id_card_url, 'CNIC / ID Card'), file_url: selectedCandidate.doc_id_card_url, file_type: 'ID' });
        }
        if (selectedCandidate.doc_educational_documents_url) {
            list.push({ id: 'degree', file_name: getFilenameFromUrl(selectedCandidate.doc_educational_documents_url, 'Educational Documents'), file_url: selectedCandidate.doc_educational_documents_url, file_type: 'DEGREE' });
        }
        if (selectedCandidate.doc_front_picture_url) {
            list.push({ id: 'front_pic', file_name: getFilenameFromUrl(selectedCandidate.doc_front_picture_url, 'Candidate Photograph'), file_url: selectedCandidate.doc_front_picture_url, file_type: 'IMG' });
        }
        if (selectedCandidate.doc_salary_slip_url) {
            list.push({ id: 'salary', file_name: getFilenameFromUrl(selectedCandidate.doc_salary_slip_url, 'Salary Slip'), file_url: selectedCandidate.doc_salary_slip_url, file_type: 'SLIP' });
        }
        if (selectedCandidate.doc_experience_letter_url) {
            list.push({ id: 'experience', file_name: getFilenameFromUrl(selectedCandidate.doc_experience_letter_url, 'Experience Letter'), file_url: selectedCandidate.doc_experience_letter_url, file_type: 'LETTER' });
        }
        if (selectedCandidate.doc_police_clearance_url) {
            list.push({ id: 'police', file_name: getFilenameFromUrl(selectedCandidate.doc_police_clearance_url, 'Police Clearance Certificate'), file_url: selectedCandidate.doc_police_clearance_url, file_type: 'CERT' });
        }
        return list;
    }, [selectedCandidate]);

    const displayDocs = useMemo(() => {
        const raw = (detailedInfo?.documents && detailedInfo.documents.length > 0) ? detailedInfo.documents : instantDocs;
        const seen = new Set<string>();
        return raw.filter((doc: any) => {
            const key = (doc.file_url || doc.file_name || "").toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [detailedInfo, instantDocs]);

    const handleDeleteOnboarding = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to remove ${name} from Onboarding?`)) return;
        try {
            await onboardingApi.delete(id);
            toast.success(`${name} removed from onboarding.`);
            queryClient.invalidateQueries({ queryKey: ['onboarding', 'list'] });
        } catch (err: any) {
            toast.error("Failed to delete record: " + (err.message || "Unknown error"));
        }
    };

    const handleHrVerify = async (id: number) => {
        // Optimistic update — flip hr_verified instantly in the cache
        queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
            old.map(item => item.application_id === id ? { ...item, hr_verified: true } : item)
        );
        try {
            await onboardingApi.hrVerify(id, { hr_verified: true });
        } catch (err: any) {
            // Rollback on failure
            queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
                old.map(item => item.application_id === id ? { ...item, hr_verified: false } : item)
            );
            toast.error("Failed to approve: " + (err.message || "Unknown error"));
        }
    };
    const handleHrDetailsUpdate = async (id: number, data: any) => {
        // Optimistic update the field immediately
        queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
            old.map(item => item.application_id === id ? { ...item, ...data } : item)
        );
        try { await onboardingApi.hrSetJoiningDetails(id, data); }
        catch (err: any) { toast.error("Update failed: " + (err.message || "Unknown error")); }
    };
    const handleInductionToggle = async (id: number, current: OnboardingResponse, field: string, type: 'hr' | 'it' | 'manager') => {
        const newValue = !(current as any)[field];
        queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
            old.map(item => item.application_id === id ? { ...item, [field]: newValue } : item)
        );
        try {
            const data = { [field]: newValue };
            if (type === 'hr') await onboardingApi.hrInductionUpdate(id, data);
            else if (type === 'it') await onboardingApi.itInductionUpdate(id, data);
            else await onboardingApi.managerInductionUpdate(id, data);
        } catch (err: any) {
            queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
                old.map(item => item.application_id === id ? { ...item, [field]: !newValue } : item)
            );
            toast.error("Update failed: " + (err.message || "Unknown error"));
        }
    };

    const handleItSetupToggle = async (id: number, current: OnboardingResponse, field: string) => {
        const newValue = !(current as any)[field];
        queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
            old.map(item => item.application_id === id ? { ...item, [field]: newValue } : item)
        );
        try {
            await onboardingApi.itSetupUpdate(id, { [field]: newValue });
        } catch (err: any) {
            queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
                old.map(item => item.application_id === id ? { ...item, [field]: !newValue } : item)
            );
            toast.error("IT Update failed: " + (err.message || "Unknown error"));
        }
    };

    const [welcomeFiles, setWelcomeFiles] = useState<File[]>([]);
    const [welcomeEmailId, setWelcomeEmailId] = useState<number | null>(null);
    const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
    const [isSendingWelcome, setIsSendingWelcome] = useState(false);
    const welcomeFileRef = useRef<HTMLInputElement>(null);

    // Email dialog (documents + onboard)
    type EmailMode = 'documents' | 'onboard' | null;
    const [emailMode, setEmailMode] = useState<EmailMode>(null);
    const [emailAppId, setEmailAppId] = useState<number | null>(null);
    const [emailCandidateName, setEmailCandidateName] = useState("");
    const [emailCandidateEmail, setEmailCandidateEmail] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [emailFiles, setEmailFiles] = useState<File[]>([]);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailFromAlias, setEmailFromAlias] = useState("");
    const attachRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    // Cached Gmail aliases for instant rendering
    const { data: aliasesData } = useQuery({
        queryKey: ['gmail', 'aliases'],
        queryFn: gmailApi.getAliases,
        staleTime: 10 * 60 * 1000,
    });
    const gmailAliases = aliasesData?.aliases ?? [];

    useEffect(() => {
        if (gmailAliases.length > 0 && !emailFromAlias) {
            setEmailFromAlias(gmailAliases[0].email);
        }
    }, [gmailAliases, emailFromAlias]);

    const DOCUMENTS_TEMPLATE = (name: string) => `<p>Dear ${name},</p>
<p>We're introducing our official workflow for you at the office! This email is designed to guide you through the onboarding process.</p>
<p>We believe in maintaining a healthy work-life balance, and one way to do that is by keeping personal and work tools separate for a more organised workspace.</p>
<p>Your separate identities (accounts) at Revnix are all set up.</p>
<p><strong>Email Details:</strong><br>• ID: <em>(will be shared separately)</em><br>• Password: <em>(will be shared separately)</em></p>
<p><strong>Basecamp Details:</strong><br>• Invite sent</p>
<p>Feel free to update your passwords and enhance security by enabling the Passkey and Security Keys feature and 2FA using Google Authenticator on your accounts.</p>
<p>Please review the following documents to gain a better understanding of the culture at Revnix.</p>
<ul>
  <li>Resource Central - Everyone (Employee Self-Service)<ul><li>Complete Your HR Profile (#1 Priority)</li><li>Daily Sync - Everyone (EoD Update)</li></ul></li>
  <li>Applications Workflow Guide<ul><li>GDrive LinkDeck - Everyone (Important Links)</li><li>GDrive Walker - Technical</li></ul></li>
  <li>Intern Handbook</li>
</ul>
<p>Please acknowledge by replying to this email once you set up your profiles and the handbook is reviewed.</p>
<p>Respectfully,<br><strong>People Operations</strong></p>`;

    const ONBOARD_TEMPLATE = (name: string, job: string) =>
        `Dear ${name},\n\nWe are thrilled to inform you that after carefully reviewing your application and interview performance, we have decided to extend an offer for the ${job} position.\n\nPlease click the button below to complete your onboarding and upload the required documents.\n\nWelcome to the team!\n\nBest regards,\nHR Team`;

    const openEmailDialog = (mode: 'documents' | 'onboard', o: OnboardingResponse) => {
        setEmailMode(mode);
        setEmailAppId(o.application_id);
        setEmailCandidateName(o.candidate_name || "Candidate");
        setEmailCandidateEmail(o.email || "");
        setEmailFiles([]);
        if (mode === 'documents') {
            setEmailSubject("Welcome to the Team – Onboarding Resources & Documents");
            setEmailMessage(DOCUMENTS_TEMPLATE(o.candidate_name || "Candidate"));
        } else {
            setEmailSubject(`Congratulations! You've Been Selected – ${o.job_title || "the position"}`);
            setEmailMessage(ONBOARD_TEMPLATE(o.candidate_name || "Candidate", o.job_title || "the position"));
        }
    };

    useEffect(() => {
        if (emailMode === 'documents' && editorRef.current) {
            editorRef.current.innerHTML = emailMessage;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [emailMode]);

    const handleSendEmail = async () => {
        if (!emailAppId || !emailMode) return;
        const mode = emailMode;
        const appId = emailAppId;
        const subject = emailSubject.trim();
        const message = editorRef.current ? editorRef.current.innerHTML.trim() : emailMessage.trim();
        const files = [...emailFiles];

        // Close modal immediately for zero UI latency
        setEmailMode(null);
        setEmailFiles([]);

        if (mode === 'documents') {
            toast.success("Documents email sent!");
        } else {
            toast.success("Onboarding email sent!");
        }

        try {
            if (mode === 'documents') {
                const fd = new FormData();
                fd.append('subject', subject);
                fd.append('message', message);
                files.forEach(f => fd.append('attachments', f));
                await apiClient.post(`/applications/${appId}/send-documents`, fd);
            } else {
                await Promise.all([
                    onboardingApi.sendWelcomeEmail(appId, files.length > 0 ? files : undefined, subject, message),
                    api.applications.updateStatus(String(appId), 'HIRED')
                ]);
            }
            queryClient.invalidateQueries({ queryKey: ['onboarding', 'list'] });
        } catch (err: any) {
            toast.error(`Error: ${err.message || "Please try again"}`);
        }
    };

    const handleSendWelcomeEmail = (id: number) => {
        setWelcomeEmailId(id); setWelcomeFiles([]); setShowWelcomeDialog(true);
    };
    const handleConfirmWelcomeEmail = async () => {
        if (!welcomeEmailId) return;
        const targetId = welcomeEmailId;
        const files = [...welcomeFiles];

        // Close modal instantly for zero UI latency
        setShowWelcomeDialog(false);
        setWelcomeFiles([]);
        toast.success("Welcome email sent!");

        try {
            await onboardingApi.sendWelcomeEmail(targetId, files.length > 0 ? files : undefined);
            queryClient.invalidateQueries({ queryKey: ['onboarding', 'list'] });
        } catch (err: any) {
            toast.error(`Error: ${err.message || "Please try again"}`);
        }
    };

    const [searchQuery, setSearchQuery] = useState("");
    const filtered = onboardings.filter((o) => {
        const q = searchQuery.toLowerCase();
        return (o.candidate_name || "").toLowerCase().includes(q) ||
            (o.email || "").toLowerCase().includes(q) ||
            (o.job_title || "").toLowerCase().includes(q);
    });

    const statusClass = (status: string) => {
        if (status === 'COMPLETED') return 'ev-badge ev-badge-green';
        if (status.includes('PENDING')) return 'ev-badge ev-badge-amber';
        return 'ev-badge ev-badge-blue';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Onboarding Hub</h1>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Track document collection, office setup, and Day 1 induction for hired candidates</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input placeholder="Search by name, email, job…"
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
            </div>

            {listError && (
                <div className="ev-card p-4 border-red-200 bg-red-50 text-sm text-red-600">
                    {(listError as any)?.message || "Failed to load records"}
                </div>
            )}

            <div className="space-y-6">
                    {(isLoading && (!onboardings || onboardings.length === 0)) ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="panel-elevated p-6 rounded-2xl border border-slate-200/80 bg-white animate-pulse space-y-5">
                                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                    <div className="space-y-2">
                                        <div className="h-4 bg-slate-100 rounded w-48" />
                                        <div className="h-3 bg-slate-100 rounded w-72" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="h-8 bg-slate-100 rounded-xl w-24" />
                                        <div className="h-8 bg-slate-100 rounded-xl w-28" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {Array.from({ length: 4 }).map((_, j) => (
                                        <div key={j} className="h-14 bg-slate-50 rounded-xl border border-slate-100" />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : filtered.length === 0 ? (
                        <div className="panel-elevated p-12 text-center text-sm text-slate-500 font-medium">
                            {searchQuery ? `No results for "${searchQuery}"` : "No active onboarding records."}
                        </div>
                    ) : null}

                    {filtered.map((o) => (
                        <div key={o.id} className="panel-elevated p-6 rounded-2xl border border-slate-200/80 shadow-sm bg-white hover:border-slate-300 transition-all space-y-5">
                            {/* Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <Link href={`/dashboard/onboarding/${o.application_id}`} className="hover:underline">
                                            <h3 className="text-base font-bold text-slate-900 tracking-tight hover:text-indigo-600 transition-colors">
                                                {o.candidate_name || `Application #${o.application_id}`}
                                            </h3>
                                        </Link>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase ${o.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                o.status.includes('PENDING') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                    'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                            }`}>
                                            {o.status.replace(/_/g, " ")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500 flex-wrap">
                                        <span className="flex items-center gap-1.5 text-slate-600"><Mail className="w-3.5 h-3.5 text-slate-400" />{o.email || "No email"}</span>
                                        <span className="flex items-center gap-1.5 text-indigo-600 font-semibold"><Briefcase className="w-3.5 h-3.5 text-indigo-500" />{o.job_title || "Position Pending"}</span>
                                        {o.joining_date && <span className="flex items-center gap-1.5 text-emerald-600 font-medium"><Clock className="w-3.5 h-3.5 text-emerald-500" />Joining: {new Date(o.joining_date).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Link href={`/dashboard/onboarding/${o.application_id}`} className="btn-glass border-slate-200 hover:border-indigo-300 hover:text-indigo-600 h-9 px-3.5 text-xs font-semibold gap-1.5 flex items-center shadow-xs">
                                        <User className="w-3.5 h-3.5 text-indigo-500" /> View Profile
                                    </Link>
                                    <button onClick={() => openEmailDialog('documents', o)} className="btn-glass border-slate-200 hover:border-teal-300 hover:text-teal-600 h-9 px-3.5 text-xs font-semibold gap-1.5 flex items-center shadow-xs">
                                        <Paperclip className="w-3.5 h-3.5" /> Send Documents
                                    </button>
                                    <button onClick={() => openEmailDialog('onboard', o)} className="btn-glass border-slate-200 hover:border-indigo-300 hover:text-indigo-600 h-9 px-3.5 text-xs font-semibold gap-1.5 flex items-center shadow-xs">
                                        <Mail className="w-3.5 h-3.5 text-indigo-500" /> Onboarding Email
                                    </button>
                                    <button onClick={() => handleDeleteOnboarding(o.application_id, o.candidate_name || "Candidate")} className="btn-glass border-slate-200 hover:border-rose-300 hover:text-rose-600 h-9 px-3 text-xs flex items-center gap-1 shadow-xs transition-colors" title="Delete Candidate from Onboarding">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* 3 Core Section Sub-cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* 1. Document Verification */}
                                <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-indigo-600" /> Verification
                                    </h4>
                                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Status</span>
                                        {o.hr_verified ? (
                                            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Verified</span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3 h-3" />Pending</span>
                                        )}
                                    </div>
                                    {!o.hr_verified && (
                                        <button onClick={() => handleHrVerify(o.application_id)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg py-2 text-xs shadow-xs transition-colors">
                                            Approve Documents
                                        </button>
                                    )}
                                </div>

                                {/* 2. Office Setup */}
                                <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 space-y-2.5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-emerald-600" /> Office Assignment
                                    </h4>
                                    <input defaultValue={o.reporting_time || ""}
                                        onBlur={(e) => handleHrDetailsUpdate(o.application_id, { reporting_time: e.target.value })}
                                        placeholder="Reporting time (e.g. 09:00 AM)"
                                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                                    <input defaultValue={o.office_location || ""}
                                        onBlur={(e) => handleHrDetailsUpdate(o.application_id, { office_location: e.target.value })}
                                        placeholder="Location (e.g. Floor 2)"
                                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                                </div>

                                {/* 3. IT Access */}
                                <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 space-y-2.5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                        <MonitorCheck className="w-4 h-4 text-blue-600" /> IT Access
                                    </h4>
                                    <div className="space-y-1.5">
                                        {[
                                            { key: 'it_slack_setup', label: 'Slack' },
                                            { key: 'it_gmail_setup', label: 'Gmail' },
                                            { key: 'it_office365_access', label: 'Office 365' },
                                            { key: 'it_browser_extensions', label: 'Extensions' },
                                        ].map(item => (
                                            <label key={item.key} className="flex items-center justify-between text-xs cursor-pointer py-1 px-2 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all">
                                                <span className="text-slate-700 font-medium">{item.label}</span>
                                                <input type="checkbox" checked={(o as any)[item.key] || false}
                                                    onChange={() => handleItSetupToggle(o.application_id, o, item.key)}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer" />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Day 1 Induction Checklist Box */}
                            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-amber-500" /> Day 1 Induction
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* HR Tasks */}
                                    <div className="bg-white border border-slate-200/60 rounded-lg p-3 space-y-2">
                                        <p className="text-[0.7rem] font-bold text-indigo-600 uppercase tracking-wider">HR Tasks</p>
                                        <div className="space-y-1.5">
                                            {[
                                                { key: 'ind_hr_welcome_session', label: 'Welcome session' },
                                                { key: 'ind_hr_handbook_shared', label: 'Handbook shared' },
                                                { key: 'ind_hr_policies_explained', label: 'Policies briefing' },
                                            ].map(item => (
                                                <label key={item.key} className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                                                    <input type="checkbox" checked={(o as any)[item.key] || false}
                                                        onChange={() => handleInductionToggle(o.application_id, o, item.key, 'hr')}
                                                        className="w-3.5 h-3.5 accent-indigo-600" />
                                                    <span>{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* IT Tasks */}
                                    <div className="bg-white border border-slate-200/60 rounded-lg p-3 space-y-2">
                                        <p className="text-[0.7rem] font-bold text-blue-600 uppercase tracking-wider">IT Tasks</p>
                                        <div className="space-y-1.5">
                                            {[
                                                { key: 'ind_it_credentials_provided', label: 'Credentials provided' },
                                                { key: 'ind_it_security_induction', label: 'Security training' },
                                            ].map(item => (
                                                <label key={item.key} className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                                                    <input type="checkbox" checked={(o as any)[item.key] || false}
                                                        onChange={() => handleInductionToggle(o.application_id, o, item.key, 'it')}
                                                        className="w-3.5 h-3.5 accent-blue-600" />
                                                    <span>{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Manager Tasks */}
                                    <div className="bg-white border border-slate-200/60 rounded-lg p-3 space-y-2">
                                        <p className="text-[0.7rem] font-bold text-emerald-600 uppercase tracking-wider">Manager Tasks</p>
                                        <div className="space-y-1.5">
                                            {[
                                                { key: 'ind_manager_buddy_assigned', label: 'Buddy assigned' },
                                                { key: 'ind_manager_team_intro', label: 'Team introduction' },
                                            ].map(item => (
                                                <label key={item.key} className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                                                    <input type="checkbox" checked={(o as any)[item.key] || false}
                                                        onChange={() => handleInductionToggle(o.application_id, o, item.key, 'manager')}
                                                        className="w-3.5 h-3.5 accent-emerald-600" />
                                                    <span>{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>

            {/* Welcome email dialog */}
            <Dialog open={showWelcomeDialog} onOpenChange={(open) => { if (!open) { setShowWelcomeDialog(false); setWelcomeFiles([]); } }}>
                <DialogContent className="max-w-sm bg-white border border-gray-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-[0.9375rem] font-semibold text-gray-900 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-indigo-500" /> Send Welcome Email
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-1">
                        <p className="text-[0.8125rem] text-gray-600">
                            This sends the onboarding portal link to the candidate. Optionally attach files.
                        </p>
                        <div className="flex items-center gap-2 p-3 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 transition-colors"
                            onClick={() => welcomeFileRef.current?.click()}>
                            <Paperclip className="w-4 h-4 text-gray-400" />
                            <span className="text-[0.8125rem] text-gray-500">Attach files (optional)</span>
                            <input ref={welcomeFileRef} type="file" multiple className="hidden"
                                onChange={(e) => { if (e.target.files) setWelcomeFiles(p => [...p, ...Array.from(e.target.files!)]); }} />
                        </div>
                        {welcomeFiles.length > 0 && (
                            <div className="space-y-1">
                                {welcomeFiles.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between text-[0.8125rem] py-1 px-2 bg-gray-50 rounded border border-gray-200">
                                        <span className="text-gray-700 truncate">{f.name}</span>
                                        <button onClick={() => setWelcomeFiles(p => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 ml-2">
                                            <CloseIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <button className="btn-secondary h-8 px-3 text-xs" onClick={() => { setShowWelcomeDialog(false); setWelcomeFiles([]); }} disabled={isSendingWelcome}>Cancel</button>
                        <button className="btn-primary h-8 px-4 text-xs gap-1.5" onClick={handleConfirmWelcomeEmail} disabled={isSendingWelcome}>
                            {isSendingWelcome ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                            Send Email
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Send Documents / Onboard Candidate Dialog */}
            <Dialog open={!!emailMode} onOpenChange={(open) => { if (!open) { setEmailMode(null); setEmailFiles([]); } }}>
                <DialogContent className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            {emailMode === 'documents' ? <><Paperclip className="w-5 h-5 text-teal-600" /> Send Onboarding Documents</> : <><ThumbsUp className="w-5 h-5 text-indigo-600" /> Onboarding Welcome Email</>}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 mt-1">
                            To: <span className="font-semibold text-slate-700">{emailCandidateName}</span> — {emailCandidateEmail}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* From alias selector */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">From</label>
                            <div className="relative">
                                <select
                                    value={emailFromAlias || (gmailAliases[0]?.email ?? '')}
                                    onChange={e => setEmailFromAlias(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none pr-9 font-medium"
                                >
                                    {gmailAliases.length > 0 ? (
                                        gmailAliases.map(a => (
                                            <option key={a.email} value={a.email}>
                                                {a.formatted || a.email}{a.is_default ? ' (default)' : ''}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="">Default Connected Account</option>
                                    )}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">Subject</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">Message</label>
                            {emailMode === 'documents' ? (
                                <div key={`editor-${emailMode}-${emailAppId}`} ref={editorRef} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: emailMessage }}
                                    className="w-full min-h-[200px] max-h-[300px] overflow-y-auto bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 leading-relaxed"
                                    style={{ wordBreak: 'break-word' }} />
                            ) : (
                                <textarea className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed" rows={8} value={emailMessage} onChange={e => setEmailMessage(e.target.value)} />
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-2">Attachments</label>
                            {emailFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {emailFiles.map((f, i) => (
                                        <div key={i} className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700">
                                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="max-w-[120px] truncate">{f.name}</span>
                                            <button type="button" onClick={() => setEmailFiles(p => p.filter((_, j) => j !== i))} className="ml-0.5 text-slate-400 hover:text-rose-500"><CloseIcon className="w-3.5 h-3.5" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button type="button" onClick={() => attachRef.current?.click()} className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl py-3 flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 transition-all text-xs font-semibold">
                                <Paperclip className="w-4 h-4" /> Attach Files
                            </button>
                            <input ref={attachRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files) setEmailFiles(p => [...p, ...Array.from(e.target.files!)]); }} />
                        </div>
                    </div>
                    <DialogFooter className="gap-3 mt-2">
                        <button className="btn-glass text-sm" onClick={() => { setEmailMode(null); setEmailFiles([]); }}>Cancel</button>
                        <button onClick={handleSendEmail} disabled={isSendingEmail} className="btn-dribbble text-sm">
                            {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {emailMode === 'documents' ? 'Send Documents' : 'Send & Hire Candidate'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
