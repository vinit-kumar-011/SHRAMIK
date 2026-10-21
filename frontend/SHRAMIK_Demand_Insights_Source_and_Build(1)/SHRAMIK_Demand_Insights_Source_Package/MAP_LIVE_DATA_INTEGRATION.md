# SHRAMIK Demand Insights — Interactive Map Integration Handoff

## Implemented in the frontend

- India state/UT choropleth rendered with Apache ECharts from GeoJSON polygons (not the illustrative PNG).
- 36-region canonical crosswalk (`SHRAMIK-GEO-V1-2026-10-18`) with compatibility aliases for legacy codes.
- Hover tooltip with metric, unit/value, period, provenance and update timestamp; zoom/pan; click-to-filter; selected-state highlight.
- Regional ranking and map share the same all-state comparison request. Selecting a state filters the other panels without collapsing the map into a one-region result.
- Missing/unavailable/suppressed values render as neutral grey, not zero or the lowest value.
- Mock and synthetic-evaluation values keep explicit labels; REST errors do not silently fall back to mock values.

## Important boundary caveat

The included fallback is a **DataMeet community state-boundary layer hosted by GeoDataViewer**, labelled CC BY 2.5 India and a 2011 boundary vintage by the publisher. DataMeet publishes warnings about boundary issues in some regions. Attribution is visible in the UI, and the included fetch helper can vendor a local copy only after a 36-feature/crosswalk validation.

This layer is suitable only as a competition-preview baseline. It must not be described as current official geometry. The National Water Data Portal lists a Survey of India state/UT GeoJSON resource with a portal update timestamp of October 1, 2026, but the redistribution terms were not clear from the public metadata reviewed. Confirm those terms and verify geometry/coverage before replacing the preview layer or publishing as an official-use dashboard.

## Enable backend data

The current build is **not connected to a live SHRAMIK API**. It starts in a visibly labelled demo mode when `apiBaseUrl` is blank. Once the backend endpoints exist and authentication/CORS are configured, set this in `production/config.js`:

```js
window.SHRAMIK_CONFIG = {
  apiBaseUrl: 'https://YOUR-SHRAMIK-API-HOST'
};
```

The frontend appends `/api/v1` unless the provided URL already ends with `/api/v1`. Do not include a secret in this public client-side configuration.

The page currently expects these API routes:

- `GET /api/v1/demand/filter-options`
- `GET /api/v1/demand/overview`
- `GET /api/v1/demand/regions`
- `GET /api/v1/demand/occupations`
- `GET /api/v1/demand/skills`
- `GET /api/v1/demand/insights`
- `GET /api/v1/demand/details/{id}`
- Shared shell: `GET /api/v1/me`, `GET /api/v1/notifications`, `GET /api/v1/search`, and `PATCH /api/v1/notifications/{id}/read`

If the page is hosted on a different origin, configure credentialed CORS with the exact frontend origin and the existing auth mechanism; do not use wildcard origins with credentials.

## Map endpoint contract (backend team's priority)

The map requests `GET /api/v1/demand/regions` with `comparisonScope=all-states`, state-level geography, selected period/sector/occupation/skill filters, and the selected metric. The request intentionally omits `stateCode` so the map always compares all 36 regions. It must return one row for every canonical state/UT, including explicit `missing` or `suppressed` rows.

Example row shape:

```json
{
  "stateCode": "IN-OD",
  "stateName": "Odisha",
  "value": 125000,
  "formattedValue": "125,000",
  "unit": "positions",
  "status": "available",
  "sharePct": 7.4
}
```

Response-level metadata should include `period`, `unit`, and `meta` with `provenance`, `sourceLabel`, `updatedAt`, and `snapshotId`. Use a finite numeric `value` only when `status` is `available`; use `value: null` for missing or suppressed rows. New API responses should use canonical `IN-*` IDs from `assets/india-state-crosswalk.json` rather than names or old two-letter aliases.

Use `meta.provenance: "source-backed"`, `"derived"`, `"mixed"`, `"synthetic"`, or `"synthetic-demo"` accurately. Synthetic evaluation values can still power the map for a pitch/demo, but must remain clearly labelled as generated test data—not live observed labour-market statistics. Define `sharePct` with the same denominator used by the API and tooltip.

## Run and verify

From the `production/` folder, serve the app over HTTP (recommended rather than `file://`):

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`. To vendor the preview boundaries locally, run:

```bash
python assets/fetch_india_boundaries.py
```

The implementation checks completed in this build: compiled JS syntax check passed and the focused map/crosswalk/REST contract tests passed **17/17**. Browser visual smoke, a successful boundary download from this network-restricted environment, auth/CORS, and the live backend connection remain unverified and must be checked inside the main SHRAMIK setup.
