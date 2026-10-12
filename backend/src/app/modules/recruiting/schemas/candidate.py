from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime

class CandidateProfileBase(BaseModel):
    resume_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    skills: List[str] = []
    experience_years: int = 0
    bio: Optional[str] = None
    
    @field_validator('skills', mode='before')
    @classmethod
    def parse_skills(cls, v):
        if isinstance(v, str):
            import json
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else [v]
            except:
                return [v]
        return v

class CandidateProfileCreate(CandidateProfileBase):
    pass

class CandidateProfileResponse(CandidateProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
