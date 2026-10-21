# SHRAMIK — Skill Gap Analysis Implementation Specification

**Document ID:** SHRAMIK-PAGE-SGA-001  
**Status:** Approved visual direction; frontend implementation brief  
**Page heading:** `SKILL GAP ANALYSIS`  
**Canonical sidebar item:** `Skill Gaps` (active)  
**Suggested logical route:** `/skill-gaps` (adapt to the host app; this handoff does not require a new router)  
**Implementation model:** React + TypeScript page module for later integration  
**Authoritative reference:** `reference/SHRAMIK_Skill_Gap_Analysis_Reference.png`  
**Shared shell reference:** `reference/SHRAMIK_Dashboard_Reference.png`

---

## 1. Purpose

Help analysts compare compatible labour-demand and workforce-supply estimates to identify potential shortages, relative balance, and surpluses by skill, occupation, sector, geography and period. Every reported gap must be traceable to its underlying demand and supply values, definitions, units, coverage, and provenance.

This is an analytical decision-support page, not a job portal and not a training-allocation recommendation engine by itself. The frontend displays estimates and evidence returned by the analytical backend; it must not compute policy-grade projections in presentational components.

## 2. Source-of-truth order

1. Actual shared Dashboard shell and reusable components in the host repository.
2. `reference/SHRAMIK_Dashboard_Reference.png` for shell proportions and navigation.
3. `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md` for tokens, typography, motion, component behavior and accessibility.
4. `reference/SHRAMIK_Skill_Gap_Analysis_Reference.png` for Skill Gap Analysis content layout only.
5. This page specification and `SHRAMIK_SKILL_GAP_ANALYSIS_API_CONTRACT.md`.
6. Individual implementation preference.

The generated page image is a visual target only. It is not HTML, React source, geographic geometry, a source of facts, or proof that a chart or API exists.

## 3. Explicit shared-shell/sidebar lock

This page must use the same shared Dashboard shell used by Dashboard, Demand Insights and Supply Insights. Do not clone or independently redesign the sidebar, topbar, logo lockup, navigation rows, worker artwork, or mission note.

Canonical navigation:
1. Dashboard
2. Demand
3. Supply
4. Skill Gaps — **active for this page**
5. Forecasts
6. Emerging Skills
7. Scenario Simulator
8. Reports
9. Divider
10. Data Sources
11. Data Quality

The page heading is `SKILL GAP ANALYSIS`; the sidebar label remains `Skill Gaps`. Do not add Data Explorer, User Management, Access Requests or a page-specific menu based on elements from generated images. Do not add Settings unless the actual host Dashboard already contains it and the team has approved it as canonical. The actual source component takes precedence over a spec fallback.

Sizing rules:
- Preserve existing runtime sidebar width and responsive collapse/drawer breakpoint exactly.
- If the host repo does not expose the width, use 248 px as a temporary fallback and report the assumption; do not assert that it was discovered in source.
- Reuse nav item height, icon size, row gap, label typography, active-yellow treatment, border, and content gutter from the shared shell.
- Reuse the topbar height, search, notification, profile menu and responsive behavior.
- Reuse CSS tokens, card radius, borders, hard-offset shadow rules, input heights and spacing from the host design system. Do not define competing token values in this page.
- Keep the global dotted canvas persistent as the existing shared background layer.
- The only page-specific navigation state change is making `Skill Gaps` active.

## 4. Visual direction and page composition

Retain the Civic Intelligence / editorial neo-brutalist visual identity: warm off-white dotted canvas, black condensed display type, yellow highlight, thin charcoal outlines, selective hard shadows, restrained navy/orange/teal/blue data accents, and documentary-style workforce/industrial artwork used sparingly.

Do not reuse the exact Demand or Supply page layout with renamed labels. Skill Gap Analysis needs a distinct analytical composition while retaining the same shell.

### Desktop content order

1. Breadcrumb / eyebrow and hero band. Heading `SKILL GAP ANALYSIS`, concise explanatory copy, short decorative worker/bridge collage aligned to the right. Hero art is decorative and must not be a full-page screenshot.
2. Shared analysis filter toolbar: Time Period, Geography, State/UT, Sector, Occupation (NCO), Skill, Apply Filters, Reset. Reuse shared filter components.
3. Four compact KPI cards: Estimated Demand, Estimated Supply, Projected Gap/Shortage, Skills with Significant Gaps. Values/units are data driven. Avoid duplicating the separate small hero stat card from the concept if it makes five metrics; the four-card row is authoritative.
4. Small in-page tabs: Overview, Occupations, Skills, Sectors, Regions. These are page-level views, not global navigation. Selecting a tab updates the main content region; keep filters and applied-filter context consistent. If tabs are too large for the current host app pattern, reuse its segmented-control/tab component.
5. Main analytical row:
   - Left / wider panel: **Skill Gap Landscape** scatter plot comparing supply (x-axis) to demand (y-axis), with reference parity line and gap categories.
   - Middle panel: **Skill Gap by State/UT** choropleth map plus compact ranking/legend. Use real geometry only.
   - Right rail: **Key Insights** panel, with at most four concise claims and their evidence links.
