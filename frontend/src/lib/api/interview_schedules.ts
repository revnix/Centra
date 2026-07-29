import { apiClient } from './client';

export type ScheduleStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
export type HireRecommendation = 'STRONG_YES' | 'YES' | 'MAYBE' | 'NO' | 'STRONG_NO';

export interface PanelistResponse {
  id: number;
  user_id: number;
  full_name?: string;
  email?: string;
  assigned_at?: string;
}

export interface FeedbackCreate {
  overall_rating: number;
  technical_rating?: number;
  communication_rating?: number;
  culture_fit_rating?: number;
  recommendation: HireRecommendation;
  strengths?: string;
  concerns?: string;
  notes?: string;
}

export interface FeedbackResponse {
  id: number;
  schedule_id: number;
  panelist_id: number;
  panelist_full_name?: string;
  panelist_email?: string;
  overall_rating: number;
  technical_rating?: number;
  communication_rating?: number;
  culture_fit_rating?: number;
  recommendation: HireRecommendation;
  strengths?: string;
  concerns?: string;
  notes?: string;
  submitted_at?: string;
}

export interface ScheduleInterviewRequest {
  scheduled_at: string;
  duration_minutes?: number;
  location?: string;
  meeting_link?: string;
  notes?: string;
  panelist_user_ids?: number[];
  notify_candidate?: boolean;
}

export interface UpdateScheduleRequest {
  scheduled_at?: string;
  duration_minutes?: number;
  location?: string;
  meeting_link?: string;
  notes?: string;
  panelist_user_ids?: number[];
  status?: ScheduleStatus;
  notify_candidate?: boolean;
}

export interface InterviewScheduleResponse {
  id: number;
  application_id: number;
  scheduled_at: string;
  duration_minutes: number;
  location?: string;
  meeting_link?: string;
  notes?: string;
  status: ScheduleStatus;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  panelists: PanelistResponse[];
  feedback_entries: FeedbackResponse[];
  feedback_submitted_count: number;
  panelist_count: number;
  all_feedback_submitted: boolean;
}

export const interviewSchedulesApi = {
  createSchedule: async (applicationId: number, data: ScheduleInterviewRequest): Promise<InterviewScheduleResponse> => {
    return apiClient.post<InterviewScheduleResponse>(`/applications/${applicationId}/schedule`, data);
  },

  getSchedule: async (applicationId: number): Promise<InterviewScheduleResponse> => {
    return apiClient.get<InterviewScheduleResponse>(`/applications/${applicationId}/schedule`);
  },

  updateSchedule: async (applicationId: number, data: UpdateScheduleRequest): Promise<InterviewScheduleResponse> => {
    return apiClient.patch<InterviewScheduleResponse>(`/applications/${applicationId}/schedule`, data);
  },

  cancelSchedule: async (applicationId: number): Promise<{ message: string; schedule: InterviewScheduleResponse }> => {
    return apiClient.delete<{ message: string; schedule: InterviewScheduleResponse }>(`/applications/${applicationId}/schedule`);
  },

  submitFeedback: async (applicationId: number, data: FeedbackCreate): Promise<FeedbackResponse> => {
    return apiClient.post<FeedbackResponse>(`/applications/${applicationId}/schedule/feedback`, data);
  },

  listFeedback: async (applicationId: number): Promise<FeedbackResponse[]> => {
    return apiClient.get<FeedbackResponse[]>(`/applications/${applicationId}/schedule/feedback`);
  },

  getMyInterviews: async (): Promise<InterviewScheduleResponse[]> => {
    return apiClient.get<InterviewScheduleResponse[]>('/interview-schedules/my');
  },

  getScheduleById: async (scheduleId: number): Promise<InterviewScheduleResponse> => {
    return apiClient.get<InterviewScheduleResponse>(`/interview-schedules/${scheduleId}`);
  },

  notifyLeads: async (applicationId: number, data: { lead_emails: string[]; subject: string; message: string }): Promise<{ message: string; sent_count: number }> => {
    return apiClient.post<{ message: string; sent_count: number }>(`/applications/${applicationId}/notify-leads`, data);
  },

  getPublicSchedule: async (applicationId: number): Promise<any> => {
    return apiClient.get<any>(`/interview-schedules/public/${applicationId}`);
  },

  submitPublicFeedback: async (applicationId: number, data: any): Promise<FeedbackResponse> => {
    return apiClient.post<FeedbackResponse>(`/interview-schedules/public/${applicationId}/feedback`, data);
  },
};
