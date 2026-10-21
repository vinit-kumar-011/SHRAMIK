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
- Regional metric selector, interactive India state/UT choropleth, accessible ranked state/UT table, full regional detail view and boundary attribution.
- Occupation and skill rows open details; View All opens a full result drawer and emits a host-navigation event with applied filters.
- Evidence-linked, clearly labelled rule-based preview; no false AI badge.
- Retry, stale-data handling, source/provenance and snapshot messaging.
- REST mode does not silently fall back to mock data after request failures.

## Fixes made while integrating
- Added the missing `useMemo` hook import needed by the demand controller.
- Made provenance labels distinguish `source-backed`, `derived`, `mixed`, `mock`, `synthetic` and unknown; synthetic evaluation data always keeps an explicit non-observed label.
- Normalized the mock regional snapshot ID to match overview/insight snapshot IDs.
- Fixed the topbar's `India (National)` selection so `IN` resets state scope rather than being rejected as an unknown state.
- Surfaces notification mutation failures instead of leaving an unhandled rejection.
- Uses non-positive-aware direction markers for KPI deltas.
- Ensures skill panel cannot silently mix posting counts and index points; its label follows the returned measure.
- Limits the demo forecast to the 2024 demo snapshot that actually contains forecast fixtures; earlier periods show history only.

## Explicit blockers / not claimed
- Compiled JavaScript syntax check and 15 focused crosswalk/REST regional-comparison tests pass. Full browser rendering and a live boundary download could not be verified in this network-restricted environment. Vendor `assets/india-states.geojson` on an internet-connected machine before a presentation for repeatable loading.
- The preview uses a simplified DataMeet-derived hosted boundary fallback; the publisher reports a 2011 vintage and CC BY 2.5 India, and community notes document known issues for some regions. The included helper vendors it locally only after fail-closed 36-feature/crosswalk checks. Do not describe the layer as current official geometry. Review the Survey of India/National Water Data Portal option and its terms before formal deployment.
- No SHRAMIK backend was connected here. REST endpoint shapes and session/auth are an integration seam, not validated against a live server. `/demand/regions` must implement `comparisonScope=all-states` and return all 36 region rows; the frontend intentionally omits `stateCode` on that call, while the other panels use the selected state.
- Full browser automation, backend contract tests and production auth verification remain to be run inside the main SHRAMIK repository.
