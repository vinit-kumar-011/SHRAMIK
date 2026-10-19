from __future__ import annotations

import csv
from pathlib import Path

import pytest

from ml.analytics_engine import AnalyticsConfig, AnalyticsInputError, compute_analytics
from ml.ingestion import (
    IngestionValidationError,
    Observation,
    REQUIRED_COLUMNS,
    read_observations_csv,
    validate_observations,
)


DEMAND_SOURCE = "11111111-1111-4111-8111-111111111111"
SUPPLY_SOURCE = "22222222-2222-4222-8222-222222222222"
EVIDENCE_ID = "33333333-3333-4333-8333-333333333333"
GENERATION_ID = "44444444-4444-4444-8444-444444444444"


def observation(
    kind: str,
    year: int,
    quantity: float,
    *,
    source_id: str | None = None,
    signal_type: str | None = None,
    provenance: str = "SOURCE_BACKED",
    unit: str = "HEADCOUNT",
    semantics: str = "ANNUAL_FLOW",
    evidence: str | None = EVIDENCE_ID,
    generation_run_id: str | None = None,
) -> Observation:
    synthetic = provenance == "SYNTHETIC_DEMO"
    return Observation(
        kind=kind,
        state_id="state-od",
        district_id="district-a",
        sector_id="sector-it",
        skill_id="skill-dev",
        observation_grain="DISTRICT_SECTOR_SKILL",
        period_type="YEAR",
        period_year=year,
        quantity=quantity,
        signal_type=signal_type or ("JOB_POSTINGS" if kind == "DEMAND" else "TRAINING_COMPLETIONS"),
        source_id=None if synthetic else (source_id or (DEMAND_SOURCE if kind == "DEMAND" else SUPPLY_SOURCE)),
        retrieval_id=None if synthetic else "55555555-5555-4555-8555-555555555555",
        evidence_item_id=None if synthetic else evidence,
        provenance_state=provenance,
        is_synthetic=synthetic,
        generation_run_id=generation_run_id or (GENERATION_ID if synthetic else None),
        unit=unit,
        flow_stock_semantics=semantics,
        occupation_scope="DISTRICT_SECTOR_SKILL:district-a:sector-it:skill-dev",
        transformation_note="Synthetic test fixture" if synthetic else None,
        source_date=None,
    )


def fixture_rows(years=(2022, 2023, 2024), *, supply_unit="HEADCOUNT"):
    rows = []
    for i, year in enumerate(years):
        rows.append(observation("DEMAND", year, 100 + 15 * i))
        rows.append(observation("SUPPLY", year, 60 + 5 * i, unit=supply_unit))
    return tuple(rows)


def run(rows, mode="OFFICIAL", **kwargs):
    return compute_analytics(
        rows,
        analysis_mode=mode,
        demand_signal_type="JOB_POSTINGS",
        supply_signal_type="TRAINING_COMPLETIONS",
        config=AnalyticsConfig(**kwargs),
        calculation_run_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    )


def test_naive_forecast_gap_and_warning_are_deterministic():
    result = run(fixture_rows())
    forecast = result["forecast_results"][0]

    assert forecast["data_status"] == "SUFFICIENT"
    assert forecast["period"] == "2025"
    assert forecast["forecast_demand"] == 130
    assert forecast["forecast_supply"] == 70
    assert forecast["gap"] == 60
    assert forecast["status"] == "SHORTAGE"
    assert forecast["forecast_uncertainty"] is None
    assert forecast["model"]["name"] == "naive_last_value"
    assert forecast["confidence_level"] == "MEDIUM"
    assert len(result["early_warnings"]) == 1
    assert result["early_warnings"][0]["warning_type"] == "PROJECTED_SHORTAGE"
    assert result["early_warnings"][0]["severity"] == "CRITICAL"


def test_insufficient_history_preserves_nulls_instead_of_zeroes():
    result = run(fixture_rows((2023, 2024)))
    forecast = result["forecast_results"][0]

    assert forecast["data_status"] == "INSUFFICIENT_DATA"
    assert forecast["reason_code"] == "INSUFFICIENT_HISTORY"
    assert forecast["forecast_demand"] is None
    assert forecast["forecast_supply"] is None
    assert forecast["gap"] is None
    assert forecast["status"] is None
    assert forecast["confidence_level"] is None
    assert result["early_warnings"] == []


def test_incompatible_units_keep_forecasts_but_block_gap():
    result = run(fixture_rows(supply_unit="COMPLETION_COUNT"))
    forecast = result["forecast_results"][0]

    assert forecast["data_status"] == "SUFFICIENT"
    assert forecast["gap_eligible"] is False
    assert forecast["gap_eligibility_reason"] == "INCOMPATIBLE_UNIT"
    assert forecast["gap"] is None
    assert forecast["status"] is None
    assert result["early_warnings"] == []


