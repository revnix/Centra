from fastapi import APIRouter

from src.app.ai.routes import langgraph


router = APIRouter(tags=["ai"])
router.include_router(langgraph.router)
