"""Persist a validated one-step baseline forecast run.

Run from the backend directory:
  python -m app.ingestion.pipeline --mode DEMO
  python -m app.ingestion.pipeline --mode OFFICIAL --demand-signal-type <type> --supply-signal-type <type>

Only matched District x Skill series from the same annual periods are used. The
current output table does not carry sector_id, so this implementation deliberately
does not collapse District x Sector x Skill input into District x Skill output.
"""

from __future__ import annotations

import argparse
import json
import uuid
from typing import Any

from sqlalchemy import text

from app.ingestion.analytics import build_analytics_outputs
from app.ingestion.db import get_engine

CONTRACT_VERSION = "1.1"
MODEL_NAME = "SHRAMIK naive-last-value baseline"
MODEL_VERSION = "1.0.0"
MIN_HISTORY = 3
DEMO_DEMAND_SIGNAL = "DEMO_LABOUR_DEMAND"
DEMO_SUPPLY_SIGNAL = "DEMO_AVAILABLE_WORKFORCE"


def _fetch_observations(conn, *, kind: str, mode: str, signal_type: str,
                        source_id: str | None) -> list[dict[str, Any]]:
    if kind == "demand":
        table, value_column, signal_column = (
            "demand_observations", "demand_quantity", "demand_signal_type"
        )
    else:
        table, value_column, signal_column = (
            "supply_observations", "supply_quantity", "supply_signal_type"
        )

    if mode == "OFFICIAL":
        provenance_filter = "o.provenance_state = 'SOURCE_BACKED' AND o.is_synthetic = FALSE AND o.source_id IS NOT NULL AND s.is_active = TRUE"
    else:
        provenance_filter = "o.provenance_state = 'SYNTHETIC_DEMO' AND o.is_synthetic = TRUE AND o.source_id IS NULL AND o.generation_run_id IS NOT NULL"

    source_filter = "AND o.source_id = :source_id" if source_id else ""
    query = text(f"""
        SELECT o.state_id, o.district_id, o.skill_id, o.period_year,
               o.{value_column} AS value, o.quantity_unit, o.quantity_semantics,
               o.source_id, o.is_synthetic, o.generation_run_id
        FROM public.{table} o
        JOIN public.skills s ON s.id = o.skill_id
        WHERE o.observation_grain = 'DISTRICT_SKILL'
          AND o.district_id IS NOT NULL
          AND o.sector_id IS NULL
          AND o.{value_column} IS NOT NULL
          AND o.{signal_column} = :signal_type
          AND {provenance_filter}
          {source_filter}
        ORDER BY o.state_id, o.district_id, o.skill_id, o.period_year
    """)
    rows = conn.execute(query, {"signal_type": signal_type, **({"source_id": source_id} if source_id else {})}).mappings().all()
    result = []
    for row in rows:
        item = dict(row)
        item["demand_quantity" if kind == "demand" else "supply_quantity"] = item.pop("value")
        item["source_id"] = str(item["source_id"]) if item.get("source_id") else None
        result.append(item)
    return result


def _ensure_model_version(conn, trained_through_period: int) -> str:
    metadata = {
        "algorithm": "naive_last_value",
        "version": MODEL_VERSION,
        "forecast_horizon_years": 1,
        "minimum_history_periods": MIN_HISTORY,
        "uncertainty": "not_available_without_backtest",
        "notes": "A transparent baseline, not a validated production model.",
    }
    model_id = conn.execute(text("""
        INSERT INTO public.model_versions
            (name, version, is_baseline, trained_through_period, contract_version, metadata)
        VALUES
            (:name, :version, TRUE, :trained_through, :contract_version, CAST(:metadata AS jsonb))
        ON CONFLICT (name, version) DO UPDATE SET
            trained_through_period = EXCLUDED.trained_through_period,
            contract_version = EXCLUDED.contract_version,
            metadata = EXCLUDED.metadata
        RETURNING id
    """), {
        "name": MODEL_NAME, "version": MODEL_VERSION,
        "trained_through": trained_through_period,
        "contract_version": CONTRACT_VERSION, "metadata": json.dumps(metadata),
    }).scalar_one()
    return str(model_id)


