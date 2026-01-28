export type JobStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface Job {
    id: string;
    title: string;
    description: string;
    department?: string;
    location?: string;
    type?: string;
    salary_range?: string;
    requirements?: string[];
    status: JobStatus;
    created_at?: string;
    updated_at?: string;
    ai_generated?: boolean;
}

export interface JobIntent {
    role: string;
    description?: string;
    location?: string;
    skills?: string[];
    experience_level?: string;
    department?: string;
}

export interface IntegrationResponse {
    id: number;
    user_id: number;
    platform: string;
    platform_user_id?: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: string;
    created_at: string;
    updated_at?: string;
}
