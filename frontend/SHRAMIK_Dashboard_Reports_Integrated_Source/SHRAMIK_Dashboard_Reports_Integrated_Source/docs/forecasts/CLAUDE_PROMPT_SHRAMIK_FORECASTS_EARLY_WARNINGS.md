# Claude Code Prompt — SHRAMIK Forecasts & Early Warnings

You are implementing the **Forecasts & Early Warnings** page for the existing SHRAMIK Labour Market Intelligence System. Implement it as **one independent React + TypeScript page module with five internal views**. The frontend team will integrate this module into the full application later.

## Before changing anything

1. Inspect the existing repository tree, package scripts, router, shared app shell, sidebar/topbar components, design tokens, chart/map libraries, API adapter patterns, auth/permission system and test setup.
2. Reuse existing components and project conventions. Do not create a second Vite app, duplicate the sidebar/topbar, replace dependencies unnecessarily, or introduce a new design system.
3. Read the supplied `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`, `SHRAMIK_DASHBOARD_SPEC.md`, `SHRAMIK_COMPONENT_INVENTORY.md`, `SIDEBAR_CONSISTENCY_LOCK.md`, `SHRAMIK_FORECASTS_EARLY_WARNINGS_IMPLEMENTATION_SPEC.md`, `SHRAMIK_FORECASTS_EARLY_WARNINGS_API_CONTRACT.md` and `FORECAST_DATA_SEMANTICS.md` before coding.
4. Use `reference/SHRAMIK_Dashboard_Reference.png` as the authority for shared shell. Use `reference/Forecasts_Five_View_Design_Board.png` as the visual guide for the five internal views. The board is not a single page containing all panels at once.

## Non-negotiable shell rules

- Use the existing application topbar and sidebar as-is.
- The sidebar order is Dashboard, Demand, Supply, Skill Gaps, Forecasts, Emerging Skills, Scenario Simulator, Reports, divider, Data Sources, Data Quality.
- `Forecasts` is the active global sidebar item. Do not add Risk Radar, Scenarios, Performance or Alerts as global navigation items.
- Preserve the existing sidebar width, icon box sizes, row height, spacing, active yellow treatment, worker illustration, mission note, responsive collapse, topbar dimensions, dotted background, typography and card tokens. Read the values from the repository; do not create overrides to approximate them.
- Do not add unapproved sidebar links such as Data Explorer, User Management, Access Requests or Settings.

## Required implementation

Build one page/workspace with accessible internal tabs:
1. Forecast Overview (default)
2. Risk Radar
3. Scenario Analysis
4. Model Performance
5. Alert Management

Keep common filters at the top and preserve relevant filter/selection state when switching views. The selected view should determine which main content is displayed; do not render all five views simultaneously.

### Forecast Overview
- Four data-driven KPI cards: projected demand, projected supply, projected gap (shortage/surplus sign handled correctly), and count of high-risk occupations.
- Large historical-versus-forecast demand/supply chart. Historical segments solid, forecast segments dashed, uncertainty intervals only when real lower/upper values and interval level are supplied.
- Early Warning Alerts rail with severity/category, entity, region, expected horizon, and status.
- Top occupations by projected shortage and a compact model-reliability/data-history summary.
- Clicking an alert opens the detail/“Why this warning?” drawer; View All changes to the Alert Management tab.

### Risk Radar
- State/region × occupation/sector/skill matrix from adapter response; grouping selector only offers types supported by data service.
- Use real, verified state/UT GeoJSON keyed by canonical codes for the map. Never use generated/raster map art as a data map. If geometry/data cannot be joined safely, provide ranking/table fallback and a clear map-unavailable state.
- Selecting a cell updates details: demand, supply, signed gap, unit, forecast period, severity rule, provenance, source coverage, evidence and assumptions.
- No-data state must not look like low risk or balance; provide keyboard and table alternatives.

### Scenario Analysis
- Compare Baseline, Higher Growth and Lower Growth (or the scenarios returned by the service).
- Scenarios use backend outputs and documented assumptions. They are conditional scenarios, not guaranteed predictions.
- This is not the same as the separate Scenario Simulator: do not duplicate training-capacity, training-lag or intervention-start-date controls unless those are already part of the approved Forecasts contract.

### Model Performance
- Actual-versus-predicted backtest with named evaluation window/horizon.
- Show only returned metrics with units/definitions; do not fabricate accuracy or confidence scores. Do not show MAPE where it is unsuitable without explanation.
- Show usable data-history coverage, missing-period notes, model/version/evaluated-through metadata and limitations.
- For insufficient history, show why forecast is unavailable rather than inventing results.

### Alert Management
- Data-driven search/filter/sort/pagination and counts for status/severity.
- Detail view: key factors, data evidence, assumptions/limits, forecast horizon and timeline.
- Implement permitted acknowledge, assign, note and status actions using backend mutations and existing role checks. Do not display success until server confirmation; handle pending/failure/retry and audit state.
- Keep the expected time horizon of the risk separate from the alert workflow's review history.

## Architecture / data integrity

- Use an injected `ForecastsDataAdapter` or the app's existing equivalent. Presentational components do not contain API URLs, business calculations or hard-coded production data.
- Create/reuse typed REST and deterministic mock adapters. REST adapter is used only when the application is configured for it. API errors must not silently fall back to mock fixtures.
- Label all mock-mode output visibly and set provenance to `mock`.
- Use the API contract as a proposal and reconcile paths with existing backend conventions before implementing requests.
- `gap = demand - supply` only if definitions, target population, geography, unit and period are compatible. Positive means potential shortage; negative means potential surplus; show unavailable when incomparable.
- Render uncertainty bands only when actual interval bounds and semantics are returned.
- Risk thresholds, alert severity, contributions and recommendations must be returned by configured analytic rules/services; never invent them in the UI.
- Use canonical region/entity codes, not fuzzy labels, for joins.
- Use abort signals/request IDs so stale filter responses cannot overwrite current selections.
- Every visible control must work or be visibly disabled with explanation. Implement loading, empty, partial, error, retry and permission-denied states.

## Design / accessibility

- Use the global Civic Intelligence design: fixed warm off-white dotted canvas, bold condensed headings, ink outlines, yellow interaction accents, restrained navy/orange/teal, moderate whitespace and subtle hard-offset shadows.
- No new dark theme, excessive gradients, flashy motion, scroll hijacking, or floating cards.
- Use existing design tokens and responsive breakpoints. Reduce layouts on tablet/mobile without changing the conceptual hierarchy.
- Respect `prefers-reduced-motion`; ensure keyboard access, labelled controls, visible focus, adequate contrast, and accessible tab/chart/map alternatives.
- Keep decorative parallax limited to artwork; never parallax text, chart marks, cards or controls.

## Deliverables

1. Implement the page module and subordinate components in the existing repo following its file naming conventions.
2. Implement/extend the typed adapter and mock fixtures; document REST service boundaries and required API endpoints.
3. Add unit/component tests using the project's existing framework.
4. Add an integration note showing how the host app registers the page route and provides the adapter/auth context.
5. Update the component inventory only if new reusable shared components are added.
6. Run typecheck, lint, tests, build and browser/viewport checks where available. Report the real results and any blocked checks honestly.
7. Do not claim production data integration unless a real backend was configured and exercised.

## Done means

The page is independently implementable and can later be mounted into the SHRAMIK app without redesigning the shared shell. All five views work from the same adapter/filter state; visual styling matches the supplied references; the sidebar stays unchanged; and no mock metric, risk score, map value, scenario result or model metric is presented as source-backed data.
