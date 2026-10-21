# SHRAMIK Integrated Dashboard + Skill Gap Analysis

This application now contains the refreshed **Dashboard** and the specified **Skill Gap Analysis** page in one React application. Both are rendered by the same `SHRAMIKDashboard` shell; the sidebar and topbar are not duplicated in the gap page.

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
npm run preview
```

`npm run build` runs `tsc -b`, Vite production bundling, and then creates `dist/skill-gap-analysis.html` as a direct entry to the same app. Vite's `base: './'` supports static hosting under a project subpath.

## Data modes

The dashboard and gap page use typed adapter interfaces. By default, the app uses visibly labelled illustrative mock data; mock values must never be described as source-backed labour-market findings. To activate the REST adapters, set `VITE_SHRAMIK_API_BASE_URL` in `.env.local` (the adapters add `/api/v1` and `/api/v1/skill-gaps` respectively). Authentication remains the host application's responsibility; no access token is hard-coded or stored in local storage.

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

## Build status

The npm registry could not be resolved in the current build environment (`EAI_AGAIN registry.npmjs.org`), so a normal Vite build could not be run here. The `dist/` directory included in the delivered archive was created by `scripts/build-static-fallback.cjs`, which precompiles the same TypeScript/JSX sources and uses React/ReactDOM from cdnjs. Its build report is `dist/BUILD_REPORT.json`. This fallback is included for review and preview; **the preferred production release is the Vite build above**, which bundles React and Lucide locally. Do not represent the fallback as Vite build output.
