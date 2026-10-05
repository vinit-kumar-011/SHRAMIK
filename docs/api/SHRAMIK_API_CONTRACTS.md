# SHRAMIK API Contracts

**Issue:** #4 — Define SHRAMIK API contracts  
**Status:** Draft v1.1 — review-updated API contract  
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
        "code": "VALIDATION_ERROR",
        "message": "Request validation failed.",
        "details": {"field": "district_id"},
        "request_id": "req_123"
      }
    }

Initial error codes:

| Code | HTTP | Meaning |
|---|---:|---|
| INVALID_REQUEST | 400 | Endpoint-level semantic constraint failure after request parsing/validation |
| RESOURCE_NOT_FOUND | 404 | Requested resource does not exist |
| VALIDATION_ERROR | 422 | Query, path, header, or request-body validation failed |
| INTERNAL_ERROR | 500 | Unexpected backend failure |
| SERVICE_UNAVAILABLE | 503 | Required non-AI dependency is unavailable |
| AI_UNAVAILABLE | 503 | Configured AI provider is unavailable or provider call fails |
| AI_TIMEOUT | 504 | AI provider call exceeds the backend timeout |

FastAPI/Pydantic validation failures use 422 / VALIDATION_ERROR, including invalid query parameters, invalid path parameters, malformed UUIDs, and body validation failures. A 400 / INVALID_REQUEST response is reserved for validly typed requests that fail an endpoint-level semantic rule that is not represented as ordinary field validation.

For evidence lookup, an unknown forecast_id returns 404 / RESOURCE_NOT_FOUND. A valid forecast with no evidence returns 200 with an empty evidence array.

Do not expose SQL, stack traces, credentials, or internal exception details.

### Request correlation

The backend accepts an optional X-Request-ID header as the request correlation identifier. When it is absent, the backend generates a request ID. Every successful response places the applied request ID in meta.request_id; error responses place it in error.request_id.


# 7. Endpoint Contracts

## 7.1 GET /api/v1/dashboard

Dashboard overview for the selected analytical scope.

Query parameters: district_id, sector_id, skill_id, period, analysis_mode, page_size.

analysis_mode defaults to OFFICIAL. The applied value is echoed as meta.analysis_mode.

The dashboard summary is calculated over the same forecast-result population used by detailed forecast endpoints for the selected scope, period, analysis_mode, and active-state rules.

### Summary count semantics

forecast_results equals the total rows in the selected dashboard forecast population.

The following six counts are mutually exclusive and sum to forecast_results:

- shortage_count: data_status=SUFFICIENT, gap_eligible=true, status=SHORTAGE
- balanced_count: data_status=SUFFICIENT, gap_eligible=true, status=BALANCED
- oversupply_count: data_status=SUFFICIENT, gap_eligible=true, status=OVERSUPPLY
- no_demand_count: data_status=SUFFICIENT, gap_eligible=true, status=NO_DEMAND
- insufficient_data_count: data_status=INSUFFICIENT_DATA
- gap_ineligible_count: data_status=SUFFICIENT, gap_eligible=false

A gap-ineligible row is not counted in no_demand_count, even though Issue #5 permits status=NO_DEMAND for an ineligible gap. This keeps the dashboard totals mutually exclusive.

Example response:

    {
      "data": {
        "scope": {
          "district_id": "OD-KHD",
          "sector_id": null,
          "skill_id": null,
          "period": "2027",
          "analysis_mode": "OFFICIAL"
        },
        "summary": {
          "forecast_results": 42,
          "shortage_count": 12,
          "balanced_count": 18,
          "oversupply_count": 7,
          "no_demand_count": 2,
          "insufficient_data_count": 2,
          "gap_ineligible_count": 1,
          "warning_count": 8,
          "emerging_skill_count": 6
        },
        "top_shortages": [],
        "top_emerging_skills": [],
        "active_warnings": []
      },
      "meta": {
        "request_id": "req_123",
        "analysis_mode": "OFFICIAL"
      }
    }

top_shortages is a named DashboardShortageRecord subset defined in Section 8. It includes only sufficient, gap-eligible SHORTAGE forecasts and is ranked by absolute gap descending, then district_id, then skill_id, then period ascending.

top_emerging_skills is a named DashboardEmergingSkillRecord subset based on Issue #18. It is ranked by emerging_score descending, then recent_growth descending, then district_id, then skill_id. Issue #18 must expose those ranking fields; a change to that output requires reconciliation here before implementation.

