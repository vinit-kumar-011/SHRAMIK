# SHRAMIK Canonical Dataset — Source & Construction Plan

**Issue:** #7 — Prepare SHRAMIK canonical sample dataset  
**Status:** Source discovery / construction plan  
**Branch:** feature/canonical-dataset  
**Owner:** Lead

## 1. Objective

Build a small, reproducible Odisha-focused dataset for the SHRAMIK MVP.

The dataset is for **development and demonstration**, not a claim of nationwide real-time labour-market coverage.

Target analytical grain:

**District × Sector × Skill × Year**

The MVP uses yearly periods because official labour-market information is often sparse at district level. Annual observations must not be converted into fabricated monthly or quarterly observations.

## 2. Data reality and prototype strategy

Current source discovery shows an important limitation:

- Odisha employment services collect district-level employment-market information, including vacancies and other labour-market returns.
- Official Odisha district employment pages expose examples of live-register and occupational/educational categories.
- Odisha skill-development systems expose training/programme information and decision-support dashboards.
- PLFS provides official labour-market context, but its published tables are not a ready-made district × skill annual series.

Therefore, the canonical prototype uses a **hybrid evidence model**, but provenance must never be hidden:

1. **SOURCE_BACKED** records where official data exists at the required grain.
2. **SYNTHETIC_DEMO** records where a source-backed series cannot be obtained consistently.
3. **MIXED_PROVENANCE** series when source-backed and synthetic observations coexist.

Synthetic values must never be presented as government observations.

### Source-backed coverage is the validation truth

Synthetic observations are useful for demonstrating the complete product pipeline, but they **must not be allowed to make the dataset appear more historically complete than the official evidence actually is**.

All history-coverage statistics used to decide whether the MVP minimum history is realistic must therefore be reported separately:

- source-backed history coverage
- synthetic-demo history coverage
- mixed-provenance series count

Only **source-backed observations** may be used to recommend the final minimum forecast history.

## 3. Candidate official sources

### A. Odisha Directorate of Employment / Employment Exchanges

The Odisha employment service states that district employment exchanges collect local employment-market information. The published process includes vacancy information and quarterly employment returns.

Use as a primary candidate for demand-side or labour-market context where downloadable/structured records can be obtained.

Source:
https://empmission.odisha.gov.in/Exchange/not_vacancy.jsp

### B. Odisha Open Government Data — Employment Exchanges Data

The Odisha OGD catalogue contains an Employment Exchanges Data catalogue describing employment-exchange records used to match demand and supply of work opportunities.

Source:
https://odisha.data.gov.in/catalog/employment-exchanges-data

The catalogue exposes a Catalog API and ZIP download option; the actual resource fields, years, geography, and grain must be inspected before extraction.

### C. Odisha Directorate of Skill Development & Technical Education / Directorate of Skill Development-cum-Employment

The official Odisha skill/employment system exposes programme, training, employment and dashboard information. Its activity reporting documents skill-development and employment initiatives.

Source:
https://dsde.odisha.gov.in/

Example activity report:
https://sdte.odisha.gov.in/sites/default/files/2023-01/Activity%20Report%202021-22.pdf

### D. Odisha district employment pages

District employment pages can contain occupational/educational categories and employment-service context. They are useful as supporting evidence and for checking district-level availability.

Example:
https://mayurbhanj.odisha.gov.in/en/departments/employment

### E. PLFS

PLFS is a strong official source for labour-market context and state-level benchmarks.

Use the specific official report rather than linking only to the MoSPI homepage:

**PLFS Annual Report 2025 (January–December 2025), March 2026**

https://www.mospi.gov.in/uploads/publications_reports/publications_reports1780040415321_0624fb13-fb47-40bc-b470-7c7e9635c3ef_PLFS_2025_F_REV_29052026.pdf

PLFS should not be presented as a ready district × skill annual series when the underlying table does not support that grain.

### F. NCO-2015

Use the official National Classification of Occupations (NCO-2015) as the occupational taxonomy anchor.

The Ministry of Labour & Employment describes NCO-2015 as the occupational classification used for employment exchanges, surveys, job postings/search and policy analysis, and notes its mapping to NIC and QP/NOS.

Source:
https://labour.gov.in/sites/default/files/National%20Classification%20of%20Occupations_Vol%20II-B-%202015.pdf

### G. Local Government Directory (LGD)

