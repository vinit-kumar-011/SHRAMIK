# Claude Code Prompt — Implement SHRAMIK Demand Insights

You are the senior frontend engineer working inside the **existing SHRAMIK repository**. Implement the Demand Insights page in the existing React + TypeScript application. Do not merely write a plan: inspect the project, make the page changes, connect every visual component to the appropriate adapter contract, run available checks, and report exact files changed and remaining blockers.

## Read these files before editing

1. `SHRAMIK_DEMAND_INSIGHTS_IMPLEMENTATION_SPEC.md` — page structure and behaviour.
2. `SHRAMIK_DEMAND_INSIGHTS_API_CONTRACT.md` — data/API contracts, including regional geometry.
3. `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md` — canonical visual system.
4. `SHRAMIK_DASHBOARD_SPEC.md` — existing dashboard shell and structure.
5. `SHRAMIK_COMPONENT_INVENTORY.md` and `DESIGN_LOCK.md` — shared components and visual rules.
6. `SIDEBAR_CONSISTENCY_LOCK.md` — explicit sidebar decision.
7. `reference/SHRAMIK_Demand_Insights_Reference.png` — Demand Insights content layout reference.
8. `reference/SHRAMIK_Dashboard_Reference.png` — global Dashboard layout/sidebar reference.

## First inspect the actual repository

Before creating or editing files, inspect `package.json`, routing, current app shell, topbar/sidebar components, design tokens, current chart/map dependencies, data API clients, auth/session patterns, and tests. Reuse the existing app and its conventions. **Do not create a second Vite/React app, duplicate shared components, replace the design system, or add dependencies before checking what is already installed.** If paths in the spec differ from the repository, adapt to the repository and report the mapping.

## Non-negotiable visual/sidebar rules

- Implement the page as the `/demand` route, or use the project's existing route convention if it differs.
- The content heading is `DEMAND INSIGHTS`.
- **Reuse the exact shared sidebar component from the Dashboard.** This is a specific consistency decision. Preserve its labels/order, spacing, width, icons, active styles, bottom worker illustration and mission note. Its items are: Dashboard; Demand (active); Supply; Skill Gaps; Forecasts; Emerging Skills; Scenario Simulator; Reports; divider; Data Sources; Data Quality.
- Do **not** use the sidebar variation in the Demand Insights concept image. Do not rename the `Demand` nav item to `Demand Insights`; the page heading is `DEMAND INSIGHTS`. Do not add Data Explorer, User Management, Access Requests or Settings to this sidebar based on the mockup. Do not build a one-off sidebar.
- Reuse the existing topbar too: logo lockup, global search, notifications and signed-in profile must remain consistent with the Dashboard.
- Use the global dotted canvas as a subtle CSS background layer, not as a flattened screenshot. Preserve the Civic Intelligence palette and typography tokens. Use only restrained desktop parallax for decorative art; never move cards, filters, charts or controls independently. Respect `prefers-reduced-motion`.
- Keep the approved content order: intro/illustration; six filters with Apply and Reset; exactly four KPI cards; Demand Trend next to Demand by Region; then Top Occupations, Top Skills and Demand Insights narrative. Do not add new panels or increase KPI count without approval.
- The reference image is a design reference, not a source of real figures. Do not transcribe its example values as factual data.

## Functional implementation scope

### State and filter lifecycle

Create/reuse a typed page controller or hook. Maintain separate `draftFilters` and `appliedFilters`. Load filter options through the shared adapter. Only Apply commits the toolbar draft and refreshes all panels under one consistent applied filter snapshot; Reset returns to API-supported defaults. A state selected on the map is an explicit drill-down: update the state selector and immediately reapply the current filter set. Cancel/ignore stale requests so older responses cannot overwrite newer selections. Keep previous successful data visible with a clear stale/refresh error message on failed re-fetch; never silently switch to mock data after a REST failure.

### KPI cards

Build four reusable, accessible cards from API responses: Total Estimated Demand, Observed Job Postings or Job Posting Index (choose the correct label from the actual unit), High-Demand Occupations, and High-Demand Skills. Values, units, periods, deltas, trend sparkline points and provenance come from the adapter. Never label an index as millions. Do not invent deltas if comparison data is missing. Each card needs loading, valid zero, unavailable, stale/error and details states.

