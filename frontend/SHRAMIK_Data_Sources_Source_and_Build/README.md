# SHRAMIK Data Sources — implementation package

This package provides a runnable static frontend release plus the React/TypeScript module for integration into SHRAMIK's existing web application.

## Fastest way to view the page

Open `release/index.html` (or `SHRAMIK_Data_Sources_Production.html`) in a browser. It is a single-file build with CSS, JavaScript and an explicitly `SYNTHETIC_DEMO` fixture embedded. Search, filters, paging, source details, tabs and the session-only draft flow work without npm installation.

## Main SHRAMIK application integration

Import `DataSourcesPage` from `src/data-sources/DataSourcesPage.tsx` and provide a `DataSourcesDataAdapter` with the app's existing authenticated shell and route. `src/main.tsx` is a local preview shell only; do not copy it into the app if a global shell already exists.

- `src/data-sources/mock-adapter.ts`: fixture adapter, demo only.
- `src/data-sources/rest-adapter.ts`: adapter for the proposed SHRAMIK API contract; calls the configured backend only.
- `src/data-sources/data-sources.types.ts`: typed source/provenance/status models.
- `release/API_INTEGRATION.md`: endpoint expectations and integration requirements.
- `docs/`: supplied requirements, design system, API semantics, component inventory and QA contracts.
- `docs/VALIDATION_REPORT.md`: tested vs unverified status.

## React build

Requires Node.js 20.19+ and npm. Commands are `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`. In the current build environment, registry requests failed with DNS `EAI_AGAIN`, so the Vite/TypeScript build could not be validated here. The static release is separate and runnable. Do not treat its working demo UI as evidence that backend integrations exist.
