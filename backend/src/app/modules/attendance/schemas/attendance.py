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


class AssignShiftRequest(BaseModel):
    shift_id: int
    effective_from: date


class AssignShiftBulkRequest(BaseModel):
    """Phase 7 (rollout) — assign one shift template to many employees at
    once, instead of one `POST /employees/{id}/shift` call per person."""

    employee_profile_ids: list[int] = Field(min_length=1)
    effective_from: date


class UnassignedEmployeeResponse(BaseModel):
    """One row of the Phase 7 rollout checklist: an active employee with a
    profile but no shift assignment yet — their `In` button won't work
    until this is fixed."""

    employee_profile_id: int
    user_id: int
    full_name: str | None
    email: str


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


class AttendanceSessionWithEmployeeResponse(AttendanceSessionResponse):
    """Same as AttendanceSessionResponse, plus who the session belongs to —
    for the HR/admin company-wide view (there is no per-employee context
    to infer this from, unlike /attendance/me)."""

    full_name: str | None = None
    department_name: str | None = None


class CorrectionRequestCreate(BaseModel):
    work_date: date
    action: str = Field(pattern="^(IN|OUT|BREAK|BACK)$")
    requested_time: datetime
    reason: str | None = None


class CorrectionResponse(BaseModel):
    id: int
    user_id: int
    work_date: date
    action: str
    requested_time: datetime
    reason: str | None
    status: str
    reviewed_by: int | None
    reviewed_at: datetime | None
    created_at: datetime
    full_name: str | None = None

    class Config:
        from_attributes = True


class MonthlySummaryResponse(BaseModel):
    """On-read monthly attendance summary (Phase 4) — nothing here is
    stored; it's computed from sessions + public holidays + the Phase 5
    capped worked-minutes formula each time this is requested."""

    user_id: int
    year: int
    month: int
    working_days: int
    actual_hours: float
    total_hours: float
    difference: float
    days_present: int
    days_on_leave: int
