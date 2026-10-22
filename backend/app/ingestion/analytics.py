"""Pure baseline analytics for matched District x Skill yearly series.

The implementation is intentionally conservative: it never aggregates multiple
signals, never spreads a district-only signal across skills, and does not compare
training capacity/completions against vacancy counts as if they were interchangeable.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any


class AmbiguousSeriesError(ValueError):
    """Raised when multiple observations would need an unjustified aggregation."""


def build_analytics_outputs(
    demand_rows: list[dict[str, Any]],
    supply_rows: list[dict[str, Any]],
    *,
    analysis_mode: str,
    min_history: int = 3,
    warning_threshold: float = 0.20,
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """Build one-step naive-last-value outputs from exact compatible series."""
    if analysis_mode not in {"OFFICIAL", "DEMO"}:
        raise ValueError("analysis_mode must be OFFICIAL or DEMO.")
    if min_history < 3:
        raise ValueError("min_history cannot be below the contract's provisional floor of 3.")
    if not 0 < warning_threshold < 1:
        raise ValueError("warning_threshold must be between zero and one.")

    counts = {
        "demand_rows": len(demand_rows),
        "supply_rows": len(supply_rows),
        "matched_series": 0,
        "insufficient_history": 0,
        "incompatible_series": 0,
        "duplicate_series": 0,
        "forecasts_built": 0,
    }

    def index_rows(rows: list[dict[str, Any]], value_field: str, label: str):
        series: dict[tuple[str, str, str], dict[int, dict[str, Any]]] = defaultdict(dict)
        duplicates: set[tuple[str, str, str]] = set()
        for row in rows:
            key = (str(row["state_id"]), str(row["district_id"]), str(row["skill_id"]))
            year = int(row["period_year"])
            if key in duplicates:
                continue
            if year in series[key]:
                duplicates.add(key)
                series[key].clear()
                continue
            value = row.get(value_field)
            if value is None or float(value) < 0:
                raise ValueError(f"{label} observations require non-negative {value_field}.")
            series[key][year] = row
        return series, duplicates

    demand_by_key, duplicate_demand = index_rows(demand_rows, "demand_quantity", "Demand")
    supply_by_key, duplicate_supply = index_rows(supply_rows, "supply_quantity", "Supply")
    duplicate_keys = duplicate_demand | duplicate_supply
    counts["duplicate_series"] = len(duplicate_keys)

    outputs: list[dict[str, Any]] = []
    for key in sorted(set(demand_by_key) & set(supply_by_key)):
        if key in duplicate_keys:
            continue
        demand_series = demand_by_key[key]
        supply_series = supply_by_key[key]
        common_years = sorted(set(demand_series) & set(supply_series))
        if not common_years:
            continue
        counts["matched_series"] += 1

        demand_units = {demand_series[y]["quantity_unit"] for y in common_years}
        supply_units = {supply_series[y]["quantity_unit"] for y in common_years}
        demand_semantics = {demand_series[y]["quantity_semantics"] for y in common_years}
        supply_semantics = {supply_series[y]["quantity_semantics"] for y in common_years}
        if (
            len(demand_units) != 1
            or len(supply_units) != 1
            or demand_units != supply_units
            or len(demand_semantics) != 1
            or len(supply_semantics) != 1
            or demand_semantics != supply_semantics
            or next(iter(demand_semantics)) not in {"FLOW", "STOCK"}
        ):
            counts["incompatible_series"] += 1
            continue

        years = common_years
        if len(years) < min_history:
            counts["insufficient_history"] += 1
            continue

        demand_values = [float(demand_series[year]["demand_quantity"]) for year in years]
        supply_values = [float(supply_series[year]["supply_quantity"]) for year in years]
        forecast_demand = demand_values[-1]
        forecast_supply = supply_values[-1]
        gap = forecast_demand - forecast_supply
        if forecast_demand == 0:
            status = "NO_DEMAND"
        elif gap > 0:
            status = "SHORTAGE"
        elif gap < 0:
            status = "OVERSUPPLY"
        else:
            status = "BALANCED"

        contiguous = all(right == left + 1 for left, right in zip(years, years[1:]))
        data_coverage = len(years) / (years[-1] - years[0] + 1)
        demand_row, supply_row = demand_series[years[-1]], supply_series[years[-1]]
        provenance = "SOURCE_BACKED" if analysis_mode == "OFFICIAL" else "SYNTHETIC_DEMO"
        source_ids = {
            str(row["source_id"])
            for year in years
            for row in (demand_series[year], supply_series[year])
            if row.get("source_id")
        }
        # No backtest has been run for this naive baseline, so HIGH confidence is never assigned.
        confidence = "MEDIUM" if len(years) >= 4 and contiguous else "LOW"
        if provenance != "SOURCE_BACKED":
            confidence = min(confidence, "MEDIUM", key={"LOW": 0, "MEDIUM": 1, "HIGH": 2}.get)

        yoy_growth: list[float] = []
        for previous, current in zip(demand_values, demand_values[1:]):
            if previous > 0:
                yoy_growth.append((current - previous) / previous)
        recent_growth = yoy_growth[-1] if yoy_growth else None
        historical_growth = (
            sum(yoy_growth[:-1]) / len(yoy_growth[:-1])
            if len(yoy_growth) > 1 else None
        )
        is_emerging = (
            recent_growth is not None
            and recent_growth >= 0.05
            and historical_growth is not None
            and recent_growth > historical_growth
        )
        if recent_growth is None or historical_growth is None:
            signal_strength = None
        else:
            signal_strength = max(
                0.0, min(1.0, (recent_growth - historical_growth) / 0.25)
            )

        gap_ratio = gap / forecast_demand if forecast_demand > 0 else 0.0
        warning_severity = None
        if status == "SHORTAGE" and gap_ratio >= warning_threshold:
            warning_severity = "HIGH" if gap_ratio >= 0.40 else "MEDIUM"

        outputs.append({
            "state_id": key[0],
            "district_id": key[1],
            "skill_id": key[2],
            "period_year": years[-1] + 1,
            "trained_through_period": years[-1],
            "analysis_mode": analysis_mode,
            "provenance_state": provenance,
            "data_status": "SUFFICIENT",
            "reason_code": None,
            "demand_quantity": demand_values[-1],
            "supply_quantity": supply_values[-1],
            "forecast_demand": forecast_demand,
            "forecast_supply": forecast_supply,
            "demand_unit": next(iter(demand_units)),
            "supply_unit": next(iter(supply_units)),
            "demand_temporal_semantics": next(iter(demand_semantics)),
            "supply_temporal_semantics": next(iter(supply_semantics)),
            "gap_eligible": True,
            "gap_eligibility_reason": None,
            "gap": gap,
            "status": status,
            "confidence_level": confidence,
            "confidence_inputs": {
                "history_periods": len(years),
                "total_history_periods": len(years),
                "synthetic_history_periods": 0 if provenance == "SOURCE_BACKED" else len(years),
                "is_contiguous": contiguous,
                "data_coverage": round(data_coverage, 4),
                "forecast_error": None,
                "uncertainty_available": False,
                "source_count": len(source_ids),
                "baseline": "naive_last_value",
                "confidence_note": "No held-out backtest is available; HIGH confidence is not assigned.",
            },
            "evidence_coverage": 1.0 if provenance == "SOURCE_BACKED" else 0.0,
            "history_years": years,
            "recent_growth_rate": recent_growth,
            "historical_growth_rate": historical_growth,
            "signal_strength": signal_strength,
            "emerging_skill_status": "EMERGING" if is_emerging else "NOT_EMERGING",
            "warning_severity": warning_severity,
        })

    counts["forecasts_built"] = len(outputs)
    return outputs, counts
