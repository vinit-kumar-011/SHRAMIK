# SHRAMIK Canonical Dataset Build

> **National-model reconciliation:** This register is now a source audit for a national LMIS. Odisha findings are pilot/source-adapter evidence only. The authoritative heterogeneous observation model is `docs/data/SHRAMIK_NATIONAL_DATA_MODEL.md`.

**Purpose:** Execution register for the canonical development dataset.  
**Reference plan:** `docs/data/SHRAMIK_CANONICAL_DATASET_PLAN.md`  
**Status:** Source audit in progress.

## 1. Immediate checkpoint

Before extracting any observations, prove that an official source supports the target grain:

**National capability-aware observation grain** (STATE / STATE_SECTOR / STATE_SKILL / STATE_SECTOR_SKILL / DISTRICT / DISTRICT_SECTOR / DISTRICT_SKILL / DISTRICT_SECTOR_SKILL)

Do not manufacture `skill_id` values merely to force a source into the target grain.

If the source supports only an aggregate grain, preserve that grain. Do not invent skill IDs. Use the source only for analytical capabilities that its actual grain supports.

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

**Decision:** this catalogue is **not sufficient by itself** for a skill-level demand series or the intended recent historical forecasting window. Preserve its actual published grain and use it only for capabilities that the source genuinely supports.

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

- Do not claim a universal skill-level demand grain from aggregate sources. The national canonical model accepts heterogeneous source grain and records capability explicitly.
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
## 2D. Final demand-source finding (2026-10-05)\n\n### Official vacancy reporting is occupation-coded\n\nThe current Odisha vacancy-reporting form used by Career Centres contains fields for:\n- NIC Code of the establishment\n- NCO Code of the post\n- Unique Vacancy ID\n- Career Centre receiving the vacancy\n- date of receipt\n\nThis is strong evidence that the official vacancy system has an occupation-coded representation compatible with the SHRAMIK NCO taxonomy.\n\nHowever, the publicly accessible historical district pages inspected expose aggregate employment-market statistics rather than the underlying occupation-coded vacancy rows. Therefore the occupation-level demand dataset is **architecturally plausible but not publicly verified as an extractable historical dataset**.\n\n### Decision\n\nDo not abandon NCO-2015 or fabricate occupation-level demand.\n\nUse a two-tier demand strategy:\n1. **Primary target:** obtain an official occupation/NCO-coded vacancy export or historical EMI report if accessible.\n2. **Defensible fallback:** use District × Year employment-market demand (vacancy outstanding / registrations / placements) for the official forecasting baseline, while keeping skill/trade supply and capacity as separate analytical layers.\n\nThe fallback must not be described as a skill-level labour shortage.\n\n### Current canonical-data status\n\n- Official current vacancy system: occupation-coded via NCO — **confirmed**.\n- Public historical district demand statistics: District × Year — **confirmed**.\n- Public historical District × Skill × Year vacancy series — **not confirmed**.\n- Skill/trade supply and capacity: District × ITI × Trade and institute/year placement sources — **confirmed**.\n- Synthetic historical skill demand: **prohibited** unless explicitly labelled SYNTHETIC_DEMO and excluded from official-history claims.\n\nAt this point the dataset build has enough evidence to proceed with a real official-data MVP, but the exact ML target must follow the confirmed grain rather than the original aspirational grain.\n
## 2E. State-level official vacancy pilot extracted (2026-10-22)

### DGE — Employment Exchange Statistics 2023, Table 2

