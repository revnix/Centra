import { apiClient } from './client';
import type {
    CodingExercise,
    TestResults,
    AICodeFeedback,
    ApiResponse,
} from '@/lib/types';

/**
 * Coding Exercise API endpoints
 */

export const codingApi = {
    /**
     * Get coding exercise details
     */
    getById: async (id: string): Promise<CodingExercise> => {
        return apiClient.get<CodingExercise>(`/coding/${id}`);
    },

    /**
     * Get test results (reviewer view)
     */
    getResults: async (exerciseId: string): Promise<TestResults> => {
        return apiClient.get<TestResults>(`/coding/${exerciseId}/results`);
    },

    /**
     * Get AI code feedback (reviewer view)
     */
    getAIFeedback: async (exerciseId: string): Promise<AICodeFeedback> => {
        return apiClient.get<AICodeFeedback>(`/coding/${exerciseId}/ai_feedback`);
    },

    // ========== Candidate-facing endpoints ==========

    /**
     * Submit code (candidate)
     */
    submitCode: async (
        exerciseId: string,
        code: string
    ): Promise<ApiResponse<CodingExercise>> => {
        return apiClient.post<ApiResponse<CodingExercise>>(
            `/coding/${exerciseId}/submit`,
            { code }
        );
    },

    /**
     * Run tests locally (candidate)
     */
    runTests: async (
        exerciseId: string,
        code: string
    ): Promise<ApiResponse<TestResults>> => {
        return apiClient.post<ApiResponse<TestResults>>(
            `/coding/${exerciseId}/run_tests`,
            { code }
        );
    },

    /**
     * Auto-save code (candidate)
     */
    autoSave: async (exerciseId: string, code: string): Promise<ApiResponse<void>> => {
        return apiClient.post<ApiResponse<void>>(`/coding/${exerciseId}/autosave`, {
            code,
        });
    },
};
