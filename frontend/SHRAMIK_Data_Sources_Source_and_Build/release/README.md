# SHRAMIK Data Sources — standalone static release

This directory contains the self-contained, browser-ready Data Sources page. `index.html` includes its CSS, JavaScript and explicitly synthetic preview fixture; it has no runtime CDN or npm dependency. It can be opened directly for preview or deployed as a static page.

## Modes

- **Preview mode (default):** operates on the supplied fixture. All fixture records, statuses, dates, ingestion-run examples and coverage/mapping metadata are labelled `SYNTHETIC_DEMO` and are not evidence of a working connector. Add-source creates an in-memory draft for this page session only.
- **SHRAMIK API mode:** use **Configure API** and enter the versioned API base URL (usually ending in `/api/v1`). Expected routes are described in `API_INTEGRATION.md`. The page sends requests only to the configured SHRAMIK backend and sends cookies with `credentials: include`. Configure HTTPS, authenticated application session, authorization and CORS at deployment. Do not put bearer tokens or upstream credentials into client code.
- **No silent fallback:** when an API request fails, the registry stays in the API error state and shows Retry; it does not load sample records in place of live results.

## Deploy

1. Deploy `index.html` at the route where the page should be served.
2. Configure the API base through the UI or by deploying the page with `?apiBase=https%3A%2F%2Fyour-host%2Fapi%2Fv1`. Optional write-action flags are `&enableCreate=true&enableIngestion=true`; leave them off until the corresponding backend routes and permissions have been tested.
3. Validate authentication, CORS, source access scope, API response schemas, 401/403/404/429/5xx handling and every details tab against the actual backend.
4. Use the React/TypeScript module under `src/data-sources/` to integrate the page into the main SHRAMIK application. The main app must provide its existing shell, router and authenticated adapter; do not duplicate the standalone shell inside that route.

## Release limitations

This is a production-style static frontend build, not a claim that SHRAMIK's backend endpoints, source retrieval jobs or credentials have been verified. The current page supports the proposed contract; the contract must be reconciled with the running API before enabling actions. The React app's Vite build/typecheck could not be completed in the build environment because npm registry requests failed with DNS `EAI_AGAIN`; the standalone release was separately tested in Chromium.
