# SHRAMIK Dashboard — Product & Implementation Specification

**Status:** Approved visual direction; implementation must preserve the reference hierarchy.  
**Reference:** `SHRAMIK_Dashboard_Reference.png` and `reference/dashboard-concept.png`.  
**Global identity:** `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`.  
**Component contract:** `SHRAMIK_COMPONENT_INVENTORY.md`.  
**API contract:** `docs/API_CONTRACT.md`.

## 1. Purpose

The dashboard is a national / regional Labour Market Intelligence overview for SHRAMIK. It is intended to help an analyst inspect labour demand and supply, skill gaps, emerging skills, sector gaps, and occupation forecasts from a shared data layer. The UI must distinguish source-backed data from mixed-provenance and demonstration data.

This package contains an active **data-adapter seam**. It is not connected to a SHRAMIK production backend until `VITE_SHRAMIK_API_BASE_URL` is configured and the documented endpoints are implemented by that backend. With no API host set, the interactive mock adapter powers every displayed module and detail surface while labeling all metrics as illustrative.

## 2. Structure lock — don't redesign without approval

Desktop order:

1. Sticky global topbar: compact brand lockup; global search; region selector; notification control; user profile.
2. Persistent left navigation: Dashboard, Demand, Supply, Skill Gaps, Forecasts, Emerging Skills, Scenario Simulator, Reports; separator; Data Sources and Data Quality. The lower rail contains the worker illustration and mission note.
3. Hero band: dashboard / region breadcrumb, “India’s Labour Market at a Glance”, yellow underline, worker-industrial composition, yellow note accent.
4. Exactly four KPI cards: Total Labour Demand, Total Labour Supply, Overall Skill Gap, Emerging Skills.
5. Middle row: wide Demand vs Supply Trends panel on the left; Regional Intelligence on the right.
6. Bottom row: Emerging Skills, Skill Gaps by Sector, Occupation Forecasts.
7. Compact method/source note and adapter/data provenance status.

The reference image is the authority for proportions, relative panel sizes, section order, visual density, and the desktop composition. Do not add panels, increase the quantity of metrics, replace the dotted background, or turn decorative art into data. Responsive layouts may stack the same components; they may not reorder the information hierarchy.

## 3. Locked visual tokens

Use the global design system as the token source. Critical values:

| Token | Value | Usage |
|---|---|---|
| Canvas | `#F7F6F0` | Site-wide fixed dotted canvas |
| Surface | `#FFFEFA` | Cards and popovers |
| Muted surface | `#F0EFE8` | Table headers, quiet surfaces |
| Ink / outline | `#171717` / `#292929` | Text and strokes |
| Muted text | `#62625C` | Supporting copy |
| Border muted | `#D8D6CD` | Dividers and grid lines |
| Yellow | `#F2D34F` | Selected navigation and primary actions |
| Navy | `#203A5B` | Primary data series |
| Orange | `#EB791D` | Gap/secondary indicators |
| Teal | `#20A89C` | Supply / tertiary indicators |

Keep the condensed display type for short headings and readable sans-serif for labels and data. Prefer thin outlines, slightly rounded rectangles, subtle hard-offset shadows, and understated halftone industrial artwork.

## 4. Component behaviour and data integration

### Header and shell

- Region options come from `getRegions()`; selection updates the `regionCode` query and refreshes data.
- Search suggestions come from `search({ query, regionCode })`. Search must be cancellable/debounced and select results by their typed target; a selected region updates the region filter.
- Profile contents come from `getProfile()`.
- Notifications come from `getNotifications()`; marking one read calls `markNotificationRead(id)` and updates local state only after success.
- A consumer app may pass the optional `onNavigate(path, label)` prop. The component also dispatches a `shramik:navigate` browser event for shell integration.

### KPI cards

- Render the `kpis` returned by `getDashboard()` (the supplied mock returns four entries in the locked order).
- Each card opens `getIndicatorDetail(id, { regionCode })` in the detail drawer.
- Numeric value, formatted value, unit, delta, context, and sparkline series come from the response. Icons are resolved from `key` by the presentation layer, never from arbitrary HTML.

