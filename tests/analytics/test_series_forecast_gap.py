from decimal import Decimal

from ml.confidence import apply_caps, max_allowed_level
from ml.forecast import naive_backtest_error, naive_last_value
from ml.gap import ConfigurationError, SignalProfile, check_gap_eligibility, classify_status
from ml.series import Observation, SeriesConflictError, build_series
from .helpers import PROFILE, obs, raises


# ---------------------------------------------------------------- series
def test_official_ignores_synthetic_and_counts_source_backed():
    s = build_series([obs(2021, 10), obs(2022, 12), obs(2023, 14, synthetic=True)], "OFFICIAL", 2025)
    assert s.years == [2021, 2022]
    assert (s.history_periods, s.synthetic_history_periods, s.total_history_periods) == (2, 0, 2)
    assert s.provenance_state == "SOURCE_BACKED"


def test_demo_mixes_and_labels_mixed_provenance():
    s = build_series([obs(2021, 10), obs(2022, 12), obs(2023, 14, synthetic=True)], "DEMO", 2025)
    assert (s.history_periods, s.synthetic_history_periods, s.total_history_periods) == (2, 1, 3)
    assert s.provenance_state == "MIXED_PROVENANCE"


def test_missing_quantity_is_not_zero_and_not_used():
    s = build_series([obs(2021, 10), obs(2022, None), obs(2023, 0)], "OFFICIAL", 2025)
    assert s.years == [2021, 2023]          # None dropped, real 0 kept
    assert ("MISSING_QUANTITY" in [r for _, r in s.excluded])


def test_non_contiguous_is_allowed_and_flagged():
    s = build_series([obs(2021, 1), obs(2022, 2), obs(2024, 3)], "OFFICIAL", 2025)
    assert s.total_history_periods == 3 and s.is_contiguous is False


def test_years_after_cutoff_are_excluded():
    s = build_series([obs(2024, 1), obs(2025, 2), obs(2026, 3)], "OFFICIAL", 2025)
    assert s.years == [2024, 2025]


def test_two_values_for_one_year_is_refused():
    raises(SeriesConflictError, build_series, [obs(2024, 1), obs(2024, 2, source="src-2")], "OFFICIAL", 2025)


def test_negative_and_invalid_year_rejected():
    s = build_series([Observation(24, 5), obs(2024, -1), obs(2025, 3)], "OFFICIAL", 2025)
    assert s.years == [2025]


# ---------------------------------------------------------------- forecast
def test_naive_uses_latest_even_when_non_contiguous():
    s = build_series([obs(2021, 5), obs(2024, 9)], "OFFICIAL", 2025)
    assert naive_last_value(s) == Decimal("9")


def test_backtest_error_is_time_aware():
    s = build_series([obs(2021, 100), obs(2022, 110), obs(2023, 0)], "OFFICIAL", 2025)
    # only 2022 is comparable (2023 actual is 0 and skipped): |110-100|/110
    assert naive_backtest_error(s) == round(10 / 110, 4)


# ---------------------------------------------------------------- gap
def test_gap_boundary_exactly_ten_percent_is_balanced():
    assert classify_status(100, 90, True, 1) == (Decimal("10.00"), "BALANCED")
    assert classify_status(100, 110, True, 1) == (Decimal("-10.00"), "BALANCED")


def test_gap_shortage_and_oversupply():
    assert classify_status(100, 89.99, True, 1)[1] == "SHORTAGE"
    assert classify_status(100, 110.01, True, 1)[1] == "OVERSUPPLY"


def test_no_demand_takes_precedence_even_when_ineligible():
    assert classify_status(3, 50, False, 5) == (None, "NO_DEMAND")
    assert classify_status(3, 50, True, 5) == (Decimal("-47.00"), "NO_DEMAND")


def test_ineligible_without_no_demand_has_no_status():
    assert classify_status(100, 50, False, 5) == (None, None)


def test_min_forecast_demand_must_be_explicit():
    raises(ConfigurationError, classify_status, 100, 50, True, None)


def test_eligibility_reasons_in_order():
    def p(**kw):
        return SignalProfile(**{**PROFILE.__dict__, **kw})
    assert check_gap_eligibility(PROFILE, PROFILE) == (True, None)
    assert check_gap_eligibility(PROFILE, p(unit="SEATS")) == (False, "INCOMPATIBLE_UNIT")
    assert check_gap_eligibility(PROFILE, p(flow_stock="STOCK")) == (False, "INCOMPATIBLE_FLOW_STOCK")
    assert check_gap_eligibility(PROFILE, p(time_basis="ACADEMIC_YEAR")) == (False, "INCOMPATIBLE_TIME_BASIS")
    assert check_gap_eligibility(PROFILE, p(geography="D2")) == (False, "INCOMPATIBLE_GEOGRAPHY")
    assert check_gap_eligibility(PROFILE, p(occupation_scope="S2")) == (False, "INCOMPATIBLE_OCCUPATION_SCOPE")
    assert check_gap_eligibility(PROFILE, p(unit=None)) == (False, "INCOMPATIBLE_SIGNALS")


# ---------------------------------------------------------------- confidence caps
def test_confidence_caps():
    assert max_allowed_level(4, "SOURCE_BACKED") == "MEDIUM"
    assert max_allowed_level(5, "SOURCE_BACKED") == "HIGH"
    assert max_allowed_level(9, "MIXED_PROVENANCE") == "MEDIUM"
    assert max_allowed_level(9, "SYNTHETIC_DEMO") == "LOW"
    assert apply_caps("HIGH", 3, "SOURCE_BACKED") == "MEDIUM"
    assert apply_caps("LOW", 9, "SOURCE_BACKED") == "LOW"
