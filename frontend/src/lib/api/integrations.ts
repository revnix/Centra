import { apiClient } from './client';
import type { IntegrationResponse } from '@/lib/types';

export interface LinkedInAuthURLResponse {
    authorization_url: string;
}

export interface LinkedInStatusResponse {
    connected: boolean;
    platform_user_id?: string;
    created_at?: string;
    expires_at?: string;
}

/**
 * Integrations API endpoints
 */
export const integrationsApi = {
    /**
     * Get list of all integrations for current user
     */
    list: async (): Promise<IntegrationResponse[]> => {
        return apiClient.get<IntegrationResponse[]>('/integrations/');
    },

    /**
     * LinkedIn specific endpoints
     */
    linkedin: {
        /**
         * Get LinkedIn authorization URL
         */
        getLoginUrl: async (): Promise<LinkedInAuthURLResponse> => {
            return apiClient.get<LinkedInAuthURLResponse>('/admin/integrations/linkedin/login');
        },

        /**
         * Handle OAuth callback
         */
        callback: async (code: string, state: string): Promise<IntegrationResponse> => {
            return apiClient.post<IntegrationResponse>('/admin/integrations/linkedin/callback', {
                code,
                state
            });
        },

        /**
         * Get LinkedIn connection status
         */
        getStatus: async (): Promise<LinkedInStatusResponse> => {
            return apiClient.get<LinkedInStatusResponse>('/admin/integrations/linkedin/status');
        },

        /**
         * Disconnect LinkedIn
         */
        disconnect: async (): Promise<{ message: string }> => {
            return apiClient.delete<{ message: string }>('/admin/integrations/linkedin/disconnect');
        },

        /**
         * Publish to LinkedIn
         */
        publish: async (text: string): Promise<any> => {
            return apiClient.post<any>('/admin/integrations/linkedin/publish', { text });
        }
    }
};
