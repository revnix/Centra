from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from typing import Optional, Any, List, Union
from datetime import datetime
from src.app.modules.recruiting.models.application import ApplicationStatus
from src.app.modules.recruiting.schemas.candidate import CandidateProfileCreate

class ApplicationBase(BaseModel):
    job_id: int

class ApplicationCreate(ApplicationBase):
    cover_letter: Optional[str] = None
    phone_number: Optional[str] = None
    source: Optional[str] = "web"
    expected_salary: Optional[float] = None
    city: Optional[str] = None
    qualification: Optional[str] = None

    @field_validator('phone_number')
    @classmethod
    def validate_phone_number(cls, v):
        if v is None or v == '':
            return v
        # Remove non-digit characters
        digits_only = ''.join(c for c in v if c.isdigit())
        # Check max 11 digits
        if len(digits_only) > 11:
            raise ValueError('Phone number must not exceed 11 digits')
        return v

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

    @field_validator('phone_number')
    @classmethod
    def validate_phone_number(cls, v):
        if v is None or v == '':
            return v
        # Remove non-digit characters
        digits_only = ''.join(c for c in v if c.isdigit())
        # Check max 11 digits
        if len(digits_only) > 11:
            raise ValueError('Phone number must not exceed 11 digits')
        return v

from src.app.modules.platform.users.schemas.user import UserResponse
from src.app.modules.recruiting.schemas.job import JobResponse
from src.app.modules.recruiting.schemas.interview import InterviewSessionResponse
from src.app.modules.recruiting.schemas.interview_schedule import InterviewScheduleSummary

class ScreeningTestSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    score: Optional[float] = None
    correct_count: Optional[int] = None
    total_questions: Optional[int] = None
    completed_at: Optional[datetime] = None

class ApplicationResponse(ApplicationBase):
    id: int
    candidate_id: int
    status: ApplicationStatus
    source: Optional[str] = None
    match_score: Optional[float] = None
    expected_salary: Optional[Union[str, float, int]] = None
    salary_filter_status: Optional[str] = None
    email_delivery_status: Optional[str] = None
    email_logs: Optional[Any] = None
    interview_invitation_status: Optional[str] = None
    last_interview_invite_id: Optional[str] = None
    cover_letter: Optional[str] = None
    phone_number: Optional[str] = None
    city: Optional[str] = None
    qualification: Optional[str] = None
    interview_invite_sent_at: Optional[datetime] = None
    created_at: datetime

    candidate: Optional[UserResponse] = None
    job: Optional[JobResponse] = None
    interview_session: Optional[InterviewSessionResponse] = None
    screening_test: Optional[ScreeningTestSummaryResponse] = None
    interview_schedule: Optional[InterviewScheduleSummary] = None

    @field_validator('email_logs', mode='before')
    @classmethod
    def normalize_email_logs(cls, v: Any) -> Any:
        if isinstance(v, str):
            return [v]
        return v

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)
