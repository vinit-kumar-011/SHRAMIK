# SHRAMIK API Contracts

**Issue:** #4 — Define SHRAMIK API contracts  
**Status:** Draft v1 — review-ready API contract  
**Owner:** Lead  
**Branch:** feature/api-contracts  
**Implementation:** Issue #20 and endpoint-specific implementation issues

---

## 1. Purpose

This document defines the MVP REST API contract between the SHRAMIK FastAPI backend and the Next.js frontend.

It translates the decisions in Issue #1 (architecture), Issue #2 (database schema), Issue #5 (ML output contract v1.1), and Issue #7 (canonical dataset plan) into stable HTTP request/response structures.

This issue is contract design only. Backend implementation follows this contract. Frontend developers must not depend on undocumented fields. Breaking API changes require updating this document before implementation changes are merged.

## 2. API Design Principles

### 2.1 FastAPI is the application boundary

Next.js Frontend → FastAPI REST → PostgreSQL / Supabase

The frontend must not query PostgreSQL/Supabase tables directly.

### 2.2 Numerical analytics are backend-owned

Demand, supply, forecasts, gaps, confidence, evidence coverage, warnings, and simulator calculations come from the approved analytical layers. The LLM does not calculate numerical analytics.

### 2.3 Preserve ML contract semantics

Forecast-level analytical records must preserve Issue #5 v1.1 fields: analysis_mode, provenance_state, data_status, reason_code, gap_eligible, gap_eligibility_reason, gap, status, confidence_level, confidence_inputs, and evidence_coverage.

### 2.4 Provenance is never silently collapsed

Official/source-backed and DEMO/synthetic outputs remain distinguishable whenever provenance affects interpretation.

### 2.5 Null is meaningful

Do not convert missing observations to zero, unavailable forecasts to zero, ineligible gaps to zero, or unavailable uncertainty to fabricated values.

## 3. Versioning

MVP API prefix: /api/v1

Breaking changes require a new API major version. Non-breaking field additions may remain within v1 when existing consumers continue to function.

The ML contract_version is separate from the HTTP API version.

## 4. Representation Conventions

- JSON fields use snake_case.
- period_type is YEAR for MVP and period is serialized as YYYY.
- Dates use ISO-8601 YYYY-MM-DD.
- Timestamps use ISO-8601 UTC.
- JSON booleans are true/false, not strings.
- API responses preserve analytical null semantics.

## 5. Standard Response Envelopes

### Single resource

    {
      "data": {},
      "meta": {"request_id": "req_123"}
    }

### Collection

    {
      "data": [],
      "meta": {"request_id": "req_123", "page": 1, "page_size": 25, "total": 100}
    }

Analytical resources may include an API-level identifier such as forecast_id in addition to the Issue #5 fields.

## 6. Standard Error Format

    {
      "error": {
        "code": "INVALID_PARAMETER",
        "message": "district_id is not valid.",
        "details": {"field": "district_id"},
        "request_id": "req_123"
      }
    }

Initial error codes:

| Code | HTTP | Meaning |
|---|---:|---|
| INVALID_REQUEST | 400 | Malformed or semantically invalid request |
| INVALID_PARAMETER | 400 | Invalid parameter value |
| RESOURCE_NOT_FOUND | 404 | Requested resource does not exist |
| VALIDATION_ERROR | 422 | Request validation failed |
| INTERNAL_ERROR | 500 | Unexpected backend failure |
| SERVICE_UNAVAILABLE | 503 | Required dependency is unavailable |

Do not expose SQL, stack traces, credentials, or internal exception details.

# 7. Endpoint Contracts

## 7.1 GET /api/v1/dashboard

Dashboard overview for the selected analytical scope.

Query parameters: district_id, sector_id, skill_id, period, analysis_mode, page_size.

Response data contains scope, summary counts, top_shortages, top_emerging_skills, and active_warnings.

Example response shape:

    {
      "data": {
        "scope": {"district_id": "OD-KHD", "sector_id": null, "skill_id": null, "period": "2027", "analysis_mode": "OFFICIAL"},
        "summary": {"forecast_results": 42, "shortage_count": 12, "balanced_count": 18, "oversupply_count": 7, "no_demand_count": 5, "warning_count": 8, "emerging_skill_count": 6},
        "top_shortages": [],
        "top_emerging_skills": [],
        "active_warnings": []
      },
      "meta": {"request_id": "req_123"}
    }

