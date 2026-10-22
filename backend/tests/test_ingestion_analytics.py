from __future__ import annotations

from app.ingestion.analytics import build_analytics_outputs


def rows(years, values, *, kind, value_field=None, unit="persons", semantics="STOCK", source_id=None):
    result = []
    for year, value in zip(years, values):
        row = {
            "state_id": "IN-OD",
            "district_id": "IN-LGD-355",
            "skill_id": "nco2015_7112_0200",
            "period_year": year,
            "quantity_unit": unit,
            "quantity_semantics": semantics,
            "source_id": source_id,
            "is_synthetic": kind == "DEMO",
        }
        field = value_field or ("demand_quantity" if kind == "demand" else "supply_quantity")
        row[field] = value
        result.append(row)
    return result


def test_builds_baseline_only_from_compatible_matching_years() -> None:
    demand = rows([2021, 2022, 2023, 2024], [100, 110, 120, 130], kind="demand")
    supply = rows([2021, 2022, 2023, 2024], [90, 100, 110, 120], kind="supply")

    outputs, counts = build_analytics_outputs(demand, supply, analysis_mode="OFFICIAL")

    assert len(outputs) == 1
    output = outputs[0]
    assert output["period_year"] == 2025
    assert output["forecast_demand"] == 130
    assert output["forecast_supply"] == 120
    assert output["gap"] == 10
    assert output["status"] == "SHORTAGE"
    assert output["confidence_level"] == "MEDIUM"
    assert output["provenance_state"] == "SOURCE_BACKED"
    assert output["evidence_coverage"] == 1.0
    assert output["confidence_inputs"]["synthetic_history_periods"] == 0
    assert counts["forecasts_built"] == 1


def test_does_not_calculate_a_gap_across_different_units() -> None:
    demand = rows([2021, 2022, 2023], [100, 110, 120], kind="demand", unit="vacancies")
    supply = rows([2021, 2022, 2023], [90, 100, 110], kind="supply", unit="persons")

    outputs, counts = build_analytics_outputs(demand, supply, analysis_mode="OFFICIAL")

    assert outputs == []
    assert counts["incompatible_series"] == 1


def test_does_not_compare_flow_with_stock() -> None:
    demand = rows([2021, 2022, 2023], [100, 110, 120], kind="demand", semantics="FLOW")
    supply = rows([2021, 2022, 2023], [90, 100, 110], kind="supply", semantics="STOCK")

    outputs, counts = build_analytics_outputs(demand, supply, analysis_mode="OFFICIAL")

    assert outputs == []
    assert counts["incompatible_series"] == 1


def test_insufficient_history_produces_no_forecast() -> None:
    demand = rows([2022, 2023], [100, 110], kind="demand")
    supply = rows([2022, 2023], [90, 100], kind="supply")

    outputs, counts = build_analytics_outputs(demand, supply, analysis_mode="DEMO")

    assert outputs == []
    assert counts["insufficient_history"] == 1


def test_non_contiguous_history_is_flagged_and_reduces_confidence() -> None:
    demand = rows([2020, 2021, 2023], [100, 110, 125], kind="demand")
    supply = rows([2020, 2021, 2023], [90, 100, 115], kind="supply")

    outputs, _ = build_analytics_outputs(demand, supply, analysis_mode="OFFICIAL")

    assert len(outputs) == 1
    assert outputs[0]["period_year"] == 2024
    assert outputs[0]["confidence_inputs"]["is_contiguous"] is False
    assert outputs[0]["confidence_inputs"]["data_coverage"] == 0.75
    assert outputs[0]["confidence_level"] == "LOW"


def test_synthetic_outputs_are_labelled_and_evidence_coverage_is_zero() -> None:
    demand = rows([2021, 2022, 2023, 2024, 2025], [100, 110, 125, 145, 175], kind="DEMO", value_field="demand_quantity")
    supply = rows([2021, 2022, 2023, 2024, 2025], [90, 100, 105, 110, 115], kind="DEMO", value_field="supply_quantity")

    outputs, _ = build_analytics_outputs(demand, supply, analysis_mode="DEMO")

    assert len(outputs) == 1
    output = outputs[0]
    assert output["provenance_state"] == "SYNTHETIC_DEMO"
    assert output["confidence_inputs"]["synthetic_history_periods"] == 5
    assert output["evidence_coverage"] == 0.0
    assert output["warning_severity"] in {"MEDIUM", "HIGH"}
    assert output["emerging_skill_status"] == "EMERGING"


def test_duplicate_year_rows_are_not_summed() -> None:
    demand = rows([2021, 2022, 2023], [100, 110, 120], kind="demand")
    demand.append(dict(demand[-1]))
    supply = rows([2021, 2022, 2023], [90, 100, 110], kind="supply")

    outputs, counts = build_analytics_outputs(demand, supply, analysis_mode="OFFICIAL")

    assert outputs == []
    assert counts["duplicate_series"] == 1
