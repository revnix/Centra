from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.dependencies import get_current_user, get_current_admin_or_hr
from src.app.db.session import get_db
from src.app.modules.attendance.models.employee_shift import EmployeeShiftAssignment
from src.app.modules.attendance.models.session import AttendanceSession
from src.app.modules.attendance.models.shift import ShiftTemplate
from src.app.modules.attendance.schemas.attendance import (
    AssignShiftBulkRequest,
    AssignShiftRequest,
    AttendanceActionResponse,
    EmployeeShiftResponse,
    AttendanceSessionResponse,
    AttendanceSessionWithEmployeeResponse,
    CorrectionRequestCreate,
    CorrectionResponse,
    MonthlySummaryResponse,
    ShiftTemplateCreate,
    ShiftTemplateResponse,
    UnassignedEmployeeResponse,
)
from src.app.modules.attendance.services.attendance_service import AttendanceService
from src.app.modules.platform.users.models.user import User, UserRole
from src.app.modules.people.models.employee_profile import EmployeeProfile


router = APIRouter(prefix="/attendance", tags=["attendance"])


def _require_employee(user: User) -> None:
    if user.role not in (UserRole.EMPLOYEE, UserRole.HR, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Employee access required")


@router.post("/shifts", response_model=ShiftTemplateResponse)
async def create_shift_template(
    payload: ShiftTemplateCreate,
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    shift = ShiftTemplate(
        name=payload.name.strip(),
        start_time=payload.start_time,
        end_time=payload.end_time,
        grace_minutes=payload.grace_minutes,
        break_allowed=payload.break_allowed,
        break_max_minutes=payload.break_max_minutes,
    )
    db.add(shift)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    await db.refresh(shift)
    return shift


@router.get("/shifts", response_model=list[ShiftTemplateResponse])
async def list_shift_templates(
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(ShiftTemplate).order_by(ShiftTemplate.name.asc()))
    return list(res.scalars().all())


@router.post("/employees/{employee_profile_id}/shift")
async def assign_shift(
    employee_profile_id: int,
    payload: AssignShiftRequest,
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    profile = await db.get(EmployeeProfile, employee_profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Employee not found")

    shift = await db.get(ShiftTemplate, payload.shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    assignment = EmployeeShiftAssignment(
        employee_profile_id=employee_profile_id,
        shift_id=payload.shift_id,
        effective_from=payload.effective_from,
    )
    db.add(assignment)
    await db.commit()
    return {"ok": True}


@router.get("/employee-shifts", response_model=list[EmployeeShiftResponse])
async def list_employee_shifts(
    employee_profile_ids: str,
    as_of: date | None = None,
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    """Return effective shift assignment(s) for employees as of a date.

    Query param employee_profile_ids is a comma-separated list (e.g. "1,2,3").
    """

    ids: list[int] = []
    for raw in (employee_profile_ids or "").split(","):
        raw = raw.strip()
        if not raw:
            continue
        try:
            ids.append(int(raw))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid employee_profile_ids")

    if not ids:
        return []

    work_date = as_of or date.today()

    res = await db.execute(
        select(EmployeeShiftAssignment)
        .options(selectinload(EmployeeShiftAssignment.shift))
        .where(
            and_(
                EmployeeShiftAssignment.employee_profile_id.in_(ids),
                EmployeeShiftAssignment.effective_from <= work_date,
            )
        )
        .order_by(
            EmployeeShiftAssignment.employee_profile_id.asc(),
            EmployeeShiftAssignment.effective_from.desc(),
        )
    )

    seen: set[int] = set()
    out: list[EmployeeShiftResponse] = []
    for a in res.scalars().all():
        if a.employee_profile_id in seen:
            continue
        if not a.shift:
            continue
        seen.add(a.employee_profile_id)
        out.append(
            EmployeeShiftResponse(
                employee_profile_id=a.employee_profile_id,
                effective_from=a.effective_from,
                shift=a.shift,
            )
        )

    return out


@router.post("/in", response_model=AttendanceActionResponse)
async def attendance_in(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_employee(current_user)
    svc = AttendanceService(db)
    try:
        session = await svc.check_in(current_user.id, date.today())
        await db.commit()
        await db.refresh(session)
        return {"session": session}
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/break", response_model=AttendanceActionResponse)
async def attendance_break(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_employee(current_user)
    svc = AttendanceService(db)
    try:
        session = await svc.start_break(current_user.id, date.today())
        await db.commit()
        await db.refresh(session)
        return {"session": session}
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/back", response_model=AttendanceActionResponse)
async def attendance_back(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_employee(current_user)
    svc = AttendanceService(db)
    try:
        session = await svc.end_break(current_user.id, date.today())
        await db.commit()
        await db.refresh(session)
        return {"session": session}
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/out", response_model=AttendanceActionResponse)
async def attendance_out(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_employee(current_user)
    svc = AttendanceService(db)
    try:
        session = await svc.check_out(current_user.id, date.today())
        await db.commit()
        await db.refresh(session)
        return {"session": session}
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=list[AttendanceSessionResponse])
async def attendance_me(
    from_date: date,
    to_date: date,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_employee(current_user)
    res = await db.execute(
        select(AttendanceSession)
        .where(
            and_(
                AttendanceSession.user_id == current_user.id,
                AttendanceSession.work_date >= from_date,
                AttendanceSession.work_date <= to_date,
            )
        )
        .order_by(AttendanceSession.work_date.desc())
    )
    return list(res.scalars().all())


@router.get("/sessions", response_model=list[AttendanceSessionWithEmployeeResponse])
async def list_all_sessions(
    from_date: date,
    to_date: date,
    department_id: int | None = None,
    user_id: int | None = None,
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    """Company-wide attendance view for HR/admin.

    Previously the only way to see attendance was per-employee via /me —
    there was no way for HR to see anyone else's. This is the fix.
    """
    svc = AttendanceService(db)
    rows = await svc.list_sessions(
        from_date, to_date, department_id=department_id, user_id=user_id
    )
    return [
        AttendanceSessionWithEmployeeResponse(
            id=session.id,
            user_id=session.user_id,
            work_date=session.work_date,
            shift_id=session.shift_id,
            check_in_at=session.check_in_at,
            check_out_at=session.check_out_at,
            status=session.status,
            total_break_minutes=session.total_break_minutes,
            late_minutes=session.late_minutes,
            overtime_minutes=session.overtime_minutes,
            full_name=full_name,
            department_name=department_name,
        )
        for session, full_name, department_name in rows
    ]


@router.get("/summary", response_model=MonthlySummaryResponse)
async def monthly_summary(
    year: int,
    month: int,
    user_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Monthly attendance summary (Phase 4). Self by default; admin/hr may
    pass `user_id` to view any employee's summary."""
    target_user_id = current_user.id
    if user_id is not None and user_id != current_user.id:
        if current_user.role not in (UserRole.ADMIN, UserRole.HR):
            raise HTTPException(status_code=403, detail="Admin or HR access required")
        target_user_id = user_id

    if not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="month must be between 1 and 12")

    svc = AttendanceService(db)
    return await svc.get_monthly_summary(target_user_id, year, month)


@router.post("/corrections", response_model=CorrectionResponse)
async def request_correction(
    payload: CorrectionRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """An employee asks for a past-date clock action to be applied.
    Never touches the actual session — sits PENDING until HR decides."""
    _require_employee(current_user)
    svc = AttendanceService(db)
    try:
        correction = await svc.request_correction(
            user_id=current_user.id,
            work_date=payload.work_date,
            action=payload.action,
            requested_time=payload.requested_time,
            reason=payload.reason,
        )
        await db.commit()
        await db.refresh(correction)
        return correction
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/corrections", response_model=list[CorrectionResponse])
async def list_corrections(
    status: str | None = None,
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    svc = AttendanceService(db)
    rows = await svc.list_corrections(status=status)
    return [
        CorrectionResponse(
            id=c.id,
            user_id=c.user_id,
            work_date=c.work_date,
            action=c.action,
            requested_time=c.requested_time,
            reason=c.reason,
            status=c.status,
            reviewed_by=c.reviewed_by,
            reviewed_at=c.reviewed_at,
            created_at=c.created_at,
            full_name=full_name,
        )
        for c, full_name in rows
    ]


@router.post("/corrections/{correction_id}/approve", response_model=CorrectionResponse)
async def approve_correction(
    correction_id: int,
    current_user: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    svc = AttendanceService(db)
    try:
        correction = await svc.approve_correction(correction_id, reviewer_id=current_user.id)
        await db.commit()
        await db.refresh(correction)
        return correction
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/corrections/{correction_id}/reject", response_model=CorrectionResponse)
async def reject_correction(
    correction_id: int,
    current_user: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    svc = AttendanceService(db)
    try:
        correction = await svc.reject_correction(correction_id, reviewer_id=current_user.id)
        await db.commit()
        await db.refresh(correction)
        return correction
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# --------------- Phase 7 — Rollout helpers ---------------


@router.post("/shifts/{shift_id}/assign-bulk")
async def assign_shift_bulk(
    shift_id: int,
    payload: AssignShiftBulkRequest,
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    """Assign one shift template to many employees at once.

    Loops the same validation the single-assign endpoint uses — if an
    employee profile doesn't exist, the whole request is rejected rather
    than partially applied.
    """
    shift = await db.get(ShiftTemplate, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    # Pre-validate all profiles exist before writing anything.
    profiles: list[EmployeeProfile] = []
    for pid in payload.employee_profile_ids:
        profile = await db.get(EmployeeProfile, pid)
        if not profile:
            raise HTTPException(
                status_code=404,
                detail=f"Employee profile {pid} not found",
            )
        profiles.append(profile)

    created = 0
    skipped = 0
    for profile in profiles:
        # Check if this exact (employee, effective_from) already exists.
        existing = await db.execute(
            select(EmployeeShiftAssignment).where(
                and_(
                    EmployeeShiftAssignment.employee_profile_id == profile.id,
                    EmployeeShiftAssignment.effective_from == payload.effective_from,
                )
            )
        )
        if existing.scalar_one_or_none() is not None:
            skipped += 1
            continue

        db.add(
            EmployeeShiftAssignment(
                employee_profile_id=profile.id,
                shift_id=shift_id,
                effective_from=payload.effective_from,
            )
        )
        created += 1

    await db.commit()
    return {"ok": True, "created": created, "skipped": skipped}


@router.get("/unassigned-employees", response_model=list[UnassignedEmployeeResponse])
async def list_unassigned_employees(
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    """Rollout checklist: active employees with a profile but no shift
    assignment — their In button won't work until they're assigned."""
    from sqlalchemy.orm import aliased

    # Subquery: employee_profile_ids that have at least one shift assignment.
    assigned_subq = (
        select(EmployeeShiftAssignment.employee_profile_id)
        .distinct()
        .subquery()
    )

    stmt = (
        select(
            EmployeeProfile.id,
            EmployeeProfile.user_id,
            User.full_name,
            User.email,
        )
        .join(User, EmployeeProfile.user_id == User.id)
        .outerjoin(
            assigned_subq,
            EmployeeProfile.id == assigned_subq.c.employee_profile_id,
        )
        .where(
            and_(
                EmployeeProfile.is_active.is_(True),
                assigned_subq.c.employee_profile_id.is_(None),
            )
        )
        .order_by(User.full_name.asc())
    )

    rows = await db.execute(stmt)
    return [
        UnassignedEmployeeResponse(
            employee_profile_id=row.id,
            user_id=row.user_id,
            full_name=row.full_name,
            email=row.email,
        )
        for row in rows.all()
    ]
