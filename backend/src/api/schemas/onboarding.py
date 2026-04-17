from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime
from src.api.models.onboarding import OnboardingStatus, ShiftTiming

class OnboardingBase(BaseModel):
    pass

class CandidateOnboardingUpdate(BaseModel):
    joining_date: datetime

class HRJoiningDetailsUpdate(BaseModel):
    reporting_time: str
    office_location: str
    shift_timing: ShiftTiming

# Schemas for dealing with document URLs
class CandidateDocumentUpload(BaseModel):
    doc_front_picture_url: Optional[str] = None
    doc_id_card_url: Optional[str] = None
    doc_salary_slip_url: Optional[str] = None
    doc_experience_letter_url: Optional[str] = None

class HROnboardingVerify(BaseModel):
    hr_verified: bool
    reject_reason: Optional[str] = None

class ITOnboardingUpdate(BaseModel):
    it_slack_setup: Optional[bool] = None
    it_gmail_setup: Optional[bool] = None
    it_browser_extensions: Optional[bool] = None
    it_gmail_signature: Optional[bool] = None
    it_bordio_access: Optional[bool] = None
    it_office365_access: Optional[bool] = None

class HRInductionUpdate(BaseModel):
    ind_hr_welcome_session: Optional[bool] = None
    ind_hr_handbook_shared: Optional[bool] = None
    ind_hr_policies_explained: Optional[bool] = None

class ITInductionUpdate(BaseModel):
    ind_it_credentials_provided: Optional[bool] = None
    ind_it_security_induction: Optional[bool] = None

class ManagerInductionUpdate(BaseModel):
    ind_manager_buddy_assigned: Optional[bool] = None
    ind_manager_team_intro: Optional[bool] = None

class OnboardingResponse(BaseModel):
    id: int
    application_id: int
    user_id: int
    status: OnboardingStatus
    
    joining_date: Optional[datetime] = None
    reporting_time: Optional[str] = None
    office_location: Optional[str] = None
    shift_timing: Optional[ShiftTiming] = None
    
    doc_front_picture_url: Optional[str] = None
    doc_id_card_url: Optional[str] = None
    doc_salary_slip_url: Optional[str] = None
    doc_experience_letter_url: Optional[str] = None
    
    hr_verified: bool
    
    it_slack_setup: bool
    it_gmail_setup: bool
    it_browser_extensions: bool
    it_gmail_signature: bool
    it_bordio_access: bool
    it_office365_access: bool
    
    ind_hr_welcome_session: bool
    ind_hr_handbook_shared: bool
    ind_hr_policies_explained: bool
    ind_it_credentials_provided: bool
    ind_it_security_induction: bool
    ind_manager_buddy_assigned: bool
    ind_manager_team_intro: bool
    
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
