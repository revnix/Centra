from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class JobBase(BaseModel):
    title: str
    description: str
    short_description: Optional[str] = None
    company_name: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    department: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
    application_url: Optional[str] = None
    
class JobCreate(JobBase):
    pass

class JobUpdate(JobBase):
    title: Optional[str] = None
    description: Optional[str] = None
    # Add other optional fields for update as needed
    
class JobResponse(JobBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    status: Optional[str] = None
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True