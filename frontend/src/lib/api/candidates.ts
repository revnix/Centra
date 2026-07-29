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
 * Shape returned by the resume-pooling endpoint for each matched candidate
 */
export interface PooledCandidate {
    user_id: number;
    full_name: string;
    email: string;
    phone_number?: string;
    city?: string;
    qualification?: string;
    skills: string[];
    experience_years?: number;
    bio?: string;
    resume_url?: string;
    match_score?: number;
}

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

    /**
     * Resume Pooling — AI-powered candidate rediscovery from the database
     * POST /candidates/resume-pooling
     */
    resumePooling: async (params: {
        job_title?: string;
        skills?: string[];
        description?: string;
        education?: string;
        experience_years?: number;
        area_of_living?: string;
        applied_within_days?: number;
        min_score?: number;
        limit?: number;
    }): Promise<{
        total_found: number;
        returned_count: number;
        query_summary: string;
        candidates: PooledCandidate[];
    }> => {
        return apiClient.post('/candidates/resume-pooling', params);
    },

    /**
     * Shortlist a candidate from the Resume Pool for a specific job.
     * POST /applications/pool-shortlist
     */
    poolShortlist: async (candidateUserId: number, jobId: number): Promise<{
        success: boolean;
        application_id: number;
        status: string;
        message: string;
    }> => {
        return apiClient.post('/applications/pool-shortlist', {
            candidate_user_id: candidateUserId,
            job_id: jobId,
        });
    },
};
