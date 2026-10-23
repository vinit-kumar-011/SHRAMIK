"""Append-only persistence for raw OGD API snapshots; no canonical promotion."""
from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.ingestion.ogd_client import OGDResult
from app.services.ingestion.source_registry import OGDSource

PARSER_VERSION = "ogd-resource-api-v1"
TRANSFORMATION_VERSION = "raw-json-staging-v1"


def _canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def persist_ogd_result(
    db: Session, *, source: OGDSource, result: OGDResult, page_size: int
) -> dict[str, Any]:
    """Persist retrieval metadata and returned rows atomically."""
    retrieved_at = datetime.now(timezone.utc)
    retrieved_id = uuid.uuid4()
    digest = _sha256(_canonical_json(result.records))
    status = "PARTIAL" if result.truncated else "SUCCESS"
    endpoint = f"https://api.data.gov.in/resource/{result.resource_id}"
    notes = (
        f"OGD source snapshot; received_records={result.received_records}; "
        f"reported_total={result.reported_total}; truncated={str(result.truncated).lower()}"
    )
    try:
        db.execute(
            text(
                """INSERT INTO public.source_retrievals
                   (id, source_id, canonical_url, retrieved_at, content_identifier, sha256_hash,
                    retrieval_status, parser_version, transformation_version, notes)
                   VALUES (:id, :source_id, :url, :retrieved_at, :content_identifier, :sha256_hash,
                           :status, :parser_version, :transformation_version, :notes)"""
            ),
            {
                "id": retrieved_id,
                "source_id": uuid.UUID(source.source_id),
                "url": endpoint,
                "retrieved_at": retrieved_at,
                "content_identifier": f"ogd-resource:{result.resource_id}",
                "sha256_hash": digest,
                "status": status,
                "parser_version": PARSER_VERSION,
                "transformation_version": TRANSFORMATION_VERSION,
                "notes": notes,
            },
        )
        db.execute(
            text(
                """INSERT INTO public.stg_ogd_api_fetch_runs
                   (retrieval_id, source_key, resource_id, reported_total, received_records,
                    page_size, truncated, field_names, response_sha256, fetched_at)
                   VALUES (:retrieval_id, :source_key, :resource_id, :reported_total, :received_records,
                           :page_size, :truncated, CAST(:field_names AS jsonb), :response_sha256, :fetched_at)"""
            ),
            {
                "retrieval_id": retrieved_id,
                "source_key": source.key,
                "resource_id": result.resource_id,
                "reported_total": result.reported_total,
                "received_records": result.received_records,
                "page_size": page_size,
                "truncated": result.truncated,
                "field_names": json.dumps(result.field_names),
                "response_sha256": digest,
                "fetched_at": retrieved_at,
            },
        )
        if result.records:
            rows = []
            for idx, record in enumerate(result.records):
                record_json = _canonical_json(record)
                rows.append(
                    {
                        "retrieval_id": retrieved_id,
                        "record_ordinal": idx,
                        "record_sha256": _sha256(record_json),
                        "record_payload": record_json,
                    }
                )
            db.execute(
                text(
                    """INSERT INTO public.stg_ogd_api_records
                       (retrieval_id, record_ordinal, record_sha256, record_payload)
                       VALUES (:retrieval_id, :record_ordinal, :record_sha256, CAST(:record_payload AS jsonb))"""
                ),
                rows,
            )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {
        "retrieval_id": str(retrieved_id),
        "source_key": source.key,
        "retrieval_status": status,
        "received_records": result.received_records,
        "reported_total": result.reported_total,
        "truncated": result.truncated,
        "field_names": result.field_names,
        "response_sha256": digest,
        "fetched_at": retrieved_at.isoformat(),
    }


def persist_ogd_failure(
    db: Session, *, source: OGDSource, resource_id: str, error_code: str, error_summary: str
) -> str:
    """Persist a failed attempt without storing an API key or upstream body."""
    retrieval_id = uuid.uuid4()
    retrieved_at = datetime.now(timezone.utc)
    endpoint = (
        f"https://api.data.gov.in/resource/{resource_id}" if resource_id else source.resource_url
    )
    safe_summary = (error_summary or "OGD API fetch failed")[:300]
    try:
        db.execute(
            text(
                """INSERT INTO public.source_retrievals
                   (id, source_id, canonical_url, retrieved_at, content_identifier, sha256_hash,
                    retrieval_status, parser_version, transformation_version, notes)
                   VALUES (:id, :source_id, :url, :retrieved_at, :content_identifier, NULL, 'FAILED',
                           :parser_version, :transformation_version, :notes)"""
            ),
            {
                "id": retrieval_id,
                "source_id": uuid.UUID(source.source_id),
                "url": endpoint,
                "retrieved_at": retrieved_at,
                "content_identifier": f"ogd-resource:{resource_id}" if resource_id else None,
                "parser_version": PARSER_VERSION,
                "transformation_version": TRANSFORMATION_VERSION,
                "notes": f"error_code={error_code}; summary={safe_summary}",
            },
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return str(retrieval_id)
