from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class AttendanceBreak(Base):
    __tablename__ = "attendance_breaks"

    id = Column(Integer, primary_key=True)

    session_id = Column(
        Integer,
        ForeignKey("attendance_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    break_start_at = Column(DateTime(timezone=True), nullable=False)
    break_end_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session = relationship("AttendanceSession", back_populates="breaks")
