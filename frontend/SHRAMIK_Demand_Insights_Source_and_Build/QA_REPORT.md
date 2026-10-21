# Demand Insights QA / handoff notes

## Reused from the uploaded HTML
- Existing compact SHRAMIK header/topbar and search UI.
- Existing canonical sidebar order with `Demand` active.
- Existing shared detail drawer, icon construction pattern, sparkline, loading/error components, dotted canvas and palette.
- Existing inline worker/industrial SVG artwork style.

## Implemented interactions
- Draft vs applied filters, validation, atomic Apply and Reset.
- Period / geography / state / sector / occupation / skill filters.
- Global region selector and regional-ranking row both drill into the same state filter.
- Four clickable KPIs open metadata/definition details.
- Demand trend supports metric selection, observed-vs-forecast line styles, interval band only where returned, focusable chart points and an accessible data table.
- Regional metric selector, accessible ranked state/UT table, full regional detail view and explicit unavailable-map message.
- Occupation and skill rows open details; View All opens a full result drawer and emits a host-navigation event with applied filters.
- Evidence-linked, clearly labelled rule-based preview; no false AI badge.
- Retry, stale-data handling, source/provenance and snapshot messaging.
- REST mode does not silently fall back to mock data after request failures.

## Fixes made while integrating
- Added the missing `useMemo` hook import needed by the demand controller.
- Made provenance labels distinguish `source-backed`, `derived`, `mixed`, `mock`, and unknown.
- Normalized the mock regional snapshot ID to match overview/insight snapshot IDs.
- Fixed the topbar's `India (National)` selection so `IN` resets state scope rather than being rejected as an unknown state.
- Surfaces notification mutation failures instead of leaving an unhandled rejection.
- Uses non-positive-aware direction markers for KPI deltas.
- Ensures skill panel cannot silently mix posting counts and index points; its label follows the returned measure.
- Limits the demo forecast to the 2024 demo snapshot that actually contains forecast fixtures; earlier periods show history only.

## Explicit blockers / not claimed
- No verified, versioned state/UT GeoJSON + canonical state-code crosswalk was supplied; the choropleth is intentionally unavailable rather than using a decorative PNG.
- No SHRAMIK backend was connected here. REST endpoint shapes and session/auth are a documented integration seam, not validated against a live server.
- Full browser automation, backend contract tests and production auth verification remain to be run inside the main SHRAMIK repository.

## Build verification

- Static JSX compilation: PASS.
- Compiled JavaScript syntax (`node --check`): PASS.
- Production entry and local-file references: PASS.
- Runtime Babel dependency: none.
- Required page modules and API adapter paths: PASS.
- Headless browser rendering: **not verified**; Chromium timed out in this environment while waiting on external CDN/browser services. Run the included bundle from a local HTTP server and complete viewport/browser checks before treating it as fully production-certified.
