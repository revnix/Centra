from __future__ import annotations

import calendar
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.modules.attendance.models.breaks import AttendanceBreak
from src.app.modules.attendance.models.correction import AttendanceCorrection
from src.app.modules.attendance.models.employee_shift import EmployeeShiftAssignment
from src.app.modules.attendance.models.holiday import PublicHoliday
from src.app.modules.attendance.models.leave import LeaveRequest
from src.app.modules.attendance.models.session import AttendanceSession
from src.app.modules.attendance.models.shift import ShiftTemplate
from src.app.modules.people.models.employee_profile import EmployeeProfile
from src.app.modules.platform.org.models.department import Department
from src.app.modules.platform.users.models.user import User
from src.app.core.config import settings


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _minutes(delta: timedelta) -> int:
    return max(0, int(delta.total_seconds() // 60))


def _shift_end_datetime(work_date: date, shift: ShiftTemplate) -> datetime:
    """Shift end as a real datetime, rolling over to the next calendar day
    for an overnight shift (end_time <= start_time, e.g. 17:00-02:00) —
    without this, an overnight shift's end would compute as *before* its
    own start on the same date, making every derived duration calc that
    uses it (worked minutes, expected hours) silently wrong.
    """
    start_dt = datetime.combine(work_date, shift.start_time, tzinfo=timezone.utc)
    end_dt = datetime.combine(work_date, shift.end_time, tzinfo=timezone.utc)
    if end_dt <= start_dt:
        end_dt += timedelta(days=1)
    return end_dt


def worked_minutes(
    check_in_at: datetime,
    check_out_at: datetime,
    total_break_minutes: int,
    work_date: date,
    shift: ShiftTemplate | None,
) -> int:
    """Worked minutes, capped to the shift window (Phase 5 decision).

    `check_out_at` keeps recording the real clock-out timestamp elsewhere
    (audit trail, per Phase 0's decision) — this only caps the *derived*
    worked/overtime figure so someone who forgets to clock out doesn't
    accrue extra overtime for hours after their shift ended. No shift
    assigned -> no cap, same as today's behavior.

    Shared by check_out() and the Phase 4 monthly summary so both use the
    identical formula.
    """
    effective_check_out = check_out_at
    if shift:
        shift_end = _shift_end_datetime(work_date, shift)
        effective_check_out = min(check_out_at, shift_end)
    return max(0, _minutes(effective_check_out - check_in_at) - total_break_minutes)


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

    async def check_in(self, user_id: int, work_date: date, at: datetime | None = None) -> AttendanceSession:
        """`at` overrides the recorded time — used by approve_correction() to
        apply a backdated action at the time HR actually approved, not "now".
        Defaults to the real current time for the normal live-clock-in flow.
        """
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

        if await self.is_on_approved_leave(user_id, work_date):
            raise ValueError("You are on approved leave for this date")

        now = at or _utc_now()
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

    async def start_break(self, user_id: int, work_date: date, at: datetime | None = None) -> AttendanceSession:
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

        b = AttendanceBreak(session_id=session.id, break_start_at=at or _utc_now())
        self.db.add(b)
        return session

    async def end_break(self, user_id: int, work_date: date, at: datetime | None = None) -> AttendanceSession:
        session = await self.get_or_create_session(user_id, work_date)
        if not session.check_in_at:
            raise ValueError("Check-in required")
        if session.check_out_at:
            raise ValueError("Already checked out")

        open_break = next((b for b in session.breaks if b.break_end_at is None), None)
        if not open_break:
            raise ValueError("No active break")

        open_break.break_end_at = at or _utc_now()
        self.db.add(open_break)
        return session

    async def check_out(self, user_id: int, work_date: date, at: datetime | None = None) -> AttendanceSession:
        session = await self.get_or_create_session(user_id, work_date)
        if not session.check_in_at:
            raise ValueError("Check-in required")
        if session.check_out_at:
            return session

        open_break = next((b for b in session.breaks if b.break_end_at is None), None)
        if open_break:
            raise ValueError("End break before check-out")

        now = at or _utc_now()
        session.check_out_at = now
        session.status = "CLOSED"

        # Compute total break minutes
        total_break = 0
        for b in session.breaks:
            if b.break_start_at and b.break_end_at:
                total_break += _minutes(b.break_end_at - b.break_start_at)
        session.total_break_minutes = total_break

        # Overtime (simple): worked - expected. `worked` is capped to the
        # shift window (Phase 5) so clocking out late doesn't inflate it.
        if session.shift_id:
            shift = await self.db.get(ShiftTemplate, session.shift_id)
            if shift:
                expected = _minutes(
                    _shift_end_datetime(work_date, shift)
                    - datetime.combine(work_date, shift.start_time, tzinfo=timezone.utc)
                )
                worked = worked_minutes(session.check_in_at, now, total_break, work_date, shift)
                session.overtime_minutes = max(0, worked - expected)

        self.db.add(session)
        return session

    async def get_monthly_summary(self, user_id: int, year: int, month: int) -> dict:
        """On-read monthly summary (Phase 4). No new table — computed from
        `attendance_sessions`, Phase 3's `public_holidays`, and Phase 5's
        capped `worked_minutes()`, all at request time.

        v1 default (a business call, not a technical one — easy to change
        later, see ATTENDANCE_IMPLEMENTATION_PLAN.md Phase 4): `total_hours`
        is a flat `working_days * 8`. The legacy system's "1 hour monthly
        relaxation" adjustment from the original report was dropped rather
        than guessed at — add it back here if the team confirms they want it.
        """
        days_in_month = calendar.monthrange(year, month)[1]
        first_day = date(year, month, 1)
        last_day = date(year, month, days_in_month)

        holiday_res = await self.db.execute(
            select(PublicHoliday.date).where(
                and_(PublicHoliday.date >= first_day, PublicHoliday.date <= last_day)
            )
        )
        holiday_dates = {row[0] for row in holiday_res.all()}

        working_days = 0
        for day_num in range(1, days_in_month + 1):
            d = date(year, month, day_num)
            if d.weekday() >= 5:  # Saturday/Sunday
                continue
            if d in holiday_dates:
                continue
            working_days += 1

        session_res = await self.db.execute(
            select(AttendanceSession).where(
                and_(
                    AttendanceSession.user_id == user_id,
                    AttendanceSession.work_date >= first_day,
                    AttendanceSession.work_date <= last_day,
                )
            )
        )
        sessions = session_res.scalars().all()

        shift_ids = {s.shift_id for s in sessions if s.shift_id is not None}
        shifts_by_id: dict[int, ShiftTemplate] = {}
        if shift_ids:
            shift_res = await self.db.execute(
                select(ShiftTemplate).where(ShiftTemplate.id.in_(shift_ids))
            )
            shifts_by_id = {s.id: s for s in shift_res.scalars().all()}

        actual_minutes = 0
        days_present = 0
        for s in sessions:
            if s.check_in_at:
                days_present += 1
            if s.check_in_at and s.check_out_at:
                shift = shifts_by_id.get(s.shift_id) if s.shift_id else None
                actual_minutes += worked_minutes(
                    s.check_in_at, s.check_out_at, s.total_break_minutes, s.work_date, shift
                )

        leave_res = await self.db.execute(
            select(LeaveRequest).where(
                and_(
                    LeaveRequest.user_id == user_id,
                    LeaveRequest.status == "APPROVED",
                    LeaveRequest.start_date <= last_day,
                    LeaveRequest.end_date >= first_day,
                )
            )
        )
        days_on_leave = 0
        for leave in leave_res.scalars().all():
            overlap_start = max(leave.start_date, first_day)
            overlap_end = min(leave.end_date, last_day)
            days_on_leave += (overlap_end - overlap_start).days + 1

        actual_hours = round(actual_minutes / 60, 2)
        total_hours = float(working_days * 8)

        return {
            "user_id": user_id,
            "year": year,
            "month": month,
            "working_days": working_days,
            "actual_hours": actual_hours,
            "total_hours": total_hours,
            "difference": round(actual_hours - total_hours, 2),
            "days_present": days_present,
            "days_on_leave": days_on_leave,
        }

    async def list_sessions(
        self,
        from_date: date,
        to_date: date,
        department_id: int | None = None,
        user_id: int | None = None,
    ):
        """Sessions in [from_date, to_date] with employee name + department,
        for the HR/admin company-wide view. Unlike get_or_create_session,
        this never creates rows — it's a read-only report.

        Returns a list of (AttendanceSession, full_name, department_name) rows.
        """
        query = (
            select(AttendanceSession, User.full_name, Department.name)
            .join(User, AttendanceSession.user_id == User.id)
            .outerjoin(EmployeeProfile, EmployeeProfile.user_id == User.id)
            .outerjoin(Department, Department.id == EmployeeProfile.department_id)
            .where(
                and_(
                    AttendanceSession.work_date >= from_date,
                    AttendanceSession.work_date <= to_date,
                )
            )
            .order_by(AttendanceSession.work_date.desc(), User.full_name.asc())
        )

        if user_id is not None:
            query = query.where(AttendanceSession.user_id == user_id)
        if department_id is not None:
            query = query.where(EmployeeProfile.department_id == department_id)

        res = await self.db.execute(query)
        return res.all()

    async def get_employees_missing_checkin(self, work_date: date) -> list[User]:
        """Active employees with an effective shift for `work_date` who
        have no check-in recorded yet — the Phase 6 reminder query.

        A simple per-employee scan (reuses get_effective_shift's
        latest-assignment lookup); fine at this org's current scale, not
        built to be efficient at thousands of employees.
        """
        profiles_res = await self.db.execute(
            select(EmployeeProfile).where(EmployeeProfile.is_active.is_(True))
        )
        profiles = profiles_res.scalars().all()

        missing: list[User] = []
        for profile in profiles:
            shift = await self.get_effective_shift(profile.id, work_date)
            if not shift:
                continue  # no shift assigned yet -> nothing to remind about

            session_res = await self.db.execute(
                select(AttendanceSession).where(
                    and_(
                        AttendanceSession.user_id == profile.user_id,
                        AttendanceSession.work_date == work_date,
                    )
                )
            )
            session = session_res.scalars().first()
            if session and session.check_in_at:
                continue

            user = await self.db.get(User, profile.user_id)
            if user:
                missing.append(user)

        return missing

    # ---- Backdated corrections (Phase 2) ----

    async def request_correction(
        self,
        user_id: int,
        work_date: date,
        action: str,
        requested_time: datetime,
        reason: str | None,
    ) -> AttendanceCorrection:
        today = date.today()
        if work_date > today:
            raise ValueError("Cannot request a correction for a future date")

        # getattr, not direct access: settings can fall back to a bare
        # _BootstrapSettings if the real config fails to load (see
        # core/config.py) — don't let that crash a correction request.
        limit_days = getattr(settings, "ATTENDANCE_BACKDATE_LIMIT_DAYS", 3)
        if (today - work_date).days > limit_days:
            raise ValueError(
                f"Corrections can only be requested for the last {limit_days} day(s)"
            )

        correction = AttendanceCorrection(
            user_id=user_id,
            work_date=work_date,
            action=action,
            requested_time=requested_time,
            reason=reason,
            status="PENDING",
        )
        self.db.add(correction)
        await self.db.flush()
        return correction

    async def list_corrections(self, status: str | None = None):
        """Returns (AttendanceCorrection, full_name) rows, newest first."""
        query = (
            select(AttendanceCorrection, User.full_name)
            .join(User, AttendanceCorrection.user_id == User.id)
            .order_by(AttendanceCorrection.created_at.desc())
        )
        if status is not None:
            query = query.where(AttendanceCorrection.status == status)
        res = await self.db.execute(query)
        return res.all()

    async def _get_pending_correction(self, correction_id: int) -> AttendanceCorrection:
        correction = await self.db.get(AttendanceCorrection, correction_id)
        if not correction:
            raise ValueError("Correction request not found")
        if correction.status != "PENDING":
            raise ValueError(f"Correction request is already {correction.status.lower()}")
        return correction

    async def approve_correction(self, correction_id: int, reviewer_id: int) -> AttendanceCorrection:
        correction = await self._get_pending_correction(correction_id)

        # Route through the same action methods the live clock uses, just
        # with the requested past time instead of "now" — keeps one source
        # of truth for what each action actually does to a session.
        if correction.action == "IN":
            await self.check_in(correction.user_id, correction.work_date, at=correction.requested_time)
        elif correction.action == "OUT":
            await self.check_out(correction.user_id, correction.work_date, at=correction.requested_time)
        elif correction.action == "BREAK":
            await self.start_break(correction.user_id, correction.work_date, at=correction.requested_time)
        elif correction.action == "BACK":
            await self.end_break(correction.user_id, correction.work_date, at=correction.requested_time)
        else:
            raise ValueError(f"Unknown action: {correction.action}")

        correction.status = "APPROVED"
        correction.reviewed_by = reviewer_id
        correction.reviewed_at = _utc_now()
        self.db.add(correction)
        return correction

    async def reject_correction(self, correction_id: int, reviewer_id: int) -> AttendanceCorrection:
        correction = await self._get_pending_correction(correction_id)
        correction.status = "REJECTED"
        correction.reviewed_by = reviewer_id
        correction.reviewed_at = _utc_now()
        self.db.add(correction)
        return correction

    # ---- Leave requests & public holidays (Phase 3) ----

    async def is_on_approved_leave(self, user_id: int, work_date: date) -> bool:
        """Whether `user_id` has an APPROVED leave request covering `work_date`.

        Used by check_in() to close a real gap: without this, an employee
        could still clock in (live, or via a backdated correction HR
        approves) on a day HR had already approved them off for.
        """
        res = await self.db.execute(
            select(LeaveRequest).where(
                and_(
                    LeaveRequest.user_id == user_id,
                    LeaveRequest.status == "APPROVED",
                    LeaveRequest.start_date <= work_date,
                    LeaveRequest.end_date >= work_date,
                )
            )
        )
        return res.scalars().first() is not None

    async def request_leave(
        self, user_id: int, start_date: date, end_date: date, reason: str | None
    ) -> LeaveRequest:
        leave = LeaveRequest(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            reason=reason,
            status="PENDING",
        )
        self.db.add(leave)
        await self.db.flush()
        return leave

    async def list_leave_requests(self, status: str | None = None, user_id: int | None = None):
        """Returns (LeaveRequest, full_name) rows, newest first."""
        query = (
            select(LeaveRequest, User.full_name)
            .join(User, LeaveRequest.user_id == User.id)
            .order_by(LeaveRequest.created_at.desc())
        )
        if status is not None:
            query = query.where(LeaveRequest.status == status)
        if user_id is not None:
            query = query.where(LeaveRequest.user_id == user_id)
        res = await self.db.execute(query)
        return res.all()

    async def _get_pending_leave(self, leave_id: int) -> LeaveRequest:
        leave = await self.db.get(LeaveRequest, leave_id)
        if not leave:
            raise ValueError("Leave request not found")
        if leave.status != "PENDING":
            raise ValueError(f"Leave request is already {leave.status.lower()}")
        return leave

    async def approve_leave(self, leave_id: int, reviewer_id: int) -> LeaveRequest:
        leave = await self._get_pending_leave(leave_id)
        leave.status = "APPROVED"
        leave.approved_by = reviewer_id
        leave.reviewed_at = _utc_now()
        self.db.add(leave)
        return leave

    async def reject_leave(self, leave_id: int, reviewer_id: int) -> LeaveRequest:
        leave = await self._get_pending_leave(leave_id)
        leave.status = "REJECTED"
        leave.approved_by = reviewer_id
        leave.reviewed_at = _utc_now()
        self.db.add(leave)
        return leave

    async def create_holiday(self, holiday_date: date, name: str) -> PublicHoliday:
        existing = await self.db.execute(
            select(PublicHoliday).where(PublicHoliday.date == holiday_date)
        )
        if existing.scalars().first():
            raise ValueError(f"A holiday is already recorded for {holiday_date}")

        holiday = PublicHoliday(date=holiday_date, name=name)
        self.db.add(holiday)
        await self.db.flush()
        return holiday

    async def list_holidays(self) -> list[PublicHoliday]:
        res = await self.db.execute(select(PublicHoliday).order_by(PublicHoliday.date.asc()))
        return list(res.scalars().all())