### Demand vs Supply Trends

- Uses `trend[]` from `getDashboard()`; the 3-year / 5-year selector re-requests data.
- Demand and supply series share the same scale computed from the active data response.
- The chart's detail action requests `getSectionDetail('demand', ...)`.

### Regional Intelligence

- The metric selector calls `getRegionRankings({ regionCode, metric })` for demand, supply, or skill gap.
- Ranking labels, order, values, units, and metadata must come from that response.
- The included India PNG is decorative only: it must not encode or imply state-level value shading. Production map shading requires an accurate state geometry file plus a verified state-keyed metric response.

### Summary panels

- Emerging Skills: `emergingSkills[]`.
- Skill Gaps by Sector: `sectorGaps[]`.
- Occupation Forecasts: `occupationForecasts[]`.
- Every row is clickable and requests `getIndicatorDetail(row.id, ...)`; if the API's contract returns no item detail, the component falls back to its section detail endpoint.
- “View all” requests `getSectionDetail(section, ...)`.

### Detail drawer

The same detail surface displays KPI details, row details, navigation sections and search targets. It handles loading, API error, facts, optional data table, source label, provenance, update date, and source notes. This pattern keeps the content panels reusable and data-backed without inventing new dashboard sections.

## 5. Data truth rules

- All mock-adapter quantities are illustrative UI data only. They are not current SHRAMIK findings.
- Every production metric should include `provenance`, `sourceLabel`, `updatedAt`, unit, and available coverage/notes in `meta`.
- Never mix `mock` and `source-backed` values without marking the resulting response as `mixed` and explaining the composition.
- Trend points must contain year, demand, and supply in the same documented unit.
- Region rankings must sort by the metric requested and include consistent units. A production choropleth must use matched state codes/geometry; the present raster map is not accurate enough for that purpose.
- Missing or failed data should show an explicit message, retry control, or empty state. Do not silently fall back to a number that looks real.

## 6. API mode selection

- Blank `VITE_SHRAMIK_API_BASE_URL`: use `MockLabourMarketDataAdapter` for local preview and interaction testing.
- Set `VITE_SHRAMIK_API_BASE_URL=https://your-api-host`: use `RestLabourMarketDataAdapter`, which calls `/api/v1/...` endpoints. If the supplied URL already ends in `/api/v1`, it is not appended again.
- The REST adapter uses JSON, includes same-site credentials by default, supports bearer-token injection through its constructor, surfaces HTTP/network failures and passes `AbortSignal` through to requests.
- Use an authenticated cookie/session or inject the host application's token provider. Do not put access tokens in local storage in this package.

## 7. Responsive rules

- Desktop ≥1200 px: four KPI cards in one row; middle analytics two columns; bottom panels three columns.
- Tablet 621–1199 px: navigation becomes a drawer around the existing breakpoint; KPI cards use 2 × 2; middle analytics stack; summaries may use two columns then one.
- Mobile ≤620 px: compact header; KPI cards 2 × 2; analytical panels stack in the locked order; no horizontal page overflow.
- Dotted canvas stays fixed to the viewport. Only hero art receives subtle parallax, capped at 18 px; disable on mobile and when `prefers-reduced-motion` is set.

## 8. Acceptance criteria

- [ ] Desktop screenshot matches the reference section order and density.
- [ ] All four KPI cards render from `DashboardSummary.kpis`.
- [ ] Region and period changes initiate cancellable adapter reads.
- [ ] Ranking metric switches between demand, supply and skill gap through the adapter.
- [ ] Search results are adapter results, and choosing a result opens a relevant detail or region.
- [ ] Notification reads call a mutation endpoint and update only after success.
- [ ] KPI cards, row items, view-all buttons, chart detail, nav items and profile details open a data-backed detail surface.
- [ ] Loading, empty, network-error, retry and provenance states remain visible.
- [ ] Mock values are labeled illustrative. Production data includes source metadata.
- [ ] Keyboard-only navigation, reduced motion, 320/390/768/1024/1440 px viewports, and screen-reader labels are checked.
