"""Guarded, idempotent persistence for validated SHRAMIK pipeline outputs.

All writes must run inside a caller-owned SQLAlchemy transaction. The CLI adds a second
non-production-only write guard; this repository module deliberately does not create a
connection or commit transactions itself.
"""
from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text

from app.ingestion.canonical_csv import CanonicalObservation, ParsedBatch


class RepositoryValidationError(ValueError):
    """Raised when canonical records lack valid references or provenance."""


def _first(session, statement: str, params: dict[str, Any] | None = None) -> dict | None:
    row = session.execute(text(statement), params or {}).mappings().first()
    return dict(row) if row is not None else None


def _execute(session, statement: str, params: dict[str, Any] | None = None):
    return session.execute(text(statement), params or {})


def _uuid(value: str | None, field: str, *, required: bool = False) -> UUID | None:
    if value is None or value == "":
        if required:
            raise RepositoryValidationError(f"{field} is required for persistence.")
        return None
    try:
        return UUID(str(value))
    except (ValueError, TypeError, AttributeError) as exc:
        raise RepositoryValidationError(f"{field} must be a valid UUID.") from exc


def _json(value: Any) -> str | None:
    if value is None:
        return None
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False, default=str)


def _register_synthetic_runs(
    session,
    observations: list[CanonicalObservation],
    *,
    default_generation_run_id: str | None,
    input_hashes: dict[str, str],
) -> int:
    synthetic_runs = {
        row.generation_run_id
        for row in observations
        if row.provenance_state == "SYNTHETIC_DEMO"
    }
    inserted = 0
    for run_id_str in sorted(run for run in synthetic_runs if run):
        run_id = _uuid(run_id_str, "generation_run_id", required=True)
        existing = _first(
            session,
            "SELECT id FROM public.synthetic_generation_runs WHERE id = :id",
            {"id": run_id},
        )
        if existing:
            continue
        if default_generation_run_id is None or str(run_id) != str(default_generation_run_id):
            raise RepositoryValidationError(
                f"Synthetic generation run {run_id} is not registered. "
                "Only this import's deterministic run ID may be registered automatically."
            )
        seed_text = (input_hashes.get("demand", "") + input_hashes.get("supply", ""))[:15]
        try:
            seed = int(seed_text, 16)
        except ValueError:
            seed = 1
        params = {
            "adapter": "canonical_csv_import",
            "adapter_version": "v1",
            "input_sha256": input_hashes,
            "idempotency": "generation run ID derived from both input file hashes",
        }
        _execute(
            session,
            """
            INSERT INTO public.synthetic_generation_runs
                (id, generator_name, generator_version, random_seed, parameters, source_context)
            VALUES
                (:id, :generator_name, :generator_version, :random_seed,
                 CAST(:parameters AS jsonb), :source_context)
            """,
            {
                "id": run_id,
                "generator_name": "canonical_csv_import",
                "generator_version": "v1",
                "random_seed": seed,
                "parameters": _json(params),
                "source_context": "Imported DEMO observations; not official source data.",
            },
        )
        inserted += 1
    return inserted


