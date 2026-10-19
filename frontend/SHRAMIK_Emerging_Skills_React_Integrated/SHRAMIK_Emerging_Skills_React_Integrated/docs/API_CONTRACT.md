# SHRAMIK Dashboard API Contract

**Base path:** `/api/v1`  
**Transport:** JSON over HTTPS; credentials included by default.  
**Response envelope:** the REST adapter accepts a raw JSON payload or `{ "data": payload }`.  
**Errors:** non-2xx responses become `ApiRequestError`; clients should return useful 4xx/5xx messages without leaking secrets.

## Endpoints

### `GET /regions`
Returns `RegionOption[]`.

```json
[
  { "code": "IN", "label": "India (National)", "level": "national" },
  { "code": "OD", "label": "Odisha", "level": "state" }
]
```

### `GET /me`
Returns `UserProfile`.

```json
{ "id": "user-id", "displayName": "Analyst Name", "role": "Research Analyst", "initials": "AN", "organisation": "Organisation" }
```

### `GET /dashboard/summary?region=IN&period=5y`
Returns `DashboardSummary`:

```json
{
  "regionCode": "IN",
  "regionName": "India (National)",
  "periodYears": 5,
  "kpis": [
    {
      "id": "total-labour-demand",
      "key": "demand",
      "title": "Total Labour Demand",
      "subtitle": "Estimated workforce demand",
      "value": 236.8,
      "formattedValue": "236.8M",
      "unit": "million workers",
      "deltaPct": 4.2,
      "context": "vs. last year",
      "trend": [18, 25, 23, 36, 32, 45, 49, 64],
      "meta": { "provenance": "source-backed", "sourceLabel": "Named source / release", "updatedAt": "2026-10-01T00:00:00Z" }
    }
  ],
  "trend": [ { "year": 2022, "demand": 169, "supply": 132 } ],
  "emergingSkills": [],
  "sectorGaps": [],
  "occupationForecasts": [],
  "meta": { "provenance": "source-backed", "sourceLabel": "Named source / release", "updatedAt": "2026-10-01T00:00:00Z", "coverage": "National; period ...", "notes": [] }
}
```

The KPI array must contain exactly the four approved cards in this order unless design approval changes the layout: demand, supply, skill gap, emerging skills. Arrays in the example are abbreviated; actual row entries must match `src/api/contracts.ts`.

### `GET /dashboard/regions/rankings?region=IN&metric=demand`
`metric` is one of `demand`, `supply`, `skill-gap`. Returns:

```json
{
  "metric": "demand",
  "unit": "million workers",
  "items": [ { "code": "MH", "name": "Maharashtra", "value": 28.4, "formattedValue": "28.4M", "rank": 1, "level": "high" } ],
  "meta": { "provenance": "source-backed", "sourceLabel": "Named source", "updatedAt": "2026-10-01T00:00:00Z" }
}
```

The items must already be sorted for the requested metric, or include `rank` matching that order. Never derive map shading from this list unless real state geometries and join keys are present in the same implementation.

### `GET /search?q=construction&region=IN`
Returns `SearchResult[]`; each item has `id`, `label`, `description`, `kind` (`skill`, `occupation`, `sector`, `region`, `indicator`, `report`) and `target` (stable route/section key or region code).

### `GET /notifications`
Returns `NotificationItem[]`, including `id`, `title`, `body`, ISO `createdAt`, boolean `read`, and `severity` (`info`, `success`, `warning`).

### `PATCH /notifications/{id}/read`
Marks one notification read; success can be `204 No Content` or JSON. The UI changes state only after this resolves.

### `GET /dashboard/indicators/{id}?region=IN`
Returns one `DetailPayload` for a KPI or an individual list row. Include `id`, `title`, `description`, `facts[]`, optional `table`, and `meta`.

### `GET /dashboard/details/{section}?region=IN`
Returns section-level detail for navigation, view-all actions, chart detail or profile detail. Reuse `DetailPayload`; `section` is a stable slug such as `demand`, `supply`, `skill-gaps`, `emerging-skills`, `forecasts`, `reports`, `data-sources`, `data-quality`, `scenario-simulator`, or `profile`.

## Provenance requirements

`meta.provenance` is mandatory on dashboard, ranking and detail responses:

- `source-backed`: every presented value has a documented, auditable source.
- `mixed`: a response combines source-backed and non-source-backed values; `notes` must identify this explicitly.
- `mock`: demonstration/synthetic UI data only.

`sourceLabel` should identify the source or make demo/mock status unmistakable. `updatedAt` may be `null` when not supplied. Include units and temporal coverage in labels/notes. Do not invent provenance at the client.
