from fastapi import APIRouter

from src.app.modules.people.routes import employees


router = APIRouter(prefix="/hr", tags=["hr"])

router.include_router(employees.router)
