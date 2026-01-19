from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class JobBase(BaseModel):
    title: str
    summary: str
    company_name: str
    location: str
    salary: Optional[str] = None
    skills: Optional[str] = None
    responsibilities: Optional[str] = None
    requirements: Optional[str] = None
    preferred_qualifications: Optional[str] = None
    benefits: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(JobBase):
    title: Optional[str] = None
    summary: Optional[str] = None
    company_name: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None
    skills: Optional[str] = None
    responsibilities: Optional[str] = None
    requirements: Optional[str] = None
    preferred_qualifications: Optional[str] = None
    benefits: Optional[str] = None

class JobResponse(JobBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True