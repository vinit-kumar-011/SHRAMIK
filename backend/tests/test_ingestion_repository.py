from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    Integer,
    MetaData,
    Numeric,
    String,
    Table,
    Uuid,
    create_engine,
    select,
)
from sqlalchemy.orm import Session

from app.ingestion.canonical_csv import CanonicalObservation, ParsedBatch
from app.ingestion.repository import ObservationRepository, PersistenceValidationError


SOURCE_ID = UUID("10000000-0000-0000-0000-000000000001")
RETRIEVAL_ID = UUID("20000000-0000-0000-0000-000000000001")
EVIDENCE_ID = UUID("30000000-0000-0000-0000-000000000001")
GENERATION_ID = UUID("40000000-0000-0000-0000-000000000001")

metadata = MetaData()
Table("states", metadata, Column("id", String, primary_key=True))
Table("districts", metadata, Column("id", String, primary_key=True), Column("state_id", String, nullable=False))
Table("sectors", metadata, Column("id", String, primary_key=True))
Table("skills", metadata, Column("id", String, primary_key=True))
Table("data_sources", metadata, Column("id", Uuid(as_uuid=True), primary_key=True))
Table(
    "source_retrievals", metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("source_id", Uuid(as_uuid=True), nullable=False),
    Column("retrieval_status", String, nullable=False),
)
Table(
    "evidence_items", metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("source_id", Uuid(as_uuid=True), nullable=False),
)
Table(
    "source_capabilities", metadata,
    Column("source_id", Uuid(as_uuid=True), nullable=False),
    Column("signal_type", String, nullable=False),
    Column("observation_grain", String, nullable=False),
    Column("unit", String, nullable=False),
    Column("flow_stock_semantics", String),
    Column("state_scope", String),
    Column("coverage_start", Integer),
    Column("coverage_end", Integer),
)
Table("synthetic_generation_runs", metadata, Column("id", Uuid(as_uuid=True), primary_key=True))

observation_columns = [
    Column("id", Uuid(as_uuid=True), primary_key=True, default=uuid4),
    Column("state_id", String, nullable=False),
    Column("district_id", String),
    Column("sector_id", String),
    Column("skill_id", String),
    Column("observation_grain", String, nullable=False),
    Column("period_type", String, nullable=False),
    Column("period_year", Integer, nullable=False),
    Column("quantity_unit", String, nullable=False),
    Column("quantity_semantics", String, nullable=False),
    Column("source_id", Uuid(as_uuid=True)),
    Column("source_release", String),
    Column("source_date", Date),
    Column("retrieval_id", Uuid(as_uuid=True)),
    Column("evidence_item_id", Uuid(as_uuid=True)),
    Column("provenance_state", String, nullable=False),
    Column("is_synthetic", Boolean, nullable=False),
    Column("generation_run_id", Uuid(as_uuid=True)),
    Column("transformation_note", String),
    Column("demand_quantity", Numeric(14, 2)),
    Column("demand_signal_type", String, nullable=False),
]
Table("demand_observations", metadata, *observation_columns)
Table(
    "supply_observations", metadata,
    *[
        column._copy()
        for column in observation_columns
        if column.name not in {"demand_quantity", "demand_signal_type"}
    ],
    Column("supply_quantity", Numeric(14, 2)),
    Column("training_capacity", Numeric(14, 2)),
    Column("enrollment", Numeric(14, 2)),
    Column("completions", Numeric(14, 2)),
    Column("supply_signal_type", String, nullable=False),
)


def make_observation(
    *,
    value: Decimal = Decimal("123.45"),
    state_id: str = "state-1",
    flow_stock_semantics: str = "annual_flow",
    quantity_semantics: str = "FLOW",
    source_id: UUID | None = SOURCE_ID,
    retrieval_id: UUID | None = RETRIEVAL_ID,
    evidence_item_id: UUID | None = EVIDENCE_ID,
    generation_run_id: UUID | None = None,
    is_synthetic: bool = False,
) -> CanonicalObservation:
    return CanonicalObservation(
        kind="demand",
        state_id=state_id,
        district_id="district-1",
        sector_id="sector-1",
        skill_id="skill-1",
        observation_grain="DISTRICT_SECTOR_SKILL",
        period_type="YEAR",
        period_year=2023,
        signal_type="VACANCY_HEADCOUNT",
        value=value,
        source_id=str(source_id) if source_id else None,
        source_release="release-2023",
        source_date=date(2023, 12, 31),
        retrieval_id=str(retrieval_id) if retrieval_id else None,
        evidence_item_id=str(evidence_item_id) if evidence_item_id else None,
        provenance_state="SYNTHETIC_DEMO" if is_synthetic else "SOURCE_BACKED",
        is_synthetic=is_synthetic,
        generation_run_id=str(generation_run_id) if generation_run_id else None,
        transformation_note="deterministic test fixture" if is_synthetic else None,
        unit="persons",
        flow_stock_semantics=flow_stock_semantics,
        quantity_semantics=quantity_semantics,
    )


