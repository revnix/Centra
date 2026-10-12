from fastapi import APIRouter

from src.app.modules.attendance.routes import attendance, leave


router = APIRouter(tags=["attendance"])

router.include_router(attendance.router)
router.include_router(leave.router)