def test_official_mode_does_not_count_synthetic_history():
    rows = []
    for year, demand, supply in ((2022, 100, 60), (2023, 110, 65)):
        rows.extend([observation("DEMAND", year, demand), observation("SUPPLY", year, supply)])
    rows.extend([
        observation("DEMAND", 2024, 130, provenance="SYNTHETIC_DEMO"),
        observation("SUPPLY", 2024, 72, provenance="SYNTHETIC_DEMO"),
    ])

    official = run(rows, mode="OFFICIAL")["forecast_results"][0]
    demo = run(rows, mode="DEMO")["forecast_results"][0]

    assert official["data_status"] == "INSUFFICIENT_DATA"
    assert official["confidence_inputs"]["history_periods"] == 2
    assert demo["data_status"] == "SUFFICIENT"
    assert demo["provenance_state"] == "MIXED_PROVENANCE"
    assert demo["confidence_inputs"]["history_periods"] == 2
    assert demo["confidence_inputs"]["total_history_periods"] == 3
    assert demo["confidence_level"] == "LOW"


def test_multiple_source_ids_are_never_merged_implicitly():
    rows = list(fixture_rows())
    rows.append(observation("DEMAND", 2021, 75, source_id="66666666-6666-4666-8666-666666666666"))
    with pytest.raises(AnalyticsInputError, match="Multiple demand sources"):
        run(rows)


def test_missing_year_does_not_become_annual_emerging_growth():
    rows = []
    for year, demand, supply in ((2022, 100, 60), (2023, 120, 70), (2025, 180, 90)):
        rows.extend([observation("DEMAND", year, demand), observation("SUPPLY", year, supply)])
    signal = run(rows)["emerging_skill_signals"][0]

    assert signal["is_contiguous"] is False
    assert signal["data_status"] == "INSUFFICIENT_DATA"
    assert signal["emerging_skill_status"] == "INSUFFICIENT_DATA"
    assert signal["recent_growth_rate"] is None


def test_sequential_growth_can_flag_emerging_skill():
    rows = []
    for year, demand, supply in ((2022, 100, 60), (2023, 110, 65), (2024, 150, 70)):
        rows.extend([observation("DEMAND", year, demand), observation("SUPPLY", year, supply)])
    signal = run(rows)["emerging_skill_signals"][0]

    assert signal["data_status"] == "SUFFICIENT"
    assert signal["emerging_skill_status"] == "EMERGING"
    assert signal["recent_growth_rate"] == pytest.approx(150 / 110 - 1)
    assert 0 <= signal["signal_strength"] <= 1


def test_csv_parser_preserves_blank_quantity_and_rejects_bad_grain(tmp_path: Path):
    path = tmp_path / "valid.csv"
    rows = []
    row = {key: "" for key in REQUIRED_COLUMNS}
    row.update({
        "kind": "DEMAND",
        "state_id": "state-od",
        "district_id": "district-a",
        "sector_id": "sector-it",
        "skill_id": "skill-dev",
        "observation_grain": "DISTRICT_SECTOR_SKILL",
        "period_type": "YEAR",
        "period_year": "2024",
        "quantity": "",
        "signal_type": "JOB_POSTINGS",
        "source_id": DEMAND_SOURCE,
        "retrieval_id": "55555555-5555-4555-8555-555555555555",
        "evidence_item_id": "",
        "provenance_state": "SOURCE_BACKED",
        "is_synthetic": "false",
        "generation_run_id": "",
        "unit": "HEADCOUNT",
        "flow_stock_semantics": "ANNUAL_FLOW",
        "occupation_scope": "DISTRICT_SECTOR_SKILL:district-a:sector-it:skill-dev",
        "transformation_note": "",
        "source_date": "2025-01-01",
    })
    rows.append(row)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=sorted(REQUIRED_COLUMNS | {"source_date"}))
        writer.writeheader()
        writer.writerows(rows)

    parsed = read_observations_csv(path)
    assert parsed.row_count == 1
    assert parsed.observations[0].quantity is None

    rows[0]["observation_grain"] = "STATE"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=sorted(REQUIRED_COLUMNS | {"source_date"}))
        writer.writeheader()
        writer.writerows(rows)
    with pytest.raises(IngestionValidationError, match="district_id does not match"):
        read_observations_csv(path)


def test_csv_parser_rejects_duplicate_same_source_period():
    duplicate = observation("DEMAND", 2024, 100)
    with pytest.raises(IngestionValidationError, match="Duplicate observation"):
        validate_observations([duplicate, duplicate])
