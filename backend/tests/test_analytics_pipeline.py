from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from app.analytics.engine import AnalyticsConfig, AnalyticsInputError, run_baseline_analytics
from app.ingestion.canonical_csv import CanonicalObservation, ParsedBatch


APPROVED = frozenset({("VACANCY_HEADCOUNT", "WORKER_HEADCOUNT")})


def make_observation(
    kind: str,
    year: int,
    value: int,
    *,
    synthetic: bool = False,
    unit: str = "persons",
    flow: str | None = "annual_headcount",
    signal: str | None = None,
    grain: str = "DISTRICT_SECTOR_SKILL",
    evidence: str | None = None,
    row_number: int = 2,
) -> CanonicalObservation:
    return CanonicalObservation(
        kind=kind,
        state_id="state_test",
        district_id="district_test" if "DISTRICT" in grain else None,
        sector_id="sector_test" if "SECTOR" in grain else None,
        skill_id="skill_test" if "SKILL" in grain else None,
        observation_grain=grain,
        period_type="YEAR",
        period_year=year,
        signal_type=signal or ("VACANCY_HEADCOUNT" if kind == "demand" else "WORKER_HEADCOUNT"),
        value=Decimal(value),
        source_id=None if synthetic else f"00000000-0000-0000-0000-{1 if kind == 'demand' else 2:012d}",
        source_date=date(year, 12, 31),
        retrieval_id=None,
        evidence_item_id=evidence,
        provenance_state="SYNTHETIC_DEMO" if synthetic else "SOURCE_BACKED",
        is_synthetic=synthetic,
        generation_run_id="00000000-0000-0000-0000-000000000099" if synthetic else None,
        transformation_note="deterministic fixture" if synthetic else None,
        unit=unit,
        flow_stock_semantics=flow,
        training_capacity=None,
        enrollment=None,
        completions=None,
    )


def make_batch(kind: str, observations: list[CanonicalObservation]) -> ParsedBatch:
    return ParsedBatch(
        kind=kind,
        observations=tuple(observations),
        issues=(),
        sha256="abc123",
        source_path=f"{kind}.csv",
        synthetic_capabilities={"demand": {}, "supply": {}},
    )


def pair(
    demand_values=(120, 130, 140),
    supply_values=(90, 95, 100),
    years=(2021, 2022, 2023),
    **kwargs,
):
    demand = [make_observation("demand", year, value, row_number=idx + 2, **kwargs)
              for idx, (year, value) in enumerate(zip(years, demand_values, strict=True))]
    supply = [make_observation("supply", year, value, row_number=idx + 8, **kwargs)
              for idx, (year, value) in enumerate(zip(years, supply_values, strict=True))]
    return make_batch("demand", demand), make_batch("supply", supply)


def calculate(demand, supply, **config_kwargs):
    config = AnalyticsConfig(**{"approved_gap_signal_pairs": APPROVED, **config_kwargs})
    return run_baseline_analytics(
        demand,
        supply,
        demand_signal_type="VACANCY_HEADCOUNT",
        supply_signal_type="WORKER_HEADCOUNT",
        config=config,
    )


def test_last_value_forecast_and_gap_contract():
    demand, supply = pair()
    result = calculate(demand, supply)
    assert result["summary"]["sufficient_count"] == 1
    record = result["results"][0]
    assert record["period"] == "2024"
    assert record["forecast_demand"] == 140.0
    assert record["forecast_supply"] == 100.0
    assert record["gap"] == 40.0
    assert record["status"] == "SHORTAGE"
    assert record["gap_eligible"] is True
    assert record["model"]["name"] == "naive_last_value"
    assert record["confidence_level"] == "LOW"
    assert result["metadata"]["database_modified"] is False


def test_gap_is_not_allowed_without_explicit_signal_pair_approval():
    demand, supply = pair()
    config = AnalyticsConfig()
    record = run_baseline_analytics(
        demand, supply,
        demand_signal_type="VACANCY_HEADCOUNT",
        supply_signal_type="WORKER_HEADCOUNT",
        config=config,
    )["results"][0]
    assert record["gap_eligible"] is False
    assert record["gap_eligibility_reason"] == "INCOMPATIBLE_SIGNALS"
    assert record["gap"] is None
    assert record["status"] is None


def test_official_mode_does_not_use_synthetic_supply():
    demand, _ = pair()
    synthetic_supply = make_batch("supply", [
        make_observation("supply", year, value, synthetic=True, row_number=year)
        for year, value in zip((2021, 2022, 2023), (70, 80, 90), strict=True)
    ])
    record = calculate(demand, synthetic_supply, analysis_mode="OFFICIAL")["results"][0]
    assert record["data_status"] == "INSUFFICIENT_DATA"
    assert record["reason_code"] == "REQUIRED_INPUT_MISSING"
    assert record["forecast_supply"] is None
    assert record["gap"] is None


