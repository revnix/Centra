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
     * Create interview session
     */
    create: async (applicationId: number): Promise<any> => {
        return apiClient.post<any>('/interviews/', { application_id: applicationId });
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

    /**
     * Get interview session details (candidate token)
     */
    getSession: async (token: string): Promise<any> => {
        return apiClient.get<any>(`/interviews/${token}`);
    },

    /**
     * Send message to AI interviewer
     */
    sendMessage: async (token: string, message: string): Promise<{ reply: string; transcript: any[]; status?: string }> => {
        return apiClient.post<{ reply: string; transcript: any[]; status?: string }>(`/interviews/${token}/chat`, {
            message
        });
    },

    /**
     * Start/Initialize interview
     */
    startInterview: async (token: string): Promise<{ reply: string; transcript: any[] }> => {
        return apiClient.post<{ reply: string; transcript: any[] }>(`/interviews/${token}/start`);
    },

    /**
     * Get coding challenge question
     */
    getCodingQuestion: async (token: string): Promise<{ question: string }> => {
        return apiClient.post<{ question: string }>(`/interviews/${token}/coding-question`);
    },

    /**
     * Submit coding challenge
     */
    submitCoding: async (token: string, code: string, language: string = "python"): Promise<{ message: string }> => {
        return apiClient.post<{ message: string }>(`/interviews/${token}/submit-coding`, { code, language });
    },
};
