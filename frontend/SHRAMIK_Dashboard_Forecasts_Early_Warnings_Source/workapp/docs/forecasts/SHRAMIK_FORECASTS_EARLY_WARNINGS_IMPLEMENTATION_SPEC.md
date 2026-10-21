# SHRAMIK — Forecasts & Early Warnings: Implementation Specification

**Document ID:** SHRAMIK-PAGE-FORECASTS-001  
**Page model:** one React page/workspace with five internal views  
**Suggested route:** `/forecasts` (confirm existing route naming before registering)  
**Default internal view:** Forecast Overview  
**Integration target:** existing SHRAMIK React + TypeScript application; do not scaffold a second app.

## 1. Purpose

Enable an analyst or planner to inspect demand/supply forecasts, investigate early-warning signals, compare defined alternative assumptions, assess forecast performance and manage alert follow-up. The page should express uncertainty and evidence instead of making forecasts look deterministic.

The product loop for this page is: **Detect → Explain → Investigate → Compare → Act**.

## 2. Shared shell and page hierarchy

The existing app shell owns the topbar and sidebar. This page owns only its content area.

Within the content area:
1. Breadcrumb/title row: `Forecasts & Early Warnings`, short explanatory copy and restrained decorative hero art.
2. Common filter row: time horizon, geography/state where supported, sector, occupation, skill, Apply and Reset.
3. Internal tab bar: `Forecast Overview`, `Risk Radar`, `Scenario Analysis`, `Model Performance`, `Alert Management`.
4. Only the selected view's main content is mounted/rendered as active. Do not stack all five views on the same screen.
5. Shared loading/error/data-status presentation remains consistent across views.

Filters should persist when switching tabs. The selected view may be represented in local state and optionally in a query parameter (e.g. `?view=risk-radar`) if it follows existing router conventions.

## 3. Forecast Overview (default)

### Top KPI row
Four compact cards in the approved desktop row:
- **Projected Demand** — value, unit, forecast year, change vs comparison period where comparable.
- **Projected Supply** — compatible unit and geography/period.
- **Projected Gap** — calculated using the documented gap sign convention; label as shortage or surplus based on sign.
- **High-Risk Occupations** — count of distinct occupations meeting configured, returned alert criteria; include severity/rule metadata.

Cards source values from the same active filter state and overview endpoint. Click opens a detail drawer or relevant internal view. Never hard-code demo KPI data in components.

### Main row
- **Demand & Supply Forecast** (large, left): historical demand/supply as solid lines; forecast segments as dashed lines; uncertainty intervals when supplied; clear historical/forecast divider; units on axes; tooltip with period, estimate, interval and provenance; selectable horizon and supported series grouping.
- **Early Warning Alerts** (right): compact prioritised list with severity, alert type, affected entity/region, expected horizon and status. Clicking opens the alert detail/“Why this warning?” drawer. `View all` switches to Alert Management with current filters.

### Supporting row
- **Top Occupations by Projected Shortage**: ranked list/table sourced by adapter. Demand, supply, signed gap, relative gap only when denominator is meaningful, projected horizon, and trend. Each row opens details.
- **Forecast Reliability Summary**: show data-history coverage, model validation metric(s), interval/uncertainty status, last evaluated period and limitation. Use only metrics supplied by the model performance service. `View details` opens Model Performance.

## 4. Risk Radar view

Purpose: identify where forecast risk clusters by region and occupation/sector/skill.

Components:
- Heatmap/matrix with canonical geography rows and selected entity columns, or the reverse if it makes the table more legible at the current breakpoint.
- User-selectable grouping (Occupation / Sector / Skill) when the backend provides the corresponding matrix.
- Semantic legend that distinguishes high/moderate shortage, approximate balance, moderate/high surplus, and no data. Exact thresholds come from backend metadata/configuration; do not invent thresholds in UI code.
- Selected region map panel based on real state-boundary GeoJSON keyed by canonical state/UT code. State fill uses the selected metric/risk class. A generated PNG is not acceptable for data shading.
- Selected-cell detail: demand, supply, signed gap, gap percentage where valid, forecast year/horizon, severity/rule crossed, provenance, source coverage and short evidence explanation.
- Selecting a cell updates the selected-region/occupation details and forecast mini-chart. Keyboard navigation and accessible table alternative are required.

If state geometry or per-state observations are unavailable, show a ranked regional table and an honest map-unavailable state; do not fabricate a map.

## 5. Scenario Analysis view

Purpose: compare conditional assumptions around a forecast. It must not duplicate the Scenario Simulator's skilling-intervention workflow.

Components:
- Baseline, Higher Growth and Lower Growth scenario selector.
- Select occupation/sector/region and horizon using common filters.
- A comparison chart with scenario-specific demand/supply or gap lines and uncertainty intervals when provided.
- A compact assumptions panel: parameter, current/base value, alternative values, unit, and source/owner. Only parameters explicitly supported by the backend may be editable.
- Impact summary: change in projected gap by year, displayed as a scenario comparison and labelled conditional—not a prediction.
- `Reset to baseline` and `Compare` must be functional. Validation prevents nonsensical assumptions and returns clear messages.

