# SHRAMIK ML Output Contract

**Issue:** #5 — Define SHRAMIK ML output contract
**Status:** v1.1 — implementation contract
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

For the MVP, each canonical skill/job role maps to exactly one canonical sector. This keeps the District × Sector × Skill key unambiguous. Issue #2 must enforce this relationship in the database design. A future many-to-many sector relationship would require an explicit schema/contract revision.

## 3. Canonical Analytical Record

Representative **OFFICIAL/source-backed** output:

    {
      "contract_version": "1.1",
      "analysis_mode": "OFFICIAL",
      "provenance_state": "SOURCE_BACKED",
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
      "forecast_demand": 1250,
      "forecast_supply": 900,
      "gap_eligible": true,
      "gap_eligibility_reason": null,
      "gap": 350,
      "status": "SHORTAGE",
      "forecast_uncertainty": null,
      "confidence_level": "MEDIUM",
      "confidence_inputs": {
        "history_periods": 4,
        "total_history_periods": 4,
        "synthetic_history_periods": 0,
        "is_contiguous": true,
        "data_coverage": 0.92,
        "data_freshness_days": 45,
        "forecast_error": 0.14,
        "uncertainty_available": false,
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

Representative **DEMO/mixed-provenance** output pattern when source-backed history is too short:

    {
      "contract_version": "1.1",
      "analysis_mode": "DEMO",
      "provenance_state": "MIXED_PROVENANCE",
      "district_id": "OD-KHD",
      "sector_id": "RENEWABLE_ENERGY",
      "skill_id": "SOLAR_PV_TECHNICIAN",
      "period_type": "YEAR",
      "period": "2027",
      "data_status": "SUFFICIENT",
      "demand_quantity": 1250,
      "supply_quantity": 900,
      "forecast_demand": 1310,
      "forecast_supply": 940,
      "gap_eligible": true,
      "gap_eligibility_reason": null,
      "gap": 370,
      "status": "SHORTAGE",
      "confidence_level": "MEDIUM",
      "confidence_inputs": {
        "history_periods": 2,
        "total_history_periods": 5,
        "synthetic_history_periods": 3,
        "is_contiguous": true
      }
    }

The DEMO record is intentionally not source-backed even though it is computationally sufficient. Its provenance_state and analysis_mode make the distinction explicit. Its confidence cannot exceed MEDIUM because synthetic observations contributed.

The numbers, years, IDs, and model metadata in these examples are illustrative only. The system must derive forecast periods from the actual canonical dataset and configured forecast horizon; 2027 is not a hard-coded forecast year.
## 4. Field Definitions

| Field | Type | Required | Unit / Scale | Meaning |
|---|---|---:|---|---|
| contract_version | string | Yes | semantic version | Contract version |
| analysis_mode | enum | Yes | OFFICIAL/DEMO | Execution mode used to produce the result |
| provenance_state | enum | Yes | SOURCE_BACKED/SYNTHETIC_DEMO/MIXED_PROVENANCE | Provenance of the historical data materially used by the result |
| district_id | string | Yes | ID | Canonical district |
| sector_id | string | Yes | ID | Canonical sector |
| skill_id | string | Yes | ID | Canonical skill/job role |
| period_type | enum | Yes | YEAR | MVP time granularity |
| period | string | Yes | YYYY | Analytical/forecast period |
| data_status | enum | Yes | status | Computational data/result availability |
| reason_code | enum/null | Required when data_status is not SUFFICIENT; null otherwise | machine-readable code | Why the result is insufficient/unavailable |
| demand_quantity | number/null | Yes | headcount | Latest usable observed demand feeding the forecast |
| supply_quantity | number/null | Yes | headcount | Latest usable observed supply feeding the forecast |
| demand_index | number/null | Yes | 0–100 | Display/ranking indicator |
| supply_index | number/null | Yes | 0–100 | Display/ranking indicator |
| forecast_demand | number/null | Yes | headcount | Forecast demand |
| forecast_supply | number/null | Yes | headcount | Forecast supply |
| gap_eligible | boolean/null | Yes | boolean | Whether demand and supply signals are comparable for the gap calculation |
| gap_eligibility_reason | enum/null | Required when gap_eligible=false; null otherwise | machine-readable code | Why a comparable gap cannot be calculated |
| gap | number/null | Yes | headcount | Forecast demand minus forecast supply when gap_eligible=true |
| status | enum/null | Yes | classification | SHORTAGE/BALANCED/OVERSUPPLY/NO_DEMAND when gap_eligible=true |
| forecast_uncertainty | object/null | Optional | interval | Defensible uncertainty bounds |
| confidence_level | enum/null | Yes | HIGH/MEDIUM/LOW | Trust classification |
| confidence_inputs | object/null | Optional | mixed | Inputs used by confidence layer |
| evidence_coverage | number/null | Yes | 0–1 | Evidence support measure |
| model | object/null | Required with forecast | metadata | Model and cutoff metadata |
## 5. Data Status

data_status allowed values:

- SUFFICIENT
- INSUFFICIENT_DATA
- UNAVAILABLE

Meaning:

- SUFFICIENT — required computational inputs are available for the requested result under the declared analysis_mode.
- INSUFFICIENT_DATA — required computational history/source data is insufficient under the declared analysis_mode.
- UNAVAILABLE — a required dependency, source, or model is unavailable.

analysis_mode allowed values:

- OFFICIAL — synthetic observations are never used by the forecasting computation.
- DEMO — synthetic observations may be used to complete a demonstrable forecast series when source-backed history is too short.

provenance_state describes the data actually used:

- SOURCE_BACKED — all historical observations materially used by the result are source-backed.
- SYNTHETIC_DEMO — all historical observations materially used are synthetic/demo.
- MIXED_PROVENANCE — both source-backed and synthetic observations materially contribute.

The provenance state is mandatory because data_status = SUFFICIENT must never imply that a result is based entirely on official observations.

### Mode-specific minimum-history rule

In OFFICIAL mode:

- only source-backed usable observations count toward forecast eligibility
- MIN_FORECAST_HISTORY = 3 remains the provisional MVP minimum
- a series below the minimum returns INSUFFICIENT_DATA

In DEMO mode:

- the model may use source-backed and synthetic observations together
- total_history_periods is the number of usable observations actually supplied to the forecasting model
- history_periods remains the number of source-backed usable observations
- synthetic_history_periods is the number of synthetic usable observations supplied to the model
- forecast eligibility uses total_history_periods >= MIN_FORECAST_HISTORY
- the result must be labelled with the appropriate provenance_state

This keeps the prototype demonstrable without allowing fabricated years to masquerade as official history.

### Precedence

If data_status is not SUFFICIENT:

- forecast_demand = null
- forecast_supply = null
- gap_eligible = null
- gap_eligibility_reason = null
- gap = null
- status = null
- confidence_level = null
- forecast_uncertainty = null
- evidence_coverage = null
- model = null

Historical demand_quantity and supply_quantity may remain non-null when those observed values are available.

confidence_inputs may remain non-null as diagnostics when some inputs are known.

A valid request with insufficient history is normally HTTP 200, not an API error.

HTTP errors are for invalid requests, system failures, unavailable services, and similar conditions.

Do not replace missing values with zero.

### reason_code

The ML layer must provide a machine-readable reason_code when data_status is not SUFFICIENT.

Initial values:

- INSUFFICIENT_HISTORY
- SOURCE_UNAVAILABLE
- REQUIRED_INPUT_MISSING
- MODEL_UNAVAILABLE
- MODEL_FAILURE

For SUFFICIENT results, reason_code must be null.

Valid mappings for MVP:

- INSUFFICIENT_DATA → INSUFFICIENT_HISTORY or REQUIRED_INPUT_MISSING
- UNAVAILABLE → SOURCE_UNAVAILABLE, MODEL_UNAVAILABLE, or MODEL_FAILURE

A validator must reject reason_code/data_status combinations outside these mappings.
## 6. Demand and Supply Quantities

demand_quantity:

- type: number/null
- unit: worker/position headcount
- minimum: 0

Meaning: the latest usable observed demand quantity for this location/sector/skill series that feeds the forecast. For a forecast period of 2027, this may be the 2026 observation (or the latest available historical observation before 2027).

supply_quantity:

- type: number/null
- unit: worker headcount
- minimum: 0

Meaning: the latest usable observed supply quantity for this location/sector/skill series that feeds the forecast. For a forecast period of 2027, this may be the 2026 observation (or the latest available historical observation before 2027).

These are compatible historical quantities used by forecasting and gap analysis.

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

The precise normalization reference set (for example, the eligible location/skill population and time window used to scale values to 0–100) is defined by **Issue #13** and must be versioned. Consumers must not infer the reference population from the numeric value alone.

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

This is provisional and must be validated against the **source-backed** canonical dataset in Issue #7.

A source-backed usable yearly observation:

- has a valid year
- has a non-null required demand/supply value needed by the selected forecast
- passes ingestion/validation rules
- is not otherwise excluded by the data-quality pipeline
- is source-backed

A computationally usable observation follows the same validation rules but may be synthetic when analysis_mode = DEMO.

Only source-backed observations count toward official history coverage and the evidence-based recommendation for MIN_FORECAST_HISTORY.

When OFFICIAL mode has fewer than the configured minimum source-backed observations:

- do not produce a forecast
- set data_status = INSUFFICIENT_DATA
- set forecast fields and gap/status to null
- expose reason_code = INSUFFICIENT_HISTORY
- allow a descriptive historical view where appropriate

When DEMO mode reaches the configured minimum using synthetic observations:

- a forecast may be produced
- provenance_state must show SYNTHETIC_DEMO or MIXED_PROVENANCE
- history_periods remains source-backed count
- total_history_periods reflects the full computational history
- synthetic history must not increase the confidence/history evidence used to claim official coverage

Annual data must not be fabricated into monthly or quarterly observations.
## 9.1 Validated History and Contiguity

For the minimum-history count, usable observations do **not** have to be consecutive. For example, 2021, 2022, and 2024 are three usable years, but the series is marked non-contiguous because 2023 is missing.

The forecasting engine must receive the actual observed years and must not silently fabricate missing periods.

- The naive last-value baseline may operate on non-contiguous annual observations when the latest usable observation is valid.
- Trend/growth models that require regular intervals must enforce their own contiguity requirement or use a separately documented missing-period method.
- A missing year never becomes an observed year merely because a model requires regular spacing.
- Diagnostic output should expose is_contiguous when the period sequence is known.

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

This interval is **illustrative only; it is not produced by the required naive_last_value baseline unless a separate validated uncertainty method is explicitly implemented**.

Rules:

- lower <= upper
- lower >= 0
- 0 < level < 1
- do not fabricate uncertainty
- if defensible uncertainty cannot be produced, return null or available = false
- for the required naive_last_value MVP baseline, the default is **forecast_uncertainty = null** unless the implementation has a documented, validated method for producing an interval

## 12. Gap

The mathematical gap is:

**Forecast Demand − Forecast Supply**

Unit:

**headcount-style quantity**

The field name gap is retained for contract stability. It is **not automatically a literal labour-force shortage**.

For the prototype, when the underlying signals are notified vacancies versus annual training completions, the resulting value is a:

**skill-pipeline pressure indicator**

not a direct estimate of the number of workers the labour market is short of.

### Gap eligibility

gap_eligible indicates whether the demand and supply signals are comparable enough for this calculation.

When gap_eligible = true:

- gap = forecast_demand - forecast_supply
- status may be calculated using the configured thresholds

When gap_eligible = false:

- forecast_demand may remain populated
- forecast_supply may remain populated
- gap = null
- gap_eligibility_reason is required
- status = NO_DEMAND when the analytical engine's configured MIN_FORECAST_DEMAND policy threshold is met, even when gap_eligible = false
- otherwise status = null

Initial reason values:

- INCOMPATIBLE_UNIT
- INCOMPATIBLE_FLOW_STOCK
- INCOMPATIBLE_TIME_BASIS
- INCOMPATIBLE_GEOGRAPHY
- INCOMPATIBLE_OCCUPATION_SCOPE
- INCOMPATIBLE_SIGNALS

The gap engine must not fabricate a comparable gap when eligibility fails.
## 13. Status

status allowed values:

- SHORTAGE
- BALANCED
- OVERSUPPLY
- NO_DEMAND
- null when data_status is not SUFFICIENT, or when gap_eligible = false and the NO_DEMAND condition does not apply

Status precedence:

1. If data_status != SUFFICIENT, status = null.
2. The analytical engine applies the configured MIN_FORECAST_DEMAND threshold. When the threshold condition for NO_DEMAND is met, status = NO_DEMAND even when gap_eligible = false.
3. Otherwise SHORTAGE / BALANCED / OVERSUPPLY require gap_eligible = true.
4. When gap_eligible = false and the NO_DEMAND condition does not apply, status = null.

The database only enforces the structural rule that a gap-ineligible result may carry status NULL or NO_DEMAND; it does not encode MIN_FORECAST_DEMAND.

status is the analytical labour-market classification when either NO_DEMAND applies or a comparable gap exists.

data_status is data/result availability.

gap_eligible is comparability for the gap layer.

provenance_state is provenance of the data used.

These are separate dimensions.
## 14. Gap Threshold Configuration

Initial configuration location:

ml/config/gap_thresholds.py

Initial relative policy:

- SHORTAGE: gap > +10% of forecast demand
- BALANCED: -10% <= gap <= +10% of forecast demand
- OVERSUPPLY: gap < -10% of forecast demand

The percentage is configurable and must not be duplicated in frontend code.

Boundary example: exactly +10% of forecast demand is **BALANCED**, not SHORTAGE.

## 15. Zero / Near-Zero Demand

Configuration:

MIN_FORECAST_DEMAND = TBD

The final starting value must be selected from the canonical dataset in Issues #5/#7 and the rationale must be recorded.

Until then, automated tests must **inject the configured value** rather than depending on a hidden hard-coded number.

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
      "history_periods": 2,
      "total_history_periods": 5,
      "synthetic_history_periods": 3,
      "is_contiguous": true,
      "data_coverage": 0.92,
      "data_freshness_days": 45,
      "forecast_error": 0.14,
      "uncertainty_available": false,
      "source_count": 3
    }

Required semantics:

- history_periods: integer >= 0; **source-backed usable history count**
- **v1.1 semantic change:** `history_periods` specifically means source-backed usable historical periods; it no longer means all computationally usable periods. `total_history_periods` and `synthetic_history_periods` separately describe the computational history supplied to the model.
- total_history_periods: integer >= 0; total usable history actually supplied to the model
- synthetic_history_periods: integer >= 0; synthetic usable history supplied to the model
- is_contiguous: boolean/null; whether the observed periods used for the model are consecutive
- data_coverage: 0–1
- data_freshness_days: integer/null >= 0
- forecast_error: number/null >= 0
- uncertainty_available: boolean
- source_count: integer/null >= 0

The exact confidence scoring formula is owned by Issue #16.

history_periods must not be redefined to include synthetic observations.

total_history_periods exists specifically so demo-mode model inputs are transparent.
## 18. Minimum-History Confidence Cap

Configuration belongs under ml/config.

MVP settings:

MIN_FORECAST_HISTORY = 3
HIGH_CONFIDENCE_MIN_HISTORY = 5

The confidence cap is based on source-backed history, not synthetic history:

- 0–2 source-backed periods → HIGH is not allowed; other evidence/model factors determine whether the result is LOW or MEDIUM in DEMO mode
- 3–4 source-backed periods → maximum confidence is MEDIUM
- 5+ source-backed periods → HIGH is allowed only when other confidence inputs support it
- weak evidence or poor forecast quality can still produce LOW

Additional provenance cap:

- SOURCE_BACKED → normal confidence rules apply
- MIXED_PROVENANCE → maximum confidence is MEDIUM
- SYNTHETIC_DEMO → maximum confidence is LOW

This prevents synthetic data from increasing confidence merely because the synthetic series was generated with many periods.

In OFFICIAL mode, synthetic history is not present and does not affect confidence.
## 19. Evidence Coverage

evidence_coverage:

- type: number/null
- range: 0–1

It measures evidence support according to the documented evidence methodology.

It is not the same as statistical confidence.

It also differs from data_coverage:
- data_coverage = completeness of the required analytical inputs available for computation
- evidence_coverage = proportion/strength of the resulting analytical claim that is traceable to documented supporting source/evidence records

The two values may happen to be equal in some datasets, but they have different definitions and should not be calculated from the same shortcut merely because both are expressed on a 0–1 scale.

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

Validator rule: `trained_through_period < period` for every forecast record. If this condition is false, the record must be rejected as invalid rather than silently accepted.

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
      "contract_version": "1.1",
      "analysis_mode": "OFFICIAL",
      "provenance_state": "SOURCE_BACKED",
      "district_id": "OD-KHD",
      "sector_id": "RENEWABLE_ENERGY",
      "skill_id": "SOLAR_PV_TECHNICIAN",
      "period_type": "YEAR",
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

For v1.1, provenance_state makes source-backed versus demo historical inputs explicit for emerging-skill outputs as well. The v1.1 contract also makes the history-count split explicit: `history_periods` is source-backed usable history, while `total_history_periods` and `synthetic_history_periods` describe the computational history actually supplied to the model.

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

The simulator distinguishes two different baseline cases:

1. **Eligible baseline with a zero or negative gap** (including an eligible `NO_DEMAND` result):
   - `gap_reduction = null`
   - a `simulation_note_code` is returned as defined in **Issue #4, Section 7.10**
   - `simulated_gap` is still returned using the scenario calculation

2. **Baseline with `gap_eligible=false`**:
   - `baseline_gap = null`
   - `gap_reduction = null`
   - `simulated_gap = null`
   - the API returns `simulation_note_code = BASELINE_GAP_INELIGIBLE`
   - this deliberate API exception is defined in **Issue #4, Section 7.10** because no valid common-unit gap can be computed

The simulator's `simulation_note_code` is distinct from this ML contract's analytical `reason_code`; Issue #4, Section 7.10 defines its vocabulary and precedence.

## 24. Multiple Forecast Periods

The contract is defined per forecast-period record.

For example, 2027, 2028, and 2029 are three separate records.

Each period may have its own:

- data_status
- reason_code
- analysis_mode
- provenance_state
- forecast values
- gap_eligible
- gap_eligibility_reason
- gap
- confidence
- uncertainty

Issue #4 defines the multi-period API envelope. It must preserve the per-period provenance and gap-eligibility state so mixed horizons remain explainable.

The ML contract is intentionally **period-level**: a later forecast period may have different data_status, provenance, or confidence from an earlier period. The multi-period API must preserve those per-period states rather than collapsing a mixed horizon into one global status.
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
- 1.1 = provenance, demo-mode, gap-eligibility and history diagnostics
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
- [x] Baseline uncertainty default defined
- [x] Gap defined
- [x] Gap eligibility defined
- [x] Status enum defined
- [x] data_status enum defined
- [x] analysis mode defined
- [x] provenance state defined
- [x] status/data_status/gap eligibility separation defined
- [x] NO_DEMAND precedence over gap eligibility defined
- [x] reason_code semantics defined
- [x] Incompatible-signal handling defined
- [x] Insufficient-data behaviour defined
- [x] Forecast minimum history defined provisionally as 3
- [x] Official history count separated from demo computational history
- [x] Non-contiguous history semantics defined
- [x] Baseline model defined
- [x] Uncertainty structure defined
- [x] Confidence representation defined
- [x] Confidence inputs defined
- [x] Provenance-aware confidence cap defined
- [x] Evidence coverage and data-coverage distinction defined
- [x] Model metadata/versioning defined
- [x] Model-vs-business-logic boundary defined
- [x] Emerging-skill output defined separately
- [x] Multi-period semantics defined
- [x] Compatibility rules defined
- [x] Pressure-indicator wording defined for gap
- [ ] Exact database field mapping finalized in Issue #42 / schema reconciliation
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
