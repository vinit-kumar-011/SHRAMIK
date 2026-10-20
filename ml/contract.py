"""Validator for ML output contract v1.1 forecast records.

"Model output is stored only after validation" (readiness plan, workstream C).
validate_record() returns a list of human-readable problems; an empty list
means the record may be persisted. assert_valid() raises instead.
"""
from __future__ import annotations

import re
from decimal import Decimal
from typing import Optional

from ml.confidence import max_allowed_level
from ml.gap import q2
from ml.vocab import (
    ANALYSIS_MODES,
    CONFIDENCE_LEVELS,
    DATA_STATUS,
    GAP_ELIGIBILITY_REASONS,
    OUTPUT_PROVENANCE,
    PERIOD_TYPES,
    REASON_BY_STATUS,
    STATUS,
    level_rank,
)

REQUIRED_KEYS = (
    "contract_version", "analysis_mode", "provenance_state", "district_id", "sector_id",
    "skill_id", "period_type", "period", "data_status", "reason_code", "demand_quantity",
    "supply_quantity", "demand_index", "supply_index", "forecast_demand", "forecast_supply",
    "gap_eligible", "gap_eligibility_reason", "gap", "status", "confidence_level",
    "evidence_coverage", "model",
)
NULL_WHEN_NOT_SUFFICIENT = (
    "forecast_demand", "forecast_supply", "gap_eligible", "gap_eligibility_reason", "gap",
    "status", "confidence_level", "forecast_uncertainty", "evidence_coverage", "model",
)
YEAR_RE = re.compile(r"^\d{4}$")
VERSION_RE = re.compile(r"^\d+\.\d+$")


class ContractViolation(ValueError):
    pass


def _nonneg(value) -> bool:
    return value is None or (isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 0)


