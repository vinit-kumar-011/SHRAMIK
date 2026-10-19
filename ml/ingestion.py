"""Strict CSV ingestion boundary for SHRAMIK canonical observations.

CSV is an interchange format, not the system of record. This module validates shape,
units and provenance before any caller writes records to PostgreSQL.
"""
from __future__ import annotations

import csv
import hashlib
import math
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Iterable
from uuid import UUID


ALLOWED_KINDS = {"DEMAND", "SUPPLY"}
ALLOWED_PROVENANCE = {"SOURCE_BACKED", "SYNTHETIC_DEMO"}
ALLOWED_GRAINS = {
    "STATE",
    "STATE_SECTOR",
    "STATE_SKILL",
    "STATE_SECTOR_SKILL",
    "DISTRICT",
    "DISTRICT_SECTOR",
    "DISTRICT_SKILL",
    "DISTRICT_SECTOR_SKILL",
}
REQUIRED_COLUMNS = {
    "kind", "state_id", "district_id", "sector_id", "skill_id",
    "observation_grain", "period_type", "period_year", "quantity",
    "signal_type", "source_id", "retrieval_id", "evidence_item_id",
    "provenance_state", "is_synthetic", "generation_run_id",
    "unit", "flow_stock_semantics", "occupation_scope",
    "transformation_note",
}
GRAIN_DIMENSIONS = {
    "STATE": (False, False, False),
    "STATE_SECTOR": (False, True, False),
    "STATE_SKILL": (False, False, True),
    "STATE_SECTOR_SKILL": (False, True, True),
    "DISTRICT": (True, False, False),
    "DISTRICT_SECTOR": (True, True, False),
    "DISTRICT_SKILL": (True, False, True),
    "DISTRICT_SECTOR_SKILL": (True, True, True),
}


class IngestionValidationError(ValueError):
    """Raised when a canonical dataset cannot be safely ingested."""


@dataclass(frozen=True)
class Observation:
    kind: str
    state_id: str
    district_id: str | None
    sector_id: str | None
    skill_id: str | None
    observation_grain: str
    period_type: str
    period_year: int
    quantity: float | None
    signal_type: str
    source_id: str | None
    retrieval_id: str | None
    evidence_item_id: str | None
    provenance_state: str
    is_synthetic: bool
    generation_run_id: str | None
    unit: str
    flow_stock_semantics: str
    occupation_scope: str
    transformation_note: str | None
    source_date: date | None = None

    @property
    def target_key(self) -> tuple[str, str, str]:
        """State, district, skill; only district/skill-specific series are forecastable."""
        if self.district_id is None or self.skill_id is None:
            raise IngestionValidationError(
                "Aggregate observations do not have a district × skill target."
            )
        return (self.state_id, self.district_id, self.skill_id)

    @property
    def series_key(self) -> tuple[str, ...]:
        identity = (
            self.kind, self.state_id, self.district_id or "",
            self.sector_id or "", self.skill_id or "", self.observation_grain,
            self.signal_type, self.source_id or "",
            self.generation_run_id or "",
        )
        return identity


@dataclass(frozen=True)
class ParsedDataset:
    observations: tuple[Observation, ...]
    sha256: str
    row_count: int


def _text(row: dict[str, str | None], name: str) -> str | None:
    value = (row.get(name) or "").strip()
    return value or None


def _uuid_or_none(value: str | None, field: str, line_number: int) -> str | None:
    if value is None:
        return None
    try:
        return str(UUID(value))
    except (ValueError, TypeError, AttributeError) as exc:
        raise IngestionValidationError(
            f"line {line_number}: {field} must be a UUID or blank."
        ) from exc


def _boolean(value: str | None, field: str, line_number: int) -> bool:
    normalized = (value or "").strip().lower()
    if normalized in {"true", "1", "yes"}:
        return True
    if normalized in {"false", "0", "no"}:
        return False
    raise IngestionValidationError(
        f"line {line_number}: {field} must be true or false."
    )


def _quantity(value: str | None, line_number: int) -> float | None:
    normalized = (value or "").strip()
    if not normalized:
        return None
    try:
        quantity = float(normalized)
    except ValueError as exc:
        raise IngestionValidationError(
            f"line {line_number}: quantity must be numeric or blank."
        ) from exc
    if not math.isfinite(quantity) or quantity < 0:
        raise IngestionValidationError(
            f"line {line_number}: quantity must be finite and non-negative."
        )
    return quantity


