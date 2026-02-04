from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class IntegrationBase(BaseModel):
    platform: str
    user_id: int



class IntegrationResponse(IntegrationBase):
    id: int
    platform_user_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LinkedInAuthURLResponse(BaseModel):
    authorization_url: str

class LinkedInCallbackRequest(BaseModel):
    code: str
    state: str

class LinkedInPublishRequest(BaseModel):
    text: str
    article_url: Optional[str] = None  # Optional URL to share as an article with link preview

# Indeed Integration Schemas
class IndeedAuthURLResponse(BaseModel):
    authorization_url: str

class IndeedCallbackRequest(BaseModel):
    code: str
    state: str

class IndeedJobPostRequest(BaseModel):
    title: str
    description: str
    location: str
    company: str

