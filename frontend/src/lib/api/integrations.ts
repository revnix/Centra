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

export interface WhatsAppStatusResponse {
    connected: boolean;
    phone_number_id?: string;
    waba_id?: string;
}

export interface WhatsAppConnectRequest {
    phone_number_id: string;
    waba_id: string;
    access_token: string;
    verify_token: string;
}

/**
 * Integrations API endpoints
 */
export const integrationsApi = {
    /**
     * Get list of all integrations for current user
     */
    list: async (): Promise<IntegrationResponse[]> => {
        return apiClient.get<IntegrationResponse[]>('/integrations');
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
         * Publish to LinkedIn with optional article link
         */
        publish: async (text: string, article_url?: string): Promise<any> => {
            return apiClient.post<any>('/admin/integrations/linkedin/publish', {
                text,
                article_url
            });
        }
    },

    /**
     * Indeed specific endpoints
     */
    indeed: {
        /**
         * Get Indeed authorization URL
         */
        getLoginUrl: async (): Promise<LinkedInAuthURLResponse> => {
            return apiClient.get<LinkedInAuthURLResponse>('/admin/integrations/indeed/login');
        },

        /**
         * Handle OAuth callback
         */
        callback: async (code: string, state: string): Promise<IntegrationResponse> => {
            return apiClient.post<IntegrationResponse>('/admin/integrations/indeed/callback', {
                code,
                state
            });
        },

        /**
         * Get Indeed connection status
         */
        getStatus: async (): Promise<LinkedInStatusResponse> => {
            return apiClient.get<LinkedInStatusResponse>('/admin/integrations/indeed/status');
        },

        /**
         * Disconnect Indeed
         */
        disconnect: async (): Promise<{ message: string }> => {
            return apiClient.delete<{ message: string }>('/admin/integrations/indeed/disconnect');
        },

        /**
         * Get Indeed Access Token for client-side use
         */
        getToken: async (): Promise<{ access_token: string; employer_id: string }> => {
            return apiClient.get<{ access_token: string; employer_id: string }>('/admin/integrations/indeed/token');
        },

        /**
         * Post a job to Indeed
         */
        postJob: async (jobData: { title: string; description: string; location: string; company: string }): Promise<any> => {
            return apiClient.post<any>('/admin/integrations/indeed/post-job', jobData);
        }
    },

    /**
     * WhatsApp specific endpoints
     */
    whatsapp: {
        /**
         * Connect WhatsApp with credentials
         */
        connect: async (data: WhatsAppConnectRequest): Promise<{ message: string; connected: boolean; phone_number_id?: string; waba_id?: string }> => {
            return apiClient.post<{ message: string; connected: boolean; phone_number_id?: string; waba_id?: string }>('/admin/integrations/whatsapp/connect', data);
        },

        /**
         * Connect WhatsApp using Facebook OAuth Code
         */
        connectWithFacebook: async (code: string): Promise<{ message: string; connected: boolean; phone_number_id?: string; waba_id?: string }> => {
            return apiClient.post<{ message: string; connected: boolean; phone_number_id?: string; waba_id?: string }>('/admin/integrations/whatsapp/oauth-connect', { code });
        },

        /**
         * Get WhatsApp connection status
         */
        getStatus: async (): Promise<WhatsAppStatusResponse> => {
            return apiClient.get<WhatsAppStatusResponse>('/admin/integrations/whatsapp/status');
        },

        /**
         * Send a text message via WhatsApp
         */
        sendMessage: async (to: string, message: string): Promise<{ status: string; data: any }> => {
            return apiClient.post<{ status: string; data: any }>('/admin/integrations/whatsapp/send-message', {
                to,
                message
            });
        },

        /**
         * Send a template message via WhatsApp
         */
        sendTemplate: async (to: string, templateName: string, languageCode: string = "en_US", components: any[] = []): Promise<{ status: string; data: any }> => {
            return apiClient.post<{ status: string; data: any }>('/admin/integrations/whatsapp/send-template', {
                to,
                template_name: templateName,
                language_code: languageCode,
                components
            });
        },

        /**
         * Disconnect WhatsApp
         */
        disconnect: async (): Promise<{ message: string }> => {
            return apiClient.delete<{ message: string }>('/admin/integrations/whatsapp/disconnect');
        }
    }
};
