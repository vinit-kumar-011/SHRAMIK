"""Candidate models vs the naive baseline (ML output contract v1.1, sections 9.1, 10, 11, 20)."""
from datetime import date

from ml.config.model_selection import MIN_EVAL_ORIGINS, MIN_TRAIN_POINTS
from ml.contract import assert_valid
from ml.models import ModelNotApplicable, backtest, forecast, select_model
from ml.pipeline import build_forecast_record, to_forecast_results_row
from ml.series import build_series
from .helpers import PROFILE, obs, raises

MIN_DEMAND = 5


def run(demand, supply, target=2026, cutoff=2025, mode="OFFICIAL"):
    return build_forecast_record(
        district_id="D1", sector_id="SEC1", skill_id="S1", target_year=target, cutoff_year=cutoff,
        analysis_mode=mode, demand_observations=demand, supply_observations=supply,
        demand_profile=PROFILE, supply_profile=PROFILE, min_forecast_demand=MIN_DEMAND,
        as_of=date(2026, 10, 20))


def series(values, start=2018):
    return [obs(start + i, v) for i, v in enumerate(values)]


TREND = series([100, 110, 120, 130, 140, 150, 160, 170])          # 2018-2025
TREND_SUPPLY = series([50, 55, 60, 65, 70, 75, 80, 85])
ZIGZAG = series([100, 120, 100, 120, 100, 120, 100, 120])
ZIGZAG_SUPPLY = series([60, 80, 60, 80, 60, 80, 60, 80])
STEP = series([100, 100, 100, 200, 200, 200, 200, 200])
STEP_SUPPLY = series([50, 50, 50, 90, 90, 90, 90, 90])


def selection(r):
    return r["confidence_inputs"]["model_selection"]


def test_short_history_keeps_the_baseline():
    five = series([100, 110, 120, 130, 140], start=2021)
    r = run(five, series([80] * 5, start=2021))
    assert r["model"]["name"] == "naive_last_value" and r["model"]["is_baseline"] is True
    assert selection(r)["reason"] == "BASELINE_DEFAULT_SHORT_HISTORY"
    assert r["forecast_demand"] == 140.0
    assert_valid(r, min_forecast_demand=MIN_DEMAND)


def test_clear_trend_selects_linear_trend():
    r = run(TREND, TREND_SUPPLY)
    assert_valid(r, min_forecast_demand=MIN_DEMAND)
    assert r["model"] == {"name": "linear_trend", "version": "v1", "is_baseline": False,
                          "trained_through_period": "2025"}
    assert selection(r)["reason"] == "CANDIDATE_BETTER"
    assert (r["forecast_demand"], r["forecast_supply"]) == (180.0, 90.0)
    assert r["demand_quantity"] == 170.0          # latest observed value, not the forecast
    assert r["forecast_uncertainty"] is None      # no validated interval
    assert r["confidence_inputs"]["forecast_error"] == 0.0


def test_mean_reverting_series_selects_smoothing():
    r = run(ZIGZAG, ZIGZAG_SUPPLY)
    assert_valid(r, min_forecast_demand=MIN_DEMAND)
    assert r["model"]["name"] == "simple_exp_smoothing"


def test_baseline_wins_when_candidates_do_not_help():
    r = run(STEP, STEP_SUPPLY)
    assert r["model"]["name"] == "naive_last_value"
    assert selection(r)["reason"] == "BASELINE_NOT_BEATEN"
    assert r["forecast_demand"] == 200.0


def test_flat_series_ties_never_promote_a_candidate():
    r = run(series([100] * 8), series([50] * 8))
    assert r["model"]["name"] == "naive_last_value"
    assert selection(r)["win_share_vs_baseline"]["linear_trend"] is None


def test_selection_ignores_years_after_the_cutoff():
    future = [obs(2026, 9999), obs(2027, 1)]
    a, b = run(TREND, TREND_SUPPLY), run(TREND + future, TREND_SUPPLY + future)
    assert a == b


def test_multi_year_horizon_extrapolates_by_the_real_year_gap():
    r = run(TREND, TREND_SUPPLY, target=2028)
    assert (r["forecast_demand"], r["forecast_supply"]) == (200.0, 100.0)


