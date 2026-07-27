"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { onboardingApi, OnboardingResponse, getDocumentViewUrl } from "@/lib/api/onboarding";
import { apiClient } from "@/lib/api/client";
import { api } from "@/lib/api";
import { gmailApi } from "@/lib/api/gmail";
import {
    ArrowLeft, AlertCircle, CheckCircle2, Clock, ShieldCheck, MonitorCheck,
    MapPin, UserCheck, Briefcase, Mail, Paperclip, Loader2, Send, ThumbsUp,
    FileText, User, Phone, Home, CreditCard, ExternalLink, Trash2, Calendar, ChevronDown
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CandidateProfilePage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const applicationId = Number(params?.id);

    // Fetch all onboarding items so we can locate candidate data instantly
    const { data: onboardings = [], isLoading: listLoading } = useQuery({
        queryKey: ['onboarding', 'list'],
        queryFn: () => onboardingApi.getAll(),
        staleTime: 5 * 60_000,
    });

    // Fetch HR details (which includes uploaded documents array)
    const { data: detailedInfo = null, isLoading: detailLoading } = useQuery({
        queryKey: ['onboarding', 'detail', applicationId],
        queryFn: () => onboardingApi.getHrDetails(applicationId),
        enabled: !isNaN(applicationId) && applicationId > 0,
        staleTime: 60_000,
    });

    const candidate = useMemo(() => {
        if (isNaN(applicationId)) return null;
        return onboardings.find(o => o.application_id === applicationId) || null;
    }, [onboardings, applicationId]);

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
        if (!candidate) return [];
        const list: { id: string; file_name: string; file_url: string; file_type: string; uploaded_at?: string }[] = [];

        if (candidate.doc_resume_url) {
            list.push({ id: 'resume', file_name: getFilenameFromUrl(candidate.doc_resume_url, 'Resume / CV'), file_url: candidate.doc_resume_url, file_type: 'PDF' });
        }
        if (candidate.doc_id_card_url) {
            list.push({ id: 'cnic', file_name: getFilenameFromUrl(candidate.doc_id_card_url, 'CNIC / ID Card'), file_url: candidate.doc_id_card_url, file_type: 'ID' });
        }
        if (candidate.doc_educational_documents_url) {
            list.push({ id: 'degree', file_name: getFilenameFromUrl(candidate.doc_educational_documents_url, 'Educational Documents'), file_url: candidate.doc_educational_documents_url, file_type: 'DEGREE' });
        }
        if (candidate.doc_front_picture_url) {
            list.push({ id: 'front_pic', file_name: getFilenameFromUrl(candidate.doc_front_picture_url, 'Candidate Photograph'), file_url: candidate.doc_front_picture_url, file_type: 'IMG' });
        }
        if (candidate.doc_salary_slip_url) {
            list.push({ id: 'salary', file_name: getFilenameFromUrl(candidate.doc_salary_slip_url, 'Salary Slip'), file_url: candidate.doc_salary_slip_url, file_type: 'SLIP' });
        }
        if (candidate.doc_experience_letter_url) {
            list.push({ id: 'experience', file_name: getFilenameFromUrl(candidate.doc_experience_letter_url, 'Experience Letter'), file_url: candidate.doc_experience_letter_url, file_type: 'LETTER' });
        }
        if (candidate.doc_police_clearance_url) {
            list.push({ id: 'police', file_name: getFilenameFromUrl(candidate.doc_police_clearance_url, 'Police Clearance Certificate'), file_url: candidate.doc_police_clearance_url, file_type: 'CERT' });
        }
        return list;
    }, [candidate]);

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

    const handleHrVerify = async () => {
        if (!applicationId) return;
        queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
            old.map(item => item.application_id === applicationId ? { ...item, hr_verified: true } : item)
        );
        try {
            await onboardingApi.hrVerify(applicationId, { hr_verified: true });
            toast.success("Documents approved successfully!");
        } catch (err: any) {
            queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
                old.map(item => item.application_id === applicationId ? { ...item, hr_verified: false } : item)
            );
            toast.error("Failed to approve: " + (err.message || "Unknown error"));
        }
    };

    const handleHrDetailsUpdate = async (data: any) => {
        if (!applicationId) return;
        queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
            old.map(item => item.application_id === applicationId ? { ...item, ...data } : item)
        );
        try {
            await onboardingApi.hrSetJoiningDetails(applicationId, data);
            toast.success("Details updated.");
        } catch (err: any) {
            toast.error("Update failed: " + (err.message || "Unknown error"));
        }
    };

    const handleInductionToggle = async (field: string, type: 'hr' | 'it' | 'manager') => {
        if (!candidate || !applicationId) return;
        const newValue = !(candidate as any)[field];
        queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
            old.map(item => item.application_id === applicationId ? { ...item, [field]: newValue } : item)
        );
        try {
            const data = { [field]: newValue };
            if (type === 'hr') await onboardingApi.hrInductionUpdate(applicationId, data);
            else if (type === 'it') await onboardingApi.itInductionUpdate(applicationId, data);
            else await onboardingApi.managerInductionUpdate(applicationId, data);
        } catch (err: any) {
            queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
                old.map(item => item.application_id === applicationId ? { ...item, [field]: !newValue } : item)
            );
            toast.error("Update failed: " + (err.message || "Unknown error"));
        }
    };

    const handleItSetupToggle = async (field: string) => {
        if (!candidate || !applicationId) return;
        const newValue = !(candidate as any)[field];
        queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
            old.map(item => item.application_id === applicationId ? { ...item, [field]: newValue } : item)
        );
        try {
            await onboardingApi.itSetupUpdate(applicationId, { [field]: newValue });
        } catch (err: any) {
            queryClient.setQueryData(['onboarding', 'list'], (old: OnboardingResponse[] = []) =>
                old.map(item => item.application_id === applicationId ? { ...item, [field]: !newValue } : item)
            );
            toast.error("IT Update failed: " + (err.message || "Unknown error"));
        }
    };

    // Email Dialog logic
    type EmailMode = 'documents' | 'onboard' | null;
    const [emailMode, setEmailMode] = useState<EmailMode>(null);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [emailFiles, setEmailFiles] = useState<File[]>([]);
    const [emailFromAlias, setEmailFromAlias] = useState("");
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
<p>Your separate identities (accounts) at Revnix are all set up.</p>
<p>Please acknowledge by replying to this email once you set up your profiles and the handbook is reviewed.</p>
<p>Respectfully,<br><strong>People Operations</strong></p>`;

    const ONBOARD_TEMPLATE = (name: string, job: string) =>
        `Dear ${name},\n\nWe are thrilled to extend an offer for the ${job} position.\n\nPlease click the button below to complete your onboarding and upload the required documents.\n\nWelcome to the team!\n\nBest regards,\nHR Team`;

    const openEmailDialog = (mode: 'documents' | 'onboard') => {
        if (!candidate) return;
        setEmailMode(mode);
        setEmailFiles([]);
        if (mode === 'documents') {
            setEmailSubject("Welcome to the Team – Onboarding Resources & Documents");
            setEmailMessage(DOCUMENTS_TEMPLATE(candidate.candidate_name || "Candidate"));
        } else {
            setEmailSubject(`Congratulations! You've Been Selected – ${candidate.job_title || "the position"}`);
            setEmailMessage(ONBOARD_TEMPLATE(candidate.candidate_name || "Candidate", candidate.job_title || "the position"));
        }
    };

    useEffect(() => {
        if (emailMode === 'documents' && editorRef.current) {
            editorRef.current.innerHTML = emailMessage;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [emailMode]);

    const handleSendEmail = async () => {
        if (!candidate || !emailMode) return;
        const mode = emailMode;
        const subject = emailSubject.trim();
        const message = editorRef.current ? editorRef.current.innerHTML.trim() : emailMessage.trim();
        const files = [...emailFiles];

        setEmailMode(null);
        setEmailFiles([]);

        if (mode === 'documents') toast.success("Documents email sent!");
        else toast.success("Onboarding email sent!");

        try {
            if (mode === 'documents') {
                const fd = new FormData();
                fd.append('subject', subject);
                fd.append('message', message);
                files.forEach(f => fd.append('attachments', f));
                await apiClient.post(`/applications/${applicationId}/send-documents`, fd);
            } else {
                await Promise.all([
                    onboardingApi.sendWelcomeEmail(applicationId, files.length > 0 ? files : undefined, subject, message),
                    api.applications.updateStatus(String(applicationId), 'HIRED')
                ]);
            }
            queryClient.invalidateQueries({ queryKey: ['onboarding', 'list'] });
        } catch (err: any) {
            toast.error(`Error: ${err.message || "Please try again"}`);
        }
    };

    if (listLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!candidate) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 pt-6">
                <Link href="/dashboard/onboarding" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600">
                    <ArrowLeft className="w-4 h-4" /> Back to Onboarding Hub
                </Link>
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                    <h2 className="text-lg font-bold text-slate-800">Candidate Onboarding Profile Not Found</h2>
                    <p className="text-xs text-slate-500">The application ID #{applicationId} does not exist or has no active onboarding record.</p>
                </div>
            </div>
        );
    }

    const candName = candidate.candidate_name || detailedInfo?.candidate_name || `Candidate #${applicationId}`;
    const jobTitle = candidate.job_title || detailedInfo?.job_title || "Position Pending";
    const avatarPhoto = candidate.doc_front_picture_url ? (getDocumentViewUrl(candidate.doc_front_picture_url) || candidate.doc_front_picture_url) : null;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {/* Top Navigation */}
            <div className="flex items-center justify-between gap-4">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs hover:border-indigo-300 transition-all cursor-pointer">
                    <ArrowLeft className="w-4 h-4" /> Back to Onboarding Hub
                </button>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <span>Onboarding</span>
                    <span>/</span>
                    <span className="text-slate-700 font-bold">{candName}</span>
                </div>
            </div>

            {/* Profile Hero Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-5 z-10">
                    {avatarPhoto ? (
                        <img
                            src={avatarPhoto}
                            alt={candName}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white/10 shadow-lg bg-slate-800"
                        />
                    ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black ring-4 ring-white/10 shadow-lg">
                            {candName.substring(0, 2).toUpperCase()}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{candName}</h1>
                            <span className={`px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                                candidate.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                candidate.status.includes('PENDING') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}>
                                {candidate.status.replace(/_/g, " ")}
                            </span>
                        </div>
                        <p className="text-sm text-indigo-200 font-medium flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-indigo-400" />
                            {jobTitle}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap">
                            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-indigo-400" />{candidate.email || "No email"}</span>
                            {candidate.joining_date && (
                                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                    <Clock className="w-3.5 h-3.5" /> Joining: {new Date(candidate.joining_date).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Hero Actions */}
                <div className="z-10 flex items-center gap-2.5 flex-wrap self-stretch md:self-auto justify-end">
                    {candidate.hr_verified ? (
                        <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> HR Verified
                        </span>
                    ) : (
                        <button
                            onClick={handleHrVerify}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-2 shadow-md cursor-pointer"
                        >
                            <ShieldCheck className="w-4 h-4" /> Approve Documents
                        </button>
                    )}
                    <button onClick={() => openEmailDialog('documents')} className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-2 border border-white/15 cursor-pointer">
                        <Paperclip className="w-3.5 h-3.5" /> Send Docs Email
                    </button>
                    <button onClick={() => openEmailDialog('onboard')} className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-400 text-white transition-all flex items-center gap-2 shadow-sm cursor-pointer">
                        <Mail className="w-3.5 h-3.5" /> Onboarding Email
                    </button>
                </div>
            </div>

            {/* Personal Details Section */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" /> Personal & Contact Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
                        </span>
                        <p className="text-sm font-bold text-slate-800 truncate">{candidate.email || "N/A"}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
                        </span>
                        <p className="text-sm font-bold text-slate-800">{candidate.phone_number || "Not provided"}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" /> CNIC / National ID
                        </span>
                        <p className="text-sm font-bold text-slate-800">{candidate.cnic_number || "Not provided"}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5 text-slate-400" /> Current Address
                        </span>
                        <p className="text-sm font-bold text-slate-800">{candidate.current_address || "Not provided"}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Emergency Contact
                        </span>
                        <p className="text-sm font-bold text-slate-800">{candidate.emergency_contact || "Not provided"}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Bank Details
                        </span>
                        <p className="text-sm font-bold text-slate-800 truncate">
                            {candidate.bank_iban ? `${candidate.bank_name || 'Bank'}: ${candidate.bank_iban}` : "Not provided"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Uploaded Documents Grid */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-teal-600" /> Uploaded Documents ({displayDocs.length})
                </h2>
                {displayDocs.length === 0 ? (
                    <div className="p-12 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                        <Paperclip className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-semibold text-slate-500">No onboarding documents uploaded by candidate yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {displayDocs.map((doc: any) => (
                            <a
                                key={doc.id}
                                href={getDocumentViewUrl(doc.file_url) || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 shadow-2xs transition-all group bg-white"
                            >
                                <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <Paperclip className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600">
                                        {cleanFilename(doc.file_name)}
                                    </p>
                                    {doc.uploaded_at && (
                                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                                            Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
                                    {doc.file_type.toUpperCase()}
                                </span>
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Office Assignment & IT Access Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Office Setup */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" /> Office & Shift Assignment
                    </h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Reporting Time</label>
                            <input
                                defaultValue={candidate.reporting_time || ""}
                                onBlur={(e) => handleHrDetailsUpdate({ reporting_time: e.target.value })}
                                placeholder="e.g. 09:00 AM"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Office Location / Floor</label>
                            <input
                                defaultValue={candidate.office_location || ""}
                                onBlur={(e) => handleHrDetailsUpdate({ office_location: e.target.value })}
                                placeholder="e.g. Floor 2, Desk 14"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                        </div>
                    </div>
                </div>

                {/* IT Setup */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <MonitorCheck className="w-4 h-4 text-blue-600" /> IT Provisioning
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { key: 'it_slack_setup', label: 'Slack Account' },
                            { key: 'it_gmail_setup', label: 'Gmail Workspace' },
                            { key: 'it_office365_access', label: 'Office 365 License' },
                            { key: 'it_browser_extensions', label: 'Browser Extensions' },
                        ].map(item => (
                            <label key={item.key} className="flex items-center justify-between text-xs cursor-pointer p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 transition-all">
                                <span className="text-slate-800 font-semibold">{item.label}</span>
                                <input
                                    type="checkbox"
                                    checked={(candidate as any)[item.key] || false}
                                    onChange={() => handleItSetupToggle(item.key)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                                />
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Day 1 Induction Progress */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-500" /> Day 1 Induction Checklist
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* HR Tasks */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-3">
                        <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">HR Tasks</p>
                        <div className="space-y-2">
                            {[
                                { key: 'ind_hr_welcome_session', label: 'Welcome session conducted' },
                                { key: 'ind_hr_handbook_shared', label: 'Company handbook shared' },
                                { key: 'ind_hr_policies_explained', label: 'Policies & NDA briefing' },
                            ].map(item => (
                                <label key={item.key} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer p-1.5 bg-white rounded-lg border border-slate-200/60">
                                    <input
                                        type="checkbox"
                                        checked={(candidate as any)[item.key] || false}
                                        onChange={() => handleInductionToggle(item.key, 'hr')}
                                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* IT Tasks */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-3">
                        <p className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">IT Tasks</p>
                        <div className="space-y-2">
                            {[
                                { key: 'ind_it_credentials_provided', label: 'Work credentials provided' },
                                { key: 'ind_it_security_induction', label: 'Security & 2FA training' },
                            ].map(item => (
                                <label key={item.key} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer p-1.5 bg-white rounded-lg border border-slate-200/60">
                                    <input
                                        type="checkbox"
                                        checked={(candidate as any)[item.key] || false}
                                        onChange={() => handleInductionToggle(item.key, 'it')}
                                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Manager Tasks */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-3">
                        <p className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">Manager Tasks</p>
                        <div className="space-y-2">
                            {[
                                { key: 'ind_manager_buddy_assigned', label: 'Buddy assigned' },
                                { key: 'ind_manager_team_intro', label: 'Team introduction meeting' },
                            ].map(item => (
                                <label key={item.key} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer p-1.5 bg-white rounded-lg border border-slate-200/60">
                                    <input
                                        type="checkbox"
                                        checked={(candidate as any)[item.key] || false}
                                        onChange={() => handleInductionToggle(item.key, 'manager')}
                                        className="w-4 h-4 accent-emerald-600 cursor-pointer"
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Dialog */}
            <Dialog open={!!emailMode} onOpenChange={(open) => { if (!open) { setEmailMode(null); setEmailFiles([]); } }}>
                <DialogContent className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            {emailMode === 'documents' ? <><Paperclip className="w-5 h-5 text-teal-600" /> Send Onboarding Documents</> : <><ThumbsUp className="w-5 h-5 text-indigo-600" /> Onboarding Welcome Email</>}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 mt-1">
                            To: <span className="font-semibold text-slate-700">{candName}</span> — {candidate.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
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
                                <div key={`editor-${emailMode}`} ref={editorRef} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: emailMessage }}
                                    className="w-full min-h-[200px] max-h-[300px] overflow-y-auto bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 leading-relaxed"
                                    style={{ wordBreak: 'break-word' }} />
                            ) : (
                                <textarea className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed" rows={8} value={emailMessage} onChange={e => setEmailMessage(e.target.value)} />
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <button className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer" onClick={() => setEmailMode(null)}>Cancel</button>
                        <button className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm cursor-pointer" onClick={handleSendEmail}>Send Email</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
