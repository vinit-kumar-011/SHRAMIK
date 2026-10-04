# SHRAMIK ML Output Contract

**Issue:** #5 — Define SHRAMIK ML output contract
**Status:** Draft v1.0 — implementation contract
**Owner:** Lead
**Branch:** feature/ml-output-contract

## 1. Purpose

This document defines the stable interface between SHRAMIK analytics/ML and the backend.

ML developers may change internal implementation details, but consumers must continue to receive the documented structure, units, status semantics, null behaviour, and metadata.

This is a data contract, not a model implementation specification.

The ML layer does not own HTTP formatting, frontend formatting, policy decisions, or LLM-generated explanations.

## 2. Core Analytical Unit

Each record represents:

**District × Sector × Skill × Forecast Period**

Required identity fields:

- district_id: string
- sector_id: string
- skill_id: string
- period_type: YEAR for MVP
- period: YYYY; the actual year is determined from the latest available observed period and forecast horizon. Any year shown below (such as 2027) is illustrative only.

All forecast quantities use compatible headcount-style units.

Demand and supply must be normalized into compatible units before a gap is calculated.

## 3. Canonical Analytical Record

Representative output:

    {
      "contract_version": "1.0",
      "district_id": "OD-KHD",
      "sector_id": "RENEWABLE_ENERGY",
      "skill_id": "SOLAR_PV_TECHNICIAN",
      "period_type": "YEAR",
      "period": "2027",
      "data_status": "SUFFICIENT",
      "demand_quantity": 1250,
      "supply_quantity": 900,
      "demand_index": 78.4,
      "supply_index": 55.1,
      "forecast_demand": 1380,
      "forecast_supply": 1010,
      "gap": 370,
      "status": "SHORTAGE",
      "forecast_uncertainty": {
        "available": true,
        "lower": 1290,
        "upper": 1470,
        "level": 0.80
      },
      "confidence_level": "MEDIUM",
      "confidence_inputs": {
        "history_periods": 4,
        "data_coverage": 0.92,
        "data_freshness_days": 45,
        "forecast_error": 0.14,
        "uncertainty_available": true,
        "source_count": 3
      },
      "evidence_coverage": 0.92,
      "model": {
        "name": "naive_last_value",
        "version": "v1",
        "is_baseline": true,
        "trained_through_period": "2026"
      }
    }

The numbers, years, IDs, and model metadata in this example are illustrative only. The system must derive forecast periods from the actual canonical dataset and configured forecast horizon; 2027 is not a hard-coded forecast year.

## 4. Field Definitions

| Field | Type | Required | Unit / Scale | Meaning |
|---|---|---:|---|---|
| contract_version | string | Yes | semantic version | Contract version |
| district_id | string | Yes | ID | Canonical district |
| sector_id | string | Yes | ID | Canonical sector |
| skill_id | string | Yes | ID | Canonical skill/job role |
| period_type | enum | Yes | YEAR | MVP time granularity |
| period | string | Yes | YYYY | Analytical/forecast period |
| data_status | enum | Yes | status | Result/data availability |
| demand_quantity | number/null | Yes | headcount | Normalized demand |
| supply_quantity | number/null | Yes | headcount | Normalized supply |
| demand_index | number/null | Yes | 0–100 | Display/ranking indicator |
| supply_index | number/null | Yes | 0–100 | Display/ranking indicator |
| forecast_demand | number/null | Yes | headcount | Forecast demand |
| forecast_supply | number/null | Yes | headcount | Forecast supply |
| gap | number/null | Yes | headcount | Demand forecast minus supply forecast |
| status | enum/null | Yes | classification | SHORTAGE/BALANCED/OVERSUPPLY/NO_DEMAND |
| forecast_uncertainty | object/null | Optional | interval | Defensible uncertainty bounds |
| confidence_level | enum/null | Yes | HIGH/MEDIUM/LOW | Trust classification |
| confidence_inputs | object/null | Optional | mixed | Inputs used by confidence layer |
| evidence_coverage | number/null | Yes | 0–1 | Evidence support measure |
| model | object | Required with forecast | metadata | Model and cutoff metadata |

## 5. Data Status

data_status allowed values:

- SUFFICIENT
- INSUFFICIENT_DATA
- UNAVAILABLE

Meaning:

- SUFFICIENT — enough usable information exists for the requested result.
- INSUFFICIENT_DATA — required history/source data is insufficient.
- UNAVAILABLE — a required dependency, source, or model is unavailable.

### Precedence

If data_status is not SUFFICIENT:

- forecast_demand = null
- forecast_supply = null
- gap = null
- status = null
- confidence_level = null

A valid request with insufficient history is normally HTTP 200, not an API error.

HTTP errors are for invalid requests, system failures, unavailable services, and similar conditions.

Do not replace missing values with zero.

## 6. Demand and Supply Quantities

demand_quantity:

