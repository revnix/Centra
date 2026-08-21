from fastapi import APIRouter

from src.app.modules.platform.org.routes import departments, team


router = APIRouter(prefix="/org", tags=["org"])

router.include_router(departments.router)
router.include_router(team.router)
