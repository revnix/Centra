from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.modules.attendance.models.session import AttendanceSession
from src.app.modules.platform.org.models.department import Department
from src.app.modules.people.models.employee_profile import EmployeeProfile
from src.app.modules.recruiting.models.job import Posts
from src.app.modules.recruiting.models.application import Application


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DashboardSummaryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_is_lead(self, user_id: int) -> bool:
        res = await self.db.execute(select(func.count()).select_from(Department).where(Department.lead_user_id == user_id))
        return int(res.scalar() or 0) > 0

    async def employee_summary_14d(self, user_id: int, *, today: date) -> dict:
        start = today - timedelta(days=13)

        res = await self.db.execute(
            select(AttendanceSession)
            .where(
                and_(
                    AttendanceSession.user_id == user_id,
                    AttendanceSession.work_date >= start,
                    AttendanceSession.work_date <= today,
                )
            )
        )
        sessions = {s.work_date: s for s in res.scalars().all()}

        worked_series: list[dict] = []
        late_series: list[dict] = []

        for i in range(14):
            d = start + timedelta(days=i)
            s = sessions.get(d)
            worked = 0
            late = 0
            brk = 0
            ot = 0
            status = None
            check_in_at = None
            check_out_at = None

            if s:
                status = s.status
                late = int(s.late_minutes or 0)
                brk = int(s.total_break_minutes or 0)
                ot = int(s.overtime_minutes or 0)
                check_in_at = s.check_in_at.isoformat() if s.check_in_at else None
                check_out_at = s.check_out_at.isoformat() if s.check_out_at else None
                if s.check_in_at and s.check_out_at:
                    worked = int((s.check_out_at - s.check_in_at).total_seconds() // 60) - brk
                    worked = max(0, worked)

            worked_series.append({"day": d, "value": worked})
            late_series.append({"day": d, "value": late})

            if d == today:
                today_obj = {
                    "work_date": d,
                    "status": status,
                    "check_in_at": check_in_at,
                    "check_out_at": check_out_at,
                    "late_minutes": late,
                    "break_minutes": brk,
                    "overtime_minutes": ot,
                }

        return {
            "attendance_today": today_obj if sessions.get(today) else None,
            "worked_minutes_14d": worked_series,
            "late_minutes_14d": late_series,
        }

    async def lead_team_today(self, lead_user_id: int, *, today: date) -> dict:
        dept_res = await self.db.execute(select(Department.id).where(Department.lead_user_id == lead_user_id))
        dept_ids = [int(x) for x in dept_res.scalars().all()]
        if not dept_ids:
            return {
                "team_today": {
                    "total_members": 0,
                    "checked_in": 0,
                    "checked_out": 0,
                    "not_checked_in": 0,
                },
                "team_late_today": 0,
            }

        prof_res = await self.db.execute(
            select(EmployeeProfile.user_id)
            .where(EmployeeProfile.department_id.in_(dept_ids))
        )
        user_ids = [int(x) for x in prof_res.scalars().all()]
        total_members = len(user_ids)
        if not user_ids:
            return {
                "team_today": {
                    "total_members": 0,
                    "checked_in": 0,
                    "checked_out": 0,
                    "not_checked_in": 0,
                },
                "team_late_today": 0,
            }

        sess_res = await self.db.execute(
            select(AttendanceSession)
            .where(
                and_(
                    AttendanceSession.work_date == today,
                    AttendanceSession.user_id.in_(user_ids),
                )
            )
        )
        sessions = list(sess_res.scalars().all())

        checked_in = sum(1 for s in sessions if s.check_in_at is not None)
        checked_out = sum(1 for s in sessions if s.check_out_at is not None)
        late = sum(1 for s in sessions if int(s.late_minutes or 0) > 0)
        not_checked_in = max(0, total_members - checked_in)

        return {
            "team_today": {
                "total_members": total_members,
                "checked_in": checked_in,
                "checked_out": checked_out,
                "not_checked_in": not_checked_in,
            },
            "team_late_today": late,
        }

    async def hr_admin_summary(self) -> dict:
        employees_total = int(
            (await self.db.execute(select(func.count()).select_from(EmployeeProfile))).scalar() or 0
        )
        departments_total = int(
            (await self.db.execute(select(func.count()).select_from(Department))).scalar() or 0
        )
        jobs_total = int((await self.db.execute(select(func.count()).select_from(Posts))).scalar() or 0)
        applications_total = int(
            (await self.db.execute(select(func.count()).select_from(Application))).scalar() or 0
        )

        return {
            "employees_total": employees_total,
            "departments_total": departments_total,
            "jobs_total": jobs_total,
            "applications_total": applications_total,
        }
