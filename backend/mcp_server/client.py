"""Centra ERP FastMCP Client.

Demonstrates listing tools converted from FastAPI routes and calling tools on the MCP server.
"""

import argparse
import asyncio
import json
import os
import sys

# Ensure UTF-8 encoding on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

# Add the backend root directory to sys.path so server imports work reliably
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastmcp import Client
from mcp_server.server import mcp as local_mcp_instance


async def run_in_memory_demo(tool_to_call: str | None = None, raw_args: str | None = None):
    """Connects to the local FastMCP server directly in-memory (no network server required)."""
    print("Connecting to FastMCP server in-memory...\n")
    
    tool_args = json.loads(raw_args) if raw_args else {}

    async with Client(local_mcp_instance) as client:
        tools = await client.list_tools()
        print(f"Total tools converted from FastAPI routes: {len(tools)}\n")

        print("--- Converted Route Tools Summary ---")
        for idx, tool in enumerate(tools, start=1):
            desc = tool.description.strip().split("\n")[0] if tool.description else "No description"
            print(f"{idx:2d}. {tool.name:<55} | {desc}")

        if tool_to_call:
            print(f"\n[Tool Call] Executing '{tool_to_call}' with args: {tool_args}...")
            try:
                result = await client.call_tool(tool_to_call, tool_args)
                data = result.data if hasattr(result, "data") else result
                print(f"Output:\n{json.dumps(data, indent=2, default=str) if isinstance(data, (dict, list)) else data}")
            except Exception as e:
                print(f"Error invoking tool '{tool_to_call}': {e}")


async def run_remote_demo(url: str, tool_to_call: str | None = None, raw_args: str | None = None):
    """Connects to a running FastMCP HTTP/SSE server."""
    print(f"Connecting to remote FastMCP server at {url}...\n")
    tool_args = json.loads(raw_args) if raw_args else {}

    client = Client(url)
    async with client:
        tools = await client.list_tools()
        print(f"Total tools available on remote server: {len(tools)}\n")

        for idx, tool in enumerate(tools, start=1):
            print(f"{idx:2d}. {tool.name}")

        if tool_to_call:
            print(f"\n[Tool Call] Executing '{tool_to_call}'...")
            result = await client.call_tool(tool_to_call, tool_args)
            print(f"Output: {result}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Centra ERP FastMCP Client")
    parser.add_argument("--url", help="Remote MCP Server URL (e.g. http://localhost:8001/mcp)")
    parser.add_argument("--call-tool", help="Specific tool name to execute")
    parser.add_argument("--args", help="JSON string of arguments for the tool call")
    args = parser.parse_args()

    if args.url:
        asyncio.run(run_remote_demo(args.url, args.call_tool, args.args))
    else:
        asyncio.run(run_in_memory_demo(args.call_tool, args.args))
