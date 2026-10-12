from fastapi import APIRouter

from src.app.modules.platform.users.routes import admin_users, auth, users


router = APIRouter(tags=["users"])

# Auth
router.include_router(auth.router, prefix="/auth", tags=["auth"])

# User self-service
router.include_router(users.router, prefix="/users", tags=["users"])

# Admin
router.include_router(admin_users.router, prefix="/admin/users", tags=["admin-users"])
