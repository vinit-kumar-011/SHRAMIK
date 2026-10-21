# SHRAMIK Skill Gap Analysis — API Contract

**Purpose:** Contract proposal for the Skill Gap Analysis page. Align names/prefixes to the existing backend; do not duplicate an equivalent endpoint if it already exists. All values in the sample snippets are schema examples only, not actual SHRAMIK data.

## 1. Global requirements

- Base path proposal: `/api/v1/skill-gaps`.
- API accepts one normalized applied-filter snapshot: `period`, `geographyLevel`, `regionCode`, `stateCode`, `sectorCode`, `ncoCode`, `skillCode`, and optional forecast horizon where applicable.
- Responses must include `period`, `unit`, `provenance` (`source_backed | derived | mixed | mock`), `sourceLabel`, `sourceIds`, `updatedAt`, `coverage`, and `notes` as appropriate.
- Use stable canonical codes for state/UT, sector, NCO occupation, and skill taxonomy. Include classification versions.
- Do not assume response figures are complete national totals unless coverage says so.
- All endpoints should return machine-readable errors with a stable `code`, safe `message`, optional `details`, and `requestId`.

## 2. Endpoints

| Method | Endpoint | Used by |
|---|---|---|
| GET | `/filters` | Filter options/defaults and allowed period/region/sector/occupation/skill options |
| GET | `/overview` | Four KPI cards, current definitions and data status |
| GET | `/landscape` | Scatter plot skill/occupation points, gap categories and reference-line eligibility |
| GET | `/regions` | State/UT values for map and regional ranking; supports metric selector |
| GET | `/skills` | Top Skills by Gap table; supports sort/page/pageSize |
| GET | `/insights` | Evidence-backed insight cards for the current applied filters |
| GET | `/sector-flow` | Optional Sankey/flow nodes and links, only when measured flow data is available |
| GET | `/details/{entityType}/{entityId}` | KPI, skill, occupation, state, or insight detail drawer |

Pass filters as query parameters or the backend's established filter object. Share the same normalised applied filters with every request. If the application already exposes one aggregated analytics endpoint, it may return these resources together instead.

## 3. Common data metadata

```ts
export type Provenance = 'source_backed' | 'derived' | 'mixed' | 'mock';

export interface DataMeta {
  period: string;
  unit: string;
  provenance: Provenance;
  sourceLabel?: string;
  sourceIds: string[];
  updatedAt?: string;
  coverage?: {
    observedCount?: number;
    expectedCount?: number;
    geographyCovered?: number;
    geographyExpected?: number;
    missingCodes?: string[];
    suppressedCodes?: string[];
  };
  notes?: string[];
}
```

## 4. Overview response

```ts
interface GapMetric {
  value: number | null;
  formattedValue?: string;
  unit: string;
  label: string;
  comparison?: { value: number; period: string; delta?: number; deltaPercent?: number };
  definition: string;
  meta: DataMeta;
}

interface SkillGapOverview {
  demand: GapMetric;
  supply: GapMetric;
  gap: GapMetric & { kind: 'observed_estimate' | 'forecast'; formulaId: string };
  significantGaps: GapMetric;
  balancedTolerance?: { value: number; unit: string; configId: string };
  dataStatus: 'complete' | 'partial' | 'stale' | 'unavailable';
}
```

`gap` must not be returned as valid if demand and supply are incomparable. Prefer `value: null` and a note explaining why. The UI must distinguish estimates from forecasts.

## 5. Scatter/landscape response

```ts
type GapClass = 'high_shortage' | 'moderate_shortage' | 'balanced' | 'moderate_surplus' | 'high_surplus' | 'not_comparable';

interface GapLandscapePoint {
  id: string;
  entityType: 'skill' | 'occupation';
  code: string;
  label: string;
  demand: number | null;
  supply: number | null;
  gap: number | null; // demand - supply only for comparable measures
  gapPercent?: number | null;
  unit: string;
  classification: GapClass;
  sizeValue?: number | null; // only if labelled (e.g. observations/weighted count)
  detailAvailable: boolean;
  meta: DataMeta;
}

interface GapLandscapeResponse {
  points: GapLandscapePoint[];
  xAxis: { key: 'supply'; label: string; unit: string; scale: 'linear' | 'log' };
  yAxis: { key: 'demand'; label: string; unit: string; scale: 'linear' | 'log' };
  parityLineEligible: boolean;
  classifications: Array<{ key: GapClass; label: string; colorToken: string; thresholdDescription: string }>;
  meta: DataMeta;
}
```

