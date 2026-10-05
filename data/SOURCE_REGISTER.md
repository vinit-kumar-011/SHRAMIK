# SHRAMIK Canonical Dataset Build

**Purpose:** Execution register for the canonical development dataset.  
**Reference plan:** `docs/data/SHRAMIK_CANONICAL_DATASET_PLAN.md`  
**Status:** Source audit in progress.

## 1. Immediate checkpoint

Before extracting any observations, prove that an official source supports the target grain:

**District × Sector × Skill × Year**

Do not manufacture `skill_id` values merely to force a source into the target grain.

If the source only supports District × Occupation Group × Year, stop and reconcile Issues #2 and #5 before dependent ingestion/ML work.

## 2. Official source register

| Source | Role | Current evidence | Next action | Provenance |
|---|---|---|---|---|
| Odisha OGD — Employment Exchanges Data | Candidate demand/labour-market source | Official catalogue exists; it exposes Catalog API and ZIP Download | Inspect actual resources, fields, years, geography, and grain | SOURCE_BACKED candidate |
| Odisha Directorate of Employment / State Career Service | Vacancy/employment context | Official portal documentation exposes Current Vacancies and Employment Statistics functions | Determine whether public structured/historical district records are downloadable | SOURCE_BACKED candidate |
| Odisha Directorate of Skill Development-cum-Employment | Training/supply context | Official department site exposes a current dashboard and skill/employment reporting | Identify district/year/trade-level downloadable records | SOURCE_BACKED candidate |
| PLFS | Labour-market context/benchmark | Official annual report source | Use for context/benchmarks; do not assume District × Skill grain | SOURCE_BACKED candidate |
| NCO-2015 | Occupation taxonomy | Official classification | Use as taxonomy anchor and record crosswalks | SOURCE_BACKED reference |
| LGD | District identifiers | Official directory/download service | Resolve selected districts to official LGD codes before loading data | SOURCE_BACKED reference |


## 2A. Source-audit findings (2026-10-05)

### Odisha OGD — Employment Exchanges Data

The official OGD catalogue was inspected through the national OGD listing. It currently exposes exactly two resources:

1. **Monthly data of employment exchanges from July 2012 to April 2013**
   - Granularity: Monthly
   - Published: 30/06/2014
   - Updated: 10/12/2021
   - File size: 535 bytes
2. **Annual live registration of job seekers in employment exchanges from 2002 to 2011**
   - Granularity: Annual
   - Published: 30/06/2014
   - Updated: 10/12/2021
   - File size: 252 bytes

**Decision:** this catalogue is **not sufficient by itself** for the SHRAMIK target grain or the intended recent historical forecasting window. Do not use it as the canonical District × Sector × Skill × Year demand series without an additional official resource proving the required grain.

### Odisha Directorate of Employment / State Employment Service

The official Employment Directorate portal confirms that:
- public- and private-sector employers are required to furnish vacancy information/returns to the concerned Employment Exchange;
- District Employment Exchanges are responsible for receiving this information;
- the department describes 30 District Employment Exchanges;
- the department's Employment Market Information function and manpower-planning/forecasting responsibilities are relevant to SHRAMIK.

**Decision:** keep this as a primary candidate for the demand-side audit. The next step is to locate an actually downloadable/structured historical vacancy or employment-statistics resource and inspect its fields and period coverage. Portal documentation alone is not evidence of row-level canonical observations.

### Odisha DSDE

The official DSDE site exposes current skill-development/employment dashboards and multiple trainee/examination/training resources, including ITI-wise examination data and trainee-related datasets.

**Decision:** keep DSDE as the primary supply-side audit target. The next step is to identify a downloadable resource whose records can be aggregated to District × Trade/Skill × Year without inventing geography or skill identifiers.

### LGD

The Government of India's Local Government Directory provides official state/district directory download and search mechanisms.

**Decision:** use LGD as the authority for district identifiers once the final source-backed district set is selected. Do not hard-code illustrative district codes.

## 3. First extraction target

Start with a deliberately small Odisha subset:

- 3–5 districts, selected by actual source-backed availability
- 3–5 sectors only where defensible mappings exist
- multiple skills/job roles only where the source grain supports them
- 3–5 usable historical years where source-backed data exists

Candidate districts from the plan are only a starting investigation list:

- Khordha
- Cuttack
- Ganjam
- Mayurbhanj
- Sambalpur

Final selection must be evidence-driven.

## 4. Evidence to capture for every downloaded source

For each source resource, record:

- source_id
- canonical_url
- retrieval_timestamp
- local filename/path or content identifier
- SHA-256 hash
- publication date, when available
- retrieval status
- parser/transformation version
- observed period coverage
- geography/grain
- unit
- signal type

For synthetic generation, use a separate generation record with:

- generation_run_id
- generator name/version
- random seed
- parameter/configuration payload
- generation timestamp
- rationale for chosen ranges

## 5. Non-negotiable provenance rules

- SOURCE_BACKED means evidence is actually present.
- SYNTHETIC_DEMO must never be presented as an official source.
- MIXED_PROVENANCE series must be flagged.
- Synthetic observations do not count toward official minimum-history validation.
- Synthetic ranges do not determine MIN_FORECAST_DEMAND.
- Do not create fake `data_sources` records for synthetic observations.

## 6. Gap interpretation

If the selected demand signal is notified vacancies and supply is annual training completions, the resulting comparison is a:

**skill-pipeline pressure indicator**

It is not a direct estimate of total labour-force shortage.

Record the actual demand_signal_type and supply_signal_type and run the compatibility checklist before marking a series `gap_eligible=true`.

## 7. Completion criteria

This dataset build is ready for downstream development only when:

- source-backed source/grain has been inspected
- selected districts are resolved to official LGD codes
- source-backed and synthetic coverage are reported separately
- mappings have method/confidence/source metadata
- retrieval metadata and hashes are recorded
- canonical observations pass validation
- the final dataset can be regenerated without manual spreadsheet edits

Until then, do not use synthetic coverage to claim official data sufficiency.
