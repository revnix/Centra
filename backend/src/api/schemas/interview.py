from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime
from src.api.models.interview import InterviewStatus

class InterviewSessionBase(BaseModel):
    status: InterviewStatus
    transcript: List[Any] = []
    
class InterviewSessionResponse(InterviewSessionBase):
    id: int
    application_id: int
    token: str
    state: Optional[dict] = {}
    overall_score: Optional[float] = None
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    feedback: Optional[str] = None
    code_submission: Optional[str] = None
    programming_language: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    recording_path: Optional[str] = None
    
    class Config:
        from_attributes = True
