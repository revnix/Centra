from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import Date as SqlDate

from src.app.db.base import Base


class AttendanceCorrection(Base):
    """An employee's request to apply a clock action to a past date.

    Never writes to AttendanceSession/AttendanceBreak directly — sits in
    PENDING until an admin/hr user approves or rejects it, so there's
    always a record of who asked for what and who decided it (see
    ATTENDANCE_IMPLEMENTATION_PLAN.md Phase 0's decision on this).
    """

    __tablename__ = "attendance_corrections"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    work_date = Column(SqlDate, nullable=False)

    # "IN" | "OUT" | "BREAK" | "BACK"
    action = Column(String(16), nullable=False)
    requested_time = Column(DateTime(timezone=True), nullable=False)
    reason = Column(Text, nullable=True)

    # PENDING | APPROVED | REJECTED
    status = Column(String(16), default="PENDING", nullable=False, index=True)

    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
