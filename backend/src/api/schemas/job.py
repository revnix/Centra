from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from src.api.models.job import JobType, JobStatus, ExperienceLevel

class JobBase(BaseModel):
    title: str
    description: str
    short_description: Optional[str] = None
    company_name: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[JobType] = None
    experience_level: Optional[ExperienceLevel] = None
    department: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = "USD"
    salary_period: Optional[str] = "yearly"
    salary_range: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
    application_url: Optional[str] = None
    
    @field_validator('job_type', 'experience_level', mode='before')
    @classmethod
    def validate_enums(cls, v, info):
        """Convert string values to enum values if needed"""
        if v is None:
            return v
        
        # Get the field name
        field_name = info.field_name
        
        # Convert string to enum if necessary
        if field_name == 'job_type' and isinstance(v, str):
            try:
                return JobType(v)
            except ValueError:
                # Try to find a matching enum value (case-insensitive)
                for job_type in JobType:
                    if job_type.value == v or job_type.name == v:
                        return job_type
                raise ValueError(f"Invalid job_type: {v}. Valid values are: {', '.join([jt.value for jt in JobType])}")
        
        elif field_name == 'experience_level' and isinstance(v, str):
            try:
                return ExperienceLevel(v)
            except ValueError:
                # Try to find a matching enum value (case-insensitive)
                for exp_level in ExperienceLevel:
                    if exp_level.value == v or exp_level.name == v:
                        return exp_level
                raise ValueError(f"Invalid experience_level: {v}. Valid values are: {', '.join([el.value for el in ExperienceLevel])}")
        
        return v
    
class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    company_name: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[JobType] = None
    experience_level: Optional[ExperienceLevel] = None
    department: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    salary_period: Optional[str] = None
    salary_range: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
    application_url: Optional[str] = None

class JobDraftRequest(BaseModel):
    title: str
    department: Optional[str] = None
    location: Optional[str] = "Remote"
    experience_level: Optional[str] = "MID_SENIOR"
    job_type: Optional[str] = "FULL_TIME"

class JobImproveRequest(BaseModel):
    feedback: str
    
class JobResponse(JobBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    status: Optional[JobStatus] = None
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        use_enum_values = True  # Serialize enums as their values (strings)