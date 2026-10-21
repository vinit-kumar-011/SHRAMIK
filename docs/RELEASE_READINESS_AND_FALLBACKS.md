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

**Latest tested application head (21 Oct 2026):** `da3411153523669c2f941ed2227be332c10bb594`  
**CI:** [run #323 — passed](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39625427318)

### Verification completed on the latest tested head

- [x] Clean locked dependency install, TypeScript type-check, automated test suite, live published-KPI read smoke, production Vite build, generated-entry checks and direct route/asset smoke checks passed.
- [x] Chromium interaction/responsive suite passed **32/32 checks** against the local production build. Coverage includes landing/login/request-access navigation, required form validation without submitting either form, login layout without horizontal overflow at 360/390/768/1365px, workspace rendering under an isolated test-only frontend session, Demand and Reports navigation, six module synthetic-preview entry/exit paths (Demand, Supply, Skill Gaps, Forecasts, Emerging Skills and Data Quality), preview reset after in-app navigation, and the local assumptions-only Scenario Simulator.
- [x] Scenario browser checks confirmed visible `SYNTHETIC_DEMO` / assumption-only warnings and illustrative seat/completion/transition outputs while the demand estimate remains “Not available.” No calibrated forecast or jobs claim was presented.
- [x] The browser QA run initiated no non-read HTTP requests and observed no uncaught JavaScript exceptions or browser console errors.
- [x] CI uploaded [browser QA screenshots](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39625427318/artifacts/12355759634) (expires 28 Oct 2026) and the [built frontend artifact](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39625427318/artifacts/12356617443) (expires 4 Nov 2026).
- [x] Public landing remains the default unauthenticated route; Login and Request Access remain outside the workspace shell. Synthetic preview actions are visibly labelled and local-only.

### Still required before release approval

1. [ ] **Real Supabase authentication:** use a designated, provisioned QA account to verify credentialed sign-in, session restoration, expiry/refresh and sign-out against the connected project. Chromium used an isolated test-only session only to test the protected shell; that is not a real login test. The access-request form was not submitted and no accounts or credentials were changed.
2. [ ] **Broader interactive/visual review:** inspect screenshots and compare the signed-in workspace to the SHRAMIK Global Design System. The current browser flow is valuable targeted coverage, not a pixel-perfect review or an interactive test of every control on every workspace route. Continue keyboard/focus checks and exercise report export and other interactions where safe.
3. [ ] **Validated analytical pipeline and API:** populate and validate source-backed demand, supply, compatible gaps, forecast, emerging-skill and early-warning result outputs; complete and contract-test the required application API. Published context indicators are not substitutes for these analytics.
4. [ ] **Administration authorization boundary:** implement server-side token validation, authoritative role checks, pending-request review, account provisioning and audit logging before enabling privileged actions. Browser-side fixture state must never grant access.
5. [ ] **Dependency audit:** investigate the 7 development-tree npm audit findings (2 moderate, 5 high) in the current dependency chain and verify a regression-tested fix. Do not apply a major dependency migration solely to silence the audit.
6. [ ] Re-check the deployment configuration, secret exposure and rollback procedure before any future release.

### Deployment and merge guard

PR #62 remains open and draft; `main` remains `c118d02b46b3742d822b0c1bddd5f26faa26d231`. The latest tested application commit had zero Vercel deployments in both frontend and backend projects. **No deployment or merge is authorized by these checks.** Do not deploy until the user reviews the evidence and explicitly approves.

**Release rule:** a module is “available” only when its real service contract and intended data source work end-to-end. A page rendering, a healthy server, synthetic fixture, isolated browser session or green build does not establish production readiness for analytics, authentication or privileged administration.
