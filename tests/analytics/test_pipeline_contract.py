import copy
from datetime import date

from ml.contract import ContractViolation, assert_valid, validate_record
from ml.gap import SignalProfile
from ml.pipeline import build_forecast_record, to_forecast_results_row
from .helpers import PROFILE, obs, raises

MIN_DEMAND = 5  # injected, as the contract requires (MIN_FORECAST_DEMAND is TBD)


def run(demand, supply, mode="OFFICIAL", target=2026, cutoff=2025, **kw):
    return build_forecast_record(
        district_id="D1", sector_id="SEC1", skill_id="S1", target_year=target, cutoff_year=cutoff,
        analysis_mode=mode, demand_observations=demand, supply_observations=supply,
        demand_profile=kw.pop("demand_profile", PROFILE), supply_profile=kw.pop("supply_profile", PROFILE),
        min_forecast_demand=MIN_DEMAND, as_of=date(2026, 10, 19), **kw)


FIVE_SOURCE = [obs(y, 100 + 10 * i) for i, y in enumerate(range(2021, 2026))]
FIVE_SUPPLY = [obs(y, 80) for y in range(2021, 2026)]
TWO_PLUS_THREE = [obs(2024, 120), obs(2025, 130)] + [obs(y, 100, synthetic=True) for y in (2021, 2022, 2023)]


def test_official_sufficient_record_is_valid():
    r = run(FIVE_SOURCE, FIVE_SUPPLY)
    assert_valid(r, min_forecast_demand=MIN_DEMAND)
    assert r["data_status"] == "SUFFICIENT" and r["provenance_state"] == "SOURCE_BACKED"
    assert r["forecast_demand"] == 140.0 and r["forecast_supply"] == 80.0
    assert r["gap"] == 60.0 and r["status"] == "SHORTAGE"
    assert r["model"]["trained_through_period"] == "2025" and r["period"] == "2026"
    assert r["forecast_uncertainty"] is None
    assert r["confidence_inputs"]["history_periods"] == 5


def test_official_with_short_source_history_is_insufficient_and_keeps_quantities():
    r = run(TWO_PLUS_THREE, FIVE_SUPPLY)
    assert_valid(r)
    assert (r["data_status"], r["reason_code"]) == ("INSUFFICIENT_DATA", "INSUFFICIENT_HISTORY")
    assert r["forecast_demand"] is None and r["gap"] is None and r["model"] is None
    assert r["demand_quantity"] == 130.0          # observed value preserved
    assert r["confidence_inputs"]["synthetic_history_periods"] == 0


def test_demo_completes_series_and_is_labelled_mixed():
    r = run(TWO_PLUS_THREE, FIVE_SUPPLY, mode="DEMO")
    assert_valid(r)
    assert r["data_status"] == "SUFFICIENT" and r["provenance_state"] == "MIXED_PROVENANCE"
    ci = r["confidence_inputs"]
    assert (ci["history_periods"], ci["synthetic_history_periods"], ci["total_history_periods"]) == (2, 3, 5)
    assert r["confidence_level"] in ("LOW", "MEDIUM")


def test_demo_fully_synthetic_is_capped_low():
    syn = [obs(y, 100, synthetic=True) for y in range(2021, 2026)]
    r = run(syn, [obs(y, 50, synthetic=True) for y in range(2021, 2026)], mode="DEMO")
    assert_valid(r)
    assert r["provenance_state"] == "SYNTHETIC_DEMO" and r["confidence_level"] == "LOW"
    assert r["evidence_coverage"] == 0.0


def test_missing_supply_is_required_input_missing():
    r = run(FIVE_SOURCE, [])
    assert_valid(r)
    assert (r["data_status"], r["reason_code"]) == ("INSUFFICIENT_DATA", "REQUIRED_INPUT_MISSING")


def test_source_unavailable():
    r = run(FIVE_SOURCE, FIVE_SUPPLY, source_available=False)
    assert_valid(r)
    assert (r["data_status"], r["reason_code"]) == ("UNAVAILABLE", "SOURCE_UNAVAILABLE")


def test_incompatible_signals_keep_forecasts_but_no_gap():
    seats = SignalProfile(unit="SEATS", flow_stock="FLOW", time_basis="CALENDAR_YEAR",
                          geography="D1", occupation_scope="S1")
    r = run(FIVE_SOURCE, FIVE_SUPPLY, supply_profile=seats)
    assert_valid(r, min_forecast_demand=MIN_DEMAND)
    assert r["gap_eligible"] is False and r["gap_eligibility_reason"] == "INCOMPATIBLE_UNIT"
    assert r["gap"] is None and r["status"] is None and r["forecast_supply"] == 80.0


def test_cannot_forecast_the_past():
    raises(ValueError, run, FIVE_SOURCE, FIVE_SUPPLY, target=2025, cutoff=2025)


def test_three_source_periods_never_high():
    three = [obs(y, 100) for y in (2023, 2024, 2025)]
    r = run(three, [obs(y, 10) for y in (2023, 2024, 2025)])
    assert_valid(r)
    assert r["confidence_level"] != "HIGH"


def test_db_row_mapping():
    r = run(FIVE_SOURCE, FIVE_SUPPLY)
    row = to_forecast_results_row(r, model_version_id="mv-1", calculation_run_id="run-1",
                                  calculated_at="2026-10-19T12:00:00+05:30")
    assert row["period_year"] == 2026 and row["is_active"] is False and "model" not in row
    raises(ValueError, to_forecast_results_row, r, model_version_id=None, calculation_run_id="x", calculated_at="x")


# ---------------------------------------------------------------- validator catches bad records
def _broken(change):
    r = copy.deepcopy(run(FIVE_SOURCE, FIVE_SUPPLY))
    change(r)
    return validate_record(r, min_forecast_demand=MIN_DEMAND)


def test_validator_rejects_official_mixed():
    assert _broken(lambda r: r.update(provenance_state="MIXED_PROVENANCE"))


def test_validator_rejects_wrong_gap_arithmetic():
    assert _broken(lambda r: r.update(gap=61.0))


def test_validator_rejects_leakage():
    assert _broken(lambda r: r["model"].update(trained_through_period="2026"))


def test_validator_rejects_fabricated_uncertainty():
    assert _broken(lambda r: r.update(forecast_uncertainty={"available": True, "lower": 1, "upper": 2, "level": 0.8}))


def test_validator_rejects_high_confidence_with_short_history():
    def change(r):
        r["confidence_level"] = "HIGH"
        r["confidence_inputs"]["history_periods"] = 3
        r["confidence_inputs"]["total_history_periods"] = 3
    assert _broken(change)


def test_validator_rejects_bad_reason_mapping_and_leftover_values():
    r = run(TWO_PLUS_THREE, FIVE_SUPPLY)
    bad = dict(r, reason_code="MODEL_FAILURE")
    assert validate_record(bad)
    leftover = dict(r, forecast_demand=10.0)
    assert validate_record(leftover)
    raises(ContractViolation, assert_valid, leftover)


def test_validator_rejects_no_demand_misuse():
    assert _broken(lambda r: r.update(status="NO_DEMAND"))  # demand 140 >= 5
