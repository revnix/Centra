from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.dependencies import get_current_user, get_current_admin_or_hr
from src.app.db.session import get_db
from src.app.modules.attendance.schemas.leave import (
    LeaveRequestCreate,
    LeaveResponse,
    PublicHolidayCreate,
    PublicHolidayResponse,
)
from src.app.modules.attendance.services.attendance_service import AttendanceService
from src.app.modules.platform.users.models.user import User

router = APIRouter(prefix="/attendance", tags=["attendance", "leave"])


def _to_leave_response(leave, full_name: str | None = None) -> LeaveResponse:
    return LeaveResponse(
        id=leave.id,
        user_id=leave.user_id,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason,
        status=leave.status,
        approved_by=leave.approved_by,
        reviewed_at=leave.reviewed_at,
        created_at=leave.created_at,
        full_name=full_name,
    )


@router.post("/leave", response_model=LeaveResponse)
async def request_leave(
    payload: LeaveRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = AttendanceService(db)
    leave = await svc.request_leave(
        user_id=current_user.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
    )
    await db.commit()
    await db.refresh(leave)
    return _to_leave_response(leave)


@router.get("/leave/me", response_model=list[LeaveResponse])
async def my_leave_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = AttendanceService(db)
    rows = await svc.list_leave_requests(user_id=current_user.id)
    return [_to_leave_response(leave, full_name) for leave, full_name in rows]


@router.get("/leave", response_model=list[LeaveResponse])
async def list_leave_requests(
    status: str | None = None,
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    svc = AttendanceService(db)
    rows = await svc.list_leave_requests(status=status)
    return [_to_leave_response(leave, full_name) for leave, full_name in rows]


@router.post("/leave/{leave_id}/approve", response_model=LeaveResponse)
async def approve_leave(
    leave_id: int,
    current_user: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    svc = AttendanceService(db)
    try:
        leave = await svc.approve_leave(leave_id, reviewer_id=current_user.id)
        await db.commit()
        await db.refresh(leave)
        return _to_leave_response(leave)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/leave/{leave_id}/reject", response_model=LeaveResponse)
async def reject_leave(
    leave_id: int,
    current_user: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    svc = AttendanceService(db)
    try:
        leave = await svc.reject_leave(leave_id, reviewer_id=current_user.id)
        await db.commit()
        await db.refresh(leave)
        return _to_leave_response(leave)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/holidays", response_model=PublicHolidayResponse)
async def create_holiday(
    payload: PublicHolidayCreate,
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    svc = AttendanceService(db)
    try:
        holiday = await svc.create_holiday(payload.date, payload.name)
        await db.commit()
        await db.refresh(holiday)
        return holiday
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/holidays", response_model=list[PublicHolidayResponse])
async def list_holidays(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = AttendanceService(db)
    return await svc.list_holidays()
