import { apiClient } from './client';
import type {
    Job,
    JobStatus,
    JobIntent,
    AIJobDraft,
    PaginatedResponse,
    ApiResponse,
} from '@/lib/types';

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
    type: job.job_type,
    experience_level: job.experience_level,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    salary_currency: job.salary_currency,
    salary_period: job.salary_period,
    salary_range: job.salary_range,
    required_skills: job.required_skills || [],
    preferred_skills: job.preferred_skills || [],
    requirements: job.requirements || [],
    preferred_qualifications: job.preferred_qualifications || [],
    benefits: job.benefits || [],
    application_url: job.application_url,
    status: job.status,
    effective_status: job.effective_status,
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
    manager_feedback: job.manager_feedback,
});

export const jobsApi = {
    getAll: async (params?: {
        status?: string;
        department?: string;
        skip?: number;
        limit?: number;
    }): Promise<Job[]> => {
        const jobs = await apiClient.get<any[]>('/jobs', { params });
        return jobs.map(mapJob);
    },

    getPublic: async (params?: { skip?: number; limit?: number }): Promise<Job[]> => {
        const jobs = await apiClient.get<any[]>('/jobs/public', { params });
        return jobs.map(mapJob);
    },

    getById: async (id: string): Promise<Job> => {
        const job = await apiClient.get<any>(`/jobs/${id}`);
        return mapJob(job);
    },

    create: async (intent: JobIntent): Promise<ApiResponse<Job>> => {
        return apiClient.post<ApiResponse<Job>>('/jobs', intent);
    },

    generateDraft: async (data: {
        title?: string;
        department?: string;
        location?: string;
        experience_level?: string;
        job_type?: string;
        prompt?: string;
    }): Promise<any> => {
        return apiClient.post<any>('/jobs/generate-draft', data);
    },

    generateDescription: async (jobId: string): Promise<ApiResponse<AIJobDraft>> => {
        return apiClient.post<ApiResponse<AIJobDraft>>(`/jobs/${jobId}/generate`);
    },

    approveDraft: async (jobId: string, editedDescription?: string): Promise<ApiResponse<Job>> => {
        return apiClient.post<ApiResponse<Job>>(`/jobs/${jobId}/approve`, { editedDescription });
    },

    publish: async (jobId: string): Promise<ApiResponse<Job>> => {
        return apiClient.post<ApiResponse<Job>>(`/jobs/${jobId}/publish`);
    },

    improve: async (jobId: string, feedback: string): Promise<Job> => {
        return apiClient.post<Job>(`/jobs/${jobId}/improve`, { feedback });
    },

    update: async (jobId: string, updates: Partial<Job>): Promise<ApiResponse<Job>> => {
        return apiClient.put<ApiResponse<Job>>(`/jobs/${jobId}`, updates);
    },

    delete: async (jobId: string): Promise<ApiResponse<void>> => {
        return apiClient.delete<ApiResponse<void>>(`/jobs/${jobId}`);
    },

    close: async (jobId: string): Promise<ApiResponse<Job>> => {
        return apiClient.post<ApiResponse<Job>>(`/jobs/${jobId}/close`);
    },

    sendToManager: async (jobId: string): Promise<{ message: string }> => {
        return apiClient.post<{ message: string }>(`/jobs/${jobId}/send-to-manager`);
    },

    getTeamMembers: async (): Promise<{ label: string; email: string }[]> => {
        return apiClient.get<{ label: string; email: string }[]>('/jobs/team-members');
    },

    sendToTeam: async (
        jobId: string,
        emails: string[],
    ): Promise<{ message: string; sent: number; failed: number }> => {
        return apiClient.post<{ message: string; sent: number; failed: number }>(
            `/jobs/${jobId}/send-to-team`,
            { emails },
        );
    },

    review: async (jobId: string, data: { status: JobStatus; feedback?: string }): Promise<ApiResponse<Job>> => {
        return apiClient.post<ApiResponse<Job>>(`/jobs/${jobId}/review`, data);
    },

    getStats: async (): Promise<{ total_jobs: number; pending_actions: number }> => {
        return apiClient.get<{ total_jobs: number; pending_actions: number }>('/jobs/stats/dashboard');
    },

    extendDeadline: async (jobId: string, expiresAt: string): Promise<Job> => {
        const response = await apiClient.patch<any>(`/jobs/${jobId}/extend-deadline`, { expires_at: expiresAt });
        return mapJob(response);
    },
};
