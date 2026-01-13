import { apiClient } from './client';
import type {
    Candidate,
    ParsedResume,
    MatchExplanation,
    AIRecommendation,
    HumanDecision,
    PaginatedResponse,
    ApiResponse,
    CandidateStage,
} from '@/lib/types';

/**
 * Candidate API endpoints
 */

export const candidatesApi = {
    /**
     * Get candidates for a specific job
     */
    getByJob: async (
        jobId: string,
        params?: {
            stage?: CandidateStage;
            needsReview?: boolean;
            page?: number;
            pageSize?: number;
        }
    ): Promise<PaginatedResponse<Candidate>> => {
        return apiClient.get<PaginatedResponse<Candidate>>(`/jobs/${jobId}/candidates`, {
            params,
        });
    },

    /**
     * Get candidate details
     */
    getById: async (id: string): Promise<Candidate> => {
        return apiClient.get<Candidate>(`/candidates/${id}`);
    },

    /**
     * Get parsed resume data
     */
    getResume: async (candidateId: string): Promise<ParsedResume> => {
        return apiClient.get<ParsedResume>(`/candidates/${candidateId}/resume`);
    },

    /**
     * Get match explanation (AI reasoning)
     */
    getMatchExplanation: async (candidateId: string): Promise<MatchExplanation> => {
        return apiClient.get<MatchExplanation>(
            `/candidates/${candidateId}/match_explanation`
        );
    },

    /**
     * Get AI recommendation
     */
    getRecommendation: async (candidateId: string): Promise<AIRecommendation> => {
        return apiClient.get<AIRecommendation>(
            `/candidates/${candidateId}/recommendation`
        );
    },

    /**
     * Update candidate stage
     */
    updateStage: async (
        candidateId: string,
        stage: CandidateStage
    ): Promise<ApiResponse<Candidate>> => {
        return apiClient.put<ApiResponse<Candidate>>(`/candidates/${candidateId}/stage`, {
            stage,
        });
    },

    /**
     * Submit human decision (approve/reject)
     */
    submitDecision: async (
        candidateId: string,
        decision: HumanDecision
    ): Promise<ApiResponse<Candidate>> => {
        return apiClient.post<ApiResponse<Candidate>>(
            `/candidates/${candidateId}/decision`,
            decision
        );
    },

    /**
     * Request more information about candidate
     */
    requestMoreInfo: async (
        candidateId: string,
        reason: string
    ): Promise<ApiResponse<void>> => {
        return apiClient.post<ApiResponse<void>>(
            `/candidates/${candidateId}/request_info`,
            { reason }
        );
    },
};
