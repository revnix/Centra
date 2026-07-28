from sqlalchemy import Column, Integer, String, Float, Text, JSON, ForeignKey, DateTime, Index
from sqlalchemy import types as sa_types
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.api.db.base import Base
import enum


class _LenientEnum(sa_types.TypeDecorator):
    """Enum column that returns the raw string instead of crashing on unknown DB values."""
    impl = sa_types.String(50)
    cache_ok = True

    def __init__(self, enum_cls):
        super().__init__()
        self.enum_cls = enum_cls

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, self.enum_cls):
            return value.value
        # Strings must be valid enum values — reject anything else so bad
        # data (e.g. email statuses like 'SENT') can never reach this column.
        return self.enum_cls(str(value)).value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            return self.enum_cls(value)
        except ValueError:
            return value  # unknown/corrupted DB value — return raw string, don't crash


class ApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    SCREENING = "SCREENING"
    SCREENING_TEST = "SCREENING_TEST"
    SHORTLISTED = "SHORTLISTED"
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    INTERVIEW_INVITED = "INTERVIEW_INVITED"
    RESPONDED = "RESPONDED"
    INTERVIEW_PENDING = "INTERVIEW_PENDING"
    INTERVIEW_IN_PROGRESS = "INTERVIEW_IN_PROGRESS"
    INTERVIEW_COMPLETED = "INTERVIEW_COMPLETED"
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
    status = Column(_LenientEnum(ApplicationStatus), default=ApplicationStatus.APPLIED, nullable=False, index=True)
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

    # Gmail import tracking — set when this application was created by the
    # /gmail/sync-applications importer, so the same email is never re-imported
    # as a duplicate if a later sync matches it to a different job.
    gmail_message_id = Column(String(255), nullable=True, unique=True, index=True, comment="Gmail message ID this application was imported from, if any")
    
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
    interview_schedule = relationship("InterviewSchedule", back_populates="application", uselist=False, cascade="all, delete-orphan")

