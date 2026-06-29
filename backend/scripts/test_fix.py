
import asyncio
from src.api.db.session import AsyncSessionLocal
from src.api.models.job import Posts, JobType, ExperienceLevel, JobStatus
from datetime import datetime, timezone

async def test_insert():
    async with AsyncSessionLocal() as db:
        try:
            # Create a test job
            test_job = Posts(
                title="Test Backend Developer",
                description="Test description",
                short_description="Test short description",
                location="Remote",
                is_remote=True,
                location_type="remote",
                job_type=JobType.FULL_TIME, # Should be "FULL_TIME"
                experience_level=ExperienceLevel.MID, # Should be "MID"
                required_skills=["Python", "SQL"],
                tags=["Backend", "Test"],
                status=JobStatus.DRAFT,
                created_by=1, # Assuming user 1 exists
                created_at=datetime.now(timezone.utc)
            )
            db.add(test_job)
            await db.commit()
            await db.refresh(test_job)
            print(f"Success! Job created with ID: {test_job.id}")
            print(f"Job Type: {test_job.job_type}")
            print(f"Experience Level: {test_job.experience_level}")
            print(f"Tags: {test_job.tags}")
            
            # Clean up
            await db.delete(test_job)
            await db.commit()
            print("Test job cleaned up.")
            
        except Exception as e:
            await db.rollback()
            print(f"Error during insert: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_insert())
