from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.app.core.dependencies import (
    get_current_active_admin,
    get_current_admin_or_hr,
    get_current_user,
)
from src.app.db.session import get_db
from src.app.modules.platform.org.models.department import Department
from src.app.modules.platform.org.schemas.department import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
)
from src.app.modules.platform.users.models.user import User, UserRole


router = APIRouter()


def _to_dept_response(dept: Department) -> DepartmentResponse:
    """Serialize a Department ORM object → DepartmentResponse, including lead user fields."""
    lead_email = dept.lead_user.email if dept.lead_user else None
    lead_name = dept.lead_user.full_name if dept.lead_user else None
    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        description=dept.description,
        lead_user_id=dept.lead_user_id,
        lead_user_email=lead_email,
        lead_user_name=lead_name,
        created_at=dept.created_at,
        updated_at=dept.updated_at,
    )


@router.get("/departments", response_model=list[DepartmentResponse])
async def list_departments(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Department)
        .options(selectinload(Department.lead_user))
        .order_by(Department.name.asc())
    )
    departments = result.scalars().all()
    return [_to_dept_response(d) for d in departments]


@router.get("/departments/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: int,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Department)
        .where(Department.id == department_id)
        .options(selectinload(Department.lead_user))
    )
    department = result.scalars().first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return _to_dept_response(department)


@router.post("/departments", response_model=DepartmentResponse)
async def create_department(
    payload: DepartmentCreate,
    _: User = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db),
):
    department = Department(
        name=payload.name.strip(),
        description=payload.description,
        lead_user_id=payload.lead_user_id,
    )
    db.add(department)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Department name already exists")

    # Reload with lead_user eager-loaded for response
    result = await db.execute(
        select(Department)
        .where(Department.id == department.id)
        .options(selectinload(Department.lead_user))
    )
    department = result.scalars().first()
    return _to_dept_response(department)


@router.patch("/departments/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    current_user: User = Depends(get_current_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Department)
        .where(Department.id == department_id)
        .options(selectinload(Department.lead_user))
    )
    department = result.scalars().first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    fields = getattr(payload, "model_fields_set", set())

    # Admin-only: rename
    if "name" in fields:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only admin can rename departments")
        department.name = (payload.name or "").strip()
        if not department.name:
            raise HTTPException(status_code=422, detail="name cannot be empty")

    # HR/Admin: description + lead assignment
    if "description" in fields:
        department.description = payload.description

    if "lead_user_id" in fields:
        department.lead_user_id = payload.lead_user_id

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Department name already exists")

    # Reload to get updated lead_user relationship
    result = await db.execute(
        select(Department)
        .where(Department.id == department_id)
        .options(selectinload(Department.lead_user))
    )
    department = result.scalars().first()
    return _to_dept_response(department)


@router.delete("/departments/{department_id}")
async def delete_department(
    department_id: int,
    _: User = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db),
):
    department = await db.get(Department, department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    await db.delete(department)
    await db.commit()
    return {"ok": True}
