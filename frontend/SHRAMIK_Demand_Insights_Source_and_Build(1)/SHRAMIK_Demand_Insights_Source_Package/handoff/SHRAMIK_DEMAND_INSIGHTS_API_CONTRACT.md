# SHRAMIK Demand Insights — API Contract Addendum

This page-specific addendum extends the shared SHRAMIK dashboard adapter. Use the application's existing authentication, base URL configuration, error handling and provenance types. Base path: `/api/v1`.

## Query model

Common filter query parameters:

- `period`: latest supported period/year or approved period key.
- `geography`: e.g. `IN` (national) or the selected geographic scope supported by the app.
- `stateCode`: optional canonical state/UT code for state-scoped panels. The regional comparison endpoint intentionally omits this filter so the map remains a 36-region comparison.
- `sectorId`: optional stable sector classification ID.
- `occupationCode`: optional NCO code with its taxonomy version resolved by backend or an accompanying version parameter.
- `skillId`: optional stable skill taxonomy ID.
- `compareTo`: optional comparison period when supported.

Send IDs/codes, not display labels. Every response should echo filters or provide `snapshotId` so UI panels can confirm they describe the same applied filter set.

## Routes

### `GET /demand/filter-options`
Returns supported periods, geography choices, valid state/UT choices, sectors, occupations and skills. Child options may be filtered by parent selections. Include taxonomy versions and any option-specific disabled/unavailable reasons.

### `GET /demand/overview`
Returns a consistent snapshot for the top hero summary, four KPI cards, trend chart, top occupation rows and top skill rows.

```json
{
  "appliedFilters": {
    "period": "2024",
    "geography": "IN",
    "stateCode": null,
    "sectorId": null,
    "occupationCode": null,
    "skillId": null
  },
  "heroComparison": {
    "metricLabel": "Estimated demand change",
    "value": 6.2,
    "formattedValue": "+6.2%",
    "unit": "%",
    "comparisonPeriod": "2023",
    "definition": "Year-over-year change in the specified estimated demand measure"
  },
  "kpis": [
    {
      "id": "estimated-demand",
      "title": "Total Estimated Demand",
      "value": 28400000,
      "formattedValue": "28.4M",
      "unit": "positions",
      "deltaPct": 6.2,
      "comparisonPeriod": "2023",
      "definition": "Backend-owned definition of the measure",
      "sparkline": [null],
      "meta": {
        "provenance": "mock",
        "sourceLabel": "Illustrative demo data",
        "updatedAt": null,
        "coverage": "Example only; not a labour-market finding",
        "notes": ["Example schema only; numeric values must be replaced by real data"]
      }
    }
  ],
  "trend": {
    "metric": "estimated-demand",
    "unit": "positions",
    "actual": [],
    "forecast": [],
    "forecastMethod": null,
    "meta": { "provenance": "mock", "sourceLabel": "Illustrative demo data", "updatedAt": null }
  },
  "topOccupations": [],
  "topSkills": [],
  "meta": {
    "provenance": "mock",
    "sourceLabel": "Illustrative demo data",
    "updatedAt": null,
    "snapshotId": "demo-snapshot"
  }
}
```

The `kpis` array contract must require four entries in this order: `estimated-demand`, `posting-volume` (or `posting-index`, never both ambiguously), `high-demand-occupations`, `high-demand-skills`. The sample above is illustrative schema only. The API must define whether demand is positions/people/vacancies/estimated need, and must not place index values into a count unit. A `sparkline` may be an empty array; use `null` only to illustrate the type contract.

### `GET /demand/regions?metric=estimated-demand&comparisonScope=all-states`
Returns the all-India state/UT comparison used by the choropleth and regional ranking. The frontend sends `geography=STATE` (using the supported state-level geography option) and omits `stateCode`, while preserving period, sector, occupation and skill filters. This is deliberate: clicking a state highlights it on the map and filters the overview/insights panels, but must not collapse the map to a single region. The API should return one row for each of the 36 canonical state/UT IDs, including explicit `missing` or `suppressed` rows where no value is publishable. New geography filters should apply to the map only if the product explicitly switches to a subnational drilldown layer.