- type: number/null
- unit: worker/position headcount
- minimum: 0

supply_quantity:

- type: number/null
- unit: worker headcount
- minimum: 0

These are the compatible quantities used by forecasting and gap analysis.

## 7. Demand and Supply Indices

demand_index:

- type: number/null
- scale: 0–100
- purpose: comparison/ranking/display
- not a headcount
- never used directly in gap calculations

supply_index:

- type: number/null
- scale: 0–100
- purpose: comparison/ranking/display
- not a headcount
- never used directly in gap calculations

If required index inputs are unavailable, return null rather than zero.

## 8. Forecast Outputs

forecast_demand:

- type: number/null
- unit: worker/position headcount
- minimum: 0

forecast_supply:

- type: number/null
- unit: worker headcount
- minimum: 0

Both must use the common analytical unit required by the Gap Engine.

## 9. Forecast History Rule

MVP configuration:

MIN_FORECAST_HISTORY = 3 usable yearly observations

This is provisional and must be validated against the canonical dataset in Issue #7.

Configuration belongs under ml/config.

With fewer than the configured minimum:

- do not produce a forecast
- set data_status = INSUFFICIENT_DATA
- set forecast fields and analytical gap/status to null
- expose a reason in the API-facing layer
- allow a first-class descriptive historical-trend view where enough descriptive data exists
- never label a descriptive trend as a forecast

Annual data must not be fabricated into monthly or quarterly observations.

## 10. Forecast Baseline

Required MVP baseline:

**Naïve last-value forecast**

The next period is predicted from the most recent usable observation.

A transparent model such as exponential smoothing or linear trend may be evaluated against the baseline.

With short yearly series, the naïve baseline may legitimately win. That is an acceptable MVP outcome when time-aware evaluation does not show a reliable improvement.

## 11. Forecast Uncertainty

forecast_uncertainty is an object or null.

Representative structure:

    {
      "available": true,
      "lower": 1290,
      "upper": 1470,
      "level": 0.80
    }

Rules:

- lower <= upper
- lower >= 0
- 0 < level < 1
- do not fabricate uncertainty
- if defensible uncertainty cannot be produced, return null or available = false

## 12. Gap

gap is:

**Forecast Demand − Forecast Supply**

Unit:

**headcount**

Rules:

- positive gap = shortage pressure
- approximately zero = balanced
- negative gap = oversupply pressure

Gap must use forecast quantities, never normalized indices.

## 13. Status

status allowed values:

- SHORTAGE
- BALANCED
- OVERSUPPLY
- NO_DEMAND
- null when data_status is not SUFFICIENT

status is the analytical labour-market classification.

data_status is data/result availability.

They are separate fields.

## 14. Gap Threshold Configuration

Initial configuration location:

ml/config/gap_thresholds.py

Initial relative policy:

- SHORTAGE: gap > +10% of forecast demand
- BALANCED: -10% <= gap <= +10% of forecast demand
- OVERSUPPLY: gap < -10% of forecast demand

The percentage is configurable and must not be duplicated in frontend code.

## 15. Zero / Near-Zero Demand

Configuration:

MIN_FORECAST_DEMAND = TBD

The final starting value must be selected from the canonical dataset in Issues #5/#7 and the rationale must be recorded.

When forecast_demand < MIN_FORECAST_DEMAND and data_status = SUFFICIENT:

- status = NO_DEMAND
- do not apply the relative gap thresholds
- preserve valid forecast_demand and forecast_supply values

NO_DEMAND results produce no shortage or oversupply early warnings.

## 16. Confidence

confidence_level allowed values:

- HIGH
- MEDIUM
- LOW
- null when data_status is not SUFFICIENT

It is a trust classification for a specific district + sector + skill + forecast period.

It is not a probability.

## 17. Confidence Inputs

Representative confidence_inputs:

    {
      "history_periods": 4,
      "data_coverage": 0.92,
      "data_freshness_days": 45,
      "forecast_error": 0.14,
      "uncertainty_available": true,
      "source_count": 3
    }

The exact scoring formula is owned by Issue #16.

Required semantics:

- history_periods: integer >= 0
- data_coverage: 0–1
- data_freshness_days: integer/null >= 0
- forecast_error: number/null >= 0
- uncertainty_available: boolean
- source_count: integer/null >= 0

## 18. Minimum-History Confidence Cap

Configuration belongs under ml/config.

MVP settings:

MIN_FORECAST_HISTORY = 3
HIGH_CONFIDENCE_MIN_HISTORY = 5

Therefore:

- 3–4 usable periods → maximum confidence is MEDIUM
- 5+ usable periods → HIGH is allowed only when other confidence inputs support it
- weak evidence or poor forecast quality can still produce LOW

This makes the minimum/near-minimum-history rule explicit and configurable.

## 19. Evidence Coverage

evidence_coverage:

- type: number/null
- range: 0–1

It measures evidence support according to the documented evidence methodology.