Do not use independent fabricated constants for the scenario chart. Use `getScenarioComparison` or the app's existing forecasting/scenario service.

## 6. Model Performance view

Components:
- Actual-versus-predicted historical backtesting chart, with evaluation window and forecast horizon stated.
- Metric cards/table for available metrics such as MAE, RMSE, MAPE or other adopted measures. Unit and definition are shown; MAPE is not displayed when zero/small actual values make it unsuitable.
- Data-history coverage timeline: usable observation count, missing periods and coverage gaps.
- Model/evaluation metadata: model/version, trained/evaluated-through date, geography/series scope and chosen baseline.
- Methodology and limitation panels; make it clear that backtest performance is historical evidence, not a guarantee of future accuracy.
- If a series lacks the minimum history/eligibility required by the backend, show `Forecast unavailable` with the reason instead of inventing a score.

No score such as “Forecast Confidence 65%” may be displayed unless its semantics are defined, its calculation is supplied, and the API provides it. Do not transform arbitrary error metrics into a percentage confidence score.

## 7. Alert Management view

Components:
- Search and filters for status, severity, alert type, region, occupation/skill and time horizon.
- Summary counts by status/severity from the service response.
- Table/list with alert ID, title/entity, severity, region, expected horizon, rule/trigger, status, assigned owner, created/updated date and permitted actions.
- Detail drawer with Why this warning? tabs/sections: Key Factors, Data Evidence, Assumptions & Limits, Timeline, Recommended Review Actions.
- Actions as allowed by role: acknowledge, assign/reassign, add note, update status, resolve/reopen. Actions require backend mutations, confirmation where appropriate, pending/error feedback and audit history.
- Alert timeline distinguishes the *forecast's expected risk horizon* from the *workflow's review status history*.
- Tabs/counts update from returned data; do not simulate server success with only a toast.

## 8. Common controls and state behaviour

- Common filters have one committed query state. Before `Apply`, users may stage changes locally. Apply sends one consistent filter set to the relevant endpoint(s); Reset restores service-supported defaults.
- Use abort/cancellation or request IDs so a slower response for old filters cannot overwrite newer results.
- Loading state keeps layout dimensions stable. Errors include retry. Empty/no-risk state differs from service failure. Partial data shows a partial-coverage notice.
- Do not silently fall back from failed REST calls to mock fixtures.
- Mock mode is explicit in the page's data-source/provenance status; every illustrative value includes mock provenance.
- Format values from API-provided unit/scale metadata rather than guessing millions/thousands.

## 9. Data semantics and visual encodings

See `FORECAST_DATA_SEMANTICS.md`. In brief:
- `gap = demand - supply` only when definitions, geography, period, unit and target population are comparable.
- Positive gap denotes shortage; negative gap denotes surplus; zero/within configured tolerance denotes approximate balance.
- Historical and forecast segments must be visually distinct.
- Uncertainty bands require lower/upper interval data and a documented interval level; never synthesize a band.
- No-data is visually distinct from low risk/supply.
- Severity and timing are service-calculated outputs backed by explicit rule metadata.
- All metrics expose provenance, source label(s), observation/forecast period, units and updated/evaluated time when available.

## 10. Visual and responsive rules

- Reuse the approved fixed dotted canvas, existing shared topbar/sidebar, global type styles, borders, card radii, colours and focus treatment.
- Do not create a second sidebar, second design token sheet, or page-specific topbar.
- The five tabs are inside the Forecasts content area only; they are not global navigation items.
- Desktop: Overview uses 4 KPIs, forecast chart + alert rail, then occupations + reliability summary. Advanced tabs use their own focused layouts.
- Tablet: preserve logical order; stack charts/panels when insufficient width.
- Mobile: compact controls, accessible horizontal tab scroll or wrapped tab set, single-column content, no viewport-level horizontal overflow.
- Dotted canvas remains stable; only decorative art may use subtle parallax. Follow `prefers-reduced-motion`.

## 11. Acceptance criteria

- One page/module, five internal views, one route and no duplicate sidebar.
- All controls do meaningful work; no dead View All, horizon, tab or alert actions.
- Active filters are applied consistently across related components.
- Forecast series, risk matrix, selected-cell detail, alerts and performance metrics come from the adapter.
- Map values join canonical state codes to accurate GeoJSON; no raster-mocked data layer.
- Mock/synthetic data is labelled and never silently presented as real.
- Data limits, units, provenance and uncertainty are visible.
- Keyboard, focus, screen reader labels, contrast and reduced-motion states are checked.
- Build, typecheck, tests and real-browser screenshots run in the target repository; results are recorded accurately.
