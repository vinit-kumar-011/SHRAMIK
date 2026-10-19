"""Schema-aligned, provenance-aware persistence for canonical observations.

The repository accepts a caller-owned SQLAlchemy Session. It validates all
references before writing, performs inserts inside a transaction/savepoint, and
never overwrites a conflicting observation. Set write=False for a database-backed
validation/dry run.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Mapping
from uuid import UUID

from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.ingestion.canonical_csv import CanonicalObservation, ParsedBatch


class IngestionValidationError(ValueError):
    """The batch does not match the live canonical schema or its references."""


class IngestionConflictError(IngestionValidationError):
    """A natural observation key already exists with different content."""


@dataclass(frozen=True)
class SyntheticRunSpec:
    """Auditable metadata required to register a new synthetic generation run."""

    generator_name: str
    generator_version: str
    random_seed: int
    parameters: Mapping[str, Any]
    source_context: str | None = None


@dataclass(frozen=True)
class IngestionResult:
    kind: str
    rows_received: int
    rows_inserted: int
    rows_unchanged: int
    rows_would_insert: int
    generation_runs_created: int
    generation_runs_would_create: int
    dry_run: bool

    def as_dict(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "rows_received": self.rows_received,
            "rows_inserted": self.rows_inserted,
            "rows_unchanged": self.rows_unchanged,
            "rows_would_insert": self.rows_would_insert,
            "generation_runs_created": self.generation_runs_created,
            "generation_runs_would_create": self.generation_runs_would_create,
            "dry_run": self.dry_run,
        }


def _select_in(
    session: Session,
    sql: str,
    parameter: str,
    values: list[str],
) -> list[dict[str, Any]]:
    if not values:
        return []
    statement = text(sql).bindparams(bindparam(parameter, expanding=True))
    return [dict(row) for row in session.execute(statement, {parameter: values}).mappings()]


def _id(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, UUID):
        return str(value)
    return str(value)


def _db_value(value: Any) -> Any:
    """Use portable scalar parameters; PostgreSQL assigns target column types."""
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


def _comparison_value(value: Any) -> Any:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, (Decimal, int, float)) and not isinstance(value, bool):
        return Decimal(str(value))
    return value


def _normalise_payload(values: Mapping[str, Any]) -> dict[str, Any]:
    return {key: _db_value(value) for key, value in values.items()}


def _payload_matches(existing: Mapping[str, Any], observation: CanonicalObservation) -> bool:
    expected = observation.db_values()
    return all(
        _comparison_value(existing.get(key)) == _comparison_value(value)
        for key, value in expected.items()
    )


def _identity_key(kind: str, row: Mapping[str, Any]) -> tuple[Any, ...]:
    signal_column = "demand_signal_type" if kind == "demand" else "supply_signal_type"
    dimensions = (
        row.get("state_id"),
        row.get("district_id"),
        row.get("sector_id"),
        row.get("skill_id"),
        row.get("observation_grain"),
        row.get("period_type"),
        int(row.get("period_year")),
    )
    if row.get("provenance_state") == "SOURCE_BACKED":
        return (*dimensions, _id(row.get("source_id")), row.get("source_release"), row.get(signal_column))
    return (*dimensions, _id(row.get("generation_run_id")), row.get(signal_column))


def _observation_identity(kind: str, observation: CanonicalObservation) -> tuple[Any, ...]:
    values = observation.db_values()
    values["provenance_state"] = observation.provenance_state
    values["source_id"] = _id(values.get("source_id"))
    values["generation_run_id"] = _id(values.get("generation_run_id"))
    return _identity_key(kind, values)


def _validate_shape(batch: ParsedBatch) -> None:
    if batch.kind not in {"demand", "supply"}:
        raise IngestionValidationError("batch kind must be demand or supply")
    if not batch.valid:
        details = "; ".join(str(issue) for issue in batch.issues[:12])
        if len(batch.issues) > 12:
            details += f"; and {len(batch.issues) - 12} more issue(s)"
        raise IngestionValidationError(f"{batch.kind} batch failed canonical validation: {details}")
    issues: list[str] = []
    for idx, row in enumerate(batch.observations, start=2):
        prefix = f"row {idx}"
        if row.kind != batch.kind:
            issues.append(f"{prefix}: observation kind does not match its batch")
        if row.period_type != "YEAR" or not 1900 <= row.period_year <= 2200:
            issues.append(f"{prefix}: period must be YEAR between 1900 and 2200")
        allowed = {"FLOW", "STOCK"} if row.kind == "demand" else {"FLOW", "STOCK", "CAPACITY"}
        if row.quantity_semantics not in allowed:
            issues.append(f"{prefix}: invalid quantity_semantics {row.quantity_semantics!r}")
        if not row.unit.strip() or not (row.flow_stock_semantics or "").strip():
            issues.append(f"{prefix}: unit and flow_stock_semantics are both required")
        if row.provenance_state not in {"SOURCE_BACKED", "SYNTHETIC_DEMO"}:
            issues.append(f"{prefix}: invalid provenance_state")
        if row.is_synthetic != (row.provenance_state == "SYNTHETIC_DEMO"):
            issues.append(f"{prefix}: is_synthetic and provenance_state disagree")
        grain = row.observation_grain
        if not row.state_id:
            issues.append(f"{prefix}: state_id is required")
        for field, present, required in (
            ("district_id", row.district_id, grain.startswith("DISTRICT")),
            ("sector_id", row.sector_id, "SECTOR" in grain),
            ("skill_id", row.skill_id, "SKILL" in grain),
        ):
            if required and not present:
                issues.append(f"{prefix}: {field} is required for {grain}")
            elif not required and present:
                issues.append(f"{prefix}: {field} must be empty for {grain}")
        if row.is_synthetic:
            if row.source_id or row.retrieval_id or row.evidence_item_id:
                issues.append(f"{prefix}: synthetic rows cannot reference source, retrieval, or evidence IDs")
            if not row.generation_run_id or not row.transformation_note:
                issues.append(f"{prefix}: synthetic rows require generation_run_id and transformation_note")
        else:
            if not row.source_id:
                issues.append(f"{prefix}: source-backed row requires source_id")
            if row.generation_run_id:
                issues.append(f"{prefix}: source-backed rows cannot reference generation_run_id")
        if row.kind == "demand":
            if row.value is None or row.training_capacity is not None or row.enrollment is not None or row.completions is not None:
                issues.append(f"{prefix}: demand row must contain demand_quantity only")
            if row.quantity_semantics not in {"FLOW", "STOCK"}:
                issues.append(f"{prefix}: demand quantity semantics must be FLOW or STOCK")
        else:
            measures = [row.value, row.training_capacity, row.enrollment, row.completions]
            if sum(value is not None for value in measures) != 1:
                issues.append(f"{prefix}: exactly one supply/training measure must be populated")
            if row.value is not None and row.quantity_semantics not in {"FLOW", "STOCK"}:
                issues.append(f"{prefix}: supply_quantity requires FLOW or STOCK semantics")
            if row.training_capacity is not None and row.quantity_semantics != "CAPACITY":
                issues.append(f"{prefix}: training_capacity requires CAPACITY semantics")
            if (row.enrollment is not None or row.completions is not None) and row.quantity_semantics != "FLOW":
                issues.append(f"{prefix}: enrollment/completions require FLOW semantics")
    if issues:
        raise IngestionValidationError("batch failed database-bound validation:\n- " + "\n- ".join(issues))


def _run_capabilities(rows: list[CanonicalObservation]) -> dict[str, dict[str, dict[str, str | None]]]:
    collected: dict[str, dict[str, dict[str, str | None]]] = {"demand": {}, "supply": {}}
    for row in rows:
        current = {
            "unit": row.unit,
            "flow_stock_semantics": row.flow_stock_semantics,
            "quantity_semantics": row.quantity_semantics,
        }
        prior = collected[row.kind].get(row.signal_type)
        if prior and prior != current:
            raise IngestionValidationError(
                f"synthetic generation run declares conflicting capabilities for {row.kind} "
                f"signal {row.signal_type!r}"
            )
        collected[row.kind][row.signal_type] = current
    return collected


def _effective_parameters(
    spec: SyntheticRunSpec, rows: list[CanonicalObservation]
) -> dict[str, Any]:
    if not spec.generator_name.strip() or not spec.generator_version.strip():
        raise IngestionValidationError("synthetic run generator_name and generator_version are required")
    if isinstance(spec.random_seed, bool) or not isinstance(spec.random_seed, int):
        raise IngestionValidationError("synthetic run random_seed must be an integer")
    parameters = dict(spec.parameters)
    capabilities = _run_capabilities(rows)
    existing = parameters.get("synthetic_capabilities")
    if existing is not None and existing != capabilities:
        raise IngestionValidationError(
            "synthetic run parameters.synthetic_capabilities must match imported rows"
        )
    parameters["synthetic_capabilities"] = capabilities
    try:
        json.dumps(parameters, ensure_ascii=False, sort_keys=True)
    except (TypeError, ValueError) as exc:
        raise IngestionValidationError("synthetic run parameters must be JSON-serializable") from exc
    return parameters


def _load_references(
    session: Session, rows: list[CanonicalObservation]
) -> dict[str, Any]:
    unique = lambda values: sorted({str(v) for v in values if v is not None})
    state_ids = unique(row.state_id for row in rows)
    district_ids = unique(row.district_id for row in rows)
    sector_ids = unique(row.sector_id for row in rows)
    skill_ids = unique(row.skill_id for row in rows)
    source_ids = unique(row.source_id for row in rows if not row.is_synthetic)
    retrieval_ids = unique(row.retrieval_id for row in rows if not row.is_synthetic)
    evidence_ids = unique(row.evidence_item_id for row in rows if not row.is_synthetic)
    run_ids = unique(row.generation_run_id for row in rows if row.is_synthetic)

    states = _select_in(session, "SELECT id FROM public.states WHERE id IN :ids", "ids", state_ids)
    districts = _select_in(session, "SELECT id, state_id FROM public.districts WHERE id IN :ids", "ids", district_ids)
    sectors = _select_in(session, "SELECT id FROM public.sectors WHERE id IN :ids", "ids", sector_ids)
    skills = _select_in(session, "SELECT id, sector_id FROM public.skills WHERE id IN :ids", "ids", skill_ids)
    sources = _select_in(session, "SELECT CAST(id AS TEXT) AS id FROM public.data_sources WHERE CAST(id AS TEXT) IN :ids", "ids", source_ids)
    retrievals = _select_in(
        session,
        "SELECT CAST(id AS TEXT) AS id, CAST(source_id AS TEXT) AS source_id, retrieval_status FROM public.source_retrievals WHERE CAST(id AS TEXT) IN :ids",
        "ids",
        retrieval_ids,
    )
    evidence = _select_in(
        session,
        "SELECT CAST(id AS TEXT) AS id, CAST(source_id AS TEXT) AS source_id FROM public.evidence_items WHERE CAST(id AS TEXT) IN :ids",
        "ids",
        evidence_ids,
    )
    runs = _select_in(
        session,
        "SELECT CAST(id AS TEXT) AS id, generator_name, generator_version, random_seed, parameters, source_context FROM public.synthetic_generation_runs WHERE CAST(id AS TEXT) IN :ids",
        "ids",
        run_ids,
    )

    return {
        "states": {str(row["id"]) for row in states},
        "districts": {str(row["id"]): str(row["state_id"]) for row in districts},
        "sectors": {str(row["id"]) for row in sectors},
        "skills": {str(row["id"]): str(row["sector_id"]) for row in skills},
        "sources": {str(row["id"]) for row in sources},
        "retrievals": {str(row["id"]): row for row in retrievals},
        "evidence": {str(row["id"]): row for row in evidence},
        "runs": {str(row["id"]): row for row in runs},
    }


def _validate_references(
    session: Session,
    rows: list[CanonicalObservation],
    run_specs: Mapping[str, SyntheticRunSpec],
) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]], dict[str, list[CanonicalObservation]]]:
    refs = _load_references(session, rows)
    issues: list[str] = []
    for idx, row in enumerate(rows, start=2):
        prefix = f"row {idx}"
        if row.state_id not in refs["states"]:
            issues.append(f"{prefix}: unknown state_id {row.state_id!r}")
        if row.district_id:
            district_state = refs["districts"].get(row.district_id)
            if district_state is None:
                issues.append(f"{prefix}: unknown district_id {row.district_id!r}")
            elif district_state != row.state_id:
                issues.append(f"{prefix}: district_id does not belong to state_id")
        if row.sector_id and row.sector_id not in refs["sectors"]:
            issues.append(f"{prefix}: unknown sector_id {row.sector_id!r}")
        if row.skill_id:
            skill_sector = refs["skills"].get(row.skill_id)
            if skill_sector is None:
                issues.append(f"{prefix}: unknown skill_id {row.skill_id!r}")
            elif row.sector_id and skill_sector != row.sector_id:
                issues.append(f"{prefix}: sector_id does not match the canonical sector for skill_id")

        if row.is_synthetic:
            run_id = _id(row.generation_run_id)
            if run_id not in refs["runs"] and run_id not in run_specs:
                issues.append(
                    f"{prefix}: generation_run_id {run_id!r} is not registered; supply explicit "
                    "SyntheticRunSpec metadata to create it"
                )
            continue

        source_id = _id(row.source_id)
        if source_id not in refs["sources"]:
            issues.append(f"{prefix}: source_id {source_id!r} is not registered in data_sources")
        if row.retrieval_id:
            retrieval = refs["retrievals"].get(_id(row.retrieval_id))
            if retrieval is None:
                issues.append(f"{prefix}: retrieval_id is not registered")
            elif _id(retrieval["source_id"]) != source_id:
                issues.append(f"{prefix}: retrieval_id belongs to a different data source")
            elif str(retrieval["retrieval_status"]).upper() == "FAILED":
                issues.append(f"{prefix}: retrieval_id points to a failed source retrieval")
        if row.evidence_item_id:
            item = refs["evidence"].get(_id(row.evidence_item_id))
            if item is None:
                issues.append(f"{prefix}: evidence_item_id is not registered")
            elif _id(item["source_id"]) != source_id:
                issues.append(f"{prefix}: evidence_item_id belongs to a different data source")

    source_rows = [row for row in rows if not row.is_synthetic]
    capabilities: dict[str, list[dict[str, Any]]] = {}
    if source_rows:
        source_ids = sorted({_id(row.source_id) for row in source_rows if row.source_id})
        signals = sorted({row.signal_type for row in source_rows})
        grains = sorted({row.observation_grain for row in source_rows})
        stmt = text(
            "SELECT CAST(id AS TEXT) AS id, CAST(source_id AS TEXT) AS source_id, state_scope, "
            "observation_grain, signal_type, unit, flow_stock_semantics, coverage_start, coverage_end "
            "FROM public.source_capabilities WHERE CAST(source_id AS TEXT) IN :source_ids "
            "AND signal_type IN :signals AND observation_grain IN :grains"
        ).bindparams(
            bindparam("source_ids", expanding=True),
            bindparam("signals", expanding=True),
            bindparam("grains", expanding=True),
        )
        caps = [
            dict(r) for r in session.execute(
                stmt, {"source_ids": source_ids, "signals": signals, "grains": grains}
            ).mappings()
        ]
        for cap in caps:
            key = (str(cap["source_id"]), str(cap["signal_type"]), str(cap["observation_grain"]).upper())
            capabilities.setdefault("|".join(key), []).append(cap)
        for idx, row in enumerate(source_rows, start=2):
            key = "|".join((_id(row.source_id) or "", row.signal_type, row.observation_grain))
            matches = capabilities.get(key, [])
            if len(matches) != 1:
                issues.append(
                    f"row {idx}: expected exactly one source_capabilities match for "
                    f"source/signal/grain, found {len(matches)}"
                )
                continue
            cap = matches[0]
            if str(cap.get("unit", "")).strip() != row.unit:
                issues.append(f"row {idx}: unit does not match the registered source capability")
            cap_semantics = cap.get("flow_stock_semantics")
            cap_semantics = str(cap_semantics).strip().casefold() if cap_semantics is not None else None
            row_semantics = str(row.flow_stock_semantics).strip().casefold() if row.flow_stock_semantics is not None else None
            if cap_semantics != row_semantics:
                issues.append(
                    f"row {idx}: flow_stock_semantics does not match the registered source capability"
                )
            scope = cap.get("state_scope")
            if scope and str(scope).upper() not in {"NATIONAL", row.state_id.upper()}:
                issues.append(f"row {idx}: state_id is outside the registered source capability scope")
            start, end = cap.get("coverage_start"), cap.get("coverage_end")
            if start is not None and row.period_year < int(start):
                issues.append(f"row {idx}: period_year precedes source capability coverage_start")
            if end is not None and row.period_year > int(end):
                issues.append(f"row {idx}: period_year exceeds source capability coverage_end")

    missing_runs: dict[str, list[CanonicalObservation]] = {}
    run_specs_normalised = {str(UUID(key)): value for key, value in run_specs.items()}
    by_run: dict[str, list[CanonicalObservation]] = {}
    for row in rows:
        if row.is_synthetic and row.generation_run_id:
            by_run.setdefault(_id(row.generation_run_id) or "", []).append(row)
    for run_id, run_rows in by_run.items():
        if run_id in refs["runs"]:
            continue
        if run_id not in run_specs_normalised:
            issues.append(f"synthetic generation run {run_id} has no registration metadata")
            continue
        _effective_parameters(run_specs_normalised[run_id], run_rows)
        missing_runs[run_id] = run_rows

    if issues:
        raise IngestionValidationError("database reference validation failed:\n- " + "\n- ".join(issues))
    return refs, capabilities, missing_runs


def _natural_keyed_existing(
    session: Session, rows: list[CanonicalObservation], kind: str
) -> dict[tuple[Any, ...], list[dict[str, Any]]]:
    source_ids = sorted({_id(row.source_id) for row in rows if not row.is_synthetic and row.source_id})
    run_ids = sorted({_id(row.generation_run_id) for row in rows if row.is_synthetic and row.generation_run_id})
    years = sorted({row.period_year for row in rows})
    signal_column = "demand_signal_type" if kind == "demand" else "supply_signal_type"
    signals = sorted({row.signal_type for row in rows})
    table = "demand_observations" if kind == "demand" else "supply_observations"
    found: list[dict[str, Any]] = []
    if source_ids:
        stmt = text(
            f"SELECT * FROM public.{table} WHERE provenance_state = 'SOURCE_BACKED' "
            f"AND CAST(source_id AS TEXT) IN :source_ids AND period_year IN :years AND {signal_column} IN :signals"
        ).bindparams(
            bindparam("source_ids", expanding=True),
            bindparam("years", expanding=True),
            bindparam("signals", expanding=True),
        )
        found.extend(dict(r) for r in session.execute(
            stmt, {"source_ids": source_ids, "years": years, "signals": signals}
        ).mappings())
    if run_ids:
        stmt = text(
            f"SELECT * FROM public.{table} WHERE provenance_state = 'SYNTHETIC_DEMO' "
            f"AND CAST(generation_run_id AS TEXT) IN :run_ids AND period_year IN :years AND {signal_column} IN :signals"
        ).bindparams(
            bindparam("run_ids", expanding=True),
            bindparam("years", expanding=True),
            bindparam("signals", expanding=True),
        )
        found.extend(dict(r) for r in session.execute(
            stmt, {"run_ids": run_ids, "years": years, "signals": signals}
        ).mappings())
    keyed: dict[tuple[Any, ...], list[dict[str, Any]]] = {}
    for row in found:
        keyed.setdefault(_identity_key(kind, row), []).append(row)
    return keyed


def _ensure_no_conflicting_keys(
    batch: ParsedBatch,
    existing: Mapping[tuple[Any, ...], list[dict[str, Any]]],
) -> tuple[list[CanonicalObservation], int]:
    to_insert: list[CanonicalObservation] = []
    seen: dict[tuple[Any, ...], CanonicalObservation] = {}
    unchanged = 0
    for row in batch.observations:
        key = _observation_identity(batch.kind, row)
        prior_batch = seen.get(key)
        if prior_batch is not None:
            if not _payload_matches(prior_batch.db_values(), row):
                raise IngestionConflictError(
                    f"batch contains conflicting rows for natural key {key!r}; separate source releases or generation runs"
                )
            unchanged += 1
            continue
        seen[key] = row
        matches = existing.get(key, [])
        if len(matches) > 1:
            raise IngestionConflictError(f"database contains duplicate rows for natural key {key!r}")
        if matches:
            if not _payload_matches(matches[0], row):
                raise IngestionConflictError(
                    f"natural key {key!r} exists with different content; use a new source_release for a revised source-backed snapshot or a new generation_run_id for changed synthetic data"
                )
            unchanged += 1
        else:
            to_insert.append(row)
    return to_insert, unchanged


def persist_batch(
    session: Session,
    batch: ParsedBatch,
    *,
    generation_runs: Mapping[str, SyntheticRunSpec] | None = None,
    write: bool = False,
) -> IngestionResult:
    """Validate and optionally persist one batch atomically.

    Use a fresh Session for independent calls or an explicit outer transaction to
    atomically import demand and supply together. Database writes only happen when
    write=True; the default validates references and reports planned inserts.
    """
    _validate_shape(batch)
    specs = generation_runs or {}
    # Normalise keys now so malformed UUID keys fail before any SQL or writes.
    normalised_specs = {str(UUID(key)): value for key, value in specs.items()}
    tx = session.begin_nested() if session.in_transaction() else session.begin()
    with tx:
        refs, _, missing_runs = _validate_references(
            session, list(batch.observations), normalised_specs
        )
        existing = _natural_keyed_existing(session, list(batch.observations), batch.kind)
        to_insert, unchanged = _ensure_no_conflicting_keys(batch, existing)

        if not write:
            return IngestionResult(
                kind=batch.kind,
                rows_received=len(batch.observations),
                rows_inserted=0,
                rows_unchanged=unchanged,
                rows_would_insert=len(to_insert),
                generation_runs_created=0,
                generation_runs_would_create=len(missing_runs),
                dry_run=True,
            )

        for run_id, rows in missing_runs.items():
            spec = normalised_specs[run_id]
            params = _effective_parameters(spec, rows)
            session.execute(
                text(
                    "INSERT INTO public.synthetic_generation_runs "
                    "(id, generator_name, generator_version, random_seed, parameters, source_context) "
                    "VALUES (:id, :generator_name, :generator_version, :random_seed, :parameters, :source_context) "
                    "ON CONFLICT (id) DO NOTHING"
                ),
                {
                    "id": run_id,
                    "generator_name": spec.generator_name,
                    "generator_version": spec.generator_version,
                    "random_seed": spec.random_seed,
                    "parameters": json.dumps(params, ensure_ascii=False, sort_keys=True),
                    "source_context": spec.source_context,
                },
            )

        if to_insert:
            values = [row.db_values() for row in to_insert]
            columns = list(values[0])
            bind_list = ", ".join(":" + column for column in columns)
            column_list = ", ".join(columns)
            table = "demand_observations" if batch.kind == "demand" else "supply_observations"
            statement = text(
                f"INSERT INTO public.{table} ({column_list}) VALUES ({bind_list}) ON CONFLICT DO NOTHING"
            )
            params = [_normalise_payload(item) for item in values]
            session.execute(statement, params)

        after = _natural_keyed_existing(session, list(batch.observations), batch.kind)
        for row in batch.observations:
            key = _observation_identity(batch.kind, row)
            matches = after.get(key, [])
            if len(matches) != 1 or not _payload_matches(matches[0], row):
                raise IngestionConflictError(
                    f"post-insert verification failed for natural key {key!r}; the transaction was rolled back"
                )

        # PostgreSQL and SQLite report aggregate rowcount for the batched insert.
        rows_inserted = len(to_insert)
        # Count registry rows actually materialised by this transaction.
        runs_created = len(missing_runs)
        return IngestionResult(
            kind=batch.kind,
            rows_received=len(batch.observations),
            rows_inserted=rows_inserted,
            rows_unchanged=unchanged,
            rows_would_insert=len(to_insert),
            generation_runs_created=runs_created,
            generation_runs_would_create=len(missing_runs),
            dry_run=False,
        )
