'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
    Mail, RefreshCw, Reply, X, Loader2, Send, ChevronLeft,
    Paperclip, ChevronDown, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { gmailApi, type EmailSummary, type EmailMessage } from '@/lib/api/gmail';

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
    onClose: () => void;
    onSent: () => void;
}

function ComposeDialog({ defaultTo = '', defaultSubject = '', threadId, onClose, onSent }: ComposeProps) {
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

// ── Main Inbox Page ───────────────────────────────────────────────────────────
export default function InboxPage() {
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [showCompose, setShowCompose] = useState(false);
    const [replyTarget, setReplyTarget] = useState<EmailMessage | null>(null);
    const [allEmails, setAllEmails] = useState<EmailSummary[]>([]);
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const queryClient = useQueryClient();

    const { data: status, isLoading: statusLoading } = useQuery({
        queryKey: ['gmail', 'status'],
        queryFn: gmailApi.getStatus,
    });

    const { data: inbox, isLoading: inboxLoading, refetch: refetchInbox } = useQuery({
        queryKey: ['gmail', 'inbox'],
        queryFn: () => gmailApi.getInbox(),
        enabled: status?.connected === true,
    });

    useEffect(() => {
        if (inbox) {
            setAllEmails(inbox.emails);
            setNextPageToken(inbox.next_page_token);
        }
    }, [inbox]);

    const handleLoadMore = async () => {
        if (!nextPageToken || loadingMore) return;
        setLoadingMore(true);
        try {
            const page = await gmailApi.getInbox(nextPageToken);
            setAllEmails(prev => [...prev, ...page.emails]);
            setNextPageToken(page.next_page_token);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleRefresh = () => {
        setAllEmails([]);
        setNextPageToken(null);
        refetchInbox();
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
        } catch {
            toast.error('Failed to get Gmail authorization URL.');
        }
    };

    const handleSelectEmail = (email: EmailSummary) => {
        setSelectedThreadId(email.thread_id);
        setReplyTarget(null);
        setShowCompose(false);
    };

    const handleReply = (msg: EmailMessage) => {
        setReplyTarget(msg);
        setShowCompose(true);
    };

    const handleSent = () => {
        queryClient.invalidateQueries({ queryKey: ['gmail', 'inbox'] });
    };

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

    return (
        <>
            <Suspense><OAuthToastHandler /></Suspense>

            <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
                {/* Header */}
                <div className="flex items-center justify-between flex-shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Inbox</h1>
                        {status.email && <p className="text-sm text-slate-500 mt-0.5">{status.email}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => { setReplyTarget(null); setShowCompose(true); }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-full px-5"
                        >
                            <Pencil className="h-4 w-4" />
                            Compose
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={inboxLoading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${inboxLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Two-pane layout */}
                <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
                    {/* Email list */}
                    <div className={`${selectedThreadId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 xl:w-96 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0`}>
                        {inboxLoading ? (
                            <div className="flex items-center justify-center flex-1">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            </div>
                        ) : !allEmails.length ? (
                            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-slate-400">
                                <Mail className="h-12 w-12" />
                                <p className="text-sm">No emails in inbox</p>
                            </div>
                        ) : (
                            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                                {allEmails.map((email) => (
                                    <button
                                        key={email.id}
                                        onClick={() => handleSelectEmail(email)}
                                        className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${email.thread_id === selectedThreadId ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {email.unread && <span className="mt-[7px] w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                                            <div className={`flex-1 min-w-0 ${!email.unread ? 'pl-4' : ''}`}>
                                                <p className={`text-sm truncate ${email.unread ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                                                    {email.from_}
                                                </p>
                                                <p className={`text-sm truncate ${email.unread ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
                                                    {email.subject}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate mt-0.5">{email.snippet}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {nextPageToken && (
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
                                {/* Thread header */}
                                <div className="flex items-center gap-3 p-4 border-b border-slate-100 flex-shrink-0">
                                    <button onClick={() => setSelectedThreadId(null)} className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                        <ChevronLeft className="h-5 w-5 text-slate-600" />
                                    </button>
                                    <h2 className="font-semibold text-slate-800 flex-1 truncate">
                                        {thread.messages[0]?.subject ?? '(no subject)'}
                                    </h2>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                                    {thread.messages.map((msg) => (
                                        <div key={msg.id} className="rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="flex items-start justify-between p-3 bg-slate-50 border-b border-slate-200">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-slate-800 text-sm truncate">{msg.from_}</p>
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
                                            {/* Email body — clean plain text */}
                                            <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                                                {msg.body || <span className="text-slate-400 italic">No content</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Compose / Reply floating window */}
            {showCompose && (
                <ComposeDialog
                    defaultTo={replyTarget?.from_ ?? ''}
                    defaultSubject={replyTarget ? (replyTarget.subject.startsWith('Re:') ? replyTarget.subject : `Re: ${replyTarget.subject}`) : ''}
                    threadId={replyTarget ? selectedThreadId ?? undefined : undefined}
                    onClose={() => { setShowCompose(false); setReplyTarget(null); }}
                    onSent={handleSent}
                />
            )}
        </>
    );
}
