from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.modules.attendance.models.breaks import AttendanceBreak
from src.app.modules.attendance.models.employee_shift import EmployeeShiftAssignment
from src.app.modules.attendance.models.session import AttendanceSession
from src.app.modules.attendance.models.shift import ShiftTemplate
from src.app.modules.people.models.employee_profile import EmployeeProfile


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _minutes(delta: timedelta) -> int:
    return max(0, int(delta.total_seconds() // 60))


class AttendanceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_employee_profile(self, user_id: int) -> EmployeeProfile | None:
        res = await self.db.execute(select(EmployeeProfile).where(EmployeeProfile.user_id == user_id))
        return res.scalars().first()

    async def get_effective_shift(self, employee_profile_id: int, work_date: date) -> ShiftTemplate | None:
        res = await self.db.execute(
            select(EmployeeShiftAssignment)
            .where(
                and_(
                    EmployeeShiftAssignment.employee_profile_id == employee_profile_id,
                    EmployeeShiftAssignment.effective_from <= work_date,
                )
            )
            .order_by(EmployeeShiftAssignment.effective_from.desc())
            .limit(1)
        )
        assignment = res.scalars().first()
        if not assignment:
            return None
        shift = await self.db.get(ShiftTemplate, assignment.shift_id)
        return shift

    async def get_or_create_session(self, user_id: int, work_date: date) -> AttendanceSession:
        res = await self.db.execute(
            select(AttendanceSession)
            .where(and_(AttendanceSession.user_id == user_id, AttendanceSession.work_date == work_date))
        )
        session = res.scalars().first()
        if session:
            return session
        session = AttendanceSession(user_id=user_id, work_date=work_date)
        self.db.add(session)
        await self.db.flush()
        return session

    async def check_in(self, user_id: int, work_date: date) -> AttendanceSession:
        profile = await self.get_employee_profile(user_id)
        if not profile:
            raise ValueError("Employee profile not found")

        shift = await self.get_effective_shift(profile.id, work_date)
        if not shift:
            raise ValueError("No shift assigned")

        session = await self.get_or_create_session(user_id, work_date)
        if session.check_in_at and not session.check_out_at:
            return session
        if session.check_out_at:
            raise ValueError("Already checked out")

        now = _utc_now()
        session.shift_id = shift.id
        session.check_in_at = now
        session.status = "OPEN"

        # Late calculation (simple): compare to shift start time on work_date
        shift_start = datetime.combine(work_date, shift.start_time, tzinfo=timezone.utc)
        grace = timedelta(minutes=shift.grace_minutes or 0)
        if now > shift_start + grace:
            session.late_minutes = _minutes(now - (shift_start + grace))
        else:
            session.late_minutes = 0

        self.db.add(session)
        return session

    async def start_break(self, user_id: int, work_date: date) -> AttendanceSession:
        session = await self.get_or_create_session(user_id, work_date)
        if not session.check_in_at:
            raise ValueError("Check-in required")
        if session.check_out_at:
            raise ValueError("Already checked out")

        if session.shift_id:
            shift = await self.db.get(ShiftTemplate, session.shift_id)
            if shift and not shift.break_allowed:
                raise ValueError("Break not allowed for your shift")

        # ensure no open break
        open_break = next((b for b in session.breaks if b.break_end_at is None), None)
        if open_break:
            raise ValueError("Already on break")

        b = AttendanceBreak(session_id=session.id, break_start_at=_utc_now())
        self.db.add(b)
        return session

    async def end_break(self, user_id: int, work_date: date) -> AttendanceSession:
        session = await self.get_or_create_session(user_id, work_date)
        if not session.check_in_at:
            raise ValueError("Check-in required")
        if session.check_out_at:
            raise ValueError("Already checked out")

        open_break = next((b for b in session.breaks if b.break_end_at is None), None)
        if not open_break:
            raise ValueError("No active break")

        open_break.break_end_at = _utc_now()
        self.db.add(open_break)
        return session

    async def check_out(self, user_id: int, work_date: date) -> AttendanceSession:
        session = await self.get_or_create_session(user_id, work_date)
        if not session.check_in_at:
            raise ValueError("Check-in required")
        if session.check_out_at:
            return session

        open_break = next((b for b in session.breaks if b.break_end_at is None), None)
        if open_break:
            raise ValueError("End break before check-out")

        now = _utc_now()
        session.check_out_at = now
        session.status = "CLOSED"

        # Compute total break minutes
        total_break = 0
        for b in session.breaks:
            if b.break_start_at and b.break_end_at:
                total_break += _minutes(b.break_end_at - b.break_start_at)
        session.total_break_minutes = total_break

        # Overtime (simple): worked - expected
        if session.shift_id:
            shift = await self.db.get(ShiftTemplate, session.shift_id)
            if shift:
                expected = _minutes(
                    datetime.combine(work_date, shift.end_time, tzinfo=timezone.utc)
                    - datetime.combine(work_date, shift.start_time, tzinfo=timezone.utc)
                )
                worked = _minutes(now - session.check_in_at) - total_break
                session.overtime_minutes = max(0, worked - expected)

        self.db.add(session)
        return session
