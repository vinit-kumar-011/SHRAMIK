"""Validate canonical SHRAMIK observation CSV files before database ingestion.

The input contract mirrors the canonical observation tables, with unit and
flow_stock_semantics included as validation metadata. Those fields are verified
against source_capabilities for source-backed rows and recorded in
synthetic_generation_runs.parameters for DEMO rows.
"""
from __future__ import annotations

import csv
import hashlib
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Literal
from uuid import UUID

ObservationKind = Literal["demand", "supply"]
ALLOWED_GRAINS = {
    "STATE", "STATE_SECTOR", "STATE_SKILL", "STATE_SECTOR_SKILL",
    "DISTRICT", "DISTRICT_SECTOR", "DISTRICT_SKILL", "DISTRICT_SECTOR_SKILL",
}
DISTRICT_GRAINS = {g for g in ALLOWED_GRAINS if g.startswith("DISTRICT")}
SECTOR_GRAINS = {g for g in ALLOWED_GRAINS if "SECTOR" in g}
SKILL_GRAINS = {g for g in ALLOWED_GRAINS if "SKILL" in g}

COMMON_COLUMNS = {
    "state_id", "district_id", "sector_id", "skill_id", "observation_grain",
    "period_type", "period_year", "source_id", "source_release", "source_date", "retrieval_id",
    "evidence_item_id", "provenance_state", "is_synthetic", "generation_run_id",
    "transformation_note", "unit", "flow_stock_semantics",
}
KIND_COLUMNS = {
    "demand": {"demand_quantity", "demand_signal_type"},
    "supply": {
        "supply_quantity", "training_capacity", "enrollment", "completions",
        "supply_signal_type",
    },
}


@dataclass(frozen=True)
class ValidationIssue:
    row_number: int
    field: str
    message: str

    def __str__(self) -> str:
        return f"row {self.row_number} [{self.field}]: {self.message}"


@dataclass(frozen=True)
class CanonicalObservation:
    kind: ObservationKind
    state_id: str
    district_id: str | None
    sector_id: str | None
    skill_id: str | None
    observation_grain: str
    period_type: str
    period_year: int
    signal_type: str
    value: Decimal | None
    source_id: str | None
    source_release: str | None
    source_date: date | None
    retrieval_id: str | None
    evidence_item_id: str | None
    provenance_state: str
    is_synthetic: bool
    generation_run_id: str | None
    transformation_note: str | None
    unit: str
    flow_stock_semantics: str | None
    training_capacity: Decimal | None = None
    enrollment: Decimal | None = None
    completions: Decimal | None = None

    def db_values(self) -> dict[str, Any]:
        """Return only columns defined by the existing observation schema."""
        common = {
            "state_id": self.state_id,
            "district_id": self.district_id,
            "sector_id": self.sector_id,
            "skill_id": self.skill_id,
            "observation_grain": self.observation_grain,
            "period_type": self.period_type,
            "period_year": self.period_year,
            "source_id": self.source_id,
            "source_release": self.source_release,
            "source_date": self.source_date,
            "retrieval_id": self.retrieval_id,
            "evidence_item_id": self.evidence_item_id,
            "provenance_state": self.provenance_state,
            "is_synthetic": self.is_synthetic,
            "generation_run_id": self.generation_run_id,
            "transformation_note": self.transformation_note,
        }
        for key in ("source_id", "retrieval_id", "evidence_item_id", "generation_run_id"):
            if common[key] is not None:
                common[key] = UUID(common[key])
        if self.kind == "demand":
            return {**common, "demand_quantity": self.value, "demand_signal_type": self.signal_type}
        return {
            **common,
            "supply_quantity": self.value,
            "training_capacity": self.training_capacity,
            "enrollment": self.enrollment,
            "completions": self.completions,
            "supply_signal_type": self.signal_type,
        }


@dataclass(frozen=True)
class ParsedBatch:
    kind: ObservationKind
    observations: tuple[CanonicalObservation, ...]
    issues: tuple[ValidationIssue, ...]
    sha256: str
    source_path: str
    synthetic_capabilities: dict[str, dict[str, dict[str, str | None]]]

    @property
    def valid(self) -> bool:
        return bool(self.observations) and not self.issues


