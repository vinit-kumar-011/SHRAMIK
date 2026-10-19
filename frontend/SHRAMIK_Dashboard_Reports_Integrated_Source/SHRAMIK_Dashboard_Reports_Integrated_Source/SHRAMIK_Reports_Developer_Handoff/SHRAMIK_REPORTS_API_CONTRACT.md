# SHRAMIK Reports — Proposed API Contract

**Status:** Proposed contract for parallel implementation; these routes are not asserted to exist yet. Confirm naming/auth conventions against the existing backend before implementation.

## Design principles

- The browser consumes SHRAMIK's backend only; no direct upstream source calls from the frontend.
- A generated report is a versioned snapshot of config + selected data versions + template version. New data should not silently mutate an existing report.
- Long report generation should be asynchronous; API returns a report ID/job status and the client polls or subscribes if a supported mechanism exists.
- Every analytics payload includes value/unit/period/definition/provenance and applicable quality limitations.
- Never expose credentials, raw restricted microdata or internal storage URIs to the client.

## Proposed endpoints

### Options
`GET /api/v1/reports/options`

Returns allowed report types, sections, supported geographies/periods, reference years, source snapshots and export capabilities.

```json
{
  "reportTypes": ["STATE", "SECTOR", "SKILL", "POLICY_BRIEF", "CUSTOM"],
  "sections": ["EXECUTIVE_SUMMARY", "DEMAND", "SUPPLY", "SKILL_GAPS", "EMERGING_SKILLS", "FORECASTS", "SCENARIO", "REGIONAL", "SECTOR", "OCCUPATION", "POLICY_RECOMMENDATIONS", "SOURCES_METHOD"],
  "supportedGeographies": [{"id":"IN-KA","label":"Karnataka","level":"STATE_UT"}],
  "availablePeriods": [{"start":"2025-01-01","end":"2025-12-31","label":"2025"}],
  "referenceYears": [2025],
  "exports": {"pdf":"PRINT_FALLBACK", "csv":true, "xlsx":false},
  "meta": {"provenance":"SOURCE_BACKED", "updatedAt":null}
}
```

### Create/generate
`POST /api/v1/reports`

Request:

```json
{
  "reportType":"STATE",
  "title":"Labour Market Insights — Karnataka",
  "geographyIds":["IN-KA"],
  "period":{"start":"2025-01-01","end":"2030-12-31"},
  "referenceYear":2030,
  "sectionKeys":["EXECUTIVE_SUMMARY","DEMAND","SUPPLY","SKILL_GAPS","SOURCES_METHOD"],
  "sourcePolicy":{"mode":"LATEST_VALIDATED"},
  "options":{"includeUncertainty":true,"includeDataAppendix":false},
  "templateVersion":"shramik-report-v1"
}
```

Returns `202 Accepted` for async mode:

```json
{"reportId":"rpt_123","status":"QUEUED","createdAt":"2026-10-14T00:00:00Z","provenance":"SOURCE_BACKED"}
```

The IDs/timestamps above are schema examples, not real records.

### List reports
`GET /api/v1/reports?query=&type=&geographyId=&status=&periodStart=&periodEnd=&page=&pageSize=`

Returns `items`, `total`, `page`, `pageSize`; each item includes ID, title, type, geography labels, period, created/updated timestamp when available, status, provenance, data snapshot/version, and capability flags.

### Read report/status
`GET /api/v1/reports/{reportId}` returns report record plus the structured `ReportDocumentModel` when ready.
`GET /api/v1/reports/{reportId}/status` returns status, progress if meaningful, safe error code/message and retry capability.

Statuses: `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`, `NOT_CONFIGURED`. Only the backend can mark a real report as `COMPLETED`.

### Duplicate/regenerate/save
`POST /api/v1/reports/{reportId}/duplicate` duplicates configuration; it should not assert that an output has been regenerated.
`POST /api/v1/reports/{reportId}/regenerate` creates a new version/snapshot.
`PATCH /api/v1/reports/{reportId}` saves supported editable metadata only.
`DELETE /api/v1/reports/{reportId}` should exist only if permitted and must enforce authorisation.

### Export
`POST /api/v1/reports/{reportId}/exports` request `{"format":"PDF"}` or `{"format":"CSV","sectionKey":"DEMAND"}`. Return an export job/result with status and an authorised download URL or endpoint. For PDF, service uses approved template version and validated report data. No permanent public bucket URLs for private reports.

A CSV endpoint can also be `GET /api/v1/reports/{reportId}/sections/{sectionKey}/export?format=csv` if it matches established project conventions.

## Report document response model

```json
{
  "id":"rpt_123",
  "title":"Labour Market Insights — Karnataka",
  "reportType":"STATE",
  "scope":{"geographyIds":["IN-KA"],"labels":["Karnataka"]},
  "period":{"start":"2025-01-01","end":"2030-12-31"},
  "generatedAt":null,
  "templateVersion":"shramik-report-v1",
  "provenance":"SYNTHETIC_DEMO",
  "sections":[{"key":"EXECUTIVE_SUMMARY","title":"Executive Summary","status":"READY","blocks":[]}],
  "meta":{"dataSnapshotIds":[],"methodologyVersion":null,"sourceLabels":[],"limitations":["Illustrative fixture; not a verified finding."]}
}
```

Block kinds should be a finite discriminated union: `paragraph`, `finding`, `metric_grid`, `chart`, `table`, `map`, `callout`, `source_list`, `methodology`, `unavailable`. Do not pass arbitrary HTML from the backend and insert it unsanitised.

## Error shape

```json
{"error":{"code":"REPORT_DATA_INSUFFICIENT","message":"The selected scope does not have enough validated data for this section.","retryable":false,"details":{}}}
```

Do not convert missing data or an API error into a zero. Preserve builder configuration after failures.