def _validate_references(
    session,
    observations: list[CanonicalObservation],
    *,
    default_generation_run_id: str | None,
) -> dict[str, datetime]:
    """Validate every reference before observation or forecast writes."""
    states: dict[str, dict] = {}
    districts: dict[str, dict] = {}
    sectors: dict[str, dict] = {}
    skills: dict[str, dict] = {}
    sources: dict[UUID, bool] = {}
    retrievals: dict[UUID, dict] = {}
    evidence: dict[UUID, dict] = {}
    capabilities_checked: set[tuple] = set()
    retrieval_dates: dict[str, datetime] = {}

    for row in observations:
        state = states.get(row.state_id)
        if state is None:
            state = _first(
                session,
                "SELECT id, code FROM public.states WHERE id = :state_id",
                {"state_id": row.state_id},
            )
            if state is None:
                raise RepositoryValidationError(f"Unknown state_id {row.state_id!r}.")
            states[row.state_id] = state

        if row.district_id:
            district = districts.get(row.district_id)
            if district is None:
                district = _first(
                    session,
                    "SELECT id, state_id FROM public.districts WHERE id = :district_id",
                    {"district_id": row.district_id},
                )
                if district is None:
                    raise RepositoryValidationError(f"Unknown district_id {row.district_id!r}.")
                districts[row.district_id] = district
            if district["state_id"] != row.state_id:
                raise RepositoryValidationError(
                    f"District {row.district_id!r} does not belong to state {row.state_id!r}."
                )

        if row.sector_id:
            sector = sectors.get(row.sector_id)
            if sector is None:
                sector = _first(
                    session,
                    "SELECT id FROM public.sectors WHERE id = :sector_id",
                    {"sector_id": row.sector_id},
                )
                if sector is None:
                    raise RepositoryValidationError(f"Unknown sector_id {row.sector_id!r}.")
                sectors[row.sector_id] = sector

        if row.skill_id:
            skill = skills.get(row.skill_id)
            if skill is None:
                skill = _first(
                    session,
                    "SELECT id, sector_id FROM public.skills WHERE id = :skill_id",
                    {"skill_id": row.skill_id},
                )
                if skill is None:
                    raise RepositoryValidationError(f"Unknown skill_id {row.skill_id!r}.")
                skills[row.skill_id] = skill
            if row.sector_id and skill["sector_id"] != row.sector_id:
                raise RepositoryValidationError(
                    f"Skill {row.skill_id!r} is not mapped to sector {row.sector_id!r}."
                )

        if row.provenance_state == "SYNTHETIC_DEMO":
            run_id = _uuid(row.generation_run_id, "generation_run_id", required=True)
            if not row.is_synthetic or row.source_id or row.retrieval_id or row.evidence_item_id:
                raise RepositoryValidationError(
                    "SYNTHETIC_DEMO rows must be synthetic and cannot claim source/retrieval/evidence IDs."
                )
            existing_run = _first(
                session,
                "SELECT id FROM public.synthetic_generation_runs WHERE id = :id",
                {"id": run_id},
            )
            if not existing_run and str(run_id) != str(default_generation_run_id):
                raise RepositoryValidationError(
                    f"Unknown synthetic_generation_run_id {run_id}; register the run before importing."
                )
            continue

        if row.provenance_state != "SOURCE_BACKED" or row.is_synthetic:
            raise RepositoryValidationError("Observation provenance flags are inconsistent.")

        source_id = _uuid(row.source_id, "source_id", required=True)
        if source_id not in sources:
            sources[source_id] = _first(
                session,
                "SELECT id FROM public.data_sources WHERE id = :id",
                {"id": source_id},
            ) is not None
        if not sources[source_id]:
            raise RepositoryValidationError(f"Unknown source_id {source_id}.")

        retrieval_id = _uuid(row.retrieval_id, "retrieval_id", required=True)
        retrieval = retrievals.get(retrieval_id)
        if retrieval is None:
            retrieval = _first(
                session,
                """
                SELECT id, source_id, retrieval_status, retrieved_at
                FROM public.source_retrievals
                WHERE id = :id
                """,
                {"id": retrieval_id},
            )
            if retrieval is None:
                raise RepositoryValidationError(f"Unknown retrieval_id {retrieval_id}.")
            retrievals[retrieval_id] = retrieval
        if retrieval["source_id"] != source_id:
            raise RepositoryValidationError(
                f"retrieval_id {retrieval_id} belongs to a different source than {source_id}."
            )
        if retrieval["retrieval_status"] != "SUCCESS":
            raise RepositoryValidationError(
                f"retrieval_id {retrieval_id} must have SUCCESS status before canonical ingestion."
            )
        if retrieval.get("retrieved_at") is not None:
            retrieval_dates[str(retrieval_id)] = retrieval["retrieved_at"]

        capability_key = (
            source_id, row.observation_grain, row.signal_type, row.unit,
            row.flow_stock_semantics, row.state_id, state.get("code"),
        )
        if capability_key not in capabilities_checked:
            capability = _first(
                session,
                """
                SELECT c.id
                FROM public.source_capabilities AS c
                WHERE c.source_id = :source_id
                  AND c.observation_grain = :observation_grain
                  AND c.signal_type = :signal_type
                  AND c.unit = :unit
                  AND lower(coalesce(c.flow_stock_semantics, '')) = lower(coalesce(:flow_stock_semantics, ''))
                  AND (
                       c.state_scope IS NULL
                       OR upper(c.state_scope) = 'NATIONAL'
                       OR upper(c.state_scope) = upper(:state_code)
                       OR upper(c.state_scope) = upper(:state_id)
                  )
                LIMIT 1
                """,
                {
                    "source_id": source_id,
                    "observation_grain": row.observation_grain,
                    "signal_type": row.signal_type,
                    "unit": row.unit,
                    "flow_stock_semantics": row.flow_stock_semantics,
                    "state_code": state.get("code") or "",
                    "state_id": row.state_id,
                },
            )
            if capability is None:
                raise RepositoryValidationError(
                    f"No registered source capability matches source={source_id}, "
                    f"signal={row.signal_type!r}, grain={row.observation_grain}, "
                    f"unit={row.unit!r}, semantics={row.flow_stock_semantics!r}, "
                    f"state={row.state_id!r}."
                )
            capabilities_checked.add(capability_key)

        if row.evidence_item_id:
            evidence_id = _uuid(row.evidence_item_id, "evidence_item_id", required=True)
            item = evidence.get(evidence_id)
            if item is None:
                item = _first(
                    session,
                    "SELECT id, source_id FROM public.evidence_items WHERE id = :id",
                    {"id": evidence_id},
                )
                if item is None:
                    raise RepositoryValidationError(f"Unknown evidence_item_id {evidence_id}.")
                evidence[evidence_id] = item
            if item["source_id"] != source_id:
                raise RepositoryValidationError(
                    f"Evidence item {evidence_id} belongs to a different source than {source_id}."
                )

    return retrieval_dates


