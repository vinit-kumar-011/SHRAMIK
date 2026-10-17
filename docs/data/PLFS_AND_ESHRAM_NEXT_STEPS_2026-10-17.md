# SHRAMIK PLFS and e-Shram decision — 17 October 2026

## PLFS 2025 benchmark result

The corrected Stage 1A reconciliation was rerun against saved outputs on 17 October 2026. It reconciles saved point estimates and applies three documented source-transcription corrections; it does not rerun the full raw microdata estimator.

| Measure | Result |
|---|---:|
| Benchmark registry rows | 3,987 |
| Published numeric cells compared | 3,960 |
| Matches at published one-decimal precision | 3,928 |
| Remaining mismatches | 32 |
| Not-published / not-applicable cells | 27 |
| Corrected source transcriptions | 3 |
| Match rate among published cells | 99.19% |

Coverage includes four report age domains (15–29, 15–59, 15 years and above, and all ages), LFPR, WPR and UR, and published State/UT and India cells across rural, urban and combined sectors.

All 32 remaining mismatches are in the aggregate “person” category: LFPR 17, WPR 14 and UR 1. A sensitivity calculation excluding sex-code-3 contributions from the numerator while retaining those records in the denominator matches 31 mismatches, but is not approved and must not replace the inclusive estimator. The report includes transgender respondents under “person”; do not force these cells to pass. The remaining UR exception is Jammu & Kashmir, urban, all ages: published 10.4%, calculated result 10.3% at one decimal.

### Use in the MVP

- Published MoSPI aggregates can be loaded as source-attributed historical context/benchmarks with table, period, age domain, sex/sector, geography, precision and URL.
- Derived State/UT estimates remain a regression/validation artifact until the 32 cells are handled correctly. A one-decimal match is not proof of statistical reliability.
- Design-based standard errors, confidence intervals, RSE and district ranking remain blocked until the controlling 2025 Annual Report Appendix D procedure and unresolved FSU/SSS disposition rules are reconciled.
- Continue MVP pipeline development in parallel: training-supply staging, NCO/NQR mapping, hiring-demand source acquisition, and forecast evaluation on the eventual evaluation dataset.

Official report: https://www.mospi.gov.in/uploads/publications_reports/publications_reports1780040415321_0624fb13-fb47-40bc-b470-7c7e9635c3ef_PLFS_2025_F_REV_29052026.pdf

## e-Shram: use the API without blocking the MVP

Further semantic investigation is deferred beyond the MVP. The API may be captured for provisional source context and field/category discovery. Being a government data source establishes provenance, but does not define the meaning of each API field.

Evidence already captured locally:
- HTTP 200 and JSON; response envelope has records, count, limit, offset, data_fetch_date, updated_date and total.
- Two pages at offsets 0 and 10 returned 10 rows each with matching field sets and no identical full-record objects in common. This is a two-page smoke test, not proof of full-feed completeness or unique workers.
- Twelve observed fields: gender, age, differentlyAbledStatus, educationQualification, currentStateCode, currentStateName, currentDistrictCode, currentDistrictName, permanentStateCode, permanentStateName, primaryOccupation and DataGovUpdateDate.
- No stable worker/UAN identifier appears in the observed schema. The meaning of an individual records-array row has not been established.
- The source reported a total of 344,641,770; preserve this as uninterpreted API metadata only. Do not label it a verified count of registered workers, active jobseekers, available labour or vacancies.
- The sample DataGovUpdateDate is 2024-08-30 while the envelope data_fetch_date is 2026-10-15. Do not assume the row field is the current snapshot date.

Official e-Shram resource: https://www.data.gov.in/resource/district-wise-demographic-data-unorganised-workers-registered-eshram-previous-day  
Official catalogue: https://www.data.gov.in/catalog/demographic-data-unorganised-workers-registered-eshram-portal

### Bounded capture helper

Use scripts/capture_eshram_snapshot.py. It reads the API key from environment variable DATA_GOV_IN_API_KEY, never prints the key or request URL, uses bounded defaults (max-records 1000, max-pages 10), writes raw pages under git-ignored data/raw/eshram/ and writes privacy-minimized metadata and frequencies under git-ignored data/processed/eshram/. It never crawls the reported total.

PowerShell from the repository root, enter the following commands:

    $env:DATA_GOV_IN_API_KEY = "<your API key>"
    python .\scripts\capture_eshram_snapshot.py --max-records 1000 --max-pages 10 --filter "currentStateName=Odisha"

The optional exact-match filter must be accepted by the endpoint; if it errors, the script aborts instead of recording zero. The helper writes frequency counts only for current state, current district and primary occupation; categories with fewer than five captured rows are suppressed.

These frequencies mean only counts among bounded rows retrieved. They are not population totals or representative demographic distributions. Unique worker count, active jobseeker count, vacancy count and population count deliberately remain null. Keep raw response rows local and restricted; never commit or upload them. Do not feed the API total or bounded-capture frequencies into official forecasts.

Basic request/JSON/count/offset checks remain enabled so a failed or partial request cannot be silently mistaken for a valid zero. This is an integrity check, not a new open-ended e-Shram research workstream.

## Next execution order

1. Load official PLFS published aggregate values as historical context with precise source/table metadata.
2. Keep the 32 PLFS exceptions documented; do not modify the estimator to force a match.
3. Build training-supply metrics with seats, enrolments, completions, certifications and placements as distinct concepts.
4. Continue NCO/NQR mappings and authorized hiring-data acquisition.
5. Profile the eventual evaluation dataset before mapping any fields into the canonical data model.
6. Revisit e-Shram semantics only if its data meaning becomes necessary for a concrete MVP function.
