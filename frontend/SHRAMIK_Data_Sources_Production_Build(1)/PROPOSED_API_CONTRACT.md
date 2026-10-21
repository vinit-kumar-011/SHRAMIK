# SHRAMIK Data Sources — Proposed API Contract

**Status:** Proposal for frontend/backend parallel work. Route names and schemas below do not prove these endpoints exist. Confirm current backend conventions, authentication and database schema before implementation.

## Principles

- Browser calls SHRAMIK backend only; upstream source retrieval happens server-side.
- API response includes lifecycle state and provenance; front end must not infer a verified connection from a successful mock request.
- Use ISO-8601 timestamps with timezone for instants and explicit period values for reporting ranges.
- Missing values use `null` or omitted optional fields; do not coerce missing values to zero or empty strings without defined semantics.
- Sensitive config should be represented only through a safe summary, never as secrets.
- Read endpoints must enforce user scope and row-level authorisation.

## Proposed endpoints

### Source registry
`GET /api/v1/data-sources?query=&status=&type=&agency=&page=1&pageSize=20`

Example response:

```json
{
  "items": [
    {
      "id": "src_demo_plfs",
      "name": "PLFS (Periodic Labour Force Survey)",
      "description": "Illustrative labour-force dataset record",
      "type": "GOVERNMENT_DATASET",
      "agencyOwner": "MoSPI (illustrative metadata)",
      "purpose": "Labour force statistics",
      "geographicCoverage": [{"level": "COUNTRY", "code": "IN", "label": "India"}],
      "reportingPeriods": [{"label": "2017–2023", "start": "2017", "end": "2023"}],
      "sourceReleaseDate": null,
      "lastSuccessfulRetrievalAt": null,
      "lastValidatedAt": null,
      "lifecycleStatus": "PENDING_VALIDATION",
      "freshnessStatus": "UNKNOWN",
      "provenance": "SYNTHETIC_DEMO",
      "tags": ["employment", "labour force"],
      "capabilities": {"view": true, "edit": false, "retryIngestion": false, "delete": false}
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "summary": {"total": 1, "active": 0, "needsAttention": 1, "notConfigured": 0},
  "meta": {"provenance": "SYNTHETIC_DEMO", "updatedAt": null}
}
```

The record above is a schema illustration only. It is not a validated PLFS integration or statement about live source metadata.

### Source detail
`GET /api/v1/data-sources/{sourceId}`

Returns one `DataSourceRecord`, its safe configuration summary, `capabilities`, provenance and `limitations`.

### Ingestion history
`GET /api/v1/data-sources/{sourceId}/ingestion-runs?page=1&pageSize=10`

Fields may include: `runId`, `sourceId`, `status`, `startedAt`, `completedAt`, `durationMs`, `recordsRetrieved`, `recordsAccepted`, `recordsRejected`, `warningCount`, `errorCode`, safe `message`, `provenance`, and pagination metadata. Do not show counts or times unless the backend supplies them.

### Coverage
`GET /api/v1/data-sources/{sourceId}/coverage`

Return coverage dimensions separately: geographic scopes, reporting periods available, taxonomy versions/codes where relevant, known gaps and the period last validated. Coverage can be `PARTIAL`, `UNKNOWN` or `NOT_CONFIGURED`.

### Field mappings
`GET /api/v1/data-sources/{sourceId}/field-mappings?schemaVersion=`

Return source field, source type, canonical field, canonical type, transform/normalisation note, mapping status, mapping method/version and review note where available. Avoid returning raw records that could include sensitive data.

### Create/update, ingest trigger
Potential future routes:
- `POST /api/v1/data-sources`
- `PATCH /api/v1/data-sources/{sourceId}`
- `POST /api/v1/data-sources/{sourceId}/ingestion-runs`

Implement these only if the backend service and permissions exist. For long-running ingestion, return a job/run ID and poll a documented status endpoint. Never respond `success` because a request was accepted; distinguish `QUEUED` from `SUCCEEDED`.

## Core enums

- `SourceType`: `GOVERNMENT_DATASET`, `REFERENCE_DATA`, `INDUSTRY_FEED`, `TRAINING_DATASET`, `INTERNAL_DATASET`, `OTHER`.
- `SourceLifecycleStatus`: `ACTIVE`, `PENDING_VALIDATION`, `STALE`, `FAILED`, `NOT_CONFIGURED`, `DISABLED`, `UNKNOWN`.
- `FreshnessStatus`: `UP_TO_DATE`, `DUE_SOON`, `STALE`, `UNKNOWN`, `NOT_APPLICABLE`.
- `IngestionRunStatus`: `QUEUED`, `RUNNING`, `SUCCEEDED`, `WARNING`, `FAILED`, `CANCELLED`, `NOT_CONFIGURED`.
- `Provenance`: `SOURCE_BACKED`, `SYNTHETIC_DEMO`, `DERIVED`, `MIXED`, `UNKNOWN`.
- `MappingStatus`: `MAPPED`, `NEEDS_REVIEW`, `UNMAPPED`, `REJECTED`, `NOT_CONFIGURED`.

## Error shape

```json
{
  "error": {
    "code": "SOURCE_DETAIL_UNAVAILABLE",
    "message": "Source details could not be loaded.",
    "retryable": true,
    "requestId": "optional-safe-correlation-id"
  }
}
```

Do not expose stack traces, secrets, connector URLs containing credentials, or private storage identifiers.