Dashboard aggregations must derive from the same analytical records used by detailed endpoints.

## 7.2 GET /api/v1/districts

Returns canonical districts.

Query parameters: state_id, active_only (default true), page (default 1), page_size (default 25).

Response item:

    {"district_id":"OD-KHD","name":"Khordha","state_id":"OD","state_code":"OD","lgd_district_code":"..."}

## 7.3 GET /api/v1/districts/{district_id}

Returns geographic intelligence for one district.

Response data contains district, summary, sector_summary, top_shortages, top_emerging_skills, and active_warnings.

## 7.4 GET /api/v1/skills

Returns canonical skills/job roles.

Query parameters: sector_id, taxonomy_name, active_only, page, page_size.

Response item includes skill_id, name, sector_id, sector_name, and taxonomy_mappings.

Each taxonomy mapping may expose taxonomy_name, taxonomy_version, taxonomy_code, mapping_method, and mapping_confidence where approved by the database contract.

## 7.5 GET /api/v1/skills/{skill_id}

Returns skill intelligence across the available geographic scope.

Query parameters: district_id, period_start, period_end, analysis_mode.

Response data contains skill, current_summary, forecasts, emerging_skill_signals, geographic_summary, and warnings.

## 7.6 GET /api/v1/forecasts/{skill_id}

Returns forecast records for one skill.

Query parameters: district_id, period_start, period_end, analysis_mode (default OFFICIAL), active_only (default true), page, page_size.

Each forecast item contains:

    forecast_id
    contract_version
    analysis_mode
    provenance_state
    district_id
    sector_id
    skill_id
    period_type
    period
    data_status
    reason_code
    demand_quantity
    supply_quantity
    demand_index
    supply_index
    forecast_demand
    forecast_supply
    gap_eligible
    gap_eligibility_reason
    gap
    status
    forecast_uncertainty
    confidence_level
    confidence_inputs
    evidence_coverage
    model

Rules:

- Preserve Issue #5 v1.1 field meanings and null behaviour.
- forecast_id exists for API evidence lookup and does not replace the ML contract.
- active_only=true selects the active forecast for each District × Skill × Period.
- The backend must not silently mix OFFICIAL and DEMO results.

## 7.7 GET /api/v1/early-warnings

Returns active or historical warnings.

Query parameters: district_id, skill_id, period, warning_type, severity, active_only, page, page_size.

Response item contains warning_id, forecast_id, emerging_skill_signal_id, warning_type, severity, detected_period, explanation_code, provenance_state, and forecast_status.

Warning type/severity vocabulary remains owned by Issue #17.

## 7.8 GET /api/v1/evidence/{forecast_id}

Returns evidence supporting a forecast result.

Response data contains forecast_id and evidence items. Each evidence item may include evidence_item_id, evidence_type, source, retrieval, locator, title, observed_period, and note.

Source and retrieval metadata must remain distinct from the observation period.

## 7.9 GET /api/v1/model-evaluation

Returns model evaluation information.

Query parameters: district_id, skill_id, period_start, period_end, model_name, page, page_size.

Response uses an extensible metrics object because exact metric names are owned by Issue #22.

Example item:

    {
      "model": {"name":"naive_last_value","version":"v1","is_baseline":true,"trained_through_period":"2026"},
      "metrics": {},
      "evaluation_scope": {},
      "selected_for_mvp": true
    }

## 7.10 POST /api/v1/simulate

Runs the stateless training intervention simulator.

Required request fields: district_id, skill_id, start_period, training_duration_months, seats, completion_rate. Optional field: horizon_end.

Rules: completion_rate is 0–1; seats is non-negative; duration is positive; duration is converted to whole-year lag using the architecture rule; scenario results are not persisted.

Response contains baseline and simulated period values, including lag_years, effective_additional_supply, cohort_availability_period, baseline_forecast_demand, baseline_forecast_supply, baseline_gap, added_supply, simulated_supply, simulated_gap, and gap_reduction where applicable.

