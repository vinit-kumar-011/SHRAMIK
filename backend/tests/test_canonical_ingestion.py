from __future__ import annotations

import csv
from datetime import date
from uuid import UUID

from app.ingestion.canonical_csv import parse_canonical_csv


HEADER = [
    "state_id", "district_id", "sector_id", "skill_id", "observation_grain",
    "period_type", "period_year", "source_id", "source_release", "source_date",
    "retrieval_id", "evidence_item_id", "provenance_state", "is_synthetic",
    "generation_run_id", "transformation_note", "unit", "flow_stock_semantics",
    "quantity_semantics", "demand_quantity", "demand_signal_type",
]


def write_csv(tmp_path, row, *, header=HEADER):
    path = tmp_path / "demand.csv"
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=header)
        writer.writeheader()
        writer.writerow(row)
    return path


def source_row(**overrides):
    row = {
        "state_id": "state-1",
        "district_id": "district-1",
        "sector_id": "sector-1",
        "skill_id": "skill-1",
        "observation_grain": "DISTRICT_SECTOR_SKILL",
        "period_type": "YEAR",
        "period_year": "2023",
        "source_id": "10000000-0000-0000-0000-000000000001",
        "source_release": "release-2023",
        "source_date": "2023-12-31",
        "retrieval_id": "20000000-0000-0000-0000-000000000001",
        "evidence_item_id": "30000000-0000-0000-0000-000000000001",
        "provenance_state": "SOURCE_BACKED",
        "is_synthetic": "false",
        "generation_run_id": "",
        "transformation_note": "",
        "unit": "persons",
        "flow_stock_semantics": "annual_flow",
        "quantity_semantics": "FLOW",
        "demand_quantity": "12.50",
        "demand_signal_type": "VACANCY_HEADCOUNT",
    }
    row.update(overrides)
    return row


def test_detailed_source_semantics_are_separate_from_database_enum(tmp_path):
    path = write_csv(tmp_path, source_row())
    batch = parse_canonical_csv(path, "demand")

    assert batch.valid
    observation = batch.observations[0]
    assert observation.flow_stock_semantics == "annual_flow"
    assert observation.quantity_semantics == "FLOW"

    values = observation.db_values()
    assert values["quantity_unit"] == "persons"
    assert values["quantity_semantics"] == "FLOW"
    assert "flow_stock_semantics" not in values
    assert values["source_id"] == UUID("10000000-0000-0000-0000-000000000001")
    assert values["retrieval_id"] == UUID("20000000-0000-0000-0000-000000000001")


def test_source_backed_row_requires_registered_retrieval_reference(tmp_path):
    path = write_csv(tmp_path, source_row(retrieval_id=""))
    batch = parse_canonical_csv(path, "demand")
    assert not batch.valid
    assert any(issue.field == "retrieval_id" for issue in batch.issues)


def test_database_quantity_semantics_are_validated_independently(tmp_path):
    path = write_csv(tmp_path, source_row(quantity_semantics="CAPACITY"))
    batch = parse_canonical_csv(path, "demand")
    assert not batch.valid
    assert any(issue.field == "quantity_semantics" for issue in batch.issues)


def test_unexpected_dimension_is_rejected_for_declared_grain(tmp_path):
    row = source_row(observation_grain="STATE", district_id="", sector_id="", skill_id="")
    row["district_id"] = "district-1"
    path = write_csv(tmp_path, row)
    batch = parse_canonical_csv(path, "demand")
    assert not batch.valid
    assert any(issue.field == "district_id" for issue in batch.issues)


def test_synthetic_default_generation_id_preserves_detailed_semantics(tmp_path):
    row = source_row(
        source_id="",
        source_release="",
        source_date="",
        retrieval_id="",
        evidence_item_id="",
        provenance_state="SYNTHETIC_DEMO",
        is_synthetic="true",
        generation_run_id="",
        transformation_note="synthetic evaluation fixture",
        flow_stock_semantics="year_end_stock",
        quantity_semantics="STOCK",
    )
    path = write_csv(tmp_path, row)
    run_id = "40000000-0000-0000-0000-000000000001"
    batch = parse_canonical_csv(path, "demand", default_generation_run_id=run_id)

    assert batch.valid
    observation = batch.observations[0]
    assert observation.generation_run_id == run_id
    assert observation.flow_stock_semantics == "year_end_stock"
    assert observation.quantity_semantics == "STOCK"
    assert batch.synthetic_capabilities["demand"]["VACANCY_HEADCOUNT"] == {
        "unit": "persons",
        "flow_stock_semantics": "year_end_stock",
    }
