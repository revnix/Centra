from fastapi import APIRouter

from src.app.modules.attendance.routes import attendance


router = APIRouter(tags=["attendance"])

router.include_router(attendance.router)