active_warnings uses the warning records and deterministic prioritization defined by Issue #17. The dashboard must not introduce a second warning-ranking algorithm.

## 7.2 GET /api/v1/districts

Returns canonical districts.

Query parameters: state_id, active_only (default true), page (default 1), page_size (default 25, maximum 100).

page_size greater than 100 returns 422 / VALIDATION_ERROR.

Response item:

    {"district_id":"OD-KHD","name":"Khordha","state_id":"OD","state_code":"OD","lgd_district_code":"383"}

lgd_district_code is the canonical LGD district code when known and may be null when unavailable.

## 7.3 GET /api/v1/districts/{district_id}

Returns geographic intelligence for one district.

Query parameters: period and analysis_mode. analysis_mode defaults to OFFICIAL.

The applied mode is echoed in meta.analysis_mode.

Response data contains district, summary, sector_summary, top_shortages, top_emerging_skills, and active_warnings.

Schemas are referenced in Section 8:
- district → DistrictRecord
- summary → DashboardSummary
- sector_summary[] → SectorSummary
- top_shortages[] → DashboardShortageRecord
- top_emerging_skills[] → DashboardEmergingSkillRecord
- active_warnings[] → WarningRecord

top_shortages and top_emerging_skills use the same deterministic ranking rules as the dashboard.

## 7.4 GET /api/v1/skills

Returns canonical skills/job roles. This endpoint is descriptive and does not require analysis_mode.

Query parameters: sector_id, taxonomy_name, active_only, page, page_size.

page_size defaults to 25 and has a maximum of 100.

Response item includes skill_id, name, sector_id, sector_name, and taxonomy_mappings.

Each taxonomy mapping may expose taxonomy_name, taxonomy_version, taxonomy_code, mapping_method, and mapping_confidence where approved by the database contract.

## 7.5 GET /api/v1/skills/{skill_id}

Returns skill intelligence across the available geographic scope.

Query parameters: district_id, period_start, period_end, analysis_mode.

analysis_mode defaults to OFFICIAL and is echoed in meta.analysis_mode.

When supplied, period_start and period_end are inclusive. A reversed range returns 422 / VALIDATION_ERROR.

Response data contains skill, current_summary, forecasts, emerging_skill_signals, geographic_summary, and warnings.

Schemas are referenced in Section 8:
- skill → SkillRecord
- current_summary → DashboardSummary
- forecasts[] → ForecastRecord
- emerging_skill_signals[] → EmergingSkillRecord / Issue #18 output
- geographic_summary → GeographicSkillSummary
- warnings[] → WarningRecord

## 7.6 GET /api/v1/forecasts/{skill_id}

Returns forecast records for one skill across districts.

Query parameters: district_id, period_start, period_end, analysis_mode (default OFFICIAL), active_only (default true), page, page_size.

period_start and period_end are inclusive when supplied. A reversed range returns 422 / VALIDATION_ERROR.

page is 1-based. page_size defaults to 25 and is constrained to 1–100. Values above 100 return 422 / VALIDATION_ERROR.

The default sort is district_id ascending, then period ascending, with sector_id and skill_id as deterministic tie-breakers.

active_only=true is evaluated after applying the requested analysis_mode; the endpoint must never silently substitute a forecast from another provenance mode.

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

forecast_id is a UUID string representing the persisted forecast_results record identifier. It is an API identifier extension and does not replace the Issue #5 analytical contract.

Nested forecast objects use Issue #5 v1.1 shapes:
- model uses the Issue #5 model object and is null whenever data_status is not SUFFICIENT.
- forecast_uncertainty uses the Issue #5 forecast_uncertainty shape.
- confidence_inputs uses the Issue #5 v1.1 confidence_inputs shape and its documented history semantics.
- evidence_coverage uses the Issue #5 v1.1 field semantics.

The backend must not silently mix OFFICIAL and DEMO results.

## 7.7 GET /api/v1/early-warnings

Returns active or historical warnings.

Query parameters: district_id, skill_id, period, warning_type, severity, analysis_mode (default OFFICIAL), active_only, page, page_size.

analysis_mode defaults to OFFICIAL and the applied value is echoed in meta.analysis_mode.

Response item contains warning_id, forecast_id, emerging_skill_signal_id, warning_type, severity, detected_period, explanation_code, provenance_state, and forecast_status, plus supporting fields defined by Issue #17.

Warning type/severity vocabulary and ranking remain owned by Issue #17.

