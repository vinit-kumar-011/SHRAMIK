# Data Sources integration status

**Frontend:** standalone static page implemented and Chromium-smoke-tested; React/TypeScript page module, mock adapter and REST adapter are present for integration into SHRAMIK's shared shell.

**Backend:** not verified by this frontend package. Route definitions remain proposed until checked against the running SHRAMIK API, auth model and database/schema. No live connector status should be inferred from the fixture or from this frontend alone.

| Capability | Frontend behaviour | Backend dependency |
|---|---|---|
| List and filters | Search/status/type/agency filters, pagination, summary aggregates | `GET /api/v1/data-sources`, authorised scope, query semantics, real aggregate/provenance fields |
| Detail | Drawer overview | `GET /api/v1/data-sources/{sourceId}` |
| Ingestion history | Independent run tab with safe empty/error states and separate counts | `GET /api/v1/data-sources/{sourceId}/ingestion-runs` |
| Coverage | Independent geography/time/taxonomy coverage tab | `GET /api/v1/data-sources/{sourceId}/coverage` |
| Field mapping | Independent mapping tab; empty and error states are explicit | `GET /api/v1/data-sources/{sourceId}/field-mappings` |
| Create source | Session-only draft in preview; REST write only when explicitly enabled | `POST /api/v1/data-sources`, authenticated and authorized; server owns validation/persistence |
| Start ingestion | REST request only when explicitly enabled and record capabilities allow it | `POST /api/v1/data-sources/{sourceId}/ingestion-runs`; 202/QUEUED is not success |

## Release gates before calling the integrated application production-live

- Confirm route names/response schemas, authentication, permissions, CORS/proxy and error conventions in the actual backend.
- Verify source records reflect real `data_sources` / source-retrieval records or the project's equivalent.
- Confirm lifecycle and freshness policy definitions; keep them distinct.
- Complete the Vite/TypeScript build and Vitest run once npm registry access is available.
- Integrate through the existing shared shell and route; browser-test the joined app at 1440, 1280, 1024, 768, 390 and 320 px.
- Complete keyboard/screen-reader testing and inspect app monitoring/error logging conventions.
