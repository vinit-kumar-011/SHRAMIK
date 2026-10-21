# Reports feature — Backend Architecture Alignment

The existing SHRAMIK data architecture is a source-ingestion/analytics blueprint. It contains source registry/retrieval/provenance concepts and validated analytics outputs, but the existence of a report-generation job/service, report metadata table or PDF storage contract has not been established by that blueprint. Treat these as proposed additions, not as existing features.

## Suggested additive model

- `report_runs`: report ID, owner/tenant or permitted scope, type/title, config JSONB, status, error code, template version, created/updated times, source snapshot IDs, data provenance, methodology/model versions.
- `report_sections`: report/version, section key/order/status, structured section payload or pointer to immutable snapshot; avoid arbitrary client-provided HTML.
- `report_exports`: report/version, format, status, storage object key (private), checksum, size/page count, renderer version, requested/completed time, safe error details.
- Optional `report_templates`: template key/version/status and supported report types/sections, if templates need to be managed in backend.

Use relational fields for queryable/filterable values and validated JSONB for structured config/blocks when appropriate. Add constraints and indexes after review against the actual SQL schema and auth model. Apply server-side authorisation, row-level access control as applicable, private object storage and time-limited authorised downloads.

## Service flow

1. Validate configuration and that selected sections have available/approved data.
2. Resolve one consistent data snapshot or record every per-section snapshot.
3. Build `ReportDocumentModel` and save immutable report version/config.
4. Render HTML from an allowlisted template and structured blocks.
5. For PDF, call a controlled Playwright/Chromium worker; do not accept arbitrary HTML/script from the client.
6. Validate output, store privately, update status and expose authorised download.
7. Log template/renderer version, source data version, provenance and warnings.

## Frontend now

Use mock adapter and in-browser HTML document preview. The browser print dialog can be the first PDF-like fallback; production PDF requires the backend renderer. Implementing the frontend does not require the source verification work to be complete, as long as all mock data are explicitly synthetic and adapters are replaceable.