Use LGD as the canonical administrative-code reference for district identifiers rather than inventing project-specific district codes.

Source:
https://lgdirectory.gov.in/

The first extraction pass must resolve each selected district to its official LGD code before records are loaded into the canonical dataset.

## 4. Candidate prototype geography

Do not start with all Odisha districts.

Initial target:

- 3–5 Odisha districts
- preferably districts with accessible official employment/training evidence
- document why each selected district was chosen

Possible candidates to investigate first:

- Khordha
- Cuttack
- Ganjam
- Mayurbhanj
- Sambalpur

Final selection depends on **source-backed data availability and usable grain**, not popularity.

### District sufficiency fallback

The preferred MVP is 3–5 districts with source-backed data.

If fewer than 3 districts have usable source-backed data at the selected analytical grain:

1. First reduce scope to the districts that genuinely meet the evidence requirement.
2. If fewer than 3 remain, continue with a smaller **source-backed prototype** rather than manufacturing official-looking coverage.
3. Synthetic data may be added only as clearly labelled **SYNTHETIC_DEMO** records to demonstrate UI/pipeline behaviour.
4. The demo and documentation must explicitly state that source-backed coverage is below the intended target.

No synthetic district is counted when claiming that the official dataset meets the MVP geography requirement.

## 5. Candidate sectors

Use sectors that can be documented with available training/occupation data.

Initial investigation set:

- Manufacturing
- Construction
- IT / Digital Services
- Tourism / Hospitality
- Healthcare

Final sector selection must follow the evidence actually available in the chosen districts.

## 6. Skill taxonomy rule and crosswalk control

Skills/job roles should be mapped to a documented taxonomy.

Primary anchor:

**NCO-2015 occupation/job-role classification**

Where training data requires skill/qualification linkage, retain relevant NSQF/QP/NOS identifiers where they are actually available.

Do not invent crosswalks.

Every mapping must carry explicit provenance metadata:

- mapping_method: OFFICIAL_CROSSWALK / MANUAL / INFERRED
- mapping_confidence: HIGH / MEDIUM / LOW
- mapping_note: human-readable rationale
- mapping_source: source supporting the mapping, when available

Only **OFFICIAL_CROSSWALK** mappings should be treated as authoritative by default.

MANUAL and INFERRED mappings must be filterable so the demo can show exactly which records rely on judgement.

The mapping artifact is part of reproducibility and must not be an untracked spreadsheet maintained outside the repository.

The database implementation must support these mapping fields; this is a required reconciliation point for Issue #2 before Issue #8 is considered final.

## 7. Candidate canonical structure

The final database mapping depends on Issue #2. At dataset level, the expected conceptual columns are:

### Administrative / analytical identity

- district_id
- district_name
- lgd_district_code
- state_code
- sector_id
- sector_name
- skill_id
- skill_name
- period_type
- period

### Measures

- demand_quantity
- demand_signal_type
- supply_quantity
- supply_signal_type
- training_capacity
- enrolment
- completions

### Provenance

- source_id
- source_type
- source_date
- retrieval_id
- is_synthetic
- provenance_state
- transformation_note

### Taxonomy mapping metadata

- mapping_method
- mapping_confidence
- mapping_source_id
- mapping_note

Not every source will populate every metric.

Missing values must remain missing; do not insert zero merely because a source did not report a value.

## 8. Demand and supply semantics

### 8.1 The MVP interpretation

For the prototype, do **not** describe the demand/supply comparison as a literal labour-force stock shortfall unless the source data actually supports that interpretation.

The intended fallback interpretation is:

- **Demand signal:** notified vacancies / employment-exchange demand signal where available.
- **Supply signal:** annual training completions or another explicitly documented annual supply-flow indicator where available.
- **Gap:** demand signal minus supply signal.

Because notified vacancies and annual training completions are different kinds of measures, the resulting gap is a **relative skill-pipeline pressure indicator**, not a direct estimate of the number of unemployed/available workers required to fill all labour-market demand.

Example demo label:

> “Estimated skill-pipeline pressure based on notified vacancies versus annual training completions; not a direct labour-force shortage estimate.”

The UI, methodology page, and AI explanations must preserve this interpretation.

### 8.2 Compatibility rule

A gap may only be calculated when the demand and supply signals are sufficiently compatible in:

- unit
- flow/stock semantics
- time basis
- geographic scope
- skill/occupation meaning

