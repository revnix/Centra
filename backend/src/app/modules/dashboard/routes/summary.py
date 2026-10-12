from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.dependencies import get_current_user
from src.app.db.session import get_db
from src.app.modules.dashboard.schemas.summary import DashboardSummaryResponse
from src.app.modules.dashboard.services.summary_service import DashboardSummaryService
from src.app.modules.platform.users.models.user import User


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def dashboard_summary(
    range: str = Query(default="14d", pattern="^(today|7d|14d|30d)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = DashboardSummaryService(db)

    today = date.today()
    is_lead = await svc.get_is_lead(current_user.id)

    role = str(current_user.role.value if hasattr(current_user.role, "value") else current_user.role)

    resp = {
        "role": role,
        "is_lead": bool(is_lead),
        "range": range,
        "employee": None,
        "lead": None,
        "hr_admin": None,
    }

    # Employee-like dashboards
    if role in {"employee", "hr", "admin"}:
        resp["employee"] = await svc.employee_summary_14d(current_user.id, today=today)

    # Lead extras
    if is_lead:
        resp["lead"] = await svc.lead_team_today(current_user.id, today=today)

    # HR/Admin overview counts
    if role in {"hr", "admin"}:
        resp["hr_admin"] = await svc.hr_admin_summary()

    return resp