## 7.8 GET /api/v1/evidence/{forecast_id}

Returns evidence supporting a forecast result.

forecast_id is a UUID string.

A malformed UUID returns 422 / VALIDATION_ERROR. A well-formed UUID that does not identify an existing forecast returns 404 / RESOURCE_NOT_FOUND. An existing forecast with no linked evidence returns 200 with an empty evidence array.

Response data contains forecast_id and evidence items. Each evidence item may include evidence_item_id, evidence_type, source, retrieval, locator, title, observed_period, and note.

Source and retrieval metadata remain distinct from the observation period. The response preserves the forecast's stored analysis_mode and provenance_state rather than independently selecting a mode.

## 7.9 GET /api/v1/model-evaluation

Returns model evaluation information.

Query parameters: district_id, skill_id, period_start, period_end, model_name, page, page_size.

period_start and period_end are inclusive when supplied. page_size defaults to 25 and has a maximum of 100.

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

### Request schema

JSON body:

    {
      "district_id": "OD-KHD",
      "skill_id": "SOLAR_PV_TECHNICIAN",
      "start_period": "2027",
      "training_duration_months": 12,
      "seats": 1000,
      "completion_rate": 0.85,
      "horizon_end": "2031",
      "analysis_mode": "OFFICIAL"
    }

| Field | Type | Required | Constraint |
|---|---|---|---|
| district_id | string | yes | Non-empty canonical district ID |
| skill_id | string | yes | Non-empty canonical skill ID |
| start_period | string | yes | Exactly YYYY |
| training_duration_months | integer | yes | Greater than or equal to 1 |
| seats | integer | yes | Greater than or equal to 0 |
| completion_rate | number | yes | 0.0 to 1.0 inclusive |
| horizon_end | string | no | YYYY; defaults to latest available baseline forecast period for district + skill + analysis_mode |
| analysis_mode | enum | no | OFFICIAL or DEMO; defaults to OFFICIAL |

horizon_end must be greater than or equal to start_period.

A simulation is stateless and is not persisted as a forecast result.

The calculation follows the architecture rule:
- lag_years = ceil(training_duration_months / 12)
- effective_additional_supply = seats × completion_rate
- added supply becomes available from start_period + lag_years and persists through the scenario horizon.

### Response schema

Every valid simulation request returns HTTP 200, including insufficient baseline data.

    {
      "data": {
        "district_id": "OD-KHD",
        "skill_id": "SOLAR_PV_TECHNICIAN",
        "start_period": "2027",
        "horizon_end": "2031",
        "analysis_mode": "OFFICIAL",
        "lag_years": 1,
        "effective_additional_supply": 850,
        "baseline_data_status": "SUFFICIENT",
        "gap_reduction": 0.68,
        "simulation_note_code": null,
        "periods": [
          {
            "period": "2027",
            "baseline_data_status": "SUFFICIENT",
            "baseline_reason_code": null,
            "baseline_status": "SHORTAGE",
            "baseline_forecast_demand": 1250,
            "baseline_forecast_supply": 900,
            "baseline_gap": 350,
            "added_supply": 0,
            "simulated_supply": 900,
            "simulated_gap": 350
          },
          {
            "period": "2028",
            "baseline_data_status": "SUFFICIENT",
            "baseline_reason_code": null,
            "baseline_status": "SHORTAGE",
            "baseline_forecast_demand": 1300,
            "baseline_forecast_supply": 920,
            "baseline_gap": 380,
            "added_supply": 850,
            "simulated_supply": 1770,
            "simulated_gap": -470
          }
        ]
      },
      "meta": {
        "request_id": "req_123",
        "analysis_mode": "OFFICIAL"
      }
    }

Each periods[] entry contains exactly these core scenario fields plus baseline status metadata:

| Field | Type | Nullability / semantics |
|---|---|---|
| period | YYYY string | Required |
| baseline_data_status | enum | SUFFICIENT, INSUFFICIENT_DATA, or UNAVAILABLE |
| baseline_reason_code | string or null | Uses Issue #5 insufficient-data reason vocabulary when applicable |
| baseline_status | enum or null | Issue #5 analytical status; null when baseline data is not sufficient |
| baseline_forecast_demand | number or null | Null when baseline forecast is unavailable |
| baseline_forecast_supply | number or null | Null when baseline forecast is unavailable |
| baseline_gap | number or null | Null when gap is unavailable |
| added_supply | number or null | Null when baseline data is not sufficient |
| simulated_supply | number or null | Null when baseline data is not sufficient |
| simulated_gap | number or null | Null when baseline data is not sufficient |

