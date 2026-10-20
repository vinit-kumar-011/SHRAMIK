"""Transparent forecast candidates and time-aware selection against the baseline.

ML output contract v1.1, section 10: "A transparent model such as exponential
smoothing or linear trend may be evaluated against the baseline. With short
yearly series, the naive baseline may legitimately win."

Pure functions, no database. Rules:
- Every model sees only years up to the cutoff (the Series is already cut).
- Missing years are never filled in (section 9.1). linear_trend regresses on the
  actual year numbers, so gaps are handled honestly. simple_exp_smoothing needs
  regular spacing, so it refuses non-contiguous training data.
- Forecasts below 0 are floored at 0 (headcounts cannot be negative) and the
  floor is reported.
- No model here produces an uncertainty interval (section 11).
- Selection is one decision per record: the same model forecasts demand and
  supply, so record["model"] describes both. It is chosen on the pooled
  back-test of both series, using rules fixed in ml/config/model_selection.py.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from decimal import Decimal
from typing import Callable, Optional, Sequence

from ml.config.model_selection import (
    CANDIDATE_MODELS,
    MIN_EVAL_ORIGINS,
    MIN_RELATIVE_IMPROVEMENT,
    MIN_TRAIN_POINTS,
    MIN_WIN_SHARE,
    SES_ALPHA,
)
from ml.forecast import NAIVE_MODEL

MODELS = {
    "naive_last_value": dict(NAIVE_MODEL),
    "linear_trend": {"name": "linear_trend", "version": "v1", "is_baseline": False},
    "simple_exp_smoothing": {"name": "simple_exp_smoothing", "version": "v1", "is_baseline": False},
}


class ModelNotApplicable(ValueError):
    """The model cannot be fitted on this training data (too short, irregular)."""


Points = Sequence[tuple]  # ((year, value), ...) oldest first, years strictly increasing


def _naive(points: Points, target_year: int) -> float:
    if not points:
        raise ModelNotApplicable("needs at least one point")
    return float(points[-1][1])


def _linear_trend(points: Points, target_year: int) -> float:
    if len(points) < 3:
        raise ModelNotApplicable("linear_trend needs at least 3 points")
    xs = [float(y) for y, _ in points]
    ys = [float(v) for _, v in points]
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    return my + slope * (target_year - mx)


def _ses(points: Points, target_year: int) -> float:
    if len(points) < 2:
        raise ModelNotApplicable("simple_exp_smoothing needs at least 2 points")
    years = [y for y, _ in points]
    if any(b - a != 1 for a, b in zip(years, years[1:])):
        raise ModelNotApplicable("simple_exp_smoothing needs consecutive years")
    level = float(points[0][1])
    for _, value in points[1:]:
        level = SES_ALPHA * float(value) + (1 - SES_ALPHA) * level
    return level  # flat forecast for every future year


FORECASTERS: dict = {
    "naive_last_value": _naive,
    "linear_trend": _linear_trend,
    "simple_exp_smoothing": _ses,
}


def points_of(series) -> tuple:
    return tuple((o.period_year, float(o.quantity)) for o in series.observations)


def forecast(model_name: str, points: Points, target_year: int) -> tuple:
    """Return (forecast >= 0 as Decimal, floored_at_zero)."""
    if points and target_year <= points[-1][0]:
        raise ValueError("target_year must be after the last training year")
    raw = FORECASTERS[model_name](points, target_year)
    if not math.isfinite(raw):
        raise ModelNotApplicable("non-finite forecast")
    floored = raw < 0
    return Decimal(str(round(max(raw, 0.0), 6))), floored


@dataclass(frozen=True)
class OriginResult:
    year: int
    actual: float
    predictions: dict  # model name -> prediction (None when not applicable)


def backtest(points: Points, models: Sequence[str]) -> list:
    """Rolling origin, expanding window: train on points[:k], predict point k.
    Origins start at MIN_TRAIN_POINTS so every model is scored on the same years."""
    results = []
    for k in range(MIN_TRAIN_POINTS, len(points)):
        train, (year, actual) = points[:k], points[k]
        preds = {}
        for name in models:
            try:
                preds[name] = float(forecast(name, train, year)[0])
            except ModelNotApplicable:
                preds[name] = None
        results.append(OriginResult(year, actual, preds))
    return results


def _scale(points: Points) -> Optional[float]:
    vals = [abs(v) for _, v in points]
    s = sum(vals) / len(vals) if vals else 0.0
    return s if s > 0 else None


def relative_error(origins: Sequence[OriginResult], model: str) -> Optional[float]:
    """Mean |error| / actual over origins with a non-zero actual (for confidence_inputs)."""
    errs = [abs(o.actual - o.predictions[model]) / o.actual
            for o in origins if o.actual != 0 and o.predictions.get(model) is not None]
    if not errs:
        return None
    value = sum(errs) / len(errs)
    return round(value, 4) if math.isfinite(value) else None


def select_model(series_list: Sequence) -> dict:
    """Choose one model for all series of a record. Returns a selection report:

    {"selected": name, "reason": code, "origins": n, "scores": {model: scaled_mae},
     "wins": {model: share}, "relative_errors": [per-series error of the selected model]}

    reason codes: BASELINE_DEFAULT_SHORT_HISTORY, BASELINE_NOT_BEATEN, CANDIDATE_BETTER.
    """
    names = ("naive_last_value",) + tuple(CANDIDATE_MODELS)
    per_series = [points_of(s) for s in series_list]
    origins_by_series = [backtest(p, names) for p in per_series]
    min_origins = min((len(o) for o in origins_by_series), default=0)

    report = {"selected": "naive_last_value", "origins": min_origins, "scores": {}, "wins": {}}
    if min_origins < MIN_EVAL_ORIGINS:
        report["reason"] = "BASELINE_DEFAULT_SHORT_HISTORY"
        report["relative_errors"] = [relative_error(o, "naive_last_value") for o in origins_by_series]
        return report

    # Pooled, scale-free error: each series' absolute errors divided by that
    # series' mean level, so demand and supply count equally.
    for name in names:
        total, count, wins, compared = 0.0, 0, 0, 0
        usable = True
        for pts, origins in zip(per_series, origins_by_series):
            scale = _scale(pts)  # all points are <= cutoff, so no leakage
            if scale is None:
                usable = False
                break
            for o in origins:
                pred, base = o.predictions[name], o.predictions["naive_last_value"]
                if pred is None:
                    usable = False
                    break
                total += abs(o.actual - pred) / scale
                count += 1
                if name != "naive_last_value":
                    e_c, e_b = abs(o.actual - pred), abs(o.actual - base)
                    if e_c != e_b:  # ties (e.g. a flat series) say nothing either way
                        compared += 1
                        wins += e_c < e_b
            if not usable:
                break
        if usable and count:
            report["scores"][name] = round(total / count, 6)
            if name != "naive_last_value":
                report["wins"][name] = round(wins / compared, 4) if compared else None

    base = report["scores"].get("naive_last_value")
    qualifying = [
        n for n in CANDIDATE_MODELS
        if n in report["scores"] and base is not None
        and report["scores"][n] <= (1 - MIN_RELATIVE_IMPROVEMENT) * base
        and report["wins"][n] is not None and report["wins"][n] > MIN_WIN_SHARE
    ]
    if qualifying:
        best = min(qualifying, key=lambda n: (report["scores"][n], CANDIDATE_MODELS.index(n)))
        report["selected"], report["reason"] = best, "CANDIDATE_BETTER"
    else:
        report["reason"] = "BASELINE_NOT_BEATEN"
    report["relative_errors"] = [relative_error(o, report["selected"]) for o in origins_by_series]
    return report
