"""
Save Job Post Node - Saves generated job posts to the database.
"""

from src.flow.states.evelyn import EVALN
# Import from models package to ensure all models are loaded for relationship resolution
from src.api.models.job import Posts, JobType, JobStatus, ExperienceLevel
from src.api.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
import asyncio


def map_employment_type(employment_type: str) -> JobType:
    """Map employment type string to JobType enum."""
    mapping = {
        "full-time": JobType.FULL_TIME,
        "full_time": JobType.FULL_TIME,
        "part-time": JobType.PART_TIME,
        "part_time": JobType.PART_TIME,
        "contract": JobType.CONTRACT,
        "temporary": JobType.TEMPORARY,
        "internship": JobType.INTERNSHIP,
        "volunteer": JobType.VOLUNTEER,
        "freelance": JobType.FREELANCE,
    }
    return mapping.get(employment_type.lower(), JobType.FULL_TIME)


def map_experience_level(level: str) -> ExperienceLevel:
    """Map experience level string to ExperienceLevel enum."""
    mapping = {
        "junior": ExperienceLevel.ENTRY_LEVEL,
        "entry": ExperienceLevel.ENTRY_LEVEL,
        "entry_level": ExperienceLevel.ENTRY_LEVEL,
        "mid": ExperienceLevel.MID_SENIOR,
        "mid-senior": ExperienceLevel.MID_SENIOR,
        "mid_senior": ExperienceLevel.MID_SENIOR,
        "senior": ExperienceLevel.MID_SENIOR,
        "lead": ExperienceLevel.DIRECTOR,
        "director": ExperienceLevel.DIRECTOR,
        "executive": ExperienceLevel.EXECUTIVE,
        "associate": ExperienceLevel.ASSOCIATE,
    }
    return mapping.get(level.lower(), ExperienceLevel.MID_SENIOR)


async def _save_job_to_db(job_data: dict, user_id: int) -> dict:
    """
    Async function to save job to database.
    Returns the saved job data.
    """
    # Create a fresh engine/session to avoid event loop issues
    # when running in a separate thread/loop
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from src.api.core.config import settings

    database_url = settings.DATABASE_URL
    # Asyncpg + Neon SSL handling (replicated from session.py)
    if "asyncpg" in database_url:
        if "sslmode=" in database_url:
            database_url = database_url.replace("?sslmode=require", "").replace("&sslmode=require", "")
        connect_args = {"ssl": "require"} if "neon.tech" in settings.DATABASE_URL else {}
    else:
        connect_args = {}

    engine = create_async_engine(
        database_url,
        echo=True,
        future=True,
        connect_args=connect_args
    )
    
    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with AsyncSessionLocal() as db:
        try:
            job = Posts(
                title=job_data.get("job_title", "Untitled"),
                description=job_data.get("summary", ""),
                short_description=job_data.get("summary", "")[:500] if job_data.get("summary") else None,
                location=job_data.get("location", "Remote"),
                is_remote="remote" in job_data.get("location", "").lower(),
                location_type="remote" if "remote" in job_data.get("location", "").lower() else "on_site",
                job_type=map_employment_type(job_data.get("employment_type", "full_time")),
                experience_level=map_experience_level(job_data.get("experience_level", "mid")),
                department=None,
                required_skills=job_data.get("skills", []),
                preferred_skills=job_data.get("preferred_qualifications", []),
                benefits=job_data.get("benefits", []),
                status=JobStatus.DRAFT,
                company_name=job_data.get("company_name"),
                application_url=job_data.get("apply_link"),
                tags=job_data.get("skills", []),
                metadata_json={
                    "responsibilities": job_data.get("responsibilities", []),
                    "requirements": job_data.get("requirements", []),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "source": "ai_generated"
                },
                created_by=user_id,
                created_at=datetime.now(timezone.utc),
            )
            
            db.add(job)
            await db.commit()
            await db.refresh(job)
            
            result = {
                "job_id": job.id,
                "title": job.title,
                "status": job.status.value,
                "saved_at": job.created_at.isoformat()
            }
            return result
            
        except Exception as e:
            await db.rollback()
            raise e
        finally:
            await engine.dispose()


def save_job_post(state: EVALN) -> dict:
    """
    Save approved job post to the database.
    
    This node takes the generated job post from the state and creates
    a new Job record in the database.
    """
    jd = state.get("jd", {})
    post = jd.get("post", {})
    
    # Only save if the JD is approved
    if jd.get("status") != "approved":
        print("Job not approved, skipping save.")
        return {
            "jd": {
                **jd,
                "save_status": "skipped_not_approved"
            }
        }
    
    if not post:
        print("No post data found.")
        return {
            "jd": {
                **jd,
                "save_status": "failed_no_post_data"
            }
        }
    
    # Get user_id from state or use default
    user_id = jd.get("user_id", 1)  # Default to user 1 if not provided
    
    # Prepare job data with all available fields
    job_data = {
        "job_title": post.get("job_title", jd.get("role", "Untitled")),
        "location": post.get("location", jd.get("location", "Remote")),
        "summary": post.get("summary", jd.get("description", "")),
        "skills": post.get("skills", jd.get("skills", [])),
        "responsibilities": post.get("responsibilities", []),
        "requirements": post.get("requirements", []),
        "preferred_qualifications": post.get("preferred_qualifications", []),
        "benefits": post.get("benefits", []),
        "employment_type": jd.get("employment_type", "Full-time"),
        "experience_level": jd.get("experience_level", "Mid"),
        "company_name": jd.get("company_name"),
        "apply_link": post.get("apply_link"),
    }
    
    try:
        # Run async function in sync context
        # Create a new event loop for this thread since LangGraph runs nodes
        # in a ThreadPoolExecutor which doesn't have an event loop
        try:
            loop = asyncio.get_running_loop()
            # If we're in a running loop, we need to use run_coroutine_threadsafe
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run,
                    _save_job_to_db(job_data, user_id)
                )
                saved_data = future.result()
        except RuntimeError:
            # No running event loop - create a new one
            saved_data = asyncio.run(_save_job_to_db(job_data, user_id))
        
        print(f"Job saved successfully: {saved_data}")
        
        return {
            "jd": {
                **jd,
                "save_status": "saved",
                "saved_job": saved_data
            }
        }
        
    except Exception as e:
        print(f"Failed to save job: {e}")
        return {
            "jd": {
                **jd,
                "save_status": "failed",
                "save_error": str(e)
            }
        }
