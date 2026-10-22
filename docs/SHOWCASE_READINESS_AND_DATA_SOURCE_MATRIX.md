# SHRAMIK SIH Showcase: Visual Lock, Data Source Matrix, and Refresh Plan

**Reviewed:** 22 October 2026  
**Working branch:** `fix/backend-api-route-integration`  
**Status:** Execution plan and evidence audit; page-by-page visual sign-off is still required.  
**Release constraint:** Do not deploy to Vercel until the user approves the visual review and all source/refresh gates pass.

## 1. Decision on the proposed plan

The four stages are sound, with one adjustment: the visual lock and source audit must overlap. Each page's visual structure can be finalised independently of data values, but every visible metric/filter/chart must be checked against a source contract before its final content is approved.

1. **Lock the visuals:** implement the supplied reference composition, global shell, spacing, interactions, responsiveness, and empty/loading/error states. A reference image is a layout target, never a source of facts.
2. **Verify the data contract:** for every displayed field, record the source, unit, definition, period, geography, granularity, source timestamp, provenance, coverage, and known limitation. Do not force aggregate figures into finer-grained rows.
3. **Wire backend and analytics:** pages read persisted source-backed observations through approved adapters/endpoints. Deterministic joins, arithmetic, validation and model pipelines belong in backend/database services. AI is only added where it offers a defensible function.
4. **Automate refresh:** poll source registries, retrieve new releases/snapshots, hash raw files, stage, validate, upsert and log each successful or failed run. Scheduled jobs must not turn an inaccessible or changed source into zeros or invented data.

**AI is not required on every page.** Reference-data pages need APIs; cards need queries; counts need SQL; gaps need compatible quantities; forecasts need validated histories and model evaluation. AI can assist with occupation/skill crosswalk suggestions and evidence-grounded explanations, but it cannot create missing observations, approve low-confidence mappings autonomously, or replace the forecasting pipeline.

## 2. Showcase safety gate already implemented

**Latest verified production candidate:** [Frontend CI run 39766185602](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39766185602), commit `a7f97d08ed706c230a389b83ceb78173e3398705`, passed **198 frontend tests (0 failures)**, type-check, live Supabase published-KPI reads (7 cards), production build, route smoke tests, and Chromium interaction/responsive QA. Chromium explicitly verified the production landing preview has zero illustrative demand/supply/forecast path elements, hides the mock-preview tabs, and displays “OFFICIAL SHOWCASE · SOURCE-BACKED ONLY.” It also confirmed the Demand page renders the source-backed September 2026 all-India PLFS CWS rates (UR 5.0%, LFPR 55.5%, WPR 52.7%) with the period “September 2026 · monthly CWS · persons aged 15+” while retaining “Job-demand series is not published.” The official-only module checks passed; QA issued no non-read-only requests and saw no uncaught browser exceptions. This was a CI build/preview only; no Vercel deployment occurred.

The production UI now enters official-only showcase mode by default:

- Production builds ignore `VITE_SHRAMIK_USE_DEMO_DATA=true` and disable the mock dashboard path.
- Synthetic preview entry points and illustrative occupation examples are hidden in production.
- The Forecasts/Emerging Skills analysis selector only offers Official mode in production.
- The Scenario Simulator disables execution unless the selected baseline is compatible, `SOURCE_BACKED`, and `APPROVED`; its local assumptions-only baseline cannot run.
- Live/API failure remains an error or unavailable state; it must not silently fall back to demo fixtures.

**Verification:** GitHub Actions run [39750824206](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39750824206) completed successfully on commit `bba9176517a4cb513e3c4a30f7ef62c4200ee382`: type-check, frontend tests (194 passed, 0 failed), live Supabase KPI checks, production build, static-entry and route smoke tests, and Chromium interaction/responsive QA. This was CI verification only; it was **not** a Vercel deployment.

Synthetic fixtures remain isolated in the database/development tooling for regression tests. The production user experience and Official API mode must not query or display them. Do not run the demo ingestion/pipeline in the showcase environment.

## 2A. Latest visual and deployed-API audit (22 October 2026)

The latest browser-QA screenshot artifact from [frontend CI run 39767812605](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39767812605) was manually inspected after the CI passed. This exposed two defects the prior automated check had missed:

1. The Demand hero still showed **“Open illustrative demo”** even though the other synthetic preview button was hidden. The JSX is now guarded by `!showcaseMode`, and the Chromium QA script now detects both labels so the same omission cannot regress.
2. The production preview’s Forecasts/Emerging Skills pages attempted `/api/v1/...` when the production API base URL was empty. They showed HTTP 500 because the Vite production preview has no FastAPI dev proxy. The component now short-circuits that state with an explicit `VITE_SHRAMIK_API_BASE_URL` configuration notice and never falls back to synthetic rows. A CI run is in progress to confirm this last change end-to-end.

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
| Source-backed NAPS apprentices engaged | 36 state rows for each of FY2023-24, FY2024-25 and FY2025-26 | Apprenticeship programme engagement context, not total available labour supply. |
| Source-backed PMKVY trained/oriented | 24, 27 and 23 state rows across FY2023-24, FY2024-25 and FY2025-26 | Training programme context with incomplete state coverage; display coverage with every aggregate. |
| CTS ITI count | 36 state rows, snapshot dated 31 October 2024 | Institute inventory at the source snapshot date. |
| Provisional CTS seat capacity | 1,521 source metric rows, reference `ACADEMIC_SESSION_2026`, snapshot dated 8 July 2026 | Training capacity context. Inspect its `dimension_values` and canonical mapping before treating a row as trade-level. |
| e-Shram registrations | 36 state/UT rows plus one national row, snapshot dated 14 July 2026 | Cumulative registrations, not employment, vacancies or available workforce. It is already a potentially stale snapshot and must show that date. |
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
| Dashboard | `SHRAMIK_Dashboard_Reference.png`; `reference/dashboard-concept.png` | Four fixed KPI slots, source-backed indicators, supported regional rankings and programme trends | Do not fill fixed KPI slots with hard-coded or mock demand/supply/gap values; use a clear unavailable state when needed |
| Demand Insights | `docs/skill-gap-analysis/reference/SHRAMIK_Demand_Insights_Reference.png` | PLFS published rates, e-Shram registrations with 14 Jul 2026 snapshot date, state/UT DGE vacancies-notified flow for CY2022 where useful, and NAPS context trend with precise labels | Current total labour demand estimate and top occupations by demand; neither is supported by the current canonical records |
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

