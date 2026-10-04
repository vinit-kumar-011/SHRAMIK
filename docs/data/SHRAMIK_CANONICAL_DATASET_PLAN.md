# SHRAMIK Canonical Dataset — Source & Construction Plan

**Issue:** #7 — Prepare SHRAMIK canonical sample dataset
**Status:** Source discovery / construction plan
**Branch:** `feature/canonical-dataset`
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
- PLFS provides strong official labour-market context, but its directly surfaced tables are primarily state/UT level rather than a ready-made district × skill annual series.

Therefore, the canonical prototype should use a **hybrid evidence model**:

1. **Source-backed records** where official data exists at the required grain.
2. **Explicitly labelled synthetic/demo records** where a source-backed district × sector × skill × year series cannot be obtained consistently.

Synthetic values must never be presented as government observations.

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

This source should be inspected for downloadable resources/API fields before canonical extraction.

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

The 2025 annual report is available from MoSPI.

Source:
https://mospi.gov.in/

PLFS should not be presented as a ready district × skill annual series when the underlying table does not support that grain.

### F. NCO-2015

Use the official National Classification of Occupations (NCO-2015) as the occupational taxonomy anchor.

The Ministry of Labour & Employment describes NCO-2015 as the national occupational classification used for employment exchanges, surveys, job postings/search and policy analysis, and notes its mapping to NIC and QP/NOS.

Source:
https://labour.gov.in/sites/default/files/National%20Classification%20of%20Occupations_Vol%20II-B-%202015.pdf

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

Final selection depends on data availability, not popularity.

## 5. Candidate sectors

Use sectors that can be documented with available training/occupation data.

Initial investigation set:

- Manufacturing
- Construction
- IT / Digital Services
- Tourism / Hospitality
- Healthcare

Final sector selection must follow the evidence actually available in the chosen districts.

## 6. Skill taxonomy rule

Skills/job roles should be mapped to a documented taxonomy.

Primary anchor:

**NCO-2015 occupation/job-role classification**

Where training data requires skill/qualification linkage, retain relevant NSQF/QP/NOS identifiers where they are actually available.

Do not invent crosswalks.

Every manual mapping must have a documented mapping rule and provenance.

## 7. Candidate canonical structure

The final database mapping depends on Issue #2. At dataset level, the expected conceptual columns are:

- district_id
- district_name
- state_code
- sector_id
- sector_name
- skill_id
- skill_name
- period_type
- period
- demand_quantity
- supply_quantity
- training_capacity
- enrolment
- completions
- source_id
- source_type
- source_date
- is_synthetic
- transformation_note

Not every source will populate every metric.

Missing values must remain missing; do not insert zero merely because a source did not report a value.

## 8. Demand and supply semantics

### Demand

Preferred common-unit quantity:

**worker/position headcount**

Candidate demand signals, only when actually present:

- vacancies notified
- relevant employment-market demand counts
- other validated demand proxies

### Supply

Preferred common-unit quantity:

**worker headcount**

Candidate supply signals:

- trained workforce indicators
- training completions
- other validated supply proxies

Training capacity, enrolment and completions should remain separate component fields rather than being silently treated as current employed supply.

## 9. Source-backed vs synthetic rule

Every record must have an explicit provenance state.

Recommended values:

- SOURCE_BACKED
- SYNTHETIC_DEMO

A synthetic record must also include a transformation/creation note explaining:

- why synthetic data was necessary
- what structure it follows
- what source/context informed its ranges or shape, if any

Synthetic data must never receive a fake source citation.

## 10. Minimum-history validation

The ML contract currently uses:

**MIN_FORECAST_HISTORY = 3 usable yearly observations**

This remains provisional until the canonical data exists.

During Issue #7:

1. calculate the number of usable yearly observations per District × Sector × Skill series
2. measure how many series meet 3 years
3. measure how many meet 4 and 5 years
4. document the coverage
5. recommend whether 3 remains appropriate

A usable observation must pass the ingestion/validation rules and contain the required non-null values for the selected forecast.

## 11. MIN_FORECAST_DEMAND selection

Do not choose the final demand floor before inspecting real canonical values.

After source-backed and synthetic records are assembled:

1. inspect the distribution of forecast/training input quantities
2. identify the smallest meaningful labour-market size represented
3. choose a small headcount floor that prevents percentage-gap instability without classifying normal small districts as NO_DEMAND
4. record the exact value and rationale in the ML/config documentation
5. inject the value into tests rather than hiding it in test code

This value must be evidence-driven, not chosen for the convenience of creating warnings.

## 12. Dataset validation

Before calling Issue #7 complete, validate:

- duplicate District × Sector × Skill × Year keys
- valid district references
- valid sector references
- valid skill/taxonomy references
- year format
- non-negative quantities where required
- compatible demand/supply units
- source/provenance presence
- synthetic flag correctness
- transformation notes for derived values
- missing-value conventions
- history coverage
- outlier review

## 13. Reproducibility

The final dataset should be reproducible from:

**source inputs + mapping/config + preprocessing script**

No manual spreadsheet edits should be the only way to recreate the final canonical dataset.

## 14. Important limitations for the demo

The demo must clearly distinguish:

- official source-backed observations
- derived/normalized values
- synthetic/demo values
- forecasts
- scenario simulation outputs

SHRAMIK should never imply that synthetic prototype values are official government statistics.

## 15. Research findings carried into implementation

The official Odisha employment service says district employment exchanges collect local employment-market information and quarterly employment reports, supporting the idea that district-level labour-market signals exist in the employment-service ecosystem.

The Odisha OGD catalogue exposes an Employment Exchanges Data catalogue.

Odisha skill-development reporting documents automated skill-development metrics and dashboards, including alignment of programme definitions to NSQF standards.

NCO-2015 is the official occupation classification anchor and is described by the Ministry of Labour & Employment as being used in employment exchanges, surveys, job postings/search and policy analysis.

These sources are source-discovery evidence; the canonical dataset must still be built only from records that can actually be obtained, parsed, validated and cited.

## Next dependency

Final canonical columns and constraints must be reconciled with **Issue #2 — Database Schema** before the dataset is considered final.
