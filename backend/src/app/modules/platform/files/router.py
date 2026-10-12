from fastapi import APIRouter

from src.app.modules.platform.files.routes import uploads


router = APIRouter(tags=["files"])
router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
