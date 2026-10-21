# SHRAMIK Scenario Simulator — Implementation Package

This package includes two deliverables:

1. `../SHRAMIK_Scenario_Simulator_Updated.html` — a standalone, browser-openable interface preview.
2. `src/` — the modular React + TypeScript page, adapter interface, fixed synthetic adapter, proposed REST adapter and types.

The specification and visual reference materials are in `docs/handoff/`.

## Important implementation boundaries

- The sample result is a fixed `SYNTHETIC_DEMO` fixture. It is not a calibrated labour-market simulation and must not inform real policy decisions.
- The fixed fixture supports only the documented Data Analysis / India / 50,000 additional seats per year / 24-month training lag / 2027 start / 2030 evaluation case. Other inputs must not be used to produce made-up outcomes.
- Regional, sector, occupation and sensitivity results remain explicitly unavailable unless supplied by an API response.
- The modular React page defaults to the REST adapter; it does not silently fall back to the mock adapter after API failure.
- REST routes in the handoff are proposed contracts, not confirmation that matching backend endpoints already exist.
- The standalone HTML loads simplified Natural Earth-derived state/UT outlines from a pinned external URL for the regional view. It shows no regional values from the national synthetic result. A production deployment should vendor a reviewed boundary asset locally, document its licence/version, and use a backend-provided canonical geography crosswalk.

## Run the standalone preview

Open `SHRAMIK_Scenario_Simulator_Updated.html` in a modern browser. For reliable boundary fetching, serve it over localhost rather than `file://` if the browser blocks cross-origin requests. A local static server can be started from the folder containing the HTML with:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/SHRAMIK_Scenario_Simulator_Updated.html`.

## Integration

Copy `src/` into the existing SHRAMIK React + TypeScript application. Install/use the host repository's existing React, TypeScript and test dependencies rather than creating a separate application shell. See `docs/handoff/INTEGRATION_CONTRACT.md`, `docs/handoff/SHRAMIK_SCENARIO_SIMULATOR_API_CONTRACT.md`, and `docs/handoff/SHRAMIK_SCENARIO_SIMULATOR_DATA_SEMANTICS.md`.

## QA performed in this package environment

- Inline JavaScript syntax check (`node --check`): passed.
- Standalone artifact structural checks (title, required interaction controls, view tabs, clear synthetic-data label, regional no-data state): passed.
- ZIP archive integrity: checked when producing the deliverable archive.

## Not claimed

- No full React/Vite build, TypeScript typecheck against the host application's dependencies, integration test against live endpoints, or successful browser visual-regression run has been completed in this environment.