def _observation_values(
    row: CanonicalObservation,
    retrieval_dates: dict[str, datetime],
) -> dict[str, Any]:
    values = row.db_values()
    values["id"] = uuid4()
    if row.provenance_state == "SOURCE_BACKED":
        values["source_id"] = _uuid(row.source_id, "source_id", required=True)
        values["retrieval_id"] = _uuid(row.retrieval_id, "retrieval_id", required=True)
        values["evidence_item_id"] = _uuid(row.evidence_item_id, "evidence_item_id")
        if row.source_date is None:
            retrieved_at = retrieval_dates.get(str(values["retrieval_id"]))
            values["source_date"] = retrieved_at.date() if retrieved_at is not None else None
        values["generation_run_id"] = None
    else:
        values["source_id"] = None
        values["retrieval_id"] = None
        values["evidence_item_id"] = None
        values["source_release"] = None
        values["generation_run_id"] = _uuid(
            row.generation_run_id, "generation_run_id", required=True
        )
    values["signal_type"] = row.signal_type
    return values


def _upsert_observation(session, row: CanonicalObservation, values: dict[str, Any]) -> str:
    table = "demand_observations" if row.kind == "demand" else "supply_observations"
    signal_column = "demand_signal_type" if row.kind == "demand" else "supply_signal_type"
    lock_key = "|".join((
        table, row.provenance_state, row.state_id, row.district_id or "",
        row.sector_id or "", row.skill_id or "", row.observation_grain,
        row.period_type, str(row.period_year), row.source_id or row.generation_run_id or "",
        row.source_release or "", row.signal_type,
    ))
    _execute(
        session,
        "SELECT pg_advisory_xact_lock(hashtextextended(:lock_key, 0))",
        {"lock_key": lock_key},
    )
    if row.provenance_state == "SOURCE_BACKED":
        logical_where = f"""
            state_id = :state_id
            AND district_id IS NOT DISTINCT FROM :district_id
            AND sector_id IS NOT DISTINCT FROM :sector_id
            AND skill_id IS NOT DISTINCT FROM :skill_id
            AND observation_grain = :observation_grain
            AND period_type = :period_type AND period_year = :period_year
            AND source_id = :source_id
            AND source_release IS NOT DISTINCT FROM :source_release
            AND provenance_state = 'SOURCE_BACKED'
            AND {signal_column} = :signal_type
        """
    else:
        logical_where = f"""
            state_id = :state_id
            AND district_id IS NOT DISTINCT FROM :district_id
            AND sector_id IS NOT DISTINCT FROM :sector_id
            AND skill_id IS NOT DISTINCT FROM :skill_id
            AND observation_grain = :observation_grain
            AND period_type = :period_type AND period_year = :period_year
            AND generation_run_id = :generation_run_id
            AND provenance_state = 'SYNTHETIC_DEMO'
            AND {signal_column} = :signal_type
        """
    existing = _first(
        session,
        f"SELECT id FROM public.{table} WHERE {logical_where} FOR UPDATE",
        values,
    )

    if row.kind == "demand":
        columns = [
            "id", "state_id", "district_id", "sector_id", "skill_id", "observation_grain",
            "period_type", "period_year", "demand_quantity", "quantity_unit",
            "quantity_semantics", "demand_signal_type", "source_id", "source_release",
            "source_date", "retrieval_id", "evidence_item_id", "provenance_state",
            "is_synthetic", "generation_run_id", "transformation_note",
        ]
    else:
        columns = [
            "id", "state_id", "district_id", "sector_id", "skill_id", "observation_grain",
            "period_type", "period_year", "supply_quantity", "training_capacity",
            "enrollment", "completions", "quantity_unit", "quantity_semantics",
            "supply_signal_type", "source_id", "source_release", "source_date",
            "retrieval_id", "evidence_item_id", "provenance_state", "is_synthetic",
            "generation_run_id", "transformation_note",
        ]

    update_columns = [column for column in columns if column != "id"]
    if existing:
        update_sql = ", ".join(f"{column} = :{column}" for column in update_columns)
        update_values = {key: values.get(key) for key in update_columns}
        update_values["existing_id"] = existing["id"]
        _execute(
            session,
            f"UPDATE public.{table} SET {update_sql} WHERE id = :existing_id",
            update_values,
        )
        return "updated"

    insert_values = {column: values.get(column) for column in columns}
    placeholders = ", ".join(f":{column}" for column in columns)
    _execute(
        session,
        f"INSERT INTO public.{table} ({', '.join(columns)}) VALUES ({placeholders})",
        insert_values,
    )
    return "inserted"


