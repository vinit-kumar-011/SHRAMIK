"""Pure validation helpers for SHRAMIK's canonical CSV ingestion contract."""

from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any


GRAIN_DIMENSIONS: dict[str, tuple[bool, bool, bool]] = {
    "STATE": (False, False, False),
    "STATE_SECTOR": (False, True, False),
    "STATE_SKILL": (False, False, True),
    "STATE_SECTOR_SKILL": (False, True, True),
    "DISTRICT": (True, False, False),
    "DISTRICT_SECTOR": (True, True, False),
    "DISTRICT_SKILL": (True, False, True),
    "DISTRICT_SECTOR_SKILL": (True, True, True),
}

DEMAND_SEMANTICS = {"FLOW", "STOCK"}
SUPPLY_SEMANTICS = {"FLOW", "STOCK", "CAPACITY"}
SUPPLY_MEASURES = {"supply_quantity", "training_capacity", "enrollment", "completions"}


class DatasetValidationError(ValueError):
    """Raised when a canonical observation cannot be safely ingested."""


def _clean(value: Any) -> str | None:
    if value is None:
        return None
    result = str(value).strip()
    return result or None


def _decimal(value: Any, field: str, line_number: int) -> Decimal:
    try:
        parsed = Decimal(str(value).strip())
    except (InvalidOperation, ValueError, AttributeError) as exc:
        raise DatasetValidationError(
            f"CSV row {line_number}: {field} must be a finite, non-negative number."
        ) from exc
    if not parsed.is_finite() or parsed < 0:
        raise DatasetValidationError(
            f"CSV row {line_number}: {field} must be a finite, non-negative number."
        )
    return parsed


def _year(value: Any, line_number: int) -> int:
    try:
        year = int(str(value).strip())
    except (TypeError, ValueError) as exc:
        raise DatasetValidationError(
            f"CSV row {line_number}: period_year must be a four-digit year."
        ) from exc
    if year < 1900 or year > 2200:
        raise DatasetValidationError(
            f"CSV row {line_number}: period_year must be between 1900 and 2200."
        )
    return year


def _optional_date(value: Any, field: str, line_number: int) -> date | None:
    cleaned = _clean(value)
    if cleaned is None:
        return None
    try:
        return date.fromisoformat(cleaned)
    except ValueError as exc:
        raise DatasetValidationError(
            f"CSV row {line_number}: {field} must use YYYY-MM-DD."
        ) from exc


def validate_observation(row: dict[str, Any], kind: str, line_number: int) -> dict[str, Any]:
    """Normalize and validate one source-backed demand or supply CSV row.

    The loader deliberately accepts source-backed records only. Synthetic/demo rows
    must be created through the generator so their seed and generation run are saved.
    """
    if kind not in {"demand", "supply"}:
        raise DatasetValidationError("kind must be 'demand' or 'supply'.")

    normalized = {key: _clean(value) for key, value in row.items()}
    grain = normalized.get("observation_grain")
    if grain not in GRAIN_DIMENSIONS:
        raise DatasetValidationError(
            f"CSV row {line_number}: unsupported observation_grain {grain!r}."
        )

    state_id = normalized.get("state_id")
    if not state_id:
        raise DatasetValidationError(f"CSV row {line_number}: state_id is required.")

    has_district, has_sector, has_skill = GRAIN_DIMENSIONS[grain]
    for field, required in (
        ("district_id", has_district),
        ("sector_id", has_sector),
        ("skill_id", has_skill),
    ):
        present = bool(normalized.get(field))
        if required != present:
            expectation = "required" if required else "must be blank for this grain"
            raise DatasetValidationError(
                f"CSV row {line_number}: {field} {expectation} for {grain}."
            )

    period_year = _year(normalized.get("period_year"), line_number)
    quantity_unit = normalized.get("quantity_unit")
    quantity_semantics = normalized.get("quantity_semantics")
    source_release = normalized.get("source_release")
    source_date = _optional_date(normalized.get("source_date"), "source_date", line_number)
    transformation_note = normalized.get("transformation_note")

    if not quantity_unit:
        raise DatasetValidationError(f"CSV row {line_number}: quantity_unit is required.")
    if not quantity_semantics:
        raise DatasetValidationError(f"CSV row {line_number}: quantity_semantics is required.")

    common: dict[str, Any] = {
        "state_id": state_id,
        "district_id": normalized.get("district_id"),
        "sector_id": normalized.get("sector_id"),
        "skill_id": normalized.get("skill_id"),
        "observation_grain": grain,
        "period_type": "YEAR",
        "period_year": period_year,
        "quantity_unit": quantity_unit,
        "quantity_semantics": quantity_semantics,
        "source_release": source_release,
        "source_date": source_date,
        "transformation_note": transformation_note,
    }

    if kind == "demand":
        signal_type = normalized.get("demand_signal_type")
        if not signal_type:
            raise DatasetValidationError(
                f"CSV row {line_number}: demand_signal_type is required."
            )
        if quantity_semantics not in DEMAND_SEMANTICS:
            raise DatasetValidationError(
                f"CSV row {line_number}: demand quantity_semantics must be FLOW or STOCK."
            )
        common.update(
            demand_signal_type=signal_type,
            demand_quantity=_decimal(
                normalized.get("demand_quantity"), "demand_quantity", line_number
            ),
        )
        return common

    signal_type = normalized.get("supply_signal_type")
    measure = (normalized.get("measure") or "").lower()
    if not signal_type:
        raise DatasetValidationError(
            f"CSV row {line_number}: supply_signal_type is required."
        )
    if measure not in SUPPLY_MEASURES:
        raise DatasetValidationError(
            f"CSV row {line_number}: measure must be one of {sorted(SUPPLY_MEASURES)}."
        )
    if quantity_semantics not in SUPPLY_SEMANTICS:
        raise DatasetValidationError(
            f"CSV row {line_number}: unsupported supply quantity_semantics."
        )
    if measure == "training_capacity" and quantity_semantics != "CAPACITY":
        raise DatasetValidationError(
            f"CSV row {line_number}: training_capacity requires CAPACITY semantics."
        )
    if measure in {"enrollment", "completions"} and quantity_semantics != "FLOW":
        raise DatasetValidationError(
            f"CSV row {line_number}: {measure} requires FLOW semantics."
        )
    if measure == "supply_quantity" and quantity_semantics not in {"FLOW", "STOCK"}:
        raise DatasetValidationError(
            f"CSV row {line_number}: supply_quantity requires FLOW or STOCK semantics."
        )

    common.update(
        supply_signal_type=signal_type,
        measure=measure,
        value=_decimal(normalized.get("value"), "value", line_number),
    )
    return common


def validate_dataset_rows(
    rows: list[dict[str, Any]], kind: str
) -> list[dict[str, Any]]:
    """Validate a whole dataset and reject duplicate logical keys before writing."""
    validated = [validate_observation(row, kind, index + 2) for index, row in enumerate(rows)]
    seen: set[tuple[Any, ...]] = set()
    for index, row in enumerate(validated, start=2):
        key = (
            row["state_id"],
            row["district_id"],
            row["sector_id"],
            row["skill_id"],
            row["observation_grain"],
            row["period_type"],
            row["period_year"],
            row["source_release"],
            row["demand_signal_type"] if kind == "demand" else row["supply_signal_type"],
        )
        if key in seen:
            raise DatasetValidationError(
                f"CSV row {index}: duplicate source observation key; split releases or resolve the duplicate."
            )
        seen.add(key)
    if not validated:
        raise DatasetValidationError("The CSV contains a header but no observation rows.")
    return validated
