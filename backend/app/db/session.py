from collections.abc import Generator
from fastapi import HTTPException

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True) if settings.database_url else None
SessionLocal = (
    sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    if engine
    else None
)


def get_db() -> Generator[Session, None, None]:
    if SessionLocal is None:
        raise HTTPException(
            status_code=503,
            detail="Database access is not configured on this API.",
        )

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
