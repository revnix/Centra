import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // ✨ NEW - OPTIMIZATION
import { applicationsApi } from '@/lib/api'; // ✨ NEW - OPTIMIZATION

/**
 * Query keys for applications
 * Mirrors the jobKeys / candidateKeys pattern in useJobs.ts and useCandidates.ts
 */ // ✨ NEW - OPTIMIZATION
export const applicationKeys = { // ✨ NEW - OPTIMIZATION
    all: ['applications'] as const,
    lists: () => [...applicationKeys.all, 'list'] as const,
    detail: (id: string) => [...applicationKeys.all, 'detail', id] as const,
    mine: () => [...applicationKeys.all, 'mine'] as const,
};

/**
 * Fetch ALL applications (Admin — used by Pipeline page)
 */ // ✨ NEW - OPTIMIZATION
export function useApplications() { // ✨ NEW - OPTIMIZATION
    return useQuery({
        queryKey: applicationKeys.lists(),
        queryFn: () => applicationsApi.list(),
        staleTime: 30_000, // 30 s — pipeline data changes frequently
    });
}

/**
 * Fetch the current candidate's own applications
 */ // ✨ NEW - OPTIMIZATION
export function useMyApplications() { // ✨ NEW - OPTIMIZATION
    return useQuery({
        queryKey: applicationKeys.mine(),
        queryFn: () => applicationsApi.getMyApplications(),
        staleTime: 60_000,
    });
}

/**
 * Fetch a single application by ID
 */ // ✨ NEW - OPTIMIZATION
export function useApplication(id: string) { // ✨ NEW - OPTIMIZATION
    return useQuery({
        queryKey: applicationKeys.detail(id),
        queryFn: () => applicationsApi.get(id),
        enabled: !!id,
        staleTime: 60_000,
    });
}

/**
 * Update an application's pipeline status (e.g. APPLIED → SHORTLISTED)
 * Automatically invalidates the applications list after success.
 */ // ✨ NEW - OPTIMIZATION
export function useUpdateApplicationStatus() { // ✨ NEW - OPTIMIZATION
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            applicationsApi.updateStatus(id, status),
        onSuccess: () => {
            // Invalidate the list so Pipeline page reflects the new stage instantly
            queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
        },
    });
}

/**
 * Hire a candidate (sends offer letter)
 */ // ✨ NEW - OPTIMIZATION
export function useHireApplication() { // ✨ NEW - OPTIMIZATION
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => applicationsApi.hire(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) });
        },
    });
}

/**
 * Reject an application
 */ // ✨ NEW - OPTIMIZATION
export function useRejectApplication() { // ✨ NEW - OPTIMIZATION
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => applicationsApi.reject(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) });
        },
    });
}

/**
 * Shortlist a candidate (triggers interview invite email)
 */ // ✨ NEW - OPTIMIZATION
export function useShortlistApplication() { // ✨ NEW - OPTIMIZATION
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => applicationsApi.shortlist(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
        },
    });
}

/**
 * Delete an application permanently
 */ // ✨ NEW - OPTIMIZATION
export function useDeleteApplication() { // ✨ NEW - OPTIMIZATION
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => applicationsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
        },
    });
}

/**
 * Trigger AI analysis on an application
 */ // ✨ NEW - OPTIMIZATION
export function useAnalyzeApplication() { // ✨ NEW - OPTIMIZATION
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => applicationsApi.analyze(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
        },
    });
}

/**
 * Send a custom invite email to a candidate
 */ // ✨ NEW - OPTIMIZATION
export function useInviteApplicant() { // ✨ NEW - OPTIMIZATION
    return useMutation({
        mutationFn: ({ id, subject, message }: { id: string; subject: string; message: string }) =>
            applicationsApi.invite(id, subject, message),
    });
}
