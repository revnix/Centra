from __future__ import annotations

from datetime import date, datetime, time

from pydantic import BaseModel, Field


class ShiftTemplateCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    start_time: time
    end_time: time
    grace_minutes: int = 0
    break_allowed: bool = True
    break_max_minutes: int | None = None


class ShiftTemplateResponse(BaseModel):
    id: int
    name: str
    start_time: time
    end_time: time
    grace_minutes: int
    break_allowed: bool
    break_max_minutes: int | None

    class Config:
        from_attributes = True


class EmployeeShiftResponse(BaseModel):
    employee_profile_id: int
    effective_from: date
    shift: ShiftTemplateResponse

    class Config:
        from_attributes = True


class AttendanceSessionResponse(BaseModel):
    id: int
    user_id: int
    work_date: date
    shift_id: int | None
    check_in_at: datetime | None
    check_out_at: datetime | None
    status: str
    total_break_minutes: int
    late_minutes: int
    overtime_minutes: int

    class Config:
        from_attributes = True


class AttendanceActionResponse(BaseModel):
    session: AttendanceSessionResponse