If x/y units or entity definitions are incompatible, `parityLineEligible` must be false and the UI must explain that limitation. If logarithmic axes are used, the data must satisfy positive-domain requirements; otherwise choose a supported linear/other scale.

## 6. Regional response

```ts
interface RegionalGapValue {
  regionCode: string; // canonical ISO/state/UT mapping code per approved crosswalk
  regionName: string;
  demand: number | null;
  supply: number | null;
  gap: number | null;
  unit: string;
  classification: GapClass | 'no_data' | 'suppressed';
  rank?: number | null;
  sharePercent?: number | null;
  missingReason?: string;
  meta: DataMeta;
}

interface RegionalGapResponse {
  metric: 'gap_absolute' | 'gap_percent' | 'demand' | 'supply';
  regions: RegionalGapValue[];
  geometry: { assetId: string; version: string; source: string; licence: string; codeProperty: string; codeCrosswalkVersion: string };
  scale: Array<{ classification: string; label: string; min?: number; max?: number; colorToken: string }>;
  meta: DataMeta;
}
```

Geometry may be delivered as a versioned static asset separate from values. The `regionCode` must join to GeoJSON features via `geometry.codeProperty`; never join by fuzzy display-name matching. Missing/suppressed values are neutral. Do not claim share if its denominator is undefined.

## 7. Ranked skills response

```ts
interface RankedSkillGap {
  rank: number;
  skillId: string;
  skillCode: string;
  skillLabel: string;
  demand: number | null;
  supply: number | null;
  gap: number | null;
  gapPercent?: number | null;
  gapClass: GapClass;
  trend?: Array<{ period: string; gap: number | null }>;
  unit: string;
  detailAvailable: boolean;
  meta: DataMeta;
}

interface RankedSkillsResponse {
  items: RankedSkillGap[];
  page: number;
  pageSize: number;
  total: number;
  sort: string;
  skillTaxonomyVersion: string;
  meta: DataMeta;
}
```

## 8. Insights response

```ts
interface GapInsight {
  id: string;
  title: string;
  summary: string;
  importance?: 'info' | 'watch' | 'priority';
  claims: Array<{
    text: string;
    metricId: string;
    value?: number | null;
    unit?: string;
    sourceIds: string[];
  }>;
  evidenceEntity?: { type: 'skill' | 'occupation' | 'region' | 'sector'; id: string };
  generatedBy: 'rule_engine' | 'ai_grounded' | 'mock';
  meta: DataMeta;
}
```

Every quantitative claim must be reconcilable to the returned data. If AI grounding is not configured, do not use `ai_grounded`.

## 9. Optional flow response

```ts
interface SectorFlowResponse {
  sectorCode: string;
  nodes: Array<{ id: string; label: string; group: string; total: number; unit: string }>;
  links: Array<{ source: string; target: string; value: number; unit: string; sourceIds: string[] }>;
  flowDefinition: string;
  conservationRule?: string;
  meta: DataMeta;
}
```

Only serve this endpoint where the underlying flows are measured/defined and links have compatible units. Do not infer conversions from annual completions to available workforce or sectoral demand without a documented method.

## 10. Errors and loading semantics

- `400 FILTER_NOT_SUPPORTED`: selected filter is invalid/not supported.
- `401/403`: auth/permission response handled by host app.
- `404 DETAIL_NOT_FOUND`: detail entity is unavailable.
- `409 DATA_NOT_COMPARABLE`: demand/supply definitions or units cannot be compared.
- `422 INSUFFICIENT_COVERAGE`: data exists but is insufficient for the requested metric/horizon.
- `429`: rate limit.
- `5xx`/network error: show error and retry, preserve previous successful response as stale where applicable.

No silent mock fallback after a REST error.
