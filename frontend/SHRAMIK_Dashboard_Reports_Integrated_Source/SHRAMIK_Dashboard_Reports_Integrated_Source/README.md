# SHRAMIK Unified React Application

This package is the canonical Vite/React single-page application for SHRAMIK. The Dashboard, Demand, Supply, Skill Gaps, Forecasts, Emerging Skills, Scenario Simulator, Reports, Data Sources, Data Quality, and Administration modules render inside one `SHRAMIKDashboard` shell with one shared topbar and sidebar. Module pages own only their content; route state is centralized in `src/routing.ts`.

## Canonical shell and routes

- `index.html` opens the Dashboard.
- `skill-gap-analysis.html` is the direct Skill Gaps entry after a production build. It is generated from the same HTML entry point and loads the same shared `Header`, `Sidebar`, notification/profile controls, global region control and detail drawer.
- Selecting **Skill Gaps** from the existing sidebar changes page content and highlights that exact sidebar item in the canonical yellow active state.
- In the Vite development server, open `/` for Dashboard or `/skill-gap-analysis.html` for Skill Gap Analysis.
- `src/SHRAMIKDashboard.tsx` owns the shell. `src/skill-gaps/SkillGapAnalysisPage.tsx` owns only page content.

## Develop and build (preferred)

Node.js 20+ is recommended (Node 22 LTS is a good local choice). Use the lockfile for reproducible installs:

```bash
npm ci
npm run dev
npm run typecheck
npm test
npm run test:live-data
npm run build
npm run test:preview
npm run preview
```

The Vite dev and preview servers expose the same read-only `/api/shramik-data` proxy used in production, backed by `api/shramik-data.ts`. This lets local pages use the approved Supabase reads without relying on browser-to-Supabase CORS behavior. The proxy only exposes an allow-list of reference/source tables and public dashboard views; it forces `SOURCE_BACKED` provenance and `is_synthetic=false` for source-metric reads. It never uses a service-role key.

`npm run build` runs `tsc -b`, Vite production bundling, and then creates `dist/skill-gap-analysis.html`, `dist/forecasts.html`, and `dist/reports.html` as legacy entry points to the same app. The default deployment base is `/` so deep links and trailing-slash routes resolve the bundled assets correctly. For a project-subpath deployment, set `VITE_BASE_PATH=/shramik/` before running the build; route resolution uses the matching Vite base.

## Environment configuration

Copy `.env.example` to `.env.local` before local development. The public Supabase project URL and publishable key have configured safe defaults in the adapter, so those entries can remain blank for the current SHRAMIK project. The publishable key is public by design and is constrained by SQL grants and RLS; **never add a Supabase `service_role` or secret key to a `VITE_` variable or commit it to Git**.

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` optionally override the configured public Supabase project.
- `VITE_SHRAMIK_USE_DEMO_DATA=true` selects clearly labelled illustrative/mock dashboard data for design demos. Keep it `false` for database-backed reads.
- The dashboard uses the Supabase data adapter by default and calls `/api/shramik-data` for approved public reads. A configured backend URL must not silently switch it away from Supabase.
- `VITE_SHRAMIK_API_BASE_URL` only selects the separate REST adapter when `VITE_SHRAMIK_DATA_MODE=rest` is explicitly set. Do not enable that mode until the target FastAPI service implements and contract-tests `/api/v1/dashboard/summary`, `/regions`, `/dashboard/regions/rankings`, and the related dashboard contracts. The currently deployed FastAPI scaffold does not implement the full dashboard contract.
- `VITE_BASE_PATH` defaults to root hosting. Use `/shramik/` only if the production host serves the app from that subpath; build and preview with the same value.

The demand, supply, skill-gap, forecasts, emerging-skills, scenario, reports and data-quality pages use database-backed read views/reference tables where available, with explicit unavailable states when required analytical outputs have not been produced. They must not fabricate shortages, forecasts, trend lines or skill momentum to fill a chart.

The `VITE_DEMAND_API_BASE_URL`, `VITE_SUPPLY_API_BASE_URL`, `VITE_EMERGING_SKILLS_API_BASE_URL`, `VITE_SCENARIO_SIMULATOR_API_BASE_URL`, `VITE_DATA_QUALITY_API_BASE_URL`, `VITE_ADMINISTRATION_API_BASE_URL`, and `VITE_DATA_SOURCES_API_BASE_URL` variables are reserved for their respective validated REST contracts and should remain unset until those endpoints and server-side authorization are implemented and verified. Keep Data Sources create/ingestion feature flags disabled unless the associated write endpoints, authentication and authorization have been reviewed.

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

The unified app at commit `6338d9af48dd09f078c8ae4e5aa2c0897657b9d7` passed the complete GitHub Actions workflow in [run 39299098925](https://github.com/vinit-kumar-011/SHRAMIK/actions/runs/39299098925): clean `npm ci`, TypeScript, automated adapter/route/module tests, Vite production build, legacy-entry checks, production-preview route/asset checks, bundled GeoJSON/licence verification, and artifact upload. Subsequent code or documentation commits must pass their own workflow before release. GitHub Actions uploads the `dist/` artifact from successful runs; build artifacts are outputs, not source files to hand-edit.

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


## Scenario Simulator API integration

The simulator adapter contract and backend acceptance checks are documented in `docs/api/SCENARIO_SIMULATOR_API_CONTRACT.md`. Configure `VITE_SCENARIO_SIMULATOR_API_BASE_URL` independently; leave it blank until the backend implements and verifies the run lifecycle and result schema.

## Scenario Simulator boundary data and attribution

The production app bundles a 36-feature state/UT GeoJSON for the regional-impact visualization. The data is OpenStreetMap-derived (ODbL 1.0) and has visible attribution in the map; its provenance and limitations are documented in `public/assets/INDIA_STATES_ATTRIBUTION.md`. It is best-effort, not an official/survey-grade boundary source. The map provides geometry only; it never derives missing labour-market metrics from shapes, and only adapter-returned comparable scenario results may colour regions.

The Scenario Simulator REST adapter accepts either the API origin (for example `https://host`) or that origin ending in `/api/v1`. The production-preview smoke check verifies that the 36-feature GeoJSON and its OSM/ODbL attribution file are actually served from the built asset directory.
