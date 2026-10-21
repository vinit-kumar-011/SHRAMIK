# SHRAMIK Release Readiness and Unavailable-Service Fallbacks

**Scope:** unified React app on `feature/frontend-unified-app`. This is a release-planning document, not a claim that unavailable backend functions are implemented.

## What works today

| Area | Current safe behaviour | Limitation |
|---|---|---|
| Dashboard | Reads the allow-listed, published Supabase KPI and regional views. | Those indicators provide context; registrations and training capacity are not active labour supply. They are not forecasts. |
| Demand, Supply, Skill Gaps, Emerging Skills, Forecasts and Data Quality | The normal live path surfaces source context and explicit unavailable states when output tables/services are missing. | Validated analytical result rows, compatible demand/supply pairs, forecast runs, warning rows and emerging-skill evidence are not yet available as a complete supported output set. |
| Reports | Builds reports locally from published indicators, with CSV and browser-print exports. Unsupported sections are explicitly labelled unavailable. | The report library is not a server-persisted shared library, and server-side PDF/report jobs are not implemented. |
| Scenario Simulator | The default local planning adapter performs transparent intervention arithmetic (planned seats, assumed completions and potential transitions). It labels results as synthetic assumptions. | It is not a calibrated forecast: it must not generate demand, supply, gaps, regional/sector impacts or job outcomes without a validated baseline and model service. |
| Administration | Access-request intake is designed for pending-only inserts. The normal admin page stays read-only/unavailable without a configured service. | Listing requests, granting/denying access, provisioning accounts, changing roles and recording admin audit events require a trusted server-side authorization boundary. |
| Data Sources | Reads the source register and published source metadata. | Create, retrieval and ingestion operations remain disabled unless their server endpoints and permissions have been implemented and tested. |
| FastAPI | `GET /api/health`, request IDs, standard error envelopes and service scaffolding. | It is not yet the complete `/api/v1` application API expected by the optional REST adapters. |

## Configuration rules

- Keep `VITE_SHRAMIK_DATA_MODE` unset (or non-`rest`) until the target server contract is implemented and contract-tested. A URL alone does not prove a service exists.
- Keep `VITE_SHRAMIK_USE_DEMO_DATA` unset/false for normal source-backed use. Set it to `true` only for a clearly-labelled illustrative demo or UI preview.
- Do not set `VITE_ADMINISTRATION_API_BASE_URL` until an authenticated admin service is live and has server-side role checks and auditable decisions. A frontend flag cannot secure an admin action.
- Keep the Supabase service-role/secret key and any account-provisioning credentials exclusively in server-side environment variables. Never expose them as `VITE_*` variables.
- Keep Data Sources create/ingestion feature flags off until the write path, validation, retry/idempotency rules and audit trail are verified.

## Work required to make each blocked capability real

### 1. Publish validated labour-market outputs

1. Ingest source snapshots with retrieval date, publisher, licence/access conditions, source URL and checksum where available.
2. Normalize and validate geography, occupation/skill taxonomy, sector, unit, time period and population before promotion from staging.
3. Preserve row-level provenance (source-backed versus synthetic/demo) and data eligibility/reason codes.
4. Publish versioned backend outputs for demand, supply, gaps, forecasts, emerging-skill signals and early warnings. A gap is eligible only when demand and supply are comparable for the same skill/occupation, geography, period and unit.
5. Run estimator/forecast validation and report data-history coverage, uncertainty and limitations before publishing any official output.
6. Add contract tests for empty data, insufficient history, ineligible comparisons, partial coverage and source outages. Empty/unknown output must remain unavailable, not become zero.

### 2. Complete the REST application API

Implement the documented `/api/v1` read contracts against the canonical database/output tables, starting with dashboard/regions/reference catalogues, then analytical reads. Return the documented envelope, pagination, provenance, request ID and structured errors. Use integration tests against a disposable database and validate RLS/grants before selecting REST mode. A health check alone is not API readiness.

### 3. Make Administration secure

- Verify the Supabase access token server-side and resolve permissions from an authoritative role/permission store; never trust a role passed by the browser.
- Add a protected endpoint to list pending requests and approve/deny them with input validation, optimistic status checks and idempotent handling.
- Provision an approved user through the Supabase Admin API from the server only; never expose the service-role key to the browser.
- Write reviewer identity, timestamp, previous/new status and action outcome to an append-only audit log.
- Add tests for unauthenticated callers, authenticated non-admin callers, duplicate decisions, provisioning failure, audit-write failure and successful reviewer flow. Keep UI mutations disabled until these tests pass in a deployed QA environment.

### 4. Make Scenario Simulator an official analytical service

- Register versioned, validated baseline forecast runs and define compatibility across geography, sector, skill/occupation, period and analysis mode.
- Implement protected options/entity/baseline endpoints and simulation creation/status/results/sensitivity endpoints.
- Persist request assumptions, model/version, run status, provenance, quality status, outputs, warnings and limitations; support cancellation, retries and duplicate submission safely.
- Reject incompatible/missing baselines. Keep the local planning calculator clearly labelled and retain nulls for unavailable demand/supply/gap outputs.

### 5. Improve Reports and Data Sources

Reports can remain useful before the analytical API is complete: report the real published indicators now, export supported sections, and retain explicit section-level gaps. To provide a shared report library or server PDF, implement authenticated persistence/job endpoints and verify export authorisation. For Data Sources, add server-mediated ingestion with validated source registration, staging/quarantine, provenance, licensing notes, run logs and controlled promotion; do not give browser roles general table writes.

## Pre-deployment verification gates

1. The latest branch CI passes clean install, typecheck, full test suite, build, static entry checks and preview smoke tests.
2. Browser tests cover all workspace routes at narrow-phone, phone, tablet and desktop widths; keyboard/focus flows and authentication interactions are retested.
3. A real provisioned QA account confirms sign-in, session restore, session expiry and sign-out against the actual Supabase project. Browser mocks are not evidence of live authentication.
4. Live service tests confirm which endpoints are deployed, the correct environment variables are set, and RLS/permissions behave as expected. Verify both successful and denied/empty requests.
5. Compare the signed-in visual UI against the SHRAMIK design system and confirm the public landing page remains the default unauthenticated route.
6. Re-check production/deployment config, secret exposure, dependency audit and rollback plan. Keep `main` untouched, keep the PR unmerged, and do not deploy until the user explicitly approves after reviewing these results.

**Release rule:** a module is “available” only when its real contract and intended data source work end-to-end. A UI that renders, a healthy server, a mock adapter, or a green build is not proof that the corresponding analytics, admin workflow or backend is operational.
