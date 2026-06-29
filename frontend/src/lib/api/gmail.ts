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

    sendEmail: (payload: SendEmailPayload) =>
        apiClient.post<{ message_id: string; thread_id: string }>('/gmail/send', payload),
};
