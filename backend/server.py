"""Centra ERP FastMCP Server Runner / Proxy."""

import os
import sys

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from src.app.mcp.server import mcp

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Centra ERP FastMCP Server")
    parser.add_argument(
        "--transport",
        default="stdio",
        choices=["stdio", "sse", "http"],
        help="Transport type (default: stdio for Claude/Cursor/LangChain)",
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host IP")
    parser.add_argument("--port", type=int, default=8001, help="Port")
    args = parser.parse_args()

    print(f"🚀 Starting Centra ERP FastMCP Server on transport={args.transport}...")
    mcp.run(transport=args.transport, host=args.host, port=args.port)