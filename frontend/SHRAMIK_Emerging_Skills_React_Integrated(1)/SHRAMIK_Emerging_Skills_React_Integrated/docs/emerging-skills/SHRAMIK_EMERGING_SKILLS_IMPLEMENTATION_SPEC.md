# SHRAMIK — Emerging Skills Intelligence: Implementation Specification

**Page:** Emerging Skills Intelligence  
**Recommended route:** `/emerging-skills` (route binding is owned by the app integrator)  
**Delivery shape:** React + TypeScript feature/page module, integrated later into the main app  
**Design authority:** `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`  
**Shell authority:** `reference/SHRAMIK_Dashboard_Reference.png` and `SIDEBAR_CONSISTENCY_LOCK.md`  
**Content reference:** `reference/SHRAMIK_Emerging_Skills_Design_Board.png` and its individual view crops

## 1. Purpose

Help analysts discover skills whose labour-market demand signals are newly appearing, accelerating, sustained, or declining; examine connected occupations/sectors/regions; compare skills; and inspect evidence supporting each classification. This is an intelligence tool, not a static infographic or a job/career recommendation portal.

## 2. Page structure: five internal views

Render one page with an internal tab/navigation bar. Only the selected view's main content is visible. Do not create five new sidebar destinations.

1. **Skills Overview** — default landing view.
2. **Skill Momentum** — demand/growth exploration.
3. **Occupation & Sector Connections** — a data-driven relationship graph.
4. **Regional Signals** — regional skill demand analysis with a real data-driven map.
5. **Skill Profiles & Evidence** — detailed skill profile, classification explanation, source evidence, compare/watchlist/alert actions.

Selections for skill, period, geography and sector should persist between views where they remain meaningful. Switching views should not silently reset the selected skill.

## 3. Locked visual identity

- Reuse the app's canonical shared shell and token implementation. The global dotted canvas is CSS, not an image of the entire interface.
- Use the same shared topbar, logo sizing, search, notification/profile controls, sidebar dimensions, row heights, icons, spacings and responsive behaviour as the existing Dashboard.
- The sidebar active item is **Emerging Skills**. Do not reproduce alternate menu labels/order from a generated mockup.
- Keep the Civic Intelligence visual style: warm off-white canvas, restrained dotted texture, compact branding, condensed editorial headings, readable sans-serif data labels, dark outlines, restrained hard shadows, and yellow interaction accents with navy/teal/orange/blue data accents.
- Use the reference image for information hierarchy, not literal text/values. Do not embed the reference screenshot in the page.
- Worker/industrial artwork may be a static PNG; charts, maps, lists, graphs, labels and metrics must be rendered from code and structured data.

## 4. Global filters and controls

Place a compact filter row beneath the page heading and view tabs. The supported filters are:

- Observation/time window (options returned by API where possible).
- Geography (All India, state/UT where supported).
- Sector.
- Skill category: All, Emerging, Accelerating, Established, Declining (categories and availability provided by backend).
- Apply and Reset controls.

Avoid firing a full API request on every intermediate selector change unless the existing application uses immediate filtering. Default to draft filter state + Apply; Reset restores agreed defaults. Every response and visible title must reflect the active filters. The backend is authoritative for valid choices and metrics.

## 5. View details

### View 1 — Skills Overview

Purpose: answer “Which skills are gaining importance?” at a glance.

**Composition**
- Compact page title/description and shared filters.
- Four summary cards: Emerging skills count, Accelerating skills count, Established skills count, Declining skills count. Show only categories with support from the response; do not invent category counts.
- Left: “Top skills by demand signal” ranked list/table, showing canonical skill, growth measure, demand volume/index with unit, sectors/occupations coverage where available, classification and source freshness.
- Right: category distribution chart derived from the same response (omit/empty-state it when unavailable).
- Lower: concise evidence-based key findings, user watchlist summary and recent skill alerts. Watchlist/alerts only appear as functional backend-backed features when the adapter supports them; otherwise show a disabled or preview-only state that explains the limitation.
- Category definitions link to methodology/help.

