# SHRAMIK Database Schema

**Issue:** #2 — Design SHRAMIK database schema  
**Status:** Updated design reconciliation for provenance-aware data/ML flow  
**Owner:** Lead  
**Branch:** feature/database-schema  
**Implementation:** Issue #8 — Implement SHRAMIK database schema

---

## 1. Purpose

This document defines the MVP PostgreSQL/Supabase data model for SHRAMIK.

It converts the architectural decisions from Issue #1 and the analytical output contract from Issue #5 into a concrete database design that backend developers can implement without making independent business-model decisions.

This issue is **design only**.

- Issue #2 defines entities, relationships, field semantics, constraints, indexes, and storage boundaries.
- Issue #8 implements the approved design as PostgreSQL/Supabase migrations and seed/reference data.
- Backend developers must raise schema problems with the lead rather than silently redefining shared business semantics.

The target analytical grain is:

**District × Sector × Skill × Year**

In the MVP, a canonical skill/job role belongs to exactly one canonical sector. Sector is therefore derived through the skill relationship in database fact tables instead of being redundantly copied into every observation or result row.

---

## 2. Design Principles

### 2.1 PostgreSQL is the system of record

PostgreSQL/Supabase stores canonical reference data, validated historical observations, forecast outputs, provenance/evidence, and persisted derived signals required by the MVP.

### 2.2 Do not duplicate canonical entities

A district, sector, or skill has one canonical record.

Examples:

- districts owns district identity.
- sectors owns sector identity.
- skills owns skill/job-role identity and its canonical sector mapping.

Analytical fact tables reference these records through foreign keys.

### 2.3 Preserve the source truth

Missing observations remain NULL; they are never silently converted to zero.

Derived values must remain distinguishable from:

- official source-backed observations
- normalized/derived observations
- synthetic demo observations
- model forecasts
- scenario outputs

### 2.4 Provenance must be first-class

Observed demand/supply values carry their source directly.

Forecasts and other analytical outputs can link to concrete evidence items so the application can answer:

> "What source evidence supports this insight?"

### 2.5 Business thresholds do not belong in database constraints

Rules such as:

- MIN_FORECAST_DEMAND
- ±10% gap classification
- confidence scoring
- emerging-skill thresholds

belong to the analytics/configuration layer.

The database enforces structural validity, not policy logic.

### 2.6 Keep the MVP relational model small

Do not introduce a generic entity framework, microservice-specific databases, event sourcing, or a separate analytics warehouse for the MVP.

The simulator is stateless in the MVP and does not require a persistent scenario table. Scenario persistence can be added later if audit/history requirements justify it.

---

## 3. Entity Overview

| Entity | Purpose | Type |
|---|---|---|
| states | Canonical state/UT reference | Reference |
| districts | Canonical district reference | Reference |
| sectors | Canonical sector reference | Reference |
| skills | Canonical skill/job-role catalogue | Reference |
| skill_taxonomy_mappings | External taxonomy mappings such as NCO/NSQF/QP/NOS | Reference |
| data_sources | Source catalogue and provenance metadata | Provenance |
| demand_observations | Historical observed demand | Fact |
| supply_observations | Historical observed supply and training context | Fact |
| model_versions | Forecast model/version metadata | Model metadata |
| forecast_results | Forecast + derived gap/confidence result per model | Analytical fact |
| emerging_skill_signals | Historical-series emerging-skill output | Analytical fact |
| early_warnings | Persisted warning records derived from analytical outputs | Analytical fact |
| evidence_items | Concrete supporting evidence extracted from sources | Provenance |
| evidence_links | Links evidence to analytical outputs | Provenance |
| source_retrievals | Immutable retrieval records for downloaded/source resources | Provenance |
| synthetic_generation_runs | Immutable generation metadata for synthetic/demo runs | Provenance |

---

## 4. ER Diagram

