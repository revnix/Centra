from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.services.job_service import JobService
from src.api.schemas.job import JobResponse
from src.api.core.dependencies import get_current_user
from src.api.models.user import User

router = APIRouter()

@router.get("/", response_model=List[JobResponse])
async def read_jobs(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job_service = JobService(db)
    return await job_service.get_jobs(skip=skip, limit=limit)