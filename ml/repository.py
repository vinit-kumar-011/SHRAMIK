"""Database adapter for canonical ingestion and analytics result persistence.

All writes run in the caller's transaction. This module performs no schema changes.
"""
from __future__ import annotations

import json
from dataclasses import replace
from datetime import datetime, timezone
from typing import Any, Iterable
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.engine import Connection

from ml.ingestion import IngestionValidationError, Observation
from ml.analytics_engine import AnalyticsInputError


class DatabaseValidationError(ValueError):
    """Raised when CSV rows do not agree with canonical database references."""


def _norm(value: str | None) -> str:
    return (value or "").strip().casefold()


def load_reference_catalog(conn: Connection) -> dict[str, Any]:
    states = {str(r["id"]) for r in conn.execute(text("SELECT id FROM states")).mappings()}
    districts = {
        str(r["id"]): {"state_id": str(r["state_id"]), "is_active": bool(r["is_active"])}
        for r in conn.execute(text("SELECT id, state_id, is_active FROM districts")).mappings()
    }
    sectors = {
        str(r["id"]): {"is_active": bool(r["is_active"])}
        for r in conn.execute(text("SELECT id, is_active FROM sectors")).mappings()
    }
    skills = {
        str(r["id"]): {"sector_id": str(r["sector_id"]), "is_active": bool(r["is_active"])}
        for r in conn.execute(text("SELECT id, sector_id, is_active FROM skills")).mappings()
    }
    sources = {str(r["id"]) for r in conn.execute(text("SELECT id FROM data_sources")).mappings()}
    retrievals = {
        str(r["id"]): str(r["source_id"])
        for r in conn.execute(text("SELECT id, source_id FROM source_retrievals")).mappings()
    }
    evidence = {
        str(r["id"]): str(r["source_id"])
        for r in conn.execute(text("SELECT id, source_id FROM evidence_items")).mappings()
    }
    capabilities = [
        {
            "source_id": str(r["source_id"]),
            "observation_grain": str(r["observation_grain"]),
            "signal_type": str(r["signal_type"]),
            "unit": str(r["unit"]),
            "flow_stock_semantics": str(r["flow_stock_semantics"]),
        }
        for r in conn.execute(text(
            "SELECT source_id, observation_grain, signal_type, unit, flow_stock_semantics "
            "FROM source_capabilities"
        )).mappings()
    ]
    synthetic_runs = {
        str(r["id"])
        for r in conn.execute(text("SELECT id FROM synthetic_generation_runs")).mappings()
    }
    return {
        "states": states,
        "districts": districts,
        "sectors": sectors,
        "skills": skills,
        "sources": sources,
        "retrievals": retrievals,
        "evidence": evidence,
        "capabilities": capabilities,
        "synthetic_runs": synthetic_runs,
    }