### Demand trend graph

Use the existing chart library (prefer the repository's current wrapper/Recharts if already installed). Make the graph a functioning chart, not a static image. Show historical observations as a solid navy line, forecasts as a dashed line, and an uncertainty band only if lower/upper bounds are supplied. Include accessible tooltip details, unit/period labels, clear forecast boundary, and an accessible table/text alternative. Never make up forecast points or confidence intervals.

### Regional map — must be real geometry

Implement a real state/UT choropleth using versioned GeoJSON or the repository's existing mapping stack. Do **not** use `public/assets/india-map-illustrative.png` or any raster picture as the data map. Load state metrics from the data adapter and join features by canonical state/UT code—not display name. Include the boundary source, license, version and code crosswalk as documented metadata. Use a metric colour scale and legend for the selected regional measure. A state hover/focus shows name, value, unit, rank, share only if returned, period, source and provenance. Click or keyboard activation selects the state and synchronizes the state filter; regional ranking updates under the same filter snapshot. Missing or suppressed states must use a neutral treatment and be labelled missing/suppressed, never interpreted as low demand. Include loading, error/retry, no geometry, empty coverage and no-data states. If no verified geometry is present and a verified asset cannot be added responsibly, show an explicit unavailable state and report this blocker; do not substitute the illustrative PNG.

### Regional ranking, occupation and skill tables

Values, ordering, units, stable NCO codes/version, skill taxonomy/version, growth and trends come from the adapter. Metric selector updates regional rankings. All rows and View All actions must open a meaningful detail view/route or use the agreed shared navigation handler—no dead buttons. Table sorting and pagination should be server-backed when the API contract requires it.

### Demand insights narrative

Render evidence-backed insights returned by the adapter. Each numeric or comparative claim must reference current response values/source IDs. Do not hardcode AI-generated claims in the component. If AI/rule-based insight generation is not configured, show an honest unavailable state or a clearly labelled deterministic mock insight only in mock mode. No claim should suggest AI actually ran if it did not.

### Data adapter and provenance

Reuse an existing API client/service if one exists. Otherwise implement the adapter described in `SHRAMIK_DEMAND_INSIGHTS_API_CONTRACT.md`, with a separate typed mock adapter for local preview. All components call the adapter/hooks rather than putting individual `fetch()` calls inside cards. Source-backed, derived, mixed and mock data must be visibly distinguishable. Every applicable view should show units, selected period, source/provenance and last update. In REST mode, API failure must never trigger a silent mock-data fallback.

## Quality and acceptance checklist

- The current dashboard route still renders and its sidebar/topbar are not changed unintentionally.
- Demand route shares that exact shell; `Demand` is the active sidebar item.
- Filters consistently update the four KPIs, trend chart, map, regional ranking, occupation table, skills table and insight panel.
- Trend graph uses real chart primitives and accessible tooltips/table alternative.
- Map uses real GeoJSON + canonical code join; clicking a state applies a regional filter; no PNG is used as data geography.
- All visible buttons, dropdowns, rows and View All controls have meaningful behaviour.
- Loading, empty, stale, error and retry paths are implemented where applicable.
- Responsive layouts checked at 1440, 1024, 768 and 390 CSS pixels without horizontal overflow.
- Keyboard focus, labels, contrast, reduced-motion and chart/map accessible alternatives are checked.
- Mock values are explicitly labelled; no screenshot numbers are represented as verified results.
- Run the scripts that actually exist in `package.json` (typecheck, tests/lint/build as available). Do not claim a check passed unless you ran it.
- Add/update tests and update the component inventory only where needed. Keep changes limited to Demand Insights and reusable components genuinely required by the existing dashboard.

## Finish by reporting

1. Files created/modified.
2. Which shared components were reused (especially sidebar/topbar).
3. Which adapter endpoints are connected and which backend endpoints are missing.
4. Map geometry source, license, version and state-code join used.
5. Tests/build/browser widths actually run and their results.
6. Any blockers that stop a real data-backed page from working.

Start by inspecting the repository. Then implement the page.
