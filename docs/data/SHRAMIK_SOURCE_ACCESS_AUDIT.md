# SHRAMIK Verified Source-Access Audit

**Audit date:** 2026-10-11  
**Scope:** Public/official data source discoverability, supported retrieval method, useful grain, and immediate ingestion path.  
**Status:** Portal metadata and access routes verified; authenticated PLFS download and source extraction have not yet been executed from the project environment. Do not describe any adapter as operational until a real retrieval and parser test succeeds.

## Executive decision

Data access should not block the whole team. Build the ingestion pipeline around **source adapters**, not around a requirement that every government source expose a live API.

Supported adapter input types should include:

- **API_JSON**
- **CSV_OR_XLSX_DOWNLOAD**
- **HTML_TABLE_SNAPSHOT**
- **OFFICIAL_REPORT_OR_ANNEXURE**
- **SYNTHETIC_DEMO**

For repeatability, save each retrieved source file/snapshot under **data/raw/**, record retrieval time and SHA-256, then parse and normalize offline. Do not call government portals when the frontend dashboard is opened.

## 1. Source-by-source access findings

### A. Odisha SAMS — ITI institute/trade vacancy and capacity table

**Official resource:** [Institute-wise ITI trade vacancy data](https://skill.samsodisha.gov.in/Website/ITI/itiInstituteWiseTradeVacancy.aspx)

The public page exposes a paginated structured HTML table with **697 listed results**. The visible fields include district, institute, trade, sanctioned strength, admission taken, girls reported, vacant seats, IMC sanctioned strength, and contact number.

**Access status**
- Public browser access: confirmed.
- Structured HTML table: confirmed.
- Stable documented public API: not verified.
- Multi-year history/archive: not verified.

**Usable grain and role**
- Current/snapshot training capacity: District × Institute × Trade.
- Signal type: training capacity / vacant training seats (keep these separate).
- Use as a **supply/capacity** source, not as employer vacancy demand.
- Do not ingest contact numbers; they are not needed for SHRAMIK analytics.

**Caveats**
- It is a snapshot; capture the retrieval timestamp and academic/admission cycle displayed by the source.
- Do not claim this alone supports a multi-year forecast.
- Map trade names to canonical skill/NCO only when a defensible crosswalk is available. Preserve the raw trade label and mapping status otherwise.

### B. Odisha District Employment Exchange — historical labour-market statistics

**Official example:** [District Employment Exchange, Jagatsinghpur](https://jagatsinghpur.odisha.gov.in/en/departments/district-employment-exchange)

The official page presents historical statistics for 2015, 2016, 2017 and February 2018, including registrations, notifications, submissions, placements, live register and vacancy outstanding. It also contains qualification categories such as ITI-trained.

**Access status**
- Public HTML tables: confirmed.
- Stable public API for these historical tables: not verified.
- Period and geographic grain: historical District × Year / partial-year snapshot.

**Usable grain and role**
- Preserve metrics such as vacancy outstanding, registrations, and placements as distinct signals.
- This is an aggregate district-level labour-market signal, not a verified skill-level vacancy series.
- Partial 2018 must be labelled as partial-year; it must not be treated as a complete annual observation.

**Caveats**
- The published series is old. It can validate the parser and provide historical context, but must not be represented as a current labour-market picture.
- Do not join district-level demand directly to trade-level supply and call it a skill shortage.

### C. PLFS — MoSPI unit-level survey data

**Official access route:** [MoSPI UnitData Python Library](https://www.mospi.gov.in/unitdata-python-library)  
**2025 calendar-year dataset:** [PLFS 2025 catalogue / data dictionary](https://microdata.gov.in/NADA/index.php/catalog/284/data-dictionary/F2)  
**2024 dataset:** [PLFS 2024 catalogue / data dictionary](https://microdata.gov.in/NADA/index.php/catalog/254/data-dictionary/F2)

MoSPI documents the mospi-unitdata Python client. Its documented workflow is to register/log in, generate an API key from the portal profile, search/list datasets, and download individual files or a dataset. The public-use unit-level files are login-gated; the portal/library instructions do not remove that access requirement.

The PLFS data dictionary exposes state and district codes, industry classifications (NIC), and occupation classifications (NCO), alongside survey design and multiplier fields. It is useful for labour-market employment context and benchmarking, but it is **not a direct vacancy count**.

**Access status**
- Official programmatic download workflow documented: confirmed.
- Authenticated download using SHRAMIK's environment: pending.
- Credential requirement: portal account/API key.
- Parser requirements: data layout, codebooks, survey weights/multipliers, activity-status definitions, geography codes and occupation/industry versions.

**Critical comparability caveat**
MoSPI states that PLFS sampling design was revised effective January 2025 and that calendar-year 2025 estimates may not be strictly comparable with the earlier 2022–2024 annual estimates. See the [official PLFS 2025 annual report](https://mospi.gov.in/uploads/publications_reports/publications_reports1780040415321_0624fb13-fb47-40bc-b470-7c7e9635c3ef_PLFS_2025_F_REV_29052026.pdf) and [PIB explanation of comparability](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2246009&lang=1&reg=3).

Therefore, do not concatenate 2022–2025 PLFS data into one seamless annual forecast series without an explicit break-in-series treatment. Under the currently frozen annual forecast contract, use PLFS as a documented context/benchmark source until comparability and estimand decisions are resolved.

### D. National Career Service (NCS) — OGD vacancy resource

**Exact resource checked:** [Sector-wise vacancies mobilised through NCS as on 15-11-2024](https://up.data.gov.in/resource/sector-wise-number-vacancies-mobilised-through-national-career-service-ncs-portal-15-11)

The resource page explicitly states that **the API for this resource does not exist** and offers a request-API option. The page describes a small CSV resource sourced from a Rajya Sabha answer, rather than a verified live vacancy feed.

**Access status**
- Resource metadata/page: confirmed.
- API for this exact resource: not available at audit time.
- A live, recurring historical vacancy API: not established.

**Decision**
- Do not write a client against this resource as if an API exists.
- A downloaded parliamentary-answer snapshot may be stored as a dated aggregate observation if the actual file is retrievable and its contents are validated.
- Separately search for another NCS resource with an enabled API or official occupation-coded vacancy export.

### E. e-Shram and PMKVY OGD resources

**Candidate resources**
- [Occupation-wise e-Shram registrations (as of 14-12-2022)](https://ap.data.gov.in/resource/occupation-wise-number-registrations-unorganised-workers-till-14-12-2022)
- [PMKVY district-level training outcomes (as of 21-04-2022)](https://www.data.gov.in/resource/district-wise-enrolled-trained-assessed-certified-placed-under-pmkvy-21-april-2022)

These are dated, source-specific snapshots. Their current direct-download success, resource-level API availability and full field definitions have **not** been verified in SHRAMIK's runtime. OGD API support is resource-specific; the existence of a dataset page does not prove an API exists.

**Decision**
- Keep them as candidates until the actual file or API response is obtained and inspected.
- e-Shram registrations are registered-worker context, not verified current available labour supply.
- PMKVY enrolment, training, certification and placement are separate outcome signals; do not collapse them into one supply count.

### F. NQR / occupational crosswalks

**Official portal:** [National Qualifications Register](https://nqr.gov.in/qualifications-search)

Use it to verify selected qualification/trade-to-occupation mappings. A stable public API for the required crosswalk was not verified in this audit. Until an official machine-readable export/API is confirmed, capture the specific qualification record/document used for each reviewed mapping and record mapping method, confidence and source. Never invent an NCO code.

## 2. What this means for the frozen SHRAMIK model

The current model already supports heterogeneous source grains. No database redesign is required merely because sources arrive as APIs, spreadsheets, HTML tables or reports.

Keep these source families separate:

| Source | Observation/signal grain currently supported by evidence | Correct analytical role |
|---|---|---|
| SAMS ITI table | District × Institute × Trade × snapshot | Training capacity / vacant seats |
| District Employment Exchange page | District × Year or partial-year | Aggregate employment-market pressure/context |
| PLFS microdata | Survey person/household records with state/district, NCO/NIC and weights | Employment/labour-market estimates and benchmark |
| NCS parliamentary-answer resource | Dated aggregate sector/state snapshot depending on the selected resource | Context only unless compatible repeated observations are established |
| e-Shram snapshot | Source-defined registration geography/occupation grain | Registered-worker context |
| PMKVY snapshot | Source-defined scheme, geography, period and outcome grain | Training pipeline/outcomes |

A source's presence does not automatically make it eligible for every downstream forecast. In particular, no verified public recent multi-year District × Skill × Year employer-vacancy series is established by the sources above. Preserve aggregate grain and set gap eligibility false when demand and supply are not compatible.

The current database/ML contracts remain authoritative:
- Annual periods only unless contracts are formally reconciled.
- At least three usable yearly observations for the existing default forecast rule.
- Synthetic data belongs in DEMO and does not count toward official historical coverage.
- No fabricated skill-level demand from district/state aggregate demand.
- Persist source retrieval, grain, mapping and provenance evidence.

## 3. Recommended first vertical slice

1. **Supply snapshot:** retrieve the SAMS HTML table once, save a raw snapshot, parse the rows into a reviewable CSV, omit contact numbers, and attach source URL, retrieval timestamp and SHA-256.
2. **Aggregate demand parser:** extract one official District Employment Exchange statistics page into a fixture/CSV with distinct metrics and explicit period labels. Mark partial-year observations as partial.
3. **Canonical output:** normalize both datasets through the existing capability-aware observation model without joining them into an unsupported skill gap.
4. **PLFS access setup in parallel:** create the portal account and API key, then run a separate download smoke test for the selected catalog dataset. Keep the key in local environment configuration; never commit it.
5. **Tests:** include valid row, missing field, invalid number, duplicate row, unmapped trade, partial period, and repeatable-run tests.
6. **Demo path:** keep the synthetic/demo adapter independent so the full skill-level forecast journey can be demonstrated without misrepresenting synthetic data as official.

## 4. Definition of done for Issue #9

- At least one official source can be retrieved or reproduced from a saved raw input.
- The raw input is immutable/versioned, timestamped and hashed.
- The adapter documents the source schema, actual grain, period coverage and signal semantics.
- Normalized records preserve missing dimensions and source provenance.
- Unsupported mappings and invalid rows are reported, not silently coerced.
- Re-running the same snapshot yields deterministic output.
- A separate synthetic/demo adapter is testable.
- No forecast, gap or source API is claimed operational before the relevant runtime test succeeds.
