'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
    Mail, RefreshCw, Reply, X, Loader2, Send, ChevronLeft,
    Paperclip, Pencil, Trash2, CheckCheck, UserPlus, Download,
    Briefcase, LogOut, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { gmailApi, type EmailSummary, type EmailMessage, type EmailAttachment } from '@/lib/api/gmail';
import { jobsApi } from '@/lib/api/jobs';

function formatFileSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function handleDownloadAttachment(messageId: string, att: EmailAttachment) {
    try {
        await gmailApi.downloadAttachment(messageId, att.attachment_id, att.filename);
    } catch {
        toast.error(`Failed to download "${att.filename}"`);
    }
}

function OAuthToastHandler() {
    const searchParams = useSearchParams();
    useEffect(() => {
        if (searchParams.get('gmail_connected') === '1') toast.success('Gmail connected successfully!');
        if (searchParams.get('gmail_error') === '1') toast.error('Failed to connect Gmail. Please try again.');
    }, [searchParams]);
    return null;
}

// ── Compose Dialog ────────────────────────────────────────────────────────────
interface ComposeProps {
    defaultTo?: string;
    defaultSubject?: string;
    threadId?: string;
    aliases?: GmailAliasInfo[];
    onClose: () => void;
    onSent: () => void;
}

function ComposeDialog({ defaultTo = '', defaultSubject = '', threadId, aliases = [], onClose, onSent }: ComposeProps) {
    const [fromEmail, setFromEmail] = useState(aliases[0]?.email || '');
    const [to, setTo] = useState(defaultTo);
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState('');
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleSend = async () => {
        if (!to.trim() || !body.trim()) {
            toast.error('To and message body are required.');
            return;
        }
        setSending(true);
        try {
            await gmailApi.sendEmail({
                to: to.trim(),
                subject: subject.trim() || '(no subject)',
                body: body.trim(),
                from_email: fromEmail || undefined,
                thread_id: threadId,
                cc: cc.trim() || undefined,
                bcc: bcc.trim() || undefined,
                attachments,
            });
            toast.success('Email sent!');
            onSent();
            onClose();
        } catch {
            toast.error('Failed to send email. Please try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 w-[520px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-400" /> New Message
                </span>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Fields */}
            <div className="border-b border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                {/* From Alias Dropdown */}
                {aliases.length > 0 && (
                    <div className="flex items-center px-4 py-2 gap-2">
                        <span className="text-xs font-bold text-slate-500 w-12 shrink-0">From</span>
                        <div className="relative flex-1">
                            <select
                                value={fromEmail}
                                onChange={e => setFromEmail(e.target.value)}
                                className="w-full bg-transparent text-xs text-slate-900 border-none outline-none font-medium appearance-none pr-6 cursor-pointer"
                            >
                                {aliases.map(a => (
                                    <option key={a.email} value={a.email}>
                                        {a.formatted || a.email}{a.is_default ? ' (default)' : ''}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                )}

                <div className="flex items-center px-4 py-2 gap-2">
                    <span className="text-xs font-bold text-slate-500 w-12 shrink-0">To</span>
                    <input
                        autoFocus value={to} onChange={e => setTo(e.target.value)}
                        placeholder="Recipients" className="w-full bg-transparent text-xs text-slate-900 border-none outline-none font-medium placeholder:text-slate-400"
                    />
                    <div className="flex gap-1.5 shrink-0 text-xs font-semibold text-slate-400">
                        {!showCc && <button onClick={() => setShowCc(true)} className="hover:text-blue-600">Cc</button>}
                        {!showBcc && <button onClick={() => setShowBcc(true)} className="hover:text-blue-600">Bcc</button>}
                    </div>
                </div>

                {showCc && (
                    <div className="flex items-center px-4 py-2 gap-2">
                        <span className="text-xs font-bold text-slate-500 w-12 shrink-0">Cc</span>
                        <input value={cc} onChange={e => setCc(e.target.value)} placeholder="Cc" className="w-full bg-transparent text-xs text-slate-900 border-none outline-none font-medium" />
                    </div>
                )}

                {showBcc && (
                    <div className="flex items-center px-4 py-2 gap-2">
                        <span className="text-xs font-bold text-slate-500 w-12 shrink-0">Bcc</span>
                        <input value={bcc} onChange={e => setBcc(e.target.value)} placeholder="Bcc" className="w-full bg-transparent text-xs text-slate-900 border-none outline-none font-medium" />
                    </div>
                )}

                <div className="flex items-center px-4 py-2 gap-2">
                    <span className="text-xs font-bold text-slate-500 w-12 shrink-0">Subject</span>
                    <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="w-full bg-transparent text-xs text-slate-900 border-none outline-none font-medium" />
                </div>
            </div>

            {/* Body */}
            <textarea
                value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..."
                className="flex-1 p-4 text-xs resize-none outline-none min-h-[180px] bg-white text-slate-800 placeholder:text-slate-400"
            />

            {attachments.length > 0 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                    {attachments.map((f, i) => (
                        <div key={i} className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                            <Paperclip className="h-3 w-3" />
                            <span className="max-w-[120px] truncate">{f.name}</span>
                            <button onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}>
                                <X className="h-3 w-3 hover:text-red-600" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                    <button onClick={handleSend} disabled={sending || !to.trim() || !body.trim()} className="btn-dribbble text-xs py-1.5 px-4">
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Send Message
                    </button>
                    <button onClick={() => fileRef.current?.click()} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
                        <Paperclip className="h-4 w-4" />
                    </button>
                    <input ref={fileRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files) setAttachments(a => [...a, ...Array.from(e.target.files!)]); }} />
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
        </div>
    );
}

// ── Sandboxed Email Frame ─────────────────────────────────────────────────────
const EMAIL_FRAME_CSS = `
  body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:13px;color:#334155;line-height:1.6;word-break:break-word;background:#ffffff;}
  a{color:#2563eb;text-decoration:none;}a:hover{text-decoration:underline;}
  img{max-width:100%;height:auto;}
  blockquote{margin:4px 0 4px 4px;padding:4px 12px;border-left:3px solid #2563eb;color:#64748b;}
  pre,code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px;color:#1e293b;}
  table{border-collapse:collapse;}td,th{padding:4px 8px;}
  hr{border:none;border-top:1px solid #e2e8f0;margin:12px 0;}
`;

function EmailBodyFrame({ html }: { html: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${EMAIL_FRAME_CSS}</style></head><body>${html}</body></html>`;

    const resize = useCallback(() => {
        const el = iframeRef.current;
        if (el?.contentDocument?.body) {
            el.style.height = `${el.contentDocument.body.scrollHeight + 32}px`;
        }
    }, []);

    return (
        <iframe
            ref={iframeRef} srcDoc={srcDoc} sandbox="allow-same-origin allow-popups"
            className="w-full border-0 block bg-white" style={{ minHeight: 80 }} onLoad={resize} title="email-body"
        />
    );
}

// ── Import Application Dialog ─────────────────────────────────────────────────
interface ImportDialogProps {
    messageId: string;
    senderName: string;
    onClose: () => void;
    onImported: () => void;
}

function ImportApplicationDialog({ messageId, senderName, onClose, onImported }: ImportDialogProps) {
    const [selectedJobId, setSelectedJobId] = useState<number | undefined>(undefined);
    const [importing, setImporting] = useState(false);

    const { data: jobs, isLoading: jobsLoading } = useQuery({
        queryKey: ['jobs', 'all'],
        queryFn: () => jobsApi.getAll({ status: 'PUBLISHED' }),
    });

    const handleImport = async () => {
        setImporting(true);
        try {
            const result = await gmailApi.importSingleApplication(messageId, selectedJobId);
            toast.success(result.message);
            onImported();
            onClose();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to import application.');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white max-w-md w-full border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-blue-600" />
                        <span className="font-bold text-lg text-slate-900">Import Candidate</span>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"><X className="h-4 w-4" /></button>
                </div>

                <div className="space-y-4 mb-6">
                    <p className="text-xs text-slate-600">
                        Import <strong className="text-slate-900 font-bold">{senderName}</strong> as an application into your Evalyn candidate pipeline.
                    </p>
                    <div>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">Assign Job Opening</label>
                        {jobsLoading ? (
                            <div className="flex items-center gap-2 text-xs py-2 text-slate-500">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" /> Loading positions...
                            </div>
                        ) : (
                            <select
                                value={selectedJobId ?? ''}
                                onChange={e => setSelectedJobId(e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Auto-match by email subject</option>
                                {(jobs || []).map(job => (
                                    <option key={job.id} value={job.id}>
                                        {job.title}{job.department ? ` — ${job.department}` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                    <button className="btn-glass text-xs py-1.5 px-4" onClick={onClose} disabled={importing}>Cancel</button>
                    <button onClick={handleImport} disabled={importing} className="btn-dribbble text-xs py-1.5 px-4">
                        {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                        Import Application
                    </button>
                </div>
            </div>
        </div>
    );
}

type GmailTab = 'inbox' | 'sent';

// ── Main Inbox Page ───────────────────────────────────────────────────────────
export default function InboxPage() {
    const [activeTab, setActiveTab] = useState<GmailTab>('inbox');
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [showCompose, setShowCompose] = useState(false);
    const [replyTarget, setReplyTarget] = useState<EmailMessage | null>(null);
    const [importTarget, setImportTarget] = useState<{ messageId: string; senderName: string } | null>(null);

    const pendingInboxRefreshRef = useRef(false);
    const pendingSentRefreshRef = useRef(false);

    const [inboxEmails, setInboxEmails] = useState<EmailSummary[]>([]);
    const [inboxNextToken, setInboxNextToken] = useState<string | null>(null);
    const [loadingMoreInbox, setLoadingMoreInbox] = useState(false);

    const [sentEmails, setSentEmails] = useState<EmailSummary[]>([]);
    const [sentNextToken, setSentNextToken] = useState<string | null>(null);
    const [loadingMoreSent, setLoadingMoreSent] = useState(false);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deletingIds, setDeletingIds] = useState(false);
    const [markingAllRead, setMarkingAllRead] = useState(false);

    type SyncResult = { created: number; skipped: number; total_emails: number; message: string; details: Array<{ email: string; name?: string; status: 'created' | 'skipped'; job?: string; application_id?: number; reason?: string }> };
    const [syncingApps, setSyncingApps] = useState(false);
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

    const queryClient = useQueryClient();

    const { data: status, isLoading: statusLoading } = useQuery({
        queryKey: ['gmail', 'status'],
        queryFn: gmailApi.getStatus,
        staleTime: 10 * 60 * 1000,
    });

    const { data: aliasesData } = useQuery({
        queryKey: ['gmail', 'aliases'],
        queryFn: gmailApi.getAliases,
        enabled: status?.connected === true,
        staleTime: 10 * 60 * 1000,
    });
    const aliases = aliasesData?.aliases ?? [];

    const { data: inbox, isLoading: inboxLoading, isFetching: inboxFetching, isError: inboxError, refetch: refetchInbox } = useQuery({
        queryKey: ['gmail', 'inbox'],
        queryFn: () => gmailApi.getInbox(),
        enabled: status?.connected === true,
        retry: false,
        staleTime: 3 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    const { data: sent, isLoading: sentLoading, isFetching: sentFetching, isError: sentError, refetch: refetchSent } = useQuery({
        queryKey: ['gmail', 'sent'],
        queryFn: () => gmailApi.getSent(),
        enabled: status?.connected === true && activeTab === 'sent',
        retry: false,
        staleTime: 3 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    useEffect(() => {
        if (!inbox) return;
        if (pendingInboxRefreshRef.current || inboxEmails.length === 0) {
            setInboxEmails(inbox.emails);
            setInboxNextToken(inbox.next_page_token);
            pendingInboxRefreshRef.current = false;
        } else {
            const existingIds = new Set(inboxEmails.map(e => e.thread_id));
            const newEmails = inbox.emails.filter(e => !existingIds.has(e.thread_id));
            if (newEmails.length > 0) {
                setInboxEmails(prev => [...newEmails, ...prev]);
            }
        }
    }, [inbox]);

    useEffect(() => {
        if (!sent) return;
        if (pendingSentRefreshRef.current || sentEmails.length === 0) {
            setSentEmails(sent.emails);
            setSentNextToken(sent.next_page_token);
            pendingSentRefreshRef.current = false;
        } else {
            const existingIds = new Set(sentEmails.map(e => e.thread_id));
            const newEmails = sent.emails.filter(e => !existingIds.has(e.thread_id));
            if (newEmails.length > 0) {
                setSentEmails(prev => [...newEmails, ...prev]);
            }
        }
    }, [sent]);

    const { data: thread, isLoading: threadLoading } = useQuery({
        queryKey: ['gmail', 'thread', selectedThreadId],
        queryFn: () => gmailApi.getThread(selectedThreadId!),
        enabled: !!selectedThreadId,
    });

    const deleteMutation = useMutation({
        mutationFn: (msgIds: string[]) => gmailApi.trashMessages(msgIds),
        onSuccess: () => {
            toast.success(`Deleted ${selectedIds.size} email(s)`);
            const deleted = selectedIds;
            if (activeTab === 'inbox') setInboxEmails(prev => prev.filter(e => !deleted.has(e.id)));
            else setSentEmails(prev => prev.filter(e => !deleted.has(e.id)));
            setSelectedIds(new Set());
            setSelectedThreadId(null);
        },
        onError: () => toast.error('Failed to delete emails.'),
    });

    const [disconnecting, setDisconnecting] = useState(false);
    const [connecting, setConnecting] = useState(false);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const data = await gmailApi.getAuthUrl();
            window.location.href = data.authorization_url;
        } catch {
            toast.error('Failed to initiate Gmail connection.');
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to log out of your Gmail account?')) return;
        setDisconnecting(true);
        try {
            await gmailApi.disconnect();
            toast.success('Gmail account logged out successfully');
            setSelectedThreadId(null);
            setSelectedIds(new Set());
            setInboxEmails([]);
            setSentEmails([]);
            queryClient.invalidateQueries({ queryKey: ['gmail'] });
        } catch {
            toast.error('Failed to log out of Gmail account.');
        } finally {
            setDisconnecting(false);
        }
    };

    const handleTabChange = (tab: GmailTab) => {
        setActiveTab(tab);
        setSelectedThreadId(null);
        setSelectedIds(new Set());
    };

    const handleRefresh = () => {
        setSelectedIds(new Set());
        if (activeTab === 'inbox') {
            pendingInboxRefreshRef.current = true;
            refetchInbox();
        } else {
            pendingSentRefreshRef.current = true;
            refetchSent();
        }
    };

    const handleLoadMore = async () => {
        if (activeTab === 'inbox') {
            if (!inboxNextToken || loadingMoreInbox) return;
            setLoadingMoreInbox(true);
            try {
                const res = await gmailApi.getInbox(inboxNextToken);
                setInboxEmails(prev => [...prev, ...res.emails]);
                setInboxNextToken(res.next_page_token);
            } catch {
                toast.error('Failed to load more emails.');
            } finally {
                setLoadingMoreInbox(false);
            }
        } else {
            if (!sentNextToken || loadingMoreSent) return;
            setLoadingMoreSent(true);
            try {
                const res = await gmailApi.getSent(sentNextToken);
                setSentEmails(prev => [...prev, ...res.emails]);
                setSentNextToken(res.next_page_token);
            } catch {
                toast.error('Failed to load more sent emails.');
            } finally {
                setLoadingMoreSent(false);
            }
        }
    };

    const handleSelectEmail = (email: EmailSummary) => {
        setSelectedThreadId(email.thread_id);
        if (email.unread) {
            setInboxEmails(prev => prev.map(e => e.id === email.id ? { ...e, unread: false } : e));
            gmailApi.markAsRead([email.id]).catch(() => {});
        }
    };

    const toggleSelectId = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        setDeletingIds(true);
        try {
            await deleteMutation.mutateAsync(Array.from(selectedIds));
        } finally {
            setDeletingIds(false);
        }
    };

    const handleMarkAllRead = async () => {
        const unreadIds = inboxEmails.filter(e => e.unread).map(e => e.id);
        if (unreadIds.length === 0) { toast.info('No unread emails.'); return; }
        setMarkingAllRead(true);
        try {
            await gmailApi.markAsRead(unreadIds);
            setInboxEmails(prev => prev.map(e => ({ ...e, unread: false })));
            toast.success(`Marked ${unreadIds.length} email(s) as read`);
        } catch {
            toast.error('Failed to mark emails as read.');
        } finally {
            setMarkingAllRead(false);
        }
    };

    const handleSyncApplications = async () => {
        setSyncingApps(true);
        setSyncResult(null);
        try {
            const res = await gmailApi.syncApplications();
            setSyncResult(res);
            if (res.created > 0) {
                toast.success(`Imported ${res.created} new candidate application(s)!`);
                queryClient.invalidateQueries({ queryKey: ['applications'] });
            } else {
                toast.info(res.message);
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to import applications.');
        } finally {
            setSyncingApps(false);
        }
    };

    const handleReply = (msg: EmailMessage) => {
        setReplyTarget(msg);
        setShowCompose(true);
    };

    const handleSent = () => {
        if (activeTab === 'sent') {
            pendingSentRefreshRef.current = true;
            refetchSent();
        }
        if (selectedThreadId) {
            queryClient.invalidateQueries({ queryKey: ['gmail', 'thread', selectedThreadId] });
        }
    };

    const emails = activeTab === 'inbox' ? inboxEmails : sentEmails;
    const isListLoading = activeTab === 'inbox' ? inboxLoading : sentLoading;
    const isListFetching = activeTab === 'inbox' ? inboxFetching : sentFetching;
    const isListError = activeTab === 'inbox' ? inboxError : sentError;
    const nextToken = activeTab === 'inbox' ? inboxNextToken : sentNextToken;
    const loadingMore = activeTab === 'inbox' ? loadingMoreInbox : loadingMoreSent;

    if (statusLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-xs font-semibold text-slate-500 animate-pulse">Checking Gmail connection...</p>
                </div>
            </div>
        );
    }

    if (!status?.connected) {
        return (
            <div className="max-w-xl mx-auto py-16 text-center animate-in fade-in duration-500">
                <Suspense fallback={null}><OAuthToastHandler /></Suspense>
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
                    <Mail className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                    Connect Gmail to Evalyn
                </h1>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">
                    Sync emails with candidate applications, send interview invites, and track replies seamlessly.
                </p>
                <button onClick={handleConnect} disabled={connecting} className="btn-dribbble h-11 px-8 text-sm font-semibold">
                    {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {connecting ? 'Connecting...' : 'Connect Gmail Account'}
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col space-y-6 animate-in fade-in duration-500">
            <Suspense fallback={null}><OAuthToastHandler /></Suspense>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Inbox & Communications
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-xs font-semibold text-slate-500">
                            Connected as <strong className="text-slate-800">{status.email || 'Gmail user'}</strong>
                        </p>
                        <button
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                            className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200/80 transition-colors font-bold"
                            title="Disconnect / Logout Gmail Account"
                        >
                            {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                            Logout
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {activeTab === 'inbox' && (
                        <button onClick={handleMarkAllRead} disabled={markingAllRead} className="btn-glass text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold">
                            {markingAllRead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5 text-blue-600" />}
                            Mark Read
                        </button>
                    )}
                    <button onClick={() => { setReplyTarget(null); setShowCompose(true); }} className="btn-dribbble text-xs py-2 px-4 flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5" /> Compose
                    </button>
                    <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="btn-glass text-xs py-2 px-3 flex items-center gap-1.5 font-bold text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        title="Disconnect / Logout Gmail Account"
                    >
                        {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5 text-rose-600" />}
                        Logout Gmail
                    </button>
                    <button onClick={handleRefresh} disabled={isListFetching} className="btn-glass p-2">
                        <RefreshCw className={`w-4 h-4 text-slate-600 ${isListFetching ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Main two-panel container with clean borders & elevated styling */}
            <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
                
                {/* Left List Panel */}
                <div className={`${selectedThreadId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 xl:w-96 panel-elevated border border-slate-200 overflow-hidden flex-shrink-0 bg-white`}>
                    
                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-200 bg-slate-50/80 p-1 gap-1">
                        {(['inbox', 'sent'] as GmailTab[]).map((tab) => (
                            <button
                                key={tab} onClick={() => handleTabChange(tab)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === tab ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-blue-200 bg-blue-50/80 flex-shrink-0">
                            <span className="text-xs font-bold text-blue-700 flex-1">{selectedIds.size} selected</span>
                            <button onClick={handleDeleteSelected} disabled={deletingIds} className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg">
                                {deletingIds ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setSelectedIds(new Set())} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                        </div>
                    )}

                    {isListLoading ? (
                        <div className="flex items-center justify-center flex-1">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                    ) : isListError ? (
                        <div className="flex flex-col items-center justify-center flex-1 gap-3 p-6 text-center">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-amber-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-700">Gmail token expired</p>
                            <p className="text-[11px] text-slate-400 font-medium">Your Gmail session has expired.<br/>Please reconnect your account.</p>
                            <button
                                onClick={handleConnect}
                                className="btn-dribbble text-xs py-1.5 px-4 mt-1"
                            >
                                Reconnect Gmail
                            </button>
                        </div>
                    ) : !emails.length ? (
                        <div className="flex flex-col items-center justify-center flex-1 gap-2 p-6 text-center text-xs text-slate-400 font-medium">
                            <Mail className="w-8 h-8 opacity-40 mb-1 text-slate-500" />
                            <p>No emails in {activeTab}</p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                            {emails.map((email) => {
                                const isChecked = selectedIds.has(email.id);
                                const isActive = email.thread_id === selectedThreadId;
                                return (
                                    <div
                                        key={email.id} onClick={() => handleSelectEmail(email)}
                                        className={`p-4 cursor-pointer transition-all space-y-1 relative group ${
                                            isActive ? 'bg-blue-50/80 border-l-4 border-blue-600' : isChecked ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-xs font-bold truncate ${email.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                                                {activeTab === 'sent' ? (email.to_ ? `To: ${email.to_}` : email.from_) : email.from_}
                                            </span>
                                            {email.unread && <span className="w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0 shadow-sm" />}
                                        </div>
                                        <p className="text-xs font-semibold truncate text-slate-800">{email.subject}</p>
                                        <p className="text-[11px] truncate text-slate-500 font-medium">{email.snippet}</p>
                                    </div>
                                );
                            })}
                            {nextToken && (
                                <div className="p-3 text-center bg-slate-50/50">
                                    <button onClick={handleLoadMore} disabled={loadingMore} className="btn-glass text-xs py-1 px-3">
                                        {loadingMore ? 'Loading...' : 'Load more'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Detail Panel */}
                <div className={`${selectedThreadId ? 'flex' : 'hidden lg:flex'} flex-col flex-1 panel-elevated border border-slate-200 overflow-hidden min-w-0 bg-white`}>
                    {!selectedThreadId ? (
                        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-xs text-slate-400 font-medium">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                                <Mail className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="text-slate-500 font-semibold text-sm">Select an email to view full conversation</p>
                        </div>
                    ) : threadLoading ? (
                        <div className="flex items-center justify-center flex-1">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                    ) : thread ? (
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/50 flex-shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button onClick={() => setSelectedThreadId(null)} className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-200">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h2 className="text-base font-extrabold text-slate-900 truncate">
                                        {thread.messages[0]?.subject ?? '(no subject)'}
                                    </h2>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0 bg-slate-50/30">
                                {thread.messages.map((msg) => (
                                    <div key={msg.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                                            <div className="min-w-0">
                                                <p className="text-xs font-extrabold text-slate-900 truncate">{msg.from_}</p>
                                                {msg.to && <p className="text-[11px] text-slate-500 font-medium truncate">To: {msg.to}</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        const nameMatch = msg.from_.match(/^"?([^"<]*)"?\s*</);
                                                        setImportTarget({ messageId: msg.id, senderName: nameMatch ? nameMatch[1].trim() : msg.from_ });
                                                    }}
                                                    className="btn-glass text-[11px] py-1 px-2.5 flex items-center gap-1 font-bold"
                                                >
                                                    <Briefcase className="w-3 h-3 text-blue-600" /> Import
                                                </button>
                                                <button onClick={() => handleReply(msg)} className="btn-glass text-[11px] py-1 px-2.5 flex items-center gap-1 font-bold">
                                                    <Reply className="w-3 h-3 text-blue-600" /> Reply
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            {msg.body_html
                                                ? <EmailBodyFrame html={msg.body_html} />
                                                : <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">{msg.body || <span className="text-slate-400 italic">No text content</span>}</div>
                                            }
                                        </div>

                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2">
                                                {msg.attachments.map((att) => (
                                                    <button
                                                        key={att.attachment_id} onClick={() => handleDownloadAttachment(msg.id, att)}
                                                        className="btn-glass text-[11px] py-1 px-2.5 flex items-center gap-1.5 font-bold"
                                                    >
                                                        <Paperclip className="w-3 h-3 text-slate-500" />
                                                        <span className="max-w-[150px] truncate text-slate-700">{att.filename}</span>
                                                        <Download className="w-3 h-3 text-blue-600" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {importTarget && (
                <ImportApplicationDialog
                    messageId={importTarget.messageId} senderName={importTarget.senderName}
                    onClose={() => setImportTarget(null)}
                    onImported={() => { queryClient.invalidateQueries({ queryKey: ['applications'] }); }}
                />
            )}

            {showCompose && (
                <ComposeDialog
                    defaultTo={replyTarget?.from_ ?? ''}
                    defaultSubject={replyTarget ? (replyTarget.subject.startsWith('Re:') ? replyTarget.subject : `Re: ${replyTarget.subject}`) : ''}
                    threadId={replyTarget ? selectedThreadId ?? undefined : undefined}
                    aliases={aliases}
                    onClose={() => { setShowCompose(false); setReplyTarget(null); }}
                    onSent={handleSent}
                />
            )}
        </div>
    );
}
