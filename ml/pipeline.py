"""Build one ML-contract record (v1.1) for District × Skill × Forecast Period.

Pure function: it receives already-selected observations and returns a dict
shaped exactly like the contract's canonical analytical record. Persisting it
(forecast_results) is a separate step; see to_forecast_results_row().
"""
from __future__ import annotations

from datetime import date
from typing import Iterable, Optional

from ml.config import CONTRACT_VERSION, MIN_FORECAST_HISTORY
from ml.confidence import (
    PROVISIONAL_METHOD,
    apply_caps,
    data_coverage,
    evidence_coverage,
    freshness_days,
    provisional_base_level,
)
from ml.forecast import NAIVE_MODEL, naive_backtest_error, naive_last_value
from ml.gap import SignalProfile, check_gap_eligibility, classify_status, q2
from ml.series import Observation, build_series, provenance_of
from ml.vocab import ANALYSIS_MODES

NULL_WHEN_NOT_SUFFICIENT = (
    "forecast_demand", "forecast_supply", "gap_eligible", "gap_eligibility_reason",
    "gap", "status", "confidence_level", "forecast_uncertainty", "evidence_coverage", "model",
)


def _num(value):
    return None if value is None else float(q2(value))


def build_forecast_record(
    *,
    district_id: str,
    sector_id: str,
    skill_id: str,
    target_year: int,
    cutoff_year: int,
    analysis_mode: str,
    demand_observations: Iterable[Observation],
    supply_observations: Iterable[Observation],
    demand_profile: SignalProfile,
    supply_profile: SignalProfile,
    min_forecast_demand,
    source_available: bool = True,
    as_of: Optional[date] = None,
    min_history: int = MIN_FORECAST_HISTORY,
) -> dict:
    if analysis_mode not in ANALYSIS_MODES:
        raise ValueError(f"analysis_mode must be one of {sorted(ANALYSIS_MODES)}")
    if target_year <= cutoff_year:
        raise ValueError("target_year must be after cutoff_year (no forecasting the past)")

    demand = build_series(demand_observations, analysis_mode, cutoff_year)
    supply = build_series(supply_observations, analysis_mode, cutoff_year)
    used = demand.observations + supply.observations

    provenance = provenance_of(used) or "SOURCE_BACKED"  # nothing used ⇒ nothing synthetic used
    if analysis_mode == "OFFICIAL" and provenance != "SOURCE_BACKED":  # defensive; series excludes synthetic
        raise AssertionError("OFFICIAL series contained synthetic observations")

    # Both series are required, so the reported history describes the limiting
    # one: fewest source-backed periods, then fewest total. All three counts come
    # from that same series, so total = source-backed + synthetic always holds.
    weakest = min((demand, supply), key=lambda s: (s.history_periods, s.total_history_periods))
    history = weakest.history_periods
    synthetic = weakest.synthetic_history_periods
    total = weakest.total_history_periods
    if demand.is_contiguous is None or supply.is_contiguous is None:
        contiguous = None
    else:
        contiguous = demand.is_contiguous and supply.is_contiguous

    first_year = min((o.period_year for o in used), default=None)
    errors = [e for e in (naive_backtest_error(demand), naive_backtest_error(supply)) if e is not None]
    confidence_inputs = {
        "history_periods": history,
        "total_history_periods": total,
        "synthetic_history_periods": synthetic,
        "is_contiguous": contiguous,
        "data_coverage": (min(data_coverage(demand.years, first_year, cutoff_year),
                              data_coverage(supply.years, first_year, cutoff_year))
                          if first_year is not None and demand.years and supply.years else None),
        "data_freshness_days": freshness_days((o.source_date for o in used if not o.is_synthetic), as_of),
        "forecast_error": max(errors) if errors else None,
        "uncertainty_available": False,
        "source_count": len({o.source_id for o in used if o.source_id}) or None,
        "confidence_method": PROVISIONAL_METHOD,
    }

    record = {
        "contract_version": CONTRACT_VERSION,
        "analysis_mode": analysis_mode,
        "provenance_state": provenance,
        "district_id": district_id,
        "sector_id": sector_id,
        "skill_id": skill_id,
        "period_type": "YEAR",
        "period": f"{target_year:04d}",
        "data_status": "SUFFICIENT",
        "reason_code": None,
        "demand_quantity": _num(demand.latest.quantity) if demand.latest else None,
        "supply_quantity": _num(supply.latest.quantity) if supply.latest else None,
        "demand_index": None,  # normalisation reference set is owned by Issue #13
        "supply_index": None,
        "confidence_inputs": confidence_inputs,
    }

    # ---- availability / sufficiency (contract section 5 precedence)
    status_reason = None
    if not source_available:
        status_reason = ("UNAVAILABLE", "SOURCE_UNAVAILABLE")
    elif not demand.observations or not supply.observations:
        status_reason = ("INSUFFICIENT_DATA", "REQUIRED_INPUT_MISSING")
    else:
        if analysis_mode == "OFFICIAL":
            counted = min(demand.history_periods, supply.history_periods)
        else:
            counted = min(demand.total_history_periods, supply.total_history_periods)
        if counted < min_history:
            status_reason = ("INSUFFICIENT_DATA", "INSUFFICIENT_HISTORY")

    if status_reason:
        record["data_status"], record["reason_code"] = status_reason
        for key in NULL_WHEN_NOT_SUFFICIENT:
            record[key] = None
        return record

    # ---- forecast
    try:
        forecast_demand = naive_last_value(demand)
        forecast_supply = naive_last_value(supply)
    except Exception:  # model failure is a data_status, not a crash
        record["data_status"], record["reason_code"] = "UNAVAILABLE", "MODEL_FAILURE"
        for key in NULL_WHEN_NOT_SUFFICIENT:
            record[key] = None
        return record

    eligible, eligibility_reason = check_gap_eligibility(demand_profile, supply_profile)
    gap, status = classify_status(forecast_demand, forecast_supply, eligible, min_forecast_demand)

    base = provisional_base_level(confidence_inputs)
    record.update({
        "forecast_demand": _num(forecast_demand),
        "forecast_supply": _num(forecast_supply),
        "gap_eligible": eligible,
        "gap_eligibility_reason": eligibility_reason,
        "gap": _num(gap) if eligible else None,
        "status": status,
        "forecast_uncertainty": None,  # naive baseline: no validated interval (section 11)
        "confidence_level": apply_caps(base, history, provenance),
        "evidence_coverage": evidence_coverage(used),
        "model": dict(NAIVE_MODEL, trained_through_period=f"{cutoff_year:04d}"),
    })
    return record


