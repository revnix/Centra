from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Enum as SqlEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.api.db.base import Base
import enum

class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW_PENDING = "interview_pending"
    INTERVIEW_IN_PROGRESS = "interview_in_progress"
    INTERVIEW_COMPLETED = "interview_completed"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"

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
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    job = relationship("Posts", backref="applications")
    candidate = relationship("User", backref="applications")