def validate_against_database(
    rows: Iterable[Observation],
    catalog: dict[str, Any],
    *,
    analysis_mode: str,
) -> None:
    """Validate all identifiers and source capability claims before any inserts."""
    mode = analysis_mode.upper()
    for row in rows:
        line = f"{row.kind} {row.signal_type} {row.period_year}"
        if row.state_id not in catalog["states"]:
            raise DatabaseValidationError(f"{line}: unknown state_id {row.state_id!r}.")
        if row.district_id:
            district = catalog["districts"].get(row.district_id)
            if not district:
                raise DatabaseValidationError(f"{line}: unknown district_id {row.district_id!r}.")
            if district["state_id"] != row.state_id:
                raise DatabaseValidationError(f"{line}: district_id does not belong to state_id.")
            if mode == "OFFICIAL" and row.provenance_state == "SOURCE_BACKED" and not district["is_active"]:
                raise DatabaseValidationError(f"{line}: inactive district is not eligible for OFFICIAL analytics.")
        if row.sector_id:
            sector = catalog["sectors"].get(row.sector_id)
            if not sector:
                raise DatabaseValidationError(f"{line}: unknown sector_id {row.sector_id!r}.")
            if mode == "OFFICIAL" and row.provenance_state == "SOURCE_BACKED" and not sector["is_active"]:
                raise DatabaseValidationError(f"{line}: inactive sector is not eligible for OFFICIAL analytics.")
        if row.skill_id:
            skill = catalog["skills"].get(row.skill_id)
            if not skill:
                raise DatabaseValidationError(f"{line}: unknown skill_id {row.skill_id!r}.")
            if row.sector_id and skill["sector_id"] != row.sector_id:
                raise DatabaseValidationError(f"{line}: sector_id conflicts with canonical skills.sector_id.")
            if mode == "OFFICIAL" and row.provenance_state == "SOURCE_BACKED" and not skill["is_active"]:
                raise DatabaseValidationError(
                    f"{line}: skill is inactive pending mapping review; it cannot enter OFFICIAL analytics."
                )

        if row.provenance_state == "SOURCE_BACKED":
            if row.source_id not in catalog["sources"]:
                raise DatabaseValidationError(f"{line}: source_id does not exist in data_sources.")
            if catalog["retrievals"].get(row.retrieval_id or "") != row.source_id:
                raise DatabaseValidationError(
                    f"{line}: retrieval_id is missing or belongs to a different source_id."
                )
            if row.evidence_item_id:
                if catalog["evidence"].get(row.evidence_item_id) != row.source_id:
                    raise DatabaseValidationError(
                        f"{line}: evidence_item_id is missing or belongs to a different source_id."
                    )
            matches = [
                c for c in catalog["capabilities"]
                if c["source_id"] == row.source_id
                and _norm(c["observation_grain"]) == _norm(row.observation_grain)
                and _norm(c["signal_type"]) == _norm(row.signal_type)
            ]
            if not matches:
                raise DatabaseValidationError(
                    f"{line}: no source_capabilities entry supports this source/grain/signal type. "
                    "Register the source capability before ingestion."
                )
            if not any(
                _norm(c["unit"]) == _norm(row.unit)
                and _norm(c["flow_stock_semantics"]) == _norm(row.flow_stock_semantics)
                for c in matches
            ):
                raise DatabaseValidationError(
                    f"{line}: CSV unit/flow_stock_semantics does not match source_capabilities."
                )
        elif row.generation_run_id and row.generation_run_id not in catalog["synthetic_runs"]:
            raise DatabaseValidationError(
                f"{line}: generation_run_id does not exist; leave it blank for a new run."
            )


def _register_synthetic_run(
    conn: Connection,
    rows: list[Observation],
    *,
    input_sha256: str,
    random_seed: int | None,
    generator_name: str,
    generator_version: str,
) -> str | None:
    synthetic = [row for row in rows if row.provenance_state == "SYNTHETIC_DEMO"]
    if not synthetic:
        return None
    supplied_ids = {row.generation_run_id for row in synthetic if row.generation_run_id}
    if len(supplied_ids) > 1:
        raise DatabaseValidationError(
            "One input batch references multiple synthetic_generation_runs. "
            "Run each generation batch separately."
        )
    if supplied_ids:
        run_id = next(iter(supplied_ids))
        existing = conn.execute(
            text("SELECT id FROM synthetic_generation_runs WHERE id = :id"),
            {"id": run_id},
        ).scalar_one_or_none()
        if existing is None:
            raise DatabaseValidationError(
                "generation_run_id was supplied but does not exist. Leave it blank to register this input batch."
            )
        return str(existing)

    # Reuse the run for an identical file so repeated imports remain idempotent.
    existing = conn.execute(text(
        "SELECT id FROM synthetic_generation_runs "
        "WHERE generator_name = :generator_name "
        "AND parameters->>'input_sha256' = :input_sha256 "
        "ORDER BY generated_at DESC LIMIT 1"
    ), {"generator_name": generator_name, "input_sha256": input_sha256}).scalar_one_or_none()
    if existing:
        return str(existing)

    run_id = str(uuid4())
    signatures = sorted({
        (row.kind, row.signal_type, row.unit, row.flow_stock_semantics, row.occupation_scope)
        for row in synthetic
    })
    years = sorted({row.period_year for row in synthetic})
    parameters = {
        "input_sha256": input_sha256,
        "row_count": len(synthetic),
        "period_years": years,
        "signal_signatures": [
            {
                "kind": k, "signal_type": signal, "unit": unit,
                "flow_stock_semantics": semantics, "occupation_scope": scope,
            }
            for k, signal, unit, semantics, scope in signatures
        ],
        "random_seed": random_seed,
        "random_seed_applicable": random_seed is not None,
        "generator_name": generator_name,
        "generator_version": generator_version,
    }
    conn.execute(text("""
        INSERT INTO synthetic_generation_runs
            (id, generator_name, generator_version, random_seed, parameters,
             generated_at, source_context, created_at)
        VALUES
            (:id, :generator_name, :generator_version, :random_seed,
             CAST(:parameters AS jsonb), :generated_at, :source_context, :created_at)
    """), {
        "id": run_id,
        "generator_name": generator_name,
        "generator_version": generator_version,
        "random_seed": random_seed if random_seed is not None else 0,
        "parameters": json.dumps(parameters, sort_keys=True),
        "generated_at": datetime.now(timezone.utc),
        "source_context": (
            "Synthetic DEMO input only. random_seed=0 means not applicable when "
            "random_seed_applicable is false; input SHA-256 identifies the supplied file."
        ),
        "created_at": datetime.now(timezone.utc),
    })
    return run_id