def to_forecast_results_row(record: dict, *, model_version_id: Optional[str],
                            calculation_run_id: str, calculated_at: str) -> dict:
    """Map a contract record to forecast_results columns (schema section 18).

    model_version_id must be the id of the immutable model_versions row whose
    name/version/trained_through_period match record["model"]. It is None for
    non-SUFFICIENT records. is_active is left False: activating a result is an
    explicit, separate step.
    """
    sufficient = record["data_status"] == "SUFFICIENT"
    if sufficient and not model_version_id:
        raise ValueError("SUFFICIENT records need a model_version_id")
    if not sufficient and model_version_id:
        raise ValueError("non-SUFFICIENT records must not carry a model_version_id")
    columns = (
        "contract_version", "analysis_mode", "provenance_state", "district_id", "skill_id",
        "period_type", "data_status", "reason_code", "demand_quantity", "supply_quantity",
        "demand_index", "supply_index", "forecast_demand", "forecast_supply", "gap_eligible",
        "gap_eligibility_reason", "gap", "status", "forecast_uncertainty", "confidence_level",
        "confidence_inputs", "evidence_coverage",
    )
    row = {c: record[c] for c in columns}
    row.update({
        "period_year": int(record["period"]),
        "model_version_id": model_version_id,
        "calculation_run_id": calculation_run_id,
        "is_active": False,
        "calculated_at": calculated_at,
    })
    return row