**Interactions**
- Select a skill to open its profile and retain that selection across views.
- Sort/rank via returned data or documented sort query.
- “View all” moves to Skill Momentum with corresponding filter, not a dead click.
- Save/watchlist controls persist using adapter methods; mock mode remains labelled.

### View 2 — Skill Momentum

Purpose: investigate current demand versus demand growth.

**Main visual:** interactive bubble/scatter chart.
- X-axis: a defined current-demand measure such as deduplicated relevant job-posting volume, or a documented demand index if raw comparable volume is not available.
- Y-axis: growth statistic over an explicit comparison window. Define whether this is percent change, index change or a modelled trend statistic.
- Bubble size: a documented measure (e.g., distinct posting volume or observed source count) and must have a legend.
- Colour/category: backend-provided classification, not a hard-coded guess.
- Log scales only when needed and explained in axis labels/tooltip; zero/negative values must be handled explicitly and never silently dropped.
- Labels should be selective to avoid clutter; keyboard-focusable accessible list/table alternative is required.

**Selected skill panel**
- Canonical skill name, category, key trend/demand metrics, period, associated occupations/sectors and data-coverage summary.
- Actions: open full profile, add/remove from comparison, add/remove from watchlist, configure alert if permitted.
- “Why this category?” must show the rule version, thresholds actually used, measures passed, coverage and caveats.

### View 3 — Occupation & Sector Connections

Purpose: answer “Where is this skill relevant?” and allow users to explore evidence-backed relationships.

**Main visual:** interactive graph/network rendered with SVG/Canvas or the existing graph library. Do not use a PNG graph.
- Node types: canonical skill, occupation (NCO code/version), sector (canonical sector code/version); related-skill nodes are optional if the API provides them.
- Edge types must be explicit: e.g., `OBSERVED_IN_POSTING`, `MAPPED_TO_OCCUPATION`, `ASSOCIATED_WITH_SECTOR`, `CURATED_RELATION`. Do not label derived associations as directly observed.
- Node size/edge width only reflect a documented returned measure (e.g., distinct valid postings, evidence count or relation strength). If relation strength is qualitative, label it as such.
- Clicking a node selects it and loads its profile/list. Hover/focus shows name, identifier, relation type, metric and evidence/provenance. Graph must support zoom/reset only if the library is accessible and stable; provide a ranked list alternative.
- Filters and selected geography/period should refresh graph results. Keep only relevant connections after selection where possible.

**Required empty states**: no mapped skills, low coverage, or API unavailable. Never draw plausible-looking edges simply to fill the canvas.

### View 4 — Regional Signals

Purpose: find where selected skill signals appear or intensify.

**Main visual:** state/UT choropleth using verified India state/UT boundary GeoJSON and canonical geography codes. Geography file is shape-only; data values come from the API. Do not create state shading from the design-board PNG.
- Metric selector: demand volume/index or growth; choices only appear when supported.
- Legend shows units/thresholds and a dedicated No Data state.
- Tooltip gives state name/code, metric, comparison period, observation count/coverage, source/as-of date and provenance.
- Clicking a state updates state ranking and regional trend in the same view and preserves selected skill.
- Show ranked states beside/below map; support accessible sorted table.
- If exact state geometries or compatible values are unavailable, show a clearly labelled unavailable/coverage state instead of a fake map.

### View 5 — Skill Profiles & Evidence

Purpose: show why a skill received its label and allow further investigation.

**Profile header**
- Canonical skill name, aliases, category, category/rule version, observation window, geography and sector scope.
- Buttons: Compare (2–4 selected skills), Add/Remove Watchlist, Set Alert (only if permissions/backend supports it).

**Subsections/tabs inside profile**
- Overview / demand trend.
- Why this category? — explicit rule and threshold values, observations that meet/fail rules, coverage gates and limitations.
- Evidence & sources — source names, dataset/version, observation period, as-of/retrieved dates, evidence counts, relevant allowed source references, provenance and mapping confidence.
- Related occupations/sectors/skills — links back into Connections view.
- Regional insights — only for compatible state-level data.
- Compare — deterministic side-by-side metrics for 2–4 selected skills, with consistent units and matching periods where possible.