Top-level gap_reduction is the reduction at horizon_end when the horizon-end baseline is SUFFICIENT and has a positive baseline gap:

    (baseline_gap - simulated_gap) / baseline_gap

It is null when this is not computable, including no positive baseline shortage or insufficient/unavailable horizon-end data.

simulation_note_code is intentionally separate from Issue #5 reason_code. It is a simulator-only enum:
- COHORT_AFTER_HORIZON — cohort becomes available after the final scenario period; scenario values remain equal to baseline within the horizon.
- NO_POSITIVE_BASELINE_GAP — the relevant baseline gap is zero or negative, so gap reduction is undefined.
- BASELINE_INSUFFICIENT_DATA — one or more required baseline periods are insufficient for scenario computation.
- BASELINE_UNAVAILABLE — required baseline forecast data is unavailable.

When simulation_note_code is COHORT_AFTER_HORIZON, the per-period baseline values are returned unchanged and scenario values equal the baseline values within the horizon. This is a valid simulation result, not an API error.

### Insufficient-data behaviour

When a baseline forecast period is INSUFFICIENT_DATA, the simulator returns HTTP 200. That period preserves baseline_data_status=INSUFFICIENT_DATA and the Issue #5 baseline_reason_code; the baseline forecast/gap fields and all scenario values for that period are null. The simulator must not turn insufficient data into zero or raise a request error.

## 7.11 POST /api/v1/generate-brief

Generates an optional AI-assisted planning brief from structured SHRAMIK outputs.

### Request

    {
      "district_id": "OD-KHD",
      "skill_id": "SOLAR_PV_TECHNICIAN",
      "forecast_ids": [
        "550e8400-e29b-41d4-a716-446655440000"
      ],
      "warning_ids": [],
      "include_evidence": true
    }

Request rules:
- district_id and skill_id are required non-empty strings.
- forecast_ids must contain existing forecast UUIDs.
- warning_ids must identify existing warning records when supplied.
- A malformed forecast UUID returns 422 / VALIDATION_ERROR.
- A well-formed but unknown forecast ID or warning ID returns 404 / RESOURCE_NOT_FOUND.
- The backend validates that supplied forecast records belong to the requested district and skill; incompatible references return 422 / VALIDATION_ERROR.
- include_evidence defaults to true.

### Response

    {
      "data": {
        "brief": "…",
        "generated_at": "2026-10-05T04:30:00Z",
        "cached": false,
        "input_hash": "sha256:…",
        "model": "configured-llm-model",
        "forecast_ids": [
          "550e8400-e29b-41d4-a716-446655440000"
        ]
      },
      "meta": {
        "request_id": "req_123"
      }
    }

The response forecast_ids are the IDs actually used to generate the returned brief after backend validation and availability filtering.

input_hash is the stable hash of the normalized structured brief input used for cache identity.

AI rules:
- The LLM receives structured analytical values from the backend.
- It must not invent forecast values, evidence, sources, confidence levels, or scenario results.
- Insufficient inputs must be stated, not fabricated around.
- The brief endpoint is optional and must not block core analytics.
- Backend may cache identical structured inputs using the stable input hash.
- Provider failure returns 503 / AI_UNAVAILABLE.
- Provider timeout returns 504 / AI_TIMEOUT.
- Core analytical endpoints remain usable when AI generation fails.

## 7.12 Cross-endpoint filtering, pagination, provenance, CORS, and caching

### Analysis-mode default

All analytical endpoints that expose analysis_mode use OFFICIAL as the default. DEMO must always be explicit. No endpoint may silently mix OFFICIAL and DEMO records.

For every endpoint that accepts analysis_mode, the response meta must echo the applied mode, including OFFICIAL when the caller did not supply the parameter.

For endpoints where mode is derived rather than selected, such as evidence for a known forecast, the response preserves the persisted forecast's mode and provenance.

### Pagination

Collection endpoints use:
- 1-based page
- default page_size=25
- maximum page_size=100

page_size above 100 returns 422 / VALIDATION_ERROR.

Collection responses include meta.page, meta.page_size, and meta.total.

### Period ranges

All period_start / period_end filters are inclusive. Reversed ranges return 422 / VALIDATION_ERROR.

### CORS

