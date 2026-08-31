from __future__ import annotations

from sqlalchemy import Column, Date, DateTime, Integer, String
from sqlalchemy.sql import func

from src.app.db.base import Base


class PublicHoliday(Base):
    """Company-wide holiday calendar — v1 has no department scoping
    (see ATTENDANCE_IMPLEMENTATION_PLAN.md Phase 0's decision on this)."""

    __tablename__ = "public_holidays"

    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False, unique=True, index=True)
    name = Column(String(200), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
