from fastapi import APIRouter

# Phase 3: use the migrated routes directly.
from src.app.modules.platform.users.routes import admin_users, auth


router = APIRouter(tags=["users"])

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(admin_users.router, prefix="/admin/users", tags=["admin-users"])
