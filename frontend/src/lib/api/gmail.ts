import { apiClient } from './client';

export interface GmailStatus {
    connected: boolean;
    email?: string;
}

export interface EmailSummary {
    id: string;
    thread_id: string;
    subject: string;
    from_: string;
    snippet: string;
    date: string;
    unread: boolean;
}

export interface EmailMessage {
    id: string;
    thread_id: string;
    subject: string;
    from_: string;
    to: string;
    body: string;
    date: string;
}

export interface EmailThread {
    thread_id: string;
    messages: EmailMessage[];
}

export interface InboxPage {
    emails: EmailSummary[];
    next_page_token: string | null;
}

export interface SendEmailPayload {
    to: string;
    subject: string;
    body: string;
    thread_id?: string;
    cc?: string;
    bcc?: string;
}

export const gmailApi = {
    getStatus: () =>
        apiClient.get<GmailStatus>('/gmail/status'),

    getAuthUrl: () =>
        apiClient.get<{ authorization_url: string }>('/gmail/auth'),

    getInbox: (pageToken?: string) =>
        apiClient.get<InboxPage>(
            pageToken ? `/gmail/inbox?page_token=${encodeURIComponent(pageToken)}` : '/gmail/inbox'
        ),

    getThread: (threadId: string) =>
        apiClient.get<EmailThread>(`/gmail/thread/${threadId}`),

    sendEmail: (payload: SendEmailPayload & { attachments?: File[] }) => {
        const form = new FormData();
        form.append('to', payload.to);
        form.append('subject', payload.subject);
        form.append('body', payload.body);
        if (payload.thread_id) form.append('thread_id', payload.thread_id);
        if (payload.cc) form.append('cc', payload.cc);
        if (payload.bcc) form.append('bcc', payload.bcc);
        (payload.attachments ?? []).forEach(f => form.append('files', f));
        return apiClient.post<{ message_id: string; thread_id: string }>('/gmail/send', form);
    },

    syncReplies: () =>
        apiClient.post<{ updated: number; message: string }>('/gmail/sync-replies', {}),
};
