const API_BASE_URL = "http://127.0.0.1:2024/api/v1";

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "ApiError";
    }
}

async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new ApiError(res.status, errorData.detail || "An error occurred");
    }

    return res.json();
}

export const api = {
    jobs: {
        list: () => fetcher<any[]>("/jobs/public"),
        get: (id: string) => fetcher<any>(`/jobs/${id}`),
    },
    applications: {
        guestApply: (data: {
            job_id: number;
            email: string;
            full_name: string;
            resume_url?: string;
            linkedin_url?: string;
            skills?: string[];
            experience_years?: number;
        }) => fetcher<{
            message: string;
            redirect_url: string;
            interview_token: string;
        }>("/applications/guest", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    },
    interviews: {
        getSession: (token: string) => fetcher<any>(`/interviews/${token}`),
        sendMessage: (token: string, message: string) => fetcher<{
            reply: string;
            transcript: any[];
        }>(`/interviews/${token}/chat`, {
            method: "POST",
            body: JSON.stringify({ message }),
        }),
    },
};

export const jobsApi = {
    getAll: (params?: any) => {
        const query = params ? "?" + new URLSearchParams(params).toString() : "";
        return fetcher<any[]>(`/jobs/${query}`);
    },
    getById: (id: string) => fetcher<any>(`/jobs/${id}`),
    create: (data: any) => fetcher<any>("/jobs", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    generateDescription: (jobId: string) => fetcher<any>(`/jobs/${jobId}/generate`, {
        method: "POST",
    }),
    approveDraft: (jobId: string, editedDescription?: string) => fetcher<any>(`/jobs/${jobId}/approve`, {
        method: "POST",
        body: JSON.stringify({ description: editedDescription }),
    }),
    publish: (jobId: string) => fetcher<any>(`/jobs/${jobId}/publish`, {
        method: "POST",
    }),
    update: (jobId: string, updates: any) => fetcher<any>(`/jobs/${jobId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
    }),
    delete: (jobId: string) => fetcher<any>(`/jobs/${jobId}`, {
        method: "DELETE",
    }),
    close: (jobId: string) => fetcher<any>(`/jobs/${jobId}/close`, {
        method: "POST",
    }),
};

export const authApi = {
    login: (credentials: any) => fetcher<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
    }),
    register: (data: any) => fetcher<{ user: any; access_token: { access_token: string } }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    getMe: () => fetcher<any>("/auth/me", {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
    }),
};

export const integrationsApi = {
    linkedin: {
        getLoginUrl: () => fetcher<{ authorization_url: string }>("/admin/integrations/linkedin/login"),
        callback: (code: string, state: string) => fetcher<any>("/admin/integrations/linkedin/callback", {
            method: "POST",
            body: JSON.stringify({ code, state }),
        }),
        getStatus: () => fetcher<{ connected: boolean; platform_user_id?: string }>("/admin/integrations/linkedin/status"),
        disconnect: () => fetcher<any>("/admin/integrations/linkedin/disconnect", {
            method: "DELETE",
        }),
    },
};
