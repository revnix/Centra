"""
Interview Schedule, Panelist, and Feedback Models

Human-led interview scheduling panel that sits alongside the AI interview
session flow. HR schedules a date/time, assigns panelists (existing
admin/reviewer users), and each panelist submits structured feedback.
"""

import enum
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey,
    Enum as SqlEnum, CheckConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.api.db.base import Base


class ScheduleStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    RESCHEDULED = "RESCHEDULED"


class HireRecommendation(str, enum.Enum):
    STRONG_YES = "STRONG_YES"
    YES = "YES"
    MAYBE = "MAYBE"
    NO = "NO"
    STRONG_NO = "STRONG_NO"


class InterviewSchedule(Base):
    """
    Tracks a human-led interview for a specific application.
    One schedule per application (unique constraint on application_id).
    """
    __tablename__ = "interview_schedules"

    id = Column(Integer, primary_key=True, index=True)

    # Link to Application
    application_id = Column(
        Integer,
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Scheduling details
    scheduled_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Interview date and time (tz-aware)",
    )
    duration_minutes = Column(
        Integer,
        default=60,
        nullable=False,
        comment="Expected duration in minutes",
    )
    location = Column(
        String(255),
        nullable=True,
        comment='Physical location or platform, e.g. "Office – Room 3" or "Zoom"',
    )
    meeting_link = Column(
        String(1024),
        nullable=True,
        comment="Video call URL, if any",
    )
    notes = Column(
        Text,
        nullable=True,
        comment="Internal HR notes visible only to the panel",
    )

    # Lifecycle
    status = Column(
        SqlEnum(ScheduleStatus),
        default=ScheduleStatus.SCHEDULED,
        nullable=False,
        index=True,
    )

    # Audit
    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="HR user who created the schedule",
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    application = relationship(
        "Application",
        back_populates="interview_schedule",
    )
    creator = relationship(
        "User",
        foreign_keys=[created_by],
    )
    panelists = relationship(
        "InterviewPanelist",
        back_populates="schedule",
        cascade="all, delete-orphan",
    )
    feedback_entries = relationship(
        "InterviewFeedback",
        back_populates="schedule",
        cascade="all, delete-orphan",
    )


class InterviewPanelist(Base):
    """
    Maps an existing admin/reviewer User to an InterviewSchedule.
    """
    __tablename__ = "interview_panelists"

    id = Column(Integer, primary_key=True, index=True)

    schedule_id = Column(
        Integer,
        ForeignKey("interview_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    schedule = relationship("InterviewSchedule", back_populates="panelists")
    user = relationship("User", foreign_keys=[user_id])


class InterviewFeedback(Base):
    """
    Structured feedback submitted by a panel member after a human interview.
    Each panelist may submit exactly one feedback entry per schedule.
    """
    __tablename__ = "interview_feedback"

    id = Column(Integer, primary_key=True, index=True)

    schedule_id = Column(
        Integer,
        ForeignKey("interview_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    panelist_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Ratings (1–5 stars)
    overall_rating = Column(
        Integer,
        nullable=False,
        comment="1–5 overall impression",
    )
    technical_rating = Column(
        Integer,
        nullable=True,
        comment="1–5 technical competency",
    )
    communication_rating = Column(
        Integer,
        nullable=True,
        comment="1–5 communication skills",
    )
    culture_fit_rating = Column(
        Integer,
        nullable=True,
        comment="1–5 cultural alignment",
    )

    # Hire decision
    recommendation = Column(
        SqlEnum(HireRecommendation),
        nullable=False,
    )

    # Free-text fields
    strengths = Column(Text, nullable=True, comment="Candidate strengths observed")
    concerns = Column(Text, nullable=True, comment="Areas of concern or gaps")
    notes = Column(Text, nullable=True, comment="Additional panelist notes")

    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Constraints: ratings must be 1–5
    __table_args__ = (
        CheckConstraint("overall_rating BETWEEN 1 AND 5", name="ck_feedback_overall_rating"),
        CheckConstraint(
            "technical_rating IS NULL OR technical_rating BETWEEN 1 AND 5",
            name="ck_feedback_technical_rating",
        ),
        CheckConstraint(
            "communication_rating IS NULL OR communication_rating BETWEEN 1 AND 5",
            name="ck_feedback_communication_rating",
        ),
        CheckConstraint(
            "culture_fit_rating IS NULL OR culture_fit_rating BETWEEN 1 AND 5",
            name="ck_feedback_culture_fit_rating",
        ),
    )

    # Relationships
    schedule = relationship("InterviewSchedule", back_populates="feedback_entries")
    panelist = relationship("User", foreign_keys=[panelist_id])
