# SHRAMIK Report Rendering Engine — Design and Implementation Plan

## Responsibility split

1. **Report Builder UI (React):** collects report options and displays status.
2. **Report assembly service:** validates configuration and obtains approved analytics outputs, source metadata and methodology notes; creates a versioned structured `ReportDocumentModel`.
3. **Document template renderer:** transforms the model into a component tree/HTML using a versioned template. Charts/maps are generated from structured data using SVG/HTML components.
4. **PDF renderer (backend):** in production, runs Chromium/Playwright to render the HTML and emits PDF bytes. This is a proposed service, not an existing implemented engine.
5. **Storage and library:** persist report record/config/version/status and store the private PDF file; enforce permissions and authorised download.

## Frontend milestone (build now)

- Implement a real HTML Report Preview from the typed `ReportDocumentModel`.
- Provide a `Print / Save as PDF` action using `window.print()` plus `@media print` styles when no server PDF endpoint is available. Explain that the browser's print dialog handles file saving; do not show a false server-download success.
- Export a real CSV from selected structured table data using browser Blob/object URL if allowed by the project CSP/patterns.
- Hide application sidebar/topbar/buttons from print. Keep only document contents.
- Keep `ExportService` abstraction so actual backend PDF service can be added without changing report templates.

## Production PDF service (later / parallel backend task)

Suggested pipeline:
1. Accept a report ID or validated report configuration, not arbitrary HTML from the client.
2. Load the frozen report document/model and versioned HTML template server-side.
3. Render in a controlled, patched Chromium runtime via Playwright.
4. Use an allowlisted asset loader; block arbitrary navigation/network requests from report content where feasible; don't allow user inputs to inject scripts/remote URLs.
5. Wait for document fonts and chart SVGs to complete; handle timeouts safely.
6. Generate A4 PDF with explicit print backgrounds, margins, page headers/footers via Playwright header/footer templates if configured, and page numbers.
7. Validate non-zero page count, non-empty PDF bytes, expected report/version metadata and job completion.
8. Store PDF privately; return an authorised download capability or endpoint. Set expiry/permissions according to backend policy.
9. Record status, template version, data snapshot IDs, renderer version, checksum, created time, warnings and failure code.
10. Retry safe transient errors without generating duplicate report records; keep idempotency key/request ID where appropriate.

## Important constraints

- The renderer applies the design created in HTML/CSS; it does not design the report itself.
- Report data and template should be separate. Do not save the entire report as one screenshot.
- Keep text searchable/selectable when possible; charts are vector; decorative imagery may be raster.
- Sanitize/escape all source labels and text. Never render raw untrusted HTML from the model or source records.
- Private reports must not be stored in public object storage.
- `COMPLETED` must only be emitted after a file exists and has passed basic integrity checks.
- Report exports are versioned snapshots; changes in data/selection require regeneration or a new version.
