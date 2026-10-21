# Supply Insights API contract proposal

**Status:** proposed contract, not evidence that the current backend already exposes this endpoint. The UI must remain on labelled demo fixtures until the service implements this route and its response is verified.

## Route

`GET /api/v1/supply/overview?geography={canonicalGeographyCode}`

The frontend uses `VITE_SUPPLY_API_BASE_URL` for this module. It may point to the same API origin as other modules, but it is configured separately so a partial backend does not switch unrelated modules to REST mode. The adapter appends `/api/v1` unless the configured URL already ends with that prefix. The geography code is encoded as a query parameter.

Requests use `Accept: application/json` and credentials. The frontend accepts a raw JSON response or a `{ "data": ... }` envelope. HTTP/network errors and invalid payloads are surfaced to the user; REST failures never fall back silently to the demo adapter.

## Response shape

```json
{
  "data": {
    "geographyCode": "IN",
    "summary": {
      "workforceSupplyEstimate": 94800000,
      "workforceSupplyUnit": "persons",
      "trainingPipeline": 2160000,
      "trainingPipelineUnit": "learners",
      "credentialCoveragePct": 48
    },
    "sectors": [
      {
        "id": "manufacturing",
        "name": "Manufacturing",
        "availableSupply": 18600000,
        "unitCode": "persons",
        "changePct": 4.2,
        "coveragePct": 74,
        "level": "High",
        "note": "Methodology or crosswalk note"
      }
    ],
    "pipeline": [
      {
        "id": "enrolled",
        "label": "Enrolled in training",
        "valuePct": 76,
        "note": "Metric definition"
      }
    ],
    "readiness": [
      {
        "id": "geography-crosswalk",
        "label": "Canonical geography mapping",
        "value": "Verified",
        "status": "ready"
      }
    ],
    "meta": {
      "provenance": "SOURCE_BACKED",
      "sourceLabel": "Source label",
      "updatedAt": "2026-10-19T00:00:00Z",
      "note": "Methodology, coverage and limitation note"
    }
  }
}
```

Allowed provenance values: `SOURCE_BACKED`, `DERIVED`, `MIXED`, and `SYNTHETIC_DEMO`. Allowed sector readiness levels: `High`, `Moderate`, `Limited`. Allowed readiness status values: `ready`, `moderate`, `limited`.

## Data semantics

- Supply, training-pipeline and sector values must be numeric and accompanied by explicit units. Do not send preformatted display strings as analytical values.
- `changePct` is a percentage change only if the backend defines its baseline and period. `coveragePct` is completeness/coverage, not confidence.
- Pipeline stage values are not conversion rates unless they derive from a matched cohort with an approved denominator. Include the methodology note that explains their interpretation.
- The returned `geographyCode` must exactly match the requested canonical code. The frontend rejects mismatches instead of displaying values under the wrong selected geography.
- A missing coverage or readiness signal must be omitted or explicitly marked unavailable. Do not infer that a dataset is complete because no warning was returned.
- Every response should include provenance and a source/update note. If the API returns synthetic fixtures, retain the `SYNTHETIC_DEMO` label.

## Acceptance checks before enabling live mode

1. Implement the endpoint and validate all field types, allowed enumerations, numeric ranges and geography match.
2. Verify national and state/UT responses against approved source-backed records and canonical geography codes.
3. Confirm units, reporting period, update timestamp, and the definition of each percentage with the data/backend team.
4. Test empty sectors, missing readiness metadata, unknown geography, 401/403, 404, 429, 5xx, network failures, and malformed JSON.
5. Keep `VITE_SHRAMIK_API_BASE_URL` blank until the endpoint is implemented and contract-tested. Data Quality and Administration still use demo-only pages and are not wired to server operations.
