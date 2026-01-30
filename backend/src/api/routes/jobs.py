from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.services.job_service import JobService
from src.api.schemas.job import JobResponse
from src.api.core.dependencies import get_current_user
from src.api.models.user import User

router = APIRouter()

@router.get("/ping")
async def ping(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    await db.execute(text("SELECT 1"))
    return {"message": "pong"}

@router.get("/stats/count")
async def get_jobs_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns the total number of jobs created"""
    job_service = JobService(db)
    count = await job_service.get_total_jobs_count()
    return {"total_jobs": count}

@router.get("/public", response_model=List[JobResponse])
async def read_public_jobs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Public endpoint for fetching published jobs (no authentication required)"""
    job_service = JobService(db)
    return await job_service.get_jobs(skip=skip, limit=limit, status="published")
@router.get("/", response_model=List[JobResponse])
async def read_jobs(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Authenticated endpoint for fetching jobs created by the current user"""
    job_service = JobService(db)
    # Filter by current user to ensure they only see their own generated jobs
    return await job_service.get_my_jobs(user_id=current_user.id, skip=skip, limit=limit, status=status)

@router.get("/{job_id}", response_model=JobResponse)
async def read_job(
    job_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific job by ID.
    Publicly accessible to allow candidates to view job details.
    """
    job_service = JobService(db)
    job = await job_service.get_job(job_id)
    if not job:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/publish", response_model=JobResponse)
async def publish_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job_service = JobService(db)
    job = await job_service.publish_job(job_id, current_user.id)
    if not job:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return job