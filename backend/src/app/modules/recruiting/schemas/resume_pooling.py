from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class ResumePoolingQuery(BaseModel):
    """
    Schema for searching and pooling candidates based on HR criteria.
    """
    job_title: Optional[str] = Field(default=None, description="Job title filter or target position (e.g. 'AI Engineer', 'Full Stack Developer')")
    skills: List[str] = Field(default=[], description="List of required/preferred skills (e.g. ['Python', 'React'])")
    description: Optional[str] = Field(default=None, description="Job/role description or requirements text")
    education: Optional[str] = Field(default=None, description="Target education / qualification (e.g. 'Bachelor', 'BSCS', 'Master')")
    experience_years: Optional[int] = Field(default=None, description="Minimum required years of experience")
    area_of_living: Optional[str] = Field(default=None, description="Preferred city or area of living (e.g. 'Haripur', 'Islamabad')")
    applied_within_days: Optional[int] = Field(default=None, description="Timeframe filter: candidates who applied within N days (e.g. 30, 90, 365)")
    min_score: float = Field(default=0.0, description="Minimum match score cutoff (0 to 100)")
    limit: int = Field(default=15, description="Maximum number of top matching candidates to return (default: 15)")

class ResumePoolScoreBreakdown(BaseModel):
    skills_score: float = Field(..., description="Points from skills match (0-35)")
    experience_score: float = Field(..., description="Points from experience match (0-25)")
    location_score: float = Field(..., description="Points from location / area of living match (0-20)")
    education_score: float = Field(..., description="Points from education match (0-15)")
    description_score: float = Field(..., description="Points from description relevance (0-5)")

class ResumePoolCandidate(BaseModel):
    user_id: int
    full_name: Optional[str] = None
    email: str
    phone_number: Optional[str] = None
    city: Optional[str] = None
    qualification: Optional[str] = None
    skills: List[str] = []
    experience_years: int = 0
    bio: Optional[str] = None
    resume_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    last_applied_job_title: Optional[str] = Field(default=None, description="Title of the candidate's last applied job")
    applied_job_titles: List[str] = Field(default=[], description="List of all job titles candidate applied for")
    match_score: float = Field(..., description="Overall match score (0 to 100)")
    match_breakdown: ResumePoolScoreBreakdown
    match_reason: str = Field(..., description="Detailed explanation of candidate score & match suitability")
    last_applied_at: Optional[datetime] = None
    applications_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class ResumePoolingResponse(BaseModel):
    total_found: int
    returned_count: int
    query_summary: str
    candidates: List[ResumePoolCandidate]
