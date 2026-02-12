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
    
    # Email Delivery Status
    email_delivery_status = Column(String(50), default="PENDING", index=True, comment="Email status: PENDING, SENT, FAILED")
    email_logs = Column(Text, nullable=True, comment="Failure reasons or SMTP logs")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    job = relationship("Posts", backref="applications")
    candidate = relationship("User", backref="applications")
    interview_session = relationship("InterviewSession", back_populates="application", uselist=False, cascade="all, delete-orphan")
