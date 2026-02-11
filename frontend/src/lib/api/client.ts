import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

/**
 * API Client for HR Automation System
 * Handles authentication, request/response interceptors, and error handling
 */

const getApiBaseUrl = () => {
    if (typeof window !== "undefined") {
        // Direct to backend in development to avoid proxy issues
        // In production, this would be "/api/v1"
        return "http://localhost:8123/api/v1";
    }
    // Server-side default
    return "http://127.0.0.1:8123/api/v1";
};

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: getApiBaseUrl(),
            timeout: 90000,
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

                // Automatically handle FormData Content-Type
                if (config.data instanceof FormData) {
                    delete config.headers['Content-Type'];
                }

                console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config);
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
                    // Clear credentials on authentication error
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('userRole');
                        localStorage.removeItem('userEmail');

                        // Clear cookie
                        document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

                        // Redirect to login if not already there
                        // Redirect to login if not already there, and not on a public interview page
                        const isPublicRoute = window.location.pathname.startsWith('/interview') || window.location.pathname.startsWith('/public');
                        if (!window.location.pathname.startsWith('/login') && !isPublicRoute) {
                            window.location.href = '/login?no_redirect=true';
                        }
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
        // Defensive checks for config properties
        const config = error.config;
        const method = config?.method?.toUpperCase() || 'UNKNOWN';
        const url = (config?.baseURL || '') + (config?.url || 'URL');

        if (error.response) {
            const data = error.response.data as any;
            const status = error.response.status;

            // Log the raw error safely for developer visibility
            console.error(`[API Error] ${method} ${url} (${status}):`, data);

            // Handle FastAPI 'detail' field
            let message = 'An error occurred';

            if (data && typeof data.detail === 'string') {
                message = data.detail;
            } else if (data && Array.isArray(data.detail)) {
                message = 'Validation Error: ' + JSON.stringify(data.detail);
            } else if (data && typeof data.detail === 'object' && data.detail !== null) {
                message = (data.detail as any).message || JSON.stringify(data.detail);
            } else if (data && data.message) {
                message = data.message;
            } else if (typeof data === 'string' && data.length > 0) {
                message = data;
            } else if (status === 500) {
                message = 'Internal Server Error (Backend crashed or returned no details)';
            } else if (status === 404) {
                message = 'Resource not found';
            }

            return {
                message: message,
                code: data?.code || `HTTP_${status}`,
                details: data?.detail || null,
            };
        }

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            console.error(`[Network Timeout] ${method} ${url}:`, error.message);
            return {
                message: 'Request timed out. The server is taking too long to respond.',
                code: 'TIMEOUT',
            };
        }

        console.error(`[Network Error] ${method} ${url}:`, error.message);

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