def _persist_forecast(conn, output: dict[str, Any], model_version_id: str) -> str:
    # Deactivate an older active model result for this exact mode/key before upsert.
    conn.execute(text("""
        UPDATE public.forecast_results SET is_active = FALSE
        WHERE analysis_mode = :mode AND district_id = :district_id AND skill_id = :skill_id
          AND period_type = 'YEAR' AND period_year = :period_year AND is_active = TRUE
    """), {
        "mode": output["analysis_mode"], "district_id": output["district_id"],
        "skill_id": output["skill_id"], "period_year": output["period_year"],
    })
    forecast_id = conn.execute(text("""
        INSERT INTO public.forecast_results (
            contract_version, analysis_mode, provenance_state, district_id, skill_id,
            period_type, period_year, data_status, reason_code, demand_quantity,
            supply_quantity, forecast_demand, forecast_supply, demand_unit, supply_unit,
            demand_temporal_semantics, supply_temporal_semantics, gap_eligible,
            gap_eligibility_reason, gap, status, forecast_uncertainty, confidence_level,
            confidence_inputs, evidence_coverage, model_version_id, is_active
        ) VALUES (
            :contract_version, :mode, :provenance, :district_id, :skill_id,
            'YEAR', :period_year, 'SUFFICIENT', NULL, :demand_quantity,
            :supply_quantity, :forecast_demand, :forecast_supply, :demand_unit, :supply_unit,
            :demand_semantics, :supply_semantics, TRUE, NULL, :gap, :status, NULL,
            :confidence, CAST(:confidence_inputs AS jsonb), :evidence_coverage,
            :model_version_id, TRUE
        )
        ON CONFLICT (
            district_id, skill_id, period_type, period_year, analysis_mode,
            model_version_id, contract_version
        ) WHERE model_version_id IS NOT NULL
        DO UPDATE SET
            provenance_state = EXCLUDED.provenance_state,
            data_status = EXCLUDED.data_status,
            reason_code = NULL,
            demand_quantity = EXCLUDED.demand_quantity,
            supply_quantity = EXCLUDED.supply_quantity,
            forecast_demand = EXCLUDED.forecast_demand,
            forecast_supply = EXCLUDED.forecast_supply,
            demand_unit = EXCLUDED.demand_unit,
            supply_unit = EXCLUDED.supply_unit,
            demand_temporal_semantics = EXCLUDED.demand_temporal_semantics,
            supply_temporal_semantics = EXCLUDED.supply_temporal_semantics,
            gap_eligible = TRUE,
            gap_eligibility_reason = NULL,
            gap = EXCLUDED.gap,
            status = EXCLUDED.status,
            forecast_uncertainty = NULL,
            confidence_level = EXCLUDED.confidence_level,
            confidence_inputs = EXCLUDED.confidence_inputs,
            evidence_coverage = EXCLUDED.evidence_coverage,
            is_active = TRUE,
            calculated_at = now()
        RETURNING id
    """), {
        "contract_version": CONTRACT_VERSION,
        "mode": output["analysis_mode"],
        "provenance": output["provenance_state"],
        "district_id": output["district_id"],
        "skill_id": output["skill_id"],
        "period_year": output["period_year"],
        "demand_quantity": output["demand_quantity"],
        "supply_quantity": output["supply_quantity"],
        "forecast_demand": output["forecast_demand"],
        "forecast_supply": output["forecast_supply"],
        "demand_unit": output["demand_unit"],
        "supply_unit": output["supply_unit"],
        "demand_semantics": output["demand_temporal_semantics"],
        "supply_semantics": output["supply_temporal_semantics"],
        "gap": output["gap"],
        "status": output["status"],
        "confidence": output["confidence_level"],
        "confidence_inputs": json.dumps(output["confidence_inputs"]),
        "evidence_coverage": output["evidence_coverage"],
        "model_version_id": model_version_id,
    }).scalar_one()
    return str(forecast_id)