def _persist_model_version(session, model: dict[str, Any]) -> UUID:
    model_id = uuid4()
    version = str(model["version"])
    cutoff = int(model["trained_through_period"])
    metadata = {
        "algorithm": "naive_last_value",
        "is_baseline": True,
        "cutoff_is_immutable": True,
    }
    _execute(
        session,
        """
        INSERT INTO public.model_versions
            (id, name, version, is_baseline, trained_through_period, contract_version, metadata)
        VALUES
            (:id, :name, :version, true, :trained_through_period, '1.1', CAST(:metadata AS jsonb))
        ON CONFLICT (name, version) DO NOTHING
        """,
        {
            "id": model_id,
            "name": str(model["name"]),
            "version": version,
            "trained_through_period": cutoff,
            "metadata": _json(metadata),
        },
    )
    existing = _first(
        session,
        """
        SELECT id, trained_through_period, contract_version, is_baseline
        FROM public.model_versions
        WHERE name = :name AND version = :version
        """,
        {"name": str(model["name"]), "version": version},
    )
    if existing is None:
        raise RepositoryValidationError("Could not resolve persisted model version.")
    if (
        int(existing["trained_through_period"]) != cutoff
        or existing["contract_version"] != "1.1"
        or existing["is_baseline"] is not True
    ):
        raise RepositoryValidationError(
            f"Persisted model version {model['name']}/{version} conflicts with immutable metadata."
        )
    return existing["id"]


