"""Protected endpoints for previewing and snapshotting allow-listed OGD resources."""
from __future__ import annotations

import secrets
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.services.ingestion.ogd_client import OGDAPIError, OGDClient
from app.services.ingestion.persistence import persist_ogd_failure, persist_ogd_result
from app.services.ingestion.source_registry import OGD_SOURCES, OGDSource, get_source

router = APIRouter(prefix="/ingestion", tags=["source-ingestion"])


def _resolve_configuration(source: OGDSource, settings: Settings) -> tuple[str, str]:
    api_key = settings.ogd_api_key
    resource_id = getattr(settings, source.resource_id_setting, None)
    if not api_key:
        raise HTTPException(status_code=503, detail="OGD_API_KEY is not configured on the backend.")
    if not resource_id:
        raise HTTPException(
            status_code=503,
            detail=f"Resource ID for '{source.key}' is not configured. Set {source.resource_id_setting.upper()}.",
        )
    return api_key, resource_id


def require_ingestion_token(
    x_ingestion_token: str | None = Header(default=None, alias="X-Ingestion-Token"),
    settings: Settings = Depends(get_settings),
) -> None:
    expected = settings.ingestion_admin_token
    if not expected:
        raise HTTPException(status_code=503, detail="Source ingestion is disabled; set INGESTION_ADMIN_TOKEN.")
    if not x_ingestion_token or not secrets.compare_digest(x_ingestion_token, expected):
        raise HTTPException(status_code=401, detail="Invalid ingestion token.")


def _client(api_key: str, settings: Settings) -> OGDClient:
    return OGDClient(api_key, timeout_seconds=settings.ogd_timeout_seconds)


@router.get("/sources")
def list_ingestion_sources(settings: Settings = Depends(get_settings)) -> dict[str, Any]:
    """List safe source metadata and readiness flags without revealing secrets."""
    return {
        "provider": "Open Government Data Platform India (OGD)",
        "sources": [source.public_metadata(settings) for source in OGD_SOURCES.values()],
        "notes": [
            "A configured resource ID does not prove that its schema has been reviewed.",
            "Fetched records remain raw staging snapshots until a source-specific normaliser is validated.",
        ],
    }


@router.post("/preview/{source_key}", dependencies=[Depends(require_ingestion_token)])
def preview_source(
    source_key: str,
    page_size: int = Query(default=10, ge=1, le=100),
    sample_rows: int = Query(default=5, ge=0, le=10),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Make a bounded live API call and return schema/sample only; does not persist."""
    try:
        source = get_source(source_key)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown registered source key.") from None
    api_key, resource_id = _resolve_configuration(source, settings)
    try:
        result = _client(api_key, settings).fetch_records(
            resource_id, page_size=page_size, max_records=page_size
        )
    except (OGDAPIError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from None
    return {
        "source_key": source.key,
        "source_name": source.name,
        "resource_id": result.resource_id,
        "reported_total": result.reported_total,
        "received_records": result.received_records,
        "field_names": result.field_names,
        "sample_records": result.records[:sample_rows],
        "truncated": result.truncated,
        "persisted": False,
        "interpretation_warning": source.interpretation,
    }


@router.post("/sync/{source_key}", dependencies=[Depends(require_ingestion_token)])
def sync_source(
    source_key: str,
    page_size: int = Query(default=500, ge=1, le=500),
    max_records: int = Query(default=5000, ge=1, le=25000),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Fetch a bounded OGD snapshot and append to raw staging; never promotes it."""
    try:
        source = get_source(source_key)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown registered source key.") from None
    api_key, resource_id = _resolve_configuration(source, settings)
    try:
        result = _client(api_key, settings).fetch_records(
            resource_id, page_size=page_size, max_records=max_records
        )
    except (OGDAPIError, ValueError) as exc:
        try:
            retrieval_id = persist_ogd_failure(
                db,
                source=source,
                resource_id=resource_id,
                error_code=type(exc).__name__,
                error_summary=str(exc),
            )
        except Exception:
            retrieval_id = None
        raise HTTPException(
            status_code=502,
            detail={"message": str(exc), "failed_retrieval_id": retrieval_id},
        ) from None
    try:
        persisted = persist_ogd_result(db, source=source, result=result, page_size=page_size)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Snapshot could not be persisted. Check that the API-staging migration is applied and DATABASE_URL is configured.",
        ) from None
    return {
        **persisted,
        "canonical_observations_created": 0,
        "next_step": "Validate source schema and implement a source-specific normaliser before promotion.",
        "interpretation_warning": source.interpretation,
    }


@router.get("/runs", dependencies=[Depends(require_ingestion_token)])
def recent_ingestion_runs(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """List recent fetch metadata without raw payloads or credentials."""
    result = db.execute(
        text(
            """SELECT r.retrieval_id, r.source_key, r.resource_id, r.reported_total,
                      r.received_records, r.page_size, r.truncated, r.field_names,
                      r.response_sha256, r.fetched_at, sr.retrieval_status,
                      sr.canonical_url, sr.sha256_hash, sr.notes
               FROM public.stg_ogd_api_fetch_runs r
               JOIN public.source_retrievals sr ON sr.id = r.retrieval_id
               ORDER BY r.fetched_at DESC LIMIT :limit"""
        ),
        {"limit": limit},
    ).mappings()
    rows = [dict(row) for row in result]
    for row in rows:
        for key, value in tuple(row.items()):
            if hasattr(value, "isoformat"):
                row[key] = value.isoformat()
            elif key == "retrieval_id":
                row[key] = str(value)
    return {"count": len(rows), "runs": rows}
