# Claude Code Prompt — Implement SHRAMIK Skill Gap Analysis as an Integration-Ready Page Module

You are the senior frontend engineer implementing the **Skill Gap Analysis** page for SHRAMIK. The team is developing pages individually and will bind them into the app later. Implement this page as a modular React + TypeScript deliverable inside the existing frontend repository, in a form that can be integrated later. Do not create a second app or merely return a plan.

## Required reading

Read these handoff files first:
1. `SHRAMIK_SKILL_GAP_ANALYSIS_IMPLEMENTATION_SPEC.md`
2. `SHRAMIK_SKILL_GAP_ANALYSIS_API_CONTRACT.md`
3. `SHRAMIK_SKILL_GAP_ANALYSIS_COMPONENT_INVENTORY.md`
4. `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`
5. `SHRAMIK_DASHBOARD_SPEC.md`
6. `SHRAMIK_COMPONENT_INVENTORY.md`
7. `SIDEBAR_CONSISTENCY_LOCK.md`
8. `SKILL_GAP_DATA_SEMANTICS.md`
9. `SHRAMIK_SKILL_GAP_ANALYSIS_QA_CHECKLIST.md`
10. `reference/SHRAMIK_Skill_Gap_Analysis_Reference.png` (content layout only)
11. `reference/SHRAMIK_Dashboard_Reference.png` (authoritative shell/sidebar)

## Step 1 — inspect before modifying

Inspect the actual repository: package.json, React version, route convention, shell/sidebar/topbar source, shared design tokens, UI components, charting library/wrappers, map/geospatial stack, existing APIs/adapters, auth conventions, asset locations and tests.

Do not guess the repository's actual dimensions when source exists. Do not add a new charting/map library or dependencies until confirming that no suitable implementation already exists. If the source tree doesn't match the spec's paths, adapt and report a mapping.

## Integration model — important

- Create an isolated page module (e.g., `SkillGapAnalysisPage.tsx` and adjacent styles/hooks/services/types) that can be bound into the app later.
- Do not add a new standalone Vite app, new global router, duplicate auth shell, or parallel design system.
- The page content component should be renderable inside the shared authenticated Dashboard shell.
- If a runnable visual preview is necessary, use a preview-only harness that imports the exact existing shared shell. Mark it preview-only and keep it out of the production page path.
- Do not duplicate the production sidebar or topbar in `SkillGapAnalysisPage`. If the current isolated-page workflow needs shell scaffolding, document that separately as preview-only.
- Export typed component/props/service interfaces to make later composition easy.

## Non-negotiable sidebar/shell requirements

- Reuse the exact shared shell from the existing Dashboard source.
- `Skill Gaps` is the active item; the page content heading is `SKILL GAP ANALYSIS`.
- Canonical nav order: Dashboard, Demand, Supply, Skill Gaps, Forecasts, Emerging Skills, Scenario Simulator, Reports, divider, Data Sources, Data Quality.
- Preserve actual sidebar dimensions, logo sizing, topbar dimensions, icon sizing, nav row height/spacing, yellow active state, background dotted layer, bottom worker art and mission note. Do not approximate if source components exist.
- Do not add Data Explorer/User Management/Access Requests/Settings due to mockup styling.
- The global shell reference outranks the page screenshot for all shared components.

## Visual structure — distinct from Demand and Supply

Implement the specific Skill Gap composition described in the spec:
1. Small breadcrumb/eyebrow + large `SKILL GAP ANALYSIS` hero and restrained decorative worker/bridge treatment.
2. Shared six-filter toolbar with Apply and Reset.
3. Exactly four KPI cards: Estimated Demand, Estimated Supply, Gap/Shortage, Skills with Significant Gaps.
4. Page-level tabs: Overview, Occupations, Skills, Sectors, Regions.
5. Main row: scatter-based Skill Gap Landscape, a real state/UT choropleth plus compact ranking, and a right-side Key Insights rail.
6. Lower row: Top Skills by Gap table and optional Supply–Demand Flow panel. Flow panel must show an honest unavailable state if no valid flow data exists; do not fabricate a Sankey.
7. Compact provenance/coverage/freshness strip.

Do not copy the Demand/Supply page composition. Do not increase the number of KPI cards or create new global navigation patterns. Use shared tokens/components.

## Data and interactions

Build one page controller/hook and one typed adapter interface. Leaf components must not perform ad-hoc network fetches. Support a deterministic typed mock adapter for preview and a REST adapter compatible with `SHRAMIK_SKILL_GAP_ANALYSIS_API_CONTRACT.md` (or adapt to existing service interfaces found in the repo). The UI must label all mock values as illustrative.

- Filters: keep draft vs applied filter states, Apply commits a single snapshot and refreshes all relevant panels. Reset uses the API's supported defaults.
- KPI cards: detail drill-down using the existing shared detail drawer or navigation callback.
- Scatter: x=supply, y=demand. Show the parity line only when the units/definitions are comparable. Above line = positive gap/shortage; below = negative gap/surplus. Add legend, keyboard focus, tooltip, table alternative, unit and period. Use a scale compatible with data domains; do not force log axes if zeros/negative values exist.
- Map: use verified/licensed/versioned GeoJSON and join by canonical state/UT code/crosswalk. Never use the screenshot or a PNG as data geography. Metric changes refresh map and ranking consistently. State selection syncs the state filter. Missing/suppressed values are neutral No Data, not low shortage. If verified geometry isn't available, implement an explicit unavailable state and report the blocker rather than substituting a picture.
- Table: API values, stable IDs/codes, server-backed sorting/pagination where required; every row and View All action works.
- Insights: consume source-linked insight responses. Claims must match current filtered metrics. Do not claim AI ran unless a configured grounded service actually generated the response.
- Flow diagram: render only if valid node/link flows exist with compatible units and a documented meaning. Otherwise show informative no-data state.
- Errors in REST mode must never silently fall back to mock mode. Preserve last successful payload as visibly stale if useful.
- Include loading, empty, partial coverage, stale, error/retry, not-comparable and no-geometry states.

## Data semantics

Only calculate `gap = demand - supply` for compatible metrics, geography, horizon, unit and entity definition. Positive = potential shortage; negative = potential surplus. Balanced thresholds and gap percentage formulas must come from backend/config metadata. Do not mix people, job-posting indices, annual training completions and seat capacity. Historical estimate and forecast labels must be distinct. Never transcribe numbers from the visual reference into production values.

## Tests / verification

Add or update tests for filter snapshot consistency, stale-request handling, API errors, gap sign and comparability rules, map code join/missing state behavior, mock labeling and insight evidence. Use installed test stack; don't add unnecessary packages.

Actually run whichever checks exist (typecheck, lint, tests, build). Browser-test or screenshot-check if available. Review at 1440, 1024, 768 and 390 CSS px without horizontal overflow. Report exactly what was run; don't claim unrun checks passed.

## Report when finished

Return:
1. Files created/changed and suggested integration import.
2. Shared components reused, particularly shell/sidebar/topbar.
3. Adapter methods/endpoints connected and backend gaps.
4. Map geometry source, license, version and code crosswalk.
5. Tests/build/browser widths actually executed and results.
6. Remaining blockers and assumptions.

Implement the page now. Do not stop after writing another plan.