def sha256_file(path: str | Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _text(row: dict[str, str | None], key: str) -> str | None:
    raw = row.get(key)
    return raw.strip() if raw is not None and raw.strip() else None


def _decimal(value: str | None, row_num: int, field: str, issues: list[ValidationIssue]) -> Decimal | None:
    if value is None or not value.strip():
        return None
    try:
        parsed = Decimal(value.strip())
    except (InvalidOperation, AttributeError):
        issues.append(ValidationIssue(row_num, field, "must be a valid decimal number"))
        return None
    if not parsed.is_finite():
        issues.append(ValidationIssue(row_num, field, "must be finite"))
        return None
    if parsed < 0:
        issues.append(ValidationIssue(row_num, field, "must not be negative"))
        return None
    if parsed.adjusted() > 11 or max(0, -parsed.as_tuple().exponent) > 2:
        issues.append(ValidationIssue(row_num, field, "must fit NUMERIC(14,2)"))
        return None
    return parsed


def _uuid_or_none(value: str | None, row_num: int, field: str, issues: list[ValidationIssue]) -> str | None:
    if value is None:
        return None
    try:
        return str(UUID(value))
    except (ValueError, AttributeError):
        issues.append(ValidationIssue(row_num, field, "must be a valid UUID"))
        return None


def parse_canonical_csv(
    path: str | Path,
    kind: ObservationKind,
    *,
    default_generation_run_id: str | None = None,
) -> ParsedBatch:
    """Parse and validate a canonical observation CSV without touching the DB.

    default_generation_run_id should be a fresh UUID created by the importer;
    it is applied only to synthetic rows that omit generation_run_id.
    """
    file_path = Path(path)
    issues: list[ValidationIssue] = []
    observations: list[CanonicalObservation] = []
    synthetic_capabilities: dict[str, dict[str, dict[str, str | None]]] = {"demand": {}, "supply": {}}
    try:
        with file_path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            if not reader.fieldnames:
                return ParsedBatch(kind, (), (ValidationIssue(1, "header", "CSV must contain a header row"),), sha256_file(file_path), str(file_path), synthetic_capabilities)
            headers = {h.strip() for h in reader.fieldnames if h}
            required = COMMON_COLUMNS | KIND_COLUMNS[kind]
            missing = sorted(required - headers)
            if missing:
                issues.append(ValidationIssue(1, "header", "missing required columns: " + ", ".join(missing)))
                return ParsedBatch(kind, (), tuple(issues), sha256_file(file_path), str(file_path), synthetic_capabilities)

            for row_num, raw_row in enumerate(reader, start=2):
                row = {str(k).strip(): v for k, v in raw_row.items() if k is not None}
                row_issues_before = len(issues)
                state_id = _text(row, "state_id")
                grain = (_text(row, "observation_grain") or "").upper()
                period_type = (_text(row, "period_type") or "").upper()
                period_year_raw = _text(row, "period_year")
                signal_col = "demand_signal_type" if kind == "demand" else "supply_signal_type"
                signal_type = _text(row, signal_col)
                provenance = (_text(row, "provenance_state") or "").upper()
                synthetic_raw = (_text(row, "is_synthetic") or "").lower()
                synthetic = synthetic_raw in {"true", "1", "yes"}
                unit = _text(row, "unit")
                flow_semantics = (_text(row, "flow_stock_semantics") or "").upper()

                if not state_id:
                    issues.append(ValidationIssue(row_num, "state_id", "is required"))
                if grain not in ALLOWED_GRAINS:
                    issues.append(ValidationIssue(row_num, "observation_grain", f"must be one of {', '.join(sorted(ALLOWED_GRAINS))}"))

                district_id, sector_id, skill_id = (_text(row, f) for f in ("district_id", "sector_id", "skill_id"))
                if grain in DISTRICT_GRAINS and not district_id:
                    issues.append(ValidationIssue(row_num, "district_id", f"is required for {grain}"))
                if grain in SECTOR_GRAINS and not sector_id:
                    issues.append(ValidationIssue(row_num, "sector_id", f"is required for {grain}"))
                if grain in SKILL_GRAINS and not skill_id:
                    issues.append(ValidationIssue(row_num, "skill_id", f"is required for {grain}"))
                if period_type != "YEAR":
                    issues.append(ValidationIssue(row_num, "period_type", "must be YEAR for the MVP; do not fabricate monthly or quarterly periods"))
                try:
                    year = int(period_year_raw or "")
                    if not 1900 <= year <= 2100:
                        raise ValueError
                except ValueError:
                    year = 0
                    issues.append(ValidationIssue(row_num, "period_year", "must be a four-digit year between 1900 and 2100"))
                if not signal_type:
                    issues.append(ValidationIssue(row_num, signal_col, "is required"))
                if not unit:
                    issues.append(ValidationIssue(row_num, "unit", "is required to preserve measurement semantics"))
                if flow_semantics not in {"FLOW", "STOCK", "CAPACITY"}:
                    issues.append(ValidationIssue(row_num, "flow_stock_semantics", "must be FLOW, STOCK, or CAPACITY to match canonical quantity_semantics"))
                if provenance not in {"SOURCE_BACKED", "SYNTHETIC_DEMO"}:
                    issues.append(ValidationIssue(row_num, "provenance_state", "must be SOURCE_BACKED or SYNTHETIC_DEMO"))
                if synthetic_raw not in {"true", "false", "1", "0", "yes", "no"}:
                    issues.append(ValidationIssue(row_num, "is_synthetic", "must be true/false"))
                if (provenance == "SYNTHETIC_DEMO") != synthetic:
                    issues.append(ValidationIssue(row_num, "provenance_state", "must agree with is_synthetic"))
                if synthetic and not flow_semantics:
                    issues.append(ValidationIssue(row_num, "flow_stock_semantics", "is required for synthetic rows"))

                source_id = _uuid_or_none(_text(row, "source_id"), row_num, "source_id", issues)
                source_release = _text(row, "source_release")
                retrieval_id = _uuid_or_none(_text(row, "retrieval_id"), row_num, "retrieval_id", issues)
                evidence_item_id = _uuid_or_none(_text(row, "evidence_item_id"), row_num, "evidence_item_id", issues)
                generation_run_id = _uuid_or_none(_text(row, "generation_run_id"), row_num, "generation_run_id", issues)
                if synthetic:
                    generation_run_id = generation_run_id or default_generation_run_id
                    if not generation_run_id:
                        issues.append(ValidationIssue(row_num, "generation_run_id", "is required for synthetic rows or must be generated by the importer"))
                    if source_id or retrieval_id or evidence_item_id:
                        issues.append(ValidationIssue(row_num, "source_id/retrieval_id/evidence_item_id", "synthetic rows must not masquerade as source-backed evidence"))
                    cap_map = synthetic_capabilities[kind]
                    prior = cap_map.get(signal_type or "")
                    capability = {"unit": unit, "flow_stock_semantics": flow_semantics}
                    if prior and prior != capability:
                        issues.append(ValidationIssue(row_num, signal_col, "the same synthetic signal_type has conflicting unit/flow-stock declarations in one import"))
                    elif signal_type:
                        cap_map[signal_type] = capability
                else:
                    if provenance == "SOURCE_BACKED" and not source_id:
                        issues.append(ValidationIssue(row_num, "source_id", "is required for source-backed observations"))
                    if generation_run_id:
                        issues.append(ValidationIssue(row_num, "generation_run_id", "must be empty for source-backed observations"))

                source_date_raw = _text(row, "source_date")
                try:
                    source_date = date.fromisoformat(source_date_raw) if source_date_raw else None
                except ValueError:
                    source_date = None
                    issues.append(ValidationIssue(row_num, "source_date", "must use ISO date format YYYY-MM-DD"))
                transformation_note = _text(row, "transformation_note")
                if synthetic and not transformation_note:
                    issues.append(ValidationIssue(row_num, "transformation_note", "is required for synthetic observations"))

                if kind == "demand":
                    value = _decimal(_text(row, "demand_quantity"), row_num, "demand_quantity", issues)
                    if value is None and not any(i.row_number == row_num and i.field == "demand_quantity" for i in issues):
                        issues.append(ValidationIssue(row_num, "demand_quantity", "is required for the initial quantitative demand pipeline"))
                    if flow_semantics not in {"FLOW", "STOCK"}:
                        issues.append(ValidationIssue(row_num, "flow_stock_semantics", "demand_quantity requires FLOW or STOCK semantics"))
                    training_capacity = enrollment = completions = None
                else:
                    value = _decimal(_text(row, "supply_quantity"), row_num, "supply_quantity", issues)
                    training_capacity = _decimal(_text(row, "training_capacity"), row_num, "training_capacity", issues)
                    enrollment = _decimal(_text(row, "enrollment"), row_num, "enrollment", issues)
                    completions = _decimal(_text(row, "completions"), row_num, "completions", issues)
                    measure_values = (value, training_capacity, enrollment, completions)
                    non_null_measures = sum(v is not None for v in measure_values)
                    if non_null_measures != 1:
                        issues.append(ValidationIssue(row_num, "supply_quantity", "exactly one of supply_quantity, training_capacity, enrollment, or completions must be populated per row"))
                    if value is not None and flow_semantics not in {"FLOW", "STOCK"}:
                        issues.append(ValidationIssue(row_num, "flow_stock_semantics", "supply_quantity requires FLOW or STOCK semantics"))
                    if training_capacity is not None and flow_semantics != "CAPACITY":
                        issues.append(ValidationIssue(row_num, "flow_stock_semantics", "training_capacity requires CAPACITY semantics"))
                    if (enrollment is not None or completions is not None) and flow_semantics != "FLOW":
                        issues.append(ValidationIssue(row_num, "flow_stock_semantics", "enrollment and completions require FLOW semantics"))

                if len(issues) == row_issues_before:
                    observations.append(CanonicalObservation(
                        kind=kind, state_id=state_id or "", district_id=district_id,
                        sector_id=sector_id, skill_id=skill_id, observation_grain=grain,
                        period_type=period_type, period_year=year, signal_type=signal_type or "",
                        value=value, source_id=source_id, source_release=source_release, source_date=source_date,
                        retrieval_id=retrieval_id, evidence_item_id=evidence_item_id,
                        provenance_state=provenance, is_synthetic=synthetic,
                        generation_run_id=generation_run_id, transformation_note=transformation_note,
                        unit=unit or "", flow_stock_semantics=flow_semantics,
                        training_capacity=training_capacity, enrollment=enrollment, completions=completions,
                    ))
    except OSError as exc:
        issues.append(ValidationIssue(1, "file", f"cannot read input CSV: {exc}"))
    return ParsedBatch(kind, tuple(observations), tuple(issues), sha256_file(file_path), str(file_path), synthetic_capabilities)
