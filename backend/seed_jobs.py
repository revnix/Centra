
import asyncio
from sqlalchemy import text, select
from src.api.db.session import AsyncSessionLocal
from src.api.models.job import JobStatus, JobType, Posts
from src.api.models.user import User
from datetime import datetime, timezone

async def seed_jobs():
    async with AsyncSessionLocal() as db:
        print("Seeding jobs...")
        
        # Check if we have users to assign as creator
        result = await db.execute(select(User).limit(1))
        user = result.scalars().first()
        
        if not user:
            print("No users found! Please register a user first.")
            return

        user_id = user.id

        # Job 1: Published
        job1 = Posts(
            title='Senior AI Engineer', 
            description='We are looking for a talented AI Engineer to lead our LLM integration efforts. You will work with LangGraph, OpenAI, and Python.', 
            status=JobStatus.PUBLISHED, 
            job_type=JobType.FULL_TIME, 
            created_by=user_id, 
            salary_min=150000, 
            salary_max=220000, 
            location='San Francisco, CA', 
            department='Engineering',
            published_at=datetime.now(timezone.utc)
        )
        db.add(job1)

        # Job 2: Draft
        job2 = Posts(
            title='Product Designer (Draft)', 
            description='Draft description for a product designer role.', 
            status=JobStatus.DRAFT, 
            job_type=JobType.FULL_TIME, 
            created_by=user_id, 
            salary_min=110000, 
            salary_max=160000, 
            location='Remote', 
            department='Design'
        )
        db.add(job2)
        
        # Job 3: Specific ID for testing (if possible, though ID is autoincrement usually)
        # We can't force ID easily without identity insert, but we can rely on these being new jobs.

        await db.commit()
        print("Jobs seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_jobs())
