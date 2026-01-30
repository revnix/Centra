import { apiClient } from './client';

/**
 * Applications API endpoints (Guest/Candidate facing)
 */

export const applicationsApi = {
    /**
     * Submit a guest application (for anonymous candidates)
     */
    guestApply: async (data: {
        job_id: number;
        email: string;
        full_name: string;
        resume_url?: string;
        linkedin_url?: string;
        skills?: string[];
        experience_years?: number;
    }): Promise<{
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
};