def test_negative_trend_is_floored_and_reported():
    falling = series([80, 70, 60, 50, 40, 30, 20, 10])
    r = run(falling, series([40, 35, 30, 25, 20, 15, 10, 5]), target=2028)
    assert r["model"]["name"] == "linear_trend"
    assert r["forecast_demand"] == 0.0 and selection(r)["floored_at_zero"] is True
    assert r["status"] == "NO_DEMAND"
    assert_valid(r, min_forecast_demand=MIN_DEMAND)


def test_smoothing_refuses_missing_years_and_trend_uses_real_years():
    pts = ((2018, 100.0), (2019, 120.0), (2021, 100.0))
    assert raises(ModelNotApplicable, forecast, "simple_exp_smoothing", pts, 2022)
    value, _ = forecast("linear_trend", ((2018, 10.0), (2019, 20.0), (2021, 40.0)), 2022)
    assert float(value) == 50.0


def test_gap_just_before_cutoff_falls_back_to_baseline():
    zig = [o for o in series([100, 120, 100, 120, 100, 120, 100, 120, 100]) if o.period_year != 2025]
    sup = [o for o in series([60, 80, 60, 80, 60, 80, 60, 80, 60]) if o.period_year != 2025]
    r = run(zig, sup, target=2027, cutoff=2026)
    assert r["model"]["name"] == "naive_last_value"
    assert selection(r)["reason"] == "BASELINE_FALLBACK_NOT_APPLICABLE"
    assert_valid(r, min_forecast_demand=MIN_DEMAND)


def test_backtest_never_uses_the_year_it_predicts():
    pts = tuple((2018 + i, float(v)) for i, v in enumerate([1, 2, 4, 8, 16, 32]))
    origins = backtest(pts, ("naive_last_value",))
    assert [o.year for o in origins] == [2018 + k for k in range(MIN_TRAIN_POINTS, 6)]
    assert all(o.predictions["naive_last_value"] == pts[i + MIN_TRAIN_POINTS - 1][1]
               for i, o in enumerate(origins))


def test_selection_needs_enough_origins_in_every_series():
    long = build_series(TREND, "OFFICIAL", 2025)
    short = build_series(series([1, 2, 3, 4, 5], start=2021), "OFFICIAL", 2025)
    rep = select_model([long, short])
    assert rep["origins"] < MIN_EVAL_ORIGINS and rep["selected"] == "naive_last_value"


def test_candidate_record_maps_to_forecast_results_row():
    r = run(TREND, TREND_SUPPLY)
    row = to_forecast_results_row(r, model_version_id="mv-linear-v1", calculation_run_id="run-1",
                                  calculated_at="2026-10-20T00:00:00Z")
    assert row["confidence_inputs"]["model_selection"]["selected"] == "linear_trend"
    assert row["is_active"] is False


# Boundary cases found by search: flat supply (all models tie there), cutoff 2024.
FLAT7 = [obs(2018 + i, 50) for i in range(7)]


def test_small_improvement_is_not_enough():
    # linear_trend wins 3 of 4 origins but cuts pooled error by only ~6.6% (< 10%)
    r = run(series([125, 121, 122, 103, 89, 96, 88]), FLAT7, target=2025, cutoff=2024)
    sel = selection(r)
    assert sel["win_share_vs_baseline"]["linear_trend"] == 0.75
    assert 0.9 * sel["scaled_mae"]["naive_last_value"] < sel["scaled_mae"]["linear_trend"]
    assert r["model"]["name"] == "naive_last_value" and sel["reason"] == "BASELINE_NOT_BEATEN"


def test_big_improvement_from_one_lucky_year_is_not_enough():
    # linear_trend cuts pooled error by ~20% but wins only half the origins
    r = run(series([98, 109, 109, 109, 129, 87, 115]), FLAT7, target=2025, cutoff=2024)
    sel = selection(r)
    assert sel["win_share_vs_baseline"]["linear_trend"] == 0.5
    assert sel["scaled_mae"]["linear_trend"] <= 0.9 * sel["scaled_mae"]["naive_last_value"]
    assert r["model"]["name"] == "naive_last_value" and sel["reason"] == "BASELINE_NOT_BEATEN"
