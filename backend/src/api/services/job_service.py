from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.api.models.job import Posts
from src.api.schemas.job import JobCreate, JobUpdate


class JobService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_jobs(self, skip: int = 0, limit: int = 100, status: str = None):
        from sqlalchemy import func
        query = select(Posts)
        
        if status:
            # Case-insensitive match just in case
            # query = query.where(func.lower(Posts.status) == status.lower())
            query = query.where(Posts.status == status)
            
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_my_jobs(self, user_id: int, skip: int = 0, limit: int = 100, status: str = None):
        from sqlalchemy import func
        query = select(Posts).where(Posts.created_by == user_id)
        
        if status:
            query = query.where(Posts.status == status)
            
        query = query.offset(skip).limit(limit)
        
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

    async def improve_job(self, job_id: int, feedback: str):
        import asyncio
        from src.flow.prompts.human.jd_prompt import JD_GENERATION_PROMPT
        from src.flow.model.llm_manager import get_llm
        from src.flow.model.structure.jd import JobPost
        from datetime import datetime, timezone
        from fastapi.concurrency import run_in_threadpool
        
        db_job = await self.get_job(job_id)
        if not db_job:
            return None
        
        # Prepare inputs for the agent based on existing job data
        messages = JD_GENERATION_PROMPT.format_messages(
            job_title=db_job.title,
            location=db_job.location or "Remote",
            skills=", ".join(db_job.required_skills or []),
            company_name=db_job.company_name or "Our Company",
            employment_type=db_job.job_type.value if db_job.job_type else "Full-time",
            experience_level=db_job.experience_level.value if db_job.experience_level else "Mid",
            feedback=feedback
        )
        
        # LLM CALL
        llm = get_llm().with_structured_output(JobPost)
        response = await run_in_threadpool(llm.invoke, messages)
        
        # Convert to dict
        post_data = response.model_dump() if hasattr(response, 'model_dump') else response
        
        # Update the job record
        db_job.title = post_data.get("job_title", db_job.title)
        db_job.description = post_data.get("summary", db_job.description)
        db_job.required_skills = post_data.get("skills", db_job.required_skills)
        db_job.preferred_skills = post_data.get("preferred_qualifications", db_job.preferred_skills)
        db_job.benefits = post_data.get("benefits", db_job.benefits)
        
        metadata = db_job.metadata_json or {}
        metadata["responsibilities"] = post_data.get("responsibilities", [])
        metadata["requirements"] = post_data.get("requirements", [])
        metadata["preferred_qualifications"] = post_data.get("preferred_qualifications", [])
        metadata["benefits"] = post_data.get("benefits", [])
        metadata["improved_at_utc"] = datetime.now(timezone.utc).isoformat()
        db_job.metadata_json = metadata
        
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

    async def get_total_jobs_count(self):
        from sqlalchemy import func
        result = await self.db.execute(select(func.count()).select_from(Posts))
        return result.scalar()

    async def publish_job(self, job_id: int, user_id: int):
        from src.api.models.job import JobStatus
        from datetime import datetime, timezone
        from src.api.integrations.indeed import IndeedService
        
        db_job = await self.get_job(job_id)
        if not db_job:
            return None
            
        db_job.status = JobStatus.PUBLISHED
        db_job.published_at = datetime.now(timezone.utc)
        
        await self.db.commit()
        await self.db.refresh(db_job)
        
        # Trigger Indeed Upload
        indeed_service = IndeedService(self.db)
        await indeed_service.upload_job(db_job, user_id)
        
        return db_job