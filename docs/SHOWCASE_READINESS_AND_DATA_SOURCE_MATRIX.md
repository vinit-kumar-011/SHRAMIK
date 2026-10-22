# SHRAMIK SIH Showcase: Visual Lock, Data Source Matrix, and Refresh Plan

**Reviewed:** 22 October 2026  
**Working branch:** `fix/backend-api-route-integration`  
**Status:** Official-only UI hardening is implemented and CI-verified; page-by-page human visual sign-off is still required.  
**Release constraint:** Do not deploy to Vercel until the user approves the visual review and all source/refresh gates pass.

## 1. Decision on the proposed plan

The four stages are sound, with one adjustment: the visual lock and source audit must overlap. Each page's visual structure can be finalised independently of data values, but every visible metric/filter/chart must be checked against a source contract before its final content is approved.

1. **Lock the visuals:** implement the supplied reference composition, global shell, spacing, interactions, responsiveness, and empty/loading/error states. A reference image is a layout target, never a source of facts.
2. **Verify the data contract:** for every displayed field, record the source, unit, definition, period, geography, granularity, source timestamp, provenance, coverage, and known limitation. Do not force aggregate figures into finer-grained rows.
3. **Wire backend and analytics:** pages read persisted source-backed observations through approved adapters/endpoints. Deterministic joins, arithmetic, validation and model pipelines belong in backend/database services. AI is only added where it offers a defensible function.
4. **Automate refresh:** poll source registries, retrieve new releases/snapshots, hash raw files, stage, validate, upsert and log each successful or failed run. Scheduled jobs must not turn an inaccessible or changed source into zeros or invented data.

**AI is not required on every page.** Reference-data pages need APIs; cards need queries; counts need SQL; gaps need compatible quantities; forecasts need validated histories and model evaluation. AI can assist with occupation/skill crosswalk suggestions and evidence-grounded explanations, but it cannot create missing observations, approve low-confidence mappings autonomously, or replace the forecasting pipeline.

## 2. Showcase safety gate already implemented

**Latest verified frontend candidate (22 October 2026):** [Frontend CI run 39793726874](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39793726874), tested source revision `a2456069266dfcbc730ec64d708a0dcf5dd0d099`, passed TypeScript type-check, **212 frontend tests (0 failed)**, live Supabase published-KPI verification, production build, static entry-point checks, route smoke tests, and **Chromium interaction/responsive QA (32/32 checks passed)**. The public registry query no longer requests the internal `data_sources.notes` column, and both public proxy copies reject attempts to expose it. All six official insight pages verify **22 registered sources**; Demand uses its dedicated hero metadata row, while other insight pages use the shared source-count card. The Data Sources page returns eight visible rows from the 22-row registry and leaves lifecycle/freshness unknown until actual retrieval health is surfaced. The national Dashboard overview now shows four deliberately selected source-backed cards—e-Shram registrations, provisional CTS seat capacity, ITI count, and monthly CWS unemployment (preferring September 2026 when available; annual UR is a fallback only). It does not duplicate annual and monthly PLFS rates, and absent time-series history is communicated accessibly without drawing a fake sparkline. Production UI exposes no synthetic preview controls, and the Scenario Simulator remains disabled until a compatible, approved `SOURCE_BACKED` baseline exists. No non-read-only requests or uncaught browser exceptions were observed. This is CI/preview verification only—not a deployed release.


**Earlier verified production candidate (before the NCS evidence and latest label fixes):** [Frontend CI run 39766185602](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39766185602), commit `a7f97d08ed706c230a389b83ceb78173e3398705`, passed **198 frontend tests (0 failures)**, type-check, live Supabase published-KPI reads (7 cards), production build, route smoke tests, and Chromium interaction/responsive QA. Chromium explicitly verified the production landing preview has zero illustrative demand/supply/forecast path elements, hides the mock-preview tabs, and displays “OFFICIAL SHOWCASE · SOURCE-BACKED ONLY.” It also confirmed the Demand page renders the source-backed September 2026 all-India PLFS CWS rates (UR 5.0%, LFPR 55.5%, WPR 52.7%) with the period “September 2026 · monthly CWS · persons aged 15+” while retaining “Job-demand series is not published.” The official-only module checks passed; QA issued no non-read-only requests and saw no uncaught browser exceptions. This was a CI build/preview only; no Vercel deployment occurred.

The production UI now enters official-only showcase mode by default:

- Production builds ignore `VITE_SHRAMIK_USE_DEMO_DATA=true` and disable the mock dashboard path.
- Synthetic preview entry points and illustrative occupation examples are hidden in production.
- The Forecasts/Emerging Skills analysis selector only offers Official mode in production.
- The Scenario Simulator disables execution unless the selected baseline is compatible, `SOURCE_BACKED`, and `APPROVED`; its local assumptions-only baseline cannot run.
- Live/API failure remains an error or unavailable state; it must not silently fall back to demo fixtures.

**Verification:** GitHub Actions run [39750824206](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39750824206) completed successfully on commit `bba9176517a4cb513e3c4a30f7ef62c4200ee382`: type-check, frontend tests (194 passed, 0 failed), live Supabase KPI checks, production build, static-entry and route smoke tests, and Chromium interaction/responsive QA. This was CI verification only; it was **not** a Vercel deployment.

**Live Supabase synthetic cleanup (22 October 2026):** the pilot's 45 synthetic demand rows, 45 synthetic supply rows, 9 demo forecasts, 8 demo warnings and 9 demo emerging-skill signals have been removed. Verification returned zero synthetic demand/supply/source-metric rows and zero active demo analytical outputs. One append-only `synthetic_generation_runs` audit record remains for the removed pilot; it is provenance metadata, not a synthetic observation or result. Do not delete that protected audit entry. The demo generator now blocks remote database writes unless a CLI override and an environment opt-in are both provided. Do not enable either override for the shared Supabase project or SIH environment.

## 2A. Latest visual and deployed-API audit (22 October 2026)

The latest browser-QA screenshot artifact from [frontend CI run 39767812605](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39767812605) was manually inspected after the CI passed. This exposed two defects the prior automated check had missed:

1. The Demand hero still showed **“Open illustrative demo”** even though the other synthetic preview button was hidden. The JSX is now guarded by `!showcaseMode`, and the Chromium QA script now detects both labels so the same omission cannot regress.
2. The production preview’s Forecasts/Emerging Skills pages previously attempted `/api/v1/...` when the production API base URL was empty. The component now short-circuits that state with an explicit `VITE_SHRAMIK_API_BASE_URL` configuration notice and never falls back to synthetic rows. The latest successful browser QA also confirms no synthetic preview controls are exposed.

### Confirmed Vercel API blocker (read-only inspection; no deployment made)

