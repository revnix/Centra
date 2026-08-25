from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.app.core.dependencies import get_current_admin_or_hr
from src.app.db.session import get_db
from src.app.modules.people.models.employee_profile import EmployeeProfile
from src.app.modules.people.schemas.employee import (
    EmployeeCreate,
    EmployeeCreateResponse,
    EmployeeResponse,
    EmployeeUpdate,
)
from src.app.modules.platform.users.models.user import User, UserRole
from src.app.modules.platform.users.schemas.user import UserCreate
from src.app.modules.platform.users.services.auth_service import AuthService


router = APIRouter()


def _to_employee_response(user: User, profile: EmployeeProfile) -> EmployeeResponse:
    return EmployeeResponse(
        user_id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=str(user.role.value if hasattr(user.role, "value") else user.role),
        is_active=bool(user.is_active),
        department_id=profile.department_id,
        job_title=profile.job_title,
        joining_date=profile.joining_date,
        manager_user_id=profile.manager_user_id,
        employee_profile_id=profile.id,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("/employees", response_model=list[EmployeeResponse])
async def list_employees(
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmployeeProfile)
        .options(joinedload(EmployeeProfile.user))
        .order_by(EmployeeProfile.id.desc())
    )
    profiles = result.scalars().all()
    out: list[EmployeeResponse] = []
    for p in profiles:
        if not p.user:
            continue
        out.append(_to_employee_response(p.user, p))
    return out


@router.post(
    "/employees",
    response_model=EmployeeCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_employee(
    payload: EmployeeCreate,
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    auth = AuthService(db)

    existing = await auth.get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists")

    temp_password: str | None = None
    password = payload.password
    if not password:
        temp_password = secrets.token_urlsafe(10)
        password = temp_password

    user = await auth.create_user(
        UserCreate(
            email=str(payload.email),
            full_name=payload.full_name,
            username=payload.username,
            password=password,
            role=UserRole.EMPLOYEE,
        )
    )

    profile = EmployeeProfile(
        user_id=user.id,
        department_id=payload.department_id,
        job_title=payload.job_title,
        joining_date=payload.joining_date,
        manager_user_id=payload.manager_user_id,
        is_active=True,
    )

    db.add(profile)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Failed to create employee profile") from exc

    await db.refresh(profile)

    return EmployeeCreateResponse(
        employee=_to_employee_response(user, profile),
        temp_password=temp_password,
    )


@router.patch("/employees/{employee_profile_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_profile_id: int,
    payload: EmployeeUpdate,
    _: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    profile = await db.get(EmployeeProfile, employee_profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Employee not found")

    fields = getattr(payload, "model_fields_set", set())

    if "department_id" in fields:
        profile.department_id = payload.department_id
    if "job_title" in fields:
        profile.job_title = payload.job_title
    if "joining_date" in fields:
        profile.joining_date = payload.joining_date
    if "manager_user_id" in fields:
        profile.manager_user_id = payload.manager_user_id
    if "is_active" in fields and payload.is_active is not None:
        profile.is_active = payload.is_active
        # keep user active in sync
        user = await db.get(User, profile.user_id)
        if user:
            user.is_active = payload.is_active

    await db.commit()
    await db.refresh(profile)

    user = await db.get(User, profile.user_id)
    if not user:
        raise HTTPException(status_code=500, detail="Employee user missing")

    return _to_employee_response(user, profile)
