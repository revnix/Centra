import { apiClient } from './client';
import type {
    Job,
    JobIntent,
    AIJobDraft,
    PaginatedResponse,
    ApiResponse,
} from '@/lib/types';

/**
 * Job API endpoints
 */

export const jobsApi = {
    /**
     * Get all jobs with optional filtering
     */
    getAll: async (params?: {
        status?: string;
        department?: string;
        page?: number;
        pageSize?: number;
    }): Promise<PaginatedResponse<Job>> => {
        return apiClient.get<PaginatedResponse<Job>>('/jobs', { params });
    },

    /**
     * Get single job by ID
     */
    getById: async (id: string): Promise<Job> => {
        return apiClient.get<Job>(`/jobs/${id}`);
    },

    /**
     * Create new job from intent
     */
    create: async (intent: JobIntent): Promise<ApiResponse<Job>> => {
        return apiClient.post<ApiResponse<Job>>('/jobs', intent);
    },

    /**
     * Trigger AI generation for job description
     */
    generateDescription: async (jobId: string): Promise<ApiResponse<AIJobDraft>> => {
        return apiClient.post<ApiResponse<AIJobDraft>>(`/jobs/${jobId}/generate`);
    },

    /**
     * Approve AI-generated job description
     */
    approveDraft: async (
        jobId: string,
        editedDescription?: string
    ): Promise<ApiResponse<Job>> => {
        return apiClient.post<ApiResponse<Job>>(`/jobs/${jobId}/approve`, {
            editedDescription,
        });
    },

    /**
     * Publish job to portal
     */
    publish: async (jobId: string): Promise<ApiResponse<Job>> => {
        return apiClient.post<ApiResponse<Job>>(`/jobs/${jobId}/publish`);
    },

    /**
     * Update job details
     */
    update: async (jobId: string, updates: Partial<Job>): Promise<ApiResponse<Job>> => {
        return apiClient.put<ApiResponse<Job>>(`/jobs/${jobId}`, updates);
    },

    /**
     * Delete job
     */
    delete: async (jobId: string): Promise<ApiResponse<void>> => {
        return apiClient.delete<ApiResponse<void>>(`/jobs/${jobId}`);
    },

    /**
     * Close job posting
     */
    close: async (jobId: string): Promise<ApiResponse<Job>> => {
        return apiClient.post<ApiResponse<Job>>(`/jobs/${jobId}/close`);
    },
};
