# src/api/models/job.py

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from src.api.db.base import Base
from datetime import datetime, timezone
import enum


class JobType(str, enum.Enum):
    """Job type enumeration"""
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    TEMPORARY = "temporary"
    INTERNSHIP = "internship"
    VOLUNTEER = "volunteer"
    FREELANCE = "freelance"


class JobStatus(str, enum.Enum):
    """Job status enumeration"""
    DRAFT = "draft"
    PENDING = "pending"
    PUBLISHED = "published"
    CLOSED = "closed"
    ARCHIVED = "archived"


class ExperienceLevel(str, enum.Enum):
    """Experience level enumeration"""
    ENTRY_LEVEL = "entry_level"
    ASSOCIATE = "associate"
    MID_SENIOR = "mid_senior"
    DIRECTOR = "director"
    EXECUTIVE = "executive"


class Posts(Base):
    """
    Job Model
    
    Stores job postings that can be published to various social media platforms.
    """
    __tablename__ = "posts"

    # FIXED: Changed from UUID to Integer
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Basic Job Information
    title = Column(String(500), nullable=False, index=True, comment="Job title")
    description = Column(Text, nullable=False, comment="Full job description")
    short_description = Column(String(500), nullable=True, comment="Short summary for social media")
    
    # Location
    location = Column(String(500), nullable=True, comment="Job location (city, state, country)")
    is_remote = Column(Boolean, default=False, nullable=False, comment="Is this a remote position?")
    location_type = Column(String(50), nullable=True, comment="on_site, remote, hybrid")
    
    # Job Details
    job_type = Column(SQLEnum(JobType), nullable=False, default=JobType.FULL_TIME, comment="Type of employment")
    experience_level = Column(SQLEnum(ExperienceLevel), nullable=True, comment="Required experience level")
    department = Column(String(200), nullable=True, comment="Department or team")
    
    # Compensation
    salary_min = Column(Integer, nullable=True, comment="Minimum salary")
    salary_max = Column(Integer, nullable=True, comment="Maximum salary")
    salary_currency = Column(String(10), default="USD", nullable=False, comment="Currency code")
    salary_period = Column(String(20), nullable=True, comment="hourly, monthly, yearly")
    salary_range = Column(String(200), nullable=True, comment="Formatted salary range for display")
    
    # Application
    application_url = Column(String(1000), nullable=True, comment="URL to apply for the job")
    application_email = Column(String(255), nullable=True, comment="Email to send applications")
    application_deadline = Column(DateTime(timezone=True), nullable=True, comment="Application deadline")
    
    # Skills and Requirements
    required_skills = Column(JSON, nullable=True, comment="Required skills")
    preferred_skills = Column(JSON, nullable=True, comment="Preferred skills")
    benefits = Column(JSON, nullable=True, comment="Job benefits")
    
    # Status and Publishing
    status = Column(SQLEnum(JobStatus), nullable=False, default=JobStatus.DRAFT, index=True, comment="Current status")
    published_at = Column(DateTime(timezone=True), nullable=True, comment="When the job was first published")
    expires_at = Column(DateTime(timezone=True), nullable=True, comment="When the job listing expires")
    
    # Company Information
    company_name = Column(String(255), nullable=True, comment="Hiring company name")
    company_logo_url = Column(String(1000), nullable=True, comment="Company logo URL")
    company_website = Column(String(1000), nullable=True, comment="Company website")
    
    # SEO and Metadata
    slug = Column(String(500), nullable=True, unique=True, index=True, comment="URL-friendly slug")
    meta_title = Column(String(200), nullable=True, comment="SEO meta title")
    meta_description = Column(String(500), nullable=True, comment="SEO meta description")
    tags = Column(JSON, nullable=True, comment="Tags for categorization")
    
    # Additional Data
    metadata_json = Column(JSON, nullable=True, comment="Additional metadata including publications history")
    
    # Tracking
    view_count = Column(Integer, default=0, nullable=False, comment="Number of views")
    application_count = Column(Integer, default=0, nullable=False, comment="Number of applications")
    
    # FIXED: Changed from UUID to Integer to match users.id
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    creator = relationship("User", back_populates="jobs", foreign_keys=[created_by])

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,  # FIXED: No longer converting to string
            "title": self.title,
            "description": self.description,
            "short_description": self.short_description,
            "location": self.location,
            "is_remote": self.is_remote,
            "location_type": self.location_type,
            "job_type": self.job_type.value if self.job_type else None,
            "experience_level": self.experience_level.value if self.experience_level else None,
            "department": self.department,
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "salary_currency": self.salary_currency,
            "salary_period": self.salary_period,
            "salary_range": self.salary_range,
            "application_url": self.application_url,
            "application_email": self.application_email,
            "application_deadline": self.application_deadline.isoformat() if self.application_deadline else None,
            "required_skills": self.required_skills,
            "preferred_skills": self.preferred_skills,
            "benefits": self.benefits,
            "status": self.status.value if self.status else None,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "company_name": self.company_name,
            "company_logo_url": self.company_logo_url,
            "company_website": self.company_website,
            "slug": self.slug,
            "meta_title": self.meta_title,
            "meta_description": self.meta_description,
            "tags": self.tags,
            "metadata_json": self.metadata_json,
            "view_count": self.view_count,
            "application_count": self.application_count,
            "created_by": self.created_by,  # FIXED: No longer converting to string
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
        }
    
    def get_formatted_salary(self):
        """Get formatted salary range"""
        if self.salary_range:
            return self.salary_range
        
        if self.salary_min and self.salary_max:
            return f"{self.salary_currency} {self.salary_min:,} - {self.salary_max:,} {self.salary_period or 'per year'}"
        elif self.salary_min:
            return f"{self.salary_currency} {self.salary_min:,}+ {self.salary_period or 'per year'}"
        
        return None
    
    def get_location_display(self):
        """Get formatted location string"""
        if self.is_remote:
            return f"Remote" + (f" ({self.location})" if self.location else "")
        return self.location or "Location not specified"
