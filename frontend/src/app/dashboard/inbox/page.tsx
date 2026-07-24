'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
    Mail, RefreshCw, Reply, X, Loader2, Send, ChevronLeft,
    Paperclip, Pencil, Trash2, CheckCheck, Square, CheckSquare, UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { gmailApi, type EmailSummary, type EmailMessage, type GmailAliasInfo } from '@/lib/api/gmail';

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
        <div className="fixed bottom-4 right-6 z-50 w-[520px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col" style={{ maxHeight: '80vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-t-2xl">
                <span className="text-white font-semibold text-sm">New Message</span>
                <button onClick={onClose} className="text-slate-300 hover:text-white transition-colors">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Fields */}
            <div className="border-b border-slate-100 divide-y divide-slate-100">
                {/* From (if aliases exist) */}
                {aliases.length > 0 && (
                    <div className="flex items-center px-4 py-2 gap-2">
                        <span className="text-xs text-slate-400 w-12 shrink-0">From</span>
                        <select
                            value={fromEmail}
                            onChange={e => setFromEmail(e.target.value)}
                            className="flex-1 text-sm bg-transparent outline-none text-slate-800 cursor-pointer font-medium"
                        >
                            {aliases.map(alias => (
                                <option key={alias.email} value={alias.email}>{alias.formatted}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* To */}
                <div className="flex items-center px-4 py-2 gap-2">
                    <span className="text-xs text-slate-400 w-12 shrink-0">To</span>
                    <input
                        autoFocus
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        placeholder="Recipients"
                        className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-400"
                    />
                    <div className="flex gap-1 shrink-0">
                        {!showCc && (
                            <button onClick={() => setShowCc(true)} className="text-xs text-slate-400 hover:text-slate-600 px-1">Cc</button>
                        )}
                        {!showBcc && (
                            <button onClick={() => setShowBcc(true)} className="text-xs text-slate-400 hover:text-slate-600 px-1">Bcc</button>
                        )}
                    </div>
                </div>

                {/* CC */}
                {showCc && (
                    <div className="flex items-center px-4 py-2 gap-2">
                        <span className="text-xs text-slate-400 w-12 shrink-0">Cc</span>
                        <input
                            value={cc}
                            onChange={e => setCc(e.target.value)}
                            placeholder="Cc recipients"
                            className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-400"
                        />
                        <button onClick={() => { setShowCc(false); setCc(''); }} className="text-slate-300 hover:text-slate-500">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}

                {/* BCC */}
                {showBcc && (
                    <div className="flex items-center px-4 py-2 gap-2">
                        <span className="text-xs text-slate-400 w-12 shrink-0">Bcc</span>
                        <input
                            value={bcc}
                            onChange={e => setBcc(e.target.value)}
                            placeholder="Bcc recipients"
                            className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-400"
                        />
                        <button onClick={() => { setShowBcc(false); setBcc(''); }} className="text-slate-300 hover:text-slate-500">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}

                {/* Subject */}
                <div className="flex items-center px-4 py-2 gap-2">
                    <span className="text-xs text-slate-400 w-12 shrink-0">Subject</span>
                    <input
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Subject"
                        className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Body */}
            <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your message..."
                className="flex-1 p-4 text-sm text-slate-800 placeholder:text-slate-400 resize-none outline-none min-h-[200px]"
            />

            {/* Attachments list */}
            {attachments.length > 0 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                    {attachments.map((f, i) => (
                        <div key={i} className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1 text-xs text-slate-700">
                            <Paperclip className="h-3 w-3" />
                            <span className="max-w-[120px] truncate">{f.name}</span>
                            <button onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}>
                                <X className="h-3 w-3 text-slate-400 hover:text-red-500" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleSend}
                        disabled={sending || !to.trim() || !body.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 h-9 text-sm font-medium"
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Send
                    </Button>
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                        title="Attach files"
                    >
                        <Paperclip className="h-4 w-4" />
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={e => {
                            if (e.target.files) setAttachments(a => [...a, ...Array.from(e.target.files!)]);
                        }}
                    />
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

// ── HTML Email Renderer (sandboxed iframe, auto-height) ───────────────────────
const EMAIL_FRAME_CSS = `
  body{margin:0;padding:16px;font-family:-apple-system,Arial,sans-serif;font-size:14px;color:#202124;line-height:1.6;word-break:break-word;}
  a{color:#1a73e8;text-decoration:none;}a:hover{text-decoration:underline;}
  img{max-width:100%;height:auto;}
  blockquote{margin:4px 0 4px 4px;padding:4px 12px;border-left:3px solid #dadce0;color:#5f6368;}
  pre,code{background:#f1f3f4;padding:2px 6px;border-radius:4px;font-size:13px;}
  table{border-collapse:collapse;}td,th{padding:4px 8px;}
  hr{border:none;border-top:1px solid #e0e0e0;margin:12px 0;}
  .gmail_quote{color:#5f6368;}
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
            ref={iframeRef}
            srcDoc={srcDoc}
            sandbox="allow-same-origin allow-popups"
            className="w-full border-0 block"
            style={{ minHeight: 80 }}
            onLoad={resize}
            title="email-body"
        />
    );
}

type GmailTab = 'inbox' | 'sent';

// ── Main Gmail Page ───────────────────────────────────────────────────────────
export default function InboxPage() {
    const [activeTab, setActiveTab] = useState<GmailTab>('inbox');
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [showCompose, setShowCompose] = useState(false);
    const [replyTarget, setReplyTarget] = useState<EmailMessage | null>(null);

    // Track whether the next inbox/sent update was triggered by an explicit Refresh button click.
    // Background refetches (window focus, staleTime) should NOT overwrite the full list —
    // they should only prepend genuinely new emails at the top.
    const pendingInboxRefreshRef = useRef(false);
    const pendingSentRefreshRef = useRef(false);

    // Inbox state
    const [inboxEmails, setInboxEmails] = useState<EmailSummary[]>([]);
    const [inboxNextToken, setInboxNextToken] = useState<string | null>(null);
    const [loadingMoreInbox, setLoadingMoreInbox] = useState(false);

    // Sent state
    const [sentEmails, setSentEmails] = useState<EmailSummary[]>([]);
    const [sentNextToken, setSentNextToken] = useState<string | null>(null);
    const [loadingMoreSent, setLoadingMoreSent] = useState(false);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deletingIds, setDeletingIds] = useState(false);
    const [markingAllRead, setMarkingAllRead] = useState(false);

    // Email-to-application sync state
    type SyncResult = { created: number; skipped: number; total_emails: number; message: string; details: Array<{ email: string; name?: string; status: 'created' | 'skipped'; job?: string; application_id?: number; reason?: string }> };
    const [syncingApps, setSyncingApps] = useState(false);
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

    const queryClient = useQueryClient();

    const { data: status, isLoading: statusLoading } = useQuery({
        queryKey: ['gmail', 'status'],
        queryFn: gmailApi.getStatus,
    });

    const { data: inbox, isLoading: inboxLoading, isFetching: inboxFetching, isError: inboxError, refetch: refetchInbox } = useQuery({
        queryKey: ['gmail', 'inbox'],
        queryFn: () => gmailApi.getInbox(),
        enabled: status?.connected === true,
        retry: false,
        staleTime: 3 * 60 * 1000,   // refetch after 3 min of inactivity
        refetchOnWindowFocus: true,  // check for new emails when tab is re-focused
        refetchOnMount: true,        // always get fresh data on page visit
    });

    const { data: sent, isLoading: sentLoading, isFetching: sentFetching, isError: sentError, refetch: refetchSent } = useQuery({
        queryKey: ['gmail', 'sent'],
        queryFn: () => gmailApi.getSent(),
        enabled: status?.connected === true && activeTab === 'sent',
        retry: false,
        staleTime: 3 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });

    useEffect(() => {
        if (!inbox) return;
        if (pendingInboxRefreshRef.current || inboxEmails.length === 0) {
            // Explicit refresh or initial load — replace the whole list
            setInboxEmails(inbox.emails);
            setInboxNextToken(inbox.next_page_token);
            pendingInboxRefreshRef.current = false;
        } else {
            // Background refetch — only prepend genuinely new threads at the top
            // so that "load more" pages are not wiped out
            const existingIds = new Set(inboxEmails.map(e => e.thread_id));
            const newEmails = inbox.emails.filter(e => !existingIds.has(e.thread_id));
            if (newEmails.length > 0) {
                setInboxEmails(prev => [...newEmails, ...prev]);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sent]);

    const handleLoadMoreInbox = async () => {
        if (!inboxNextToken || loadingMoreInbox) return;
        setLoadingMoreInbox(true);
        try {
            const page = await gmailApi.getInbox(inboxNextToken);
            setInboxEmails(prev => [...prev, ...page.emails]);
            setInboxNextToken(page.next_page_token);
        } finally { setLoadingMoreInbox(false); }
    };

    const handleLoadMoreSent = async () => {
        if (!sentNextToken || loadingMoreSent) return;
        setLoadingMoreSent(true);
        try {
            const page = await gmailApi.getSent(sentNextToken);
            setSentEmails(prev => [...prev, ...page.emails]);
            setSentNextToken(page.next_page_token);
        } finally { setLoadingMoreSent(false); }
    };

    const handleRefresh = () => {
        setSelectedIds(new Set());
        setSelectedThreadId(null);
        setReplyTarget(null);
        if (activeTab === 'inbox') {
            pendingInboxRefreshRef.current = true;
            setInboxNextToken(null);
            refetchInbox();
        } else {
            pendingSentRefreshRef.current = true;
            setSentNextToken(null);
            refetchSent();
        }
    };

    const handleTabChange = (tab: GmailTab) => {
        setActiveTab(tab);
        setSelectedThreadId(null);
        setReplyTarget(null);
    };

    const { data: thread, isLoading: threadLoading } = useQuery({
        queryKey: ['gmail', 'thread', selectedThreadId],
        queryFn: () => gmailApi.getThread(selectedThreadId!),
        enabled: !!selectedThreadId && status?.connected === true,
    });

    const handleConnect = async () => {
        try {
            const { authorization_url } = await gmailApi.getAuthUrl();
            window.location.href = authorization_url;
        } catch { toast.error('Failed to get Gmail authorization URL.'); }
    };

    const handleSelectEmail = (email: EmailSummary) => {
        setSelectedThreadId(email.thread_id);
        setReplyTarget(null);
        setShowCompose(false);
        // Mark as read locally + in Gmail if unread
        if (email.unread) {
            if (activeTab === 'inbox') {
                setInboxEmails(prev => prev.map(e => e.id === email.id ? { ...e, unread: false } : e));
            } else {
                setSentEmails(prev => prev.map(e => e.id === email.id ? { ...e, unread: false } : e));
            }
            gmailApi.markRead([email.thread_id]).catch(() => { });
        }
    };

    const toggleSelectId = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleDeleteSelected = async () => {
        if (!selectedIds.size) return;
        setDeletingIds(true);
        try {
            const emails = activeTab === 'inbox' ? inboxEmails : sentEmails;
            // Collect thread IDs for selected message IDs so we trash entire conversations
            const threadIds = [...selectedIds]
                .map(id => emails.find(e => e.id === id)?.thread_id)
                .filter(Boolean) as string[];
            await gmailApi.trashMessages(threadIds);
            const ids = selectedIds;
            if (activeTab === 'inbox') setInboxEmails(prev => prev.filter(e => !ids.has(e.id)));
            else setSentEmails(prev => prev.filter(e => !ids.has(e.id)));
            setSelectedIds(new Set());
            if (selectedThreadId && [...ids].some(id => emails.find(e => e.id === id)?.thread_id === selectedThreadId)) {
                setSelectedThreadId(null);
            }
            toast.success(`${ids.size} email${ids.size > 1 ? 's' : ''} moved to trash`);
        } catch {
            toast.error('Failed to delete emails. Please try again.');
        } finally {
            setDeletingIds(false);
        }
    };

    const handleMarkAllRead = async () => {
        setMarkingAllRead(true);
        try {
            const res = await gmailApi.markAllRead();
            setInboxEmails(prev => prev.map(e => ({ ...e, unread: false })));
            toast.success(`${res.marked} email${res.marked !== 1 ? 's' : ''} marked as read`);
        } catch {
            toast.error('Failed to mark all as read.');
        } finally {
            setMarkingAllRead(false);
        }
    };

    const handleSyncApplications = async () => {
        setSyncingApps(true);
        setSyncResult(null);
        try {
            const result = await gmailApi.syncApplications(30);
            setSyncResult(result);
            if (result.created > 0) {
                toast.success(`${result.created} new application${result.created !== 1 ? 's' : ''} imported from email!`);
            } else {
                toast.info('No new email applications found.');
            }
        } catch {
            toast.error('Failed to sync email applications. Please try again.');
        } finally {
            setSyncingApps(false);
        }
    };

    const handleReply = (msg: EmailMessage) => { setReplyTarget(msg); setShowCompose(true); };
    const handleSent = () => { queryClient.invalidateQueries({ queryKey: ['gmail', 'inbox'] }); };

    if (statusLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!status?.connected) {
        return (
            <>
                <Suspense><OAuthToastHandler /></Suspense>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                        <Mail className="h-10 w-10 text-indigo-500" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Connect Gmail</h2>
                        <p className="text-slate-500 max-w-sm">Connect your Gmail account to manage emails directly from Evalyn.</p>
                    </div>
                    <Button onClick={handleConnect} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3">
                        <Mail className="h-4 w-4 mr-2" />Connect Gmail
                    </Button>
                </div>
            </>
        );
    }

    const isListLoading = activeTab === 'inbox' ? inboxLoading : sentLoading;
    const isListFetching = activeTab === 'inbox' ? inboxFetching : sentFetching;
    const isListError = activeTab === 'inbox' ? inboxError : sentError;
    const emails = activeTab === 'inbox' ? inboxEmails : sentEmails;
    const nextToken = activeTab === 'inbox' ? inboxNextToken : sentNextToken;
    const loadingMore = activeTab === 'inbox' ? loadingMoreInbox : loadingMoreSent;
    const handleLoadMore = activeTab === 'inbox' ? handleLoadMoreInbox : handleLoadMoreSent;

    return (
        <>
            <Suspense><OAuthToastHandler /></Suspense>

            <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
                {/* Header */}
                <div className="flex items-center justify-between flex-shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Gmail</h1>
                        {status.email && (
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-sm text-slate-500">{status.email}</p>
                                {status.aliases && status.aliases.length > 1 && (
                                    <span
                                        className="text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 cursor-help"
                                        title={`Active send-as aliases:\n${status.aliases.map(a => a.formatted).join('\n')}`}
                                    >
                                        {status.aliases.length} Aliases
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {activeTab === 'inbox' && (
                            <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markingAllRead || isListLoading}>
                                {markingAllRead ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-1.5" />}
                                Mark all read
                            </Button>
                        )}
                        <Button
                            variant="outline" size="sm"
                            onClick={handleSyncApplications}
                            disabled={syncingApps}
                            title="Scan inbox for emails with CV attachments and create applications automatically"
                        >
                            {syncingApps
                                ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                : <UserPlus className="h-4 w-4 mr-1.5" />}
                            {syncingApps ? 'Importing...' : 'Import Applications'}
                        </Button>
                        <Button
                            onClick={() => { setReplyTarget(null); setShowCompose(true); }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-full px-5"
                        >
                            <Pencil className="h-4 w-4" />
                            Compose
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isListFetching}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${isListFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Sync result banner */}
                {syncResult && (
                    <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${syncResult.created > 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <div className="flex-1">
                            <p className="font-medium">{syncResult.message}</p>
                            {syncResult.details.length > 0 && (
                                <ul className="mt-2 space-y-0.5">
                                    {syncResult.details.map((d, i) => (
                                        <li key={i} className="text-xs">
                                            {d.status === 'created'
                                                ? <span>✓ <strong>{d.name || d.email}</strong> → <em>{d.job}</em></span>
                                                : <span className="text-slate-500">⚬ {d.email} — {d.reason}</span>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <button onClick={() => setSyncResult(null)} className="text-slate-400 hover:text-slate-600 mt-0.5">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Two-pane layout */}
                <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
                    {/* Email list */}
                    <div className={`${selectedThreadId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 xl:w-96 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0`}>
                        {/* Tabs */}
                        <div className="flex border-b border-slate-100 flex-shrink-0">
                            {(['inbox', 'sent'] as GmailTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => handleTabChange(tab)}
                                    className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab
                                        ? 'text-indigo-600 border-b-2 border-indigo-500'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {tab === 'inbox' ? 'Inbox' : 'Sent'}
                                </button>
                            ))}
                        </div>

                        {/* Selection toolbar */}
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex-shrink-0">
                                <span className="text-xs text-indigo-700 font-medium flex-1">{selectedIds.size} selected</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleDeleteSelected}
                                    disabled={deletingIds}
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700 h-7 px-2 text-xs"
                                >
                                    {deletingIds ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                                    Delete
                                </Button>
                                <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {isListLoading ? (
                            <div className="flex items-center justify-center flex-1">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            </div>
                        ) : isListError ? (
                            <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6 text-center">
                                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                                    <Mail className="h-7 w-7 text-amber-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-700 text-sm">Gmail reconnection required</p>
                                    <p className="text-xs text-slate-400 mt-1">Your Gmail token has expired. Reconnect to load emails.</p>
                                </div>
                                <Button onClick={handleConnect} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4">
                                    Reconnect Gmail
                                </Button>
                            </div>
                        ) : !emails.length ? (
                            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-slate-400">
                                <Mail className="h-12 w-12" />
                                <p className="text-sm">No emails in {activeTab}</p>
                            </div>
                        ) : (
                            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                                {emails.map((email) => {
                                    const isChecked = selectedIds.has(email.id);
                                    const isActive = email.thread_id === selectedThreadId;
                                    return (
                                        <div
                                            key={email.id}
                                            className={`relative flex items-start gap-2 px-3 py-3 group cursor-pointer transition-colors
                                                ${isActive ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-slate-50'}
                                                ${isChecked ? 'bg-blue-50' : ''}
                                            `}
                                            onClick={() => handleSelectEmail(email)}
                                        >
                                            {/* Checkbox */}
                                            <div
                                                className="flex-shrink-0 mt-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                                                style={{ opacity: isChecked ? 1 : undefined }}
                                                onClick={(e) => toggleSelectId(email.id, e)}
                                            >
                                                {isChecked
                                                    ? <CheckSquare className="h-4 w-4 text-indigo-600" />
                                                    : <Square className="h-4 w-4 text-slate-400" />
                                                }
                                            </div>

                                            {/* Unread dot */}
                                            {email.unread && !isChecked && (
                                                <span className="mt-[7px] w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                                            )}

                                            <div className={`flex-1 min-w-0 ${!email.unread && !isChecked ? 'pl-0' : ''}`}>
                                                <p className={`text-sm truncate ${email.unread ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                                                    {activeTab === 'sent'
                                                        ? (email.to_ ? `To: ${email.to_}` : email.from_)
                                                        : email.from_}
                                                </p>
                                                <p className={`text-sm truncate ${email.unread ? 'font-medium text-slate-700' : 'text-slate-400'}`}>
                                                    {email.subject}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate mt-0.5">{email.snippet}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {nextToken && (
                                    <div className="p-3 flex justify-center border-t border-slate-100">
                                        <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loadingMore} className="text-indigo-600 hover:bg-indigo-50 text-xs">
                                            {loadingMore ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : null}
                                            {loadingMore ? 'Loading...' : 'Load more emails'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Thread detail */}
                    <div className={`${selectedThreadId ? 'flex' : 'hidden lg:flex'} flex-col flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-w-0`}>
                        {!selectedThreadId ? (
                            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-slate-400">
                                <Mail className="h-12 w-12" />
                                <p className="text-sm">Select an email to read</p>
                            </div>
                        ) : threadLoading ? (
                            <div className="flex items-center justify-center flex-1">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            </div>
                        ) : thread ? (
                            <div className="flex flex-col h-full">
                                <div className="flex items-center gap-3 p-4 border-b border-slate-100 flex-shrink-0">
                                    <button onClick={() => setSelectedThreadId(null)} className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                        <ChevronLeft className="h-5 w-5 text-slate-600" />
                                    </button>
                                    <h2 className="font-semibold text-slate-800 flex-1 truncate">
                                        {thread.messages[0]?.subject ?? '(no subject)'}
                                    </h2>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                                    {thread.messages.map((msg) => (
                                        <div key={msg.id} className="rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="flex items-start justify-between p-3 bg-slate-50 border-b border-slate-200">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-slate-800 text-sm truncate">{msg.from_}</p>
                                                    {msg.to && <p className="text-xs text-slate-500 truncate">To: {msg.to}</p>}
                                                    <p className="text-xs text-slate-400 mt-0.5">{msg.date}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleReply(msg)}
                                                    className="ml-2 flex-shrink-0 text-indigo-600 hover:bg-indigo-50"
                                                >
                                                    <Reply className="h-4 w-4 mr-1" />Reply
                                                </Button>
                                            </div>
                                            <div className="overflow-hidden">
                                                {msg.body_html
                                                    ? <EmailBodyFrame html={msg.body_html} />
                                                    : <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{msg.body || <span className="text-slate-400 italic">No content</span>}</div>
                                                }
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {showCompose && (
                <ComposeDialog
                    defaultTo={replyTarget?.from_ ?? ''}
                    defaultSubject={replyTarget ? (replyTarget.subject.startsWith('Re:') ? replyTarget.subject : `Re: ${replyTarget.subject}`) : ''}
                    threadId={replyTarget ? selectedThreadId ?? undefined : undefined}
                    aliases={status?.aliases}
                    onClose={() => { setShowCompose(false); setReplyTarget(null); }}
                    onSent={handleSent}
                />
            )}
        </>
    );
}