def persist_observations(
    conn: Connection,
    rows: Iterable[Observation],
    *,
    input_sha256: str,
    random_seed: int | None = None,
    generator_name: str = "externally_supplied_demo_dataset",
    generator_version: str = "1.0",
) -> tuple[Observation, ...]:
    """Upsert the canonical fact rows under a transaction-level lock."""
    source_rows = list(rows)
    conn.execute(text("SELECT pg_advisory_xact_lock(hashtext('shramik-canonical-pipeline-v1'))"))
    run_id = _register_synthetic_run(
        conn, source_rows, input_sha256=input_sha256, random_seed=random_seed,
        generator_name=generator_name, generator_version=generator_version,
    )
    prepared = [
        replace(row, generation_run_id=(row.generation_run_id or run_id))
        if row.provenance_state == "SYNTHETIC_DEMO" else row
        for row in source_rows
    ]

    for row in prepared:
        is_demand = row.kind == "DEMAND"
        table = "demand_observations" if is_demand else "supply_observations"
        quantity_column = "demand_quantity" if is_demand else "supply_quantity"
        signal_column = "demand_signal_type" if is_demand else "supply_signal_type"
        source_clause = (
            "source_id IS NOT DISTINCT FROM :source_id"
            if row.provenance_state == "SOURCE_BACKED"
            else "generation_run_id IS NOT DISTINCT FROM :generation_run_id"
        )
        params = {
            "state_id": row.state_id,
            "district_id": row.district_id,
            "sector_id": row.sector_id,
            "skill_id": row.skill_id,
            "observation_grain": row.observation_grain,
            "period_type": row.period_type,
            "period_year": row.period_year,
            "signal_type": row.signal_type,
            "source_id": row.source_id,
            "retrieval_id": row.retrieval_id,
            "evidence_item_id": row.evidence_item_id,
            "provenance_state": row.provenance_state,
            "is_synthetic": row.is_synthetic,
            "generation_run_id": row.generation_run_id,
            "transformation_note": row.transformation_note,
            "source_date": row.source_date,
            "quantity": row.quantity,
        }
        existing_id = conn.execute(text(f"""
            SELECT id FROM {table}
            WHERE state_id = :state_id
              AND district_id IS NOT DISTINCT FROM :district_id
              AND sector_id IS NOT DISTINCT FROM :sector_id
              AND skill_id IS NOT DISTINCT FROM :skill_id
              AND observation_grain = :observation_grain
              AND period_type = :period_type
              AND period_year = :period_year
              AND {signal_column} = :signal_type
              AND {source_clause}
            LIMIT 1
        """), params).scalar_one_or_none()
        if existing_id:
            conn.execute(text(f"""
                UPDATE {table}
                SET {quantity_column} = :quantity,
                    retrieval_id = :retrieval_id,
                    evidence_item_id = :evidence_item_id,
                    source_date = :source_date,
                    provenance_state = :provenance_state,
                    is_synthetic = :is_synthetic,
                    generation_run_id = :generation_run_id,
                    transformation_note = :transformation_note
                WHERE id = :id
            """), {**params, "id": str(existing_id)})
        else:
            conn.execute(text(f"""
                INSERT INTO {table}
                    (id, state_id, district_id, sector_id, skill_id,
                     observation_grain, period_type, period_year, {quantity_column},
                     {signal_column}, source_id, source_date, retrieval_id,
                     evidence_item_id, provenance_state, is_synthetic,
                     generation_run_id, transformation_note, created_at)
                VALUES
                    (:id, :state_id, :district_id, :sector_id, :skill_id,
                     :observation_grain, :period_type, :period_year, :quantity,
                     :signal_type, :source_id, :source_date, :retrieval_id,
                     :evidence_item_id, :provenance_state, :is_synthetic,
                     :generation_run_id, :transformation_note, now())
            """), {**params, "id": str(uuid4())})
    return tuple(prepared)


