# Data Quality API contract proposal

**Status:** proposed read-only overview route; this is not evidence the current backend already implements it. Keep the demo adapter selected until the route and response schema are implemented and tested.

## Route

`GET /api/v1/data-quality/overview`

The shared `VITE_SHRAMIK_API_BASE_URL` points to the API host; the adapter adds `/api/v1` when required. Requests include credentials. The adapter accepts a raw JSON body or `{ "data": ... }` envelope. HTTP/network/contract failures are shown to the user without mock fallback.

## Response shape

```json
{
  "data": {
    "summary": { "recordsChecked": 12440, "validRecords": 11982 },
    "issues": [
      {
        "id": "DQ-123",
        "title": "Missing occupation code",
        "dataset": "dataset-id",
        "field": "occupation_code",
        "severity": "high",
        "status": "open",
        "records": 12,
        "rule": "NCO-REQUIRED-01",
        "detected": "2026-10-19T08:30:00Z",
        "description": "Validated, source-backed issue description"
      }
    ],
    "validationRuns": [
      {
        "id": "RUN-123",
        "dataset": "dataset-id",
        "date": "2026-10-19T08:30:00Z",
        "status": "Succeeded with findings",
        "checked": "12440",
        "findings": "38"
      }
    ],
    "rules": [
      { "id": "NCO-REQUIRED-01", "name": "Canonical occupation code is required", "severity": "High", "family": "Taxonomy mapping" }
    ],
    "meta": {
      "provenance": "SOURCE_BACKED",
      "sourceLabel": "Validation service",
      "updatedAt": "2026-10-19T08:35:00Z",
      "note": "Coverage, limitations and validation policy note"
    }
  }
}
```

Allowed issue severity: `critical`, `high`, `medium`, `low`. Allowed issue status: `open`, `in_review`, `resolved`, `suppressed`. The `summary.validRecords` value must not exceed `summary.recordsChecked`. Provenance values are `SOURCE_BACKED`, `DERIVED`, `MIXED`, or `SYNTHETIC_DEMO`.

## Safety boundary

The current Data Quality REST adapter is intentionally read-only. It does not start validation runs or update issues/rules. The UI disables local status controls for REST mode until a distinct, approved mutation contract exists. Do not expose a rule editor or “start validation” action without server-side authorization, an audited run lifecycle, and an idempotent request contract.

## Acceptance checks

1. Verify counts, statuses, severity values, IDs and timestamps against persisted validation records.
2. Test empty collections, unknown fields, malformed JSON, 401/403, 404, 429, 5xx and network failure.
3. Confirm sensitive row-level records and validation details are permission-filtered on the server.
4. Keep `VITE_SHRAMIK_API_BASE_URL` blank until this read-only endpoint is implemented and verified.