def _persist_emerging_signal(conn, output: dict[str, Any]) -> None:
    conn.execute(text("""
        INSERT INTO public.emerging_skill_signals (
            contract_version, district_id, skill_id, period_type, period_year,
            data_status, emerging_skill_status, recent_growth_rate, historical_growth_rate,
            signal_strength, analysis_mode, provenance_state, history_periods,
            total_history_periods, synthetic_history_periods, is_contiguous, is_active
        ) VALUES (
            :contract_version, :district_id, :skill_id, 'YEAR', :period_year,
            'SUFFICIENT', :emerging_status, :recent_growth, :historical_growth,
            :signal_strength, :mode, :provenance, :history_periods,
            :total_history_periods, :synthetic_periods, :is_contiguous, TRUE
        )
        ON CONFLICT (
            district_id, skill_id, period_type, period_year, analysis_mode, contract_version
        ) DO UPDATE SET
            data_status = EXCLUDED.data_status,
            emerging_skill_status = EXCLUDED.emerging_skill_status,
            recent_growth_rate = EXCLUDED.recent_growth_rate,
            historical_growth_rate = EXCLUDED.historical_growth_rate,
            signal_strength = EXCLUDED.signal_strength,
            provenance_state = EXCLUDED.provenance_state,
            history_periods = EXCLUDED.history_periods,
            total_history_periods = EXCLUDED.total_history_periods,
            synthetic_history_periods = EXCLUDED.synthetic_history_periods,
            is_contiguous = EXCLUDED.is_contiguous,
            is_active = TRUE,
            calculated_at = now()
    """), {
        "contract_version": CONTRACT_VERSION,
        "district_id": output["district_id"],
        "skill_id": output["skill_id"],
        "period_year": output["period_year"],
        "emerging_status": output["emerging_skill_status"],
        "recent_growth": output["recent_growth_rate"],
        "historical_growth": output["historical_growth_rate"],
        "signal_strength": output["signal_strength"],
        "mode": output["analysis_mode"],
        "provenance": output["provenance_state"],
        "history_periods": len(output["history_years"]),
        "total_history_periods": len(output["history_years"]),
        "synthetic_periods": 0 if output["provenance_state"] == "SOURCE_BACKED" else len(output["history_years"]),
        "is_contiguous": output["confidence_inputs"]["is_contiguous"],
    })


def _persist_warning(conn, *, forecast_id: str, output: dict[str, Any]) -> bool:
    # Clear a previous active warning if the recomputed series no longer crosses threshold.
    conn.execute(text("""
        UPDATE public.early_warnings SET is_active = FALSE
        WHERE forecast_result_id = :forecast_id
          AND warning_type = 'SUPPLY_GAP_RISK'
          AND detected_period = :period_year
    """), {"forecast_id": forecast_id, "period_year": output["period_year"]})
    severity = output["warning_severity"]
    if not severity:
        return False
    explanation = (
        "SYNTHETIC_DEMO_GAP_OVER_THRESHOLD"
        if output["analysis_mode"] == "DEMO"
        else "SOURCE_BACKED_GAP_OVER_THRESHOLD"
    )
    conn.execute(text("""
        INSERT INTO public.early_warnings
            (forecast_result_id, warning_type, severity, detected_period,
             explanation_code, is_active)
        VALUES
            (:forecast_id, 'SUPPLY_GAP_RISK', :severity, :period, :explanation, TRUE)
        ON CONFLICT (forecast_result_id, warning_type, detected_period)
        DO UPDATE SET severity = EXCLUDED.severity,
                      explanation_code = EXCLUDED.explanation_code,
                      is_active = TRUE,
                      created_at = now()
    """), {
        "forecast_id": forecast_id, "severity": severity,
        "period": output["period_year"], "explanation": explanation,
    })
    return True


