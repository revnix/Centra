"""Compatibility entrypoint.

Expose the new ASGI app at `src.app.main:app`.
"""

from src.app.asgi import app  # noqa: F401
