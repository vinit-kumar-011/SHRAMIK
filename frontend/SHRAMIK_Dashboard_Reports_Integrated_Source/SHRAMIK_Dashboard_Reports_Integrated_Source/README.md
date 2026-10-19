# SHRAMIK Unified React Application

This package is the canonical Vite/React single-page application for SHRAMIK. The Dashboard, Demand, Supply, Skill Gaps, Forecasts, Emerging Skills, Scenario Simulator, Reports, Data Sources, Data Quality, and Administration modules render inside one `SHRAMIKDashboard` shell with one shared topbar and sidebar. Module pages own only their content; route state is centralized in `src/routing.ts`.

## Canonical shell and routes

- `index.html` opens the Dashboard.
- `skill-gap-analysis.html` is the direct Skill Gaps entry after a production build. It is generated from the same HTML entry point and loads the same shared `Header`, `Sidebar`, notification/profile controls, global region control and detail drawer.
- Selecting **Skill Gaps** from the existing sidebar changes page content and highlights that exact sidebar item in the canonical yellow active state.
- In the Vite development server, open `/` for Dashboard or `/skill-gap-analysis.html` for Skill Gap Analysis.
- `src/SHRAMIKDashboard.tsx` owns the shell. `src/skill-gaps/SkillGapAnalysisPage.tsx` owns only page content.

## Develop and build (preferred)

