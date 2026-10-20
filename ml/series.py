"""Observation eligibility and yearly series construction.

Readiness plan, workstream C step 1. Pure functions: no database, no HTTP.

Rules implemented (ML output contract v1.1, sections 5, 9 and 9.1):
- A usable observation has a valid 4-digit year and a non-null, non-negative
  quantity. Missing stays missing: None is never turned into 0.
- OFFICIAL mode ignores synthetic observations entirely.
- Only years up to the data cutoff are used (no future-data leakage).
- Missing years are never filled in. Non-contiguous series are allowed and
  reported via is_contiguous.
- Two usable observations for the same year are a conflict: choosing between
  sources is the ingestion layer's job, so this module refuses to guess.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Iterable, Optional

from ml.vocab import ANALYSIS_MODES


@dataclass(frozen=True)
class Observation:
    """One yearly demand or supply observation, already selected for one series
    (one district × skill × signal). Mirrors demand/supply_observations rows."""

    period_year: int
    quantity: Optional[float]
    is_synthetic: bool = False
    source_id: Optional[str] = None
    evidence_item_id: Optional[str] = None
    source_date: Optional[str] = None  # ISO date, used for freshness only

    @property
    def provenance_state(self) -> str:
        return "SYNTHETIC_DEMO" if self.is_synthetic else "SOURCE_BACKED"


class SeriesConflictError(ValueError):
    """Raised when the same year appears twice among usable observations."""


@dataclass(frozen=True)
class Series:
    observations: tuple  # usable observations used, oldest first
    history_periods: int  # source-backed usable periods
    synthetic_history_periods: int
    total_history_periods: int
    is_contiguous: Optional[bool]
    provenance_state: Optional[str]  # None when nothing is used
    excluded: tuple = field(default_factory=tuple)  # (observation, reason) pairs

    @property
    def latest(self) -> Optional[Observation]:
        return self.observations[-1] if self.observations else None

    @property
    def years(self) -> list:
        return [o.period_year for o in self.observations]


def is_usable(obs: Observation) -> Optional[str]:
    """Return None if usable, otherwise the reason it is not."""
    if not isinstance(obs.period_year, int) or not 1000 <= obs.period_year <= 9999:
        return "INVALID_YEAR"
    if obs.quantity is None:
        return "MISSING_QUANTITY"
    if isinstance(obs.quantity, float) and math.isnan(obs.quantity):
        return "MISSING_QUANTITY"
    if Decimal(str(obs.quantity)) < 0:
        return "NEGATIVE_QUANTITY"
    return None


def provenance_of(observations: Iterable[Observation]) -> Optional[str]:
    kinds = {o.is_synthetic for o in observations}
    if not kinds:
        return None
    if kinds == {False}:
        return "SOURCE_BACKED"
    if kinds == {True}:
        return "SYNTHETIC_DEMO"
    return "MIXED_PROVENANCE"


def build_series(observations: Iterable[Observation], analysis_mode: str, cutoff_year: int) -> Series:
    """Select the usable observations for one series under one analysis mode."""
    if analysis_mode not in ANALYSIS_MODES:
        raise ValueError(f"analysis_mode must be one of {sorted(ANALYSIS_MODES)}")

    used, excluded, seen = [], [], {}
    for obs in observations:
        problem = is_usable(obs)
        if problem is None and obs.period_year > cutoff_year:
            problem = "AFTER_CUTOFF"
        if problem is None and analysis_mode == "OFFICIAL" and obs.is_synthetic:
            problem = "SYNTHETIC_EXCLUDED_IN_OFFICIAL"
        if problem:
            excluded.append((obs, problem))
            continue
        if obs.period_year in seen:
            raise SeriesConflictError(
                f"Two usable observations for {obs.period_year}; the ingestion layer must "
                "choose the canonical source before analytics run."
            )
        seen[obs.period_year] = obs
        used.append(obs)

    used.sort(key=lambda o: o.period_year)
    years = [o.period_year for o in used]
    if not years:
        contiguous = None
    else:
        contiguous = years == list(range(years[0], years[-1] + 1))
    synthetic = sum(1 for o in used if o.is_synthetic)
    return Series(
        observations=tuple(used),
        history_periods=len(used) - synthetic,
        synthetic_history_periods=synthetic,
        total_history_periods=len(used),
        is_contiguous=contiguous,
        provenance_state=provenance_of(used),
        excluded=tuple(excluded),
    )
