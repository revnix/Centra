from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.api.db.base import Base

class CandidateProfile(Base):
    """
    Candidate Profile Model
    Extends the base User model with candidate-specific information.
    """
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    resume_url = Column(String, nullable=True)
    resume_file_id = Column(String, nullable=True)          # Google Drive file ID (or None)
    resume_storage_provider = Column(String, nullable=True)  # 'google_drive' | 'cloudinary' | None
    linkedin_url = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)

    skills = Column(ARRAY(String), default=list, nullable=False)
    experience_years = Column(Integer, default=0)
    bio = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


    user = relationship("User", back_populates="candidate_profile")
