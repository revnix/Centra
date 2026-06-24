from pydantic import BaseModel, EmailStr
from typing import Optional, Any
from datetime import datetime
from src.api.models.application import ApplicationStatus
from src.api.schemas.candidate import CandidateProfileCreate

class ApplicationBase(BaseModel):
    job_id: int

class ApplicationCreate(ApplicationBase):
    cover_letter: Optional[str] = None
    phone_number: Optional[str] = None
    source: Optional[str] = "web"
    expected_salary: Optional[float] = None
    city: Optional[str] = None
    qualification: Optional[str] = None

class GuestApplicationCreate(BaseModel):
    """Schema for guest application (no prior login)"""
    job_id: int
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    resume_url: Optional[str] = None
    # Embedded profile data
    linkedin_url: Optional[str] = None
    skills: list[str] = []
    experience_years: int = 0
    expected_salary: Optional[float] = None
    city: str
    qualification: str

from src.api.schemas.user import UserResponse
from src.api.schemas.job import JobResponse
from src.api.schemas.interview import InterviewSessionResponse

class ApplicationResponse(ApplicationBase):
    id: int
    candidate_id: int
    status: ApplicationStatus
    source: Optional[str] = None
    match_score: Optional[float] = None
    expected_salary: Optional[str] = None
    salary_filter_status: Optional[str] = None
    email_delivery_status: Optional[str] = None
    email_logs: Optional[Any] = None
    interview_invitation_status: Optional[str] = None
    last_interview_invite_id: Optional[str] = None
    city: Optional[str] = None
    qualification: Optional[str] = None
    interview_invite_sent_at: Optional[datetime] = None
    created_at: datetime
    
    candidate: Optional[UserResponse] = None
    job: Optional[JobResponse] = None
    interview_session: Optional[InterviewSessionResponse] = None
    
    class Config:
        from_attributes = True
        use_enum_values = True
