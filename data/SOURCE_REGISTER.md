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

## 2B. Additional official structured-data findings (2026-10-05)

### Odisha SAMS — ITI institute/trade vacancy data

The official Odisha Student Academic Management System exposes an institute-wise ITI trade vacancy table with fields including:

- district
- institute
- trade
- sanctioned strength
- admission taken
- vacant
- IMC-related capacity fields

The currently indexed table contains 697 result rows. This proves that Odisha has an official structured source capable of supporting **District × ITI × Trade** observations for the current admission/vacancy snapshot.

**Important limitation:** the public table is a current snapshot, not yet a validated multi-year historical series. Therefore it should not be treated as a 3+ year forecasting history until historical snapshots/archives are found.

**Decision:** use this as a candidate supply/capacity source and as evidence that district/trade skill grain is operationally available.

### Odisha Central Placement Cell — 2023-24 ITI placement data

The official Central Placement Cell publishes an Excel-backed 2023-24 placement dataset with institute-level placement counts and male/female breakdowns. The indexed data reports a total of 6,904 placements across the listed records.

**Important limitation:** this dataset is institute-level and does not expose trade/skill in the indexed table. It therefore supports an **Institute/District × Year placement outcome** signal, but not yet District × Skill × Year by itself.

**Decision:** retain as a secondary supply/employment-outcome signal. Do not infer trade-level placements from it.

### Odisha Central Placement Cell — government ITI master list

The official 2023-24 government ITI master list exposes district and institute names, providing a useful source for deterministic ITI-to-district mapping. It includes the candidate districts in our plan, including Cuttack, Ganjam, Mayurbhanj, Khurda and Sambalpur.

**Decision:** use it as a supporting reference when normalizing institute-level supply/placement records to districts.

### Current grain assessment

The source audit now establishes that official Odisha sources can support:

- District × ITI × Trade × current capacity/admission/vacancy
- District/Institute × Year × placement outcome
- District × ITI master mapping

What is **not yet established** is a recent multi-year **District × Skill/Trade × Year demand** series from an official vacancy source.

Therefore:

- Do not mark the full canonical District × Sector × Skill × Year target as proven yet.
- Do not fabricate historical demand from current vacancy snapshots.
- Continue demand-side audit through the Odisha Employment Directorate / Employment Market Information sources.
- If the demand source proves only District × Occupation × Year, pause and reconcile the taxonomy contracts before extraction.

## 2C. Demand-side audit findings (2026-10-05)

### Odisha District Employment Exchange statistical pages

Official district-government Employment Exchange pages provide historical employment-market statistics. Examples found:

- **Jagatsinghpur:** 2015, 2016, 2017 and February 2018 figures for registration, notification, submission, placement, live register and vacancy outstanding. The same page also gives live-register qualification categories including I.T.I. Trained.
- **Subarnapur:** 2015, 2016, 2017 and March 2018 figures for registration, notification, submission, placement, live register and vacancy outstanding. It also publishes placement-linked training by year and trade, including Mason/Bar Binding/Carpentry, Hospitality, Tally, DTP and Basic Automotive Servicing.
- **Kendrapara:** historical registration/notification/submission/placement/live-register data and training/recruitment records by year; the page also reports I.T.I.-trained candidates in its live-register breakdown.

The Directorate of Employment states that District Employment Exchanges collect Employment Market Information, including manpower and vacancy-position data, and conduct surveys/studies. Its official portal also states that employers furnish vacancy returns to District Employment Exchanges.

### Critical grain finding

The district Employment Exchange statistics establish a useful **District × Year labour-market pressure** signal, including `vacancy_outstanding`, but the public tables inspected do **not** establish a consistent **District × Skill/Trade × Year vacancy** series.

The trade-specific records found on district pages are primarily **training/placement** records, not vacancy demand.

Therefore the canonical demand grain should NOT be declared District × Skill × Year yet.

### Recommended SHRAMIK MVP data model after audit

For the defensible official-data MVP, separate signals instead of forcing them into one fabricated gap:

1. `employment_market_demand`
   - district_id
   - year
   - vacancy_outstanding
   - registrations
   - placements
   - provenance

2. `skill_supply_pipeline`
   - district_id
   - year
   - skill/trade
   - trainees_completed/trained
   - placements_where_available
   - provenance

3. `current_skill_capacity`
   - district_id
   - institute_id
   - skill/trade
   - sanctioned_strength
   - admission_taken
   - vacant_seats
   - provenance

These can support different dashboard views and an explicitly labelled **skill-pipeline pressure indicator**, but they must not be represented as a direct skill-level vacancy gap unless a source-backed skill-demand dataset is found.

### Current decision

**Do not fabricate historical skill demand.**

Continue looking for:
- official occupation/trade-level vacancy tables;
- archived Employment Market Information reports;
- district/sector occupation surveys;
- NCO-linked vacancy data;
- or another official Odisha demand source with a stable multi-year occupation/skill grain.

If none is found, revise the forecasting contract to forecast the defensible district-level demand signal and use skill-level supply/capacity as a separate analytical layer.
## 2D. Final demand-source finding (2026-10-05)\n\n### Official vacancy reporting is occupation-coded\n\nThe current Odisha vacancy-reporting form used by Career Centres contains fields for:\n- NIC Code of the establishment\n- NCO Code of the post\n- Unique Vacancy ID\n- Career Centre receiving the vacancy\n- date of receipt\n\nThis is strong evidence that the official vacancy system has an occupation-coded representation compatible with the SHRAMIK NCO taxonomy.\n\nHowever, the publicly accessible historical district pages inspected expose aggregate employment-market statistics rather than the underlying occupation-coded vacancy rows. Therefore the occupation-level demand dataset is **architecturally plausible but not publicly verified as an extractable historical dataset**.\n\n### Decision\n\nDo not abandon NCO-2015 or fabricate occupation-level demand.\n\nUse a two-tier demand strategy:\n1. **Primary target:** obtain an official occupation/NCO-coded vacancy export or historical EMI report if accessible.\n2. **Defensible fallback:** use District × Year employment-market demand (vacancy outstanding / registrations / placements) for the official forecasting baseline, while keeping skill/trade supply and capacity as separate analytical layers.\n\nThe fallback must not be described as a skill-level labour shortage.\n\n### Current canonical-data status\n\n- Official current vacancy system: occupation-coded via NCO — **confirmed**.\n- Public historical district demand statistics: District × Year — **confirmed**.\n- Public historical District × Skill × Year vacancy series — **not confirmed**.\n- Skill/trade supply and capacity: District × ITI × Trade and institute/year placement sources — **confirmed**.\n- Synthetic historical skill demand: **prohibited** unless explicitly labelled SYNTHETIC_DEMO and excluded from official-history claims.\n\nAt this point the dataset build has enough evidence to proceed with a real official-data MVP, but the exact ML target must follow the confirmed grain rather than the original aspirational grain.\n## 3. First extraction target

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
