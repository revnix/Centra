from fastapi import APIRouter

from src.app.modules.dashboard.routes import summary


router = APIRouter()
router.include_router(summary.router)
