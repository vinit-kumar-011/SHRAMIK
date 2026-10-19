# Forecasts & Early Warnings — QA Checklist

## Layout / shared shell
- [ ] Uses the existing SHRAMIK topbar and sidebar; no duplicate shell.
- [ ] Sidebar label stays `Forecasts`; Forecasts is the active global item.
- [ ] Sidebar order, width, icon sizing, row spacing, artwork and mission note match Dashboard.
- [ ] Five internal views exist inside the same page; no new global navigation entries.
- [ ] Only selected view is active at a time.
- [ ] Dotted canvas, colour/type tokens, border and card styling reuse the global system.
- [ ] Desktop/tablet/mobile screenshots reviewed against the reference and current app shell.

## Shared filters / internal tabs
- [ ] Filters can be staged and applied as one consistent set.
- [ ] Reset returns to backend-supported defaults.
- [ ] Filter state survives tab changes where relevant.
- [ ] Stale requests cannot overwrite newer selections.
- [ ] Keyboard users can select tabs and reach all controls.

## Forecast Overview
- [ ] KPI values and delta calculations are adapter-sourced.
- [ ] Gap uses a documented compatible measure and sign convention.
- [ ] Historical lines and forecast segments are visually distinct.
- [ ] Uncertainty bands are only rendered when returned by model service.
- [ ] Chart tooltips include period, unit and applicable source/provenance detail.
- [ ] Alert click opens Why-this-warning detail; View All switches to Alerts view.
- [ ] Occupation table and reliability summary show loading/error/empty/partial-data states.

## Risk Radar
- [ ] Matrix is driven by returned risk cells and service/configured class thresholds.
- [ ] Selecting a cell updates region/entity details and the forecast mini-chart.
- [ ] Real state geometry joins data by canonical code.
- [ ] No-data is neutral and not confused with balanced or low risk.
- [ ] Accessible table alternative is provided for the matrix/map.

## Scenario Analysis
- [ ] Scenario names and assumptions come from the supported service contract.
- [ ] Baseline/higher/lower comparison values are not hard-coded in presentation components.
- [ ] Conditional scenarios are clearly identified as assumptions, not predictions.
- [ ] Invalid values show field-level validation; reset/compare works.
- [ ] Does not duplicate the training-capacity/intervention simulation in Scenario Simulator.

## Model Performance
- [ ] Actual and predicted series use a documented backtest period/horizon.
- [ ] Metric units and definitions are visible.
- [ ] MAPE is omitted or explained if unsuitable.
- [ ] No invented confidence percentages or metrics are shown.
- [ ] Insufficient history yields an explicit unavailable reason.

## Alert Management
- [ ] Search/filter/status counts are data-backed.
- [ ] Actions are permission-aware and mutate through the backend.
- [ ] UI only confirms mutation after server success.
- [ ] Assignment, notes and status changes appear in audit timeline when backend supports them.
- [ ] Expected-risk timeline is not confused with workflow history.

## Accessibility / resilience / delivery
- [ ] Inputs have labels and errors are announced.
- [ ] Visible focus and contrast pass checks.
- [ ] No chart depends on colour alone; tooltips and tables are available.
- [ ] `prefers-reduced-motion` is respected.
- [ ] API errors do not silently switch to mock data.
- [ ] Production build and tests pass in the target repo.
- [ ] Browser tests/screenshots completed at representative desktop, tablet and mobile sizes.
- [ ] Real verification results and unresolved gaps are recorded.
