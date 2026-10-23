# SHRAMIK OGD API ingestion

This component calls only registered OGD resource IDs on the fixed `api.data.gov.in` host. It accepts no arbitrary URL. `OGD_API_KEY` and each resource ID remain server-side environment variables. `X-Ingestion-Token` protects preview, sync, and run-history operations.

## Endpoint flow

- `GET /api/v1/ingestion/sources`: safe source metadata plus readiness flags.
- `POST /api/v1/ingestion/preview/{source_key}`: bounded live fetch; returns field names and at most 10 sample records; never persists.
- `POST /api/v1/ingestion/sync/{source_key}`: fetches at most 25,000 records per run and appends exact source records to raw staging, with a SHA-256 digest and retrieval provenance.
- `GET /api/v1/ingestion/runs`: recent fetch metadata; does not return raw payloads.

The sync route does **not** write `demand_observations`, `supply_observations`, forecasts, or geography mappings. A source-specific normaliser and QA approval are required before any promotion.

## Configuration

Set `INGESTION_ADMIN_TOKEN`, `OGD_API_KEY`, and the per-resource IDs listed in `.env.example` in the backend runtime. Generate the OGD key through an authenticated data.gov.in account. Do not put real keys in `.env.example`, source control, URLs in logs, or frontend build-time variables.

Resource IDs are environment configured because the OGD resource contract and identifiers are resource-specific and must be checked on the current portal. An API key or resource identifier alone is not proof of permission, completeness, or metric suitability.

## Source semantics

- e-Shram counts registrations, not active jobseekers or available labour supply.
- UDYAM counts registered enterprises, not vacancies or job creation.
- MGNREGA describes a public employment programme, not total labour demand.
- The available JSS resource is a dated April 2022 snapshot; metadata refreshes do not update its observations.

Do not run a daily schedule against the JSS snapshot. Start with a manual preview for each configured source, confirm columns/grain/reference dates, then sync bounded snapshots. Do not schedule jobs until response shape, licence, update cadence, and failure behavior have been verified.
