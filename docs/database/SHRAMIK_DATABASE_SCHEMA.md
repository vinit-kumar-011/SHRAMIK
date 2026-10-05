# SHRAMIK Database Schema

**Issue:** #2 — Design SHRAMIK database schema  
**Status:** Final schema reconciliation for provenance-aware data/ML flow  
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

The database supports a **national heterogeneous observation model**. Source observations may exist at State, District, Sector, Skill, or combined geography/occupation grains. Missing dimensions are represented as NULL and are never fabricated.

The detailed MVP forecast result remains District × Skill × Forecast Period for API/ML stability. National, State, District and Sector dashboard views are deterministic rollups of supported analytical results.

A canonical skill/job role still belongs to exactly one canonical sector.

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
| source_capabilities | Observed source grain/capability registry | Provenance |
| synthetic_generation_runs | Immutable generation metadata for synthetic/demo runs | Provenance |

---

## 4. ER Diagram

~~~mermaid
erDiagram
    STATES ||--o{ DISTRICTS : contains
    SECTORS ||--o{ SKILLS : classifies
    SKILLS ||--o{ SKILL_TAXONOMY_MAPPINGS : maps_to
    DATA_SOURCES ||--o{ SKILLS : supports_sector_mapping
    DATA_SOURCES ||--o{ SKILL_TAXONOMY_MAPPINGS : supports_mapping

    DISTRICTS ||--o{ DEMAND_OBSERVATIONS : has
    SKILLS ||--o{ DEMAND_OBSERVATIONS : describes
    DATA_SOURCES ||--o{ DEMAND_OBSERVATIONS : supports
    SOURCE_RETRIEVALS ||--o{ DEMAND_OBSERVATIONS : identifies_retrieval
    EVIDENCE_ITEMS ||--o{ DEMAND_OBSERVATIONS : supports

    DISTRICTS ||--o{ SUPPLY_OBSERVATIONS : has
    SKILLS ||--o{ SUPPLY_OBSERVATIONS : describes
    DATA_SOURCES ||--o{ SUPPLY_OBSERVATIONS : supports
    SOURCE_RETRIEVALS ||--o{ SUPPLY_OBSERVATIONS : identifies_retrieval
    EVIDENCE_ITEMS ||--o{ SUPPLY_OBSERVATIONS : supports
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
    DATA_SOURCES ||--o{ SOURCE_CAPABILITIES : describes
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

The national model uses the state table as a required geography dimension for source normalization and cross-state aggregation.

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

Constraints:

- UNIQUE(state_id, name)
- UNIQUE(lgd_district_code)

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

Demand and supply are stored separately because their provenance and source systems may differ.

### 7.1 National observation-grain model

The observation tables support these controlled grains:

- STATE
- STATE_SECTOR
- STATE_SKILL
- STATE_SECTOR_SKILL
- DISTRICT
- DISTRICT_SECTOR
- DISTRICT_SKILL
- DISTRICT_SECTOR_SKILL

The selected grain is stored explicitly in observation_grain.

Rules:
- state_id is always required.
- district_id is required for DISTRICT* grains.
- sector_id is required for *SECTOR* grains.
- skill_id is required for *SKILL* grains.
- skill_id may be NULL for district/state aggregate signals.
- sector_id may be NULL when not supplied or when it can be derived through skill_id.
- No aggregate value may be redistributed into a missing lower-level dimension without source-backed evidence.

### 7.2 demand_observations

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| state_id | TEXT | No | FK → states.id |
| district_id | TEXT | Yes | FK → districts.id; required for DISTRICT* grains |
| sector_id | TEXT | Yes | FK → sectors.id; required for *SECTOR* grains |
| skill_id | TEXT | Yes | FK → skills.id; required for *SKILL* grains |
| observation_grain | TEXT | No | Controlled national observation grain |
| period_type | TEXT | No | MVP = YEAR |
| period_year | SMALLINT | No | 4-digit year |
| demand_quantity | NUMERIC(14,2) | Yes | Quantity in documented source/analytical unit; >= 0 |
| demand_signal_type | TEXT | No | Exact demand signal |
| source_id | UUID | Yes | FK → data_sources.id; NULL only for synthetic observations |
| source_date | DATE | Yes | Publication date when known; otherwise retrieval date |
| retrieval_id | UUID | Yes | FK → source_retrievals.id for downloaded resources |
| evidence_item_id | UUID | Yes | Optional FK → evidence_items.id |
| provenance_state | TEXT | No | SOURCE_BACKED / SYNTHETIC_DEMO |
| is_synthetic | BOOLEAN | No | Default false |
| generation_run_id | UUID | Yes | FK → synthetic_generation_runs.id when synthetic |
| transformation_note | TEXT | Yes | Required for derived/transformed/synthetic records |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Checks:
- state_id is always present.
- district_id is present for DISTRICT* grains.
- sector_id is present for *SECTOR* grains.
- skill_id is present for *SKILL* grains.
- source_id is present for SOURCE_BACKED observations.
- SOURCE_BACKED requires is_synthetic=false.
- SYNTHETIC_DEMO requires is_synthetic=true and generation_run_id.
- quantities are non-negative when defined.

Uniqueness must include source identity because multiple legitimate sources can report the same signal. For source-backed rows, use the logical key: state_id, district_id, sector_id, skill_id, observation_grain, period_type, period_year, source_id, demand_signal_type. For synthetic rows, replace source_id with generation_run_id.

### 7.3 supply_observations

Supply uses the same national observation-grain model and provenance rules.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| state_id | TEXT | No | FK → states.id |
| district_id | TEXT | Yes | FK → districts.id; required for DISTRICT* grains |
| sector_id | TEXT | Yes | FK → sectors.id; required for *SECTOR* grains |
| skill_id | TEXT | Yes | FK → skills.id; required for *SKILL* grains |
| observation_grain | TEXT | No | Controlled national observation grain |
| period_type | TEXT | No | MVP = YEAR |
| period_year | SMALLINT | No | 4-digit year |
| supply_quantity | NUMERIC(14,2) | Yes | Worker/supply quantity; >= 0 |
| training_capacity | NUMERIC(14,2) | Yes | Training capacity/seats; >= 0 |
| enrollment | NUMERIC(14,2) | Yes | Enrolment; >= 0 |
| completions | NUMERIC(14,2) | Yes | Completion count; >= 0 |
| supply_signal_type | TEXT | No | Exact supply signal |
| source_id | UUID | Yes | FK → data_sources.id; NULL only for synthetic observations |
| source_date | DATE | Yes | Publication date when known; otherwise retrieval date |
| retrieval_id | UUID | Yes | FK → source_retrievals.id for downloaded resources |
| evidence_item_id | UUID | Yes | Optional FK → evidence_items.id |
| provenance_state | TEXT | No | SOURCE_BACKED / SYNTHETIC_DEMO |
| is_synthetic | BOOLEAN | No | Default false |
| generation_run_id | UUID | Yes | FK → synthetic_generation_runs.id when synthetic |
| transformation_note | TEXT | Yes | Required for derived/transformed/synthetic records |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Important semantic rule:

> training_capacity, enrollment and completions are separate measures. They are not silently treated as current employed supply.

Uniqueness follows the demand-observation rule: multiple legitimate sources may report the same signal. For source-backed rows, use the logical key: state_id, district_id, sector_id, skill_id, observation_grain, period_type, period_year, source_id, supply_signal_type. For synthetic rows, replace source_id with generation_run_id.

### 7.3.1 Nullable-grain uniqueness implementation

The logical observation keys contain nullable dimensions because source observations may legitimately exist at aggregate grains. PostgreSQL uniqueness must therefore treat NULL dimensions as equal for duplicate detection.

Issue #8 must implement the demand and supply logical keys using PostgreSQL `UNIQUE NULLS NOT DISTINCT` where supported, or equivalent grain-specific partial unique indexes.

A plain composite `UNIQUE` constraint over nullable `district_id`, `sector_id`, and `skill_id` is insufficient because PostgreSQL normally permits multiple rows whose nullable dimensions are NULL.

The implementation must prevent duplicate observations at the same:

`state + district + sector + skill + observation_grain + period + source (or synthetic generation run) + signal`

while still allowing legitimate observations from different sources.

### 7.4 source_capabilities

This registry records what a source actually supports before analytics consume it.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| source_id | UUID | No | FK → data_sources.id |
| state_scope | TEXT | Yes | State/UT code or NATIONAL |
| observation_grain | TEXT | No | Observed source grain |
| taxonomy_name | TEXT | Yes | NCO/NCS/NSQF/etc. when applicable |
| taxonomy_version | TEXT | Yes | Version when applicable |
| signal_type | TEXT | No | Demand/supply/context signal |
| unit | TEXT | No | Documented source unit |
| flow_stock_semantics | TEXT | Yes | Documented interpretation |
| coverage_start | SMALLINT | Yes | Earliest supported period |
| coverage_end | SMALLINT | Yes | Latest supported period |
| geography_notes | TEXT | Yes | Coverage limitations |
| occupation_notes | TEXT | Yes | Skill/occupation limitations |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

This table is descriptive provenance, not permission to invent missing fields.
## 8. Model Metadata

### 8.1 model_versions

Stores immutable metadata for forecast-producing model versions.

| Column | Type | Null | Rules |
|---|---|---:|---|
| id | UUID | No | Primary key |
| name | TEXT | No | Example: naive_last_value |
| version | TEXT | No | Example: v1 |
| is_baseline | BOOLEAN | No | Default false |
| trained_through_period | SMALLINT | No | Training/data cutoff for this immutable model version |
| contract_version | TEXT | No | ML output contract version |
| metadata | JSONB | Yes | Optional model details |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Constraints:

- UNIQUE(name, version)
- A model version is immutable after creation.
- A new training cutoff/retraining event requires a new `model_versions` row/version; never mutate `trained_through_period` on a version already referenced by forecast results.

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
| gap_eligibility_reason | TEXT | Yes | Controlled enum: INCOMPATIBLE_UNIT / INCOMPATIBLE_FLOW_STOCK / INCOMPATIBLE_TIME_BASIS / INCOMPATIBLE_GEOGRAPHY / INCOMPATIBLE_OCCUPATION_SCOPE / INCOMPATIBLE_SIGNALS |
| gap | NUMERIC(14,2) | Yes | forecast_demand - forecast_supply when eligible |
| status | TEXT | Yes | SHORTAGE / BALANCED / OVERSUPPLY / NO_DEMAND |
| forecast_uncertainty | JSONB | Yes | Optional validated uncertainty structure |
| confidence_level | TEXT | Yes | HIGH / MEDIUM / LOW |
| confidence_inputs | JSONB | Yes | Diagnostic confidence inputs |
| evidence_coverage | NUMERIC(5,4) | Yes | 0–1 |
| model_version_id | UUID | Yes | FK → model_versions.id; required for SUFFICIENT |
| calculation_run_id | UUID | Yes | Analytical calculation/batch run identifier for reproducibility/audit |
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
   - gap_eligibility_reason is required.
   - status must be NULL or NO_DEMAND.
11. If gap_eligible = true:
   - status may be SHORTAGE, BALANCED, OVERSUPPLY, or NO_DEMAND.
   - the analytical engine, not the database, determines whether NO_DEMAND applies using the configured MIN_FORECAST_DEMAND policy threshold.
12. When gap is present:
   - gap = forecast_demand - forecast_supply.
   - gap remains present when status = NO_DEMAND and gap_eligible = true; the simulator may use this baseline gap.
13. reason_code must be present for non-SUFFICIENT results and NULL for SUFFICIENT results.
14. reason_code must use the allowed mappings from Issue #5.
15. gap_eligibility_reason must use the controlled values defined in Issue #5.
16. `analysis_mode = OFFICIAL` requires `provenance_state = SOURCE_BACKED`; enforce with a row-local PostgreSQL CHECK.
15. If gap_eligible = false, status must be NULL or NO_DEMAND. If gap_eligible = true, status may be SHORTAGE, BALANCED, OVERSUPPLY, or NO_DEMAND; the engine owns the MIN_FORECAST_DEMAND threshold.
16. The referenced model_versions.trained_through_period must be less than period_year; enforce with a database trigger in Issue #8.

### Forecast uniqueness and recalculation rule

A forecast result is logically unique for:

**District × Skill × Forecast Period × Model Version × Contract Version**

Database uniqueness:

- For SUFFICIENT rows (`model_version_id` is non-null): UNIQUE(district_id, skill_id, period_type, period_year, model_version_id, contract_version).
- For non-SUFFICIENT rows (`model_version_id` is null): a partial unique index must enforce UNIQUE(district_id, skill_id, period_type, period_year, contract_version) WHERE model_version_id IS NULL. This prevents NULL model-version rows from duplicating on rerun.
- `calculation_run_id` identifies the analytical run that produced the result. Recalculating the same logical result must upsert/update that row with the latest run identifier rather than silently create a duplicate.

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
| contract_version | TEXT | No | Example: 1.1 |
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
| calculation_run_id | UUID | Yes | Analytical calculation/batch run identifier for reproducibility/audit |
| is_active | BOOLEAN | No | Default false; selected result for API consumption |
| calculated_at | TIMESTAMPTZ | No | Calculation timestamp |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Constraints:

- UNIQUE(district_id, skill_id, period_type, period_year, contract_version)
- At most one active result for a given District × Skill × Period × Contract Version using a partial unique index:
  (district_id, skill_id, period_type, period_year, contract_version) WHERE is_active = true.
- The MVP intentionally stores one logical emerging-skill result per contract version; recalculation does not preserve historical result rows.
- Recalculation must upsert/update the existing logical result and record the latest calculation_run_id rather than create a duplicate. A future requirement for historical run retention would require adding calculation_run_id to the logical key through a schema revision.

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
| calculation_run_id | UUID | Yes | Analytical calculation/batch run identifier for reproducibility/audit |
| is_active | BOOLEAN | No | Default true |
| created_at | TIMESTAMPTZ | No | Default current timestamp |

Constraint:

- UNIQUE(forecast_result_id, warning_type, detected_period)

Recalculation must upsert/update the existing warning for the same logical key and record the latest calculation_run_id; it must not create duplicate warning rows.

The schema intentionally does not hard-code the final warning taxonomy beyond required structural fields. Issue #17 owns warning thresholds, severity rules, and warning types.

Database rule:

- A warning must reference a forecast result.
- The referenced forecast must have data_status = SUFFICIENT; enforce with a database trigger in Issue #8.
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
| demand observation → state | Required |
| demand observation → district/sector/skill | Optional according to observation_grain |
| supply observation → state | Required |
| supply observation → district/sector/skill | Optional according to observation_grain |
| forecast → district/skill/model | All must exist for a usable skill-level forecast |
| source capability → source | Every capability record belongs to one source |
| source retrieval → source | Every retrieval belongs to one source |
| synthetic observation → generation run | Every synthetic observation references a generation run |
| emerging signal → district/skill | All must exist |
| warning → forecast | Warning requires a forecast result |
| evidence → source | Every evidence item has a source |

Use ON DELETE RESTRICT for canonical reference records.
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

- demand_observations(state_id, observation_grain, period_year)
- demand_observations(district_id, skill_id, period_year)
- demand_observations(sector_id, period_year)
- supply_observations(state_id, observation_grain, period_year)
- supply_observations(district_id, skill_id, period_year)
- supply_observations(sector_id, period_year)
- source_capabilities(source_id, observation_grain)

### Analytical indexes

- forecast_results(district_id, skill_id, period_year)
- forecast_results(skill_id, period_year)
- partial unique index for active forecasts:
  (district_id, skill_id, period_type, period_year) WHERE is_active = true
- emerging_skill_signals(district_id, skill_id, period_year)
- early_warnings(detected_period, is_active)

### Provenance indexes

The source_retrievals and synthetic_generation_runs indexes are already listed under Reference indexes above. Additional provenance indexes:

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
- source-backed observations without source_id
- source-backed downloaded observations without a retrieval record
- invalid provenance/mode combinations
- negative quantities where the metric is defined as non-negative
- malformed year values
- invalid index/confidence/evidence ranges
- invalid provenance_state or analysis_mode values
- provenance_state = SYNTHETIC_DEMO without is_synthetic = true
- provenance_state = SOURCE_BACKED with is_synthetic = true
- synthetic observations without a generation_run_id
- non-SUFFICIENT forecast rows containing forecast/gap/confidence output
- SUFFICIENT forecast rows without a model version
- forecasts whose model cutoff is not earlier than the forecast period (trigger-enforced)
- invalid reason_code/data_status combinations
- more than one active forecast for the same District × Skill × Period
- evidence links that point to zero or multiple targets

### 17.1 Enforcement boundary

The following enforcement split is authoritative for Issue #8:

| Rule | Enforcement |
|---|---|
| Stable controlled values listed in Section 17.2 | PostgreSQL CHECK constraints |
| `analysis_mode = OFFICIAL` → `provenance_state = SOURCE_BACKED` | PostgreSQL CHECK |
| Synthetic observation requires generation_run_id | PostgreSQL CHECK + FK |
| Source-backed observation requires source_id | PostgreSQL CHECK |
| Forecast model cutoff < forecast period | PostgreSQL trigger on forecast INSERT/UPDATE |
| Warning cannot reference INSUFFICIENT_DATA or UNAVAILABLE forecast | PostgreSQL trigger on warning INSERT/UPDATE |
| Downloaded source data requires retrieval_id | Ingestion layer; downloaded status is pipeline context and is not inferred by a CHECK |
| Canonical source selection when multiple valid sources exist | Versioned ingestion/analytics selection rule |
| Recalculation idempotency | UPSERT on the logical unique key; calculation_run_id is audit metadata |

### 17.2 Canonical controlled-value catalog

These are the single authoritative stable MVP value lists for Issue #8. Implement them as PostgreSQL CHECK constraints (or equivalent domains) rather than unconstrained TEXT.

- period_type: YEAR
- analysis_mode: OFFICIAL, DEMO
- observation provenance_state: SOURCE_BACKED, SYNTHETIC_DEMO
- analytical-output provenance_state: SOURCE_BACKED, SYNTHETIC_DEMO, MIXED_PROVENANCE
- data_status: SUFFICIENT, INSUFFICIENT_DATA, UNAVAILABLE
- confidence_level: HIGH, MEDIUM, LOW
- status: SHORTAGE, BALANCED, OVERSUPPLY, NO_DEMAND
- emerging_skill_status: EMERGING, NOT_EMERGING, INSUFFICIENT_DATA
- relation_type: SUPPORTS, CONTEXT, INPUT
- reason_code: INSUFFICIENT_HISTORY, SOURCE_UNAVAILABLE, REQUIRED_INPUT_MISSING, MODEL_UNAVAILABLE, MODEL_FAILURE
- gap_eligibility_reason: INCOMPATIBLE_UNIT, INCOMPATIBLE_FLOW_STOCK, INCOMPATIBLE_TIME_BASIS, INCOMPATIBLE_GEOGRAPHY, INCOMPATIBLE_OCCUPATION_SCOPE, INCOMPATIBLE_SIGNALS
- retrieval_status: SUCCESS, FAILED, PARTIAL
- evidence_type: ROW, TABLE, PAGE, STATEMENT, OTHER
- source_type: DATASET, REPORT, WEB, SURVEY, OTHER
- mapping_method: OFFICIAL_CROSSWALK, MANUAL, INFERRED
- mapping_confidence: HIGH, MEDIUM, LOW

Demand/supply signal vocabularies and Issue #17 warning-type/severity vocabularies remain owned by their respective issues and must be finalized before corresponding CHECK constraints are implemented.

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
| district_id | districts.id / observation district_id where present |
| district_name | districts.name where district-level |
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

### 20.2 Contract v1.1 and history diagnostics

Issue #5 is currently **v1.1** and is the authoritative ML output contract for this schema. It includes `analysis_mode`, `provenance_state`, `gap_eligible`, `gap_eligibility_reason`, and the history split.

For SUFFICIENT forecast results, `confidence_inputs` must contain these exact keys when computable:

- `history_periods` — source-backed usable history count; NULL when not computable
- `total_history_periods` — total usable history supplied to the model; NULL when not computable
- `synthetic_history_periods` — synthetic usable history supplied to the model; NULL when not computable
- `is_contiguous` — whether the observed years used are consecutive; NULL when not computable

These diagnostics remain inside the contract JSONB object rather than being duplicated as forecast columns, avoiding competing sources of truth.

### 20.3 Demo provenance

The forecast_results analysis_mode and provenance_state fields distinguish official/source-backed outputs from DEMO outputs that use synthetic history. Confidence and history diagnostics follow Issue #5 v1.1.

### 20.4 Gap eligibility and status precedence

A forecast may be computationally sufficient while remaining gap-ineligible. In that case forecast quantities can be stored, but gap remains NULL and gap_eligibility_reason records why the comparison is not valid.

Status precedence:

1. If data_status != SUFFICIENT, status is NULL.
2. The analytical engine decides whether the configured MIN_FORECAST_DEMAND threshold produces NO_DEMAND; when it does, status may be NO_DEMAND even when gap_eligible = false.
3. Otherwise SHORTAGE / BALANCED / OVERSUPPLY require gap_eligible = true.
4. When gap_eligible = false and the engine has not selected NO_DEMAND, status is NULL.

The database does not encode MIN_FORECAST_DEMAND. It only enforces the structural rule that a gap-ineligible row may have status NULL or NO_DEMAND.

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

Supabase security boundary:

- Row-level security (RLS) must be enabled on application tables before exposing the Supabase project endpoint.
- Anonymous direct table access must be denied unless a specific reviewed policy requires it.
- The frontend never queries Postgres/Supabase tables directly; FastAPI is the application data-access boundary.
- Service-role credentials must remain server-side and must never be exposed to the frontend.

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
- [x] Taxonomy mapping source relationship defined
- [x] LGD district code supported
- [x] Source retrieval records and SHA-256 integrity metadata defined
- [x] Synthetic generation provenance defined
- [x] Historical demand storage defined
- [x] Historical supply/training storage defined
- [x] National heterogeneous observation grains defined
- [x] Source capability registry defined
- [x] State/source-specific adapters separated from canonical schema
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
- [x] Enforcement split and ownership defined
- [x] Canonical controlled-value catalog defined
- [x] Calculation-run and recalculation/upsert semantics defined
- [x] Supabase RLS/security boundary defined

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
