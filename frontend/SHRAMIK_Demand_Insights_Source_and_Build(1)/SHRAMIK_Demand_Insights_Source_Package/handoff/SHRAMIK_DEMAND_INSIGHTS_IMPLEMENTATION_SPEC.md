# SHRAMIK Demand Insights — Component Implementation & Data Contract

**Status:** Implementation specification for review  
**Page route:** `/demand` (adapt to the app's existing route conventions)  
**Stack:** Reuse the existing React + TypeScript application, shared UI components, chart library and app routing. Do not create a second frontend app.  
**Visual authority:** `SHRAMIK_Demand_Insights_Reference.png`  
**Global style authority:** `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`  
**Data rules:** source-backed values must be distinguished from mock, synthetic, derived and mixed-provenance values.

---

## 1. Page purpose and layout lock

Demand Insights helps an analyst answer: **Where is labour demand concentrated, which occupations and skills are being requested, how is demand changing, and what evidence supports these observations?**

Preserve the page structure from the reference:

1. Shared SHRAMIK topbar: compact brand, global search, notifications and signed-in user.
2. Shared left application rail: reuse the exact existing Dashboard sidebar component. The active item is the existing `Demand` navigation entry; keep the page heading `DEMAND INSIGHTS`. Do not implement a page-specific sidebar. The separate sidebar shown in the Demand Insights concept image is NOT authoritative for navigation labels or order.
3. Page heading and one short description, with an understated worker/industrial illustration.
4. Filter bar: period, geography, state/UT, sector, occupation (NCO), skill, Apply Filters and Reset.
5. Exactly four KPI cards.
6. Middle row: Demand Trend on the left; Demand by Region with map and ranked table on the right.
7. Bottom row: Top Occupations by Demand; Top Skills by Demand; Demand Insights narrative panel.
8. Source/provenance and update timestamp.

### Canonical sidebar lock (non-negotiable)

Use the same sidebar component already shown on the approved SHRAMIK Dashboard, with identical width, spacing, typography, icon style, active-item treatment, divider, lower worker artwork and mission note. Keep this exact item order and naming from the Dashboard shell:

1. Dashboard
2. Demand **(active for this route)**
3. Supply
4. Skill Gaps
5. Forecasts
6. Emerging Skills
7. Scenario Simulator
8. Reports
9. Divider
10. Data Sources
11. Data Quality

Do not replace `Demand` with `Demand Insights` in the sidebar. `DEMAND INSIGHTS` remains the page title. Do not add `Data Explorer`, `User Management`, `Access Requests`, or `Settings` from the concept mockup into this sidebar. Do not duplicate the component or alter the shell for this route; import/reuse the real dashboard shell and use the existing navigation mechanism. If the repository currently differs from this item list, report the discrepancy and preserve the explicitly approved Dashboard sidebar rather than inventing a new menu.

The Demand Insights reference image is authoritative for the page's content layout, chart/map placement and panel proportions, but **the existing Dashboard reference and shared application component are authoritative for the sidebar and topbar**.

The background is the persistent CSS dotted canvas. It is not an image. The industrial artwork is decorative only, behind content, and receives subtle parallax only on desktop where motion is allowed. Do not move data cards independently or allow decorative elements to obstruct controls.

### Avoid duplicate metrics

The reference concept repeats total estimated demand in both the small hero callout and the first KPI. Keep the same visual slot, but make the hero callout a short **year-over-year demand change** (e.g. “Demand rose 6.2% vs previous year”) or remove that callout if the page feels crowded. Do not show the same total twice.

---

## 2. Shared page state

Implement a single page controller/hook, e.g. `useDemandInsightsController`, which owns:

- `draftFilters`: values currently selected in the toolbar.
- `appliedFilters`: the exact filter set used to fetch displayed data.
- `overview`: KPI/trend/table/narrative payload and its metadata.
- `regionalMetric`: `estimated-demand | posting-count | demand-growth` (only options supported by the API).
- `regionalData`: state metrics plus legend breaks.
- `geometry`: verified state/UT GeoJSON feature collection and geometry metadata.
- `loading`, `refreshing`, `error`, `partialErrors`, `lastUpdatedAt`, and `requestId`/abort controller.
- `detailTarget`: selected KPI/occupation/skill/state, if a shared drawer/modal is used.

All component reads go through the shared data adapter/service. Do not put `fetch()` calls in individual cards, charts or map components.

### Filter lifecycle

1. Filter options load from the adapter at page entry.
2. Users change `draftFilters`; existing results remain labelled with the currently applied filters.
3. `Apply Filters` validates the combinations, copies the draft to applied state and issues the data reads.
4. The controller cancels/ignores stale in-flight requests. All panels display the same applied filter chips and response snapshot/time.
5. `Reset` returns to the documented defaults and applies them.
6. Clicking a map state sets that state in the filter. Because map selection is an explicit drilldown, it applies the new state selection immediately with the other current draft values and synchronizes the state selector.
7. If a request fails, retain the previous successful result with a clear “Could not refresh — showing previous results” message and Retry. Never silently substitute mock values in REST mode.

Default period must be the latest **complete and supported** period returned by the API, not a hard-coded future year. If the API only provides one year of credible demand observations, do not invent prior-year values.

---

## 3. Global shell and page header

### `AppHeader`
- Reuse the dashboard's compact SHRAMIK lockup, search, notification and profile components.
- Search: debounce keystrokes (about 250–350 ms), cancel stale queries, show loading/no-results/error states, and navigate/open details for typed result kinds. Do not perform client-side fuzzy search across only the five visible rows.
- Notifications: list comes from the shared adapter; mark-read is a server mutation and updates the UI only after success.
- Profile: identity/role comes from the authenticated app session or `/me`; do not hard-code “A. Sharma”.

### `ApplicationSidebar`
- Reuse the approved application shell, not a page-specific copy. Active item is `Demand Insights`.
- Links must route to existing sections. If a destination page is not implemented, do not leave a dead link; route through the host shell's known navigation handler and mark the destination as planned where appropriate.

### `DemandPageIntro`
- Displays breadcrumb, `DEMAND INSIGHTS`, short explanatory copy and the decorative industrial artwork.
- The small callout displays a data-backed comparison such as `+6.2% vs previous period`, with the metric name and comparison period in its tooltip. If no valid comparison exists, show no callout rather than an invented trend.
- Artwork uses `alt=""` when decorative; meaningful content must not exist only inside the image.

---

## 4. Filter bar: exact behaviour

Component: `DemandFilterBar`

| Control | Source | Behaviour |
|---|---|---|
| Time period | API-supported periods | Shows the latest complete supported period by default. Selecting another period changes draft state only until Apply. |
| Geography | Shared region options | National/state/UT scope. The set must match the current data coverage. |
| State / UT | Geography/filter options | Disabled when its parent geography does not require or support it. Options are returned by the API. |
| Sector | Sector taxonomy/options endpoint | Uses stable sector IDs, not only display labels. |
| Occupation (NCO) | Occupation taxonomy/options endpoint | Uses versioned NCO codes. Selecting a specific occupation should not erase unrelated filters. |
| Skill | Skill taxonomy/options endpoint | Uses stable skill IDs and displays human-readable names. |
| Apply Filters | Local UI action → adapter | Applies all draft filters atomically and refreshes all data-backed panels. Disable while submitting if repeat submits could be confusing; show an inline refreshing state. |
| Reset | Local UI action → adapter | Restores defaults and fetches a new consistent overview. |

Dependent controls must refresh when parent filters change. Preserve valid selections; clear only selections that the API confirms are no longer valid. Include a visible summary of applied filters and a “Clear all”/Reset affordance.

---

## 5. KPI cards

Component: reusable `DemandKpiCard`, rendered in the reference order. Numeric values, formatted text, deltas, units and trend data all come from the API response.

### Card A — Total Estimated Demand
- Required fields: `value`, `formattedValue`, `unit`, `period`, `deltaPct`, `comparisonPeriod`, `definition`, `meta`.
- Definition tooltip explains what the estimate represents and whether it is a stock, annual flow, or projected need.
- Click opens an indicator detail drawer with definition, calculation notes, geography, period, coverage, sources and provenance.

### Card B — Job Postings
- **Metric naming rule:** never label an index as millions. If the backend provides an actual de-duplicated posting count, call it `Observed Job Postings` and use a count unit. If it provides an index, call it `Job Posting Index`, show index points and baseline (e.g. baseline = 100), and do not use a people/jobs unit.
- Explain coverage/source limitations where postings only cover a subset of portals/sectors.

### Card C — High-Demand Occupations
- Count distinct versioned NCO occupation groups satisfying the configured high-demand rule.
- Definition/help text must expose the rule, threshold, time period and eligible geography. Never define “high demand” only in UI code.

### Card D — High-Demand Skills
- Count distinct skills meeting the configured threshold in the approved skill taxonomy.
- Display taxonomy/version and signal basis in the detail drawer where available.

### Shared behaviour
- Delta appears only when both current and comparison periods are available and comparable.
- The up/down icon is accompanied by text; colour is not the only signal.
- Each card has loading skeleton, valid zero, unavailable, stale/error and detail-opening states.
- Sparklines are descriptive, have no hidden statistical meaning, and read values from the API.
- KPI cards must not individually re-fetch unrelated data; details use the shared detail adapter method.

---

## 6. Demand Trend chart

Component: `DemandTrendPanel` using the project's standard chart library (reuse Recharts or whichever chart wrapper already exists in the app).

### Data shape

The adapter should return separate actual and forecast points, not a mixed line with no distinction:

```ts
interface DemandTrendPoint {
  period: string; // ISO date or documented year/quarter label
  value: number;
  lowerBound?: number | null;
  upperBound?: number | null;
}
interface DemandTrend {
  metric: 'estimated-demand' | 'posting-count' | 'posting-index';
  unit: string;
  actual: DemandTrendPoint[];
  forecast: DemandTrendPoint[];
  forecastMethod?: string | null;
  meta: DataMeta;
}
```

### Rendering and interaction
- Solid navy line = observed/history; dashed lighter line = forecast; translucent band between `lowerBound` and `upperBound` = forecast interval where supplied.
- A vertical divider labels the point where forecast starts. Never extend the actual line into forecast periods without a distinct visual treatment.
- `View by` changes the chart metric and requests a new trend payload. The y-axis/unit/title update together.
- Hover/focus shows exact period, value, unit, actual/forecast status, interval, source and update status in a tooltip.
- Provide an accessible table or “View data table” alternative with the same points.
- If there are not enough usable historical observations for forecasting, render history only and state that forecasts are unavailable. Do not draw a guessed forecast.
- Do not duplicate period labels (the reference mock image currently has a duplicated year); each plotted period must be unique and ordered.

---

## 7. Demand by Region — how the map works

Component: `DemandRegionPanel` with `IndiaStateChoropleth` plus the adjacent ranked table. **The raster PNG is decoration only and must not be used to colour real data.**

### Geometry layer
- Use a verified, versioned GeoJSON FeatureCollection of state/UT boundaries, served locally (e.g. `/geo/india-states.geojson`) or bundled by the app. Record source, boundary vintage, licence/usage notes and geometry version in project docs.
- Each feature must contain a canonical join key such as `properties.stateCode`. Use the same exact key in the metrics response; do not join by fuzzy state-name strings.
- If the data engineering layer uses LGD state codes, map the boundary file to those codes in a documented crosswalk. If it uses a different approved canonical code, use that consistently instead. Never guess code mappings in the browser.
- Render a data-driven polygon map through the approved React map/GeoJSON layer (React-Leaflet is consistent with the project's technical blueprint). No map tiles are required for this editorial visual style; state outlines and fills form the map itself.
- Fit bounds to the whole India geometry initially; keep the map visually within its panel. Prevent page scroll from being captured by map zoom on small screens unless the user explicitly activates map interaction.

### Metric layer and recolouring
The regional API returns one item per matched state/UT and the map's selected metric:

```ts
interface StateDemandMetric {
  stateCode: string;
  stateName: string;
  value: number | null;
  formattedValue: string | null;
  unit: string;
  rank?: number | null;
  sharePct?: number | null;
  growthPct?: number | null;
  status: 'available' | 'suppressed' | 'missing';
}
interface RegionalDemandResponse {
  metric: 'estimated-demand' | 'posting-count' | 'demand-growth';
  period: string;
  unit: string;
  items: StateDemandMetric[];
  legend: { min: number; max: number; breaks: number[]; labels: string[] };
  meta: DataMeta;
}
```

- On each applied-filter change, request regional metric values for those same filters. When only the map metric changes, request the regional endpoint again without refetching unrelated panels if the adapter contract allows it.
- Join response items to GeoJSON by canonical state code. Missing or suppressed data uses a neutral muted-gray fill; it must not be coloured as “lowest demand”. Unknown unmatched codes trigger a visible data warning in development and are counted in diagnostics.
- Use one defined colour scale and render its legend from the API's `legend` object. Include unit/period in legend labels. Do not change colours based on values in JSX without updating the legend.
- If fixed breaks have been approved for cross-period comparisons, use them consistently. Otherwise use response-provided breaks and explicitly label the legend as relative to the selected filter. Never imply comparability across two maps if their scales differ.
- Hover/focus highlights a state and opens a tooltip with state name, metric value, unit, rank (when available), period, data status and provenance/update context.
- Click selects that state in the filter, highlights its outline, and applies the selected state to the whole page. The state/UT dropdown must show the same selection. Clicking a state must not create an unsupported district map.
- The adjacent ranking table is the accessible alternative: keyboard-focusable state rows, exact values, ranking, and a select/open action. A screen-reader-friendly data table must carry the essential information rather than relying only on colour or map shape.
- A `View detailed map` control opens a larger accessible map/table view using the same API and geometry version.
- If the geometry file is missing or fails to load, show the regional ranking table normally with a clear “Map unavailable” explanation. Never replace it with the illustrative PNG while leaving the production metric legend visible.
- If a state is selected and district-level geometry + verified district metric coverage are unavailable, keep the state-level map and show the selected state's aggregate. Do not invent district subdivisions.

### Regional metric control
Options are only those returned/enabled by the API. Minimum expected options are `Estimated demand`, `Observed postings` (if supported) and `Demand growth (%)` (if comparable periods exist). The select updates the map, adjacent ranking table, legend and tooltip values together.

---

## 8. Top Occupations by Demand

Component: `TopOccupationsPanel` with an accessible compact table/list.

Required row fields: `occupationCode`, `occupationLabel`, `taxonomyVersion`, `estimatedDemand`, `formattedDemand`, `unit`, `growthPct`, `sparkline[]`, `rank`, `definition`/detail reference and `meta`.

- Show five rows by default to match the reference. The backend determines the ranking under the current applied filters; the client must not sort by display strings.
- “View all occupations” navigates to `/demand/occupations` with the applied filters in query state/URL.
- Clicking a row opens the shared detail drawer or occupation detail route with definition, demand measure, data coverage, source information and related skills if supplied.
- Sorting options such as demand or growth must be explicit and re-request the API. Show sort direction.
- Use compact sparklines only when series points are returned; otherwise show an em dash with an accessible explanation.
- Empty state: “No occupation demand records match these filters.” Do not fabricate rows to fill the panel.

---

## 9. Top Skills by Demand

Component: `TopSkillsPanel`.

Required row fields: `skillId`, `skillLabel`, `taxonomyVersion`, `demandIndex` or actual `postingCount`, unit/baseline definition, `growthPct`, `sparkline[]`, rank, source and metadata.

- Never mix index points and posting counts under the same heading/unit.
- The table should label whether demand comes from job postings, industry signals or a combined index. This method belongs in a tooltip/detail drawer and API metadata.
- “View all skills” navigates to `/demand/skills` with the active filters applied.
- A skill row opens details showing associated occupation/sector evidence only if returned by the API.
- Growth is not shown if a comparable baseline period is missing.

---

## 10. Demand Insights narrative panel

Component: `DemandInsightsPanel`.

- Data must be generated by the backend's rule-based insight service or a configured server-side AI/LLM service. No API keys or direct LLM calls in the browser.
- Inputs are the current applied filters and the same overview/regional/occupation/skill results shown on the page. Pass data references/IDs, not only a free-text prompt.
- Response contract should provide `id`, `title`, `statement`, `explanation`, `evidenceRefs[]`, `severity`, `generatedAt`, `method` (`rule-based` or `llm-assisted`) and `meta`/provenance.
- Every quantitative statement must agree with an underlying data result and source metadata. The panel should link back to the supporting chart, table row or source detail. If generated text cannot cite evidence, do not display the claim.
- `AI Summary` invokes a documented server endpoint only when configured. If unavailable, show a neutral “Summary service not configured” state or provide a clearly labelled deterministic rule-based summary. Do not fake an AI badge or imply a model ran when it did not.
- Include “Generated from current filters” and timestamp. Refreshing the filters invalidates the old summary until a new one is returned.
- If there are too few observations or data coverage is poor, the summary should state this limitation instead of asserting a trend.

---

## 11. Shared data contract and API endpoints

Reuse the existing adapter and its error/provenance model. Suggested methods and API routes:

| Adapter method | Route | Purpose |
|---|---|---|
| `getDemandFilterOptions(parentFilters)` | `GET /api/v1/demand/filter-options?...` | Supported periods and dependent option lists |
| `getDemandOverview(filters, signal)` | `GET /api/v1/demand/overview?...` | KPIs, history/forecast trend, top occupation/skill rows and overview metadata |
| `getDemandRegions(filters, metric, signal)` | `GET /api/v1/demand/regions?...&metric=estimated-demand` | State metrics plus unit, legend breaks and map metadata |
| `getDemandOccupationList(filters, sort, page, limit)` | `GET /api/v1/demand/occupations?...` | Full occupation results for View All |
| `getDemandSkillList(filters, sort, page, limit)` | `GET /api/v1/demand/skills?...` | Full skill results for View All |
| `getDemandInsights(filters, signal)` | `GET /api/v1/demand/insights?...` | Evidence-linked, filter-specific insight summaries |
| `getDemandDetail(target, filters)` | Reuse `/api/v1/dashboard/indicators/{id}` or add `/api/v1/demand/details/{id}` | Selected card/row detail |

Every filter query includes the shared `period`, `geography`, optional `stateCode`, `sectorId`, `occupationCode`, `skillId` and any supported comparison range. Serialize IDs/codes, not visible display names. Responses must echo the applied filter set or a request/snapshot identifier so the UI can detect mismatched panels.

`DataMeta` should include:

```ts
interface DataMeta {
  provenance: 'source-backed' | 'derived' | 'mixed' | 'mock';
  sourceLabel: string;
  sourceRefs?: { id: string; label: string; url?: string | null }[];
  updatedAt: string | null;
  coverage?: string;
  notes?: string[];
  geographyLevel?: 'national' | 'state' | 'district';
  period?: string;
  snapshotId?: string;
}
```

For production source-backed metrics, include units, coverage and provenance. If a response combines source-backed and synthetic data, `provenance` must be `mixed` with an explanation. Never infer provenance from route or environment on the client.

---

## 12. Loading, error and empty states

- **First load:** show panel-shaped skeletons; avoid shifting the layout.
- **Apply filters:** keep prior data visible with a subtle “Updating…” state while refreshing; label old results if they remain visible.
- **Partial failure:** preserve successful panels and show a local retry/error in the failed panel; do not blank the whole page unless the overview itself is unavailable.
- **No matching data:** explain which module has no results and allow filter reset.
- **No history:** show actual-only or unavailable forecast state; do not synthesize line points.
- **Missing state value:** neutral map fill and `No data` tooltip/table value; never categorize as low demand.
- **Geometry failure:** preserve ranking table and display a map-specific error.
- **Mock mode:** show a persistent but quiet `ILLUSTRATIVE DATA · MOCK MODE` label in the source/status area.
- **Stale data:** display last updated time and stale status if the API reports it.

---

## 13. Responsive, accessibility and performance

- Desktop ≥1200 px: filter bar on one row if it fits; four KPIs in one row; trend/map in two columns; three bottom panels in one row.
- Tablet 768–1199 px: filters wrap; KPI cards 2×2; trend/map stack; bottom panels become two columns then one.
- Mobile <768 px: shell becomes compact/drawer; filters become accessible collapsible controls; KPIs 1 or 2 columns depending on width; all analytical panels stack in the same order; map panel retains the rankings table below or switches to a map/list toggle.
- No horizontal page overflow at 320 px. Tables may scroll internally with a clear accessible container label; do not make the entire page horizontally scroll.
- All controls have visible labels/focus; chart and map information has non-visual alternatives; colour is never the only encoding; reduced motion is respected.
- Debounce searches, abort obsolete requests, cache static geometry, avoid re-downloading GeoJSON on filter changes, and use stable IDs for React keys.

---

## 14. Acceptance checklist

- [ ] Page layout matches the reference and the global SHRAMIK design system.
- [ ] All visible filters are backed by API-supported option sets and update draft state correctly.
- [ ] Apply/Reset cause one consistent filtered data snapshot across panels.
- [ ] KPI definitions, units and comparisons are available and internally consistent.
- [ ] Job posting counts are not mislabeled as index values or vice versa.
- [ ] Trend history and forecasts are distinct and uncertainty is shown only when the backend supplies it.
- [ ] Map uses verified GeoJSON geometry, joins by canonical state code, and recolours from the active regional metric response.
- [ ] Selecting a state updates the filter and data; the state list is a fully usable map alternative.
- [ ] Missing state geometry/metrics are not represented as low demand.
- [ ] Occupation and skill tables use backend rankings and support details/view-all actions.
- [ ] Insight summaries are evidence-linked and do not claim AI generation unless a real service ran.
- [ ] Loading, empty, partial-error, retry, stale and provenance states are implemented.
- [ ] Mock values are visibly illustrative; no invented production metrics or official affiliations.
- [ ] Desktop, tablet and narrow mobile layouts are reviewed in a real browser.
- [ ] Unit/API/component tests cover filter dependency, stale request cancellation, map joins, missing state values, legend consistency and detail navigation.