def make_batch(row: CanonicalObservation) -> ParsedBatch:
    return ParsedBatch(
        kind=row.kind,
        observations=(row,),
        issues=(),
        sha256="f" * 64,
        source_path="observations.csv",
        synthetic_capabilities={"demand": {}, "supply": {}},
    )


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    metadata.create_all(engine)
    with Session(engine) as db:
        db.execute(metadata.tables["states"].insert().values(id="state-1"))
        db.execute(metadata.tables["districts"].insert().values(id="district-1", state_id="state-1"))
        db.execute(metadata.tables["sectors"].insert().values(id="sector-1"))
        db.execute(metadata.tables["skills"].insert().values(id="skill-1"))
        db.execute(metadata.tables["data_sources"].insert().values(id=SOURCE_ID))
        db.execute(
            metadata.tables["source_retrievals"].insert().values(
                id=RETRIEVAL_ID, source_id=SOURCE_ID, retrieval_status="SUCCESS"
            )
        )
        db.execute(
            metadata.tables["evidence_items"].insert().values(id=EVIDENCE_ID, source_id=SOURCE_ID)
        )
        db.execute(
            metadata.tables["source_capabilities"].insert().values(
                source_id=SOURCE_ID,
                signal_type="VACANCY_HEADCOUNT",
                observation_grain="DISTRICT_SECTOR_SKILL",
                unit="persons",
                flow_stock_semantics="ANNUAL_FLOW",
                state_scope="NATIONAL",
                coverage_start=2020,
                coverage_end=2030,
            )
        )
        db.execute(
            metadata.tables["synthetic_generation_runs"].insert().values(id=GENERATION_ID)
        )
        db.commit()
        yield db
    engine.dispose()


def count_rows(session: Session, table_name: str) -> int:
    table = metadata.tables[table_name]
    return int(session.execute(select(table.c.id)).all().__len__())


def test_live_capability_validation_accepts_case_variants(session: Session):
    batch = make_batch(make_observation(flow_stock_semantics="annual_flow"))
    repo = ObservationRepository(session)
    assert repo.validate_batch(batch) == 1
    assert count_rows(session, "demand_observations") == 0


def test_writes_are_disabled_by_default(session: Session):
    repo = ObservationRepository(session)
    with pytest.raises(PersistenceValidationError, match="writes are disabled"):
        repo.persist_batch(make_batch(make_observation()))
    assert count_rows(session, "demand_observations") == 0


def test_persists_schema_mapped_row_and_identical_replay_is_skipped(session: Session):
    batch = make_batch(make_observation())
    repo = ObservationRepository(session, allow_writes=True)

    first = repo.persist_batch(batch)
    second = repo.persist_batch(batch)

    assert first.inserted_rows == 1
    assert first.skipped_identical_rows == 0
    assert second.inserted_rows == 0
    assert second.skipped_identical_rows == 1
    session.commit()

    stored = session.execute(select(metadata.tables["demand_observations"])).mappings().one()
    assert stored["quantity_unit"] == "persons"
    assert stored["quantity_semantics"] == "FLOW"
    assert stored["demand_quantity"] == Decimal("123.45")
    assert stored["flow_stock_semantics"] if "flow_stock_semantics" in stored else True
    assert count_rows(session, "demand_observations") == 1


def test_same_identity_with_changed_payload_is_rejected_without_overwrite(session: Session):
    repo = ObservationRepository(session, allow_writes=True)
    repo.persist_batch(make_batch(make_observation()))
    with pytest.raises(PersistenceValidationError, match="different content"):
        repo.persist_batch(make_batch(make_observation(value=Decimal("999.00"))))

    session.commit()
    stored = session.execute(select(metadata.tables["demand_observations"])).mappings().one()
    assert stored["demand_quantity"] == Decimal("123.45")


def test_unknown_state_reference_fails_before_insert(session: Session):
    repo = ObservationRepository(session, allow_writes=True)
    batch = make_batch(make_observation(state_id="missing-state"))
    with pytest.raises(PersistenceValidationError, match="unknown state_id"):
        repo.persist_batch(batch)
    assert count_rows(session, "demand_observations") == 0


def test_source_capability_mismatch_fails_closed(session: Session):
    repo = ObservationRepository(session, allow_writes=True)
    batch = make_batch(make_observation(flow_stock_semantics="as_of_snapshot"))
    with pytest.raises(PersistenceValidationError, match="Source capability validation failed"):
        repo.persist_batch(batch)
    assert count_rows(session, "demand_observations") == 0


def test_synthetic_row_requires_registered_generation_run(session: Session):
    repo = ObservationRepository(session, allow_writes=True)
    missing_run = make_batch(
        make_observation(
            source_id=None,
            retrieval_id=None,
            evidence_item_id=None,
            generation_run_id=uuid4(),
            is_synthetic=True,
        )
    )
    with pytest.raises(PersistenceValidationError, match="unknown synthetic_generation_runs"):
        repo.persist_batch(missing_run)

    valid_run = make_batch(
        make_observation(
            source_id=None,
            retrieval_id=None,
            evidence_item_id=None,
            generation_run_id=GENERATION_ID,
            is_synthetic=True,
        )
    )
    assert repo.persist_batch(valid_run).inserted_rows == 1


def test_mismatched_retrieval_source_is_rejected(session: Session):
    other_source = UUID("10000000-0000-0000-0000-000000000002")
    other_retrieval = UUID("20000000-0000-0000-0000-000000000002")
    session.execute(metadata.tables["data_sources"].insert().values(id=other_source))
    session.execute(
        metadata.tables["source_retrievals"].insert().values(
            id=other_retrieval, source_id=other_source, retrieval_status="SUCCESS"
        )
    )
    session.commit()

    batch = make_batch(make_observation(retrieval_id=other_retrieval))
    repo = ObservationRepository(session, allow_writes=True)
    with pytest.raises(PersistenceValidationError, match="retrieval_id belongs to a different source"):
        repo.persist_batch(batch)
    assert count_rows(session, "demand_observations") == 0
