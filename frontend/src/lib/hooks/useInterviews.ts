import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interviewsApi } from '@/lib/api';
import type { InterviewOverride } from '@/lib/types';

/**
 * Query keys for interviews
 */
export const interviewKeys = {
    all: ['interviews'] as const,
    details: () => [...interviewKeys.all, 'detail'] as const,
    detail: (id: string) => [...interviewKeys.details(), id] as const,
    transcript: (id: string) => [...interviewKeys.detail(id), 'transcript'] as const,
};

/**
 * Fetch interview details
 */
export function useInterview(id: string) {
    return useQuery({
        queryKey: interviewKeys.detail(id),
        queryFn: () => interviewsApi.getById(id),
        enabled: !!id,
        staleTime: 60000,
    });
}

/**
 * Fetch interview transcript
 */
export function useInterviewTranscript(interviewId: string) {
    return useQuery({
        queryKey: interviewKeys.transcript(interviewId),
        queryFn: () => interviewsApi.getTranscript(interviewId),
        enabled: !!interviewId,
        staleTime: 300000, // Transcripts are immutable once complete
    });
}

/**
 * Submit reviewer override
 */
export function useInterviewOverride() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            interviewId,
            override,
        }: {
            interviewId: string;
            override: Omit<InterviewOverride, 'interviewId' | 'reviewedBy' | 'reviewedAt'>;
        }) => interviewsApi.submitOverride(interviewId, override),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: interviewKeys.detail(variables.interviewId) });
        },
    });
}

/**
 * Get next question (candidate)
 */
export function useNextQuestion(interviewId: string) {
    return useQuery({
        queryKey: [...interviewKeys.detail(interviewId), 'next'],
        queryFn: () => interviewsApi.getNextQuestion(interviewId),
        enabled: !!interviewId,
        refetchInterval: false, // Manual refetch after answer submission
    });
}

/**
 * Submit answer (candidate)
 */
export function useSubmitAnswer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ interviewId, answer }: { interviewId: string; answer: string }) =>
            interviewsApi.submitAnswer(interviewId, answer),
        onSuccess: (data, variables) => {
            // Refetch next question
            queryClient.invalidateQueries({
                queryKey: [...interviewKeys.detail(variables.interviewId), 'next'],
            });
        },
    });
}

/**
 * Complete interview (candidate)
 */
export function useCompleteInterview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (interviewId: string) => interviewsApi.completeInterview(interviewId),
        onSuccess: (data, interviewId) => {
            queryClient.invalidateQueries({ queryKey: interviewKeys.detail(interviewId) });
        },
    });
}
