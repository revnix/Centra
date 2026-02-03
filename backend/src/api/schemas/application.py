from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from src.api.models.application import ApplicationStatus
from src.api.schemas.candidate import CandidateProfileCreate

class ApplicationBase(BaseModel):
    job_id: int

class ApplicationCreate(ApplicationBase):
    pass

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

from src.api.schemas.user import UserResponse
from src.api.schemas.job import JobResponse

class ApplicationResponse(ApplicationBase):
    id: int
    candidate_id: int
    status: ApplicationStatus
    match_score: Optional[float] = None
    created_at: datetime
    
    candidate: Optional[UserResponse] = None
    job: Optional[JobResponse] = None
    
    class Config:
        from_attributes = True
        use_enum_values = True