Node.js 20+ is recommended. Install dependencies where the npm registry is reachable:

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm run test:preview
npm run preview
```

`npm run build` runs `tsc -b`, Vite production bundling, and then creates `dist/skill-gap-analysis.html`, `dist/forecasts.html`, and `dist/reports.html` as legacy entry points to the same app. The default deployment base is `/` so deep links and trailing-slash routes resolve the bundled assets correctly. For a project-subpath deployment, set `VITE_BASE_PATH=/shramik/` before running the build; route resolution uses the matching Vite base.

## Environment configuration

Copy `.env.example` to `.env.local` in this package before local development. Leave the API host values blank to use clearly labelled demo/mock data.

- `VITE_BASE_PATH` defaults to root hosting. Use `/shramik/` only if the production host serves the app from that subpath; build and preview with the same value.
- `VITE_SHRAMIK_API_BASE_URL` activates the dashboard, Skill Gaps, Forecasts and Reports adapters.
- `VITE_DEMAND_API_BASE_URL`, `VITE_SUPPLY_API_BASE_URL`, `VITE_EMERGING_SKILLS_API_BASE_URL`, `VITE_SCENARIO_SIMULATOR_API_BASE_URL`, `VITE_DATA_QUALITY_API_BASE_URL`, and `VITE_ADMINISTRATION_API_BASE_URL` opt each additional module into its own REST adapter. Values may point to the same API origin, but modules are enabled separately because the current FastAPI scaffold does not yet implement all proposed contracts. Blank values keep that module on its labelled demo adapter; a configured REST failure is surfaced rather than silently returning fixtures.
- Supply uses the proposed read-only endpoint in `docs/api/SUPPLY_API_CONTRACT.md`; Data Quality and Administration contract proposals are in `docs/api/DATA_QUALITY_API_CONTRACT.md` and `docs/api/ADMINISTRATION_API_CONTRACT.md`. Emerging Skills uses the proposed endpoints in `docs/api/EMERGING_SKILLS_API_CONTRACT.md`. Keep these modules in demo mode until the corresponding endpoint contracts and authorization are implemented and verified.
- `VITE_DATA_SOURCES_API_BASE_URL` selects the separate Data Sources REST adapter. Create-source and ingestion controls remain disabled unless the corresponding feature flags are explicitly enabled; do not enable them until the endpoints, auth, and server-side authorization have been implemented and tested.

Supply, Data Quality and Administration currently remain UI/demo modules. Their fixture interactions do not send writes to the backend. The UI is integrated; server-side production readiness is still dependent on implementing and contract-testing their API endpoints.

## Data modes

The dashboard and gap page use typed adapter interfaces. By default, the app uses visibly labelled illustrative mock data; mock values must never be described as source-backed labour-market findings. To activate the dashboard, Skill Gaps, Forecasts and Reports REST adapters, set `VITE_SHRAMIK_API_BASE_URL` in `.env.local` (the adapters add their documented `/api/v1` namespaces). Each additional module has its own optional variable, documented above, to avoid accidentally switching modules to an API that does not implement its endpoints. Authentication remains the host application's responsibility; no access token is hard-coded or stored in local storage.

Skill Gap Analysis routes used by the adapter are:

- `GET /api/v1/skill-gaps/filters`
- `GET /api/v1/skill-gaps/overview`
- `GET /api/v1/skill-gaps/landscape`
- `GET /api/v1/skill-gaps/regions`
- `GET /api/v1/skill-gaps/skills`
- `GET /api/v1/skill-gaps/insights`
- `GET /api/v1/skill-gaps/sector-flow`
- `GET /api/v1/skill-gaps/details/{type}/{id}`

The API handoff in `docs/skill-gap-analysis/SHRAMIK_SKILL_GAP_ANALYSIS_API_CONTRACT.md` is a contract proposal. Align route names and payload envelopes with backend contracts before enabling REST mode. REST failures do not switch silently to mock data.

## Analytical truth and known service blockers

- Gap is computed by the adapter/backend only for comparable demand and supply measures: `gap = demand - supply`. A positive value indicates potential shortage; a negative value indicates potential surplus.
- Observed estimates are not labelled as forecasts.
- Gap percent is shown only when the backend contract provides a valid denominator/formula.
- The reference screenshot's numbers are illustrative only.
- The mock adapter deliberately supplies no map geometry. The page shows a clear unavailable state and does not use `india-map-illustrative.png` as a data map. A real choropleth requires approved, licensed/versioned GeoJSON plus a canonical region-code crosswalk from the data service.
- The optional sector flow stays unavailable unless measured links with compatible units are returned.
- The Sectors tab has a deliberate no-data state because the supplied API contract does not define a sector-gap totals endpoint; no sector totals are fabricated.

## Handoff files

`docs/skill-gap-analysis/` contains the provided implementation specification, API contract, design-system references, sidebar consistency lock, QA checklist and reference images. `reference/baseline/SHRAMIK_Skill_Gap_Analysis_Baseline.html` preserves the exact uploaded baseline for comparison.

## Production build and verification

The preferred production release is the Vite build generated from this package; do not deploy the older CDN-based static fallback as a production bundle. CI performs a clean `npm ci`, TypeScript check, automated tests, Vite production build, generated-entry checks, and production-preview route/asset smoke tests.

An earlier unified integration revision passed clean install, type-check, tests, production build, and legacy-entry checks. The current branch adds bundled Demand icons, configurable root/subpath deep links, and production-preview smoke tests; the exact latest revision must pass the full workflow—including preview smoke tests—before it is considered verified. GitHub Actions uploads the `dist/` artifact from successful runs; build artifacts are outputs, not source files to hand-edit.

The `scripts/build-static-fallback.cjs` path is for constrained review environments only. It loads React/ReactDOM from a CDN and is not equivalent to the self-contained Vite production bundle.


## Unified SHRAMIK application integration status

The canonical app shell is in this package. It owns the single topbar/header, sidebar, route state, shared dashboard adapter and the page content mount. Run all commands from this package directory, not from one of the standalone handoff folders.

### Canonical module routes

| Route | Module | Integration status |
| --- | --- | --- |
| `/` | Dashboard | Existing shared-shell page |
| `/demand` | Demand Insights | Embedded page module |
| `/supply` | Supply Insights | React page integrated; synthetic preview data |
| `/skill-gaps` | Skill Gaps | Existing integrated React module |
| `/forecasts` | Forecasts & Early Warnings | Existing integrated React module |
| `/emerging-skills` | Emerging Skills | Embedded page module |
| `/scenario-simulator` | Scenario Simulator | Embedded React module |
| `/reports` | Reports | Existing integrated React module |
| `/data-sources` | Data Sources | Embedded React module with mock/REST adapter selection |
| `/data-quality` | Data Quality | React page integrated; synthetic preview state |
| `/administration` | Administration | React page integrated; synthetic preview state |

All routes are registered centrally in `src/routing.ts` and rendered by `src/SHRAMIKDashboard.tsx`; page modules do not introduce a second global shell.

### Production deployment and direct links

This is a history-API single-page React app. Configure the production host to rewrite requests for module paths (for example `/administration` or `/supply`) to the built `index.html`, while leaving real static assets untouched. Vite preview provides the expected SPA fallback. Static hosts without rewrite support need an equivalent fallback rule before direct-link refresh can be considered verified.

The build still emits the legacy direct entry files for `skill-gap-analysis.html`, `forecasts.html`, and `reports.html`. These load the same React shell; they are not separate applications.

### Data truth and backend boundaries

Supply, Data Quality and Administration now have read-only REST adapter boundaries with proposed response contracts. Their endpoints are not assumed to exist in the current backend. Data Quality does not start validation runs or mutate issues in REST mode; Administration does not submit approval, role or user-status mutations in REST mode. Emerging Skills also has a REST adapter, but its endpoint contract is only proposed until the backend implements it. Filtering and status changes on these pages are client-side demo state only. They do not execute live supply analytics, create validation runs, change production access grants, modify authentication accounts, or write audit events to the backend.

Before production use, replace those demo adapters with approved backend contracts and server-confirmed operations. Authorization must be enforced by the backend. Do not treat UI state, fixture data, or a visible button as evidence that a server operation has succeeded.

### Required release checks

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run preview
```

The GitHub Actions workflow `.github/workflows/frontend-unified-build.yml` runs the clean install, type-check, automated tests, production build and basic output checks, smoke-tests direct module routes and their bundled JavaScript through Vite preview, then uploads the build artifact. A passing workflow verifies reproducible bundling and static checks; it does not replace browser QA at desktop/mobile breakpoints or live-backend contract validation.


## Scenario Simulator boundary data and attribution

The production app bundles a 36-feature state/UT GeoJSON for the regional-impact visualization. The data is OpenStreetMap-derived (ODbL 1.0) and has visible attribution in the map; its provenance and limitations are documented in `public/assets/INDIA_STATES_ATTRIBUTION.md`. It is best-effort, not an official/survey-grade boundary source. The map provides geometry only; it never derives missing labour-market metrics from shapes, and only adapter-returned comparable scenario results may colour regions.

The Scenario Simulator REST adapter accepts either the API origin (for example `https://host`) or that origin ending in `/api/v1`. The production-preview smoke check verifies that the 36-feature GeoJSON and its OSM/ODbL attribution file are actually served from the built asset directory.