6. Lower panels:
   - **Top Skills by Gap** table: demand, supply, gap, gap percentage where valid, and a trend indicator.
   - **Supply–Demand Flow (Selected Sector)** or an evidence/driver breakdown. Use a Sankey only if the backend actually supplies valid compatible flow quantities. If unavailable, show a clear unavailable state; do not infer or invent flows.
7. Compact provenance/method note showing applied period, source coverage, data status and update time.

### Responsive behavior
- Wide desktop: hero; filters; 4 KPI cards; main landscape/map/insights row; 2 lower panels.
- Tablet: filters wrap; KPIs use 2 columns; landscape and map stack or use a deliberate 2-column arrangement; insights moves beneath the analytical row; lower panels stack.
- Mobile: shared sidebar becomes the existing app drawer/navigation pattern; filters collapse into a filter panel; KPI cards stack or use 2 columns only if each card remains readable; charts become horizontally scrollable only inside their own panel when unavoidable, never causing page-wide overflow; tables use responsive row cards or labelled horizontal scroll.
- Do not reorder content so that the interpretation/definitions appear after an actionable recommendation.

## 5. Data semantics — do not blur incompatible measures

The gap convention for compatible measures is:

`gap = demand - supply`

- Positive gap means demand exceeds supply under the selected definition and is interpreted as a potential shortage.
- Negative gap means supply exceeds demand under the selected definition and is interpreted as potential surplus.
- Near-zero/balanced classification must use a server-defined tolerance or documented configuration. Do not invent an arbitrary page-only threshold.
- Gap percentage must be computed by the authoritative backend rule and returned with its denominator and formula metadata. Do not divide by zero or calculate a misleading percentage without a valid denominator.
- Only compare values with compatible geography, entity definition, period/horizon, unit and classification scheme. When demand/supply inputs are not comparable, render `Not comparable` with an explanation rather than a gap.
- Observed/estimated gap and projected/forecast gap must have distinct labels. Do not label an observed-period estimate “Projected Shortage” unless the response identifies it as a forecast.
- A person count, job posting count, demand index, training completion flow, and annual training-seat capacity are different measures. Do not combine them onto one axis or subtract them without an explicit valid transformation.
- Forecast uncertainty bands must use backend-supplied lower/upper bounds only.
- Mock data must be labelled `Illustrative demo data`; do not transcribe the reference screenshot's values into production or source-backed mode.

## 6. Component contracts and behavior

### 6.1 Filter toolbar
- All options are loaded from the configured adapter/API.
- Maintain separate draft and applied filters. Filter edits do not partially update charts before Apply.
- Apply commits one filter snapshot and refreshes all page sections consistently.
- Reset restores API-supported defaults, not hard-coded assumptions unless explicitly documented by the API.
- An explicit map-state selection updates the State/UT draft and applies it, unless the host UI contract requires Apply after selection; follow a single documented interaction consistently.
- Prevent stale responses overwriting newer state. Cancel previous requests or use request IDs/AbortController.
- On refresh failure, retain prior successful data and label it stale; never silently switch from REST to mock mode.

### 6.2 KPI cards
Four cards exactly: Estimated Demand, Estimated Supply, Gap/Shortage, Skills with Significant Gaps. Each card consumes label, value, unit, comparison value/delta if valid, period, definition, provenance, source and update time from the API. Click opens a shared detail drawer or host navigation callback. Loading, valid zero, unavailable, stale, error and detail states are required.

### 6.3 Skill Gap Landscape scatter plot
- Use the chart library/wrappers already installed in the host app. Do not install a second plotting stack without checking `package.json` and existing wrappers.
- Each plotted point has a stable skill/occupation identifier, display name, demand, supply, unit, gap, category and optional size value explicitly defined by the data contract.
- x-axis is supply, y-axis is demand; label axes and units. Logarithmic scaling is permitted only if values are positive and the chart indicates the scale. If zeros/negative values are present, choose a valid alternative.
- Draw a parity reference line only where both axes use the same units and comparable measure. Points above the line imply demand > supply; below imply supply > demand.
- Colour categories: high/moderate shortage, balanced, moderate/high surplus; classification thresholds come from the API/config. Always add a legend and accessible point descriptions.
- Hover, keyboard focus and click reveal/open a detail panel including underlying values, gap, units, source, coverage and provenance. Provide a table alternative for screen readers and keyboard-only users.
- Never display random point placements or screenshot-derived values in source-backed mode.

### 6.4 Regional choropleth
- Use versioned state/UT GeoJSON (or the existing approved mapping library and geometry assets). Never use the screenshot or `india-map-illustrative.png` as data geography.
- Join regional values by canonical state/UT code; do not join on display labels alone. Include a documented code crosswalk and geometry source/license/version.
- Map metric selector may include `gap_absolute`, `gap_percent` (only when defined), or an explicitly supported alternative. Changing the metric triggers a new adapter request and updates map colours, legend and ranking together.
- Use a diverging or classed colour scale for shortage/balance/surplus. The meaning and boundaries must be sourced from returned classifications/configuration. Missing and suppressed data use a neutral grey treatment, not the low-shortage colour.
- Tooltip and focus details include state/UT, demand, supply, gap, unit, period/horizon, rank only if returned, source/provenance, last updated and missing-data reason.
- Selecting a state updates the State/UT filter and reloads dependent sections consistently.
- Include loading, empty, error/retry, no geometry, no coverage and stale states. If verified geometry is unavailable, show an explicit unavailable state and report the asset blocker; never substitute a decorative PNG.

