"""Deterministic SHRAMIK v1.1 forecast, gap, emerging-skill and warning engine.

This module is pure Python: it never connects to a database, performs network requests,
or invents source data. Inputs must already have passed canonical ingestion validation.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import mean
from typing import Iterable, Literal

from ml.ingestion import Observation


ANALYTICS_CONTRACT_VERSION = "1.1"
MODEL_NAME = "naive_last_value"
MODEL_VERSION_PREFIX = "v1"
DEFAULT_MIN_HISTORY = 3
DEFAULT_GAP_THRESHOLD = 0.10
DEFAULT_MIN_FORECAST_DEMAND = 0.0
DEFAULT_EMERGING_GROWTH_THRESHOLD = 0.20
SHORTAGE_WARNING_HIGH_RATIO = 0.20
SHORTAGE_WARNING_CRITICAL_RATIO = 0.30
OVERSUPPLY_WARNING_RATIO = 0.30


class AnalyticsInputError(ValueError):
    """Raised when source selection would make an output ambiguous."""


@dataclass(frozen=True)
class AnalyticsConfig:
    min_history: int = DEFAULT_MIN_HISTORY
    forecast_horizon: int = 1
    gap_threshold: float = DEFAULT_GAP_THRESHOLD
    min_forecast_demand: float = DEFAULT_MIN_FORECAST_DEMAND
    emerging_growth_threshold: float = DEFAULT_EMERGING_GROWTH_THRESHOLD

    def __post_init__(self) -> None:
        if self.min_history < 1:
            raise ValueError("min_history must be >= 1.")
        if self.forecast_horizon < 1:
            raise ValueError("forecast_horizon must be >= 1.")
        if not 0 <= self.gap_threshold < 1:
            raise ValueError("gap_threshold must be in [0, 1).")
        if self.min_forecast_demand < 0:
            raise ValueError("min_forecast_demand must be non-negative.")
        if self.emerging_growth_threshold <= 0:
            raise ValueError("emerging_growth_threshold must be positive.")


def _usable(rows: Iterable[Observation], analysis_mode: str) -> list[Observation]:
    mode = analysis_mode.upper()
    if mode not in {"OFFICIAL", "DEMO"}:
        raise ValueError("analysis_mode must be OFFICIAL or DEMO.")
    selected = [
        row for row in rows
        if row.quantity is not None
        and (mode == "DEMO" or row.provenance_state == "SOURCE_BACKED")
    ]
    return sorted(selected, key=lambda row: (row.period_year, row.source_id or "", row.generation_run_id or ""))


def _target_key(row: Observation) -> tuple[str, str, str]:
    if row.district_id is None or row.skill_id is None:
        raise AnalyticsInputError("Skill-level forecasts require district_id and skill_id.")
    if row.observation_grain not in {"DISTRICT_SKILL", "DISTRICT_SECTOR_SKILL"}:
        raise AnalyticsInputError(
            f"{row.observation_grain} is not an eligible District × Skill forecast grain."
        )
    return (row.state_id, row.district_id, row.skill_id)


def _select_series(
    observations: Iterable[Observation],
    *,
    kind: str,
    target: tuple[str, str, str],
    signal_type: str,
    source_id: str | None,
    analysis_mode: str,
) -> list[Observation]:
    mode = analysis_mode.upper()
    candidates = [
        row for row in observations
        if row.kind == kind
        and row.signal_type == signal_type
        and row.district_id is not None
        and row.skill_id is not None
        and row.state_id == target[0]
        and row.district_id == target[1]
        and row.skill_id == target[2]
        and row.observation_grain in {"DISTRICT_SKILL", "DISTRICT_SECTOR_SKILL"}
        and (mode == "DEMO" or row.provenance_state == "SOURCE_BACKED")
    ]
    if source_id:
        candidates = [
            row for row in candidates
            if row.source_id == source_id or row.provenance_state == "SYNTHETIC_DEMO"
        ]
    if not candidates:
        return []

    # Source-backed sources are not silently merged. One chosen source may be supplemented
    # by synthetic records in DEMO mode, but no two official source IDs are combined.
    source_ids = {row.source_id for row in candidates if row.source_id}
    if source_id is None and len(source_ids) > 1:
        raise AnalyticsInputError(
            f"Multiple {kind.lower()} sources supply {signal_type!r} for "
            f"district={target[1]}, skill={target[2]}; select a source ID explicitly."
        )
    run_ids = {row.generation_run_id for row in candidates if row.provenance_state == "SYNTHETIC_DEMO" and row.generation_run_id}
    if len(run_ids) > 1:
        raise AnalyticsInputError(
            f"Multiple synthetic generation runs supply {signal_type!r} for "
            f"district={target[1]}, skill={target[2]}; select one run before forecasting."
        )

    candidates = _usable(candidates, mode)
    years: dict[int, Observation] = {}
    for row in candidates:
        if row.period_year in years:
            raise AnalyticsInputError(
                f"Multiple selected {kind.lower()} values exist for year {row.period_year} "
                f"(district={target[1]}, skill={target[2]}, signal={signal_type}). "
                "Resolve duplicates or choose a source; no implicit averaging is allowed."
            )
        years[row.period_year] = row

    if candidates:
        signatures = {
            (row.unit.strip().casefold(), row.flow_stock_semantics.strip().casefold(), row.occupation_scope.strip().casefold())
            for row in candidates
        }
        if len(signatures) > 1:
            raise AnalyticsInputError(
                f"Unit, flow/stock semantics or occupation scope changes within the "
                f"{kind.lower()} series for district={target[1]}, skill={target[2]}."
            )
    return [years[year] for year in sorted(years)]


def _contiguous(rows: list[Observation]) -> bool:
    years = [row.period_year for row in rows]
    return len(years) < 2 or all(b - a == 1 for a, b in zip(years, years[1:]))


def _provenance(rows: Iterable[Observation]) -> str:
    states = {row.provenance_state for row in rows}
    if not states or states == {"SOURCE_BACKED"}:
        return "SOURCE_BACKED"
    if states == {"SYNTHETIC_DEMO"}:
        return "SYNTHETIC_DEMO"
    return "MIXED_PROVENANCE"


def _latest(rows: list[Observation]) -> Observation | None:
    return rows[-1] if rows else None


def _status(
    demand: float, supply: float, gap: float, threshold: float, min_demand: float
) -> str:
    if demand <= min_demand:
        return "NO_DEMAND"
    if gap > threshold * demand:
        return "SHORTAGE"
    if gap < -threshold * demand:
        return "OVERSUPPLY"
    return "BALANCED"


def _compatible(demand: Observation, supply: Observation) -> tuple[bool, str | None]:
    if demand.unit.strip().casefold() != supply.unit.strip().casefold():
        return False, "INCOMPATIBLE_UNIT"
    if demand.flow_stock_semantics.strip().casefold() != supply.flow_stock_semantics.strip().casefold():
        return False, "INCOMPATIBLE_FLOW_STOCK"
    if demand.period_type != supply.period_type:
        return False, "INCOMPATIBLE_TIME_BASIS"
    if demand.occupation_scope.strip().casefold() != supply.occupation_scope.strip().casefold():
        return False, "INCOMPATIBLE_OCCUPATION_SCOPE"
    if demand.state_id != supply.state_id or demand.district_id != supply.district_id:
        return False, "INCOMPATIBLE_GEOGRAPHY"
    if demand.skill_id != supply.skill_id:
        return False, "INCOMPATIBLE_OCCUPATION_SCOPE"
    if demand.sector_id and supply.sector_id and demand.sector_id != supply.sector_id:
        return False, "INCOMPATIBLE_OCCUPATION_SCOPE"
    return True, None


def _confidence(
    demand_rows: list[Observation], supply_rows: list[Observation], source_history: int,
    total_history: int, provenance_state: str, evidence_coverage: float,
) -> str:
    # No HIGH rating is issued until Issue #22's held-out model evaluation is available.
    if (
        source_history >= 3
        and total_history >= 3
        and provenance_state == "SOURCE_BACKED"
        and evidence_coverage >= 0.75
        and len({r.source_id for r in demand_rows + supply_rows if r.source_id}) >= 2
        and source_history >= 5
    ):
        return "MEDIUM"
    if source_history >= 3 and provenance_state == "SOURCE_BACKED" and evidence_coverage >= 0.5:
        return "MEDIUM"
    return "LOW"


def _evidence_coverage(demand_rows: list[Observation], supply_rows: list[Observation]) -> float:
    rows = demand_rows + supply_rows
    if not rows:
        return 0.0
    return round(sum(row.evidence_item_id is not None for row in rows) / len(rows), 4)


def _history_counts(demand_rows: list[Observation], supply_rows: list[Observation]) -> tuple[int, int, int]:
    demand_source = sum(row.provenance_state == "SOURCE_BACKED" for row in demand_rows)
    supply_source = sum(row.provenance_state == "SOURCE_BACKED" for row in supply_rows)
    source_count = min(demand_source, supply_source)
    total_count = min(len(demand_rows), len(supply_rows))
    synthetic_count = max(
        sum(row.provenance_state == "SYNTHETIC_DEMO" for row in demand_rows),
        sum(row.provenance_state == "SYNTHETIC_DEMO" for row in supply_rows),
    )
    return source_count, total_count, synthetic_count


def _forecast_record(
    *,
    target: tuple[str, str, str],
    demand_rows: list[Observation],
    supply_rows: list[Observation],
    analysis_mode: str,
    config: AnalyticsConfig,
    calculation_run_id: str,
) -> dict:
    demand_latest = _latest(demand_rows)
    supply_latest = _latest(supply_rows)
    latest_years = [
        row.period_year for row in (demand_latest, supply_latest) if row is not None
    ]
    forecast_year = max(latest_years) + config.forecast_horizon if latest_years else None
    source_history, total_history, synthetic_history = _history_counts(demand_rows, supply_rows)
    evidence_coverage = _evidence_coverage(demand_rows, supply_rows)
    used_rows = demand_rows + supply_rows
    provenance_state = _provenance(used_rows)
    enough_history = (
        len(demand_rows) >= config.min_history
        and len(supply_rows) >= config.min_history
        and demand_latest is not None
        and supply_latest is not None
    )
    base = {
        "contract_version": ANALYTICS_CONTRACT_VERSION,
        "analysis_mode": analysis_mode,
        "provenance_state": provenance_state,
        "state_id": target[0],
        "district_id": target[1],
        "sector_id": (demand_latest.sector_id if demand_latest and demand_latest.sector_id else (supply_latest.sector_id if supply_latest else None)),
        "skill_id": target[2],
        "period_type": "YEAR",
        "period": str(forecast_year) if forecast_year else None,
        "data_status": "INSUFFICIENT_DATA",
        "reason_code": "INSUFFICIENT_HISTORY",
        "demand_quantity": demand_latest.quantity if demand_latest else None,
        "supply_quantity": supply_latest.quantity if supply_latest else None,
        "demand_index": None,
        "supply_index": None,
        "forecast_demand": None,
        "forecast_supply": None,
        "gap_eligible": None,
        "gap_eligibility_reason": None,
        "gap": None,
        "status": None,
        "forecast_uncertainty": None,
        "confidence_level": None,
        "confidence_inputs": {
            "history_periods": source_history,
            "total_history_periods": total_history,
            "synthetic_history_periods": synthetic_history,
            "demand_history_periods": len(demand_rows),
            "supply_history_periods": len(supply_rows),
            "demand_is_contiguous": _contiguous(demand_rows),
            "supply_is_contiguous": _contiguous(supply_rows),
            "is_contiguous": _contiguous(demand_rows) and _contiguous(supply_rows),
            "source_count": len({r.source_id for r in used_rows if r.source_id}),
            "forecast_validation_available": False,
        },
        "evidence_coverage": None,
        "model": None,
        "calculation_run_id": calculation_run_id,
        "is_active": True,
        "input_evidence_item_ids": sorted({r.evidence_item_id for r in used_rows if r.evidence_item_id}),
        "training_cutoff": max([r.period_year for r in used_rows], default=None),
    }
    if not enough_history:
        return base

    assert demand_latest is not None and supply_latest is not None
    # Naïve baseline: carry forward the last actually observed values. It does not
    # fabricate missing years or claim a validated interval.
    forecast_demand = float(demand_latest.quantity)
    forecast_supply = float(supply_latest.quantity)
    compatible, reason = _compatible(demand_latest, supply_latest)
    base.update({
        "data_status": "SUFFICIENT",
        "reason_code": None,
        "forecast_demand": forecast_demand,
        "forecast_supply": forecast_supply,
        "gap_eligible": compatible,
        "gap_eligibility_reason": reason,
        "confidence_level": _confidence(
            demand_rows, supply_rows, source_history, total_history,
            provenance_state, evidence_coverage,
        ),
        "evidence_coverage": evidence_coverage,
        "model": {
            "name": MODEL_NAME,
            "version": f"{MODEL_VERSION_PREFIX}-cutoff-{base['training_cutoff']}",
            "is_baseline": True,
            "trained_through_period": str(base["training_cutoff"]),
        },
    })
    base["confidence_inputs"].update({
        "evidence_coverage": evidence_coverage,
        "uncertainty_available": False,
        "min_history": config.min_history,
    })

    if compatible:
        gap = round(forecast_demand - forecast_supply, 2)
        base["gap"] = gap
        base["status"] = _status(
            forecast_demand, forecast_supply, gap,
            config.gap_threshold, config.min_forecast_demand,
        )
    return base


def _emerging_record(
    target: tuple[str, str, str],
    rows: list[Observation],
    analysis_mode: str,
    config: AnalyticsConfig,
    calculation_run_id: str,
) -> dict:
    latest = _latest(rows)
    years = [row.period_year for row in rows]
    period_year = latest.period_year if latest else None
    provenance_state = _provenance(rows)
    source_periods = sum(row.provenance_state == "SOURCE_BACKED" for row in rows)
    synthetic_periods = sum(row.provenance_state == "SYNTHETIC_DEMO" for row in rows)
    base = {
        "contract_version": ANALYTICS_CONTRACT_VERSION,
        "analysis_mode": analysis_mode,
        "provenance_state": provenance_state,
        "state_id": target[0],
        "district_id": target[1],
        "skill_id": target[2],
        "period_type": "YEAR",
        "period_year": period_year,
        "data_status": "INSUFFICIENT_DATA",
        "emerging_skill_status": "INSUFFICIENT_DATA",
        "recent_growth_rate": None,
        "historical_growth_rate": None,
        "signal_strength": None,
        "history_periods": source_periods,
        "total_history_periods": len(rows),
        "synthetic_history_periods": synthetic_periods,
        "is_contiguous": _contiguous(rows),
        "calculation_run_id": calculation_run_id,
        "is_active": True,
    }
    if len(rows) < config.min_history or latest is None:
        return base
    if len(rows) < 2 or rows[-2].quantity is None or rows[-2].quantity <= 0:
        base.update({"data_status": "INSUFFICIENT_DATA", "emerging_skill_status": "INSUFFICIENT_DATA"})
        return base

    recent_growth = latest.quantity / rows[-2].quantity - 1
    consecutive_growths = []
    for previous, current in zip(rows, rows[1:]):
        if current.period_year == previous.period_year + 1 and previous.quantity > 0:
            consecutive_growths.append(current.quantity / previous.quantity - 1)
    historical_growth = mean(consecutive_growths) if consecutive_growths else None
    is_emerging = recent_growth >= config.emerging_growth_threshold
    strength = min(1.0, max(0.0, recent_growth / (2 * config.emerging_growth_threshold)))
    base.update({
        "data_status": "SUFFICIENT",
        "emerging_skill_status": "EMERGING" if is_emerging else "NOT_EMERGING",
        "recent_growth_rate": round(recent_growth, 6),
        "historical_growth_rate": round(historical_growth, 6) if historical_growth is not None else None,
        "signal_strength": round(strength, 4),
    })
    return base


def _warning_records(forecasts: list[dict]) -> list[dict]:
    warnings = []
    for forecast in forecasts:
        if (
            forecast["data_status"] != "SUFFICIENT"
            or forecast["gap_eligible"] is not True
            or forecast["status"] not in {"SHORTAGE", "OVERSUPPLY"}
            or forecast["gap"] is None
        ):
            continue
        demand = forecast["forecast_demand"] or 0.0
        gap_ratio = abs(forecast["gap"]) / demand if demand > 0 else None
        if forecast["status"] == "SHORTAGE":
            warning_type = "PROJECTED_SHORTAGE"
            if forecast["confidence_level"] != "MEDIUM" or (forecast["evidence_coverage"] or 0) < 0.5:
                severity = "WATCH"
            elif gap_ratio is not None and gap_ratio >= SHORTAGE_WARNING_CRITICAL_RATIO and (forecast["evidence_coverage"] or 0) >= 0.75:
                severity = "CRITICAL"
            elif gap_ratio is not None and gap_ratio >= SHORTAGE_WARNING_HIGH_RATIO:
                severity = "HIGH"
            else:
                severity = "MODERATE"
        else:
            warning_type = "POTENTIAL_OVERSUPPLY"
            severity = (
                "MODERATE"
                if gap_ratio is not None
                and gap_ratio >= OVERSUPPLY_WARNING_RATIO
                and forecast["confidence_level"] == "MEDIUM"
                and (forecast["evidence_coverage"] or 0) >= 0.75
                else "WATCH"
            )
        warnings.append({
            "district_id": forecast["district_id"],
            "skill_id": forecast["skill_id"],
            "forecast_period": forecast["period"],
            "detected_period": int(forecast["period"]),
            "warning_type": warning_type,
            "severity": severity,
            "gap": forecast["gap"],
            "gap_ratio": round(gap_ratio, 6) if gap_ratio is not None else None,
            "confidence_level": forecast["confidence_level"],
            "evidence_coverage": forecast["evidence_coverage"],
            "explanation_code": f"{warning_type}_{severity}",
            "forecast_key": {
                "district_id": forecast["district_id"],
                "skill_id": forecast["skill_id"],
                "period_type": forecast["period_type"],
                "period_year": int(forecast["period"]),
                "analysis_mode": forecast["analysis_mode"],
            },
        })
    severity_rank = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "WATCH": 3}
    warnings.sort(key=lambda row: (
        severity_rank.get(row["severity"], 4),
        -(abs(row["gap_ratio"]) if row["gap_ratio"] is not None else 0.0),
        row["district_id"], row["skill_id"], row["detected_period"], row["warning_type"],
    ))
    return warnings


def compute_analytics(
    observations: Iterable[Observation],
    *,
    analysis_mode: Literal["OFFICIAL", "DEMO"],
    demand_signal_type: str,
    supply_signal_type: str,
    demand_source_id: str | None = None,
    supply_source_id: str | None = None,
    config: AnalyticsConfig | None = None,
    calculation_run_id: str | None = None,
) -> dict:
    """Compute persisted-output-shaped records for eligible district-skill targets."""
    mode = analysis_mode.upper()
    if mode not in {"OFFICIAL", "DEMO"}:
        raise ValueError("analysis_mode must be OFFICIAL or DEMO.")
    if not demand_signal_type.strip() or not supply_signal_type.strip():
        raise ValueError("Both demand_signal_type and supply_signal_type are required.")
    config = config or AnalyticsConfig()
    run_id = calculation_run_id or __import__("uuid").uuid4().hex
    all_rows = tuple(observations)

    targets = {
        (row.state_id, row.district_id, row.skill_id)
        for row in all_rows
        if row.district_id is not None
        and row.skill_id is not None
        and row.observation_grain in {"DISTRICT_SKILL", "DISTRICT_SECTOR_SKILL"}
        and row.kind in {"DEMAND", "SUPPLY"}
        and (mode == "DEMO" or row.provenance_state == "SOURCE_BACKED")
        and row.signal_type in {demand_signal_type, supply_signal_type}
    }
    if not targets:
        raise AnalyticsInputError(
            "No District × Skill observations match the selected signal types and analysis mode."
        )

    forecasts: list[dict] = []
    emerging: list[dict] = []
    for target in sorted(targets):
        demand_rows = _select_series(
            all_rows, kind="DEMAND", target=target,
            signal_type=demand_signal_type, source_id=demand_source_id,
            analysis_mode=mode,
        )
        supply_rows = _select_series(
            all_rows, kind="SUPPLY", target=target,
            signal_type=supply_signal_type, source_id=supply_source_id,
            analysis_mode=mode,
        )
        forecast = _forecast_record(
            target=target,
            demand_rows=demand_rows,
            supply_rows=supply_rows,
            analysis_mode=mode,
            config=config,
            calculation_run_id=run_id,
        )
        forecasts.append(forecast)
        if demand_rows:
            emerging.append(_emerging_record(
                target, demand_rows, mode, config, run_id
            ))

    warning_rows = _warning_records(forecasts)
    return {
        "contract_version": ANALYTICS_CONTRACT_VERSION,
        "analysis_mode": mode,
        "calculation_run_id": run_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": MODEL_NAME,
        "forecast_results": forecasts,
        "emerging_skill_signals": emerging,
        "early_warnings": warning_rows,
        "summary": {
            "targets": len(targets),
            "sufficient_forecasts": sum(r["data_status"] == "SUFFICIENT" for r in forecasts),
            "insufficient_forecasts": sum(r["data_status"] != "SUFFICIENT" for r in forecasts),
            "emerging_skills": sum(r["emerging_skill_status"] == "EMERGING" for r in emerging),
            "warnings": len(warning_rows),
        },
    }