Do not use an unqualified “confidence” number. Separate mapping confidence, coverage sufficiency and trend uncertainty where these concepts exist.

## 6. Watchlist, alerts and compare

These are capabilities embedded in Overview and Profile, not new sidebar pages.

- Watchlist: per-user list of canonical skill IDs with added date and optional note. Requires authenticated user identity and persistent backend storage in production.
- Skill alert rules: user-selected skill + geography/metric + threshold/condition + cadence. Do not create alerts until the backend defines valid metrics and alert delivery capability.
- Recent alerts: returned alert instances, status and created/expired timestamps, not fabricated “2 hours ago” labels.
- Comparison: 2–4 canonical skill IDs. Normalize periods and units; if not comparable, show the difference and why a direct numerical comparison is unavailable.
- UI must be able to display the action as unavailable until API capability is enabled; never fake persistence in production.

## 7. Data/API and state architecture

- All data access goes through `EmergingSkillsDataAdapter`. Visual components must not fetch URLs directly.
- Expected methods: `getOverview`, `getMomentum`, `getSkillProfile`, `getRelationships`, `getRegionalSignals`, `getSkillEvidence`, `compareSkills`, `getWatchlist`, `addWatchlistItem`, `removeWatchlistItem`, `getSkillAlerts`, and `createSkillAlertRule` / update or remove as supported.
- All requests accept typed filters and an AbortSignal/cancellation token. Debounce text search if provided by the existing shared search component.
- Separate raw payload types, validated domain types and presentation formatting. No business/classification logic inside chart components.
- Mock and REST adapters implement the same interface. A blank API base URL uses deterministic mock fixtures clearly marked `SYNTHETIC_DEMO`; configured API mode uses proposed endpoints in `SHRAMIK_EMERGING_SKILLS_API_CONTRACT.md`.
- On API error: preserve last good response if the common app pattern supports stale data, display an error/stale indicator and Retry action. Never silently fall back from an API failure to values that look source-backed.
- Every visual response includes provenance state, metric/unit, observation window, updated/as-of time, quality status, source/coverage and methodology/classification version where applicable.

## 8. Required states

For the page and each data panel, implement applicable loading, empty, no-results, partial coverage, unsupported geography, low evidence, service error/retry, stale data, unauthenticated/permission-disabled action and success feedback states. Keep no-data semantically distinct from zero. Use reduced motion and visible keyboard focus.

## 9. Responsive and accessibility requirements

- Desktop: preserve the five-view concept hierarchy and avoid over-dense tables.
- Tablet: filter controls wrap into rows; primary visual and selected-skill panel stack or move below as defined by the shared breakpoint system.
- Mobile: internal view navigation can scroll or collapse responsively; charts get horizontal/container-aware layouts without whole-page overflow; map has a list/table alternative; graph has a relationship list alternative.
- All tabs, nodes, tables, actions, chart highlights and filters must be keyboard accessible with accessible labels. Do not rely only on colour to distinguish skill categories.
- Respect `prefers-reduced-motion`; no autoplay, excessive parallax or moving graph layout that interferes with reading.

## 10. Acceptance criteria

- The global shell is reused; no second production sidebar/topbar is introduced.
- Exactly five internal views exist; tab switching preserves relevant filter/skill state.
- Every analytical graphic renders from structured adapter data, not a screenshot.
- Relationship graph has typed nodes/edges and evidence metadata; no invented links.
- Regional choropleth uses approved state/UT geometry joined by canonical geography code; missing values show No Data.
- Classifications use backend-returned rules/category and rule version; UI does not hard-code thresholds.
- Comparison respects units and periods; watchlist/alerts persist only when supported by backend.
- Mock data is labelled `Illustrative demo data` and is isolated from REST mode.
- Loading/error/empty/partial-coverage cases work.
- Update component inventory/API usage docs for implementation differences.
- Run actual repo typecheck/lint/tests/build and test shell integration at the repo's agreed breakpoints. Report outcomes honestly.
