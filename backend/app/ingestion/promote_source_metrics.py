"""Promote approved source-backed state-level training metrics into supply observations.

Run from the backend directory:
    python -m app.ingestion.promote_source_metrics
    python -m app.ingestion.promote_source_metrics --apply

Dry-run is the default. This adapter is deliberately narrow: it does not create demand
observations, map state-level totals to districts/skills, or run the forecast pipeline.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import bindparam, text
from sqlalchemy.engine import Connection

from app.ingestion.db import get_engine

PARSER_VERSION = "source-metric-promotion-v1"
FY_RE = re.compile(r"^FY(?P<start>\d{4})-(?P<end>\d{2}|\d{4})$")

# Only metrics with a verified annual FLOW interpretation are allowed here.
APPROVED_METRICS: dict[str, dict[str, str]] = {
    "SPACE_GEOSPATIAL_PMKVY_TRAINED_ORIENTED": {
        "signal": "SPACE_GEOSPATIAL_PMKVY_TRAINED_ORIENTED",
        "unit": "persons",
    },
    "SPACE_GEOSPATIAL_NAPS_APPRENTICES_ENGAGED": {
        "signal": "SPACE_GEOSPATIAL_NAPS_APPRENTICES_ENGAGED",
        "unit": "apprentices",
    },
}

SOURCE_QUERY = text("""
    SELECT id, source_id, retrieval_id, evidence_item_id, source_release,
           metric_code, value_numeric, unit, observation_grain, state_id,
           district_id, sector_id, skill_id, reference_period, as_of_date,
           provenance_state, is_synthetic
    FROM public.source_metric_observations
    WHERE metric_code IN :metric_codes
    ORDER BY metric_code, reference_period, state_id
""").bindparams(bindparam("metric_codes", expanding=True))

EXISTING_QUERY = text("""
    SELECT state_id, period_year, source_id, source_release, supply_signal_type,
           supply_quantity, quantity_unit, quantity_semantics, source_date,
           retrieval_id, evidence_item_id, transformation_note
    FROM public.supply_observations
    WHERE provenance_state = 'SOURCE_BACKED'
      AND supply_signal_type IN :signals
      AND source_id IN :source_ids
""").bindparams(
    bindparam("signals", expanding=True),
    bindparam("source_ids", expanding=True),
)

INSERT_SQL = text("""
    INSERT INTO public.supply_observations (
        state_id, district_id, sector_id, skill_id, observation_grain, period_type,
        period_year, supply_quantity, training_capacity, enrollment, completions,
        quantity_unit, quantity_semantics, supply_signal_type, source_id, source_release,
        source_date, retrieval_id, evidence_item_id, provenance_state, is_synthetic,
        generation_run_id, transformation_note
    ) VALUES (
        :state_id, NULL, NULL, NULL, 'STATE', 'YEAR',
        :period_year, :supply_quantity, NULL, NULL, NULL,
        :quantity_unit, 'FLOW', :supply_signal_type, :source_id, :source_release,
        :source_date, :retrieval_id, :evidence_item_id, 'SOURCE_BACKED', FALSE,
        NULL, :transformation_note
    )