- Frontend project: `shramik-unified-app` (`prj_VJ5aKbRNuLDLQryt8ySoGgNYbXmh`). Its configured Production/Preview environment variables currently list `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, but **not** `VITE_SHRAMIK_API_BASE_URL`.
- Backend project: `shramik-backend-api` (`prj_m5fK22ZULMDScsyzSzBh92Y8ElMp`), stable domain `https://shramik-backend-api.vercel.app`. `/api/health` returns HTTP 200, but `/openapi.json` lists only `/api/health`; `/api/v1/analytics/status` returns HTTP 404.
- The latest inspected backend deployment is on branch `feature/frontend-unified-app`, commit `9ee28fb0ecbb6e0a02a6cef2dc9ee71e24acf7b6`. That deployed revision does not expose the new reference/analytics routes that exist on `fix/backend-api-route-integration`.

**This is a hard deployment gate.** The frontend cannot show authenticated forecasts/early-warning/emerging-skill results in a hosted production build until the intended backend revision is deployed to the backend project and its OpenAPI schema confirms the required routes; then the frontend project must receive `VITE_SHRAMIK_API_BASE_URL=https://shramik-backend-api.vercel.app` (or the approved backend domain) and be rebuilt. The backend must also allow the frontend origin in CORS. Do not set the base URL to the current deployment yet: its analytics routes return 404.

No deployment, merge, environment change or database write was performed during this audit. The purpose of this section is to record the exact pre-deployment blockers so they cannot be mistaken for a successful analytics integration.

## 3. Current source-backed database facts

These counts were checked in the connected SHRAMIK Supabase project on 22 October 2026. They are database inventory facts, not labour-market findings.

| Item | Current evidence | What it supports / does not support |
|---|---|---|
| State/UT reference rows | 36 | Geography selectors and state-level joins. |
| District reference rows | 784 | District selectors and IDs; not proof of district-level observations for every metric. |
| Sector catalogue | 21 | Reference navigation/crosswalk work. |
| Canonical skills | 7, all currently inactive | Catalogue preview only. Sector mapping is provisional; do not activate just to populate cards. |
| Source-backed demand observations | 34, `STATE × YEAR(2022)`, vacancies notified to employment exchanges | Historical state/UT vacancy-flow context at the published precision; not district-, occupation- or skill-level demand. |
| NCS active-vacancy portal snapshot | 1 national source metric: **over 17.68 lakh** NCS portal active vacancies, as of **15 July 2026**, published in a Ministry/PIB release on 5 August 2026 | Explicit lower-bound portal snapshot only—not all Indian vacancies; not a compatible time series. Registered as `NCS_PORTAL_ACTIVE_VACANCIES`, `NATIONAL`, `SOURCE_BACKED`, `AS_OF_2026-07-15`. A retrieval record now hashes the checked-in one-row transcription CSV; the original PIB bytes are not archived and the row is still a manual transcription, not an automated feed. |
| Source-backed NAPS apprentices engaged | 36 state rows for each of FY2023-24, FY2024-25 and FY2025-26 | Apprenticeship programme engagement context, not total available labour supply. |
| Source-backed PMKVY trained/oriented | 24, 27 and 23 state rows across FY2023-24, FY2024-25 and FY2025-26 | Training programme context with incomplete state coverage; display coverage with every aggregate. |
| CTS ITI count | 36 state rows, snapshot dated 31 October 2024 | Institute inventory at the source snapshot date. |
| Provisional CTS seat capacity | 1,521 source metric rows, reference `ACADEMIC_SESSION_2026`, snapshot dated 8 July 2026 | Training capacity context. Inspect its `dimension_values` and canonical mapping before treating a row as trade-level. |
| e-Shram registrations | 36 state/UT rows plus one national row, snapshot dated 14 July 2026 | Cumulative registrations, not employment, vacancies or available workforce. It is already a potentially stale snapshot and must show that date. |
| NCS active-vacancies snapshot | One national row: **“Over 17.68 lakh”** active vacancies on the NCS portal as of 15 July 2026 (PIB release published 5 August 2026) | Useful only as a national NCS-platform snapshot. It is not all Indian vacancies and not district/skill demand; the row has no immutable retrieval hash/retrieval ID yet, so its provenance archive must be completed before calling it ingestion-automated. |
| PLFS CY2025 | UR/LFPR/WPR measures exist, but the current catalogue contains only 9 state rows per several measures and multiple national breakdowns | Use matching published age/sex/area definitions only; do not imply complete state/UT coverage. |
| Active official forecasts | 0 | Correct result until compatible official history and model-quality gates pass. |
| Skills with active validated mappings | 0 of 7 | No skill should be presented as fully approved solely to fill an interface. |

Additional source-backed training-centre counts are stored for NAPS, PMKVY and JSS; their reference dates differ. The UI must not combine these counts without preserving each metric's unit, as-of date and coverage.

### Hard grain rule

There is currently no validated source-backed multi-year `DISTRICT × SKILL` demand and supply history in the canonical observation tables. The 2022 DGE figures are state-level annual flows; NAPS/PMKVY/CTS values are training-programme/capacity signals at their published grains. They must not be distributed across districts or skills.

Consequently, the official Forecasts/Emerging Skills tables correctly return no validated results today. The answer is to source compatible observations—not to promote the nine synthetic pilot forecasts.

## 4. Page-by-page visual and data contract lock

The active React app is the unified package at:

`frontend/SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/`

Use `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md` and `DESIGN_LOCK.md` for the shared Civic Intelligence theme and shell. Page-specific reference boards are design authorities for layout only; their embedded numbers, chart labels and map shading are not evidence.