def validate_record(record: dict, *, min_forecast_demand=None,
                    allow_naive_uncertainty: bool = False) -> list:
    p = []
    missing = [k for k in REQUIRED_KEYS if k not in record]
    if missing:
        return [f"missing required fields: {', '.join(missing)}"]
    r = record

    # ---- identity and enums
    if not VERSION_RE.match(str(r["contract_version"])):
        p.append("contract_version must be MAJOR.MINOR")
    if r["analysis_mode"] not in ANALYSIS_MODES:
        p.append("analysis_mode invalid")
    if r["provenance_state"] not in OUTPUT_PROVENANCE:
        p.append("provenance_state invalid")
    if r["analysis_mode"] == "OFFICIAL" and r["provenance_state"] != "SOURCE_BACKED":
        p.append("OFFICIAL requires provenance_state SOURCE_BACKED")
    for key in ("district_id", "sector_id", "skill_id"):
        if not r[key]:
            p.append(f"{key} is required")
    if r["period_type"] not in PERIOD_TYPES:
        p.append("period_type must be YEAR")
    if not (isinstance(r["period"], str) and YEAR_RE.match(r["period"])):
        p.append("period must be a 'YYYY' string")
    if r["data_status"] not in DATA_STATUS:
        p.append("data_status invalid")
        return p

    # ---- reason_code ↔ data_status (section 5)
    if r["data_status"] == "SUFFICIENT":
        if r["reason_code"] is not None:
            p.append("reason_code must be null for SUFFICIENT")
    elif r["reason_code"] not in REASON_BY_STATUS[r["data_status"]]:
        p.append(f"reason_code {r['reason_code']!r} not allowed with {r['data_status']}")

    # ---- numeric ranges
    for key in ("demand_quantity", "supply_quantity", "forecast_demand", "forecast_supply"):
        if not _nonneg(r[key]):
            p.append(f"{key} must be null or >= 0")
    for key in ("demand_index", "supply_index"):
        if r[key] is not None and not 0 <= r[key] <= 100:
            p.append(f"{key} must be within 0–100")
    if r["evidence_coverage"] is not None and not 0 <= r["evidence_coverage"] <= 1:
        p.append("evidence_coverage must be within 0–1")

    # ---- confidence_inputs diagnostics (section 17)
    ci = r.get("confidence_inputs")
    if ci is not None:
        hp, tp, sp = (ci.get("history_periods"), ci.get("total_history_periods"),
                      ci.get("synthetic_history_periods"))
        for name, val in (("history_periods", hp), ("total_history_periods", tp),
                          ("synthetic_history_periods", sp)):
            if val is not None and (not isinstance(val, int) or val < 0):
                p.append(f"confidence_inputs.{name} must be an integer >= 0")
        if None not in (hp, tp, sp) and tp != hp + sp:
            p.append("total_history_periods must equal history_periods + synthetic_history_periods")
        if r["analysis_mode"] == "OFFICIAL" and sp not in (None, 0):
            p.append("OFFICIAL results cannot use synthetic history")
        cov = ci.get("data_coverage")
        if cov is not None and not 0 <= cov <= 1:
            p.append("confidence_inputs.data_coverage must be within 0–1")

    # ---- precedence when not SUFFICIENT
    if r["data_status"] != "SUFFICIENT":
        for key in NULL_WHEN_NOT_SUFFICIENT:
            if r.get(key) is not None:
                p.append(f"{key} must be null when data_status is {r['data_status']}")
        return p

    # ---- SUFFICIENT requirements
    for key in ("forecast_demand", "forecast_supply", "confidence_level", "evidence_coverage",
                "gap_eligible", "model"):
        if r[key] is None:
            p.append(f"{key} is required when data_status is SUFFICIENT")
    if r["confidence_level"] is not None and r["confidence_level"] not in CONFIDENCE_LEVELS:
        p.append("confidence_level invalid")
    if r["status"] is not None and r["status"] not in STATUS:
        p.append("status invalid")

    # ---- gap eligibility (sections 12–13)
    if r["gap_eligible"] is True:
        if r["gap_eligibility_reason"] is not None:
            p.append("gap_eligibility_reason must be null when gap_eligible is true")
        if r["gap"] is None:
            p.append("gap is required when gap_eligible is true")
        elif None not in (r["forecast_demand"], r["forecast_supply"]):
            if q2(r["gap"]) != q2(Decimal(str(r["forecast_demand"])) - Decimal(str(r["forecast_supply"]))):
                p.append("gap must equal forecast_demand - forecast_supply")
        if r["status"] is None:
            p.append("status is required when a comparable gap exists")
    elif r["gap_eligible"] is False:
        if r["gap"] is not None:
            p.append("gap must be null when gap_eligible is false")
        if r["gap_eligibility_reason"] not in GAP_ELIGIBILITY_REASONS:
            p.append("gap_eligibility_reason is required and must be a known value")
        if r["status"] not in (None, "NO_DEMAND"):
            p.append("status must be null or NO_DEMAND when gap_eligible is false")

    # ---- NO_DEMAND threshold, when the caller supplies it
    if min_forecast_demand is not None and r["forecast_demand"] is not None:
        below = Decimal(str(r["forecast_demand"])) < Decimal(str(min_forecast_demand))
        if below and r["status"] != "NO_DEMAND":
            p.append("forecast_demand below MIN_FORECAST_DEMAND must be NO_DEMAND")
        if not below and r["status"] == "NO_DEMAND":
            p.append("NO_DEMAND used although forecast_demand meets MIN_FORECAST_DEMAND")

    # ---- model + leakage (section 20)
    m = r["model"]
    if m is not None:
        for key in ("name", "version", "is_baseline", "trained_through_period"):
            if key not in m:
                p.append(f"model.{key} is required")
        cutoff = m.get("trained_through_period")
        if not (isinstance(cutoff, str) and YEAR_RE.match(cutoff)):
            p.append("model.trained_through_period must be 'YYYY'")
        elif YEAR_RE.match(str(r["period"])) and not int(cutoff) < int(r["period"]):
            p.append("model.trained_through_period must be earlier than period (leakage)")
        if not isinstance(m.get("is_baseline"), bool):
            p.append("model.is_baseline must be boolean")

    # ---- uncertainty (section 11)
    u = r.get("forecast_uncertainty")
    if u is not None:
        if m and m.get("name") == "naive_last_value" and u.get("available") and not allow_naive_uncertainty:
            p.append("naive_last_value has no validated uncertainty method; forecast_uncertainty must be null")
        if u.get("available"):
            lo, hi, lv = u.get("lower"), u.get("upper"), u.get("level")
            if lo is None or hi is None or lo > hi or lo < 0:
                p.append("forecast_uncertainty needs 0 <= lower <= upper")
            if lv is None or not 0 < lv < 1:
                p.append("forecast_uncertainty.level must be between 0 and 1")

    # ---- confidence caps (section 18)
    if r["confidence_level"] in CONFIDENCE_LEVELS and ci and ci.get("history_periods") is not None:
        cap = max_allowed_level(ci["history_periods"], r["provenance_state"])
        if level_rank(r["confidence_level"]) > level_rank(cap):
            p.append(f"confidence_level {r['confidence_level']} exceeds the allowed maximum {cap}")
    if r["provenance_state"] == "SYNTHETIC_DEMO" and r["confidence_level"] not in (None, "LOW"):
        p.append("SYNTHETIC_DEMO results are capped at LOW confidence")
    if r["provenance_state"] == "MIXED_PROVENANCE" and r["confidence_level"] == "HIGH":
        p.append("MIXED_PROVENANCE results are capped at MEDIUM confidence")
    return p


def assert_valid(record: dict, **kwargs) -> dict:
    problems = validate_record(record, **kwargs)
    if problems:
        raise ContractViolation("; ".join(problems))
    return record
