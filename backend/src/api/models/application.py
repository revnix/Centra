from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Enum as SqlEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.api.db.base import Base
import enum

class ApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    SCREENING = "SCREENING"
    SHORTLISTED = "SHORTLISTED"
    INTERVIEW_INVITED = "INTERVIEW_INVITED"
    INTERVIEW_PENDING = "INTERVIEW_PENDING" # Keeping for backward compatibility
    INTERVIEW_IN_PROGRESS = "INTERVIEW_IN_PROGRESS"
    INTERVIEW_COMPLETED = "INTERVIEW_COMPLETED"
    OFFER = "OFFER"
    REJECTED = "REJECTED"
    HIRED = "HIRED"
    ONBOARDING = "ONBOARDING"
    WITHDRAWN = "WITHDRAWN"

class Application(Base):
    """
    Application Model
    Links a Candidate (User) to a Job (Posts).
    """
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    job_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
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
    email_logs = Column(Text, nullable=True, comment="Failure reasons or SMTP logs")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    job = relationship("Posts", backref="applications")
    candidate = relationship("User", backref="applications")
    interview_session = relationship("InterviewSession", back_populates="application", uselist=False, cascade="all, delete-orphan")