~~~mermaid
erDiagram
    STATES ||--o{ DISTRICTS : contains
    SECTORS ||--o{ SKILLS : classifies
    SKILLS ||--o{ SKILL_TAXONOMY_MAPPINGS : maps_to
    DATA_SOURCES ||--o{ SKILLS : supports_sector_mapping

    DISTRICTS ||--o{ DEMAND_OBSERVATIONS : has
    SKILLS ||--o{ DEMAND_OBSERVATIONS : describes
    DATA_SOURCES ||--o{ DEMAND_OBSERVATIONS : supports
    SOURCE_RETRIEVALS ||--o{ DEMAND_OBSERVATIONS : identifies_retrieval

    DISTRICTS ||--o{ SUPPLY_OBSERVATIONS : has
    SKILLS ||--o{ SUPPLY_OBSERVATIONS : describes
    DATA_SOURCES ||--o{ SUPPLY_OBSERVATIONS : supports
    SOURCE_RETRIEVALS ||--o{ SUPPLY_OBSERVATIONS : identifies_retrieval
    SYNTHETIC_GENERATION_RUNS ||--o{ DEMAND_OBSERVATIONS : generates
    SYNTHETIC_GENERATION_RUNS ||--o{ SUPPLY_OBSERVATIONS : generates

    MODEL_VERSIONS ||--o{ FORECAST_RESULTS : produces
    DISTRICTS ||--o{ FORECAST_RESULTS : targets
    SKILLS ||--o{ FORECAST_RESULTS : forecasts

    DISTRICTS ||--o{ EMERGING_SKILL_SIGNALS : targets
    SKILLS ||--o{ EMERGING_SKILL_SIGNALS : identifies

    FORECAST_RESULTS ||--o{ EARLY_WARNINGS : generates
    EMERGING_SKILL_SIGNALS ||--o{ EARLY_WARNINGS : enriches

    DATA_SOURCES ||--o{ SOURCE_RETRIEVALS : retrieved_as
    DATA_SOURCES ||--o{ EVIDENCE_ITEMS : contains
    EVIDENCE_ITEMS ||--o{ EVIDENCE_LINKS : supports
    FORECAST_RESULTS ||--o{ EVIDENCE_LINKS : supported_by
    EMERGING_SKILL_SIGNALS ||--o{ EVIDENCE_LINKS : supported_by
    EARLY_WARNINGS ||--o{ EVIDENCE_LINKS : supported_by
~~~

---

## 5. Reference Tables

### 5.1 states

Canonical state/UT reference.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | TEXT | No | Primary key; canonical internal code |
| name | TEXT | No | Unique state/UT name |
| code | TEXT | No | Unique standardized state code |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

MVP is Odisha-focused, but retaining the state table avoids baking Odisha into every district record.

### 5.2 districts

Canonical district reference.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | TEXT | No | Primary key; stable canonical district ID |
| state_id | TEXT | No | FK → states.id |
| name | TEXT | No | District name |
| lgd_district_code | TEXT | Yes | Official LGD district code |
| is_active | BOOLEAN | No | Default true |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Constraint:

- UNIQUE(state_id, name)

### 5.3 sectors

Canonical sector catalogue.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | TEXT | No | Primary key; stable canonical sector ID |
| code | TEXT | No | Unique machine-readable code |
| name | TEXT | No | Unique display name |
| description | TEXT | Yes | Optional description |
| is_active | BOOLEAN | No | Default true |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

### 5.4 skills

Canonical skill/job-role catalogue.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | TEXT | No | Primary key; stable canonical skill ID |
| code | TEXT | No | Unique machine-readable code |
| name | TEXT | No | Canonical skill/job-role name |
| sector_id | TEXT | No | FK → sectors.id |
| sector_mapping_method | TEXT | No | OFFICIAL_CROSSWALK / MANUAL / INFERRED |
| sector_mapping_confidence | TEXT | No | HIGH / MEDIUM / LOW |
| sector_mapping_source_id | UUID | Yes | FK → data_sources.id when source-backed |
| sector_mapping_note | TEXT | Yes | Sector assignment rationale/provenance |
| description | TEXT | Yes | Optional description |
| is_active | BOOLEAN | No | Default true |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Critical MVP rule:

> Each canonical skills.id maps to exactly one sectors.id.

This enforces the Issue #5 requirement that the MVP analytical key remains unambiguous.

### 5.5 skill_taxonomy_mappings

Stores explicit external taxonomy relationships without inventing crosswalks.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| skill_id | TEXT | No | FK → skills.id |
| taxonomy_name | TEXT | No | Example: NCO-2015 |
| taxonomy_version | TEXT | Yes | Version/year where applicable |
| taxonomy_code | TEXT | No | External code |
| mapping_method | TEXT | No | OFFICIAL_CROSSWALK / MANUAL / INFERRED |
| mapping_confidence | TEXT | No | HIGH / MEDIUM / LOW |
| source_id | UUID | Yes | FK → data_sources.id when mapping is source-backed |
| mapping_note | TEXT | Yes | Explanation/provenance |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Constraint:

- UNIQUE(taxonomy_name, taxonomy_version, taxonomy_code, skill_id)

Rule:

- A manual mapping must be documented.
- Do not create an external mapping merely to make an unrelated source fit the schema.

---

## 6. Provenance Tables

### 6.1 data_sources

One record for each official dataset, official report, survey, web source, or other source used by SHRAMIK.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| name | TEXT | No | Source/dataset/report name |
| source_type | TEXT | No | Dataset / report / web / survey / other |
| publisher | TEXT | No | Organization/publisher |
| url | TEXT | Yes | Canonical source URL |
| publication_date | DATE | Yes | Publication date if known |
| accessed_at | TIMESTAMPTZ | Yes | Last catalogue/metadata access; exact file retrieval is tracked in source_retrievals |
| coverage_start | SMALLINT | Yes | Earliest covered year if known |
| coverage_end | SMALLINT | Yes | Latest covered year if known |
| notes | TEXT | Yes | Coverage/granularity notes |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Important:

data_sources records the provenance of a source; it does not imply that the source contains the exact District × Sector × Skill × Year values used by SHRAMIK. The canonical dataset process must validate actual granularity.

### 6.2 source_retrievals

One immutable record for each downloaded source resource/version used by SHRAMIK.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| source_id | UUID | No | FK → data_sources.id |
| canonical_url | TEXT | No | URL used to retrieve the resource |
| retrieved_at | TIMESTAMPTZ | No | Retrieval timestamp |
| content_identifier | TEXT | Yes | Local filename/path or stable content identifier |
| sha256_hash | TEXT | No | SHA-256 hash of downloaded content |
| publication_date | DATE | Yes | Source publication date when known |
| retrieval_status | TEXT | No | SUCCESS / FAILED / PARTIAL |
| parser_version | TEXT | Yes | Parser/version used for extraction |
| transformation_version | TEXT | Yes | Transformation/preprocessing version |
| notes | TEXT | Yes | Retrieval-specific notes |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Rules:

- Retrieval records are append-only.
- A changed source file creates a new record rather than silently overwriting the old one.
- SHA-256 identifies the exact downloaded content.

### 6.3 synthetic_generation_runs

One immutable record for each synthetic-data generation run.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key; generation_run_id |
| generator_name | TEXT | No | Generator identifier |
| generator_version | TEXT | No | Generator version |
| random_seed | BIGINT | No | Reproducibility seed |
| parameters | JSONB | No | Generator parameter/configuration payload |
| generated_at | TIMESTAMPTZ | No | Generation timestamp |
| source_context | TEXT | Yes | Context/rationale used to choose synthetic ranges |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Rules:

- Synthetic observations reference generation_run_id.
- Generation runs are append-only.
- Same generator version + seed + parameters must reproduce the same synthetic records.

### 6.4 evidence_items

A concrete evidence item extracted from a source.

Examples:

- a source row/record
- a report table cell
- a report page
- a documented source statement
- an extracted statistic with a stable locator

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| source_id | UUID | No | FK → data_sources.id |
| evidence_type | TEXT | No | ROW / TABLE / PAGE / STATEMENT / OTHER |
| locator | TEXT | Yes | Row ID, table name, page, URL fragment, etc. |
| title | TEXT | Yes | Short evidence label |
| observed_period | SMALLINT | Yes | Period represented, if applicable |
| note | TEXT | Yes | Extracted context/interpretation |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

### 6.5 evidence_links

Associates one evidence item with one analytical output.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| evidence_item_id | UUID | No | FK → evidence_items.id |
| forecast_result_id | UUID | Yes | FK → forecast_results.id |
| emerging_skill_signal_id | UUID | Yes | FK → emerging_skill_signals.id |
| early_warning_id | UUID | Yes | FK → early_warnings.id |
| relation_type | TEXT | No | SUPPORTS / CONTEXT / INPUT |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Constraint:

- Exactly one of forecast_result_id, emerging_skill_signal_id, early_warning_id must be non-null.

This avoids an un-enforced polymorphic foreign key while keeping one reusable evidence table.

---

## 7. Historical Observation Tables

Demand and supply are stored separately because their provenance may come from different source systems.

### 7.1 demand_observations

Historical demand signal in compatible worker/position headcount units.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| district_id | TEXT | No | FK → districts.id |
| skill_id | TEXT | No | FK → skills.id |
| period_type | TEXT | No | MVP = YEAR |
| period_year | SMALLINT | No | 4-digit year |
| demand_quantity | NUMERIC(14,2) | Yes | Headcount/position quantity; >= 0 |
| source_id | UUID | No | FK → data_sources.id |
| source_date | DATE | Yes | Publication date when known; otherwise retrieval date |
| retrieval_id | UUID | Yes | FK → source_retrievals.id for downloaded resources |
| provenance_state | TEXT | No | SOURCE_BACKED / SYNTHETIC_DEMO |
| is_synthetic | BOOLEAN | No | Default false |
| generation_run_id | UUID | Yes | FK → synthetic_generation_runs.id when synthetic |
| demand_signal_type | TEXT | No | Exact demand signal type used by analytics |
| transformation_note | TEXT | Yes | Required for derived/transformed/synthetic records |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Constraint:

- UNIQUE(district_id, skill_id, period_type, period_year, source_id)

Why source is part of the uniqueness key:

Two valid sources may contain the same District × Skill × Year signal. The database must not force them into one record and lose provenance. Canonical aggregation/selection happens in the ingestion/analytics layer.

### 7.2 supply_observations

Historical supply and training context.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| district_id | TEXT | No | FK → districts.id |
| skill_id | TEXT | No | FK → skills.id |
| period_type | TEXT | No | MVP = YEAR |
| period_year | SMALLINT | No | 4-digit year |
| supply_quantity | NUMERIC(14,2) | Yes | Worker headcount; >= 0 |
| training_capacity | NUMERIC(14,2) | Yes | Training seats/capacity; >= 0 |
| enrollment | NUMERIC(14,2) | Yes | Enrolment count; >= 0 |
| completions | NUMERIC(14,2) | Yes | Completion count; >= 0 |
| source_id | UUID | No | FK → data_sources.id |
| source_date | DATE | Yes | Publication date when known; otherwise retrieval date |
| retrieval_id | UUID | Yes | FK → source_retrievals.id for downloaded resources |
| provenance_state | TEXT | No | SOURCE_BACKED / SYNTHETIC_DEMO |
| is_synthetic | BOOLEAN | No | Default false |
| generation_run_id | UUID | Yes | FK → synthetic_generation_runs.id when synthetic |
| supply_signal_type | TEXT | No | Exact supply signal type used by analytics |
| transformation_note | TEXT | Yes | Required for derived/transformed/synthetic records |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Constraint:

- UNIQUE(district_id, skill_id, period_type, period_year, source_id)

Important semantic rule:

> training_capacity, enrollment, and completions are separate contextual measures. They are not silently treated as current employed supply.

---

## 8. Model Metadata

### 8.1 model_versions

Stores immutable metadata for forecast-producing model versions.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| name | TEXT | No | Example: naive_last_value |
| version | TEXT | No | Example: v1 |
| is_baseline | BOOLEAN | No | Default false |
| trained_through_period | SMALLINT | No | Must be earlier than forecast period |
| contract_version | TEXT | No | ML output contract version |
| metadata | JSONB | Yes | Optional model details |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Constraint:

- UNIQUE(name, version)

MVP baseline:

naive_last_value / v1

The model table records metadata only. The actual forecasting implementation remains in ml/.

---

## 9. Forecast Results

### 9.1 forecast_results

This is the main persisted analytical record corresponding to the Issue #5 contract.

A row represents:

**District × Skill × Forecast Period × Model Version**

Sector is obtained through:

forecast_results.skill_id → skills.sector_id → sectors.id

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| contract_version | TEXT | No | Example: 1.1 |
| analysis_mode | TEXT | No | OFFICIAL / DEMO |
| provenance_state | TEXT | No | SOURCE_BACKED / SYNTHETIC_DEMO / MIXED_PROVENANCE |
| district_id | TEXT | No | FK → districts.id |
| skill_id | TEXT | No | FK → skills.id |
| period_type | TEXT | No | MVP = YEAR |
| period_year | SMALLINT | No | Forecast year |
| data_status | TEXT | No | SUFFICIENT / INSUFFICIENT_DATA / UNAVAILABLE |
| reason_code | TEXT | Yes | Required for non-SUFFICIENT, null otherwise |
| demand_quantity | NUMERIC(14,2) | Yes | Latest usable observed demand feeding forecast |
| supply_quantity | NUMERIC(14,2) | Yes | Latest usable observed supply feeding forecast |
| demand_index | NUMERIC(5,2) | Yes | 0–100 display/ranking index |
| supply_index | NUMERIC(5,2) | Yes | 0–100 display/ranking index |
| forecast_demand | NUMERIC(14,2) | Yes | Forecast demand headcount |
| forecast_supply | NUMERIC(14,2) | Yes | Forecast supply headcount |
| gap_eligible | BOOLEAN | Yes | Whether demand and supply are comparable for the gap layer |
| gap_eligibility_reason | TEXT | Yes | Reason when gap_eligible = false |
| gap | NUMERIC(14,2) | Yes | forecast_demand - forecast_supply when eligible |
| status | TEXT | Yes | SHORTAGE / BALANCED / OVERSUPPLY / NO_DEMAND |
| forecast_uncertainty | JSONB | Yes | Optional validated uncertainty structure |
| confidence_level | TEXT | Yes | HIGH / MEDIUM / LOW |
| confidence_inputs | JSONB | Yes | Diagnostic confidence inputs |
| evidence_coverage | NUMERIC(5,4) | Yes | 0–1 |
| model_version_id | UUID | Yes | FK → model_versions.id; required for SUFFICIENT |
| is_active | BOOLEAN | No | Default false; selected output for API consumption |
| calculated_at | TIMESTAMPTZ | No | Calculation timestamp |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

### Forecast constraints

Structural checks:

1. period_year is a valid 4-digit year.
2. Quantities are non-negative where defined.
3. demand_index and supply_index are between 0 and 100.
4. evidence_coverage is between 0 and 1.
5. data_status uses only the documented enum values.
6. status uses only the documented enum values or NULL.
7. If data_status != SUFFICIENT:
   - forecast_demand = NULL
   - forecast_supply = NULL
   - gap_eligible = NULL
   - gap_eligibility_reason = NULL
   - gap = NULL
   - status = NULL
   - confidence_level = NULL
   - forecast_uncertainty = NULL
   - evidence_coverage = NULL
   - model_version_id = NULL
8. If data_status = SUFFICIENT:
   - model_version_id is required.
   - forecast quantities are required.
   - confidence_level is required.
   - evidence_coverage is required.
   - gap_eligible is required.
9. If gap_eligible = true:
   - gap is required.
   - gap_eligibility_reason = NULL.
   - status may be calculated.
10. If gap_eligible = false:
   - forecast_demand and forecast_supply may remain populated.
   - gap = NULL.
   - status = NULL.
   - gap_eligibility_reason is required.
11. When gap is present:
   - gap = forecast_demand - forecast_supply.
12. reason_code must be present for non-SUFFICIENT results and NULL for SUFFICIENT results.
13. reason_code must use the allowed mappings from Issue #5.
14. The referenced model_versions.trained_through_period must be less than period_year.

### Active forecast rule

Multiple model results may be stored for evaluation, but at most one result is active for a given:

**District × Skill × Forecast Period**

The database should implement this using a partial unique index on:

(district_id, skill_id, period_type, period_year) WHERE is_active = true

This lets the evaluation pipeline compare models without allowing the API to accidentally expose multiple "selected" forecasts for the same analytical period.

### Important denormalization note

demand_quantity and supply_quantity in forecast_results are **snapshot fields** from the latest usable observations feeding that forecast. They do not replace the historical observation tables.

They are stored because they are explicitly part of the ML output contract and make a forecast result self-describing.

---

## 10. Emerging Skill Signals

### 10.1 emerging_skill_signals

This table represents the separate historical-series path defined in Issue #1 and Issue #5.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| contract_version | TEXT | No | Example: 1.0 |
| district_id | TEXT | No | FK → districts.id |
| skill_id | TEXT | No | FK → skills.id |
| period_type | TEXT | No | MVP = YEAR |
| period_year | SMALLINT | No | Analysis period |
| data_status | TEXT | No | SUFFICIENT / INSUFFICIENT_DATA / UNAVAILABLE |
| emerging_skill_status | TEXT | No | EMERGING / NOT_EMERGING / INSUFFICIENT_DATA |
| recent_growth_rate | NUMERIC(10,6) | Yes | Historical trend signal |
| historical_growth_rate | NUMERIC(10,6) | Yes | Historical comparison baseline |
| signal_strength | NUMERIC(5,4) | Yes | 0–1 |
| analysis_mode | TEXT | No | OFFICIAL / DEMO |
| provenance_state | TEXT | No | SOURCE_BACKED / SYNTHETIC_DEMO / MIXED_PROVENANCE |
| history_periods | INTEGER | Yes | Number of source-backed usable historical periods |
| total_history_periods | INTEGER | Yes | Total usable historical periods supplied to the model |
| synthetic_history_periods | INTEGER | Yes | Synthetic usable historical periods supplied to the model |
| is_contiguous | BOOLEAN | Yes | Whether used observed periods are consecutive |
| calculated_at | TIMESTAMPTZ | No | Calculation timestamp |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Constraint:

- UNIQUE(district_id, skill_id, period_type, period_year, contract_version)

Important:

> Emerging-skill detection is not stored as a side effect of forecast/gap rows. It has its own table because it can remain valid when forecast data is insufficient.

Exact emerging-skill thresholds are owned by Issue #18, not by the database.

---

## 11. Early Warnings

### 11.1 early_warnings

Stores actionable warning events generated from already-computed analytics.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| forecast_result_id | UUID | No | FK → forecast_results.id |
| emerging_skill_signal_id | UUID | Yes | Optional FK → emerging_skill_signals.id |
| warning_type | TEXT | No | Warning category defined by Issue #17 |
| severity | TEXT | No | Severity defined by Issue #17 |
| detected_period | SMALLINT | No | Year in which warning applies |
| explanation_code | TEXT | Yes | Machine-readable reason |
| is_active | BOOLEAN | No | Default true |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

The schema intentionally does not hard-code the final warning taxonomy beyond required structural fields. Issue #17 owns warning thresholds, severity rules, and warning types.

Database rule:

- A warning must reference a forecast result.
- The referenced forecast should not have data_status = INSUFFICIENT_DATA or UNAVAILABLE.
- NO_DEMAND forecast results must not generate shortage/oversupply warnings; the engine enforces this business rule.

---

## 12. What-If Simulator Storage Boundary

The MVP simulator is intentionally **stateless**.

Inputs include:

- location/district
- skill
- start period
- training duration
- training lag derived from duration
- seats
- completion rate

The simulator reads baseline forecast data and returns a scenario result.

It does **not** require a database table in MVP because scenario results are not canonical facts and the simulator contract is not finalized as a persistent audit model.

Rules already established by architecture remain outside the schema:

- training duration is converted to whole-year lag using the agreed ceiling rule
- added supply persists after cohort arrival
- if the cohort arrives after the horizon, return baseline unchanged with COHORT_AFTER_HORIZON
- if baseline gap is not positive, gap_reduction is NULL with a reason while simulated_gap is still returned

If later requirements demand scenario history/audit, add a separate simulation_runs model through a new issue rather than quietly changing this schema.

---

## 13. Time Representation

### MVP rule

All analytical and observed periods are **yearly**.

Database representation:

period_type = YEAR  
period_year = SMALLINT

API/ML contract representation:

period_type = YEAR  
period = YYYY

This keeps storage/query operations numeric while preserving the external contract.

Do not create fabricated quarterly/monthly observations from annual source data.

---

## 14. Synthetic and Derived Data

Historical observation tables must distinguish source-backed and synthetic records.

For any synthetic/derived record:

- is_synthetic = true
- transformation_note explains why it exists and how it was produced.
- A fake source must never be created merely to make a synthetic value look official.

The final canonical dataset rules are owned by Issue #7.

---

## 15. Foreign-Key Rules

| Relationship | Rule |
|---|---|
| district → state | Every district belongs to one state |
| skill → sector | Every canonical skill belongs to exactly one sector |
| taxonomy mapping → skill | Every external mapping references one canonical skill |
| demand observation → district/skill/source | All must exist before observation is accepted |
| supply observation → district/skill/source | All must exist before observation is accepted |
| forecast → district/skill/model | All must exist for a usable forecast |
| forecast → provenance/analysis mode | Provenance state and execution mode are explicit |
| source retrieval → source | Every retrieval belongs to one source |
| synthetic observation → generation run | Every synthetic observation references a generation run |
| emerging signal → district/skill | All must exist |
| warning → forecast | Warning requires a forecast result |
| evidence → source | Every evidence item has a source |
| evidence link → output | Exactly one analytical-output target per link |

Use ON DELETE RESTRICT for canonical reference records so an accidental delete cannot orphan historical analytical records.

For active/inactive reference data, use is_active instead of deleting records that are already referenced.

---

## 16. Index Plan

Initial indexes should target actual backend query patterns rather than every column.

### Reference indexes

- districts(state_id)
- skills(sector_id)
- skill_taxonomy_mappings(skill_id)
- skill_taxonomy_mappings(taxonomy_name, taxonomy_code)
- source_retrievals(source_id, retrieved_at)
- synthetic_generation_runs(generator_name, generator_version)

### Observation indexes

- demand_observations(district_id, skill_id, period_year)
- demand_observations(skill_id, period_year)
- supply_observations(district_id, skill_id, period_year)
- supply_observations(skill_id, period_year)

### Analytical indexes

- forecast_results(district_id, skill_id, period_year)
- forecast_results(skill_id, period_year)
- partial unique index for active forecasts:
  (district_id, skill_id, period_type, period_year) WHERE is_active = true
- emerging_skill_signals(district_id, skill_id, period_year)
- early_warnings(detected_period, is_active)

### Provenance indexes

- source_retrievals(source_id, retrieved_at)
- synthetic_generation_runs(generator_name, generator_version)
- evidence_items(source_id, observed_period)
- evidence_links(evidence_item_id)
- evidence_links(forecast_result_id)
- evidence_links(emerging_skill_signal_id)
- evidence_links(early_warning_id)

Do not add indexes blindly. Issue #8 should verify common access paths after API implementation.

---

## 17. Data Integrity Rules

The database must reject:

- duplicate canonical district/state/sector/skill codes
- references to unknown districts/sectors/skills/sources
- synthetic observations without a generation run
- source-backed downloaded observations without a retrieval record
- negative quantities where the metric is defined as non-negative
- malformed year values
- invalid index/confidence/evidence ranges
- invalid provenance_state or analysis_mode values
- provenance_state = SYNTHETIC_DEMO without is_synthetic = true
- provenance_state = SOURCE_BACKED with is_synthetic = true
- synthetic observations without a generation_run_id
- non-SUFFICIENT forecast rows containing forecast/gap/confidence output
- SUFFICIENT forecast rows without a model version
- forecasts whose model cutoff is not earlier than the forecast period
- invalid reason_code/data_status combinations
- more than one active forecast for the same District × Skill × Period
- evidence links that point to zero or multiple targets

The database must not enforce:

- forecast quality thresholds
- confidence scoring formula
- ±10% policy threshold
- MIN_FORECAST_DEMAND
- emerging-skill thresholds
- warning severity logic

Those belong to the corresponding analytical modules.

---

## 18. Mapping to Issue #5 ML Contract

| ML Contract Field | Database source |
|---|---|
| contract_version | forecast_results.contract_version |
| analysis_mode | forecast_results.analysis_mode |
| provenance_state | forecast_results.provenance_state |
| district_id | forecast_results.district_id |
| sector_id | skills.sector_id → sectors.id |
| skill_id | forecast_results.skill_id |
| period_type | forecast_results.period_type |
| period | forecast_results.period_year, serialized as YYYY |
| data_status | forecast_results.data_status |
| reason_code | forecast_results.reason_code |
| demand_quantity | forecast_results.demand_quantity |
| supply_quantity | forecast_results.supply_quantity |
| demand_index | forecast_results.demand_index |
| supply_index | forecast_results.supply_index |
| forecast_demand | forecast_results.forecast_demand |
| forecast_supply | forecast_results.forecast_supply |
| gap_eligible | forecast_results.gap_eligible |
| gap_eligibility_reason | forecast_results.gap_eligibility_reason |
| gap | forecast_results.gap |
| status | forecast_results.status |
| forecast_uncertainty | forecast_results.forecast_uncertainty |
| confidence_level | forecast_results.confidence_level |
| confidence_inputs | forecast_results.confidence_inputs |
| evidence_coverage | forecast_results.evidence_coverage |
| model | forecast_results.model_version_id → model_versions |

This mapping keeps the ML contract stable without forcing the database to store the model object as an opaque JSON blob.

---

## 19. Mapping to Issue #7 Canonical Dataset

| Canonical Dataset Field | Database destination |
|---|---|
| district_id | districts.id / observation district_id |
| lgd_district_code | districts.lgd_district_code |
| district_name | districts.name |
| state_code | states.code |
| lgd_district_code | districts.lgd_district_code |
| sector_id | sectors.id via skills.sector_id |
| sector_name | sectors.name |
| skill_id | skills.id |
| skill_name | skills.name |
| period_type | observation period_type |
| period | observation period_year, serialized as YYYY |
| demand_quantity | demand_observations.demand_quantity |
| supply_quantity | supply_observations.supply_quantity |
| training_capacity | supply_observations.training_capacity |
| enrolment | supply_observations.enrollment |
| completions | supply_observations.completions |
| source_id | observation source_id |
| source_type | data_sources.source_type |
| retrieval_id | observation retrieval_id |
| source_date | observation source_date |
| retrieval_id | observation retrieval_id |
| provenance_state | observation provenance_state |
| is_synthetic | observation is_synthetic |
| generation_run_id | observation generation_run_id |
| transformation_note | observation transformation_note |

Important:

The canonical dataset may require multiple observation rows when demand and supply come from different sources. That is intentional and preserves metric-specific provenance.

---

## 20. Provenance and contract notes

### 20.1 Source date vs retrieval date

For observation records, source_date represents the publication date when explicitly available; otherwise it uses the retrieval date from source_retrievals. The observation period is never substituted for source_date.

### 20.2 Demo provenance

The forecast_results analysis_mode and provenance_state fields distinguish official/source-backed outputs from DEMO outputs that use synthetic history. Confidence and history diagnostics follow Issue #5 v1.1.

### 20.3 Gap eligibility

A forecast may be computationally sufficient while remaining gap-ineligible. In that case forecast quantities can be stored, but gap and status remain NULL and gap_eligibility_reason records why the comparison is not valid.

## 21. Backend/API Boundary

The database exposes storage structures; it does not dictate the external API shape.

Backend responsibilities include:

- joins between district/skill/sector data
- selection of the active forecast
- conversion of period_year to contract period
- human-readable error/reason messages
- pagination/filtering
- aggregation for dashboard views
- hiding internal IDs/metadata where appropriate
- converting JSONB model/uncertainty metadata to the documented contract shape

The frontend must consume Issue #4 API contracts rather than query the database directly.

---

## 22. Migration / Implementation Boundary

Issue #2 ends at **approved database design**.

Issue #8 begins at **actual database implementation**.

Issue #8 should create:

- PostgreSQL/Supabase migration(s)
- reference seed data needed for local development
- database connection setup
- reproducible migration instructions
- basic schema smoke tests

Issue #8 must not change analytical semantics without a review of this design.

---

## 23. Open Decisions Intentionally Left to Other Issues

The following are **not database-design blockers**:

| Decision | Owning issue |
|---|---|
| Official source/data availability and final canonical records | #7 |
| Exact API envelopes | #4 |
| Demand/supply calculation methodology | #13 |
| Forecast model selection | #14 |
| Gap classification thresholds | #15 |
| Confidence formula and evidence scoring | #16 |
| Early-warning rules/severity | #17 |
| Emerging-skill detection thresholds | #18 |
| Simulator implementation details | #19 |

The schema provides stable storage for these outputs without embedding unresolved methodology.

---

## 24. Acceptance Checklist

- [x] Database responsibility separated from database implementation
- [x] Canonical state/district/sector/skill entities defined
- [x] One-skill-to-one-sector MVP rule enforced
- [x] External taxonomy mapping structure defined
- [x] Sector-mapping method/confidence metadata defined
- [x] LGD district code supported
- [x] Source retrieval records and SHA-256 integrity metadata defined
- [x] Synthetic generation provenance defined
- [x] Historical demand storage defined
- [x] Historical supply/training storage defined
- [x] Source provenance defined
- [x] Evidence storage and linking defined
- [x] Forecast result structure mapped to Issue #5
- [x] Provenance-aware demo mode and gap eligibility mapped
- [x] Model/version metadata defined
- [x] Multiple-model evaluation storage supported
- [x] Active forecast selection rule defined
- [x] Emerging-skill storage separated from forecast/gap path
- [x] Early-warning storage boundary defined
- [x] What-if simulator intentionally stateless for MVP
- [x] Yearly period representation defined
- [x] Missing-value semantics preserved
- [x] Synthetic/derived provenance preserved
- [x] Structural constraints defined
- [x] Index plan defined
- [x] API/database responsibility boundary defined
- [x] Implementation moved explicitly to Issue #8
- [x] Provenance retrieval and synthetic generation metadata defined
- [x] LGD district-code support defined
- [x] Sector mapping method/confidence metadata defined

---

## 25. Implementation Notes for Issue #8

When implementing this design:

1. Use PostgreSQL native UUIDs for generated records.
2. Use stable TEXT identifiers for canonical state/district/sector/skill codes so external source mappings remain readable.
3. Use NUMERIC for quantities and rates that may require decimal precision.
4. Use JSONB only where the contract is intentionally extensible (forecast_uncertainty, confidence_inputs, model metadata, synthetic generator parameters).
5. Keep migrations deterministic and runnable from a clean database.
6. Seed only canonical/reference data that has been explicitly approved.
7. Never commit database credentials or service-role keys.

---

## Related Issues

- #1 — Define SHRAMIK technical architecture and contracts
- #4 — Define SHRAMIK API contracts
- #5 — Define SHRAMIK ML output contract
- #7 — Prepare SHRAMIK canonical sample dataset
- #8 — Implement SHRAMIK database schema
- #13 — Demand and supply engines
- #14 — Forecasting engine
- #15 — Gap analysis and classification
- #16 — Confidence/evidence scoring
- #17 — Early warning engine
- #18 — Emerging skill detection
- #19 — What-if intervention simulator
