# Centra ERP FastMCP Server

This folder contains an **MCP (Model Context Protocol) Server** that automatically converts all **FastAPI routes** from the Centra ERP backend into accessible tools for AI agents, LLMs, and models.

---

## 📁 File Structure

```
backend/mcp_server/
├── server.py   # Converts FastAPI app routes into an MCP server
├── client.py   # Client script to list & execute MCP tools
└── README.md   # Documentation
```

---

## 🚀 How It Works

`server.py` uses `FastMCP.from_fastapi(app)` to inspect the main FastAPI application (`src.app.asgi:app`). It reads all registered endpoints across recruiting, users, attendance, organization, dashboard, integrations, and health modules, converting them into standard MCP tools.

---

## 🏃 Running the MCP Server

### 1. In-Memory Mode (No HTTP server required for testing/scripts)
You can directly run `client.py` to inspect tools and execute route functions in-memory:

```bash
.\.venv\Scripts\python.exe -m mcp_server.client
```

### 2. Standalone HTTP Server Mode
Start the HTTP FastMCP server:

```bash
.\.venv\Scripts\python.exe -m mcp_server.server --transport http --port 8001
```

The server will listen at `http://localhost:8001/mcp`.

---

## 🧪 Testing with the Client

### List all tools converted from FastAPI routes:
```bash
.\.venv\Scripts\python.exe -m mcp_server.client
```

### Invoke a specific route tool:
```bash
# Example: Call public jobs route
.\.venv\Scripts\python.exe -m mcp_server.client --call-tool "read_public_jobs_api_v1_recruiting_jobs_public_get"
```

---

## 🤖 Connecting to AI Agents & Models

### Claude Desktop / Cursor / AI Agent Configuration

Add the following to your MCP client configuration (e.g. `mcp.json` or Claude Desktop config):

```json
{
  "mcpServers": {
    "centra-erp": {
      "command": "d:/revnix/Centra/backend/.venv/Scripts/python.exe",
      "args": [
        "-m",
        "mcp_server.server",
        "--transport",
        "stdio"
      ],
      "cwd": "d:/revnix/Centra/backend"
    }
  }
}
```
