# SHRAMIK Demand Insights — Updated Standalone Page

This package adapts the uploaded `SHRAMIK_Supply_Insights.html` shell instead of starting from a separate app. It reuses the existing SHRAMIK topbar, sidebar, detail drawer, SVG illustration pattern, typography, dotted background and colour tokens; the selected sidebar item is `Demand`.

## Files
- `index.html` — static production entry point (no browser-side Babel).
- `app.js` — page bundle compiled from the editable JSX using the TypeScript compiler already present in the build environment.
- `config.js` — configure `window.SHRAMIK_CONFIG.apiBaseUrl` for the REST adapter.
- `BUILD_REPORT.json` — actual checks and known limitations.
- `source/` in the source-and-build package contains the JSX page and uploaded Supply HTML used as the shell source.

## Run locally

You can open `index.html` directly for a preview in most browsers. For reliable relative-path and fetch behaviour, serve this folder over HTTP, for example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Demo vs API mode

- Blank `apiBaseUrl` activates the visibly labelled illustrative demo adapter. None of those values are official labour-market statistics.
- When supplied evaluation data is synthetic, return `meta.provenance: \`synthetic\`` or `synthetic-demo` and a descriptive `sourceLabel`; the page labels it `Synthetic evaluation data`, not observed labour-market data.
- Setting `apiBaseUrl` activates REST mode against the `/api/v1/demand/...` contract. REST errors remain errors: the page does not silently fall back to mock data. This package is backend-ready, but no live SHRAMIK API was connected during this build.
- The following endpoints are expected by the current page: `GET /demand/filter-options`, `GET /demand/overview`, `GET /demand/regions?comparisonScope=all-states`, `GET /demand/occupations`, `GET /demand/skills`, `GET /demand/insights`, plus profile/search/notifications from the shared shell and a detail endpoint.

## Interactive state/UT choropleth

- Apache ECharts renders an interactive GeoJSON polygon layer with hover provenance tooltips, pan/zoom, metric-dependent colours and click-to-filter behavior.
- Regional values come from `/api/v1/demand/regions?comparisonScope=all-states`; the adapter removes `stateCode` and requests the state-level geography while preserving period/sector/occupation/skill filters. The map and regional ranking remain a 36-region comparison when a state is selected, while the other panels drill into that state.
- A versioned `SHRAMIK-GEO-V1-2026-10-18` crosswalk maps 36 state/UT polygons and recognizes legacy API codes. The map refuses to render mismatched or duplicate geometry.
- First tries a local `assets/india-states.geojson`, then a hosted simplified DataMeet-derived GeoJSON. Run `python assets/fetch_india_boundaries.py` on an internet-connected machine to vendor the hosted layer locally after validating 36 unique crosswalk matches. The publisher labels it CC BY 2.5 India and a 2011 boundary vintage; it is for the competition preview only, not current official geometry.
- Boundary attribution: DataMeet India community, hosted by GeoDataViewer, CC BY 2.5 India; source vintage stated as 2011 and community notes document known boundary issues. The National Water Data Portal lists a Survey of India boundary source updated October 1, 2026, but redistribution terms need confirmation before local vendoring. Keep the chosen source's attribution with the asset.
- Demo values are visibly labelled illustrative; synthetic benchmark/evaluation data has its own visible label. Missing and suppressed values are neutral grey, not zero.

## Important production integration note

The static bundle still loads React 18, ReactDOM 18, Lucide icons and Google Fonts from CDNs. The JSX is compiled and no browser Babel runtime is required, but this is not an offline/self-contained artifact. Before public production deployment, align endpoint shapes/authentication with the backend team and consider self-hosting runtime dependencies per your deployment policy.
