"""Validate imported source-backed rows against source_capabilities snapshots.

The CLI accepts a read-only JSON export of public.source_capabilities. This keeps the
normalization job offline/reproducible while refusing to trust arbitrary unit or scope
metadata embedded in an observation CSV.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.ingestion.canonical_csv import CanonicalObservation, ParsedBatch


class CapabilityValidationError(ValueError):
    pass


def load_capabilities(path: str | Path) -> list[dict[str, Any]]:
    file_path = Path(path)
    payload = json.loads(file_path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise CapabilityValidationError("source capabilities JSON must contain a list of objects")
    if any(not isinstance(item, dict) for item in payload):
        raise CapabilityValidationError("each source capability must be a JSON object")
    return payload


def validate_source_capabilities(
    batch: ParsedBatch, capabilities: list[dict[str, Any]]
) -> None:
    """Raise if any source-backed observation lacks one exact matching capability.

    Expected JSON keys mirror source_capabilities: source_id, signal_type,
    observation_grain, unit, flow_stock_semantics, state_scope, coverage_start,
    and coverage_end. Synthetic records intentionally have no source capability.
    """
    if not batch.valid:
        raise CapabilityValidationError("fix canonical CSV errors before capability validation")

    errors: list[str] = []
    for row_number, observation in enumerate(batch.observations, start=2):
        if observation.is_synthetic:
            continue

        matches = [
            capability for capability in capabilities
            if str(capability.get("source_id", "")) == str(observation.source_id)
            and str(capability.get("signal_type", "")) == observation.signal_type
            and str(capability.get("observation_grain", "")).upper()
                == observation.observation_grain
        ]
        if len(matches) != 1:
            errors.append(
                f"row {row_number}: expected exactly one source capability for "
                f"source_id={observation.source_id}, signal_type={observation.signal_type!r}, "
                f"observation_grain={observation.observation_grain}; found {len(matches)}"
            )
            continue

        cap = matches[0]
        if str(cap.get("unit", "")).strip() != observation.unit:
            errors.append(
                f"row {row_number}: unit {observation.unit!r} does not match "
                f"registered source capability unit {cap.get('unit')!r}"
            )
        cap_flow = cap.get("flow_stock_semantics")
        cap_flow = str(cap_flow).strip() if cap_flow is not None else None
        if cap_flow != observation.flow_stock_semantics:
            errors.append(
                f"row {row_number}: flow_stock_semantics "
                f"{observation.flow_stock_semantics!r} does not match registered "
                f"source capability {cap_flow!r}"
            )

        scope = cap.get("state_scope")
        if scope and str(scope).upper() not in {"NATIONAL", observation.state_id.upper()}:
            errors.append(
                f"row {row_number}: state_id {observation.state_id!r} is outside "
                f"registered state_scope {scope!r}"
            )

        for field, year in (
            ("coverage_start", observation.period_year),
            ("coverage_end", observation.period_year),
        ):
            boundary = cap.get(field)
            if boundary in (None, ""):
                continue
            try:
                boundary_int = int(boundary)
            except (TypeError, ValueError):
                errors.append(f"capability for source {observation.source_id} has invalid {field}")
                continue
            if field == "coverage_start" and year < boundary_int:
                errors.append(
                    f"row {row_number}: year {year} precedes capability coverage_start {boundary_int}"
                )
            if field == "coverage_end" and year > boundary_int:
                errors.append(
                    f"row {row_number}: year {year} exceeds capability coverage_end {boundary_int}"
                )

    if errors:
        raise CapabilityValidationError(
            "Source capability validation failed:\n- " + "\n- ".join(errors)
        )