It is not the same as statistical confidence.

Detailed scoring belongs to Issue #16. Evidence retrieval belongs to Issue #21.

## 20. Model Metadata

A forecast-producing result must include:

    {
      "name": "naive_last_value",
      "version": "v1",
      "is_baseline": true,
      "trained_through_period": "2026"
    }

Rules:

- name: string
- version: string
- is_baseline: boolean
- trained_through_period: YYYY

The cutoff is important for detecting future-data leakage.

## 21. Model Output vs Derived Business Logic

### Forecast/model layer may produce

- forecast_demand
- forecast_supply
- uncertainty
- model metadata
- validation metrics or supporting model inputs

### SHRAMIK analytical/business layer produces

- gap
- SHORTAGE/BALANCED/OVERSUPPLY/NO_DEMAND status
- confidence classification
- evidence coverage
- early warnings
- policy/scenario interpretation

The forecasting model must not silently embed policy thresholds.

## 22. Emerging-Skill Output

Emerging Skill Detection is a separate historical-series path.

Recommended structure:

    {
      "district_id": "OD-KHD",
      "sector_id": "RENEWABLE_ENERGY",
      "skill_id": "SOLAR_PV_TECHNICIAN",
      "period": "2027",
      "data_status": "SUFFICIENT",
      "emerging_skill_status": "EMERGING",
      "recent_growth_rate": 0.24,
      "historical_growth_rate": 0.08,
      "signal_strength": 0.81,
      "history_periods": 4
    }

emerging_skill_status allowed values:

- EMERGING
- NOT_EMERGING
- INSUFFICIENT_DATA

This enum is separate from data_status.

MVP minimum history is 3 usable yearly observations by default. Exact thresholds and configuration are finalized in Issue #18.

## 23. Simulator Contract Dependencies

The ML contract does not calculate scenario policy recommendations, but the analytical record must expose enough baseline values for the simulator.

The simulator consumes:

- baseline forecast demand
- baseline forecast supply
- baseline gap
- location/skill
- user scenario inputs

Training duration is converted to whole-year lag for the MVP.

If the cohort arrives after the final forecast period, the simulator reports COHORT_AFTER_HORIZON and returns the baseline unchanged.

If baseline shortage is not positive, gap_reduction is null with a reason, while simulated_gap is still returned using the scenario calculation.

## 24. Multiple Forecast Periods

The contract is defined per forecast-period record.

For example, 2027, 2028, and 2029 are three separate records.

Each period may have its own:

- data_status
- forecast values
- gap
- confidence
- uncertainty

Issue #4 defines the multi-period API envelope.

## 25. Compatibility Rules

Backward-compatible:

- adding optional fields
- adding metadata without changing existing meanings
- changing internal model implementation while preserving the output contract

Breaking:

- renaming a field
- changing a type
- changing units
- changing enum meaning
- changing required/nullability semantics
- changing the meaning of gap/status values

Breaking changes require contract review, consumer coordination, updated examples, and regression tests.

## 26. Contract Versioning

Contract version:

MAJOR.MINOR

Examples:

- 1.0 = initial contract
- 1.1 = backward-compatible optional additions
- 2.0 = breaking change

Model version is separate from contract version.

## 27. AI Coding Assistant Rules

AI-generated implementations must:

- follow these field names
- preserve documented units
- preserve null/status semantics
- keep gap based on forecast quantities
- respect minimum history
- never fabricate uncertainty
- respect model cutoff
- keep policy rules outside the forecasting model

Before committing AI-generated ML code, the developer must verify the returned structure against this contract.

## 28. Acceptance Checklist

- [x] Core analytical unit defined
- [x] Yearly MVP period defined
- [x] Demand/supply quantities defined
- [x] Demand/supply indices defined
- [x] Forecast outputs defined
- [x] Gap defined
- [x] Status enum defined
- [x] data_status enum defined
- [x] status/data_status precedence defined
- [x] Insufficient-data behaviour defined
- [x] Forecast minimum history defined provisionally as 3
- [x] Baseline model defined
- [x] Uncertainty structure defined
- [x] Confidence representation defined
- [x] Confidence inputs defined
- [x] Minimum-history confidence cap defined
- [x] Evidence coverage defined
- [x] Model metadata/versioning defined
- [x] Model-vs-business-logic boundary defined
- [x] Emerging-skill output defined separately
- [x] Multi-period semantics defined
- [x] Compatibility rules defined
- [ ] Exact database field mapping finalized in Issue #2
- [ ] Exact HTTP envelope finalized in Issue #4
- [ ] MIN_FORECAST_DEMAND validated from canonical data in Issue #7

## Related Issues

- #1 Architecture
- #2 Database schema
- #4 API contracts
- #7 Canonical dataset
- #13 Demand and supply engines
- #14 Forecasting
- #15 Gap analysis
- #16 Confidence and evidence
- #18 Emerging skills
