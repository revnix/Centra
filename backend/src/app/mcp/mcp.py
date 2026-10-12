from fastmcp import FastMCP
from src.app.asgi import app  # your existing FastAPI app

mcp = FastMCP.from_fastapi(app=app)