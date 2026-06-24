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

# WhatsApp Integration Schemas
class WhatsAppSendMessageRequest(BaseModel):
    to: str
    message: str

class WhatsAppSendTemplateRequest(BaseModel):
    to: str
    template_name: str
    language_code: str = "en_US"
    components: list = []

class WhatsAppStatusResponse(BaseModel):
    connected: bool
    phone_number_id: str | None = None
    waba_id: str | None = None

class WhatsAppConnectRequest(BaseModel):
    phone_number_id: str
    waba_id: str
    access_token: str
    verify_token: str

