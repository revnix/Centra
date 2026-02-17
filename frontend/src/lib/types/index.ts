/**
 * Core TypeScript type definitions for the HR Automation System
 */

// LangGraph types
export * from './langgraph';


// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export type UserRole = 'ADMIN' | 'REVIEWER' | 'CANDIDATE';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string;
  is_active?: boolean;
}

export interface UserCreate {
  email: string;
  full_name?: string;
  password?: string;
  role?: UserRole;
}

export interface UserLogin {
  email: string;
  password?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserRegisterResponse {
  user: User;
  access_token: Token;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

// ============================================================================
// JOB TYPES
// ============================================================================

export type JobStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

export interface Job {
  id: string;
  title: string;
  department?: string;
  location?: string;
  location_type?: string;
  status: JobStatus;
  description: string;
  short_description?: string;
  company_name?: string;
  job_type?: string;
  type?: string; // Compatibility field
  experience_level?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  salary_range?: string;
  required_skills?: string[];
  preferred_skills?: string[];
  benefits?: string[];
  application_url?: string;
  requirements: string[]; // Keep for backward compatibility
  desiredSkills: string[]; // Keep for backward compatibility
  candidateCount?: number;
  application_count?: number;
  pendingActionCount?: number;
  createdBy: string;
  created_by?: number;
  createdAt: string;
  created_at?: string;
  publishedAt?: string;
  published_at?: string;
  closedAt?: string;
  expires_at?: string;
  tags?: string[];
  company_size?: string;
  company_website?: string;
}

export interface JobIntent {
  title: string;
  department: string;
  location: string;
  requirements: string[];
  desiredSkills: string[];
}

export interface AIJobDraft {
  jobId: string;
  generatedDescription: string;
  confidence: number;
  generatedAt: string;
  isApproved: boolean;
}

// ============================================================================
// CANDIDATE TYPES
// ============================================================================

export type CandidateStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW_PENDING'
  | 'INTERVIEW_IN_PROGRESS'
  | 'INTERVIEW_COMPLETED'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface Candidate {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  linkedIn?: string;
  avatar?: string;
  stage: CandidateStage;
  matchScore: number;
  confidence: number;
  needsReview: boolean;
  resumeUrl?: string;
  appliedAt: string;
  updatedAt: string;
}

export interface ParsedResume {
  candidateId: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string[];
  summary?: string;
}

export interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  description: string;
  isCurrentRole: boolean;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationDate: string;
}

export interface MatchExplanation {
  candidateId: string;
  matchScore: number;
  confidence: number;
  strengths: string[];
  concerns: string[];
  reasoning: string;
  skillsMatch: {
    matched: string[];
    missing: string[];
  };
}

export type AIRecommendationType = 'advance' | 'reject' | 'uncertain';

export interface AIRecommendation {
  candidateId: string;
  recommendation: AIRecommendationType;
  confidence: number;
  reasoning: string[];
  generatedAt: string;
}

export interface HumanDecision {
  candidateId: string;
  decision: 'approve' | 'reject' | 'request_more_info';
  agreeWithAI: boolean;
  reason?: string;
  feedback?: string;
  decidedBy: string;
  decidedAt: string;
}

// ============================================================================
// INTERVIEW TYPES
// ============================================================================

export type InterviewStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Interview {
  id: string;
  candidateId: string;
  jobId: string;
  status: InterviewStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number; // in minutes
  scores: InterviewScores;
  overallScore: number;
  aiRecommendation: AIRecommendationType;
  confidence: number;
}

export interface InterviewScores {
  technical: number;
  communication: number;
  problemSolving: number;
  cultureFit?: number;
}

export interface QuestionAnswer {
  id: string;
  interviewId: string;
  question: string;
  answer: string;
  timestamp: number;
  duration: number; // seconds
  score?: number;
  aiHighlights?: {
    text: string;
    type: 'strong' | 'concerning' | 'neutral';
  }[];
}

export interface InterviewOverride {
  interviewId: string;
  originalScores: InterviewScores;
  adjustedScores: InterviewScores;
  reason: string;
  changedRecommendation?: AIRecommendationType;
  notes?: string;
  reviewedBy: string;
  reviewedAt: string;
}

// ============================================================================
// CODING EXERCISE TYPES
// ============================================================================

export type CodingStatus = 'not_started' | 'in_progress' | 'submitted' | 'reviewed';

export interface CodingExercise {
  id: string;
  candidateId: string;
  jobId: string;
  title: string;
  description: string;
  language: 'python' | 'javascript' | 'typescript' | 'java' | 'go';
  starterCode: string;
  timeLimit: number; // in minutes
  status: CodingStatus;
  submittedAt?: string;
  submittedCode?: string;
  testResults?: TestResults;
  aiScore?: number;
  aiFeedback?: AICodeFeedback;
}

export interface TestResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testCases: TestCase[];
  executionTime?: number;
}

export interface TestCase {
  id: string;
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  error?: string;
  isHidden: boolean;
}

export interface AICodeFeedback {
  exerciseId: string;
  correctnessScore: number;
  styleScore: number;
  efficiencyScore: number;
  overallScore: number;
  suggestions: string[];
  strengths: string[];
  generatedAt: string;
}

// ============================================================================
// REAL-TIME EVENT TYPES
// ============================================================================

export type EventType =
  | 'candidate.stage_changed'
  | 'candidate.review_required'
  | 'interview.completed'
  | 'coding.submitted'
  | 'job.published'
  | 'job.closed';

export interface RealtimeEvent<T = any> {
  type: EventType;
  data: T;
  timestamp: string;
}

export interface CandidateStageChangedEvent {
  candidateId: string;
  jobId: string;
  oldStage: CandidateStage;
  newStage: CandidateStage;
  changedBy: string;
}

export interface ReviewRequiredEvent {
  candidateId: string;
  jobId: string;
  reason: string;
  confidence: number;
}

export interface InterviewCompletedEvent {
  interviewId: string;
  candidateId: string;
  scores: InterviewScores;
  recommendation: AIRecommendationType;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

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

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface CandidateFilters {
  stage?: CandidateStage[];
  matchScoreMin?: number;
  matchScoreMax?: number;
  needsReview?: boolean;
  search?: string;
}

export interface UIState {
  isSidebarOpen: boolean;
  activeFilters: CandidateFilters;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}
