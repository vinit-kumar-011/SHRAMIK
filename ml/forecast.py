"""Forecast baseline (ML output contract v1.1, section 10).

The required MVP baseline is the naive last-value forecast: every future
period equals the most recent usable observation. It works on non-contiguous
yearly series (section 9.1) and produces no uncertainty interval
(section 11: forecast_uncertainty stays null for this baseline).
"""
from __future__ import annotations

import math
from decimal import Decimal
from typing import Optional

from ml.series import Series

NAIVE_MODEL = {"name": "naive_last_value", "version": "v1", "is_baseline": True}


def naive_last_value(series: Series) -> Decimal:
    if not series.observations:
        raise ValueError("naive_last_value needs at least one usable observation")
    return Decimal(str(series.latest.quantity))


def naive_backtest_error(series: Series) -> Optional[float]:
    """Mean relative error of the naive baseline on the series' own history,
    using only earlier years to predict later ones (time-aware, no leakage).

    Each later observation is predicted by the one before it. Points whose
    actual value is 0 are skipped (relative error undefined). Returns None
    when fewer than two comparable points exist.
    """
    obs = series.observations
    errors = []
    for prev, cur in zip(obs, obs[1:]):
        actual = float(cur.quantity)
        if actual == 0:
            continue
        errors.append(abs(actual - float(prev.quantity)) / actual)
    if not errors:
        return None
    value = sum(errors) / len(errors)
    return round(value, 4) if math.isfinite(value) else None
