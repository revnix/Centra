from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Time
from sqlalchemy.sql import func

from src.app.db.base import Base


class ShiftTemplate(Base):
    __tablename__ = "shift_templates"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), unique=True, index=True, nullable=False)

    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    grace_minutes = Column(Integer, default=0, nullable=False)

    break_allowed = Column(Boolean, default=True, nullable=False)
    break_max_minutes = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
