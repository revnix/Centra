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
            query = query.where(Posts.status == status)
            
        query = query.order_by(Posts.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_my_jobs(self, user_id: int, skip: int = 0, limit: int = 100, status: str = None):
        from sqlalchemy import func
        from src.api.models.application import Application

        app_count_subq = (
            select(Application.job_id, func.count(Application.id).label("application_count"))
            .group_by(Application.job_id)
            .subquery()
        )

        query = (
            select(Posts, func.coalesce(app_count_subq.c.application_count, 0).label("application_count"))
            .outerjoin(app_count_subq, Posts.id == app_count_subq.c.job_id)
            .where(Posts.created_by == user_id)
        )

        if status:
            query = query.where(Posts.status == status)

        query = query.order_by(Posts.created_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        rows = result.all()

        jobs = []
        for post, count in rows:
            post.application_count = count
            jobs.append(post)
        return jobs

    async def get_job(self, job_id: int):
        import json
        result = await self.db.execute(select(Posts).where(Posts.id == job_id))
        job = result.scalars().first()
        if job:
            print(f"DEBUG: [JobService.get_job] Job retrieved: {json.dumps(job.to_dict(), default=str)}")
        else:
            print(f"DEBUG: [JobService.get_job] Job not found: {job_id}")
        return job

    async def create_job(self, job_in: JobCreate, user_id: int):
        import json
        payload = job_in.model_dump()
        print(f"DEBUG: [JobService.create_job] Payload received: {json.dumps(payload, default=str)}")
        
        # Map application_deadline to expires_at automatically
        if payload.get("application_deadline") and not payload.get("expires_at"):
            payload["expires_at"] = payload["application_deadline"]

        db_job = Posts(**payload, created_by=user_id)
        self.db.add(db_job)
        await self.db.commit()
        await self.db.refresh(db_job)
        
        print(f"DEBUG: [JobService.create_job] Job created with ID: {db_job.id}")
        return db_job

    async def update_job(self, job_id: int, job_in: JobUpdate):
        import json
        db_job = await self.get_job(job_id)
        if not db_job:
            return None

        update_data = job_in.model_dump(exclude_unset=True)
        print(f"DEBUG: [JobService.update_job] Update data: {json.dumps(update_data, default=str)}")
        
        for key, value in update_data.items():
            setattr(db_job, key, value)

        await self.db.commit()
        await self.db.refresh(db_job)
        print(f"DEBUG: [JobService.update_job] Job updated: {db_job.id}")
        return db_job

    async def improve_job(self, job_id: int, feedback: str):
        import asyncio
        from src.flow.prompts.human.jd_prompt import JD_IMPROVE_PROMPT
        from src.flow.model.llm_manager import get_llm
        from src.flow.model.structure.jd import JobPost
        from datetime import datetime, timezone
        from fastapi.concurrency import run_in_threadpool

        db_job = await self.get_job(job_id)
        if not db_job:
            return None

        # Build current content so the AI makes targeted edits, not a full rewrite
        def _fmt(items):
            return "\n".join(f"- {i}" for i in (items or [])) or "Not specified"

        current_responsibilities = _fmt((db_job.metadata_json or {}).get("responsibilities", []))

        messages = JD_IMPROVE_PROMPT.format_messages(
            current_description=db_job.description or "",
            current_requirements=_fmt(db_job.requirements),
            current_skills=_fmt(db_job.required_skills),
            current_responsibilities=current_responsibilities,
            job_title=db_job.title,
            location=db_job.location or "Remote",
            employment_type=db_job.job_type.value if db_job.job_type else "Full-time",
            experience_level=db_job.experience_level.value if db_job.experience_level else "Mid",
            feedback=feedback
        )

        # LLM CALL
        llm = get_llm().with_structured_output(JobPost)
        response = await run_in_threadpool(llm.invoke, messages)

        # Convert to dict
        post_data = response.model_dump() if hasattr(response, 'model_dump') else response

        new_requirements = post_data.get("requirements", db_job.requirements or [])
        new_skills = post_data.get("skills", db_job.required_skills or [])
        new_responsibilities = post_data.get("responsibilities", (db_job.metadata_json or {}).get("responsibilities", []))
        new_preferred = post_data.get("preferred_qualifications", db_job.preferred_qualifications or [])
        new_benefits = post_data.get("benefits", db_job.benefits or [])
        new_summary = post_data.get("summary", "")

        # Rebuild the full structured description to keep display format consistent
        def _list(items):
            return "\n".join(f"• {i}" for i in (items or []))

        full_description = f"🔹 JOB SUMMARY\n{new_summary}"
        if new_responsibilities:
            full_description += f"\n\n🔹 KEY RESPONSIBILITIES\n{_list(new_responsibilities)}"
        if new_skills:
            full_description += f"\n\n🔹 REQUIRED SKILLS\n{_list(new_skills)}"
        if new_requirements:
            full_description += f"\n\n🔹 QUALIFICATIONS\n{_list(new_requirements)}"
        if new_preferred:
            full_description += f"\n\n🔹 PREFERRED QUALIFICATIONS\n{_list(new_preferred)}"

        # Update the job record
        db_job.title = post_data.get("job_title", db_job.title)
        db_job.description = full_description
        db_job.required_skills = new_skills
        db_job.preferred_skills = post_data.get("preferred_skills", db_job.preferred_skills)
        db_job.requirements = new_requirements
        db_job.preferred_qualifications = new_preferred
        db_job.benefits = new_benefits

        metadata = db_job.metadata_json or {}
        metadata["responsibilities"] = new_responsibilities
        metadata["requirements"] = new_requirements
        metadata["preferred_qualifications"] = new_preferred
        metadata["benefits"] = new_benefits
        metadata["improved_at_utc"] = datetime.now(timezone.utc).isoformat()
        db_job.metadata_json = metadata

        await self.db.commit()
        await self.db.refresh(db_job)
        return db_job

    async def generate_draft(self, draft_in: any):
        from src.api.services.jd_generator_service import JDGeneratorService

        job_data = {
            "title": draft_in.title,
            "department": draft_in.department,
            "location": draft_in.location or "Remote",
            "experience_level": draft_in.experience_level or "Mid",
            "job_type": draft_in.job_type or "Full-time",
            "required_skills": draft_in.required_skills or [],
        }
        prompt = getattr(draft_in, "prompt", None)

        generator = JDGeneratorService()
        return await generator.generate_job_description(job_data, prompt=prompt)

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

    async def get_dashboard_stats(self, user_id: int):
        from sqlalchemy import func
        from sqlalchemy import desc
        from src.api.models.job import JobStatus
        from src.api.models.application import Application
        from src.api.models.user import User
        
        # Total jobs for this user
        total_query = select(func.count()).select_from(Posts).where(Posts.created_by == user_id)
        total_result = await self.db.execute(total_query)
        total_jobs = total_result.scalar()
        
        # Pending actions: DRAFT or CHANGES_REQUESTED
        pending_query = select(func.count()).select_from(Posts).where(
            Posts.created_by == user_id,
            Posts.status.in_([JobStatus.DRAFT, JobStatus.CHANGES_REQUESTED])
        )
        pending_result = await self.db.execute(pending_query)
        pending_actions = pending_result.scalar()
        
        # Fetch 5 most recent activities (latest applications by updated_at)
        recent_query = select(Application, Posts.title, User.full_name).join(
            Posts, Application.job_id == Posts.id
        ).join(
            User, Application.candidate_id == User.id
        ).where(
            Posts.created_by == user_id
        ).order_by(desc(Application.updated_at)).limit(5)
        
        recent_result = await self.db.execute(recent_query)
        recent_activity = []
        for app, job_title, candidate_name in recent_result.all():
            label = "New application"
            if app.status.value == "SHORTLISTED":
                label = "Candidate shortlisted"
            elif app.status.value == "INTERVIEW_SCHEDULED":
                label = "Interview scheduled"
            elif app.status.value == "HIRED":
                label = "Candidate hired"
            elif app.status.value == "REJECTED":
                label = "Candidate rejected"
                
            recent_activity.append({
                "label": label,
                "sub": f"{candidate_name} for {job_title}",
                "time": app.updated_at.isoformat() if app.updated_at else app.created_at.isoformat(),
                "badge": app.status.value.capitalize(),
                "status": app.status.value
            })
        
        return {
            "total_jobs": total_jobs,
            "pending_actions": pending_actions,
            "recent_activity": recent_activity
        }

    async def publish_job(self, job_id: int, user_id: int):
        from src.api.models.job import JobStatus
        from datetime import datetime, timezone
        from src.api.services.indeed_service import IndeedService

        db_job = await self.get_job(job_id)
        if not db_job:
            return None

        db_job.status = JobStatus.PUBLISHED
        db_job.published_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(db_job)

        # Trigger Indeed Upload
        indeed_service = IndeedService(self.db)
        try:
            await indeed_service.post_job_to_indeed(
                user_id=user_id,
                title=db_job.title,
                description=db_job.description or "",
                location=db_job.location or "Remote",
                company=db_job.company_name or ""
            )
        except Exception:
            pass  # Indeed upload failure should not block job publish
        
        return db_job

    async def review_job(self, job_id: int, status: str, feedback: str = None):
        db_job = await self.get_job(job_id)
        if not db_job:
            return None
            
        db_job.status = status
        db_job.manager_feedback = feedback
        
        await self.db.commit()
        await self.db.refresh(db_job)
        return db_job

    async def extend_deadline(self, job_id: int, new_deadline):
        db_job = await self.get_job(job_id)
        if not db_job:
            return None
        
        db_job.expires_at = new_deadline
        db_job.application_deadline = new_deadline
        
        # If the job was automatically CLOSED due to expiration, 
        # the effective_status property handles it, but if it was manually CLOSED,
        # we might want to let HR reopen it manually or we just leave it CLOSED.
        # But wait, we just update the dates. `effective_status` will compute it properly.

        await self.db.commit()
        await self.db.refresh(db_job)
        return db_job

    async def close_job(self, job_id: int, user_id: int):
        from src.api.models.job import JobStatus
        db_job = await self.get_job(job_id)
        if not db_job:
            return None
            
        db_job.status = JobStatus.CLOSED
        
        await self.db.commit()
        await self.db.refresh(db_job)
        return db_job

    async def delete_job(self, job_id: int, user_id: int) -> bool:
        from sqlalchemy import delete as sql_delete
        from src.api.models.application import Application

        db_job = await self.get_job(job_id)
        if not db_job:
            return False

        # ── Step 1: delete all child applications first ──────────────────────
        # SQLAlchemy's backref does NOT cascade delete, so it tries to SET
        # job_id = NULL which violates the NOT NULL constraint. We must
        # explicitly wipe related rows before removing the parent.
        await self.db.execute(
            sql_delete(Application).where(Application.job_id == job_id)
        )

        # ── Step 2: now it's safe to delete the job itself ───────────────────
        await self.db.delete(db_job)
        await self.db.commit()
        return True