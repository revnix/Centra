/**
 * LangGraph TypeScript types matching backend state
 */

// Job post state from backend (matches JobPost Pydantic model)
export interface JobPostState {
    job_title: string;
    location: string;
    summary: string;
    skills: string[];
    responsibilities: string[];
    requirements: string[];
    preferred_qualifications: string[];
    benefits: string[];
}

// JD state from backend workflow
export interface JDState {
    role: string;
    location: string;
    skills: string[];
    company_name: string;
    employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
    experience_level: 'Junior' | 'Mid' | 'Senior' | 'Lead';
    feedback: string | null;
    status: 'draft' | 'awaiting_review' | 'approved' | 'rejected';
    post: JobPostState | null;
}

// Full workflow state
export interface EvalynState {
    jd: JDState;
}

// HITL interrupt payload from backend
export interface HITLInterrupt {
    message: string;
    job_post: JobPostState;
    options: string[];
}

// HITL response to send back
export interface HITLResponse {
    status: 'approved' | 'rejected';
    feedback?: string;
}