def test_demo_mode_reports_mixed_provenance_and_synthetic_history():
    demand, _ = pair()
    synthetic_supply = make_batch("supply", [
        make_observation("supply", year, value, synthetic=True, row_number=year)
        for year, value in zip((2021, 2022, 2023), (70, 80, 90), strict=True)
    ])
    record = calculate(demand, synthetic_supply, analysis_mode="DEMO")["results"][0]
    assert record["data_status"] == "SUFFICIENT"
    assert record["provenance_state"] == "MIXED_PROVENANCE"
    assert record["confidence_inputs"]["history_periods"] == 0
    assert record["confidence_inputs"]["synthetic_history_periods"] == 3


@pytest.mark.parametrize(
    ("demand_values", "supply_values", "status", "gap"),
    [
        ((100, 100, 100), (100, 100, 100), "BALANCED", 0.0),
        ((120, 120, 120), (100, 100, 100), "SHORTAGE", 20.0),
        ((80, 80, 80), (100, 100, 100), "OVERSUPPLY", -20.0),
        ((0, 0, 0), (40, 40, 40), "NO_DEMAND", -40.0),
    ],
)
def test_gap_classification_is_deterministic(demand_values, supply_values, status, gap):
    demand, supply = pair(demand_values, supply_values)
    record = calculate(demand, supply)["results"][0]
    assert record["status"] == status
    assert record["gap"] == gap


def test_unmatched_units_make_gap_ineligible():
    demand, _ = pair(unit="job_postings")
    _, supply = pair(unit="persons")
    record = calculate(demand, supply)["results"][0]
    assert record["data_status"] == "SUFFICIENT"
    assert record["gap_eligibility_reason"] == "INCOMPATIBLE_UNIT"
    assert record["gap"] is None


def test_latest_period_must_match_for_gap():
    demand, _ = pair(years=(2020, 2021, 2022))
    _, supply = pair(years=(2021, 2022, 2023))
    record = calculate(demand, supply)["results"][0]
    assert record["data_status"] == "SUFFICIENT"
    assert record["gap_eligibility_reason"] == "INCOMPATIBLE_TIME_BASIS"
    assert record["gap"] is None


def test_insufficient_history_preserves_null_analytics():
    demand = make_batch("demand", [
        make_observation("demand", year, 100) for year in (2022, 2023)
    ])
    supply = make_batch("supply", [
        make_observation("supply", year, 80) for year in (2022, 2023)
    ])
    record = calculate(demand, supply)["results"][0]
    assert record["data_status"] == "INSUFFICIENT_DATA"
    assert record["reason_code"] == "INSUFFICIENT_HISTORY"
    assert record["demand_quantity"] == 100.0
    assert record["forecast_demand"] is None
    assert record["gap"] is None
    assert record["confidence_level"] is None


def test_aggregate_grain_is_not_expanded_into_skill_results():
    demand = make_batch("demand", [
        make_observation("demand", year, 100, grain="DISTRICT") for year in (2021, 2022, 2023)
    ])
    supply = make_batch("supply", [
        make_observation("supply", year, 80, grain="DISTRICT") for year in (2021, 2022, 2023)
    ])
    result = calculate(demand, supply)
    assert result["results"] == []
    assert result["summary"]["target_count"] == 0


def test_duplicate_series_period_fails_closed():
    demand, supply = pair()
    rows = [*demand.observations, make_observation("demand", 2022, 999, row_number=50)]
    demand = make_batch("demand", rows)
    with pytest.raises(AnalyticsInputError, match="ambiguous"):
        calculate(demand, supply)


def test_noncontiguous_years_are_not_fabricated():
    demand, supply = pair(years=(2020, 2022, 2023))
    record = calculate(demand, supply)["results"][0]
    assert record["period"] == "2024"
    assert record["confidence_inputs"]["is_contiguous"] is False
    assert record["confidence_inputs"]["total_history_periods"] == 3


def test_input_batches_with_validation_issues_are_rejected():
    good_demand, good_supply = pair()
    bad_demand = ParsedBatch(
        kind="demand",
        observations=good_demand.observations,
        issues=(type("Issue", (), {"__str__": lambda self: "row 4 invalid"})(),),
        sha256="abc",
        source_path="bad.csv",
        synthetic_capabilities={"demand": {}, "supply": {}},
    )
    with pytest.raises(AnalyticsInputError, match="failed canonical validation"):
        calculate(bad_demand, good_supply)