def _parse_row(raw: dict[str, str | None], line_number: int) -> Observation:
    kind = (_text(raw, "kind") or "").upper()
    grain = (_text(raw, "observation_grain") or "").upper()
    period_type = (_text(raw, "period_type") or "").upper()
    provenance = (_text(raw, "provenance_state") or "").upper()
    is_synthetic = _boolean(_text(raw, "is_synthetic"), "is_synthetic", line_number)

    if kind not in ALLOWED_KINDS:
        raise IngestionValidationError(
            f"line {line_number}: kind must be DEMAND or SUPPLY."
        )
    if grain not in ALLOWED_GRAINS:
        raise IngestionValidationError(
            f"line {line_number}: unsupported observation_grain {grain!r}."
        )
    if period_type != "YEAR":
        raise IngestionValidationError(
            f"line {line_number}: period_type must be YEAR; annual data is not expanded."
        )
    try:
        year = int((_text(raw, "period_year") or ""))
    except ValueError as exc:
        raise IngestionValidationError(
            f"line {line_number}: period_year must be a four-digit year."
        ) from exc
    if not 1900 <= year <= date.today().year:
        raise IngestionValidationError(
            f"line {line_number}: period_year must be between 1900 and the current year."
        )

    state_id = _text(raw, "state_id")
    district_id = _text(raw, "district_id")
    sector_id = _text(raw, "sector_id")
    skill_id = _text(raw, "skill_id")
    if not state_id:
        raise IngestionValidationError(f"line {line_number}: state_id is required.")
    require_district, require_sector, require_skill = GRAIN_DIMENSIONS[grain]
    if require_district != bool(district_id):
        raise IngestionValidationError(
            f"line {line_number}: district_id does not match observation_grain {grain}."
        )
    if require_sector != bool(sector_id):
        raise IngestionValidationError(
            f"line {line_number}: sector_id does not match observation_grain {grain}."
        )
    if require_skill != bool(skill_id):
        raise IngestionValidationError(
            f"line {line_number}: skill_id does not match observation_grain {grain}."
        )

    if provenance not in ALLOWED_PROVENANCE:
        raise IngestionValidationError(
            f"line {line_number}: invalid provenance_state {provenance!r}."
        )
    source_id = _uuid_or_none(_text(raw, "source_id"), "source_id", line_number)
    retrieval_id = _uuid_or_none(_text(raw, "retrieval_id"), "retrieval_id", line_number)
    evidence_id = _uuid_or_none(
        _text(raw, "evidence_item_id"), "evidence_item_id", line_number
    )
    generation_run_id = _uuid_or_none(
        _text(raw, "generation_run_id"), "generation_run_id", line_number
    )
    note = _text(raw, "transformation_note")

    if provenance == "SOURCE_BACKED":
        if is_synthetic or not source_id:
            raise IngestionValidationError(
                f"line {line_number}: SOURCE_BACKED requires source_id and is_synthetic=false."
            )
        if not retrieval_id:
            raise IngestionValidationError(
                f"line {line_number}: SOURCE_BACKED rows require retrieval_id for reproducibility."
            )
        if generation_run_id:
            raise IngestionValidationError(
                f"line {line_number}: SOURCE_BACKED rows cannot have generation_run_id."
            )
    else:
        if not is_synthetic or source_id or retrieval_id:
            raise IngestionValidationError(
                f"line {line_number}: SYNTHETIC_DEMO requires is_synthetic=true and blank source_id/retrieval_id."
            )
        if not note:
            raise IngestionValidationError(
                f"line {line_number}: synthetic rows require a transformation_note."
            )

    unit = _text(raw, "unit")
    semantics = _text(raw, "flow_stock_semantics")
    occupation_scope = _text(raw, "occupation_scope")
    signal_type = _text(raw, "signal_type")
    if not unit or not semantics or not occupation_scope or not signal_type:
        raise IngestionValidationError(
            f"line {line_number}: signal_type, unit, flow_stock_semantics and occupation_scope are required."
        )

    source_date_value = _text(raw, "source_date")
    source_date = None
    if source_date_value:
        try:
            source_date = date.fromisoformat(source_date_value)
        except ValueError as exc:
            raise IngestionValidationError(
                f"line {line_number}: source_date must use YYYY-MM-DD."
            ) from exc

    return Observation(
        kind=kind,
        state_id=state_id,
        district_id=district_id,
        sector_id=sector_id,
        skill_id=skill_id,
        observation_grain=grain,
        period_type=period_type,
        period_year=year,
        quantity=_quantity(_text(raw, "quantity"), line_number),
        signal_type=signal_type,
        source_id=source_id,
        retrieval_id=retrieval_id,
        evidence_item_id=evidence_id,
        provenance_state=provenance,
        is_synthetic=is_synthetic,
        generation_run_id=generation_run_id,
        unit=unit,
        flow_stock_semantics=semantics,
        occupation_scope=occupation_scope,
        transformation_note=note,
        source_date=source_date,
    )


def validate_observations(observations: Iterable[Observation]) -> tuple[Observation, ...]:
    """Reject duplicate source-series periods rather than silently aggregating them."""
    rows = tuple(observations)
    seen: set[tuple[tuple[str, ...], int]] = set()
    for row in rows:
        key = (row.series_key, row.period_year)
        if key in seen:
            raise IngestionValidationError(
                "Duplicate observation for the same series and year: "
                f"{row.kind}, {row.signal_type}, {row.period_year}, "
                f"district={row.district_id}, skill={row.skill_id}. "
                "Resolve duplicates upstream or select one source; do not average implicitly."
            )
        seen.add(key)
    if not rows:
        raise IngestionValidationError("The input dataset contains no observations.")
    return rows


def read_observations_csv(path: str | Path) -> ParsedDataset:
    """Read and validate the agreed canonical CSV interchange schema."""
    file_path = Path(path)
    raw_bytes = file_path.read_bytes()
    digest = hashlib.sha256(raw_bytes).hexdigest()
    try:
        decoded = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise IngestionValidationError("Input CSV must be UTF-8 encoded.") from exc

    reader = csv.DictReader(decoded.splitlines())
    if reader.fieldnames is None:
        raise IngestionValidationError("Input CSV has no header row.")
    actual_columns = {name.strip() for name in reader.fieldnames if name}
    missing = REQUIRED_COLUMNS - actual_columns
    if missing:
        raise IngestionValidationError(
            "Input CSV is missing required columns: " + ", ".join(sorted(missing))
        )

    observations: list[Observation] = []
    for line_number, raw in enumerate(reader, start=2):
        if not any((value or "").strip() for value in raw.values()):
            continue
        observations.append(_parse_row(raw, line_number))

    rows = validate_observations(observations)
    return ParsedDataset(observations=rows, sha256=digest, row_count=len(rows))
