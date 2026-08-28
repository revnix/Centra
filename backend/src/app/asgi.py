"""ASGI application (new structure).

This is the primary entrypoint going forward.
- API routes are served under `/api/v1`.
- LangGraph SDK endpoints remain at the root (no `/api/v1`) for compatibility.

Note: legacy `src/api/main.py` still exists during cleanup, but new deployments
should use `uvicorn src.app.asgi:app`.
"""

from fastapi import FastAPI
from fastmcp import FastMCP

from src.app.api.v1.router import api_v1_router


def create_app() -> FastAPI:
    app = FastAPI(title="ERP Backend")
    app.include_router(api_v1_router)

    # 1. Generate an MCP server from the FastAPI app's routes/OpenAPI spec
    mcp = FastMCP.from_fastapi(app=app, name="ERP MCP")

    # 2. Turn it into an ASGI app
    mcp_app = mcp.http_app(path="/mcp")

    # 3. Mount it onto your existing app — must pass mcp_app.lifespan
    app.mount("/mcp-server", mcp_app)
    app.router.lifespan_context = mcp_app.lifespan

    return app


app = create_app()
