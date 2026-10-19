"""Database reference validation and idempotent persistence for canonical observations.

This repository is deliberately disabled for writes by default. It uses the
existing SQLAlchemy session, checks every referenced canonical/provenance ID
and the live source_capabilities registry before inserting anything. The caller
owns the outer transaction. The repository uses the canonical natural-key indexes
already defined for source-backed and synthetic observations.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import MetaData, Table, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.ingestion.capability_validation import (
    CapabilityValidationError,
    validate_source_capabilities,
)
from app.ingestion.canonical_csv import CanonicalObservation, ParsedBatch


class PersistenceValidationError(ValueError):
    """Raised when a batch is not safe to persist without manual correction."""


@dataclass(frozen=True)
class PersistenceSummary:
    kind: str
    table: str
    inserted_rows: int
    skipped_identical_rows: int


class ObservationRepository:
    """Validate references and append canonical observations in a savepoint.

    Writes are fail-closed: callers must deliberately pass allow_writes=True.
    This is a boundary, not an environment detector; callers must point the
    SQLAlchemy session at a reviewed non-production database during integration.
    """

    def __init__(self, session: Session, *, allow_writes: bool = False) -> None:
        self.session = session
        self.allow_writes = allow_writes
        self._metadata = MetaData()
        self._tables: dict[str, Table] = {}
        dialect = self.session.get_bind().dialect.name
        self._schema = None if dialect == "sqlite" else "public"

    def _table(self, name: str) -> Table:
        if name not in self._tables:
            try:
                self._tables[name] = Table(
                    name,
                    self._metadata,
                    schema=self._schema,
                    autoload_with=self.session.get_bind(),
                )
            except Exception as exc:
                raise PersistenceValidationError(
                    f"Could not inspect required database table {name!r}; "
                    "verify DATABASE_URL and apply the reviewed schema migrations."
                ) from exc
        return self._tables[name]

    @staticmethod
    def _uuid(value: str | None) -> UUID | None:
        if value is None:
            return None
        try:
            return UUID(str(value))
        except (ValueError, TypeError, AttributeError) as exc:
            raise PersistenceValidationError("An observation contains an invalid UUID reference.") from exc

    @staticmethod
    def _normalise_id(value: Any) -> str:
        # SQLAlchemy's SQLite reflection reports UUID columns as CHAR(32), while
        # PostgreSQL reflects them as UUID. Canonicalise both result forms.
        try:
            return str(UUID(str(value)))
        except (ValueError, TypeError, AttributeError):
            return str(value)

    def _uuid_values(self, values: set[str]) -> list[Any]:
        parsed = [self._uuid(value) for value in sorted(values) if value]
        if self.session.get_bind().dialect.name == "sqlite":
            return [value.hex for value in parsed if value is not None]
        return [value for value in parsed if value is not None]

    def _database_values(self, row: CanonicalObservation) -> dict[str, Any]:
        values = row.db_values()
        if self.session.get_bind().dialect.name == "sqlite":
            # Reflected SQLite UUID columns are strings; SQLAlchemy Uuid(as_uuid=True)
            # encodes those as 32 lowercase hex characters.
            for key, value in values.items():
                if isinstance(value, UUID):
                    values[key] = value.hex
        return values

    def _ids(self, table_name: str, column_name: str, values: list[Any]) -> set[str]:
        if not values:
            return set()
        table = self._table(table_name)
        rows = self.session.execute(
            select(table.c[column_name]).where(table.c[column_name].in_(values))
        ).scalars()
        return {self._normalise_id(value) for value in rows}

    @staticmethod
    def _identity_keys(row: CanonicalObservation) -> tuple[str, ...]:
        dimensions = (
            "state_id",
            "district_id",
            "sector_id",
            "skill_id",
            "observation_grain",
            "period_type",
            "period_year",
        )
        signal_column = "demand_signal_type" if row.kind == "demand" else "supply_signal_type"
        if row.is_synthetic:
            return (*dimensions, signal_column, "generation_run_id")
        # Must exactly match uq_{kind}_source_key in the live schema.
        # Retrieval/evidence IDs are payload/provenance, not the source observation's
        # natural identity; changing them for the same release must fail closed.
        return (
            *dimensions,
            "source_id",
            "source_release",
            signal_column,
        )

    @staticmethod
    def _same_value(existing: Any, incoming: Any) -> bool:
        if incoming is None:
            return existing is None
        if isinstance(incoming, Decimal):
            try:
                return existing is not None and Decimal(str(existing)) == incoming
            except Exception:
                return False
        if isinstance(incoming, UUID):
            try:
                return existing is not None and UUID(str(existing)) == incoming
            except (ValueError, TypeError, AttributeError):
                return False
        return existing == incoming

    def _validate(self, batch: ParsedBatch) -> None:
        if not batch.valid:
            detail = "; ".join(str(issue) for issue in batch.issues[:20])
            raise PersistenceValidationError(
                f"Batch failed canonical validation: {detail or 'no valid observation rows'}"
            )
        if any(row.kind != batch.kind for row in batch.observations):
            raise PersistenceValidationError("Batch kind does not match all observations in the batch.")

        errors: list[str] = []
        for index, row in enumerate(batch.observations, start=2):
            expected_district = row.observation_grain.startswith("DISTRICT")
            expected_sector = "SECTOR" in row.observation_grain
            expected_skill = "SKILL" in row.observation_grain
            if not row.state_id:
                errors.append(f"row {index}: state_id is required")
            if bool(row.district_id) != expected_district:
                errors.append(f"row {index}: district_id does not match observation_grain")
            if bool(row.sector_id) != expected_sector:
                errors.append(f"row {index}: sector_id does not match observation_grain")
            if bool(row.skill_id) != expected_skill:
                errors.append(f"row {index}: skill_id does not match observation_grain")

            allowed = {"FLOW", "STOCK"} if row.kind == "demand" else {"FLOW", "STOCK", "CAPACITY"}
            if row.quantity_semantics not in allowed:
                errors.append(f"row {index}: invalid quantity_semantics {row.quantity_semantics!r} for {row.kind}")
            if not row.unit or not row.flow_stock_semantics:
                errors.append(f"row {index}: unit and source-specific flow_stock_semantics are required")

            if row.is_synthetic:
                if row.provenance_state != "SYNTHETIC_DEMO":
                    errors.append(f"row {index}: synthetic data must use SYNTHETIC_DEMO provenance")
                if row.source_id or row.retrieval_id or row.evidence_item_id:
                    errors.append(f"row {index}: synthetic data cannot reference source-backed evidence")
                if not row.generation_run_id:
                    errors.append(f"row {index}: generation_run_id is required for synthetic data")
            else:
                if row.provenance_state != "SOURCE_BACKED":
                    errors.append(f"row {index}: source-backed data must use SOURCE_BACKED provenance")
                if not row.source_id:
                    errors.append(f"row {index}: source_id is required for source-backed data")
                if not row.retrieval_id:
                    errors.append(f"row {index}: retrieval_id is required for source-backed data")
                if row.generation_run_id:
                    errors.append(f"row {index}: source-backed data cannot reference a synthetic generation run")

        state_ids = {row.state_id for row in batch.observations if row.state_id}
        districts = {row.district_id for row in batch.observations if row.district_id}
        sectors = {row.sector_id for row in batch.observations if row.sector_id}
        skills = {row.skill_id for row in batch.observations if row.skill_id}
        source_values = {row.source_id for row in batch.observations if row.source_id}
        retrieval_values = {row.retrieval_id for row in batch.observations if row.retrieval_id}
        evidence_values = {row.evidence_item_id for row in batch.observations if row.evidence_item_id}
        generation_values = {row.generation_run_id for row in batch.observations if row.generation_run_id}

        found_states = self._ids("states", "id", list(state_ids))
        found_sectors = self._ids("sectors", "id", list(sectors))
        found_skills = self._ids("skills", "id", list(skills))
        found_sources = self._ids("data_sources", "id", self._uuid_values(source_values))
        found_runs = self._ids(
            "synthetic_generation_runs", "id", self._uuid_values(generation_values)
        )

        for state_id in sorted(state_ids - found_states):
            errors.append(f"unknown state_id reference: {state_id}")
        for sector_id in sorted(sectors - found_sectors):
            errors.append(f"unknown sector_id reference: {sector_id}")
        for skill_id in sorted(skills - found_skills):
            errors.append(f"unknown skill_id reference: {skill_id}")
        for source_id in sorted(source_values - found_sources):
            errors.append(f"unknown data_sources.id reference: {source_id}")
        for run_id in sorted(generation_values - found_runs):
            errors.append(f"unknown synthetic_generation_runs.id reference: {run_id}")

        district_rows: dict[str, str] = {}
        if districts:
            district_table = self._table("districts")
            rows = self.session.execute(
                select(district_table.c.id, district_table.c.state_id).where(
                    district_table.c.id.in_(list(districts))
                )
            ).mappings()
            district_rows = {
                self._normalise_id(row["id"]): str(row["state_id"]) for row in rows
            }
        for row in batch.observations:
            if row.district_id:
                linked_state = district_rows.get(row.district_id)
                if linked_state is None:
                    errors.append(f"unknown districts.id reference: {row.district_id}")
                elif linked_state != row.state_id:
                    errors.append(
                        f"district {row.district_id} does not belong to state {row.state_id}"
                    )

        retrieval_rows: dict[str, dict[str, Any]] = {}
        if retrieval_values:
            table = self._table("source_retrievals")
            ids = self._uuid_values(retrieval_values)
            rows = self.session.execute(
                select(table.c.id, table.c.source_id, table.c.retrieval_status).where(
                    table.c.id.in_(ids)
                )
            ).mappings()
            retrieval_rows = {self._normalise_id(row["id"]): dict(row) for row in rows}

        evidence_rows: dict[str, dict[str, Any]] = {}
        if evidence_values:
            table = self._table("evidence_items")
            rows = self.session.execute(
                select(table.c.id, table.c.source_id).where(
                    table.c.id.in_(self._uuid_values(evidence_values))
                )
            ).mappings()
            evidence_rows = {self._normalise_id(row["id"]): dict(row) for row in rows}

        for index, row in enumerate(batch.observations, start=2):
            if row.retrieval_id:
                retrieval = retrieval_rows.get(self._normalise_id(row.retrieval_id))
                if retrieval is None:
                    errors.append(f"row {index}: unknown source_retrievals.id reference {row.retrieval_id}")
                else:
                    if row.source_id and self._normalise_id(retrieval["source_id"]) != self._normalise_id(row.source_id):
                        errors.append(f"row {index}: retrieval_id belongs to a different source_id")
                    if str(retrieval["retrieval_status"]).upper() == "FAILED":
                        errors.append(f"row {index}: cannot ingest observations from a FAILED retrieval")
            if row.evidence_item_id:
                evidence = evidence_rows.get(self._normalise_id(row.evidence_item_id))
                if evidence is None:
                    errors.append(f"row {index}: unknown evidence_items.id reference {row.evidence_item_id}")
                elif row.source_id and self._normalise_id(evidence["source_id"]) != self._normalise_id(row.source_id):
                    errors.append(f"row {index}: evidence_item_id belongs to a different source_id")

        if errors:
            raise PersistenceValidationError(
                "Observation reference validation failed:\n- " + "\n- ".join(errors[:50])
            )

        source_backed = [row for row in batch.observations if not row.is_synthetic]
        if source_backed:
            source_ids = self._uuid_values(source_values)
            table = self._table("source_capabilities")
            capability_rows = self.session.execute(
                select(
                    table.c.source_id,
                    table.c.signal_type,
                    table.c.observation_grain,
                    table.c.unit,
                    table.c.flow_stock_semantics,
                    table.c.state_scope,
                    table.c.coverage_start,
                    table.c.coverage_end,
                ).where(table.c.source_id.in_(source_ids))
            ).mappings()
            capability_snapshot = []
            for row in capability_rows:
                item = dict(row)
                item["source_id"] = self._normalise_id(item["source_id"])
                capability_snapshot.append(item)
            try:
                validate_source_capabilities(batch, capability_snapshot)
            except CapabilityValidationError as exc:
                raise PersistenceValidationError(str(exc)) from exc

    def validate_batch(self, batch: ParsedBatch) -> int:
        """Perform reference/capability validation without writing any rows."""
        self._validate(batch)
        return len(batch.observations)

    def persist_batch(self, batch: ParsedBatch) -> PersistenceSummary:
        """Persist a validated batch idempotently, within the caller's transaction.

        Identical replays are skipped; a repeated natural identity with changed
        content fails closed. The database unique-index migration closes the
        concurrent-import race. This method does not commit the outer transaction.
        """
        if not self.allow_writes:
            raise PersistenceValidationError(
                "Database writes are disabled. Construct the repository with allow_writes=True "
                "only for a reviewed non-production integration run."
            )

        table_name = "demand_observations" if batch.kind == "demand" else "supply_observations"
        table = self._table(table_name)
        inserted = 0
        skipped = 0

        try:
            with self.session.begin_nested():
                self._validate(batch)
                for row in batch.observations:
                    values = self._database_values(row)
                    key_columns = self._identity_keys(row)
                    predicates = [
                        table.c[column].is_not_distinct_from(values[column])
                        for column in key_columns
                    ]
                    existing_rows = self.session.execute(
                        select(table).where(*predicates)
                    ).mappings().all()

                    if len(existing_rows) > 1:
                        raise PersistenceValidationError(
                            "Multiple existing observations share the same natural identity; "
                            "deduplicate/review the target table before importing."
                        )
                    if existing_rows:
                        existing = existing_rows[0]
                        if all(
                            column in existing and self._same_value(existing[column], value)
                            for column, value in values.items()
                        ):
                            skipped += 1
                            continue
                        raise PersistenceValidationError(
                            "A row with this source/grain/period/signal identity already exists "
                            "with different content. The importer will not overwrite it."
                        )

                    self.session.execute(table.insert().values(**values))
                    inserted += 1
        except IntegrityError as exc:
            raise PersistenceValidationError(
                "The database rejected the observation batch (often a concurrent duplicate or "
                "foreign-key/check constraint failure). The batch savepoint was rolled back; "
                "inspect the constraint detail and retry only after resolving it."
            ) from exc

        return PersistenceSummary(
            kind=batch.kind,
            table=table_name,
            inserted_rows=inserted,
            skipped_identical_rows=skipped,
        )
