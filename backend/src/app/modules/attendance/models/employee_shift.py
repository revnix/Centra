from __future__ import annotations

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class EmployeeShiftAssignment(Base):
    __tablename__ = "employee_shift_assignments"
    __table_args__ = (
        UniqueConstraint(
            "employee_profile_id",
            "effective_from",
            name="uq_employee_shift_assignment_employee_effective_from",
        ),
    )

    id = Column(Integer, primary_key=True)

    employee_profile_id = Column(
        Integer,
        ForeignKey("employee_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    shift_id = Column(
        Integer,
        ForeignKey("shift_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    effective_from = Column(Date, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    employee_profile = relationship("EmployeeProfile")
    shift = relationship("ShiftTemplate")
