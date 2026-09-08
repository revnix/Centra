"""Centra ERP LangChain MCP Adapter Connection.

Connects to the running FastMCP server at http://127.0.0.1:2024/mcp
using LangChain's MultiServerMCPClient from langchain_mcp_adapters.
"""

import asyncio
import json
import os
import sys

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

from langchain_mcp_adapters.client import MultiServerMCPClient


async def get_adapter_client(url: str = "http://127.0.0.1:2024/mcp") -> MultiServerMCPClient:
    """Creates a MultiServerMCPClient configured for the Centra ERP FastMCP server."""
    client = MultiServerMCPClient(
        {
            "centra_erp": {
                "url": url,
                "transport": "http",
            }
        }
    )
    return client


async def main():
    mcp_url = "http://127.0.0.1:2024/mcp"
    print(f"Connecting to FastMCP server via LangChain MCP Adapter at: {mcp_url}...")

    # Initialize the client with the server configuration
    client = MultiServerMCPClient(
        {
            "centra_erp": {
                "url": mcp_url,
                "transport": "http",
            }
        }
    )

    try:
        # Discover and load tools from the MCP server
        tools = await client.get_tools()
        print(f"\n✅ Successfully connected! Loaded {len(tools)} MCP tool(s) via LangChain Adapter:\n")
        
        for idx, tool in enumerate(tools, start=1):
            print(f"{idx}. Name: {tool.name}")
            print(f"   Description: {tool.description.strip() if tool.description else 'No description'}")
            print(f"   Args Schema: {tool.args}")
            print("-" * 60)

        return tools

    except Exception as e:
        print(f"\n❌ Error connecting to MCP server at {mcp_url}: {e}")
        print("\nTroubleshooting tips:")
        print("1. Ensure `langgraph dev` is currently running on http://127.0.0.1:2024")
        print("2. Check that `/mcp` is reachable on the server")


if __name__ == "__main__":
    asyncio.run(main())
