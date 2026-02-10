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

/**
 * Helper to map backend job response to frontend Job type
 */
const mapJob = (job: any): Job => ({
    id: job.id.toString(),
    title: job.title,
    description: job.description,
    short_description: job.short_description,
    department: job.department,
    location: job.location,
    location_type: job.location_type,
    company_name: job.company_name,
    job_type: job.job_type,
    type: job.job_type, // Compatibility field
    experience_level: job.experience_level,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    salary_currency: job.salary_currency,
    salary_range: job.salary_range,
    required_skills: job.required_skills,
    preferred_skills: job.preferred_skills,
    benefits: job.benefits,
    application_url: job.application_url,
    status: job.status,
    // Backward compatibility fields
    requirements: job.required_skills || [],
    desiredSkills: job.preferred_skills || [],
    candidateCount: job.application_count || 0,
    application_count: job.application_count || 0,
    pendingActionCount: 0,
    createdBy: job.created_by?.toString() || '',
    created_by: job.created_by,
    createdAt: job.created_at,
    created_at: job.created_at,
    publishedAt: job.published_at,
    published_at: job.published_at,
    closedAt: job.expires_at,
    expires_at: job.expires_at,
});

export const jobsApi = {
    /**
     * Get all jobs with optional filtering (requires authentication)
     */
    getAll: async (params?: {
        status?: string;
        department?: string;
        skip?: number;
        limit?: number;
    }): Promise<Job[]> => {
        const jobs = await apiClient.get<any[]>('/jobs', { params });
        return jobs.map(mapJob);
    },

    /**
     * Get published jobs (public, no authentication required)
     */
    getPublic: async (params?: {
        skip?: number;
        limit?: number;
    }): Promise<Job[]> => {
        const jobs = await apiClient.get<any[]>('/jobs/public', { params });
        return jobs.map(mapJob);
    },

    /**
     * Get single job by ID
     */
    getById: async (id: string): Promise<Job> => {
        const job = await apiClient.get<any>(`/jobs/${id}`);
        return mapJob(job);
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
     * Improve job description using AI based on feedback
     */
    improve: async (jobId: string, feedback: string): Promise<Job> => {
        return apiClient.post<Job>(`/jobs/${jobId}/improve`, { feedback });
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

    /**
     * Send job details to Operation Manager
     */
    sendToManager: async (jobId: string): Promise<{ message: string }> => {
        return apiClient.post<{ message: string }>(`/jobs/${jobId}/send-to-manager`);
    },
};

