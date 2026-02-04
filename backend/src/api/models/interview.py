from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Enum as SqlEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.api.db.base import Base
import enum

class InterviewStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    CODING = "CODING"
    SUBMITTED = "SUBMITTED"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"

class InterviewSession(Base):
    """
    Interview Session Model
    Tracks a specific AI interview instance for an application.
    """
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Link to Application
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Security
    token = Column(String, unique=True, index=True, nullable=False, comment="Secure token for guest access")
    
    # State
    status = Column(SqlEnum(InterviewStatus), default=InterviewStatus.PENDING, nullable=False)
    
    # Data
    transcript = Column(JSON, default=list, nullable=False, comment="Full chat history")
    state = Column(JSON, default=dict, nullable=False, comment="Internal AI state (current skill, stage, etc)")
    code_submission = Column(Text, nullable=True, comment="Final code submission if applicable")
    
    # Scoring
    overall_score = Column(Float, nullable=True)
    technical_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    application = relationship("Application", backref="interview_session")
