"""Vercel entrypoint for the SHRAMIK FastAPI service.

When the Vercel project root is set to ``backend/``, this recognized entrypoint
exports the same ASGI application used by local development and CI.
"""

from app.main import app

__all__ = ["app"]