def _forecast_values(
    record: dict[str, Any], model_id: UUID | None, calculation_run_id: UUID
) -> dict[str, Any]:
    try:
        year = int(record["period"])
    except (TypeError, ValueError) as exc:
        raise RepositoryValidationError(
            "Every persisted forecast/insufficient-data record must have a resolved target period."
        ) from exc

    def nullable_number(key: str):
        value = record.get(key)
        return Decimal(str(value)) if value is not None else None

    return {
        "id": uuid4(),
        "contract_version": str(record.get("contract_version", "1.1")),
        "analysis_mode": record["analysis_mode"],
        "provenance_state": record["provenance_state"],
        "district_id": record["district_id"],
        "skill_id": record["skill_id"],
        "period_type": "YEAR",
        "period_year": year,
        "data_status": record["data_status"],
        "reason_code": record.get("reason_code"),
        "demand_quantity": nullable_number("demand_quantity"),
        "supply_quantity": nullable_number("supply_quantity"),
        "demand_index": nullable_number("demand_index"),
        "supply_index": nullable_number("supply_index"),
        "forecast_demand": nullable_number("forecast_demand"),
        "forecast_supply": nullable_number("forecast_supply"),
        "demand_unit": record.get("demand_unit"),
        "supply_unit": record.get("supply_unit"),
        "demand_temporal_semantics": record.get("demand_temporal_semantics"),
        "supply_temporal_semantics": record.get("supply_temporal_semantics"),
        "gap_eligible": record.get("gap_eligible"),
        "gap_eligibility_reason": record.get("gap_eligibility_reason"),
        "gap": nullable_number("gap"),
        "status": record.get("status"),
        "forecast_uncertainty": _json(record.get("forecast_uncertainty")),
        "confidence_level": record.get("confidence_level"),
        "confidence_inputs": _json(record.get("confidence_inputs")),
        "evidence_coverage": nullable_number("evidence_coverage"),
        "model_version_id": model_id,
        "calculation_run_id": calculation_run_id,
        "is_active": True,
    }


def _upsert_forecast(session, values: dict[str, Any]) -> tuple[str, UUID]:
    lock_key = "|".join((
        "forecast", values["district_id"], values["skill_id"],
        str(values["period_year"]), values["analysis_mode"],
    ))
    _execute(
        session,
        "SELECT pg_advisory_xact_lock(hashtextextended(:lock_key, 0))",
        {"lock_key": lock_key},
    )
    common = {
        "district_id": values["district_id"],
        "skill_id": values["skill_id"],
        "period_type": values["period_type"],
        "period_year": values["period_year"],
        "analysis_mode": values["analysis_mode"],
    }
    _execute(
        session,
        """
        UPDATE public.forecast_results
        SET is_active = false
        WHERE district_id = :district_id AND skill_id = :skill_id
          AND period_type = :period_type AND period_year = :period_year
          AND analysis_mode = :analysis_mode AND is_active = true
        """,
        common,
    )
    existing = _first(
        session,
        """
        SELECT id
        FROM public.forecast_results
        WHERE district_id = :district_id AND skill_id = :skill_id
          AND period_type = :period_type AND period_year = :period_year
          AND analysis_mode = :analysis_mode
          AND contract_version = :contract_version
          AND model_version_id IS NOT DISTINCT FROM :model_version_id
        FOR UPDATE
        """,
        {
            **common,
            "contract_version": values["contract_version"],
            "model_version_id": values["model_version_id"],
        },
    )
    json_fields = {"forecast_uncertainty", "confidence_inputs"}
    if existing:
        row_id = existing["id"]
        update_columns = [key for key in values if key not in {"id", "created_at"}]
        params = {key: values.get(key) for key in update_columns}
        params["existing_id"] = row_id
        assignments = [
            f"{key} = CAST(:{key} AS jsonb)" if key in json_fields else f"{key} = :{key}"
            for key in update_columns
        ]
        _execute(
            session,
            f"UPDATE public.forecast_results SET {', '.join(assignments)}, calculated_at = now() WHERE id = :existing_id",
            params,
        )
        return "updated", row_id

    columns = list(values.keys())
    placeholders = [
        f"CAST(:{key} AS jsonb)" if key in json_fields else f":{key}"
        for key in columns
    ]
    _execute(
        session,
        f"INSERT INTO public.forecast_results ({', '.join(columns)}) VALUES ({', '.join(placeholders)})",
        values,
    )
    return "inserted", values["id"]


