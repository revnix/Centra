import logging
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from src.app.modules.recruiting.models.candidate import CandidateProfile
from src.app.modules.platform.users.models.user import User, UserRole
from src.app.modules.recruiting.models.application import Application
from src.app.modules.recruiting.schemas.candidate import CandidateProfileCreate
from src.app.modules.recruiting.schemas.resume_pooling import (
    ResumePoolingQuery,
    ResumePoolingResponse,
    ResumePoolCandidate,
    ResumePoolScoreBreakdown,
)

logger = logging.getLogger(__name__)

class CandidateService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_profile(self, user_id: int, profile_in: CandidateProfileCreate) -> CandidateProfile:
        """Create a new candidate profile."""
        profile = CandidateProfile(
            user_id=user_id,
            resume_url=profile_in.resume_url,
            linkedin_url=profile_in.linkedin_url,
            portfolio_url=profile_in.portfolio_url,
            skills=profile_in.skills,
            experience_years=profile_in.experience_years,
            bio=profile_in.bio
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def get_profile_by_user_id(self, user_id: int) -> CandidateProfile | None:
        """Get candidate profile by user ID."""
        result = await self.db.execute(select(CandidateProfile).where(CandidateProfile.user_id == user_id))
        return result.scalars().first()

    async def search_resume_pool(self, query: ResumePoolingQuery) -> ResumePoolingResponse:
        """
        Resume Pooling algorithm:
        Retrieves candidates, filters by application timeframe and job title if requested,
        computes AI/ATS compatibility scores based on HR search criteria,
        and returns top perfect matches sorted by score.
        """
        # 1. Base Query: Get candidates with profile, applications and associated job posts
        stmt = (
            select(User)
            .options(
                joinedload(User.candidate_profile),
                selectinload(User.applications).selectinload(Application.job)
            )
            .where(User.role == UserRole.CANDIDATE)
        )

        result = await self.db.execute(stmt)
        users = result.scalars().unique().all()

        # If no users with role=CANDIDATE found, fetch all users with candidate_profile or applications
        if not users:
            stmt_all = (
                select(User)
                .options(
                    joinedload(User.candidate_profile),
                    selectinload(User.applications).selectinload(Application.job)
                )
            )
            res_all = await self.db.execute(stmt_all)
            users = res_all.scalars().unique().all()

        # Timeframe cutoff
        cutoff_date: Optional[datetime] = None
        if query.applied_within_days and query.applied_within_days > 0:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=query.applied_within_days)

        pooled_candidates: List[ResumePoolCandidate] = []
        total_eval_count = 0

        for user in users:
            profile: Optional[CandidateProfile] = getattr(user, 'candidate_profile', None)
            apps: List[Application] = getattr(user, 'applications', []) or []

            # Determine latest application date and latest application info
            latest_app: Optional[Application] = None
            if apps:
                sorted_apps = sorted(apps, key=lambda a: a.created_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
                latest_app = sorted_apps[0]

            latest_activity_date = None
            if latest_app and latest_app.created_at:
                latest_activity_date = latest_app.created_at
            elif profile and profile.created_at:
                latest_activity_date = profile.created_at
            elif user.created_at:
                latest_activity_date = user.created_at

            # Filter by applied_within_days if specified
            if cutoff_date and latest_activity_date:
                activity_tz = latest_activity_date if latest_activity_date.tzinfo else latest_activity_date.replace(tzinfo=timezone.utc)
                if activity_tz < cutoff_date:
                    continue

            # Extract applied job titles
            applied_job_titles = []
            for app in apps:
                if app.job and app.job.title:
                    applied_job_titles.append(app.job.title)

            last_applied_job_title = latest_app.job.title if (latest_app and latest_app.job and latest_app.job.title) else None

            # Filter by job_title if HR specified a target job title requirement
            if query.job_title and query.job_title.strip():
                req_job = query.job_title.strip().lower()
                job_title_match = False
                for jt in applied_job_titles:
                    if req_job in jt.lower() or jt.lower() in req_job:
                        job_title_match = True
                        break
                bio_lower = (profile.bio or "").lower() if profile else ""
                if not job_title_match and req_job in bio_lower:
                    job_title_match = True
                
                # If job title requested and candidate doesn't match, skip or score low
                if not job_title_match:
                    continue

            total_eval_count += 1

            # Extract fields
            cand_skills = profile.skills if (profile and profile.skills) else []
            cand_exp_years = profile.experience_years if profile else 0
            bio_text = (profile.bio or "") if profile else ""
            resume_url = profile.resume_url if profile else None
            linkedin_url = profile.linkedin_url if profile else None
            portfolio_url = profile.portfolio_url if profile else None

            # Get location & education from latest application or profile bio
            city = latest_app.city if (latest_app and latest_app.city) else None
            qualification = latest_app.qualification if (latest_app and latest_app.qualification) else None
            phone_number = latest_app.phone_number if (latest_app and latest_app.phone_number) else None
            cover_letter = latest_app.cover_letter if latest_app else ""

            # Combined text for scanning
            combined_text = f"{bio_text} {cover_letter} {' '.join(cand_skills)} {qualification or ''} {city or ''} {' '.join(applied_job_titles)}".lower()

            # --- MULTI-FACTOR MATCHING SCORE (0 - 100) ---
            feedback_parts = []

            if last_applied_job_title:
                feedback_parts.append(f"Position: {last_applied_job_title}")

            # 1. SKILLS MATCH (0 - 35 points)
            skills_score = 0.0
            req_skills = [s.strip() for s in query.skills if s.strip()]
            if req_skills:
                matched_skills = []
                for s in req_skills:
                    s_lower = s.lower()
                    if any(s_lower == cs.lower() or s_lower in cs.lower() for cs in cand_skills) or (s_lower in combined_text):
                        matched_skills.append(s)
                match_ratio = len(matched_skills) / len(req_skills)
                skills_score = match_ratio * 35.0
                feedback_parts.append(f"Skills: {len(matched_skills)}/{len(req_skills)} matched ({matched_skills})")
            else:
                skills_score = 35.0  # Default full points if no skills specified
                feedback_parts.append("Skills: No filter specified (Full score)")

            # 2. EXPERIENCE MATCH (0 - 25 points)
            experience_score = 0.0
            if query.experience_years is not None and query.experience_years > 0:
                if cand_exp_years >= query.experience_years:
                    experience_score = 25.0
                    feedback_parts.append(f"Experience: {cand_exp_years} yrs (Meets requirement of {query.experience_years} yrs)")
                else:
                    experience_score = (cand_exp_years / query.experience_years) * 25.0
                    feedback_parts.append(f"Experience: {cand_exp_years} yrs vs {query.experience_years} yrs required")
            else:
                experience_score = 25.0
                feedback_parts.append("Experience: No filter specified (Full score)")

            # 3. LOCATION / AREA OF LIVING MATCH (0 - 20 points)
            location_score = 0.0
            if query.area_of_living and query.area_of_living.strip():
                req_loc = query.area_of_living.strip().lower()
                cand_loc = (city or "").strip().lower()
                if req_loc in cand_loc or cand_loc in req_loc or req_loc in combined_text:
                    location_score = 20.0
                    feedback_parts.append(f"Location: Matches '{query.area_of_living}'")
                else:
                    location_score = 0.0
                    feedback_parts.append(f"Location: Candidate city '{city or 'Unknown'}' does not match '{query.area_of_living}'")
            else:
                location_score = 20.0
                feedback_parts.append("Location: No filter specified (Full score)")

            # 4. EDUCATION MATCH (0 - 15 points)
            education_score = 0.0
            if query.education and query.education.strip():
                req_edu = query.education.strip().lower()
                cand_edu = (qualification or "").strip().lower()
                if req_edu in cand_edu or cand_edu in req_edu or req_edu in combined_text:
                    education_score = 15.0
                    feedback_parts.append(f"Education: Matches '{query.education}'")
                elif any(word in combined_text for word in req_edu.split()):
                    education_score = 8.0
                    feedback_parts.append(f"Education: Partial match for '{query.education}'")
                else:
                    education_score = 0.0
                    feedback_parts.append(f"Education: Qualification '{qualification or 'Not specified'}' does not match '{query.education}'")
            else:
                education_score = 15.0
                feedback_parts.append("Education: No filter specified (Full score)")

            # 5. DESCRIPTION / ROLE RELEVANCE (0 - 5 points)
            description_score = 0.0
            if query.description and query.description.strip():
                desc_words = [w.lower() for w in query.description.split() if len(w) > 3]
                if desc_words:
                    matches = sum(1 for w in desc_words if w in combined_text)
                    ratio = min(matches / max(len(desc_words), 1), 1.0)
                    description_score = ratio * 5.0
                    feedback_parts.append(f"Description Relevance: {int(ratio * 100)}% keyword match")
                else:
                    description_score = 5.0
            else:
                description_score = 5.0

            total_score = round(min(skills_score + experience_score + location_score + education_score + description_score, 100.0), 1)

            # Filter out candidates below min_score cutoff
            if total_score < query.min_score:
                continue

            breakdown = ResumePoolScoreBreakdown(
                skills_score=round(skills_score, 1),
                experience_score=round(experience_score, 1),
                location_score=round(location_score, 1),
                education_score=round(education_score, 1),
                description_score=round(description_score, 1)
            )

            candidate_item = ResumePoolCandidate(
                user_id=user.id,
                full_name=user.full_name or user.username,
                email=user.email,
                phone_number=phone_number,
                city=city,
                qualification=qualification,
                skills=cand_skills,
                experience_years=cand_exp_years,
                bio=bio_text,
                resume_url=resume_url,
                linkedin_url=linkedin_url,
                portfolio_url=portfolio_url,
                last_applied_job_title=last_applied_job_title,
                applied_job_titles=applied_job_titles,
                match_score=total_score,
                match_breakdown=breakdown,
                match_reason=" | ".join(feedback_parts),
                last_applied_at=latest_activity_date,
                applications_count=len(apps)
            )
            pooled_candidates.append(candidate_item)

        # Sort candidate pool by match_score descending (best matches first)
        pooled_candidates.sort(key=lambda c: c.match_score, reverse=True)

        # Return top perfect candidates up to query.limit (default 15)
        top_candidates = pooled_candidates[:query.limit]

        summary_parts = []
        if query.job_title:
            summary_parts.append(f"Job Title: {query.job_title}")
        if query.skills:
            summary_parts.append(f"Skills: {', '.join(query.skills)}")
        if query.area_of_living:
            summary_parts.append(f"Location: {query.area_of_living}")
        if query.education:
            summary_parts.append(f"Education: {query.education}")
        if query.experience_years:
            summary_parts.append(f"Min Experience: {query.experience_years} yrs")
        if query.applied_within_days:
            summary_parts.append(f"Applied Within: Last {query.applied_within_days} days")

        query_summary = " | ".join(summary_parts) if summary_parts else "All candidates in database"

        return ResumePoolingResponse(
            total_found=len(pooled_candidates),
            returned_count=len(top_candidates),
            query_summary=query_summary,
            candidates=top_candidates
        )
