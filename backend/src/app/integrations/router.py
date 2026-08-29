from fastapi import APIRouter

from src.app.integrations.gmail.routes import gmail, integrations
from src.app.integrations.indeed.routes import admin as indeed_admin
from src.app.integrations.linkedin.routes import admin as linkedin_admin
from src.app.integrations.whatsapp.routes import admin as whatsapp_admin


router = APIRouter()

# Mirror legacy mounting prefixes from `src/api/main.py`.
router.include_router(gmail.router, prefix="/gmail", tags=["gmail"])
router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
router.include_router(linkedin_admin.router, prefix="/admin/integrations/linkedin", tags=["admin-integrations-linkedin"])
router.include_router(indeed_admin.router, prefix="/admin/integrations/indeed", tags=["admin-integrations-indeed"])
router.include_router(whatsapp_admin.router, prefix="/admin/integrations/whatsapp", tags=["admin-integrations-whatsapp"])
