from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from src.app.db.session import get_db
from src.app.modules.recruiting.services.job_service import JobService
from src.app.modules.recruiting.schemas.job import JobCreate, JobUpdate, JobResponse
from src.app.core.dependencies import get_current_active_admin
from src.app.modules.platform.users.models.user import User

router = APIRouter()

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_in: JobCreate,
    current_user: dict = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    job_service = JobService(db)
    user = current_user["user"]
    return await job_service.create_job(job_in, user.id)

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_in: JobUpdate,
    current_user: dict = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    job_service = JobService(db)
    job = await job_service.update_job(job_id, job_in)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: int,
    current_user: dict = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    job_service = JobService(db)
    success = await job_service.delete_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found")
    return None
