import { apiClient } from './client';

/**
 * Applications API endpoints (Guest/Candidate facing)
 */

export const applicationsApi = {
    /**
     * Submit a guest application (for anonymous candidates).
     *
     * Posted directly to the backend instead of through Next.js's /api/v1 rewrite —
     * the rewrite proxy (dev mode, Turbopack) does not reliably forward
     * multipart/form-data bodies containing a file (the resume upload), and fails
     * with a generic Next.js 500 before the request ever reaches FastAPI.
     */
    guestApply: async (data: FormData): Promise<{ message: string; status: string }> => {
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || "http://127.0.0.1:8123";
        const res = await fetch(`${backendBase}/api/v1/applications/guest`, {
            method: "POST",
            body: data,
        });

        if (!res.ok) {
            let message = "Failed to submit application. Please try again.";
            let details: any = undefined;
            try {
                const errJson = await res.json();
                if (Array.isArray(errJson.detail)) {
                    details = errJson.detail;
                } else if (typeof errJson.detail === "string") {
                    message = errJson.detail;
                }
            } catch {
                // response body wasn't JSON — keep the generic message
            }
            const err: any = new Error(message);
            err.details = details;
            err.status = res.status;
            throw err;
        }

        return res.json();
    },

    /**
     * List all applications (Admin only)
     */
    list: async (): Promise<any[]> => {
        return apiClient.get<any[]>("/applications");
    },

    /**
     * Get all applications for a specific job (ranked by AI score)
     */
    getByJob: async (jobId: string): Promise<any[]> => {
        return apiClient.get<any[]>(`/applications/by-job/${jobId}`);
    },

    /**
     * Get applications for the current candidate
     */
    getMyApplications: async (): Promise<any[]> => {
        return apiClient.get<any[]>("/applications/me");
    },

    /**
     * Get a specific application by ID
     */
    get: async (id: string): Promise<any> => {
        return apiClient.get<any>(`/applications/${id}`);
    },

    /**
     * Hire a candidate (Offer Letter)
     */
    hire: async (id: string): Promise<any> => {
        return apiClient.post<any>(`/applications/${id}/hire`, {});
    },

    /**
     * Reject an application
     */
    reject: async (id: string): Promise<any> => {
        return apiClient.post<any>(`/applications/${id}/reject`, {});
    },

    /**
     * Delete an application (Permanently)
     */
    delete: async (id: string): Promise<void> => {
        return apiClient.delete<void>(`/applications/${id}`);
    },

    /**
     * Shortlist a candidate (Send Interview Invite)
     */
    shortlist: async (id: string): Promise<any> => {
        return apiClient.post<any>(`/applications/${id}/shortlist`, {});
    },

    /**
     * Trigger AI Analysis manually
     */
    analyze: async (id: string): Promise<any> => {
        return apiClient.post<any>(`/applications/${id}/analyze`, {});
    },

    /**
     * HR manually sends a custom email to a candidate, with optional file attachments.
     */
    invite: async (id: string, data: string | FormData, message?: string, files?: File[]): Promise<any> => {
        if (data instanceof FormData) {
            return apiClient.post<any>(`/applications/${id}/invite`, data);
        }

        const body = new FormData();
        body.append('subject', data);
        body.append('message', message ?? '');
        (files ?? []).forEach(f => body.append('attachments', f));
        return apiClient.post<any>(`/applications/${id}/invite`, body);
    },

    /**
     * Send a free-form email to the candidate (To/CC/BCC + attachments) without
     * changing their pipeline stage — used by the Offer Extended / Offer Accepted
     * compose dialog on the Pipeline board.
     */
    sendEmail: async (id: string, data: FormData): Promise<any> => {
        return apiClient.post<any>(`/applications/${id}/send-email`, data);
    },

    /**
     * Update the status of an application (move between pipeline stages)
     */
    updateStatus: async (id: string, status: string): Promise<any> => {
        return apiClient.patch<any>(`/applications/${id}/status`, { status });
    },

    /**
     * Reset email tracking so HR can resend any email for this application.
     */
    resetEmailStatus: async (id: string): Promise<any> => {
        return apiClient.post<any>(`/applications/${id}/reset-email-status`, {});
    },
};