def run_pipeline(*, mode: str, demand_signal_type: str | None = None,
                 supply_signal_type: str | None = None, demand_source_id: str | None = None,
                 supply_source_id: str | None = None, min_history: int = MIN_HISTORY,
                 warning_threshold: float = 0.20,
                 confirm_compatible_signals: bool = False) -> dict[str, Any]:
    if mode not in {"OFFICIAL", "DEMO"}:
        raise ValueError("mode must be OFFICIAL or DEMO.")
    if mode == "DEMO":
        demand_signal_type = demand_signal_type or DEMO_DEMAND_SIGNAL
        supply_signal_type = supply_signal_type or DEMO_SUPPLY_SIGNAL
    elif not demand_signal_type or not supply_signal_type:
        raise ValueError(
            "OFFICIAL mode requires explicit --demand-signal-type and --supply-signal-type "
            "so unrelated measures are never combined accidentally."
        )
    elif not confirm_compatible_signals:
        raise ValueError(
            "OFFICIAL mode requires --confirm-compatible-signals after verifying unit, "
            "flow/stock semantics, period basis, geography and occupation/skill scope. "
            "Do not approve vacancies versus training completions as a direct labour-shortage gap."
        )

    engine = get_engine()
    try:
        with engine.begin() as conn:
            demand = _fetch_observations(
                conn, kind="demand", mode=mode, signal_type=demand_signal_type,
                source_id=demand_source_id,
            )
            supply = _fetch_observations(
                conn, kind="supply", mode=mode, signal_type=supply_signal_type,
                source_id=supply_source_id,
            )
            outputs, summary = build_analytics_outputs(
                demand, supply, analysis_mode=mode, min_history=min_history,
                warning_threshold=warning_threshold,
            )
            summary.update({
                "analysis_mode": mode,
                "demand_signal_type": demand_signal_type,
                "supply_signal_type": supply_signal_type,
                "minimum_history": min_history,
                "warning_threshold": warning_threshold,
                "unsupported_grain_policy": (
                    "Only DISTRICT_SKILL rows with sector_id NULL are consumed by this table contract; "
                    "DISTRICT-only observations and sector-grain rows are never distributed or collapsed."
                ),
                "published_outputs": 0,
                "warnings_published": 0,
                "emerging_skill_signals_published": 0,
            })
            if not outputs:
                summary["message"] = (
                    "No compatible District x Skill series with at least the configured "
                    "source-mode-specific history were found. No published results were changed."
                )
                return summary

            trained_through = max(output["trained_through_period"] for output in outputs)
            model_version_id = _ensure_model_version(conn, trained_through)
            for output in outputs:
                # Only the newest one-step forecast is active for each mode/series.
                # Keep historical rows for traceability, but don't present stale target years as current.
                conn.execute(text("""
                    UPDATE public.early_warnings SET is_active = FALSE
                    WHERE forecast_result_id IN (
                        SELECT id FROM public.forecast_results
                        WHERE analysis_mode = :mode AND district_id = :district_id
                          AND skill_id = :skill_id
                    )
                """), {
                    "mode": mode, "district_id": output["district_id"],
                    "skill_id": output["skill_id"],
                })
                conn.execute(text("""
                    UPDATE public.forecast_results SET is_active = FALSE
                    WHERE analysis_mode = :mode AND district_id = :district_id
                      AND skill_id = :skill_id AND is_active = TRUE
                """), {
                    "mode": mode, "district_id": output["district_id"],
                    "skill_id": output["skill_id"],
                })
                conn.execute(text("""
                    UPDATE public.emerging_skill_signals SET is_active = FALSE
                    WHERE analysis_mode = :mode AND district_id = :district_id
                      AND skill_id = :skill_id AND contract_version = :contract_version
                      AND is_active = TRUE
                """), {
                    "mode": mode, "district_id": output["district_id"],
                    "skill_id": output["skill_id"], "contract_version": CONTRACT_VERSION,
                })
                forecast_id = _persist_forecast(conn, output, model_version_id)
                if _persist_warning(conn, forecast_id=forecast_id, output=output):
                    summary["warnings_published"] += 1
                _persist_emerging_signal(conn, output)
                summary["published_outputs"] += 1
                summary["emerging_skill_signals_published"] += 1

            summary["model"] = {
                "name": MODEL_NAME,
                "version": MODEL_VERSION,
                "model_version_id": model_version_id,
                "is_baseline": True,
            }
            summary["forecast_years"] = sorted({output["period_year"] for output in outputs})
            summary["provenance_state"] = "SOURCE_BACKED" if mode == "OFFICIAL" else "SYNTHETIC_DEMO"
            summary["message"] = (
                "Baseline outputs persisted. They are one-step naive-last-value results; "
                "forecast uncertainty is not available without backtesting."
            )
            return summary
    finally:
        engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("OFFICIAL", "DEMO"), required=True)
    parser.add_argument("--demand-signal-type")
    parser.add_argument("--supply-signal-type")
    parser.add_argument("--demand-source-id")
    parser.add_argument("--supply-source-id")
    parser.add_argument("--min-history", type=int, default=MIN_HISTORY)
    parser.add_argument("--warning-threshold", type=float, default=0.20)
    parser.add_argument(
        "--confirm-compatible-signals",
        action="store_true",
        help="Required in OFFICIAL mode only after reviewing the semantic compatibility of the selected signals.",
    )
    args = parser.parse_args()
    summary = run_pipeline(
        mode=args.mode, demand_signal_type=args.demand_signal_type,
        supply_signal_type=args.supply_signal_type, demand_source_id=args.demand_source_id,
        supply_source_id=args.supply_source_id, min_history=args.min_history,
        warning_threshold=args.warning_threshold,
        confirm_compatible_signals=args.confirm_compatible_signals,
    )
    print(json.dumps(summary, indent=2, default=str))


if __name__ == "__main__":
    main()
