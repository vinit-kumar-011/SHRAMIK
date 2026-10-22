"""Database engine helper for ingestion and batch scripts."""

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from app.core.config import get_settings


def get_engine() -> Engine:
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError(
            "DATABASE_URL is not configured. Run from the backend directory with backend/.env present."
        )
    return create_engine(settings.database_url, pool_pre_ping=True)