def _link_evidence(
    session,
    *,
    evidence_ids: set[UUID],
    forecast_result_id: UUID,
) -> int:
    inserted = 0
    for evidence_id in sorted(evidence_ids, key=str):
        existing = _first(
            session,
            """
            SELECT id FROM public.evidence_links
            WHERE evidence_item_id = :evidence_item_id
              AND forecast_result_id = :forecast_result_id
              AND relation_type = 'INPUT'
            """,
            {"evidence_item_id": evidence_id, "forecast_result_id": forecast_result_id},
        )
        if existing:
            continue
        _execute(
            session,
            """
            INSERT INTO public.evidence_links
                (id, evidence_item_id, forecast_result_id, emerging_skill_signal_id,
                 early_warning_id, relation_type)
            VALUES (:id, :evidence_item_id, :forecast_result_id, NULL, NULL, 'INPUT')
            """,
            {
                "id": uuid4(),
                "evidence_item_id": evidence_id,
                "forecast_result_id": forecast_result_id,
            },
        )
        inserted += 1
    return inserted


def persist_pipeline(
    session,
    demand_batch: ParsedBatch,
    supply_batch: ParsedBatch,
    analytics: dict[str, Any],
    *,
    demand_signal_type: str,
    supply_signal_type: str,
    default_generation_run_id: str | None,
    input_hashes: dict[str, str],
) -> dict[str, int]:
    """Persist observations and outputs within a caller-owned transaction."""
    if not demand_batch.valid or not supply_batch.valid:
        raise RepositoryValidationError("Both canonical CSV batches must pass validation before persistence.")
    if demand_batch.kind != "demand" or supply_batch.kind != "supply":
        raise RepositoryValidationError("Demand and supply batches are swapped or mislabeled.")

    observations = list(demand_batch.observations) + list(supply_batch.observations)
    generation_runs_inserted = _register_synthetic_runs(
        session,
        observations,
        default_generation_run_id=default_generation_run_id,
        input_hashes=input_hashes,
    )
    retrieval_dates = _validate_references(
        session,
        observations,
        default_generation_run_id=default_generation_run_id,
    )

    obs_inserted = 0
    obs_updated = 0
    for row in observations:
        values = _observation_values(row, retrieval_dates)
        result = _upsert_observation(session, row, values)
        if result == "inserted":
            obs_inserted += 1
        else:
            obs_updated += 1

    sufficient_records = [
        record for record in analytics.get("results", [])
        if record.get("data_status") == "SUFFICIENT"
    ]
    model_ids: dict[tuple[str, str, int], UUID] = {}
    for record in sufficient_records:
        model = record.get("model")
        if not model:
            raise RepositoryValidationError("A SUFFICIENT forecast is missing model metadata.")
        cutoff = int(model["trained_through_period"])
        model_key = (str(model["name"]), str(model["version"]), cutoff)
        if model_key not in model_ids:
            model_ids[model_key] = _persist_model_version(session, model)

    calculation_run_id = uuid4()
    forecast_inserted = 0
    forecast_updated = 0
    evidence_links_inserted = 0
    for record in analytics.get("results", []):
        model_id = None
        if record.get("data_status") == "SUFFICIENT":
            model = record["model"]
            model_id = model_ids[(str(model["name"]), str(model["version"]), int(model["trained_through_period"]))]
        values = _forecast_values(record, model_id, calculation_run_id)
        action, forecast_id = _upsert_forecast(session, values)
        if action == "inserted":
            forecast_inserted += 1
        else:
            forecast_updated += 1

        target = (
            record.get("district_id") or "",
            record.get("sector_id") or "",
            record.get("skill_id") or "",
        )
        related_evidence: set[UUID] = set()
        for row in observations:
            if row.signal_type not in {demand_signal_type, supply_signal_type}:
                continue
            if (
                (row.district_id or "") == target[0]
                and (row.sector_id or "") == target[1]
                and (row.skill_id or "") == target[2]
                and row.evidence_item_id
            ):
                related_evidence.add(_uuid(row.evidence_item_id, "evidence_item_id", required=True))
        evidence_links_inserted += _link_evidence(
            session, evidence_ids=related_evidence, forecast_result_id=forecast_id
        )

    return {
        "generation_runs_inserted": generation_runs_inserted,
        "observations_inserted": obs_inserted,
        "observations_updated": obs_updated,
        "model_versions_resolved": len(model_ids),
        "forecasts_inserted": forecast_inserted,
        "forecasts_updated": forecast_updated,
        "evidence_links_inserted": evidence_links_inserted,
        "calculation_run_id_generated": 1 if analytics.get("results") else 0,
    }
