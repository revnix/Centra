from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum as SqlEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.api.db.base import Base
import enum

class OnboardingStatus(str, enum.Enum):
    PENDING_CANDIDATE_JOINING = "PENDING_CANDIDATE_JOINING"
    PENDING_HR_DETAILS = "PENDING_HR_DETAILS"
    PENDING_CANDIDATE_DOCS = "PENDING_CANDIDATE_DOCS"
    PENDING_HR_DOCS = "PENDING_HR_DOCS"
    PENDING_IT_SETUP = "PENDING_IT_SETUP"
    PENDING_INDUCTION = "PENDING_INDUCTION"
    COMPLETED = "COMPLETED"

class ShiftTiming(str, enum.Enum):
    SHIFT_1 = "1st Shift"
    SHIFT_2 = "2nd Shift"
    SHIFT_3 = "3rd Shift"

class Onboarding(Base):
    __tablename__ = "onboardings"

    id = Column(Integer, primary_key=True, index=True)
    
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    onboarding_token = Column(String, unique=True, nullable=True, index=True)
    
    status = Column(SqlEnum(OnboardingStatus), default=OnboardingStatus.PENDING_CANDIDATE_JOINING, nullable=False)
    
    # Candidate details
    joining_date = Column(DateTime(timezone=True), nullable=True)
    reporting_time = Column(String(50), nullable=True)
    office_location = Column(String(255), nullable=True)
    shift_timing = Column(SqlEnum(ShiftTiming), nullable=True)
    
    # Documents
    doc_front_picture_url = Column(String, nullable=True)
    doc_id_card_url = Column(String, nullable=True)
    doc_salary_slip_url = Column(String, nullable=True)
    doc_experience_letter_url = Column(String, nullable=True)
    doc_educational_documents_url = Column(String, nullable=True)
    doc_police_clearance_url = Column(String, nullable=True)
    doc_resume_url = Column(String, nullable=True)
    doc_additional_files_json = Column(String, nullable=True) # Stores JSON list of URLs
    
    # Personal Info (Added for new UI)
    cnic_number = Column(String(50), nullable=True)
    phone_number = Column(String(50), nullable=True)
    current_address = Column(String, nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    bank_name = Column(String(100), nullable=True)
    bank_iban = Column(String(100), nullable=True)
    
    # HR verification
    hr_verified = Column(Boolean, default=False)
    
    # IT Setup
    it_slack_setup = Column(Boolean, default=False)
    it_gmail_setup = Column(Boolean, default=False)
    it_browser_extensions = Column(Boolean, default=False)
    it_gmail_signature = Column(Boolean, default=False)
    it_bordio_access = Column(Boolean, default=False)
    it_office365_access = Column(Boolean, default=False)
    
    # Post-Onboarding (Day 1 Induction)
    # HR Induction Checklist
    ind_hr_welcome_session = Column(Boolean, default=False)
    ind_hr_handbook_shared = Column(Boolean, default=False)
    ind_hr_policies_explained = Column(Boolean, default=False)
    
    # IT Induction Checklist
    ind_it_credentials_provided = Column(Boolean, default=False)
    ind_it_security_induction = Column(Boolean, default=False)
    
    # Manager/Team Induction Checklist
    ind_manager_buddy_assigned = Column(Boolean, default=False)
    ind_manager_team_intro = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    application = relationship("Application", backref="onboarding", uselist=False, passive_deletes=True)
    user = relationship("User", backref="onboardings")

class OnboardingDocument(Base):
    __tablename__ = "onboarding_documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_url = Column(String, nullable=False)
    file_type = Column(String(50), nullable=False) # pdf, image, doc
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    application = relationship("Application", backref="uploaded_onboarding_documents")
