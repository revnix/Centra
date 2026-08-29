from fastapi import APIRouter

from src.app.modules.recruiting.routes import (
    applications,
    candidates,
    inbox,
    interview_schedules,
    interviews,
    jobs,
    onboarding,
    screening,
)


router = APIRouter(tags=["recruiting"])

# Mirror legacy mounting prefixes from `src/api/main.py`.
router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
router.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
router.include_router(applications.router, prefix="/applications", tags=["applications"])
router.include_router(screening.router, prefix="/screening", tags=["screening"])
router.include_router(interviews.router, prefix="/interviews", tags=["interviews"])
router.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
router.include_router(inbox.router, prefix="/inbox", tags=["inbox"])

# This router already contains `/interview-schedules/...` paths.
router.include_router(interview_schedules.router, tags=["interview-schedules"])
