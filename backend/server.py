from fastmcp.server import create_proxy

proxy = create_proxy(
    "http://127.0.0.1:2024/mcp/",
    name="ERP-MCP-Proxy"   # or "ERP_MCP_Proxy"
)

if __name__ == "__main__":
    proxy.run()  # STDIO transport for Claude Desktop 