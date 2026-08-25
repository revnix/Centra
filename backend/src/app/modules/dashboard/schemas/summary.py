from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class TimeseriesPoint(BaseModel):
    day: date
    value: int


class EmployeeAttendanceToday(BaseModel):
    work_date: date
    status: str | None
    check_in_at: str | None
    check_out_at: str | None
    late_minutes: int
    break_minutes: int
    overtime_minutes: int


class EmployeeDashboardSummary(BaseModel):
    attendance_today: EmployeeAttendanceToday | None
    worked_minutes_14d: list[TimeseriesPoint]
    late_minutes_14d: list[TimeseriesPoint]


class LeadTeamTodayCounts(BaseModel):
    total_members: int
    checked_in: int
    checked_out: int
    not_checked_in: int


class LeadDashboardSummary(BaseModel):
    team_today: LeadTeamTodayCounts
    team_late_today: int


class HrAdminDashboardSummary(BaseModel):
    employees_total: int
    departments_total: int
    jobs_total: int
    applications_total: int


class DashboardSummaryResponse(BaseModel):
    role: str
    is_lead: bool
    range: str

    employee: EmployeeDashboardSummary | None = None
    lead: LeadDashboardSummary | None = None
    hr_admin: HrAdminDashboardSummary | None = None
