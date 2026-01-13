import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidatesApi } from '@/lib/api';
import type { CandidateStage, HumanDecision } from '@/lib/types';

/**
 * Query keys for candidates
 */
export const candidateKeys = {
    all: ['candidates'] as const,
    lists: () => [...candidateKeys.all, 'list'] as const,
    list: (jobId: string, filters: Record<string, any>) =>
        [...candidateKeys.lists(), jobId, filters] as const,
    details: () => [...candidateKeys.all, 'detail'] as const,
    detail: (id: string) => [...candidateKeys.details(), id] as const,
    resume: (id: string) => [...candidateKeys.detail(id), 'resume'] as const,
    match: (id: string) => [...candidateKeys.detail(id), 'match'] as const,
    recommendation: (id: string) => [...candidateKeys.detail(id), 'recommendation'] as const,
};

/**
 * Fetch candidates for a specific job
 */
export function useCandidates(
    jobId: string,
    params?: {
        stage?: CandidateStage;
        needsReview?: boolean;
        page?: number;
        pageSize?: number;
    }
) {
    return useQuery({
        queryKey: candidateKeys.list(jobId, params || {}),
        queryFn: () => candidatesApi.getByJob(jobId, params),
        enabled: !!jobId,
        staleTime: 30000,
    });
}

/**
 * Fetch single candidate details
 */
export function useCandidate(id: string) {
    return useQuery({
        queryKey: candidateKeys.detail(id),
        queryFn: () => candidatesApi.getById(id),
        enabled: !!id,
        staleTime: 60000,
    });
}

/**
 * Fetch candidate's parsed resume
 */
export function useCandidateResume(candidateId: string) {
    return useQuery({
        queryKey: candidateKeys.resume(candidateId),
        queryFn: () => candidatesApi.getResume(candidateId),
        enabled: !!candidateId,
        staleTime: 300000, // 5 minutes - resumes don't change
    });
}

/**
 * Fetch AI match explanation
 */
export function useMatchExplanation(candidateId: string) {
    return useQuery({
        queryKey: candidateKeys.match(candidateId),
        queryFn: () => candidatesApi.getMatchExplanation(candidateId),
        enabled: !!candidateId,
        staleTime: 300000,
    });
}

/**
 * Fetch AI recommendation
 */
export function useAIRecommendation(candidateId: string) {
    return useQuery({
        queryKey: candidateKeys.recommendation(candidateId),
        queryFn: () => candidatesApi.getRecommendation(candidateId),
        enabled: !!candidateId,
        staleTime: 300000,
    });
}

/**
 * Update candidate stage
 */
export function useUpdateCandidateStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            candidateId,
            stage,
        }: {
            candidateId: string;
            stage: CandidateStage;
        }) => candidatesApi.updateStage(candidateId, stage),
        onSuccess: (data, variables) => {
            // Invalidate candidate detail and lists
            queryClient.invalidateQueries({ queryKey: candidateKeys.detail(variables.candidateId) });
            queryClient.invalidateQueries({ queryKey: candidateKeys.lists() });
        },
    });
}

/**
 * Submit human decision
 */
export function useSubmitDecision() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            candidateId,
            decision,
        }: {
            candidateId: string;
            decision: HumanDecision;
        }) => candidatesApi.submitDecision(candidateId, decision),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: candidateKeys.detail(variables.candidateId) });
            queryClient.invalidateQueries({ queryKey: candidateKeys.lists() });
        },
    });
}

/**
 * Request more information
 */
export function useRequestMoreInfo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ candidateId, reason }: { candidateId: string; reason: string }) =>
            candidatesApi.requestMoreInfo(candidateId, reason),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: candidateKeys.detail(variables.candidateId) });
        },
    });
}
