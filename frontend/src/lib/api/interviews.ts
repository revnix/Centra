import { apiClient } from './client';
import type {
    Interview,
    QuestionAnswer,
    InterviewOverride,
    ApiResponse,
} from '@/lib/types';

/**
 * Interview API endpoints
 */

export const interviewsApi = {
    /**
     * Get interview details
     */
    getById: async (id: string): Promise<Interview> => {
        return apiClient.get<Interview>(`/interviews/${id}`);
    },

    /**
     * Get interview transcript (Q&A)
     */
    getTranscript: async (interviewId: string): Promise<QuestionAnswer[]> => {
        return apiClient.get<QuestionAnswer[]>(`/interviews/${interviewId}/transcript`);
    },

    /**
     * Submit reviewer override/feedback
     */
    submitOverride: async (
        interviewId: string,
        override: Omit<InterviewOverride, 'interviewId' | 'reviewedBy' | 'reviewedAt'>
    ): Promise<ApiResponse<Interview>> => {
        return apiClient.post<ApiResponse<Interview>>(
            `/interviews/${interviewId}/override`,
            override
        );
    },

    // ========== Candidate-facing endpoints ==========

    /**
     * Get next question for candidate
     */
    getNextQuestion: async (interviewId: string): Promise<{ question: string }> => {
        return apiClient.get<{ question: string }>(
            `/interviews/${interviewId}/next_question`
        );
    },

    /**
     * Submit answer from candidate
     */
    submitAnswer: async (
        interviewId: string,
        answer: string
    ): Promise<ApiResponse<void>> => {
        return apiClient.post<ApiResponse<void>>(`/interviews/${interviewId}/answer`, {
            answer,
        });
    },

    /**
     * Complete interview (candidate)
     */
    completeInterview: async (interviewId: string): Promise<ApiResponse<Interview>> => {
        return apiClient.post<ApiResponse<Interview>>(
            `/interviews/${interviewId}/complete`
        );
    },
};
