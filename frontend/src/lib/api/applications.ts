import { apiClient } from './client';

/**
 * Applications API endpoints (Guest/Candidate facing)
 */

export const applicationsApi = {
    /**
     * Submit a guest application (for anonymous candidates)
     */
    guestApply: async (data: any): Promise<{
        message: string;
        redirect_url: string;
        interview_token: string;
    }> => {
        return apiClient.post<{
            message: string;
            redirect_url: string;
            interview_token: string;
        }>("/applications/guest", data);
    },

    /**
     * List all applications (Admin only)
     */
    list: async (): Promise<any[]> => {
        return apiClient.get<any[]>("/applications");
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
};