Allowed metric names are only those enabled by the API, e.g. `estimated-demand`, `posting-count`, `demand-growth`. A regional comparison can legitimately have a different scope-specific `snapshotId` from a state-selected overview. The UI validates snapshot consistency across panels sharing the same scope, rather than flagging the broader regional comparison as inconsistent.

```json
{
  "metric": "estimated-demand",
  "period": "2024",
  "unit": "positions",
  "items": [
    {
      "stateCode": "CANONICAL-STATE-CODE",
      "stateName": "Example State",
      "value": 1250000,
      "formattedValue": "1.25M",
      "rank": 1,
      "sharePct": 12.1,
      "growthPct": 4.3,
      "status": "available"
    },
    {
      "stateCode": "CANONICAL-STATE-CODE-2",
      "stateName": "Another State",
      "value": null,
      "formattedValue": null,
      "rank": null,
      "sharePct": null,
      "growthPct": null,
      "status": "missing"
    }
  ],
  "legend": {
    "min": 0,
    "max": 1250000,
    "breaks": [0, 250000, 500000, 750000, 1000000, 1250000],
    "labels": ["0–0.25M", "0.25–0.5M", "0.5–0.75M", "0.75–1M", "1–1.25M"]
  },
  "meta": {
    "provenance": "mock",
    "sourceLabel": "Illustrative demo data",
    "updatedAt": null,
    "snapshotId": "demo-snapshot"
  }
}
```

The feature's canonical key in the GeoJSON and `items[].stateCode` must match exactly. Return all 36 state/UT IDs even when another page panel has a selected state. The actual canonical code system and crosswalk version must be documented. `status` is `available`, `suppressed` or `missing`; missing and suppressed are neutral map fills, not the lowest bin. `sharePct` must be defined by the backend and computed against the same scope/universe displayed in the tooltip.

### `GET /demand/occupations`
Paged list for View All; supports common filters and explicit `sort`, `direction`, `page`, `limit`. Each row includes stable NCO code/version, title, value, unit, growth, optional sparkline, definition/detail id and metadata.

### `GET /demand/skills`
Paged list for View All; supports common filters and explicit sort/pagination. Each row identifies whether the measure is an actual posting count or an index with baseline definition, taxonomy version, growth, optional sparkline, and metadata.

### `GET /demand/insights`
Returns evidence-backed insights for the active filter scope. Each insight includes `id`, `title`, `statement`, `explanation`, `evidenceRefs[]`, `severity`, `generatedAt`, `method` (`rule-based` or `llm-assisted`) and `meta`. Do not return a numeric claim unless it ties back to an included API result/source reference. If the feature is unavailable, return a clear supported unavailable response rather than a fake summary.

### Detail routing
Reuse `GET /dashboard/indicators/{id}` and `GET /dashboard/details/{section}` from the shared dashboard contract if sufficient. Otherwise introduce `GET /demand/details/{id}`. Avoid two different endpoints for the same item without a clear reason.

## Geometry asset contract

The GeoJSON is versioned with fields for boundary source, licence/usage terms, boundary date and canonical code scheme. Geometry can be hosted as a static versioned app asset or delivered via an authenticated geometry endpoint if policy requires it. It should not be downloaded on each filter change. A PNG illustration is not valid production geography.

## Errors and freshness

- Return 4xx for invalid/unsupported filter combinations and include a readable error code/message.
- Return 5xx for service failures without exposing secrets or stack traces.
- Include `updatedAt`, `sourceLabel`, `provenance`, units, period/coverage and notes where applicable.
- `provenance` is `source-backed`, `derived`, `mixed`, `mock`, `synthetic` or `synthetic-demo`. Use `synthetic` / `synthetic-demo` for generated benchmark or SIH evaluation values; provide a `sourceLabel` such as `Synthetic evaluation dataset` and notes explaining that values are generated, not observed. The UI explicitly preserves this distinction. A mixed payload must explain which values are not source-backed. Never label synthetic evaluation data as live or source-backed.
- Use request cancellation client-side; server may ignore cancelled work, but stale results must not overwrite newer applied filters.
