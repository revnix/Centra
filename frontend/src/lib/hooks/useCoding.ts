import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { codingApi } from '@/lib/api';

/**
 * Query keys for coding exercises
 */
export const codingKeys = {
    all: ['coding'] as const,
    details: () => [...codingKeys.all, 'detail'] as const,
    detail: (id: string) => [...codingKeys.details(), id] as const,
    results: (id: string) => [...codingKeys.detail(id), 'results'] as const,
    feedback: (id: string) => [...codingKeys.detail(id), 'feedback'] as const,
};

/**
 * Fetch coding exercise details
 */
export function useCodingExercise(id: string) {
    return useQuery({
        queryKey: codingKeys.detail(id),
        queryFn: () => codingApi.getById(id),
        enabled: !!id,
        staleTime: 60000,
    });
}

/**
 * Fetch test results (reviewer)
 */
export function useTestResults(exerciseId: string) {
    return useQuery({
        queryKey: codingKeys.results(exerciseId),
        queryFn: () => codingApi.getResults(exerciseId),
        enabled: !!exerciseId,
        staleTime: 300000, // Results are immutable
    });
}

/**
 * Fetch AI code feedback (reviewer)
 */
export function useAICodeFeedback(exerciseId: string) {
    return useQuery({
        queryKey: codingKeys.feedback(exerciseId),
        queryFn: () => codingApi.getAIFeedback(exerciseId),
        enabled: !!exerciseId,
        staleTime: 300000,
    });
}

/**
 * Submit code (candidate)
 */
export function useSubmitCode() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ exerciseId, code }: { exerciseId: string; code: string }) =>
            codingApi.submitCode(exerciseId, code),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: codingKeys.detail(variables.exerciseId) });
        },
    });
}

/**
 * Run tests locally (candidate)
 */
export function useRunTests() {
    return useMutation({
        mutationFn: ({ exerciseId, code }: { exerciseId: string; code: string }) =>
            codingApi.runTests(exerciseId, code),
        // Don't invalidate cache - just return results
    });
}

/**
 * Auto-save code (candidate)
 */
export function useAutoSaveCode() {
    return useMutation({
        mutationFn: ({ exerciseId, code }: { exerciseId: string; code: string }) =>
            codingApi.autoSave(exerciseId, code),
        // Silent mutation - no cache updates
    });
}
