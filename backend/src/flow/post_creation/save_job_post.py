"""
Save Job Post Node - Saves generated job posts to the database.
"""

from src.flow.states.evelyn import EVALN
from typing import Optional, List, Dict, Any
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


async def _save_job_to_db(job_data: dict, user_id: int, existing_job_id: Optional[int] = None) -> dict:
    """
    Async function to save or update job in database.
    Returns the saved job data.
    """
    # Create a fresh engine/session to avoid event loop issues
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from src.api.core.config import settings
    from sqlalchemy.future import select

    database_url = settings.DATABASE_URL
    if "asyncpg" in database_url:
        if "sslmode=" in database_url:
            database_url = database_url.replace("?sslmode=require", "").replace("&sslmode=require", "")
        connect_args = {"ssl": "require"} if "neon.tech" in settings.DATABASE_URL else {}
    else:
        connect_args = {}

    engine = create_async_engine(database_url, echo=True, future=True, connect_args=connect_args)
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        try:
            job = None
            if existing_job_id:
                result = await db.execute(select(Posts).where(Posts.id == existing_job_id))
                job = result.scalars().first()

            target_status = JobStatus.PUBLISHED if job_data.get("is_approved") else JobStatus.DRAFT

            if job:
                # Update existing job
                job.title = job_data.get("job_title", job.title)
                job.description = job_data.get("summary", job.description)
                job.status = target_status
                if target_status == JobStatus.PUBLISHED and not job.published_at:
                    job.published_at = datetime.now(timezone.utc)
            else:
                # Create new job
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
                    status=target_status,
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
            
            return {
                "job_id": job.id,
                "title": job.title,
                "status": job.status.value,
                "saved_at": job.created_at.isoformat()
            }
            
        except Exception as e:
            await db.rollback()
            raise e
        finally:
            await engine.dispose()


async def save_job_post(state: EVALN) -> dict:
    """
    Save approved job post to the database.
    
    This node takes the generated job post from the state and creates
    a new Job record in the database.
    """
    jd = state.get("jd", {})
    post = jd.get("post", {})
    
    # Only save if the JD is approved OR awaiting review
    if jd.get("status") not in ["approved", "awaiting_review"]:
        print(f"Job status is {jd.get('status')}, skipping save.")
        return {
            "jd": {
                **jd,
                "save_status": "skipped_invalid_status"
            }
        }
    
    # Removed overly aggressive skip logic to allow updates during the review process
    
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
    
    # Pass is_approved flag and existing job ID
    job_data["is_approved"] = jd.get("status") == "approved"
    existing_job_id = jd.get("saved_job", {}).get("job_id")
    
    try:
        # Now calling _save_job_to_db directly since we are async
        saved_data = await _save_job_to_db(job_data, user_id, existing_job_id)
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
