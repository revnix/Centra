from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.app.db.session import get_db
from src.app.modules.platform.users.models.user import User
from src.app.modules.platform.users.schemas.user import UserResponse
from src.app.core.dependencies import get_current_active_admin

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()