If they are not compatible, preserve both observations but do **not** fabricate a comparable gap. Store the data as contextual evidence instead.

This compatibility decision must be recorded in the transformation/methodology notes.

### 8.3 Demand

Candidate demand signals, only when actually present:

- notified vacancies
- relevant employment-market demand counts
- other validated demand proxies

Record the exact signal type in demand_signal_type.

### 8.4 Supply

Candidate supply signals:

- trained workforce indicators
- annual training completions
- other validated supply proxies

Record the exact signal type in supply_signal_type.

Training capacity, enrolment and completions remain separate component fields rather than being silently treated as current employed supply.

## 9. Provenance state and mixed series rule

Every observation must have an explicit provenance state.

Recommended record-level values:

- SOURCE_BACKED
- SYNTHETIC_DEMO

At the **series** level, classify provenance as:

- SOURCE_BACKED — every observation used in the series is source-backed.
- SYNTHETIC_DEMO — every observation is synthetic.
- MIXED_PROVENANCE — source-backed and synthetic observations coexist.

### Mixed-series rule

A District × Sector × Skill series is **not** considered source-backed unless **every observation in the validated history is source-backed**.

For history validation and confidence:

- include source-backed observations that pass validation
- exclude synthetic observations from the **usable-history count**
- flag mixed series explicitly
- synthetic periods may still be used for the visual/demo pipeline, but never to claim official history coverage

Example:

| Year | Provenance | Counts toward official history? |
|---|---|---:|
| 2021 | SOURCE_BACKED | Yes |
| 2022 | SOURCE_BACKED | Yes |
| 2023 | SOURCE_BACKED | Yes |
| 2024 | SYNTHETIC_DEMO | No |
| 2025 | SYNTHETIC_DEMO | No |

This prevents fabricated years from silently increasing history_periods, confidence, or minimum-history coverage.

## 10. Minimum-history validation

The ML contract currently uses:

**MIN_FORECAST_HISTORY = 3 usable yearly observations**

This remains provisional until the canonical data exists.

During Issue #7, calculate and report **separately**:

1. number of source-backed District × Sector × Skill series with 1, 2, 3, 4, and 5+ usable years
2. number of synthetic-demo series with the same counts
3. number of mixed-provenance series
4. proportion of source-backed series meeting 3 years
5. proportion of source-backed series meeting 4 and 5 years

A usable observation must:

- pass ingestion/validation rules
- use the selected analytical grain
- have a valid year
- contain the required non-null value(s)
- satisfy the demand/supply compatibility rules for the forecast being validated
- be SOURCE_BACKED when the statistic is being used to validate official history coverage

**Only the source-backed history statistics may be used to recommend whether MIN_FORECAST_HISTORY = 3 is realistic.**

Synthetic history is reported for transparency, not used as evidence that the official data supports forecasting.

## 11. MIN_FORECAST_DEMAND selection

Do not choose the final demand floor from the combined source-backed + synthetic distribution.

The final value must be selected using **source-backed demand quantities wherever they exist and are semantically valid**.

Procedure:

1. isolate source-backed demand quantities
2. exclude incompatible/invalid observations
3. inspect the distribution and smallest meaningful labour-market sizes
4. choose a small headcount floor that prevents percentage-gap instability without classifying ordinary small districts as NO_DEMAND
5. record the exact value and rationale in ML/config documentation
6. explicitly record that synthetic ranges were **not** used to choose the floor
7. inject the value into tests rather than hiding it in test code

If source-backed demand quantities are too sparse to support a defensible floor, leave the final value provisional and state the limitation rather than deriving the threshold from synthetic generator settings.

## 12. Source retrieval and reproducibility

The final dataset must be reproducible from:

**source files/URLs + retrieval metadata + mapping/config + preprocessing script**

No manual spreadsheet edits should be the only way to recreate the final canonical dataset.

For every downloaded source file/resource, maintain a retrieval record containing at least:

- source_id
- canonical_url
- retrieval_timestamp
- local filename/path or content identifier
- file hash (SHA-256)
- source publication date, when available
- retrieval status
- parser/version or transformation version, when relevant

The retrieval record should be append-only for reproducibility: a changed source file creates a new retrieval record rather than silently overwriting the old provenance.

Issue #2 / #8 must support this retrieval metadata before the final ingestion implementation is considered complete.

## 13. Source date vs period

Keep period and source_date semantically separate.

