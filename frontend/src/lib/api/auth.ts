import { apiClient } from './client';
import type {
    User,
    UserCreate,
    UserLogin,
    Token,
    UserRegisterResponse,
    ApiResponse,
    UserRole
} from '@/lib/types';

/**
 * Auth API endpoints
 */
export const authApi = {
    /**
     * Register a new user
     */
    register: async (userData: UserCreate): Promise<UserRegisterResponse> => {
        return apiClient.post<UserRegisterResponse>('/auth/register', userData);
    },

    /**
     * Login user
     */
    login: async (credentials: UserLogin): Promise<Token> => {
        return apiClient.post<Token>('/auth/login', credentials);
    },

    /**
     * Get current user profile
     */
    getMe: async (): Promise<User> => {
        return apiClient.get<User>('/auth/me');
    }
};