""")


def fiscal_year_ending_year(reference_period: str) -> int:
    """Convert FY2023-24 to 2024 using the ending-year convention, without hiding FY."""
    match = FY_RE.fullmatch(str(reference_period).strip())
    if not match:
        raise ValueError(
            f"Unsupported reference_period {reference_period!r}; expected FYYYYY-YY or FYYYYYY-YYYY."
        )

    start = int(match.group("start"))
    end_text = match.group("end")
    if len(end_text) == 4:
        end = int(end_text)
    else:
        end = (start // 100) * 100 + int(end_text)
        if end <= start:
            end += 100

    if end != start + 1 or not 1900 <= end <= 2200:
        raise ValueError(f"Fiscal year {reference_period!r} is not a valid one-year period.")
    return end


def normalize_metric_row(row: dict[str, Any]) -> dict[str, Any]:
    """Map one verified source metric to a state-level annual FLOW supply observation."""
    metric_code = str(row.get("metric_code") or "")
    profile = APPROVED_METRICS.get(metric_code)
    if profile is None:
        raise ValueError(f"Metric {metric_code!r} is not approved for supply promotion.")

    if row.get("provenance_state") != "SOURCE_BACKED" or row.get("is_synthetic") is not False:
        raise ValueError(f"{metric_code}: only SOURCE_BACKED, non-synthetic rows may be promoted.")
    if row.get("observation_grain") != "STATE":
        raise ValueError(f"{metric_code}: only STATE-grain records are approved.")
    if not row.get("state_id") or any(row.get(key) is not None for key in ("district_id", "sector_id", "skill_id")):
        raise ValueError(f"{metric_code}: expected state-only dimensions; refusing to infer missing geography or skill.")
    for required in ("source_id", "retrieval_id", "source_release", "reference_period"):
        if row.get(required) is None or not str(row[required]).strip():
            raise ValueError(f"{metric_code}: {required} is required for source traceability.")
    unit = str(row.get("unit") or "").strip()
    if unit != profile["unit"]:
        raise ValueError(f"{metric_code}: expected unit {profile['unit']!r}, received {unit!r}.")

    try:
        value = Decimal(str(row.get("value_numeric")))
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise ValueError(f"{metric_code}: value_numeric must be a finite, non-negative number.") from exc
    if not value.is_finite() or value < 0:
        raise ValueError(f"{metric_code}: value_numeric must be a finite, non-negative number.")

    reference_period = str(row["reference_period"]).strip()
    period_year = fiscal_year_ending_year(reference_period)
    note = (
        f"Promoted from source_metric_observations id={row.get('id')}; "
        f"metric_code={metric_code}; "
        f"original_reference_period={reference_period}; "
        f"period_year={period_year} "
        "(fiscal-year ending-year convention; original FY retained here and in source_release). "
        "State-level training/apprenticeship FLOW only, not employed-worker stock. "
        "Do not compare directly with vacancies or use for DISTRICT_SKILL forecasting."
    )

    return {
        "state_id": str(row["state_id"]),
        "period_year": period_year,
        "supply_quantity": value,
        "quantity_unit": unit,
        "supply_signal_type": profile["signal"],
        "source_id": str(row["source_id"]),
        "source_release": str(row["source_release"]),
        "source_date": row.get("as_of_date"),
        "retrieval_id": str(row["retrieval_id"]),
        "evidence_item_id": str(row["evidence_item_id"]) if row.get("evidence_item_id") else None,
        "transformation_note": note,
        "original_reference_period": reference_period,
        "metric_code": metric_code,
    }


def _logical_key(row: dict[str, Any]) -> tuple[Any, ...]:
    return (
        row["state_id"],
        row["period_year"],
        row["source_id"],
        row["source_release"],
        row["supply_signal_type"],
    )


def _rows_to_promote(conn: Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        SOURCE_QUERY, {"metric_codes": list(APPROVED_METRICS)}
    ).mappings().all()
    if not rows:
        raise RuntimeError(
            "No approved source metric rows were found. Confirm the source-metric seed is present."
        )
    prepared = [normalize_metric_row(dict(row)) for row in rows]
    seen: set[tuple[Any, ...]] = set()
    for row in prepared:
        key = _logical_key(row)
        if key in seen:
            raise ValueError(
                f"Duplicate promotion key for {row['metric_code']} / {row['state_id']} / "
                f"{row['original_reference_period']}; resolve duplicates instead of aggregating."
            )
        seen.add(key)
    return prepared


def _same_existing(existing: dict[str, Any], candidate: dict[str, Any]) -> bool:
    try:
        existing_value = Decimal(str(existing["supply_quantity"]))
    except (InvalidOperation, ValueError, TypeError):
        return False
    return (
        existing_value == candidate["supply_quantity"]
        and existing["quantity_unit"] == candidate["quantity_unit"]
        and existing["quantity_semantics"] == "FLOW"
        and str(existing["retrieval_id"]) == candidate["retrieval_id"]
        and (
            str(existing["evidence_item_id"]) if existing.get("evidence_item_id") else None
        ) == candidate["evidence_item_id"]
        and existing["transformation_note"] == candidate["transformation_note"]
    )


def promote(*, apply: bool = False) -> dict[str, Any]:
    """Preview approved rows by default; persist idempotently when apply=True."""
    engine = get_engine()
    try:
        with engine.begin() as conn:
            rows = _rows_to_promote(conn)
            existing_rows = []
            source_ids = sorted({row["source_id"] for row in rows})
            signals = sorted({row["supply_signal_type"] for row in rows})
            if source_ids and signals:
                existing_rows = conn.execute(
                    EXISTING_QUERY, {"signals": signals, "source_ids": source_ids}
                ).mappings().all()
            existing_by_key = {
                (
                    str(row["state_id"]), int(row["period_year"]), str(row["source_id"]),
                    str(row["source_release"]), str(row["supply_signal_type"]),
                ): dict(row)
                for row in existing_rows
            }

            inserts: list[dict[str, Any]] = []
            unchanged = 0
            for row in rows:
                current = existing_by_key.get(_logical_key(row))
                if current is None:
                    inserts.append(row)
                elif _same_existing(current, row):
                    unchanged += 1
                else:
                    raise ValueError(
                        "A conflicting source-backed supply observation exists for "
                        f"{row['metric_code']} / {row['state_id']} / "
                        f"{row['original_reference_period']}. Review the source release; "
                        "the promotion will not overwrite curated data."
                    )

            summary = {
                "mode": "APPLY" if apply else "DRY_RUN",
                "approved_metric_codes": list(APPROVED_METRICS),
                "source_metric_rows_validated": len(rows),
                "rows_to_insert": len(inserts),
                "existing_rows_unchanged": unchanged,
                "periods": dict(sorted(Counter(row["original_reference_period"] for row in rows).items())),
                "rows_by_signal": dict(sorted(Counter(row["supply_signal_type"] for row in rows).items())),
                "states_covered": len({row["state_id"] for row in rows}),
                "grain": "STATE",
                "provenance": "SOURCE_BACKED",
                "warning": (
                    "Training/apprenticeship FLOW indicators only. No district/skill fields are inferred; "
                    "these rows must not be compared directly with vacancies or used as employed-worker stock."
                ),
            }
            if apply and inserts:
                insert_parameters = [
                    {
                        key: row[key]
                        for key in (
                            "state_id", "period_year", "supply_quantity", "quantity_unit",
                            "supply_signal_type", "source_id", "source_release", "source_date",
                            "retrieval_id", "evidence_item_id", "transformation_note",
                        )
                    }
                    for row in inserts
                ]
                conn.execute(INSERT_SQL, insert_parameters)
                summary["rows_inserted"] = len(inserts)
                summary["writes_performed"] = True
            else:
                summary["rows_inserted"] = 0
                summary["writes_performed"] = False
            return summary
    finally:
        engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Insert verified source-backed training metrics. Without this flag, only validate and preview.",
    )
    args = parser.parse_args()
    print(json.dumps(promote(apply=args.apply), indent=2, default=str))


if __name__ == "__main__":
    main()