If the cohort arrives after the horizon, return baseline values unchanged and reason_code = COHORT_AFTER_HORIZON. When the baseline gap is not positive, gap_reduction is null with an explanatory reason.

## 7.11 POST /api/v1/generate-brief

Generates an optional AI-assisted planning brief from structured SHRAMIK outputs.

Request fields: district_id, skill_id, forecast_ids, warning_ids, include_evidence.

Response contains brief and generation metadata.

AI rules:

- The LLM receives structured analytical values from the backend.
- It must not invent forecast values, evidence, sources, or confidence levels.
- Insufficient inputs must be stated, not fabricated around.
- The brief endpoint is optional and must not block core analytics.
- Backend may cache stable brief requests using an input hash.

## 8. Forecast Record Contract

Any endpoint returning a detailed forecast record must preserve the Issue #5 field names exactly. Do not create alternate names such as forecasted_demand, shortage_amount, or confidence_score.

## 9. Provenance Rules

OFFICIAL requires provenance_state = SOURCE_BACKED.

DEMO explicitly exposes analysis_mode = DEMO and provenance_state = SYNTHETIC_DEMO or MIXED_PROVENANCE.

History diagnostics inside confidence_inputs retain Issue #5 v1.1 semantics: history_periods is source-backed usable history, total_history_periods is total usable model history, synthetic_history_periods is synthetic model history, and is_contiguous indicates whether observed years are consecutive. Missing/non-computable diagnostics are serialized as null when the documented key is included.

## 10. Filtering and Pagination

Collection endpoints use 1-based page numbering and bounded page_size values. Filters that affect analytical interpretation must be explicit, especially analysis_mode, district, skill, sector, and period.

## 11. HTTP Semantics

- GET single/collection: 200
- POST simulation: 200
- POST brief generation: 200
- malformed/invalid query: 400
- body validation failure: 422
- missing resource: 404
- unexpected backend error: 500
- unavailable dependency: 503

Valid requests with data_status = INSUFFICIENT_DATA return HTTP 200 with the documented analytical null semantics.

## 12. Implementation Boundary

Issue #4 defines API contracts only. Implementation must use FastAPI/Pydantic models, validate inputs, map database/provenance state to the public contract, return stable error envelopes, and preserve per-period provenance for multi-period responses.

## 13. Contract Ownership

| Area | Owner |
|---|---|
| HTTP envelopes and endpoint naming | #4 |
| Database storage | #2 / #8 |
| Forecast analytical fields | #5 |
| Canonical source/data availability | #7 |
| Demand/supply methodology | #13 |
| Forecasting methodology | #14 |
| Gap classification | #15 |
| Confidence/evidence scoring | #16 |
| Early-warning taxonomy/rules | #17 |
| Emerging-skill detection | #18 |
| Simulator implementation | #19 |
| Model evaluation metrics | #22 |
| AI planning brief implementation | #23 |

## 14. Acceptance Checklist

- [x] API responsibility separated from backend implementation
- [x] REST versioning approach defined
- [x] JSON naming and representation conventions defined
- [x] Standard single-resource envelope defined
- [x] Standard collection envelope defined
- [x] Standard error envelope defined
- [x] Dashboard endpoint defined
- [x] District endpoints defined
- [x] Skills endpoints defined
- [x] Forecast endpoint defined
- [x] Early-warning endpoint defined
- [x] Evidence endpoint defined
- [x] Model-evaluation endpoint defined
- [x] What-if simulator endpoint defined
- [x] AI planning-brief endpoint defined
- [x] Forecast response mapped to Issue #5 v1.1
- [x] Provenance and null semantics defined
- [x] Pagination/filtering defined
- [x] HTTP status semantics defined
- [x] Cross-issue ownership defined

## 15. Open Decisions / Follow-ups

| Decision | Owner |
|---|---|
| Exact dashboard aggregation formulas | #13–#18 as applicable |
| Final warning type/severity vocabulary | #17 |
| Exact emerging-skill methodology | #18 |
| Exact model-evaluation metrics | #22 |
| Final simulator response extensions | #19 |
| Final AI brief generation details | #23 |
| Authentication / RBAC | Post-MVP architecture follow-up |
| Rate limiting / quotas | Deployment/operations follow-up |

These follow-ups must not silently change the stable core envelopes or forecast field names.
