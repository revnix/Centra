from fastapi import APIRouter

from src.app.modules.platform.org.routes import departments


router = APIRouter(prefix="/org", tags=["org"])

router.include_router(departments.router)