### 6.5 Key Insights rail
- Display no more than four backend-supplied insight objects.
- Each insight needs stable ID, headline, description, severity/importance only if supported, evidence references, values/units, period, source/provenance and a target detail entity/section.
- Numbers and comparisons in the narrative must agree with current API responses and applied filters.
- If an AI/rule insight service is not configured, show a labelled mock insight in demo mode or an honest unavailable state. Never claim that AI generated text if it did not.
- Selecting an insight opens its evidence/detail surface.

### 6.6 Top Skills by Gap table
Columns: rank, skill, demand, supply, absolute gap, gap percentage only if valid, trend/status. Sort/pagination may be local only for a fully loaded bounded list; use server-backed sorting/pagination for larger result sets. Use stable skill ID and taxonomy/version metadata. Selecting a row opens details. `View All Skills` must navigate through the shared handler or show the relevant full-list view; no dead button.

### 6.7 Supply–Demand Flow (optional data-dependent panel)
- Render a Sankey/flow diagram only when the API returns valid nodes/links with compatible units and conserved/defined totals.
- Do not invent a mapping from training completions to workforce supply or from sectors to occupations.
- If no credible flow dataset is available, render an empty/limited-coverage explanatory state and direct the user to the supporting evidence list. This is preferable to a fake diagram.

### 6.8 Detail drawer / section drill-down
Reuse the shared detail drawer/pattern from the Dashboard if available. Show definition, demand/supply/gap, calculation rule, current filters, geographic scope, period, sources, data coverage, provenance and available evidence records. A click should not merely animate without opening meaningful content.

## 7. Data adapter and API mode

All UI components call a single typed `SkillGapDataAdapter`/page controller. Keep REST access out of leaf cards and chart code.

Suggested adapter methods:
- `getFilterOptions()`
- `getOverview(filters)`
- `getGapLandscape(filters)`
- `getRegionalGaps(filters, metric)`
- `getRankedSkills(filters, sort, page)`
- `getSkillGapInsights(filters)`
- `getSectorFlow(filters, sector)`
- `getDetail(entityType, entityId, filters)`

Implement a deterministic mock adapter behind the same interface for local preview. All mock surfaces need a visible demo-data badge/status. In REST mode, API errors must not trigger automatic mock fallback. The detailed response shapes are in `SHRAMIK_SKILL_GAP_ANALYSIS_API_CONTRACT.md`.

## 8. Accessibility, performance and motion

- Keyboard accessible filters, tabs, scatter points, map regions, table rows, drawers and buttons.
- Visible focus; labels and accessible names for icon-only actions; do not use colour alone to convey shortage/surplus.
- Add accessible tabular/text alternatives for maps and charts.
- Respect `prefers-reduced-motion`; the dotted background is static and decorative art motion must not affect control positioning.
- Debounce/cancel search if included; memoize expensive geometry joins and use stable feature IDs.
- Avoid refetching every endpoint separately if the API supports one page payload; share one applied filter snapshot and show coherent loading/error states.

## 9. Acceptance criteria

- [ ] Implemented as an integration-ready React + TypeScript page module, not a flattened screenshot.
- [ ] Uses the canonical Dashboard shell/shared sidebar/topbar; no duplicate production sidebar.
- [ ] `Skill Gaps` is the active global nav item; the page heading is `SKILL GAP ANALYSIS`.
- [ ] Shared dimensions/tokens are reused from source rather than guessed or redeclared.
- [ ] Content composition is meaningfully distinct from Demand and Supply pages.
- [ ] Four KPI cards and all panels are driven by the adapter.
- [ ] Scatter chart has a valid parity line, legend, accessible detail and source-backed points.
- [ ] Regional map uses verified GeoJSON + canonical code join; missing values are not treated as low values.
- [ ] Map metric/state selection correctly synchronizes filters and all dependent data.
- [ ] Insights cite evidence from the applied data snapshot.
- [ ] Flow diagram only renders from valid data; otherwise honest empty state.
- [ ] Demo/source-backed/mixed/stale status is visible as appropriate.
- [ ] Loading/error/empty/retry states work and REST errors never silently fall back to mock.
- [ ] Responsive checks run at 1440, 1024, 768 and 390 CSS px; no page-wide horizontal overflow.
- [ ] Keyboard/a11y/reduced-motion reviewed.
- [ ] Existing Dashboard/Demand/Supply pages remain unchanged.
- [ ] Actual build/test/browser validation outcomes are reported truthfully.

## 10. Required implementation report

After implementing, report files created/modified, shared components reused, adapter endpoints connected/missing, geography geometry and license/version/code crosswalk, filter and map interactions tested, viewport widths tested, build/lint/test results, and any blockers. Do not claim a check passed unless it was run.
