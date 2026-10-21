# Data Sources API integration notes

The API contract is proposed, not proof of existing backend routes. Confirm paths and exact response shapes with the backend team before deployment.

- `GET /data-sources?query=&status=&type=&agency=&page=1&pageSize=5` — paged registry; optional `summary`, `facets.agencies`, `meta.provenance`, and `meta.updatedAt`.
- `GET /data-sources/{sourceId}` — one safe `DataSourceRecord` with lifecycle status, freshness, date fields, coverage and capability flags.
- `GET /data-sources/{sourceId}/ingestion-runs?page=1&pageSize=10` — a paged set of runs. `QUEUED` means accepted, not complete; records retrieved/accepted/rejected are distinct.
- `GET /data-sources/{sourceId}/coverage` — actual geography, time/taxonomy coverage and limitations.
- `GET /data-sources/{sourceId}/field-mappings` — field mappings, schema version and mapping state.
- `POST /data-sources` — disabled until explicitly enabled. Backend must authorize and validate; a successful response means source metadata was accepted, not that a connector exists.
- `POST /data-sources/{sourceId}/ingestion-runs` — disabled until explicitly enabled and record capabilities allow it. A queued response must not be described as ingestion success.

The API base URL entered in the UI should include the versioned prefix, e.g. `https://your-host/api/v1`, because page request paths are appended to it.

## Response semantics

- Provenance values: `SOURCE_BACKED`, `SYNTHETIC_DEMO`, `DERIVED`, `MIXED`, `UNKNOWN`.
- Lifecycle status and freshness status are separate; freshness is based on backend policy, not simply on a retrieval date.
- Source reporting period, publication/release date, successful retrieval timestamp and validation timestamp are separate.
- Missing values remain `Not reported`, `Unknown`, or `Not configured`.
- Errors are shown as safe messages. No upstream connector credentials, tokens or private connection strings are rendered.
- Browser code calls the SHRAMIK backend only; upstream portals and source providers must be accessed server-side.
