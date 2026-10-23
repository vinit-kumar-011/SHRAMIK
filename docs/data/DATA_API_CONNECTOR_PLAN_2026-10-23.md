# SHRAMIK direct source API and state/district coverage plan

**Status:** first connector increment prepared for review; branch-only, not deployed. No API key or resource IDs are included in source control, and no production API fetch has been run by this change.

## Current database baseline

A read-only audit of the active Supabase project found:

- `demand_observations`: 34 SOURCE_BACKED state-level rows, all from 2022 Employment Exchange Statistics (vacancies notified to exchanges); zero district-level rows. Sikkim and Dadra and Nagar Haveli and Daman and Diu have no row in that table. Missing means unknown/not loaded, not zero.
- `supply_observations`: 182 SOURCE_BACKED state-level rows for 2024–2026, all programme-specific: PMKVY trained/oriented in the space/geospatial sector and NAPS apprentices engaged in that sector. Zero district-level rows; these are not a complete measure of the available workforce.
- `forecast_results`: zero persisted forecast rows.
- District-grain context in staging: DGT CTS-2026 provisional seat matrix has 29,372 rows over 691 state/district label pairs, source-as-of 2026-07-08; NCVT/ITI listing has 16,815 rows over 702 state/district pairs but no verified snapshot date.
- The current geography roster has 784 districts; source-specific PLFS codes must not be treated as LGD codes.

## First OGD API candidates

| Source key | Official resource family | Grain / frequency | Good for | Must not be treated as |
|---|---|---|---|---|
| `eshram_district_registrations` | [e-Shram district-wise registrations](https://www.data.gov.in/catalog/demographic-data-unorganised-workers-registered-eshram-portal) | District / daily previous-day snapshot | Registration-stock and demographic context, subject to field verification | Active jobseekers, workers currently available, or total workforce |
| `udyam_district_enterprises` | [UDYAM registration](https://www.data.gov.in/catalog/udyam-registration-msme-registration) | District / latest cumulative snapshot; some resources include LG Directory district code | Enterprise density and local economic-activity context | Vacancies or a direct employment count |
| `mgnrega_district_employment` | [MGNREGA district-wise data](https://www.data.gov.in/catalog/mahatma-gandhi-national-rural-employment-guarantee-act-mgnrega) | District / daily or period-specific programme data | Public-works programme participation and employment days, as supported by selected fields | Total labour demand or private-sector vacancies |
| `jss_district_training_snapshot` | [MSDE JSS dataset](https://www.data.gov.in/catalog/msde-jan-shikshan-sansthan) | District / snapshot dated 2022-04-27 in the inspected resource | Historical enrolled/assessed training context | Current training capacity; do not schedule it as a live feed without a newer dataset |

The generic adapter calls the official OGD resource API (`api.data.gov.in/resource/{resource_id}`). Each resource ID is configured in backend environment only after its current portal metadata and field list are checked. The OGD API key must be generated through an authenticated data.gov.in account and stored as a backend secret. A resource name or API key alone is not proof of access to the chosen resource.

## Other direct-source paths (next increment)

- **MoSPI eSankhyiki API catalogue:** official catalogue advertises open APIs and labour-statistics themes. Select a specific dataset/indicator endpoint before building an adapter; do not guess endpoint contracts. https://esankhyiki.mospi.gov.in/
- **MoSPI Microdata Portal / PLFS:** the official `mospi-unitdata` Python client can list and download files with a portal API key, but registration, dataset-access and agreement rules still apply. Treat PLFS as a controlled/versioned microdata refresh, not a public continuously polled endpoint. https://www.mospi.gov.in/unitdata-python-library and https://mospi.gov.in/faq
- **NCS / state employment-service demand:** current public access to a permitted structured vacancy API or historical NCO-coded export has not been verified. Do not scrape a search UI or claim skill-level vacancy grain until an authorised interface or source export is confirmed.
- **DGT / NCVT / ITI:** the currently registered DGT/NCVT records are file-backed and/or snapshots, not a verified read API. Keep explicit file-source adapters until an authorised structured endpoint is documented.

## Connector safety and operating contract

1. The only host the OGD adapter calls is `https://api.data.gov.in`; callers cannot supply URLs.
2. Only source registry keys can be fetched. API keys and resource IDs are backend environment values and are not returned by API responses or stored in logs.
3. Preview is bounded and read-only. Sync is token-protected and append-only.
4. Sync stores exact source rows in `stg_ogd_api_records` and retrieval metadata in `source_retrievals` / `stg_ogd_api_fetch_runs`. It does not write canonical observations or forecasts.
5. Every sync is bounded (maximum 25,000 records), paginated, and SHA-256 fingerprinted. Partial snapshots are labelled PARTIAL; failures are recorded without the upstream error body.
6. A source-specific normaliser must verify geography grain, time period, field semantics, missingness, update cadence, licence and code system before promoting raw rows.
7. API IDs and credentials must be configured only after a live preview succeeds. Automated recurring schedules are deliberately not enabled in this first increment.

## Apply / verify sequence

1. Review and merge the pull request after CI/test review.
2. Apply the new migration in a controlled non-production environment first; do not apply to production as part of this connector change.
3. Add backend secrets (`INGESTION_ADMIN_TOKEN`, `OGD_API_KEY`) and confirmed per-resource IDs in the backend runtime only.
4. Call `GET /api/v1/ingestion/sources`, then `POST /api/v1/ingestion/preview/{source_key}` with `X-Ingestion-Token` for one source at a time.
5. Check exact fields, code mapping, update date, counts, terms and semantics, then run a bounded `POST /api/v1/ingestion/sync/{source_key}`.
6. Validate staged records; build source-specific normalisers and the 36-state completeness matrix; only then create canonical observations.
7. Schedule refreshes only for resources with a verified update cadence and repeatable field contract.