FastAPI must enforce an explicit CORS allowlist through backend configuration, for example CORS_ALLOWED_ORIGINS, containing the deployed Vercel frontend origin(s) and required local development origins. Access-Control-Allow-Origin: * is not permitted for the deployed API.

### HTTP caching

MVP read endpoints use Cache-Control: no-store. Internal AI brief caching is server-side application caching and does not change the default read-endpoint HTTP cache policy.


## 8. Shared Response Schemas and Contract References

### 8.1 ForecastRecord

Any endpoint returning a detailed forecast record must preserve the Issue #5 v1.1 field names exactly. Do not create alternate names such as forecasted_demand, shortage_amount, or confidence_score.

ForecastRecord is the Issue #5 canonical analytical record plus the API-only forecast_id UUID string.

### 8.2 Named nested schemas

**DashboardSummary**

    {
      "forecast_results": 42,
      "shortage_count": 12,
      "balanced_count": 18,
      "oversupply_count": 7,
      "no_demand_count": 2,
      "insufficient_data_count": 2,
      "gap_ineligible_count": 1,
      "warning_count": 8,
      "emerging_skill_count": 6
    }

**DashboardShortageRecord**

A compact subset of ForecastRecord containing at least forecast_id, analysis_mode, provenance_state, district_id, sector_id, skill_id, period, data_status, gap_eligible, gap, status, confidence_level, and evidence_coverage. Ranking is defined in Section 7.1.

**DashboardEmergingSkillRecord**

A compact subset of Issue #18 emerging-skill output containing at least district_id, sector_id, skill_id, emerging_score, recent_growth, trend_direction, observation_periods, and status. Ranking is defined in Section 7.1.

**DistrictRecord / DistrictItem**

district_id, name, state_id, state_code, and lgd_district_code, where lgd_district_code is string or null.

**SectorSummary**

sector_id, sector_name, and the same mutually exclusive forecast-count fields defined by DashboardSummary for the district/sector scope.

**SkillRecord / SkillItem**

skill_id, name, sector_id, sector_name, and taxonomy_mappings.

**EmergingSkillRecord**

The structured output defined by Issue #18. The API preserves its finalized field names and explicit insufficient-data semantics.

**WarningRecord**

The structured warning output defined by Issue #17, including warning identifier, linked forecast/signal identifiers, type, severity, detected period, explanation code, provenance, forecast status, confidence/evidence fields, and ranking-supporting signals where exposed by #17.

**GeographicSkillSummary**

A deterministic geographic roll-up of the selected skill using the same forecast and count semantics as DashboardSummary; exact aggregation fields remain owned by the skill-intelligence implementation.

### 8.3 Issue #5 nested-object references

model, forecast_uncertainty, and confidence_inputs are not independently redefined here. They use the shapes and controlled semantics from Issue #5 v1.1.

model is null whenever data_status is not SUFFICIENT.

confidence_inputs preserves Issue #5 history semantics, including history_periods, total_history_periods, synthetic_history_periods, is_contiguous, and the documented coverage/freshness/error/uncertainty/source-count fields.

### 8.4 Collection and single-resource envelopes

Collection response:

    {
      "data": [],
      "meta": {
        "request_id": "req_123",
        "page": 1,
        "page_size": 25,
        "total": 100,
        "analysis_mode": "OFFICIAL"
      }
    }

Single-resource analytical response:

    {
      "data": {},
      "meta": {
        "request_id": "req_123",
        "analysis_mode": "OFFICIAL"
      }
    }

meta.analysis_mode is included whenever the endpoint supports or derives an analytical mode.


## 9. Provenance Rules

OFFICIAL requires provenance_state = SOURCE_BACKED.

DEMO explicitly exposes analysis_mode = DEMO and provenance_state = SYNTHETIC_DEMO or MIXED_PROVENANCE.

History diagnostics inside confidence_inputs retain Issue #5 v1.1 semantics: history_periods is source-backed usable history, total_history_periods is total usable model history, synthetic_history_periods is synthetic model history, and is_contiguous indicates whether observed years are consecutive. Missing/non-computable diagnostics are serialized as null when the documented key is included.

The API never silently converts DEMO output into OFFICIAL output and never uses synthetic observations in an OFFICIAL analytical response.


## 10. Filtering and Pagination

Collection endpoints use 1-based page numbering and bounded page_size values with a maximum of 100.

Filters that affect analytical interpretation must be explicit, especially analysis_mode, district, skill, sector, and period.

