from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.api.models.job import Posts
from src.api.schemas.job import JobCreate, JobUpdate


class JobService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_jobs(self, skip: int = 0, limit: int = 100, status: str = None):
        query = select(Posts).offset(skip).limit(limit)
        if status:
            # Import JobStatus enum to ensure correct comparison if needed, 
            # though string comparison often works if the enum is string-based.
            # Ideally we compare against the enum value.
            from src.api.models.job import JobStatus
            query = select(Posts).where(Posts.status == status).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_job(self, job_id: int):
        result = await self.db.execute(select(Posts).where(Posts.id == job_id))
        return result.scalars().first()

    async def create_job(self, job_in: JobCreate, user_id: int):
        db_job = Posts(**job_in.model_dump(), created_by=user_id)
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

    async def publish_job(self, job_id: int):
        from src.api.models.job import JobStatus
        from datetime import datetime, timezone
        
        db_job = await self.get_job(job_id)
        if not db_job:
            return None
            
        db_job.status = JobStatus.PUBLISHED
        db_job.published_at = datetime.now(timezone.utc)
        
        await self.db.commit()
        await self.db.refresh(db_job)
        return db_job