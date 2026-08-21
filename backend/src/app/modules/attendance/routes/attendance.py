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
    AssignShiftRequest,
    AttendanceActionResponse,
    EmployeeShiftResponse,
    AttendanceSessionResponse,
    ShiftTemplateCreate,
    ShiftTemplateResponse,
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