- period = year the observation or metric represents.
- source_date = publication date or retrieval date of the source record/resource used to obtain the observation, depending on what is actually available.

For data-freshness calculations, prefer the **source publication date** when it is explicitly known; otherwise use the retrieval date.

Record which date was used. Do not treat the observation year itself as source_date.

## 14. Dataset validation

Before calling Issue #7 complete, validate:

- duplicate District × Sector × Skill × Year keys at the canonical-output level
- valid district references
- valid LGD district codes
- valid sector references
- valid skill/taxonomy references
- mapping method/confidence present where mapping occurs
- year format
- non-negative quantities where required
- compatible demand/supply units and flow/stock semantics
- source/provenance presence
- retrieval record presence for downloaded resources
- synthetic flag correctness
- mixed-series classification
- transformation notes for derived values
- missing-value conventions
- source-backed history coverage
- synthetic history coverage
- outlier review

## 15. Taxonomy mapping validation

For each skill/job-role mapping:

- verify whether an official crosswalk exists
- otherwise mark the mapping as MANUAL or INFERRED
- record mapping confidence
- retain the supporting source or rationale
- exclude LOW-confidence mappings from authoritative headline analytics unless the methodology explicitly allows them
- keep uncertain mappings visible in diagnostic/debug views

The objective is to make mapping uncertainty explicit rather than hide it inside a skill_id.

## 16. Important analytical limitation for the demo

SHRAMIK's prototype must not imply that an employment-exchange vacancy count equals total labour-market demand.

Employment-exchange vacancies represent the demand signal observable through that system. Likewise, annual training completions represent a training-pipeline flow rather than a complete stock of immediately available workers.

Therefore, when these signals are used together, the product language should say:

**“skill-pipeline pressure indicator”**

rather than:

**“number of workers the market is short of.”**

This limitation should be visible in the methodology/trust UI and in generated planning explanations.

## 17. Important limitations for the demo

The demo must clearly distinguish:

- official source-backed observations
- derived/normalized values
- synthetic/demo values
- mixed-provenance series
- forecasts
- scenario simulation outputs
- labour-market **pressure indicators** versus literal workforce-shortage estimates

SHRAMIK should never imply that synthetic prototype values are official government statistics.

## 18. Fallback if source-backed grain is unavailable

Before constructing the canonical dataset, perform an explicit **grain checkpoint**.

Required check:

> Can the available official source data support District × Sector × Skill × Year without an unsupported manual crosswalk?

If **yes**, use the supported grain.

If **no**, do not silently manufacture skill_id.

The fallback decision is:

1. Check whether the source supports **District × Occupation Group × Year** with a defensible official classification.
2. If it does, propose that as the temporary MVP analytical grain.
3. Flag the change to **Issue #2 (database schema)** and **Issue #5 (ML output contract)** before implementation because both currently require skill_id.
4. Update the contracts before building dependent ingestion/ML code.

A fallback to occupation-group grain is therefore a deliberate contract change, not an implementation shortcut.

## 19. Research findings carried into implementation

The Odisha OGD Employment Exchanges catalogue exists and provides Catalog API and ZIP download options, but its actual downloadable resource fields and grain still require inspection before canonical extraction.

The official PLFS 2025 annual report is a Government of India / MoSPI / NSO publication covering January–December 2025 and published in March 2026. It is appropriate as official labour-market context, not as an assumed district × skill source.

LGD provides an official administrative-directory mechanism for standardised district codes/downloads, so SHRAMIK should resolve selected districts to LGD codes before extraction.

These sources are source-discovery evidence; the canonical dataset must still be built only from records that can actually be obtained, parsed, validated and cited.

## 20. Reconciliation requirements before Issue #7 completion

The following must be reconciled before the canonical dataset is considered final:

1. **Issue #2 / schema:** support taxonomy mapping method/confidence and source-retrieval metadata.
2. **Issue #5 / ML contract:** if the project falls back from skill grain to occupation-group grain, revise the required identity contract before dependent implementation.
3. **Architecture / analytics:** preserve the distinction between a labour-market pressure indicator and a literal labour-force shortage whenever demand and supply signals are different flows/stocks.
4. **ML/config:** final MIN_FORECAST_HISTORY and MIN_FORECAST_DEMAND must be evidence-driven from source-backed data.

## Next dependency

Final canonical columns and constraints must be reconciled with **Issue #2 — Database Schema** before the dataset is considered final.
