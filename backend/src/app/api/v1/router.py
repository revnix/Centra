from fastapi import APIRouter

from src.app.api.v1.routes import health, meta
from src.app.modules.platform.users import router as users_router
from src.app.modules.platform.files import router as files_router
from src.app.modules.platform.org import router as org_router
from src.app.modules.people import router as people_router
from src.app.modules.recruiting import router as recruiting_router
from src.app.modules.attendance import router as attendance_router


api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health.router)
api_v1_router.include_router(meta.router)

api_v1_router.include_router(users_router.router)
api_v1_router.include_router(files_router.router)
api_v1_router.include_router(org_router.router)
api_v1_router.include_router(people_router.router)
api_v1_router.include_router(recruiting_router.router)
api_v1_router.include_router(attendance_router.router)
