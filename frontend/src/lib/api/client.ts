import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

/**
 * API Client for HR Automation System
 * Handles authentication, request/response interceptors, and error handling
 */

const getApiBaseUrl = () => {
    if (typeof window !== "undefined") {
        const host = window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname;
        return `http://${host}:2024/api/v1`;
    }
    return "http://127.0.0.1:2024/api/v1";
};

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor: Add auth token
        this.client.interceptors.request.use(
            (config) => {
                const token = this.getAccessToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor: Handle errors globally
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                if (error.response?.status === 401) {
                    // For now, redirect to login
                    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                        window.location.href = '/login';
                    }
                }
                return Promise.reject(this.normalizeError(error));
            }
        );
    }

    private getAccessToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('access_token');
        }
        return null;
    }

    private normalizeError(error: AxiosError): { message: string; code: string; details?: any } {
        if (error.response?.data) {
            const data = error.response.data as any;
            // Handle FastAPI 'detail' field
            const message = typeof data.detail === 'string'
                ? data.detail
                : (Array.isArray(data.detail) ? 'Validation Error' : (data.message || 'An error occurred'));

            return {
                message: message,
                code: data.code || `HTTP_${error.response.status}`,
                details: data.detail,
            };
        }
        return {
            message: error.message || 'Network error',
            code: 'NETWORK_ERROR',
        };
    }

    // Generic request methods
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.get<T>(url, config);
        return response.data;
    }

    async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.post<T>(url, data, config);
        return response.data;
    }

    async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.put<T>(url, data, config);
        return response.data;
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.delete<T>(url, config);
        return response.data;
    }

    async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.patch<T>(url, data, config);
        return response.data;
    }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export type for dependency injection if needed
export type { ApiClient };
