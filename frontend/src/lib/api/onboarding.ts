import { apiClient } from './client';

const BACKEND_BASE = (() => {
    const langgraphUrl = process.env.NEXT_PUBLIC_LANGGRAPH_API_URL;
    if (langgraphUrl) {
        // Remove /api/v1 or /api/v2 if present to get the base host
        return langgraphUrl.replace(/\/api\/v[0-9]+$/, '');
    }
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8125';
})();

export interface OnboardingResponse {
    id: number;
    application_id: number;
    user_id: number;
    status: string;
    joining_date?: string;
    reporting_time?: string;
    office_location?: string;
    shift_timing?: string;
    
    // Personal Info
    cnic_number?: string;
    phone_number?: string;
    current_address?: string;
    emergency_contact?: string;
    bank_name?: string;
    bank_iban?: string;
    
    // Virtual fields from backend
    candidate_name?: string;
    email?: string;
    job_title?: string;
    
    doc_front_picture_url?: string;
    doc_id_card_url?: string;
    doc_salary_slip_url?: string;
    doc_experience_letter_url?: string;
    doc_educational_documents_url?: string;
    doc_police_clearance_url?: string;
    doc_resume_url?: string;
    doc_additional_files_json?: string;
    
    hr_verified: boolean;
    
    it_slack_setup: boolean;
    it_gmail_setup: boolean;
    it_browser_extensions: boolean;
    it_gmail_signature: boolean;
    it_bordio_access: boolean;
    it_office365_access: boolean;
    
    ind_hr_welcome_session: boolean;
    ind_hr_handbook_shared: boolean;
    ind_hr_policies_explained: boolean;
    ind_it_credentials_provided: boolean;
    ind_it_security_induction: boolean;
    ind_manager_buddy_assigned: boolean;
    ind_manager_team_intro: boolean;
}

export interface UploadResponse {
    url: string;
    filename: string;
    size: number;
}

/** Convert a relative /uploads/... URL to a full backend URL for viewing */
export function getDocumentViewUrl(relativeUrl: string | undefined): string | null {
    if (!relativeUrl) return null;
    if (relativeUrl.startsWith('http')) return relativeUrl;
    return `${BACKEND_BASE}${relativeUrl}`;
}

export const onboardingApi = {
    getAll: () => apiClient.get<OnboardingResponse[]>('/onboarding'),
    get: (applicationId: number, token?: string | null) => 
        apiClient.get<OnboardingResponse>(`/onboarding/${applicationId}${token ? `?token=${token}` : ''}`),
    
    initiate: (applicationId: number) => apiClient.post<OnboardingResponse>(`/onboarding/${applicationId}`),
    
    updateCandidateInfo: (applicationId: number, data: any, token?: string | null) => 
        apiClient.put<OnboardingResponse>(`/onboarding/${applicationId}/candidate-date${token ? `?token=${token}` : ''}`, data),
        
    hrSetJoiningDetails: (applicationId: number, data: any) => 
        apiClient.put<OnboardingResponse>(`/onboarding/${applicationId}/hr-joining-details`, data),
        
    updateCandidateDocs: (applicationId: number, data: any, token?: string | null) => 
        apiClient.put<OnboardingResponse>(`/onboarding/${applicationId}/candidate-docs${token ? `?token=${token}` : ''}`, data),

    /** 
     * NEW: Robust multi-file upload for onboarding 
     * Maps to: POST /api/v1/onboarding/{application_id}/upload-documents
     */
    uploadDocuments: async (applicationId: number, files: Record<string, File | null>, token?: string | null): Promise<OnboardingResponse> => {
        const formData = new FormData();
        Object.entries(files).forEach(([key, file]) => {
            if (file) formData.append(key, file);
        });
        return apiClient.post<OnboardingResponse>(`/onboarding/${applicationId}/upload-documents${token ? `?token=${token}` : ''}`, formData);
    },
        
    hrVerify: (applicationId: number, data: { hr_verified: boolean }) => 
        apiClient.put<OnboardingResponse>(`/onboarding/${applicationId}/hr-verify`, data),
        
    itSetupUpdate: (applicationId: number, data: any) => 
        apiClient.put<OnboardingResponse>(`/onboarding/${applicationId}/it-setup`, data),
        
    hrInductionUpdate: (applicationId: number, data: any) => 
        apiClient.put<OnboardingResponse>(`/onboarding/${applicationId}/induction/hr`, data),

    itInductionUpdate: (applicationId: number, data: any) => 
        apiClient.put<OnboardingResponse>(`/onboarding/${applicationId}/induction/it`, data),

    managerInductionUpdate: (applicationId: number, data: any) => 
        apiClient.put<OnboardingResponse>(`/onboarding/${applicationId}/induction/manager`, data),
        
    sendWelcomeEmail: (applicationId: number) => 
        apiClient.post<{ message: string }>(`/onboarding/${applicationId}/send-welcome-email`),

    /** 
     * HR-specific detailed view of onboarding 
     */
    getHrDetails: (applicationId: number) => 
        apiClient.get<any>(`/onboarding/hr/${applicationId}`),

    /** 
     * Upload a document file for a specific application and type
     * Maps to: POST /api/v1/onboarding/{application_id}/upload-documents
     */
    uploadDocument: async (applicationId: number, type: string, file: File, token?: string | null): Promise<OnboardingResponse> => {
        const formData = new FormData();
        formData.append(type, file);
        return apiClient.post<OnboardingResponse>(`/onboarding/${applicationId}/upload-documents${token ? `?token=${token}` : ''}`, formData);
    },
    
    complete: (applicationId: number, token?: string | null) => 
        apiClient.post<OnboardingResponse>(`/onboarding/${applicationId}/complete${token ? `?token=${token}` : ''}`),
};

