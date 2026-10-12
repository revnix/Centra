from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.app.core.dependencies import get_current_user
from src.app.db.session import get_db
from src.app.modules.people.models.employee_profile import EmployeeProfile
from src.app.modules.people.schemas.employee import EmployeeResponse
from src.app.modules.platform.org.models.department import Department
from src.app.modules.platform.users.models.user import User, UserRole


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


@router.get("/team/members", response_model=list[EmployeeResponse])
async def list_my_team_members(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return members in departments where current_user is the lead.

    EMPLOYEE leads can only see their own team. Admin/HR can also use this to
    see their own lead teams if they are assigned as lead.
    """

    if current_user.role not in (UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR):
        raise HTTPException(status_code=403, detail="Lead access required")

    dept_res = await db.execute(
        select(Department.id).where(Department.lead_user_id == current_user.id)
    )
    dept_ids = [int(x) for x in dept_res.scalars().all()]
    if not dept_ids:
        return []

    res = await db.execute(
        select(EmployeeProfile)
        .options(joinedload(EmployeeProfile.user))
        .where(EmployeeProfile.department_id.in_(dept_ids))
        .order_by(EmployeeProfile.id.desc())
    )

    out: list[EmployeeResponse] = []
    for p in res.scalars().all():
        if not p.user:
            continue
        out.append(_to_employee_response(p.user, p))
    return out