def persist_analytics(conn: Connection, result: dict) -> dict[str, int]:
    """Persist forecasts, separate emerging-skill outputs, warnings and evidence links."""
    run_id = result["calculation_run_id"]
    forecast_ids: dict[tuple[str, str, int, str], str] = {}
    warning_count = 0
    forecast_count = 0
    emerging_count = 0

    # Create immutable model metadata for each training cutoff actually used.
    for forecast in result["forecast_results"]:
        model_id = None
        if forecast["data_status"] == "SUFFICIENT":
            model = forecast["model"]
            model_id = str(uuid4())
            conn.execute(text("""
                INSERT INTO model_versions
                    (id, name, version, is_baseline, trained_through_period,
                     contract_version, metadata, created_at)
                VALUES
                    (:id, :name, :version, true, :cutoff, :contract_version,
                     CAST(:metadata AS jsonb), now())
                ON CONFLICT (name, version) DO NOTHING
            """), {
                "id": model_id,
                "name": model["name"],
                "version": model["version"],
                "cutoff": int(model["trained_through_period"]),
                "contract_version": result["contract_version"],
                "metadata": json.dumps({"algorithm": "naive_last_value", "validation_available": False}),
            })
            model_id = str(conn.execute(text(
                "SELECT id FROM model_versions WHERE name = :name AND version = :version"
            ), {"name": model["name"], "version": model["version"]}).scalar_one())

        period_year = int(forecast["period"])
        # Only one selected result is active for a district/skill/year/mode.
        conn.execute(text("""
            UPDATE forecast_results SET is_active = false
            WHERE district_id = :district_id AND skill_id = :skill_id
              AND period_type = 'YEAR' AND period_year = :period_year
              AND analysis_mode = :analysis_mode AND is_active = true
        """), {
            "district_id": forecast["district_id"], "skill_id": forecast["skill_id"],
            "period_year": period_year, "analysis_mode": result["analysis_mode"],
        })
        conn.execute(text("""
            UPDATE early_warnings SET is_active = false
            WHERE forecast_result_id IN (
                SELECT id FROM forecast_results
                WHERE district_id = :district_id AND skill_id = :skill_id
                  AND period_type = 'YEAR' AND period_year = :period_year
                  AND analysis_mode = :analysis_mode
            )
        """), {
            "district_id": forecast["district_id"], "skill_id": forecast["skill_id"],
            "period_year": period_year, "analysis_mode": result["analysis_mode"],
        })

        if model_id:
            existing_id = conn.execute(text("""
                SELECT id FROM forecast_results
                WHERE district_id = :district_id AND skill_id = :skill_id
                  AND period_type = 'YEAR' AND period_year = :period_year
                  AND analysis_mode = :analysis_mode
                  AND contract_version = :contract_version
                  AND model_version_id = :model_version_id
                LIMIT 1
            """), {
                "district_id": forecast["district_id"], "skill_id": forecast["skill_id"],
                "period_year": period_year, "analysis_mode": result["analysis_mode"],
                "contract_version": forecast["contract_version"], "model_version_id": model_id,
            }).scalar_one_or_none()
        else:
            existing_id = conn.execute(text("""
                SELECT id FROM forecast_results
                WHERE district_id = :district_id AND skill_id = :skill_id
                  AND period_type = 'YEAR' AND period_year = :period_year
                  AND analysis_mode = :analysis_mode
                  AND contract_version = :contract_version
                  AND model_version_id IS NULL
                LIMIT 1
            """), {
                "district_id": forecast["district_id"], "skill_id": forecast["skill_id"],
                "period_year": period_year, "analysis_mode": result["analysis_mode"],
                "contract_version": forecast["contract_version"],
            }).scalar_one_or_none()

        values = {
            "contract_version": forecast["contract_version"],
            "analysis_mode": result["analysis_mode"],
            "provenance_state": forecast["provenance_state"],
            "district_id": forecast["district_id"],
            "skill_id": forecast["skill_id"],
            "period_type": forecast["period_type"],
            "period_year": period_year,
            "data_status": forecast["data_status"],
            "reason_code": forecast["reason_code"],
            "demand_quantity": forecast["demand_quantity"],
            "supply_quantity": forecast["supply_quantity"],
            "demand_index": forecast["demand_index"],
            "supply_index": forecast["supply_index"],
            "forecast_demand": forecast["forecast_demand"],
            "forecast_supply": forecast["forecast_supply"],
            "gap_eligible": forecast["gap_eligible"],
            "gap_eligibility_reason": forecast["gap_eligibility_reason"],
            "gap": forecast["gap"],
            "status": forecast["status"],
            "forecast_uncertainty": json.dumps(forecast["forecast_uncertainty"]) if forecast["forecast_uncertainty"] is not None else None,
            "confidence_level": forecast["confidence_level"],
            "confidence_inputs": json.dumps(forecast["confidence_inputs"]) if forecast["confidence_inputs"] is not None else None,
            "evidence_coverage": forecast["evidence_coverage"],
            "model_version_id": model_id,
            "calculation_run_id": run_id,
        }
        if existing_id:
            conn.execute(text("""
                UPDATE forecast_results SET
                    contract_version=:contract_version, provenance_state=:provenance_state,
                    data_status=:data_status, reason_code=:reason_code,
                    demand_quantity=:demand_quantity, supply_quantity=:supply_quantity,
                    demand_index=:demand_index, supply_index=:supply_index,
                    forecast_demand=:forecast_demand, forecast_supply=:forecast_supply,
                    gap_eligible=:gap_eligible, gap_eligibility_reason=:gap_eligibility_reason,
                    gap=:gap, status=:status,
                    forecast_uncertainty=CAST(:forecast_uncertainty AS jsonb),
                    confidence_level=:confidence_level,
                    confidence_inputs=CAST(:confidence_inputs AS jsonb),
                    evidence_coverage=:evidence_coverage,
                    model_version_id=:model_version_id,
                    calculation_run_id=:calculation_run_id,
                    is_active=true, calculated_at=now()
                WHERE id=:id
            """), {**values, "id": str(existing_id)})
            forecast_id = str(existing_id)
        else:
            forecast_id = str(uuid4())
            conn.execute(text("""
                INSERT INTO forecast_results
                    (id, contract_version, analysis_mode, provenance_state,
                     district_id, skill_id, period_type, period_year, data_status,
                     reason_code, demand_quantity, supply_quantity, demand_index, supply_index,
                     forecast_demand, forecast_supply, gap_eligible, gap_eligibility_reason,
                     gap, status, forecast_uncertainty, confidence_level, confidence_inputs,
                     evidence_coverage, model_version_id, calculation_run_id, is_active,
                     calculated_at, created_at)
                VALUES
                    (:id, :contract_version, :analysis_mode, :provenance_state,
                     :district_id, :skill_id, :period_type, :period_year, :data_status,
                     :reason_code, :demand_quantity, :supply_quantity, :demand_index, :supply_index,
                     :forecast_demand, :forecast_supply, :gap_eligible, :gap_eligibility_reason,
                     :gap, :status, CAST(:forecast_uncertainty AS jsonb), :confidence_level,
                     CAST(:confidence_inputs AS jsonb), :evidence_coverage, :model_version_id,
                     :calculation_run_id, true, now(), now())
            """), {**values, "id": forecast_id})
        forecast_count += 1
        forecast_ids[(forecast["district_id"], forecast["skill_id"], period_year, result["analysis_mode"])] = forecast_id

        # Evidence references are linked only when the input actually contains a known evidence item.
        for evidence_id in forecast.get("input_evidence_item_ids", []):
            exists = conn.execute(text("""
                SELECT 1 FROM evidence_links
                WHERE evidence_item_id = :evidence_item_id
                  AND forecast_result_id = :forecast_result_id
                  AND emerging_skill_signal_id IS NULL AND early_warning_id IS NULL
                LIMIT 1
            """), {"evidence_item_id": evidence_id, "forecast_result_id": forecast_id}).scalar_one_or_none()
            if not exists:
                conn.execute(text("""
                    INSERT INTO evidence_links
                        (id, evidence_item_id, forecast_result_id, emerging_skill_signal_id,
                         early_warning_id, relation_type, created_at)
                    VALUES (:id, :evidence_item_id, :forecast_result_id, NULL, NULL, 'INPUT', now())
                """), {"id": str(uuid4()), "evidence_item_id": evidence_id, "forecast_result_id": forecast_id})

    # Emerging-skill detection is an independent historical path.
    for signal in result["emerging_skill_signals"]:
        if signal["period_year"] is None:
            continue
        conn.execute(text("""
            UPDATE emerging_skill_signals SET is_active = false
            WHERE district_id = :district_id AND skill_id = :skill_id
              AND period_type = 'YEAR' AND period_year = :period_year
              AND contract_version = :contract_version AND is_active = true
        """), {
            "district_id": signal["district_id"], "skill_id": signal["skill_id"],
            "period_year": signal["period_year"], "contract_version": signal["contract_version"],
        })
        params = {
            "contract_version": signal["contract_version"],
            "district_id": signal["district_id"], "skill_id": signal["skill_id"],
            "period_type": signal["period_type"], "period_year": signal["period_year"],
            "data_status": signal["data_status"],
            "emerging_skill_status": signal["emerging_skill_status"],
            "recent_growth_rate": signal["recent_growth_rate"],
            "historical_growth_rate": signal["historical_growth_rate"],
            "signal_strength": signal["signal_strength"],
            "analysis_mode": signal["analysis_mode"],
            "provenance_state": signal["provenance_state"],
            "history_periods": signal["history_periods"],
            "total_history_periods": signal["total_history_periods"],
            "synthetic_history_periods": signal["synthetic_history_periods"],
            "is_contiguous": signal["is_contiguous"],
            "calculation_run_id": run_id,
        }
        existing = conn.execute(text("""
            SELECT id FROM emerging_skill_signals
            WHERE district_id = :district_id AND skill_id = :skill_id
              AND period_type = :period_type AND period_year = :period_year
              AND contract_version = :contract_version
            LIMIT 1
        """), params).scalar_one_or_none()
        if existing:
            conn.execute(text("""
                UPDATE emerging_skill_signals SET
                    data_status=:data_status, emerging_skill_status=:emerging_skill_status,
                    recent_growth_rate=:recent_growth_rate, historical_growth_rate=:historical_growth_rate,
                    signal_strength=:signal_strength, analysis_mode=:analysis_mode,
                    provenance_state=:provenance_state, history_periods=:history_periods,
                    total_history_periods=:total_history_periods,
                    synthetic_history_periods=:synthetic_history_periods,
                    is_contiguous=:is_contiguous, calculation_run_id=:calculation_run_id,
                    is_active=true, calculated_at=now()
                WHERE id=:id
            """), {**params, "id": str(existing)})
            signal_id = str(existing)
        else:
            signal_id = str(uuid4())
            conn.execute(text("""
                INSERT INTO emerging_skill_signals
                    (id, contract_version, district_id, skill_id, period_type, period_year,
                     data_status, emerging_skill_status, recent_growth_rate, historical_growth_rate,
                     signal_strength, analysis_mode, provenance_state, history_periods,
                     total_history_periods, synthetic_history_periods, is_contiguous,
                     calculation_run_id, is_active, calculated_at, created_at)
                VALUES
                    (:id, :contract_version, :district_id, :skill_id, :period_type, :period_year,
                     :data_status, :emerging_skill_status, :recent_growth_rate, :historical_growth_rate,
                     :signal_strength, :analysis_mode, :provenance_state, :history_periods,
                     :total_history_periods, :synthetic_history_periods, :is_contiguous,
                     :calculation_run_id, true, now(), now())
            """), {**params, "id": signal_id})
        emerging_count += 1

    # Deactivate previous warning records for the forecast keys changed in this run.
    for key, forecast_id in forecast_ids.items():
        conn.execute(text("""
            UPDATE early_warnings SET is_active = false
            WHERE forecast_result_id = :forecast_result_id
        """), {"forecast_result_id": forecast_id})

    for warning in result["early_warnings"]:
        key = (
            warning["district_id"], warning["skill_id"],
            int(warning["forecast_period"]), result["analysis_mode"],
        )
        forecast_id = forecast_ids.get(key)
        if not forecast_id:
            continue
        existing = conn.execute(text("""
            SELECT id FROM early_warnings
            WHERE forecast_result_id = :forecast_result_id
              AND warning_type = :warning_type
              AND detected_period = :detected_period
            LIMIT 1
        """), {
            "forecast_result_id": forecast_id,
            "warning_type": warning["warning_type"],
            "detected_period": warning["detected_period"],
        }).scalar_one_or_none()
        params = {
            "forecast_result_id": forecast_id,
            "warning_type": warning["warning_type"],
            "severity": warning["severity"],
            "detected_period": warning["detected_period"],
            "explanation_code": warning["explanation_code"],
            "calculation_run_id": run_id,
        }
        if existing:
            conn.execute(text("""
                UPDATE early_warnings SET severity=:severity,
                    explanation_code=:explanation_code,
                    calculation_run_id=:calculation_run_id, is_active=true
                WHERE id=:id
            """), {**params, "id": str(existing)})
            warning_id = str(existing)
        else:
            warning_id = str(uuid4())
            conn.execute(text("""
                INSERT INTO early_warnings
                    (id, forecast_result_id, emerging_skill_signal_id, warning_type, severity,
                     detected_period, explanation_code, calculation_run_id, is_active, created_at)
                VALUES
                    (:id, :forecast_result_id, NULL, :warning_type, :severity,
                     :detected_period, :explanation_code, :calculation_run_id, true, now())
            """), {**params, "id": warning_id})
        warning_count += 1

        # Reuse forecast evidence as warning evidence; no new evidence is invented.
        forecast = next((
            f for f in result["forecast_results"]
            if f["district_id"] == warning["district_id"]
            and f["skill_id"] == warning["skill_id"]
            and f["period"] == warning["forecast_period"]
        ), None)
        if forecast:
            for evidence_id in forecast.get("input_evidence_item_ids", []):
                exists = conn.execute(text("""
                    SELECT 1 FROM evidence_links
                    WHERE evidence_item_id = :evidence_item_id
                      AND early_warning_id = :early_warning_id
                    LIMIT 1
                """), {"evidence_item_id": evidence_id, "early_warning_id": warning_id}).scalar_one_or_none()
                if not exists:
                    conn.execute(text("""
                        INSERT INTO evidence_links
                            (id, evidence_item_id, forecast_result_id, emerging_skill_signal_id,
                             early_warning_id, relation_type, created_at)
                        VALUES (:id, :evidence_item_id, NULL, NULL, :early_warning_id, 'INPUT', now())
                    """), {"id": str(uuid4()), "evidence_item_id": evidence_id, "early_warning_id": warning_id})

    return {
        "forecast_results": forecast_count,
        "emerging_skill_signals": emerging_count,
        "early_warnings": warning_count,
    }
