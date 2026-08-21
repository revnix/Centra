from __future__ import annotations

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    __table_args__ = (
        UniqueConstraint("user_id", "work_date", name="uq_attendance_session_user_work_date"),
    )

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    work_date = Column(Date, nullable=False, index=True)

    shift_id = Column(Integer, ForeignKey("shift_templates.id", ondelete="SET NULL"), nullable=True, index=True)

    check_in_at = Column(DateTime(timezone=True), nullable=True)
    check_out_at = Column(DateTime(timezone=True), nullable=True)

    status = Column(String(32), default="OPEN", nullable=False)

    total_break_minutes = Column(Integer, default=0, nullable=False)
    late_minutes = Column(Integer, default=0, nullable=False)
    overtime_minutes = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user = relationship("User")
    shift = relationship("ShiftTemplate")
    breaks = relationship(
        "AttendanceBreak",
        back_populates="session",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