**Source:** [official report PDF](https://dge.gov.in/dge/sites/default/files/2023-03/Employment_Exchange_2023.pdf), Table 2, publication page 30; reference period is calendar year 2022.

- The table reports annual vacancies notified to employment exchanges by State/UT, in thousands to one decimal place.
- The checked-in transcription is `data/processed/employment_exchange_vacancies_state_2022.csv`.
- **34** records were mapped to the current canonical state/UT roster and loaded into `public.demand_observations` as `STATE × YEAR(2022)`, `VACANCIES_NOTIFIED_TO_EMPLOYMENT_EXCHANGES`, unit `vacancies`, semantics `FLOW`, provenance `SOURCE_BACKED`. The reported thousands are multiplied by 1,000; the source's one-decimal-thousand precision remains and is documented on every row.
- At the source's displayed precision, the mapped rows sum to **1,367.6 thousand** vacancies notified. Printed `0.0` values are rounded display values and must not be interpreted as proof of exactly zero vacancies.
- **Sikkim is absent** from this table; it is not created as a zero-valued observation. The report notes that no employment exchange was operating there.
- The report has separate rows for the historical Union Territories Dadra and Nagar Haveli and Daman and Diu. The current reference roster has a single merged territory. Those two rows were excluded from canonical promotion because the values are rounded to 0.1 thousand and cannot be losslessly aggregated. Their source records remain represented in the source report rather than being silently merged.
- A `source_retrievals` record stores the SHA-256 of the checked-in normalized CSV transcription (not the original PDF bytes), plus parser/transformation versions and the official source URL.

**Analytical boundary:** this is an aggregate State-level demand-flow input, not district- or skill-level demand. It must not be distributed across districts or skills, and it does not create a compatible series for the current District × Skill forecast contract by itself. The absence of official forecasts, early warnings and emerging-skill outputs is therefore still expected until compatible historical District × Skill series are validated.

## 3. Pilot extraction target

Start with a deliberately small Odisha subset:

- a few States selected by source-backed availability
- 2–4 sectors only where defensible mappings exist
- multiple skills/job roles only where the source grain supports them
- 3–5 usable historical years where source-backed data exists
- at least one source adapter plus the hackathon dummy-data adapter

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


## 2F. National Career Service active-vacancy snapshot (2026-10-22)

### Ministry of Labour & Employment / Press Information Bureau — NCS portal count

**Official release:** [PIB Press Release PRID 2147927, posted 5 August 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2147927&lang=2&reg=48).

The release reports **over 17.68 lakh active vacancies on the National Career Service (NCS) portal as of 15 July 2026**. A source-backed national observation has been registered in Supabase as:

- `metric_code=NCS_PORTAL_ACTIVE_VACANCIES`
- `observation_grain=NATIONAL`
- `reference_period=AS_OF_2026-07-15`
- `value_numeric=1,768,000`, unit `vacancies`, source comparison `greater_than`
- `provenance_state=SOURCE_BACKED`, `is_synthetic=false`

**Display and analysis rules:**

1. Display the publisher's lower-bound wording **“Over 17.68 lakh”**; do not format 1,768,000 as an exact count.
2. Label it **“NCS portal active vacancies”** and show the 15 July 2026 as-of date. It refers only to vacancy listings represented on NCS, not all vacancies in India.
3. Keep it in `source_metric_observations` as portal-snapshot context. Do not promote it to `demand_observations`, aggregate it as total labour-market demand, allocate it to states/districts/skills, or use it for official skill-gap/forecast calculations.
4. The observation now links to `source_retrievals` record `ca173ade-bcee-4bc5-b351-c5f67c06e7e2`. Its SHA-256 (`229d598445de056db251baf20eb26d456166efc20dbb6e902dec7136de544e7d`) hashes the checked-in normalized transcription `data/processed/ncs_portal_active_vacancies_2026-07-15.csv`, **not** the original PIB HTML/PDF bytes. The raw publication artifact has not been archived. This is a reproducible record of the manual transcription, not an automated NCS ingestion/feed.
5. NCS's public search/latest-updates interface is not yet an approved bulk feed. Its “Latest Updates” view was observed to have an older page-level update date (28 September 2026) when reviewed on 22 October. Do not scrape listings automatically or represent them as a live, exhaustive national vacancy census unless DGE confirms an approved structured retrieval route and terms for use/display.

**Decision:** use this one dated portal aggregate as visible source-backed context only. Continue to use “Total Estimated Demand — Not published” until a compatible, methodologically supported demand measure is available. The existing DGE Employment Exchange Statistics 2023 source remains a separate State/UT × Year(2022) vacancy-notified flow, not a substitute for current NCS listings.
