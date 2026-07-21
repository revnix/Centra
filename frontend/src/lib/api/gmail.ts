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
    to_?: string;
    snippet: string;
    date: string;
    unread: boolean;
}

export interface EmailAttachment {
    filename: string;
    attachment_id: string;
    mime_type: string;
    size: number;
}

export interface EmailMessage {
    id: string;
    thread_id: string;
    subject: string;
    from_: string;
    to: string;
    body: string;
    body_html?: string;
    date: string;
    attachments?: EmailAttachment[];
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

    getSent: (pageToken?: string) =>
        apiClient.get<InboxPage>(
            pageToken ? `/gmail/sent?page_token=${encodeURIComponent(pageToken)}` : '/gmail/sent'
        ),

    getThread: (threadId: string) =>
        apiClient.get<EmailThread>(`/gmail/thread/${threadId}`),

    downloadAttachment: async (messageId: string, attachmentId: string, filename: string): Promise<void> => {
        const blob = await apiClient.get<Blob>(
            `/gmail/attachment/${messageId}/${attachmentId}`,
            { params: { filename }, responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

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

    markRead: (messageIds: string[]) =>
        apiClient.post<{ marked: number }>('/gmail/mark-read', { message_ids: messageIds }),

    markAllRead: () =>
        apiClient.post<{ marked: number }>('/gmail/mark-all-read', {}),

    trashMessages: (messageIds: string[]) =>
        apiClient.post<{ trashed: number }>('/gmail/trash', { message_ids: messageIds }),

    syncReplies: () =>
        apiClient.post<{ updated: number; message: string }>('/gmail/sync-replies', {}),

    syncApplications: (days = 30) =>
        apiClient.post<{
            created: number;
            skipped: number;
            total_emails: number;
            message: string;
            details: Array<{
                email: string;
                name?: string;
                status: 'created' | 'skipped';
                job?: string;
                application_id?: number;
                reason?: string;
            }>;
        }>(`/gmail/sync-applications?days=${days}`, {}),

    importSingleApplication: (messageId: string, jobId?: number) => {
        const params = new URLSearchParams({ message_id: messageId });
        if (jobId !== undefined) params.set('job_id', String(jobId));
        return apiClient.post<{
            success: boolean;
            application_id: number;
            candidate_name: string;
            candidate_email: string;
            job_title: string;
            job_id: number;
            resume_uploaded: boolean;
            message: string;
        }>(`/gmail/import-single-application?${params.toString()}`, {});
    },
};
