from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.api.models.job import JobPosting
from src.api.schemas.job import JobCreate, JobUpdate

class JobService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_jobs(self, skip: int = 0, limit: int = 100):
        result = await self.db.execute(select(JobPosting).offset(skip).limit(limit))
        return result.scalars().all()

    async def get_job(self, job_id: int):
        result = await self.db.execute(select(JobPosting).where(JobPosting.id == job_id))
        return result.scalars().first()

    async def create_job(self, job_in: JobCreate, user_id: int):
        db_job = JobPosting(**job_in.model_dump(), created_by=user_id)
        self.db.add(db_job)
        await self.db.commit()
        await self.db.refresh(db_job)
        return db_job

    async def update_job(self, job_id: int, job_in: JobUpdate):
        db_job = await self.get_job(job_id)
        if not db_job:
            return None
        
        update_data = job_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_job, key, value)
            
        await self.db.commit()
        await self.db.refresh(db_job)
        return db_job

    async def delete_job(self, job_id: int):
        db_job = await self.get_job(job_id)
        if db_job:
            await self.db.delete(db_job)
            await self.db.commit()
            return True
        return False
