"""Legacy entrypoint (deprecated).

The backend has been refactored into `src/app`.
Use `uvicorn src.app.asgi:app` (or `src.app.main:app`).

This file is kept temporarily for backwards compatibility.
"""

from src.app.asgi import app  # noqa: F401


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8123, reload=True)
