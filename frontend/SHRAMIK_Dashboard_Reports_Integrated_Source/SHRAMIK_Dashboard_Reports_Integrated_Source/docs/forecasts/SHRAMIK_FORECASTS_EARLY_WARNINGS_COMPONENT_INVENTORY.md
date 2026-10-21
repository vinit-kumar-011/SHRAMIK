# Forecasts & Early Warnings — Component Inventory

| Component | Data source / adapter method | Behaviour |
|---|---|---|
| Shared shell (topbar/sidebar) | Existing SHRAMIK app | Reuse unchanged; Forecasts active in global sidebar. |
| Forecast filters | `getFilterOptions()` | Stage filters, Apply as one set, Reset to supported defaults; persist across tabs. |
| Five-view tab bar | Local/router state | Switches visible internal content; not global nav. |
| Forecast KPI cards | `getOverview(filters)` | Projected demand, projected supply, projected gap, high-risk occupations; click to details. |
| Forecast timeline | `getSeries(filters, viewBy)` | History solid, forecast dashed, interval bands from actual bounds; tooltips and table alternative. |
| Early Warning feed | `getWarnings(filters)` | Prioritized cards with category, severity, entity, geography and expected horizon. |
| Why-this-warning drawer | `getAlertDetail(id)` / `getRiskDetails(...)` | Key factors, evidence, assumptions/limits, rule/threshold and action links. |
| Risk matrix | `getRiskMatrix(filters, entityType)` | Select occupation/sector/skill grouping and cell; keyboard-operable matrix. |
| State risk map | `getStateRiskMap(filters, entityType)` + verified GeoJSON | Canonical-code join; no-data distinct; table fallback if geometry unavailable. |
| Selected risk detail | `getRiskDetails(filters, regionCode, entityCode)` | Demand/supply/gap, horizon, provenance and supporting mini-chart. |
| Scenario selector | `getScenarioOptions(filters)` | Lists supported scenarios/assumptions; editable only when service supports. |
| Scenario chart | `compareScenarios(filters, scenarioIds)` | Baseline/high-growth/low-growth or returned set; conditional comparison. |
| Model performance chart | `getModelPerformance(filters)` | Actual vs predicted backtest with evaluation window. |
| Model metric panel | `getModelPerformance(filters)` | Metric definition/unit/suitability; no fabricated confidence percentage. |
| Coverage timeline | `getModelPerformance(filters)` | Usable history and missing periods. |
| Alert management table | `getAlerts(filters, params)` | Search, filter, sort, paginate, status counts, detail open. |
| Alert mutation controls | `acknowledgeAlert`, `updateAlert`, `addAlertNote` | Server-confirmed acknowledge/assign/status/note actions with permission checks. |
| Alert timeline | `getAlertDetail(id)` | Review/workflow history, separate from expected-risk horizon. |
| Provenance/status label | Shared response metadata | Mock/source-backed/derived/forecast/mixed, update time and coverage. |

Prefer existing shared metric cards, tabs, tables, chart wrappers, drawers, alert badges and map components before adding new shared primitives. The API names are proposals; adapt to existing service contracts if equivalent functions already exist.
