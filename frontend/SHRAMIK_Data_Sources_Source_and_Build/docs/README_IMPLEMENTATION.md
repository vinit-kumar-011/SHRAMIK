# SHRAMIK Data Sources — implementation and runbook

## What this package contains

- `src/data-sources/DataSourcesPage.tsx`: page module only; does not render the global shell and can be embedded in the main SHRAMIK router/layout.
- `src/main.tsx`: standalone preview shell that follows the locked SHRAMIK sidebar order. Do not copy this shell into the existing application if its shared shell already exists.
- `src/data-sources/mock-adapter.ts`: deterministic session-local fixture adapter. Every fixture record remains `SYNTHETIC_DEMO`.
- `src/data-sources/rest-adapter.ts`: browser-to-SHRAMIK backend adapter for the proposed `/api/v1/data-sources` contract. It does not call MoSPI, e-Shram, NCS or any upstream provider directly.
- `src/data-sources/mock-data-sources.json`: the handoff fixture.
- `docs/`: original design, implementation, API, semantics and QA contracts.

## Local run

Requirements: Node.js 20.19+ (Node 22 LTS recommended) and npm.

```bash
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm run preview
```

Local preview defaults to the `SYNTHETIC_DEMO` fixture. Registry records, dates, status states, coverage, mapping and ingestion rows are illustrative only. Creating a source from this mode adds an in-memory draft for the current browser session and does not persist it or configure a connector.

## Backend mode

1. Confirm the real backend routes, response schemas, authentication, authorization and error conventions. API endpoint names in the supplied handoff are proposals, not proof they already exist.
2. Copy `.env.example` to `.env.local` and set `VITE_DATA_SOURCES_API_BASE_URL` to the backend API base (including `/api/v1`), for example `/api/v1` when same-origin proxying is configured.
3. Keep create and ingestion feature flags `false` until corresponding server routes and permission/capability checks are implemented and verified.
4. The server must return provenance and safe capability flags. API mode never falls back to the fixture if a request fails; it shows a retryable error and preserves the selected filters.
5. Use a same-origin reverse proxy or explicit CORS configuration. The REST adapter sends same-origin/session cookies (`credentials: include`) and no provider credentials.
6. Test 401/403, 404, 429, 5xx, malformed JSON, empty datasets, pagination, and partial coverage before production release.

## Data rules intentionally retained

- Lifecycle status and freshness are separate signals.
- Reporting period, source publication/release, successful retrieval, and last validation are separate fields.
- Missing data is `Not reported`, `Unknown`, or `Not configured`; it is not inferred as zero or success.
- A queued ingestion response is shown as queued, not completed.
- Mapping summaries do not infer a completion percentage from visible/paginated rows.
- Credentials, tokens and upstream connection strings are never rendered in this UI.

## Embed into the existing SHRAMIK app

Import and render `DataSourcesPage` through the current router and shared shell:

```tsx
<DataSourcesPage adapter={dataSourcesAdapter} />
```

Do not add another router, header, sidebar, User Management or Settings destination solely for this module. Reuse the shared app's tokens/primitives if it already has them; the provided stylesheet is the standalone page styling namespace plus preview-shell styles.
