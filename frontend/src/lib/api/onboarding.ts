import { apiClient } from './client';

export interface OnboardingResponse {
    id: number;
    application_id: number;
    user_id: number;
    status: string;
    joining_date?: string;
    reporting_time?: string;
    office_location?: string;
    shift_timing?: string;
    
    doc_front_picture_url?: string;
    doc_id_card_url?: string;
    doc_salary_slip_url?: string;
    doc_experience_letter_url?: string;
    
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

export const onboardingApi = {
    getAll: () => apiClient.get<OnboardingResponse[]>('/onboarding/'),
    get: (applicationId: number) => apiClient.get<OnboardingResponse>(`/onboarding/${applicationId}`),
    
    initiate: (applicationId: number) => apiClient.post<OnboardingResponse>(`/onboarding/${applicationId}`),
    
    updateCandidateInfo: (applicationId: number, data: any) => 
        apiClient.put<OnboardingResponse>(`/onboarding/${applicationId}/candidate-date`, data),
        
    hrSetJoiningDetails: (applicationId: number, data: any) => 
        apiClient.put<OnboardingResponse>(`/onboarding/${applicationId}/hr-joining-details`, data),
        
    updateCandidateDocs: (applicationId: number, data: any) => 
        apiClient.put<OnboardingResponse>(`/onboarding/${applicationId}/candidate-docs`, data),
        
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
};
