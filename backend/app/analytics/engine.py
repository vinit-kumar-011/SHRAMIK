"""Pure SHRAMIK baseline forecasting and gap eligibility.

No database writes, external calls, or hidden source aggregation occur here. The engine
uses the contracted naive-last-value baseline and only compares demand/supply signal pairs
that are explicitly approved by a reviewed compatibility configuration.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal
from typing import Iterable

from app.ingestion.canonical_csv import CanonicalObservation, ParsedBatch

TARGET_GRAIN = "DISTRICT_SECTOR_SKILL"
MIN_HISTORY_DEFAULT = 3


class AnalyticsInputError(ValueError):
    """Raised when the selected input cannot be interpreted unambiguously."""


@dataclass(frozen=True)
class AnalyticsConfig:
    analysis_mode: str = "DEMO"
    forecast_horizon: int = 1
    min_history: int = MIN_HISTORY_DEFAULT
    balance_tolerance: Decimal = Decimal("0")
    # Explicit pairs, e.g. {("VACANCY_HEADCOUNT", "EMPLOYED_HEADCOUNT")}.
    # Equal units alone are never sufficient to establish semantic comparability.
    approved_gap_signal_pairs: frozenset[tuple[str, str]] = frozenset()


def _provenance_state(rows: Iterable[CanonicalObservation]) -> str:
    states = {row.provenance_state for row in rows}
    if states == {"SOURCE_BACKED"}:
        return "SOURCE_BACKED"
    if states == {"SYNTHETIC_DEMO"}:
        return "SYNTHETIC_DEMO"
    return "MIXED_PROVENANCE"


def _is_contiguous(years: list[int]) -> bool | None:
    ordered = sorted(set(years))
    if not ordered:
        return None
    return len(ordered) == len(years) and all(
        ordered[index] - ordered[index - 1] == 1
        for index in range(1, len(ordered))
    )


def _validate_batch(batch: ParsedBatch, expected_kind: str) -> None:
    if batch.kind != expected_kind:
        raise AnalyticsInputError(
            f"expected a {expected_kind} batch, got {batch.kind}; check the input files"
        )
    if not batch.valid:
        details = "; ".join(str(issue) for issue in batch.issues[:12])
        if len(batch.issues) > 12:
            details += f"; and {len(batch.issues) - 12} more validation issue(s)"
        raise AnalyticsInputError(
            f"{expected_kind} input failed canonical validation: {details or 'no valid rows'}"
        )


def _collect_series(
    observations: tuple[CanonicalObservation, ...],
    *,
    expected_kind: str,
    selected_signal: str,
    analysis_mode: str,
) -> dict[tuple[str, str, str, str], list[CanonicalObservation]]:
    grouped: dict[tuple[str, str, str, str], list[CanonicalObservation]] = defaultdict(list)
    for row in observations:
        if row.kind != expected_kind or row.signal_type != selected_signal:
            continue
        # Source aggregate grains remain aggregate; never fan them out to skills.
        if row.observation_grain != TARGET_GRAIN:
            continue
        if row.value is None:
            # Training capacity/enrolment/completions do not become current workers.
            continue
        if analysis_mode == "OFFICIAL" and row.provenance_state != "SOURCE_BACKED":
            continue
        key = (
            row.state_id,
            row.district_id or "",
            row.sector_id or "",
            row.skill_id or "",
        )
        grouped[key].append(row)

    for key, rows in grouped.items():
        rows.sort(key=lambda row: row.period_year)
        by_year: dict[int, CanonicalObservation] = {}
        for row in rows:
            if row.period_year in by_year:
                prior = by_year[row.period_year]
                raise AnalyticsInputError(
                    f"ambiguous {expected_kind} series for target {key}, year "
                    f"{row.period_year}: source rows {prior.source_id!r} and "
                    f"{row.source_id!r}. Configure one reviewed signal/source; do not sum them silently."
                )
            by_year[row.period_year] = row

        # A series must have a consistent documented measurement over time.
        capabilities = {(row.unit, row.flow_stock_semantics) for row in rows}
        if len(capabilities) > 1:
            raise AnalyticsInputError(
                f"{expected_kind} series for target {key} changes unit or flow/stock "
                "semantics over time; normalize it before forecasting."
            )
    return grouped


def run_baseline_analytics(
    demand_batch: ParsedBatch,
    supply_batch: ParsedBatch,
    *,
    demand_signal_type: str,
    supply_signal_type: str,
    config: AnalyticsConfig | None = None,
) -> dict:
    """Return Issue #5 v1.1 shaped forecast records without persisting them.

    OFFICIAL excludes every synthetic observation. DEMO may use a mixed series, but
    output provenance always reports what was actually used. Insufficient targets
    keep forecast/gap/confidence fields null rather than substituting zero.
    """
    _validate_batch(demand_batch, "demand")
    _validate_batch(supply_batch, "supply")
    cfg = config or AnalyticsConfig()
    mode = cfg.analysis_mode.upper()
    if mode not in {"OFFICIAL", "DEMO"}:
        raise AnalyticsInputError("analysis_mode must be OFFICIAL or DEMO")
    if cfg.forecast_horizon < 1:
        raise AnalyticsInputError("forecast_horizon must be >= 1")
    if cfg.min_history < 1:
        raise AnalyticsInputError("min_history must be >= 1")
    if cfg.balance_tolerance < 0 or not cfg.balance_tolerance.is_finite():
        raise AnalyticsInputError("balance_tolerance must be finite and non-negative")
    if not demand_signal_type.strip() or not supply_signal_type.strip():
        raise AnalyticsInputError("both demand_signal_type and supply_signal_type are required")

    demand_rows = _collect_series(
        demand_batch.observations,
        expected_kind="demand",
        selected_signal=demand_signal_type,
        analysis_mode=mode,
    )
    supply_rows = _collect_series(
        supply_batch.observations,
        expected_kind="supply",
        selected_signal=supply_signal_type,
        analysis_mode=mode,
    )
    targets = sorted(set(demand_rows) | set(supply_rows))
    results: list[dict] = []

    for target in targets:
        d_series = demand_rows.get(target, [])
        s_series = supply_rows.get(target, [])
        d_last = d_series[-1] if d_series else None
        s_last = s_series[-1] if s_series else None
        used_rows = [*d_series, *s_series]
        provenance = _provenance_state(used_rows) if used_rows else "SOURCE_BACKED"
        have_both = bool(d_series) and bool(s_series)
        history_ok = (
            have_both
            and len(d_series) >= cfg.min_history
            and len(s_series) >= cfg.min_history
        )
        last_years = [row.period_year for row in (d_last, s_last) if row is not None]
        forecast_year = max(last_years) + cfg.forecast_horizon if last_years else None

        record = {
            "contract_version": "1.1",
            "analysis_mode": mode,
            "provenance_state": provenance,
            "district_id": target[1],
            "sector_id": target[2],
            "skill_id": target[3],
            "period_type": "YEAR",
            "period": str(forecast_year) if forecast_year is not None else None,
            "data_status": "SUFFICIENT" if history_ok else "INSUFFICIENT_DATA",
            "reason_code": None if history_ok else (
                "REQUIRED_INPUT_MISSING" if not have_both else "INSUFFICIENT_HISTORY"
            ),
            "demand_quantity": float(d_last.value) if d_last and d_last.value is not None else None,
            "supply_quantity": float(s_last.value) if s_last and s_last.value is not None else None,
            "demand_unit": d_last.unit if d_last else None,
            "supply_unit": s_last.unit if s_last else None,
            "demand_temporal_semantics": d_last.flow_stock_semantics if d_last else None,
            "supply_temporal_semantics": s_last.flow_stock_semantics if s_last else None,
            "demand_index": None,
            "supply_index": None,
            "forecast_demand": float(d_last.value) if history_ok and d_last and d_last.value is not None else None,
            "forecast_supply": float(s_last.value) if history_ok and s_last and s_last.value is not None else None,
            "gap_eligible": None,
            "gap_eligibility_reason": None,
            "gap": None,
            "status": None,
            "forecast_uncertainty": None,
            "confidence_level": None,
            "confidence_inputs": None,
            "evidence_coverage": None,
            "model": None,
        }

        if not history_ok or d_last is None or s_last is None:
            results.append(record)
            continue

        if d_last.unit != s_last.unit:
            gap_reason = "INCOMPATIBLE_UNIT"
        elif (
            not d_last.flow_stock_semantics
            or not s_last.flow_stock_semantics
            or d_last.flow_stock_semantics != s_last.flow_stock_semantics
        ):
            gap_reason = "INCOMPATIBLE_FLOW_STOCK"
        elif d_last.period_year != s_last.period_year:
            gap_reason = "INCOMPATIBLE_TIME_BASIS"
        elif (demand_signal_type, supply_signal_type) not in cfg.approved_gap_signal_pairs:
            gap_reason = "INCOMPATIBLE_SIGNALS"
        else:
            gap_reason = None

        record["gap_eligible"] = gap_reason is None
        record["gap_eligibility_reason"] = gap_reason
        if gap_reason is None:
            gap = d_last.value - s_last.value
            record["gap"] = float(gap)
            if d_last.value == 0:
                record["status"] = "NO_DEMAND"
            elif abs(gap) <= cfg.balance_tolerance:
                record["status"] = "BALANCED"
            elif gap > 0:
                record["status"] = "SHORTAGE"
            else:
                record["status"] = "OVERSUPPLY"

        d_years = {row.period_year for row in d_series}
        s_years = {row.period_year for row in s_series}
        paired_years = sorted(d_years & s_years)
        d_source_years = {row.period_year for row in d_series if not row.is_synthetic}
        s_source_years = {row.period_year for row in s_series if not row.is_synthetic}
        source_pair_years = sorted(d_source_years & s_source_years)
        synthetic_pair_years = sorted(set(paired_years) - set(source_pair_years))
        linked_rows = sum(1 for row in used_rows if row.evidence_item_id)
        evidence_coverage = linked_rows / len(used_rows) if used_rows else 0.0

        record["confidence_level"] = "LOW"  # baseline has not yet been backtested
        record["confidence_inputs"] = {
            "history_periods": len(source_pair_years),
            "total_history_periods": len(paired_years),
            "synthetic_history_periods": len(synthetic_pair_years),
            "is_contiguous": _is_contiguous(paired_years),
            "source_count": len({row.source_id for row in used_rows if row.source_id}),
            "demand_history_periods": len(d_series),
            "supply_history_periods": len(s_series),
            "demand_last_observed_period": d_last.period_year,
            "supply_last_observed_period": s_last.period_year,
            "evidence_linked_observation_count": linked_rows,
            "observation_count_used": len(used_rows),
        }
        # This is input-observation evidence-link coverage, not a probability of
        # correctness. Issue #16 may replace it with the finalized evidence taxonomy.
        record["evidence_coverage"] = round(evidence_coverage, 4)
        trained_through = max(row.period_year for row in used_rows)
        record["model"] = {
            "name": "naive_last_value",
            # The schema makes model versions immutable, including the training cutoff.
            "version": f"v1-through-{trained_through}",
            "is_baseline": True,
            "trained_through_period": trained_through,
        }
        results.append(record)

    results.sort(key=lambda row: (row["district_id"], row["skill_id"], row["period"] or ""))
    statuses = [row for row in results if row["data_status"] == "SUFFICIENT"]
    summary = {
        "target_count": len(results),
        "sufficient_count": len(statuses),
        "insufficient_count": len(results) - len(statuses),
        "shortage_count": sum(row["status"] == "SHORTAGE" for row in statuses),
        "balanced_count": sum(row["status"] == "BALANCED" for row in statuses),
        "oversupply_count": sum(row["status"] == "OVERSUPPLY" for row in statuses),
        "no_demand_count": sum(row["status"] == "NO_DEMAND" for row in statuses),
        "gap_ineligible_count": sum(row["gap_eligible"] is False for row in statuses),
    }
    return {
        "metadata": {
            "analysis_mode": mode,
            "forecast_horizon_years": cfg.forecast_horizon,
            "minimum_history_years": cfg.min_history,
            "model_name": "naive_last_value",
            "model_version": "v1",
            "database_modified": False,
        },
        "summary": summary,
        "results": results,
    }
