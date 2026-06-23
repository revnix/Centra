
import asyncio
from src.api.db.session import AsyncSessionLocal
from src.api.models.job import Posts, JobType, ExperienceLevel, JobStatus
from datetime import datetime, timezone
from sqlalchemy.future import select

async def test_insert_only():
    async with AsyncSessionLocal() as db:
        try:
            # Create a test job
            test_job = Posts(
                title="Test Backend Developer V2",
                description="Test description",
                short_description="Test short description",
                location="Remote",
                is_remote=True,
                location_type="remote",
                job_type=JobType.FULL_TIME, 
                experience_level=ExperienceLevel.MID,
                required_skills=["Python", "SQL"],
                tags=["Backend", "Test"],
                status=JobStatus.DRAFT,
                created_by=1,
                created_at=datetime.now(timezone.utc)
            )
            db.add(test_job)
            await db.commit()
            await db.refresh(test_job)
            print(f"Success! Job created with ID: {test_job.id}")
            
            # Read it back
            result = await db.execute(select(Posts).where(Posts.id == test_job.id))
            job = result.scalars().first()
            print(f"Verified Job Title: {job.title}")
            print(f"Verified Job Type: {job.job_type}")
            print(f"Verified Tags: {job.tags}")
            
        except Exception as e:
            await db.rollback()
            print(f"Error during insert: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_insert_only())