| Page | Visual reference to lock | Source-backed content allowed now | Must remain unavailable until verified |
|---|---|---|---|
| Public landing | Shared dashboard identity, existing landing-page design and `SHRAMIK_Dashboard_Reference.png` | Published KPI/read-view rows with source, period, unit and update metadata | Total demand/supply, shortage or forecast estimates not supported by compatible records |
| Dashboard | `SHRAMIK_Dashboard_Reference.png`; `reference/dashboard-concept.png` | Four live KPI cards: cumulative e-Shram registrations; provisional CTS seat capacity; ITI count; and monthly PLFS CWS unemployment (September 2026, age 15+), with annual CY2025 UR only as a fallback when monthly CWS UR is absent. Training programme trends and regional registrations remain separate source-backed context. | Do not show duplicate annual/monthly PLFS rates together in the national KPI row. Do not fill KPI slots with hard-coded or mock demand/supply/gap values. Snapshot metrics have no trend series until a verified compatible historical series is published; do not invent sparklines. Demand/Forecasts 15+ annual benchmarks (LFPR 59.3%, WPR 57.4%, UR 3.1%) remain separate from all-ages annual usual-status rates and monthly CWS rates. |
| Demand Insights | `docs/skill-gap-analysis/reference/SHRAMIK_Demand_Insights_Reference.png` | PLFS monthly CWS (latest complete verified release) separately from annual CY2025 benchmarks; e-Shram registrations with 14 Jul 2026 snapshot date; state/UT DGE vacancies-notified flow for CY2022; NCS portal active-vacancy snapshot displayed only as “Over 17.68 lakh” with its 15 Jul 2026 date and portal-only lower-bound caveat; NAPS context trend | Current total labour demand estimate and top occupations by demand; neither is supported by the current canonical records |
| Supply Insights | `docs/skill-gap-analysis/reference/SHRAMIK_Supply_Insights_Reference.png` | CTS/ITI inventory, seat-capacity snapshot, NAPS apprentice engagement, PMKVY trained/oriented counts and training-centre counts—each with separate unit, date and geography coverage | Do not label training seats, registered workers, trainees or apprentices as total available workforce. No unvalidated national workforce-supply estimate |
| Skill Gap Analysis | `docs/skill-gap-analysis/reference/SHRAMIK_Skill_Gap_Analysis_Reference.png` | Taxonomy and supply context; explicit comparability/data-coverage states | Numerical shortages, skill-gap heatmaps/rankings or shortage maps unless demand and supply share compatible grain, period, unit and definition |
| Forecasts & Early Warnings | `docs/forecasts/reference/Forecasts_Five_View_Design_Board.png` and the five `reference/views/` images | Status, history coverage, source evidence and model readiness; official outputs list currently empty | No synthetic forecast line, warning, emerging signal, model-accuracy score, confidence or uncertainty interval |
| Emerging Skills | `frontend/SHRAMIK_Emerging_Skills_Source_and_Handoff/SHRAMIK_Emerging_Skills_Source_Package/reference/SHRAMIK_Emerging_Skills_Design_Board.png` and its five view references | Canonical skill catalogue only with mapping status and source-backed evidence that exists | Momentum, growth, occupation links and regional signals until a measured source-backed time series and versioned classification rule support them |
| Scenario Simulator | `frontend/SHRAMIK_Scenario_Simulator_Deliverable/SHRAMIK_Scenario_Simulator_Deliverable/source/docs/handoff/reference/scenario-simulator-design-board.png` | Filters and baseline status; real, approved input data when a compatible baseline exists | Scenario outputs from the local assumptions-only adapter. Production execution is currently blocked unless an approved source-backed baseline is returned |
| Reports | `SHRAMIK_Reports_Developer_Handoff/reference/SHRAMIK_Reports_Design_Board.png` and its three views | Reports built from persisted official records, frozen data snapshots, definitions, source lineage and limitations | Any generated claim/graph not backed by data available in the selected scope. Print/PDF/CSV must preserve provenance labels |
| Data Sources | `frontend/SHRAMIK_Data_Sources_Source_and_Build/docs/reference/SHRAMIK_Data_Sources_Reference.png` | Source register, retrieval status, last successful snapshot, source release, hash, licence/terms note and supported grain | “Live/healthy/current” labels unless a successful recent retrieval proves them; source registration alone is not evidence a feed works |
| Data Quality | Current page layout under the shared shell, using the global design system | Actual validation results, failed checks, coverage gaps and stale-source warnings | Fake issues, sample validation runs or a green status merely because no failures were returned |
| Administration / access | Shared shell and existing live access-request messaging; do not clone a new sidebar from other mockups | Real authenticated profile/access state; a clear notice that server review is not configured | Fictional access requests, simulated approvals, account provisioning or role changes. A server-authorized audit/provisioning API is still required |
| Login / access request | Existing login preview package at `frontend/SHRAMIK_Dashboard_Skill_Gap_Frontend_Updated/SHRAMIK_FRONTEND/SHRAMIK_Login_v3_Package/` | Real Supabase authentication result, session, validation and pending-request state | Any fake successful login, implied privilege grant or claim that a pending request means approval |

### Latest visual/production-safety QA (22 October 2026)

The production-safe preview was captured and reviewed from the successful CI artifact [run 39774888278](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39774888278). It covers the landing/login shell, Demand, Supply, Skill Gaps, Forecasts, Emerging Skills, Scenario Simulator, Reports and Data Quality, including mobile login layouts.

- **Demand:** the page shows the complete September 2026 monthly CWS rates (UR 5.0%, LFPR 55.5%, WPR 52.7%) separately labelled “monthly CWS, age 15+”; e-Shram and NAPS are visibly described as context. Demand trend and occupation rankings remain unpublished.
- **Supply:** CTS seat capacity, ITI counts, apprentices engaged and programme/training-centre counts are shown with their individual reference periods and explicit “not workforce supply” language.
- **Data Quality:** 2,091 source-backed metric rows, source coverage, the seven low-confidence skill mappings and restricted analytical tables are exposed as real database checks.
- **Forecasts / Emerging Skills:** production mode correctly hides synthetic choices, but the CI screenshot reports **“No approved FastAPI origin is configured for this production build.”** The backend was verified locally, but this build has no approved hosted API origin. Until a backend is hosted and its origin/CORS are configured, those authenticated result panels cannot fetch official results; they show an explicit failure rather than synthetic data.
- **Scenario Simulator:** it correctly disables execution because no compatible, approved `SOURCE_BACKED` server baseline exists. It does not show local assumption-only outcomes.
- **Reference fidelity:** the browser suite validates layout mounting, route transitions, interactions and responsive sizes. The human visual review of every page against its original reference image is **not complete**; the screenshot review so far is a rendered-page QA, not a pixel/element-by-element reference sign-off.

**Latest frontend CI:** [run 39774888278](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39774888278), commit `279016dd6493e4c61f2ac5068de019c4b477a0bd`, passed type-check, frontend tests, live Supabase KPI read checks, production build, static-entry and route smoke checks, and Chromium interaction/responsive QA. The screenshot artifact is `shramik-browser-qa-screenshots`. This was a CI build/preview, not a deployment.

### Visual sign-off checklist

For each page, compare the implemented page against its reference before moving to the next one:

- Shared shell: compact logo, same topbar/sidebar geometry, active navigation item, fixed dotted canvas and consistent page gutter.
- Page composition: correct hero size, panel order, density, field group placement and internal-view/tab behaviour.
- Interactions: every selector/button has a defined result; no decorative control looks operational.
- Responsive review: 1440px, 1024px, 768px and 390px; no horizontal overflow or clipped controls.
- States: loading, empty, unavailable, permission-restricted, stale snapshot and source failure.
- Data truth: every number has an identifiable source, definition, unit, geography and reference period.

