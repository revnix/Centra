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
    overall_score: Optional[float] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
