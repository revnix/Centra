from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.api.db.base import Base
from datetime import datetime, timezone

class CandidateProfile(Base):
    """
    Candidate Profile Model
    Extends the base User model with candidate-specific information.
    """
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    resume_url = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)
    
    skills = Column(ARRAY(String), default=list, nullable=False)
    experience_years = Column(Integer, default=0)
    bio = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    # Relationships
    user = relationship("User", backref="candidate_profiles") # Changing backref to candidate_profiles (plural) or using uselist=False
    # Actually, better to configure it explicitly on User or here with uselist=False
    user = relationship("User", back_populates="candidate_profile")