Do not re-theme the unified app by copying an entire old standalone page implementation. Reuse its reference board, but implement the design inside the canonical shell.

## 5. Priority source work

### A. Demand-side current feed — National Career Service (candidate, not yet approved for automated ingestion)

The official [NCS latest-updates page](https://www.ncs.gov.in/latest-update) renders a “Classified Jobs” table with organisation, position, posting date, vacancy count, type and advertisement link. On the page checked for this review, it reported 145 listed rows with 10 entries per page and a page-level “Last updated: 28-09-26” footer. The [NCS job search](https://www.ncs.gov.in/jobs-in-operations-and-support) provides user-facing search and classification filters.

This makes NCS a strong **candidate** for vacancy-posting context, but it is not an approved automated source yet: the page-level freshness footer is older than the review date, and this inspection did **not** establish a permitted stable public bulk API/export, guaranteed pagination completeness, persistent posting IDs, expiry/closure semantics, or NCO-compatible codes. Before an automated adapter is enabled, confirm the authorised retrieval method and terms, then test deduplication, pagination completeness, stable IDs, and withdrawal/expiry handling. Until then, treat the page as an auditable source lead—not an automated feed. If integrated later, label coverage **vacancies listed on NCS**, not all vacancies in India.

**Permission and freshness gate (verified 22 October 2026):** the [official NCS terms and conditions](https://ncs.gov.in/terms%26condition) state that website contents can change without notice. Related [NCS partner-onboarding terms](https://www.ncs.gov.in/NCSPolicyDocuments/NCS%20Onboarding%20Policy_07Jan2016.pdf) restrict onward sharing of partner-supplied portal information without required consent. Do not launch an automated bulk scraper or promote NCS listings into official demand observations until DGE confirms an approved structured retrieval route, use/display terms, stable posting identifiers, pagination completeness and withdrawal/expiry semantics. Linking users to the public NCS page for vacancy discovery is appropriate in the meantime.

Keep the existing DGE 2022 vacancy-notified dataset as an official historical aggregate signal. It does not provide enough years to produce a multi-year forecast by itself.

### B. PLFS labour-market context

**Latest official release check (22 October 2026):** MoSPI's PLFS product page reports September 2026 all-India Current Weekly Status (CWS) rates for persons aged 15 years and above: LFPR **55.5%**, WPR **52.7%**, and UR **5.0%**. The monthly PLFS September bulletin was announced on 15 October 2026. These are monthly CWS rates, **not** the annual CY2025 usual-status values currently stored/displayed by the annual metric cards; keep their definitions and periods separate. Sources: [MoSPI PLFS product page](https://www.mospi.gov.in/themes/product/69--) and [MoSPI September 2026 bulletin announcement](https://www.mospi.gov.in/download-reports?main_cat=NzI2%26cat%3DAll).

**Automation implementation:** `backend/scripts/render_plfs_page.mjs` uses headless Chromium to capture the official page's rendered DOM (the raw HTTP response is a JavaScript shell); `backend/app/ingestion/refresh_plfs_cws.py` validates the three cards for a shared month/year, numeric range, all-India coverage, age 15+ and CWS basis, then supports an idempotent source-backed upsert to `source_metric_observations`. Parser/layout drift, mixed periods or missing labels fail closed. The scheduled job only persists rows when the GitHub Actions secret `SHRAMIK_DATABASE_URL` is configured; without it, the workflow deliberately falls back to a check-only run. The repository workflow file cannot prove that a secret is configured, and an unattended database write has not yet been demonstrated by a scheduled run.

**Verified in CI on 22 October 2026:** [refresh workflow run](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39763138684) passed backend tests (63 passed, 1 deprecation warning), Chromium capture, and parse/validation of the official page: September 2026, LFPR 55.5%, WPR 52.7%, UR 5.0%; 3 rows validated. That push-triggered run was deliberately check-only and reports `writes_performed=false`.

**Initial source-backed load completed:** the validated three-rate release is in Supabase as `SOURCE_BACKED`, non-synthetic `NATIONAL × MONTHLY_2026-09` observations. I re-downloaded the successful CI artifact and verified the actual `plfs-page-rendered.html` SHA-256 is `c561b75660f1f69a1d2d042eb101d95309a2388f49c97b458cd8a4ec53ea217d` (the dry-run report shows the same digest). The three observations now point to retrieval `2d2f758c-3c6b-4314-adcd-a61a0d0baccc`, which records that exact checksum. A separate later retrieval row had a mismatched digest (`5834b232fc83ff2f49c8f3210b1da361b155cc2f539af067a21ecf2931d047ec`) for the same artifact identifier; observations no longer reference it. The retrieval table is append-only, so that historical row is retained and must not be treated as the source snapshot linked to these metrics. The source-metric table has **2,091** source-backed rows, including the three monthly CWS records.

**Public KPI view updated:** migration `supabase/migrations/20261022120000_add_monthly_plfs_cws_public_kpis.sql` exposes the latest *complete* monthly CWS release as three separate cards: LFPR 55.5%, WPR 52.7%, and UR 5.0% for September 2026. It requires all three metrics at the same national month and the exact `combined / person / 15_years_and_above / current_weekly_status` definitions, filters out synthetic records, and preserves the annual CY2025 unemployment benchmark as a separate item. The frontend live-data smoke now requires those three codes and checks the periods/source labels are correctly separated. A successful run on commit `0effe01f30b8495620fd0328b4a75491df9169e5` verified all **7** public KPI rows and the separate annual benchmark: [frontend verification](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39764373549).

The Demand page's `Latest per source` cards prefer this monthly series for India and display “September 2026 · monthly CWS · persons aged 15+”; choosing `Calendar year 2025` continues to show the annual 2025 records. National monthly values are never applied to a selected State/UT. A regression test now locks these period/granularity rules. These rates remain context—not vacancy demand or workforce supply—and official forecasts remain **0**.

**Production landing-page preview:** the existing UI frame is retained for visual continuity, but production no longer draws its illustrative demand/supply/forecast paths or offers the Overview / Skill gaps / Forecasts preview tabs. It displays “Not published” / “Not calculated” and an explicit no-validated-series message instead. Development mode retains the clearly labelled mock previews for QA only.

**Scheduled refresh behavior / activation gate:** `.github/workflows/plfs-source-refresh.yml` captures the rendered MoSPI page and validates new releases. Push-triggered runs are check-only; weekly scheduled runs are apply-eligible. If the GitHub Actions secret `SHRAMIK_DATABASE_URL` is absent, the scheduled job emits a warning and falls back to check-only mode; it does not write to Supabase. The initial September 2026 release and KPI-view migration are already in Supabase. A completed check-only workflow proves retrieval/parsing only—not the scheduled database-write path.

**Important branch constraint:** GitHub Actions scheduled workflows are run from the repository's default branch. Because the current working branch is `fix/backend-api-route-integration`, this schedule will not become a live unattended refresh until the workflow is merged into the default branch. Until the visual/data review is approved and that merge is explicitly done, this branch provides tested adapter/CI behavior, not an active production scheduler. Workflow-dispatch remains an explicit manual run; it is check-only by default.

**Latest source-refresh verification (22 October 2026, 13:49 UTC):** [PLFS refresh run 39790210861](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39790210861) succeeded on commit `974916e52d428ead38527f6914be49b013834587`. The rendered-page capture and parser validated the official September 2026 release as LFPR **55.5%**, WPR **52.7%**, and UR **5.0%**; `rows_validated=3`. The run was deliberately `DRY_RUN` with `writes_performed=false`; the runner's `DATABASE_URL` was empty, so it did not write to Supabase. The companion backend test run [39790210834](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39790210834) passed **70 tests** (1 dependency deprecation warning).

The already-persisted September rows remain source-backed/non-synthetic and link to retrieval `2d2f758c-3c6b-4314-adcd-a61a0d0baccc`, whose stored hash `c561b75660f1f69a1d2d042eb101d95309a2388f49c97b458cd8a4ec53ea217d` covers the previously archived official page capture. The latest check-only capture returned a different DOM hash, `61d9faefad6594ce5244e391a37e21417f5433b43c94a5fcb5c344c702cfeb0b`, and was not persisted; dynamic page metadata may change between captures. Future apply runs will record the new snapshot and update the monthly observation rows idempotently. Do not treat a check-only success as proof the DB write path has run.

**One-time configuration still required for future automated database persistence:** add the secret `SHRAMIK_DATABASE_URL` under GitHub repository Settings → Secrets and variables → Actions. Use the server-side PostgreSQL connection URI from Supabase Database settings, with SSL enabled. Never use the browser publishable key, never prefix it with `VITE_`, and do not commit or send the secret in chat. After the workflow is merged into `main` and this secret exists, the weekly scheduled workflow can persist new validated releases automatically. The workflow-dispatch path stays check-only unless `apply=true`.

- [Official PLFS 2025 annual report](https://mospi.gov.in/uploads/publications_reports/publications_reports1780040415321_0624fb13-fb47-40bc-b470-7c7e9635c3ef_PLFS_2025_F_REV_29052026.pdf)
- [MoSPI eSankhyiki PLFS catalogue](https://esankhyiki.mospi.gov.in/catalogue-main/catalogue?page=0&product=PLFS)

The catalogue includes monthly all-India CWS UR/LFPR/WPR releases; the annual 2025 report has its own annual reference period and status definitions. Keep CWS monthly and annual usual-status metrics separate. Automate discovery of new release/table IDs, but ingest only after metric definition and coverage checks. Do not replace the existing CY2025 values with a newer month while retaining an annual label.

### C. Training/supply references

- [Directorate General of Training (DGT)](https://dgt.gov.in/en)
- [Skill India Digital](https://www.skillindiadigital.gov.in/home)
- Odisha SAMS/ITI, Central Placement Cell and district Employment Exchange references documented in `data/SOURCE_REGISTER.md`.

The DGT homepage currently exposes national ITI/trainee/apprentice counters; a live website value is not automatically a historical data series. Capture the retrieval time and reported reference period and preserve the source's exact definitions. For Odisha, the SAMS trade-vacancy snapshot supports current district × ITI × trade capacity/admission/vacancy context, not a multi-year district skill-demand series. Institute-year placement data cannot be inferred to be trade-level when trade is absent.

### D. Stable reference data

- States/districts and LGD codes: reconcile against the official [Local Government Directory](https://lgdirectory.gov.in/) when its published reference changes.
- Occupations: retain NCO version/code as a taxonomy anchor. Preserve source codes and record explicit crosswalk methods/confidence to NSQF/training trades.
- ITIs/trades/sectors/skills: update on authoritative release/version changes; never create a mapping only to make a dropdown non-empty.

## 6. AI and computation boundary

| Function | Correct owner | Publication rule |
|---|---|---|
| Source retrieval, hashes, parsing, dedupe, type/unit validation | Deterministic source adapters and ingestion workers | Log every retrieval; reject schema drift or implausible changes for review |
| Canonical geography/code joins | Versioned crosswalks and validators | Orphans and many-to-one ambiguity are reported, not silently coerced |
| Skill/occupation crosswalk assistance | Optional AI suggestion plus rules and review workflow | Store candidate, method, confidence and evidence; never auto-activate low-confidence mapping |
| KPIs, counts, rankings and gaps | SQL/backend analytics | Document formula, unit, denominator, grain and coverage. Gap is only computed for comparable inputs |
| Forecasts and uncertainty | Versioned analytics/model pipeline | Minimum history is necessary but not sufficient; require model comparison/backtesting, output contract validation and provenance |
| Emerging-skill signal | Versioned rule/model over timestamped occupation/skill observations | Requires real repeated observations and measured growth; taxonomy existence alone is not an emerging signal |
| Explanation or executive narrative | Optional evidence-grounded AI over retrieved rows/output metadata | Cite the underlying records, say what is unavailable, never fabricate source references or policy facts |
| Scenario simulation | Server-authoritative model over a compatible approved baseline | User inputs are explicit scenario assumptions; do not present local arithmetic as a labour-market forecast |

## 7. Automated refresh design

Use one orchestrator with per-source adapters. A sensible initial polling policy (to be finalised against source terms and actual release practices) is:

| Source family | Discovery cadence | Ingest trigger |
|---|---|---|
| NCS current vacancies | Daily, only after stable/public ingestion route and terms are verified | New/changed posting or daily snapshot; deduplicate stable vacancy IDs and track expiry/closure when available |
| MoSPI PLFS catalogue | Daily/weekly release check | New table/release; keep monthly CWS and annual usual-status series separate |
| e-Shram state/national snapshot | Weekly or monthly check depending on portal update pattern | New dated official snapshot, never overwrite the previous as-of date |
| NAPS / PMKVY / JSS programme statistics | Weekly/monthly release check | New official release/as-of date; retain missing-state coverage and exact measure definitions |
| ITI inventory and sanctioned seats | Monthly change check; ingest new academic session/revision | New academic-session or officially revised data |
| DGE Employment Exchange Statistics / annual reports | Monthly/quarterly release check | New annual/period report; parse table and update reference coverage |
| LGD state/district codes | Monthly release check | A new published directory version/change; retire/alias entities without losing historical joins |
| NCO / NSQF / qualification/trade taxonomies | Quarterly release check and notification watch | New version, code addition/retirement, or approved crosswalk review |

Each run must: (1) retrieve source metadata and raw artifact, (2) capture SHA-256 and retrieval timestamp, (3) stage without overwriting good data, (4) validate schema, units, nulls, duplicates, periods and geography, (5) validate provenance and grain, (6) compare counts/coverage to last successful run, (7) promote only if checks pass, and (8) record run status, parser version, transformation version, source release and errors in the retrieval log.

If a source breaks, retain the last successful snapshot but show its original as-of date and a stale/error indicator. Never advance `updated_at` merely because a poll ran. Schema changes, large unexplained deltas, ambiguous skill mappings and new output quality failures should stop promotion and raise a review item. Routine refreshes can be fully automated; semantic exceptions require review.

****Current unattended-refresh blocker:** The current workflow is configured to warn and downgrade a scheduled run to check-only if the GitHub secret `SHRAMIK_DATABASE_URL` is absent; a manual `workflow_dispatch` with `apply=true` fails closed without the secret. The September 2026 rows are already present in Supabase, but no successful scheduled apply has been verified. Add the secret under repository **Settings → Secrets and variables → Actions → New repository secret**, using the backend's server-side database connection string. Do not put a service-role key in a `VITE_*` browser variable. Run a controlled `apply=true` refresh and verify the write report/retrieval hash before relying on unattended updates. Also, GitHub scheduled workflows run from the repository's default branch: this workflow must be merged there before the weekly schedule becomes active. Do not merge/deploy until the user approves the candidate.

The ingestion implementation may use a scheduled worker (for example, a GitHub Actions scheduled workflow running the versioned Python adapters) with narrowly scoped Supabase credentials. Keep service-role secrets server-side, outside `VITE_*` variables and source control. Do not run ingestion in a client browser.

## Current implementation status (22 October 2026, 14:02 UTC)

### Verified on the latest branch commit

Branch head: `dd5fa37301862003e1733d3925ee89fc3b6eb853`.

- [Frontend CI](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39791874851) succeeded on that exact commit: **210 tests passed, 0 failed**, type-check passed, live Supabase public-KPI reads passed, production bundle/static entries built, 17 production-preview route checks passed, and Chromium interaction/responsive QA passed. This is CI verification; no deployment took place.
- The QA environment confirmed the Demand and Supply modules read the source-backed Supabase allow-list, display the monthly September 2026 PLFS CWS rates with their period/definition, hide all synthetic preview controls in production, and do not publish job demand where no validated demand series exists.
- The latest source refresh [CI run 39790210861](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39790210861) succeeded in **DRY_RUN** mode and validated the same three MoSPI PLFS monthly CWS values already in Supabase. That run did not write to Supabase because `DATABASE_URL` was empty. The separate backend CI run [39790210834](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39790210834) passed **70 backend tests**.

### Source registry truthfulness correction

The Data Sources adapter only has browser permission to read registered metadata; it cannot query protected retrieval/validation history through the public reader. The page has been corrected accordingly:

- `data_sources.accessed_at` is now displayed as **registry metadata accessed**, not “last successful retrieval.” The actual successful-retrieval and last-validated fields remain “Not reported” unless the authorized backend supplies them.
- A distinct **Status unknown** summary counts explicit `UNKNOWN` lifecycle records. This is separate from “Needs attention,” which only counts known pending-validation/stale/failed states.
- The introductory copy now says the page is a registry of sources and explains that unknown health is not verified health. The registry response indicator is neutral, not green.
- The new adapter regression test checks that registry access time cannot be promoted to successful retrieval and that `UNKNOWN` rows are summarized separately.

The current public registry inventory has **22 registered sources**. The authoritative source registry adapter currently classifies **21 as unknown** and **1 as not configured**, with zero explicitly active and zero explicitly known pending/stale/failed. Those zero values do **not** mean there are no risks: most source connector health and freshness are simply not exposed to this browser path. In the Data Sources view, a source should only become “Active” after a real authorized retrieval/validation record is available.

### Remaining SIH showcase blockers (not masked by the passing frontend CI)

1. **Protected analytics API origin:** the production bundle does not have `VITE_SHRAMIK_API_BASE_URL` configured. Therefore Forecasts and Emerging Skills correctly show “Analytics unavailable in this build” rather than query localhost or fall back to synthetic results. The FastAPI endpoints were verified locally with authentication, but a reachable, secured backend origin has not been configured for the showcase build. Do not set this variable to `127.0.0.1`; that would refer to the visitor’s own computer. A backend hosting/origin and authentication/CORS configuration is required before these protected views can query the real endpoint in a remote build.
2. **Official forecast readiness:** the canonical database still has zero validated official forecasts, warnings and emerging-skill signals. That is correct until compatible multi-year district-by-skill source-backed histories exist. Do not activate the seven provisional skill mappings merely to fill the UI.
3. **Scheduled database refresh activation:** PLFS browser capture/parser and dry-run are successful, but unattended refresh needs the server-side GitHub Actions secret `SHRAMIK_DATABASE_URL` and merge of `.github/workflows/plfs-source-refresh.yml` to the repository default branch. The branch-only workflow does not run on its weekly schedule from this feature branch. The source-backed September 2026 rows are already loaded; no new database write happened in the last dry run.
4. **Other source refreshes:** NCS’s “Over 17.68 lakh” portal-vacancy figure is a dated July 2026 snapshot and not an all-India census. It still needs a permitted, stable retrieval approach before an unattended updater is trusted. ITI/training-centre/seat capacity, e-Shram, PLFS annual and taxonomy updates need their own source-specific release handlers; registering a source alone is not an automated connector.
5. **Visual sign-off:** automated responsive/interaction QA has passed, but the human visual lock against every supplied reference board and a final SIH walkthrough are still separate release gates. The references govern layout only—not metric values or data claims.

## Latest implementation checkpoint — 22 October 2026

### Verified candidate build

- **Branch:** `fix/backend-api-route-integration`
- **Commit:** `adcd49927fb45e4f45eac62c5d30f24afc433f83`
- **CI:** [frontend run 39795743705](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39795743705) — **success**
- **Verification:** TypeScript type-check passed; **214 frontend tests passed, 0 failed**; live Supabase KPI checks passed; production build and static-entry checks passed; route smoke tests and Chromium interaction/responsive QA passed.
- **Visual refinements included in this tested commit:** Demand hero heading is sized to fit the reference at desktop widths where available; programme trend axis labels use one stable unit per chart rather than switching between `K` and `L` notation partway down the axis. Both have regression checks.
- **Official-only behaviour verified:** the production view exposes no synthetic preview or demo selector; the Dashboard and Demand consume the source-backed KPI view; Forecasts/Emerging Skills show a configuration notice when the protected API origin is missing; Scenario Simulator refuses to run without a compatible, approved `SOURCE_BACKED` baseline; QA produced no non-read-only network requests and no uncaught JavaScript exceptions.

### Source-backed showcase values verified

The live public KPI view returns seven distinct items: e-Shram registrations **31.8 crore** (snapshot 14 July 2026), provisional CTS capacity **973,058 seats** (academic session 2026; source snapshot 8 July 2026), ITIs **15,012** (source snapshot 31 October 2024), September 2026 monthly PLFS CWS UR **5.0%**, LFPR **55.5%**, WPR **52.7%** (persons aged 15+), and the separate CY2025 annual usual-status unemployment benchmark **3.1%**. Monthly and annual PLFS definitions remain separate. The Demand page's source evidence also exposes the NCS portal statement **“Over 17.68 lakh active vacancies” as of 15 July 2026**, scoped to the NCS portal only and presented as a lower bound, not an exact all-India vacancy count.

### Remaining release blockers — not hidden

1. **Protected analytics API hosting:** Forecasts and Emerging Skills require the FastAPI analytics routes from the integration branch plus a configured, approved `VITE_SHRAMIK_API_BASE_URL`. The currently inspected hosted backend deployment exposes only `/api/health`; its analytics routes are not deployed. Do not point the frontend to localhost and do not deploy until the user approves the candidate build and backend configuration.
2. **Official analytical outputs:** the live database still has zero active official forecasts, warnings and emerging-skill signals. That is correct because compatible validated multi-year District × Skill demand/supply histories are not available. The 2022 DGE vacancies-notified observations and current NCS snapshot are state/national aggregate context, not a substitute.
3. **Scheduled refresh activation:** the September 2026 PLFS CWS values are stored and the source capture/parser check is successful, but unattended writes are not yet proven. The scheduled workflow must be merged into the repository default branch and the server-side GitHub Actions secret `SHRAMIK_DATABASE_URL` must be configured before the weekly job can persist future releases.
4. **Visual lock sign-off:** automated layout, route and responsive QA passed; a human reference-by-reference review of every page is still required. Source text/layout boards are design references only and must not be treated as data.
5. **Other source adapters:** NCS has an official dated active-vacancy snapshot but no verified authorized bulk feed yet. DGT/ITI, programme training and taxonomy updates need their own source-specific release handlers; a registered source alone is not an automated connector.

No Vercel deployment was made for this checkpoint.

## 8. Acceptance gates before SIH showcase

- [ ] All pages have passed reference-by-reference visual review; no design reference values have been copied as live data.
- [ ] Production build has showcase mode enabled and exposes no synthetic preview or demo selector.
- [ ] All data-bearing UI uses source-backed, non-synthetic rows in official mode.
- [ ] Every visible metric carries source, unit, reference period, geography and freshness/coverage where applicable.
- [ ] Aggregate vacancy counts are not shown as district/occupation/skill demand.
- [ ] PLFS annual and monthly definitions remain distinct; partial state coverage is visible.
- [ ] No official forecast, warning, emerging-skill signal or shortage is shown without the required validated inputs.
- [ ] Skills stay inactive until their mappings pass review.
- [ ] Data-source freshness and failure states are tested.
- [ ] Scheduled ingestion has been tested against a new release, duplicate run, empty response, schema drift and source outage.
- [ ] Backend/frontend CI is green on the exact candidate commit.
- [ ] No deployment is made until the user approves the candidate build.

## 9. Evidence links checked on 22 October 2026

- NCS job-search filters and classified-vacancy updates: [NCS Search Jobs](https://www.ncs.gov.in/jobs-in-operations-and-support), [NCS Latest Updates](https://www.ncs.gov.in/latest-update).
- PLFS annual source and monthly release catalogue: [PLFS 2025 report](https://mospi.gov.in/uploads/publications_reports/publications_reports1780040415321_0624fb13-fb47-40bc-b470-7c7e9635c3ef_PLFS_2025_F_REV_29052026.pdf), [eSankhyiki PLFS catalogue](https://esankhyiki.mospi.gov.in/catalogue-main/catalogue?page=0&product=PLFS).
- ITI/training reference: [DGT](https://dgt.gov.in/en), [Skill India Digital](https://www.skillindiadigital.gov.in/home).
- Existing detailed source audit: `data/SOURCE_REGISTER.md`.


## Follow-up QA and source/hosting recheck — 22 October 2026, 15:00 UTC

### Visual implementation checked after the 214-test checkpoint

- Latest tested source commit: `3f01bb902026f47a9c17b0bce7b60be115f9a146` on `fix/backend-api-route-integration`.
- [Frontend CI run 39800083406](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39800083406) completed successfully. Type-check passed; **216 tests passed, 0 failed**; live Supabase published-KPI verification, production build, static entry checks, route smoke tests, and Chromium interaction/responsive QA passed.
- The screenshot artifact from that run was reviewed. The live data modules had been painting over the app's shared canvas and drawing a separate yellow dot pattern inside each hero panel, contrary to `DESIGN_LOCK.md`. Commit `af8fb9c00d5fe684def18d6e2e9df10905f3f99d` changes `src/live-data/database-insights.css` so the module shell inherits the shared fixed dotted canvas and the hero uses the normal surface; commit `3f01bb902026f47a9c17b0bce7b60be115f9a146` adds regression coverage. The post-change Supply and Forecasts screenshots confirm that the extra yellow hero pattern is gone. The fix is CI/preview verified only; no deployment was made.
- Other inspected views continue to follow official-only data behaviour. In particular, Forecasts/Emerging Skills retain explicit unavailable states rather than substituting demo records; the Scenario Simulator refuses to run without an approved source-backed baseline.

### Backend hosting rechecked after the prior checkpoint

- The stable backend health endpoint, `https://shramik-backend-api.vercel.app/api/health`, returns HTTP 200.
- The stable alias's current `/openapi.json` exposes only `/api/health`; `/api/v1/analytics/status` returns HTTP 404. This remains a hard blocker: do not configure the frontend's `VITE_SHRAMIK_API_BASE_URL` to the stable alias until the required protected routes are served there.
- A distinct deployment associated with `feature/backend-analytics-read-api` exposes the expected analytics paths in OpenAPI, but the checker could not verify authenticated database reads through that unique deployment because Vercel Deployment Protection blocked the direct request. Route presence in OpenAPI is not proof of a successful authenticated query.
- Read-only Vercel environment inspection now lists the backend `DATABASE_URL` key for Production as well as `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CORS_ALLOWED_ORIGINS` and `ENVIRONMENT`; secret values are not copied into the repository or browser. The separately required GitHub Actions `SHRAMIK_DATABASE_URL` secret still needs its own verification before scheduled ingestion can persist anything.
- No environment configuration, alias, deployment, merge, or database write was changed during this check.

### Demand-feed access and refresh implications

- The official [NCS job search](https://www.ncs.gov.in/) supports location, sector/role and posted-date filters, making it a possible future observation source. However, the [NCS onboarding policy](https://www.ncs.gov.in/NCSPolicyDocuments/NCS%20Onboarding%20Policy_07Jan2016.pdf) restricts re-use and dissemination of data drawn from the portal without consent. Do not build an unattended scraper/feed adapter or republish portal records for SHRAMIK before obtaining written permission and confirming supported access conditions.
- The [OGD Employment Exchanges catalogue](https://www.data.gov.in/catalog/employment-exchanges-data) lists legacy monthly July 2012–April 2013 and annual live-register 2002–2011 resources. It cannot substitute for a current district-by-skill demand feed.
- DGT's [provisional CTS 2026 seat matrix](https://www.dgt.gov.in/en/node/4675) is a source-backed, release-oriented capacity input; it is a dated source snapshot, not real-time job demand.
- Therefore, do not advertise current total labour demand, a district-by-skill shortage, emerging-skill momentum or an official forecast until the source, right to use it, granularity, compatible history, and methodology are all verified. Continue showing the valid source-backed context currently stored and keep unsupported analytical results unavailable.



### Additional DGT ITI-count reconciliation identified — 22 October 2026

A further official-source comparison found three different official ITI-related counts with different or unclear scope/date metadata:

- The currently stored state/UT series sums to **15,012 ITIs**, from Rajya Sabha Unstarred Question 2674, answered 18 December 2024. Its annexure labels the state/UT CTS figures as at **31 October 2024** and defines CTS as total ITIs including government and private. [Primary parliamentary source](https://sansad.in/getFile/annex/266/AU2674_eCvo0s.pdf?source=pqars).
- The official [DGT Craftsmen Training Scheme page](https://dgt.gov.in/en/CTS), last updated **10 August 2026**, says CTS courses are offered through a network of **14,643 ITIs** (3,331 government and 11,312 private).
- The current [DGT homepage](https://www.dgt.gov.in/en) also renders an **“ITI”** counter of **13,888**, but its visible label does not supply a definition, reference date or reconciliation against the CTS-network figure.
- The two CTS-labelled counts differ by 369; the homepage counter differs by more. They may reflect different inclusion criteria, active networks, affiliation state or coverage, but the pages do not prove which explanation is correct. Do **not** silently overwrite the 2024 State/UT observations or label any one of these totals as the definitive current ITI inventory. Keep the existing 15,012 state series explicitly dated to 31 October 2024 while an owner reconciles the definitions. A new national metric needs a saved source snapshot/retrieval record, definition, publication/update date and a visible note that it is not directly comparable until reconciled.


### Landing screenshot and full-page visual QA — 22 October 2026, 15:06 UTC

- [Frontend CI run 39801436287](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39801436287) completed the full pipeline successfully on commit `4484228b2d909afd9850f31ac0a68b9fbf7e27f9`: TypeScript type-check, **216 tests passed / 0 failed**, live Supabase KPI reads, production build, entry-point checks, route smoke tests and Chromium interaction/responsive QA.
- Manual inspection of the resulting screenshot artifact confirmed the live-data canvas correction on Demand/Supply/Forecasts and verified that the full landing screenshot now includes below-the-fold sections. Browser QA scrolls through all **23** `data-reveal` elements before taking the full-page capture; the new assertion reported `hidden: 0`. The blank sections in the earlier screenshot were a test-capture artefact caused by the landing page's intentional `IntersectionObserver` reveal animation, not missing page content.
- Manual screenshot review covered Dashboard, Demand, Supply, Skill Gaps, Forecasts, Emerging Skills, Scenario Simulator, Reports, Data Sources, Data Quality, Administration, Login and Request Access. Official-only rules remain intact: demand rankings and forecast outputs remain unavailable where no compatible validated observations exist; published training/registration data is clearly distinguished from employment; freshness shows “Not reported” where the connector doesn't provide it; and administration does not simulate approvals or user records.
- This is a tested preview artifact only. No production Vercel deployment, stable-domain alias change, database write, merge to `main`, or refresh-secret change was performed.

### Updated release disposition

Proceed next with an approved backend release plan, not a frontend base-URL toggle. The stable API alias remains health-only/analytics-404, while a separate protected deployment exposes the route schema but has not yet had its authenticated database queries verified. Separately, verify whether the GitHub Actions secret `SHRAMIK_DATABASE_URL` exists using repository settings and then run the PLFS refresh in check-only mode before any controlled write. The active weekly schedule must only be relied upon once its workflow is on the default branch and a server-side database credential is confirmed. Neither step should be represented as complete on the basis of a local or protected deployment test.



### Official demand-source access audit — 22 October 2026

The latest accessible DGE Employment Exchange Statistics publication found in the official [DGE publication index](https://www.dge.gov.in/dge-publications-reports-) is **Employment Exchange Statistics 2023**, released 6 March 2023. Its reported annual national series runs through **2022**; "2023" is the report/publication label, not a 2023 reference-year value. It remains useful for historical employment-exchange registrations, placements, vacancy notifications and live-register context, but it cannot be presented as current market vacancies. The index does not currently list a 2024/2025 Employment Exchange Statistics report. [Published report and time-series table](https://www.dge.gov.in/sites/default/files/2024-05/Employment_Exchange_2023.pdf).

The official [DGE Bulletin on Job Opportunities](https://www.dge.gov.in/bulletin-on-job-opportunities) compiles vacancy/opportunity evidence from employment exchanges, UPSC/SSC/state commissions, recruiting agencies, newspapers and departmental reports. DGE explicitly cautions that private-sector opportunities are only partially covered and the compilation does not reflect total employment opportunities. Older bulletin issues can be used as historical context only, with the issue/reference period shown.

The official [eSankhyiki PLFS catalogue](https://esankhyiki.mospi.gov.in/catalogue-main/catalogue?page=0&product=PLFS) is the release-discovery source for monthly national CWS measures and includes release dates and period metadata. The existing MoSPI page-capture adapter should continue to parse only the explicitly published monthly all-India CWS indicators; it must not reinterpret UR/LFPR/WPR as vacancies or as total workforce supply.

**Implication:** near-term scheduled ingestion should safely automate MoSPI PLFS release discovery, DGT release/snapshot monitoring, and existing public-source metadata. For current district/occupation/skill demand, retain the NCS consent gate and seek an authorized data-sharing route with DGE/NCS or other job sources whose terms permit collection and redistribution. Do not claim full live demand automation until that access is secured and actually tested.

