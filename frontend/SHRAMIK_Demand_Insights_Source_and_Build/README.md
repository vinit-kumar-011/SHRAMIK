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
- Setting `apiBaseUrl` activates REST mode against the `/api/v1/demand/...` contract. REST errors remain errors: the page does not silently fall back to mock data.
- The following endpoints are expected by the current page: `GET /demand/filter-options`, `GET /demand/overview`, `GET /demand/regions`, `GET /demand/occupations`, `GET /demand/skills`, `GET /demand/insights`, plus profile/search/notifications from the shared shell and a detail endpoint.

## Known blocker: map geometry

The regional ranking and table are functional, and selecting a state applies the same filter snapshot to the rest of the page. The map itself intentionally shows `Map unavailable`. The supplied handoff contains an illustrative PNG but not verified versioned state/UT GeoJSON plus a documented canonical code crosswalk; the implementation spec forbids using the PNG as a data map. Add that asset and crosswalk in the app/backend before enabling a choropleth.

## Important production integration note

The static bundle still loads React 18, ReactDOM 18, Lucide icons and Google Fonts from CDNs. The JSX is compiled and no browser Babel runtime is required, but this is not an offline/self-contained artifact. Before public production deployment, align endpoint shapes/authentication with the backend team and consider self-hosting runtime dependencies per your deployment policy.