For forecast collections, active_only is applied within the selected analysis_mode. The default ordering is documented in Section 7.6.

All supplied period_start and period_end values are inclusive.


## 11. HTTP Semantics

- GET single/collection: 200
- POST simulation: 200 for every valid request, including INSUFFICIENT_DATA baselines
- POST brief generation: 200 on successful generation or cache hit
- Query/path/header/body validation failure: 422 / VALIDATION_ERROR
- Endpoint-level semantic request rejection: 400 / INVALID_REQUEST
- Missing resource: 404 / RESOURCE_NOT_FOUND
- Evidence absent for an existing forecast: 200 with an empty list
- Unexpected backend error: 500 / INTERNAL_ERROR
- Non-AI dependency unavailable: 503 / SERVICE_UNAVAILABLE
- AI provider failure: 503 / AI_UNAVAILABLE
- AI provider timeout: 504 / AI_TIMEOUT

Valid requests with data_status = INSUFFICIENT_DATA return HTTP 200 with the documented analytical null semantics.

HTTP status codes must not be used to represent analytical insufficiency.


## 12. Implementation Boundary

Issue #4 defines API contracts only. Implementation must use FastAPI/Pydantic models, validate inputs, map database/provenance state to the public contract, return stable error envelopes, preserve per-period provenance for multi-period responses, and enforce the CORS and HTTP-cache rules in Section 7.12.

Frontend developers consume only the documented schemas in this document and the referenced Issue #5, #17, and #18 contracts.


## 13. Contract Ownership

| Area | Owner |
|---|---|
| HTTP envelopes, endpoint naming, validation/status mapping | #4 |
| Database storage | #2 / #8 |
| Forecast analytical fields and nested model/confidence/uncertainty shapes | #5 |
| Canonical source/data availability | #7 |
| Demand/supply methodology | #13 |
| Forecasting methodology | #14 |
| Gap classification | #15 |
| Confidence/evidence scoring | #16 |
| Early-warning taxonomy/rules/ranking | #17 |
| Emerging-skill detection and output fields | #18 |
| Simulator implementation | #19 |
| Model evaluation metrics | #22 |
| AI planning brief implementation/provider behaviour | #23 |


## 14. Acceptance Checklist

- [x] API responsibility separated from backend implementation
- [x] REST versioning approach defined
- [x] JSON naming and representation conventions defined
- [x] Standard single-resource envelope defined
- [x] Standard collection envelope defined
- [x] Standard error envelope defined
- [x] Dashboard endpoint defined
- [x] Dashboard summary counts, named subsets, and deterministic ranking rules defined
- [x] District endpoints defined
- [x] Skills endpoints defined
- [x] Forecast endpoint defined
- [x] Forecast default sort and inclusive period filters defined
- [x] Early-warning endpoint defined
- [x] Evidence endpoint defined, including 404-vs-empty semantics
- [x] Model-evaluation endpoint defined
- [x] What-if simulator endpoint defined with explicit request/response schemas
- [x] Simulator insufficient-data behaviour defined as HTTP 200
- [x] Simulator note-code vocabulary separated from Issue #5 reason_code
- [x] AI planning-brief endpoint defined
- [x] AI failure/timeout contracts defined
- [x] Forecast response mapped to Issue #5 v1.1
- [x] Nested forecast object references and null rules defined
- [x] Provenance and null semantics defined
- [x] Consistent OFFICIAL analysis-mode default and response echo defined
- [x] Pagination maximum and validation response defined
- [x] Request-ID generation/correlation defined
- [x] CORS allowlist defined
- [x] MVP HTTP caching policy defined
- [x] Cross-issue ownership defined


## 15. Open Decisions / Follow-ups

| Decision | Owner |
|---|---|
| Exact dashboard aggregation formulas beyond the documented count semantics | #13–#18 as applicable |
| Final warning type/severity vocabulary and ranking implementation | #17 |
| Final emerging-skill methodology and any output-field changes | #18 |
| Exact model-evaluation metrics | #22 |
| Final simulator implementation extensions beyond this request/response contract | #19 |
| Final AI brief prompt/model/provider details | #23 |
| Authentication / RBAC | Post-MVP architecture follow-up |
| Rate limiting / quotas | Deployment/operations follow-up |

These follow-ups must not silently change the stable core envelopes, forecast field names, provenance rules, simulator schema, or dashboard ranking/count semantics. Any breaking or interpretation-changing change requires a contract update before dependent implementation proceeds.

