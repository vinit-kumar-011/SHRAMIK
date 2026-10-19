# SHRAMIK Emerging Skills Intelligence — Proposed API Contract

**Status:** Proposed contract for parallel frontend/backend development. These routes are not asserted to exist yet. Agree final naming and auth conventions with the existing SHRAMIK backend before implementation.

## 1. Contract principles

- Versioned JSON API under `/api/v1`.
- Return canonical IDs and codes plus display labels; labels are not identifiers.
- Use the shared geography, sector and NCO classification versions.
- Every analytical response includes `meta` with `provenanceState` (`SOURCE_BACKED`, `DERIVED`, `MIXED`, `SYNTHETIC_DEMO`), `qualityStatus`, `sourceAsOf`, `updatedAt`, `observationWindow`, `coverage`, and method/rule versions as applicable.
- Use ISO 8601 dates; spell out metric units and definitions.
- Unknown/missing is never represented as zero. Return explicit empty or unsupported states.
- Authenticated user-specific endpoints (watchlist/alert rules) require existing auth and permission conventions; do not invent a parallel auth model.

## 2. Shared query filters

Typical query fields: `periodStart`, `periodEnd`, `geographyId`, `sectorId`, `skillCategory`, `sortBy`, `sortDirection`, `page`, `pageSize`. Occupation/sector code system and version should be resolvable in the response. Use a single filter state contract across the five views.

## 3. Proposed endpoints

### Overview
`GET /api/v1/emerging-skills/overview`

Returns category counts, ranked skill signals, category distribution (if appropriate), key findings and coverage/freshness metadata.

### Momentum chart
`GET /api/v1/emerging-skills/momentum?periodStart=...&periodEnd=...&geographyId=...&sectorId=...&category=...`

Returns plotted points. `xMetric` and `yMetric` definitions must state measure/unit and aggregation/window. Bubble `sizeValue` and `sizeMetric` must be documented; categories and style keys are returned, not inferred in the browser.

### Skill profile
`GET /api/v1/emerging-skills/skills/{skillId}`

Returns canonical skill, aliases, classification result and rule version, selected metrics, evidence/coverage status and related entity IDs.

### Relationships graph
`GET /api/v1/emerging-skills/skills/{skillId}/relationships?geographyId=...&periodStart=...&periodEnd=...&sectorId=...`

Returns typed nodes and edges. An edge must include `relationType`, `relationBasis` (`DIRECT_OBSERVATION`, `APPROVED_MAPPING`, `DERIVED_ASSOCIATION`), evidence count/references where permitted, time window, coverage, and mapping confidence when relevant. Direct observations and inferred associations must be visibly distinguished.

### Regional signals
`GET /api/v1/emerging-skills/regional-signals?skillId=...&metric=...&periodStart=...&periodEnd=...`

Returns canonical geography codes, metric values, unit, ranking where supported, comparison window, data coverage and provenance. Map geometry itself is a verified static GeoJSON asset, not part of a value image.

### Evidence
`GET /api/v1/emerging-skills/skills/{skillId}/evidence`

Returns source/dataset references, observation periods, record/evidence counts, retrieval/as-of metadata, permitted source links, transformation and mapping versions, limitations and rule evaluation inputs.

### Compare skills
`POST /api/v1/emerging-skills/compare`

Body: `{ "skillIds": ["..."], "filters": { ... } }` (2–4 unique canonical IDs). Response includes comparable metrics plus per-metric comparability status and reasons for unavailable comparisons.

### Current user's watchlist
`GET /api/v1/me/emerging-skills/watchlist`  
`POST /api/v1/me/emerging-skills/watchlist`  
`DELETE /api/v1/me/emerging-skills/watchlist/{skillId}`

POST body can include `{ "skillId": "...", "note": "..." }`. Requires authenticated user identity; server enforces ownership.

### Current user's skill alert rules and recent alerts
`GET /api/v1/me/emerging-skills/alert-rules`  
`POST /api/v1/me/emerging-skills/alert-rules`  
`PATCH /api/v1/me/emerging-skills/alert-rules/{ruleId}`  
`DELETE /api/v1/me/emerging-skills/alert-rules/{ruleId}`  
`GET /api/v1/me/emerging-skills/alerts`

Only expose valid metric/condition combinations supported by the analytics service. Delivery channels/cadence require explicit backend capabilities.

## 4. Common response metadata

```json
{
  "meta": {
    "provenanceState": "DERIVED",
    "qualityStatus": "CAUTION",
    "sourceAsOf": "2025-12-31",
    "updatedAt": "2026-10-14T00:00:00Z",
    "observationWindow": { "start": "2023-01-01", "end": "2025-12-31" },
    "coverage": { "status": "PARTIAL", "description": "Illustrative schema only" },
    "methodVersion": "method-v1",
    "classificationRuleVersion": "skills-rule-v1"
  },
  "data": {}
}
```

This is a schema example only—not a real API response. Backend should define enum values jointly with the existing service.

## 5. Suggested domain shapes

### Skill signal

```ts
export type ProvenanceState =
  | 'SOURCE_BACKED' | 'DERIVED' | 'MIXED' | 'SYNTHETIC_DEMO';

export type SkillCategory =
  | 'EMERGING' | 'ACCELERATING' | 'ESTABLISHED' | 'DECLINING' | 'UNCLASSIFIED';

export interface SkillSignal {
  skillId: string;
  canonicalName: string;
  category: SkillCategory;
  categoryRuleVersion?: string;
  demandMetric: { code: string; label: string; value: number | null; unit: string };
  growthMetric: { code: string; label: string; value: number | null; unit: string; windowStart: string; windowEnd: string };
  sourceCoverage: { status: 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT' | 'UNKNOWN'; description?: string };
  meta: { provenanceState: ProvenanceState; qualityStatus: string; sourceAsOf?: string; updatedAt?: string };
}
```

### Graph edge

```ts
export interface SkillGraphNode {
  id: string;
  type: 'SKILL' | 'OCCUPATION' | 'SECTOR';
  label: string;
  code?: string;
  codeSystem?: string;
  codeSystemVersion?: string;
  metrics?: Record<string, number | string | null>;
}

export interface SkillGraphEdge {
  id: string;
  source: string;
  target: string;
  relationType: string;
  relationBasis: 'DIRECT_OBSERVATION' | 'APPROVED_MAPPING' | 'DERIVED_ASSOCIATION';
  relationStrength?: number | null;
  strengthMetric?: string;
  evidenceCount?: number | null;
  mappingMethod?: string;
  mappingConfidence?: number | null;
  evidenceRefs?: string[];
  observationWindow?: { start?: string; end?: string };
  provenanceState: ProvenanceState;
}
```

### Relationship response

```json
{
  "data": {
    "nodes": [],
    "edges": [],
    "selectedSkillId": "skill-example",
    "meta": { "provenanceState": "SYNTHETIC_DEMO", "qualityStatus": "CAUTION" }
  }
}
```

Empty arrays are preferable to fabricated graph connections. Do not embed private raw posting text or sensitive employer/user information in graph evidence.

## 6. Error model

Use HTTP status codes and a consistent safe shape, e.g. `{ "error": { "code": "INSUFFICIENT_COVERAGE", "message": "...", "retryable": false, "requestId": "..." } }`. Distinguish no results, insufficient evidence, unsupported geography, permission denied and service failure. Do not turn an error into zero values.