Keep the existing DGE 2022 vacancy-notified dataset as an official historical aggregate signal. It does not provide enough years to produce a multi-year forecast by itself.

### B. PLFS labour-market context

**Latest official release check (22 October 2026):** MoSPI's PLFS product page reports September 2026 all-India Current Weekly Status (CWS) rates for persons aged 15 years and above: LFPR **55.5%**, WPR **52.7%**, and UR **5.0%**. The monthly PLFS September bulletin was announced on 15 October 2026. These are monthly CWS rates, **not** the annual CY2025 usual-status values currently stored/displayed by the annual metric cards; keep their definitions and periods separate. Sources: [MoSPI PLFS product page](https://www.mospi.gov.in/themes/product/69--) and [MoSPI September 2026 bulletin announcement](https://www.mospi.gov.in/download-reports?main_cat=NzI2%26cat%3DAll).

**Automation implementation:** `backend/scripts/render_plfs_page.mjs` uses headless Chromium to capture the official page's rendered DOM (the raw HTTP response is a JavaScript shell); `backend/app/ingestion/refresh_plfs_cws.py` validates the three cards for a shared month/year, numeric range, all-India coverage, age 15+ and CWS basis, then supports an idempotent source-backed upsert to `source_metric_observations`. Parser/layout drift, mixed periods or missing labels fail closed.

**Verified in CI on 22 October 2026:** [refresh workflow run](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39763138684) passed backend tests (63 passed, 1 deprecation warning), Chromium capture, and parse/validation of the official page: September 2026, LFPR 55.5%, WPR 52.7%, UR 5.0%; 3 rows validated. That push-triggered run was deliberately check-only and reports `writes_performed=false`.

**Initial source-backed load completed:** the validated three-rate release is now in Supabase as `SOURCE_BACKED`, non-synthetic `NATIONAL × MONTHLY_2026-09` observations. The verified retrieval row now uses the exact SHA-256 emitted by the successful CI parser (`5834b232fc83ff2f49c8f3210b1da361b155cc2f539af067a21ecf2931d047ec`) and all three observations point to it; the prior immutable retrieval entry remains in the audit history. The source-metric table now has **2,090** source-backed rows, including these three monthly CWS records.

**Public KPI view updated:** migration `supabase/migrations/20261022120000_add_monthly_plfs_cws_public_kpis.sql` exposes the latest *complete* monthly CWS release as three separate cards: LFPR 55.5%, WPR 52.7%, and UR 5.0% for September 2026. It requires all three metrics at the same national month and the exact `combined / person / 15_years_and_above / current_weekly_status` definitions, filters out synthetic records, and preserves the annual CY2025 unemployment benchmark as a separate item. The frontend live-data smoke now requires those three codes and checks the periods/source labels are correctly separated. A successful run on commit `0effe01f30b8495620fd0328b4a75491df9169e5` verified all **7** public KPI rows and the separate annual benchmark: [frontend verification](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39764373549).

The Demand page's `Latest per source` cards prefer this monthly series for India and display “September 2026 · monthly CWS · persons aged 15+”; choosing `Calendar year 2025` continues to show the annual 2025 records. National monthly values are never applied to a selected State/UT. A regression test now locks these period/granularity rules. These rates remain context—not vacancy demand or workforce supply—and official forecasts remain **0**.

**Production landing-page preview:** the existing UI frame is retained for visual continuity, but production no longer draws its illustrative demand/supply/forecast paths or offers the Overview / Skill gaps / Forecasts preview tabs. It displays “Not published” / “Not calculated” and an explicit no-validated-series message instead. Development mode retains the clearly labelled mock previews for QA only.

**Scheduled refresh behavior / activation gate:** `.github/workflows/plfs-source-refresh.yml` captures the rendered MoSPI page and validates new releases. Push-triggered runs are check-only; weekly scheduled runs are apply-eligible. If the GitHub Actions secret `SHRAMIK_DATABASE_URL` is absent, an apply-eligible run fails explicitly before database writes rather than silently reporting a persisted refresh. The initial September 2026 release and KPI-view migration are already in Supabase. A completed check-only workflow proves retrieval/parsing only—not the scheduled database-write path.

**Important branch constraint:** GitHub Actions scheduled workflows are run from the repository's default branch. Because the current working branch is `fix/backend-api-route-integration`, this schedule will not become a live unattended refresh until the workflow is merged into the default branch. Until the visual/data review is approved and that merge is explicitly done, this branch provides tested adapter/CI behavior, not an active production scheduler. Workflow-dispatch remains an explicit manual run; it is check-only by default.

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

The ingestion implementation may use a scheduled worker (for example, a GitHub Actions scheduled workflow running the versioned Python adapters) with narrowly scoped Supabase credentials. Keep service-role secrets server-side, outside `VITE_*` variables and source control. Do not run ingestion in a client browser.

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
