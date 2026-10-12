from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.dependencies import get_current_active_admin, get_current_user
from src.app.db.session import get_db
from src.app.modules.platform.users.models.user import User
from src.app.modules.platform.users.schemas.user import UserResponse


router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: int,
    _: User = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db),
):
    # Admin-only lookup
    from sqlalchemy.future import select
    from sqlalchemy.orm import joinedload

    result = await db.execute(
        select(User).where(User.id == user_id).options(joinedload(User.candidate_profile))
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
