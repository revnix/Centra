from sqlalchemy import Column, Integer, String, Float, Text, JSON, ForeignKey, DateTime, Enum as SqlEnum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.api.db.base import Base
import enum

class ApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    SCREENING = "SCREENING"
    SHORTLISTED = "SHORTLISTED"
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    INTERVIEW_INVITED = "INTERVIEW_INVITED"  # Used when interview invite is sent / candidate has replied
    INTERVIEW_PENDING = "INTERVIEW_PENDING"  # Kept for backward compatibility
    INTERVIEW_IN_PROGRESS = "INTERVIEW_IN_PROGRESS"
    INTERVIEW_COMPLETED = "INTERVIEW_COMPLETED"
    RESPONDED = "RESPONDED"
    REJECTED = "REJECTED"
    REFERENCE_CHECK = "REFERENCE_CHECK"
    OFFER_EXTENDED = "OFFER_EXTENDED"
    OFFER = "OFFER"
    OFFER_ACCEPTED = "OFFER_ACCEPTED"
    ONBOARDING = "ONBOARDING"
    HIRED = "HIRED"
    WITHDRAWN = "WITHDRAWN"

class Application(Base):
    """
    Application Model
    Links a Candidate (User) to a Job (Posts).
    """
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    job_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)  # ✨ OPTIMIZATION
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)  # ✨ OPTIMIZATION
    
    # Status & AI Scoring
    status = Column(SqlEnum(ApplicationStatus), default=ApplicationStatus.APPLIED, nullable=False, index=True)
    match_score = Column(Float, nullable=True, comment="AI compatibility score (0-100)")
    ai_feedback = Column(Text, nullable=True, comment="AI summary of the application")
    
    # Application details
    cover_letter = Column(Text, nullable=True)
    phone_number = Column(String(50), nullable=True)
    source = Column(String(50), default="web", index=True, comment="Source: web, linkedin, indeed, agent, etc.")
    city = Column(String(100), nullable=True, comment="Candidate's city")
    qualification = Column(String(200), nullable=True, comment="Highest qualification")
    
    # Salary
    expected_salary = Column(Float, nullable=True, comment="Candidate's expected salary")
    salary_filter_status = Column(String(50), nullable=True, comment="within_budget | above_budget | not_checked")

    # Email Delivery Status
    email_delivery_status = Column(String(50), default="PENDING", index=True, comment="Email status: PENDING, SENT, FAILED, SKIPPED")
    email_logs = Column(JSON, nullable=True, comment="Failure reasons or SMTP logs")
    
    # Interview Tracking
    interview_invitation_status = Column(String(50), default="NOT_SENT", index=True, comment="Status of interview invite: NOT_SENT, SENT, DELIVERED, OPENED, RESPONDED, NOT_RESPONDED, DECLINED")
    last_interview_invite_id = Column(String(255), nullable=True, index=True, comment="Resend message ID for the last interview invite")
    interview_invite_sent_at = Column(DateTime(timezone=True), nullable=True, index=True, comment="Timestamp of the last interview invitation sent")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)  # ✨ OPTIMIZATION — ORDER BY created_at DESC on every list call
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index('ix_applications_job_id_status', 'job_id', 'status'),
        Index('ix_applications_candidate_status', 'candidate_id', 'status'),
        Index('ix_applications_job_id_created_at', 'job_id', 'created_at'),
    )

    # Relationships
    job = relationship("Posts", backref="applications")
    candidate = relationship("User", backref="applications")
    interview_session = relationship("InterviewSession", back_populates="application", uselist=False, cascade="all, delete-orphan")
    screening_test = relationship("ScreeningTest", back_populates="application", uselist=False, cascade="all, delete-orphan")
