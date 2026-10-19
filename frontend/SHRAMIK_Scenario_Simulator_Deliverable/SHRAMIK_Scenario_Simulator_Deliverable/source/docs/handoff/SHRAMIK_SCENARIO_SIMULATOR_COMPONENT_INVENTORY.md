# Scenario Simulator — Component Inventory

| Component | Responsibility | Data/adapter boundary | Key interaction/states |
|---|---|---|---|
| `ScenarioSimulatorPage` | Compose the feature page; do not own global shell in production integration | Receives adapter + optional initial scope | Renders loading/error/ready state; selected internal view |
| `ScenarioHeader` | Breadcrumb, title, concise explanation, optional scenario provenance | Host route + current run metadata | No page-specific topbar/sidebar |
| `ScenarioScopeStrip` | Show selected skill/occupation, geography, baseline and evaluation year | Selected configuration and baseline metadata | Selection changes mark prior run stale |
| `EntityModeToggle` | Switch between skill and occupation mode | `getOptions({ entityType })` | Clear invalid prior entity only with explanation |
| `EntitySearchList` | Search/select canonical skill/occupation | `searchEntities()` or `getOptions()` | Debounced/cancellable search, empty/error/selected states |
| `InterventionForm` | Group scenario controls and validation | `getConfigurationOptions()` and model limits | Controlled values, reset, field/cross-field validation |
| `AdditionalSeatsInput` | Additional annual seats numeric field + slider | Adapter limits/step/unit | Synced controls; no silent clamping |
| `TrainingLagInput` | Training lag in displayed years | Adapter accepts supported unit; DB proposal stores months | Unit clear; validation; integer month conversion if required |
| `InterventionStartInput` | Start year/date | Supported input window from baseline/model metadata | Cannot select unsupported dates |
| `EvaluationYearSelector` | Select year for outcome cards and regional map | Returned run horizon | Separate from start year and chart horizon |
| `GeographyScopeSelect` | Choose supported geographic scope | Adapter options | Changing scope invalidates/revalidates run inputs |
| `AdvancedAssumptions` | Optional, model-supported conversion/participation assumptions | Backend-provided schema/capabilities | Do not expose unsupported parameters as active controls |
| `RunSimulationButton` | Submit current valid draft once | `runSimulation()` | Validating/submitting/queued/failure; duplicate click blocked |
| `SimulationStatusBanner` | Explain run state, stale state, provenance and quality warnings | Run metadata | Retain input; retry only when safe |
| `OutcomeKpiGrid` | Four outcome cards for selected evaluation year | `getResults(runId, 'overview')` | Click opens definition/detail when supported |
| `DemandSupplyProjectionChart` | Compare baseline and scenario by period | Result series from API | Selectable legend/tooltips; same demand if supply-only intervention |
| `RegionalImpactPreview` | Choropleth summary on primary view | GeoJSON/geometry + regional output metrics | State selection/drill-down; no-data visual state |
| `RegionalImpactView` | Full map + table | `getResults(runId, 'regional-impact')` | Metric selector, selected region, sort/page controls |
| `SectorBreakdownView` | Compare impact by sector | `getResults(runId, 'sector-breakdown')` | Filter/sort; only supported sectors enabled |
| `OccupationImpactView` | Occupation-level impact | `getResults(runId, 'occupation-impact')` | NCO identifier; drill-down if supported |
| `SensitivityAnalysisView` | View server-produced runs/curves varying declared parameters | `runSensitivity()` or backend sensitivity result | Must recompute through service; list fixed/varied assumptions |
| `ResultsViewTabs` | Internal navigation across five result views | Local state + run ID | One content view visible at a time; keyboard support |
| `ResultProvenancePanel` | Source, model/version, run time, data coverage, uncertainty | Run/result metadata | Distinguish `SOURCE_BACKED`, `MIXED`, `SYNTHETIC_DEMO` |
| `BaselineScenarioLegend` | Explain line style, metric and scope | Chart series metadata | Accessible style differences; not color-only |
| `MockScenarioSimulatorAdapter` | Deterministic demo service for local UI development | Local fixtures only | Must label results illustrative; unit tests for state/shape |
| `RestScenarioSimulatorAdapter` | Call configured SHRAMIK API | Versioned REST contract | Propagate HTTP/network errors; no silent mock fallback |

## Shared components to reuse

- Canonical app shell, sidebar, topbar, logo, search, notifications/profile controls.
- Global dotted-canvas background and typography tokens.
- Shared buttons, select/input, cards, badges/status, tooltips, tabs, table, drawer/modal, loading skeleton and error/empty-state components.
- Existing chart wrapper where available; use the repo-approved graph/map library rather than adding duplicate packages.
