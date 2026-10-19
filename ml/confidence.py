"""Confidence and evidence coverage (ML output contract v1.1, sections 16–19).

What is FINAL here (fixed by the contract):
- the history cap: 0–4 source-backed periods → at most MEDIUM;
  HIGH needs HIGH_CONFIDENCE_MIN_HISTORY (5) source-backed periods
- the provenance cap: MIXED_PROVENANCE → at most MEDIUM;
  SYNTHETIC_DEMO → at most LOW

What is PROVISIONAL (Issue #16 owns the real formula):
- provisional_base_level(): a simple, documented rule so the pipeline can run
  end to end. It is labelled in confidence_inputs["confidence_method"] so no
  one mistakes it for the approved method. Replace it, keep the caps.
- evidence_coverage(): share of the observations used that link to a stored
  evidence item. Issue #16 / #21 own the final definition.
"""
from __future__ import annotations

from datetime import date
from typing import Iterable, Optional

from ml.config import HIGH_CONFIDENCE_MIN_HISTORY
from ml.vocab import CONFIDENCE_LEVELS, level_rank

PROVISIONAL_METHOD = "PROVISIONAL_V0_PENDING_ISSUE_16"


def max_allowed_level(history_periods: int, provenance_state: str) -> str:
    cap = "HIGH" if history_periods >= HIGH_CONFIDENCE_MIN_HISTORY else "MEDIUM"
    if provenance_state == "MIXED_PROVENANCE":
        cap = min(cap, "MEDIUM", key=level_rank)
    elif provenance_state == "SYNTHETIC_DEMO":
        cap = "LOW"
    return cap


def apply_caps(level: str, history_periods: int, provenance_state: str) -> str:
    cap = max_allowed_level(history_periods, provenance_state)
    return min(level, cap, key=level_rank)


def provisional_base_level(inputs: dict) -> str:
    """PROVISIONAL rule (see module docstring). Uses only contract inputs."""
    coverage = inputs.get("data_coverage")
    error = inputs.get("forecast_error")
    sources = inputs.get("source_count") or 0
    if coverage is None or coverage < 0.5 or (error is not None and error > 0.35):
        return "LOW"
    if coverage >= 0.9 and sources >= 2 and error is not None and error <= 0.15:
        return "HIGH"
    return "MEDIUM"


def data_coverage(years_used: Iterable[int], first_year: int, cutoff_year: int) -> Optional[float]:
    """Share of years in [first_year, cutoff_year] that have a usable value."""
    span = cutoff_year - first_year + 1
    if span <= 0:
        return None
    have = sum(1 for y in set(years_used) if first_year <= y <= cutoff_year)
    return round(have / span, 4)


def freshness_days(source_dates: Iterable[Optional[str]], as_of: Optional[date]) -> Optional[int]:
    dates = [date.fromisoformat(d) for d in source_dates if d]
    if not dates or as_of is None:
        return None
    return max(0, (as_of - max(dates)).days)


def evidence_coverage(observations) -> Optional[float]:
    """PROVISIONAL: share of used observations that are source-backed AND
    linked to an evidence item. Synthetic rows never count as evidence."""
    obs = list(observations)
    if not obs:
        return None
    backed = sum(1 for o in obs if not o.is_synthetic and o.evidence_item_id)
    return round(backed / len(obs), 4)


assert CONFIDENCE_LEVELS == ("LOW", "MEDIUM", "HIGH")
