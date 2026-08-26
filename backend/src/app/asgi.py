"""ASGI application (new structure).

This is the primary entrypoint going forward.
- API routes are served under `/api/v1`.
- LangGraph SDK endpoints remain at the root (no `/api/v1`) for compatibility.

Note: legacy `src/api/main.py` still exists during cleanup, but new deployments
should use `uvicorn src.app.asgi:app`.
"""

from fastapi import FastAPI

from src.app.api.v1.router import api_v1_router
from src.app.ai.routes import langgraph


def create_app() -> FastAPI:
    app = FastAPI(title="ERP Backend")
    app.include_router(api_v1_router)

    # # LangGraph SDK expects these endpoints at the root.
    # app.include_router(langgraph.router, tags=["langgraph"])
    return app


app = create_app()
