"""Centra ERP FastMCP Server.

Automatically exposes all FastAPI routes from src.app.asgi as MCP tools
for AI agents, LLMs, and models.
"""

import argparse
import os
import sys

# Ensure UTF-8 encoding on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

# Add the backend root directory to sys.path so src imports work reliably
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastmcp import FastMCP
from src.app.asgi import app as fastapi_app


def create_mcp_server() -> FastMCP:
    """Creates FastMCP server populated with all FastAPI routes."""
    mcp_server = FastMCP.from_fastapi(
        app=fastapi_app,
        name="Centra ERP MCP Server",
    )
    return mcp_server


mcp = create_mcp_server()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Centra ERP FastMCP Server")
    parser.add_argument(
        "--transport",
        default="http",
        choices=["http", "sse", "stdio"],
        help="Transport protocol (http, sse, stdio)",
    )
    parser.add_argument("--host", default="0.0.0.0", help="Host IP address")
    parser.add_argument("--port", type=int, default=8001, help="Port to run server on")

    args = parser.parse_args()

    print(
        f"🚀 Starting Centra ERP FastMCP Server [transport={args.transport}, host={args.host}, port={args.port}]"
    )
    mcp.run(transport=args.transport, host=args.host, port=args.port)
