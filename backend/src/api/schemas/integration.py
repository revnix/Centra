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
