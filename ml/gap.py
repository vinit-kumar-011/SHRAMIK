"""Gap eligibility and status classification (ML output contract v1.1,
sections 12–15; canonical dataset plan section 9).

A gap is only calculated when demand and supply describe comparable things.
If comparability cannot be shown, the gap stays null with a reason. The
resulting number is a skill-pipeline pressure indicator, not a literal
labour-force shortage.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional

from ml.config import GAP_THRESHOLD_PCT

TWO_DP = Decimal("0.01")


class ConfigurationError(RuntimeError):
    pass


@dataclass(frozen=True)
class SignalProfile:
    """What a demand or supply series actually measures. Every field must be
    stated by the ingestion layer; None means 'not documented'."""

    unit: Optional[str]            # e.g. "PERSONS"
    flow_stock: Optional[str]      # "FLOW" (per year) or "STOCK" (at a point)
    time_basis: Optional[str]      # e.g. "CALENDAR_YEAR", "ACADEMIC_YEAR"
    geography: Optional[str]       # the district (or state) the series covers
    occupation_scope: Optional[str]  # the canonical skill the series covers


def q2(value) -> Decimal:
    return Decimal(str(value)).quantize(TWO_DP, rounding=ROUND_HALF_UP)


def check_gap_eligibility(demand: SignalProfile, supply: SignalProfile):
    """Return (gap_eligible, gap_eligibility_reason)."""
    checks = (
        ("unit", "INCOMPATIBLE_UNIT"),
        ("flow_stock", "INCOMPATIBLE_FLOW_STOCK"),
        ("time_basis", "INCOMPATIBLE_TIME_BASIS"),
        ("geography", "INCOMPATIBLE_GEOGRAPHY"),
        ("occupation_scope", "INCOMPATIBLE_OCCUPATION_SCOPE"),
    )
    for attr, reason in checks:
        left, right = getattr(demand, attr), getattr(supply, attr)
        if left is None or right is None:
            # Undocumented semantics: comparability cannot be shown.
            return False, "INCOMPATIBLE_SIGNALS"
        if left != right:
            return False, reason
    return True, None


def classify_status(forecast_demand, forecast_supply, gap_eligible: bool,
                    min_forecast_demand, threshold_pct: Decimal = GAP_THRESHOLD_PCT):
    """Return (gap, status) following the section 13 precedence.

    min_forecast_demand must be passed explicitly: the contract leaves it TBD,
    so this function refuses to run on a hidden default.
    """
    if min_forecast_demand is None:
        raise ConfigurationError(
            "MIN_FORECAST_DEMAND is not set. Choose it from source-backed data "
            "(Issue #7) and pass it explicitly; synthetic ranges must not decide it."
        )
    fd, fs = q2(forecast_demand), q2(forecast_supply)
    gap = q2(fd - fs) if gap_eligible else None

    if fd < Decimal(str(min_forecast_demand)):
        return gap, "NO_DEMAND"
    if not gap_eligible:
        return None, None
    band = fd * Decimal(str(threshold_pct))
    if gap > band:
        return gap, "SHORTAGE"
    if gap < -band:
        return gap, "OVERSUPPLY"
    return gap, "BALANCED"
