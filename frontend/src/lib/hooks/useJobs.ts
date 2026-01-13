import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api';
import type { Job, JobIntent, JobStatus } from '@/lib/types';

/**
 * Query keys for jobs
 */
export const jobKeys = {
    all: ['jobs'] as const,
    lists: () => [...jobKeys.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...jobKeys.lists(), filters] as const,
    details: () => [...jobKeys.all, 'detail'] as const,
    detail: (id: string) => [...jobKeys.details(), id] as const,
};

/**
 * Fetch all jobs with optional filtering
 */
export function useJobs(params?: {
    status?: JobStatus;
    department?: string;
    page?: number;
    pageSize?: number;
}) {
    return useQuery({
        queryKey: jobKeys.list(params || {}),
        queryFn: () => jobsApi.getAll(params),
        staleTime: 30000, // 30 seconds
    });
}

/**
 * Fetch single job by ID
 */
export function useJob(id: string) {
    return useQuery({
        queryKey: jobKeys.detail(id),
        queryFn: () => jobsApi.getById(id),
        enabled: !!id,
        staleTime: 60000, // 1 minute
    });
}

/**
 * Create new job
 */
export function useCreateJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (intent: JobIntent) => jobsApi.create(intent),
        onSuccess: () => {
            // Invalidate jobs list to refetch
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
        },
    });
}

/**
 * Generate AI job description
 */
export function useGenerateJobDescription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (jobId: string) => jobsApi.generateDescription(jobId),
        onSuccess: (data, jobId) => {
            // Update the specific job in cache
            queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
        },
    });
}

/**
 * Approve AI-generated job description
 */
export function useApproveJobDraft() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            jobId,
            editedDescription,
        }: {
            jobId: string;
            editedDescription?: string;
        }) => jobsApi.approveDraft(jobId, editedDescription),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: jobKeys.detail(variables.jobId) });
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
        },
    });
}

/**
 * Publish job to portal
 */
export function usePublishJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (jobId: string) => jobsApi.publish(jobId),
        onSuccess: (data, jobId) => {
            queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
        },
    });
}

/**
 * Update job details
 */
export function useUpdateJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ jobId, updates }: { jobId: string; updates: Partial<Job> }) =>
            jobsApi.update(jobId, updates),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: jobKeys.detail(variables.jobId) });
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
        },
    });
}

/**
 * Delete job
 */
export function useDeleteJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (jobId: string) => jobsApi.delete(jobId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
        },
    });
}

/**
 * Close job posting
 */
export function useCloseJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (jobId: string) => jobsApi.close(jobId),
        onSuccess: (data, jobId) => {
            queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
        },
    });
}
