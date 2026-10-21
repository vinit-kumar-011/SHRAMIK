# Forecasts & Early Warnings — Proposed API Contract

**Status:** Proposed frontend contract for backend alignment, not a claim that these routes already exist. Match the repository's existing API conventions before implementation.

Base prefix in examples: `/api/v1/forecasts`.

## 1. Common request filters

```ts
export interface ForecastFilters {
  horizonYears: 1 | 3 | 5;
  geographyCode?: string;   // e.g. IN or an app-defined geographic code
  stateCode?: string;       // canonical code, not display name
  sectorCode?: string;
  occupationCode?: string;  // NCO code where available
  skillCode?: string;
  period?: string;          // documented observation/as-of period
}
```

Use query parameters consistently. Never join records by display label when a canonical code exists.

## 2. Common metadata and provenance

```ts
export type Provenance = 'source-backed' | 'derived' | 'forecast' | 'mock' | 'mixed';
export interface DataMeta {
  provenance: Provenance;
  sourceLabels: string[];
  asOf?: string;
  updatedAt?: string;
  units?: string;
  geographyCode?: string;
  period?: string;
  forecastHorizon?: { startYear: number; endYear: number };
  coverage?: { usablePeriods?: number; expectedPeriods?: number; percent?: number; notes?: string[] };
  notes?: string[];
}
```

Each response carries `meta` and the data needed to interpret its values. A mixed response must explain which fields/records have different provenance.

## 3. Suggested endpoints

| Method | Proposed route | Purpose |
|---|---|---|
| GET | `/api/v1/forecasts/filter-options` | Allowed horizons, geography, sector, occupation, skill options |
| GET | `/api/v1/forecasts/overview` | Projected demand/supply/gap and high-risk count for filters |
| GET | `/api/v1/forecasts/series` | Historical and projected time-series, interval metadata |
| GET | `/api/v1/forecasts/warnings` | Prioritised warning feed and counts |
| GET | `/api/v1/forecasts/risk-matrix` | State/region × occupation/sector/skill risk cells |
| GET | `/api/v1/forecasts/state-risk-map` | State-code keyed risk values and legends for verified geometry |
| GET | `/api/v1/forecasts/risk-details` | Demand/supply/gap and evidence for a selected cell/entity |
| GET | `/api/v1/forecasts/scenario-options` | Supported scenarios and editable assumptions |
| POST | `/api/v1/forecasts/scenario-comparisons` | Calculate/return conditional scenario comparison |
| GET | `/api/v1/forecasts/model-performance` | Backtesting, metrics, history coverage and methodology metadata |
| GET | `/api/v1/forecasts/alerts` | Alert management table with filters/pagination/counts |
| GET | `/api/v1/forecasts/alerts/{alertId}` | Single alert, rationale, evidence, assumptions and timeline |
| POST | `/api/v1/forecasts/alerts/{alertId}/acknowledge` | Acknowledge a warning (permission checked) |
| PATCH | `/api/v1/forecasts/alerts/{alertId}` | Assign owner or change allowed workflow status |
| POST | `/api/v1/forecasts/alerts/{alertId}/notes` | Add a note to the audit timeline |

These are proposed endpoint shapes; the frontend developer and backend owner should reconcile them with the existing API before writing fetch logic.

## 4. TypeScript response shapes

```ts
export interface MetricValue {
  key: string;
  label: string;
  value: number | null;
  formattedValue?: string;
  unit: string;
  period?: string;
  delta?: { value: number; unit: 'percent' | 'absolute'; direction?: 'up' | 'down' | 'flat'; comparisonLabel: string };
  meta: DataMeta;
}

export interface ForecastPoint {
  period: string;          // ISO period or documented year format
  year: number;
  actualDemand?: number | null;
  actualSupply?: number | null;
  forecastDemand?: number | null;
  forecastSupply?: number | null;
  demandInterval?: { lower: number; upper: number; level?: number };
  supplyInterval?: { lower: number; upper: number; level?: number };
}

export interface ForecastSeriesResponse {
  points: ForecastPoint[];
  unit: string;
  historicalThrough?: number;
  horizon: { startYear: number; endYear: number };
  intervalLevel?: number;
  viewBy: 'total' | 'sector' | 'occupation' | 'region';
  meta: DataMeta;
}

export type RiskClass = 'high-shortage' | 'moderate-shortage' | 'balanced' | 'moderate-surplus' | 'high-surplus' | 'no-data';
export interface RiskCell {
  regionCode: string;
  entityCode: string;
  entityType: 'occupation' | 'sector' | 'skill';
  riskClass: RiskClass;
  demand: number | null;
  supply: number | null;
  gap: number | null;
  unit: string;
  forecastYear: number;
  ruleId?: string;
  provenance: Provenance;
  sourceLabels: string[];
  notes?: string[];
}

export interface EarlyWarning {
  id: string;
  title: string;
  entityCode: string;
  entityLabel: string;
  entityType: 'occupation' | 'sector' | 'skill' | 'region';
  regionCode?: string;
  regionLabel?: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'information';
  category: 'shortage' | 'high-growth' | 'regional-risk' | 'emerging-skill';
  expectedHorizon: { startYear: number; endYear: number };
  status: 'new' | 'under-review' | 'acknowledged' | 'resolved';
  rule: { id: string; label: string; thresholdDescription: string };
  summary: string;
  provenance: Provenance;
  sourceLabels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ModelPerformanceResponse {
  series: Array<{ period: string; actual: number; predicted: number; lower?: number; upper?: number }>;
  metrics: Array<{ key: string; label: string; value: number | null; unit: string; definition: string; suitabilityNote?: string }>;
  evaluation: { startPeriod: string; endPeriod: string; horizon: number; modelVersion?: string; baseline?: string };
  coverage: { usablePeriods: number; expectedPeriods?: number; percent?: number; gaps: string[] };
  limitations: string[];
  meta: DataMeta;
}
```

Scenario and alert details should use equivalent strongly typed structures in the app's contracts rather than untyped `any` payloads.

## 5. Adapter interface

```ts
export interface ForecastsDataAdapter {
  getFilterOptions(): Promise<unknown>;
  getOverview(filters: ForecastFilters): Promise<{ kpis: MetricValue[]; meta: DataMeta }>;
  getSeries(filters: ForecastFilters, viewBy: ForecastSeriesResponse['viewBy']): Promise<ForecastSeriesResponse>;
  getWarnings(filters: ForecastFilters, params?: { limit?: number; category?: string }): Promise<{ items: EarlyWarning[]; counts: Record<string, number>; meta: DataMeta }>;
  getRiskMatrix(filters: ForecastFilters, entityType: RiskCell['entityType']): Promise<{ regions: Array<{ code: string; label: string }>; entities: Array<{ code: string; label: string }>; cells: RiskCell[]; legend: Array<{ riskClass: RiskClass; label: string; min?: number; max?: number }>; meta: DataMeta }>;
  getStateRiskMap(filters: ForecastFilters, entityType: RiskCell['entityType']): Promise<{ valuesByStateCode: Record<string, { value: number | null; riskClass: RiskClass }>; unit: string; legend: Array<{ riskClass: RiskClass; label: string; min?: number; max?: number }>; meta: DataMeta }>;
  getRiskDetails(filters: ForecastFilters, regionCode: string, entityCode: string): Promise<{ cell: RiskCell; evidence: string[]; assumptions: string[]; drivers: Array<{ label: string; contribution?: number | null; unit?: string }>; meta: DataMeta }>;
  getScenarioOptions(filters: ForecastFilters): Promise<unknown>;
  compareScenarios(filters: ForecastFilters, scenarioIds: string[]): Promise<{ scenarios: Array<{ id: string; label: string; points: ForecastPoint[] }>; assumptions: Array<{ key: string; label: string; value: number | string; unit: string }>; meta: DataMeta }>;
  getModelPerformance(filters: ForecastFilters): Promise<ModelPerformanceResponse>;
  getAlerts(filters: ForecastFilters, params?: { status?: string; severity?: string; query?: string; page?: number; pageSize?: number }): Promise<{ items: EarlyWarning[]; total: number; counts: Record<string, number>; meta: DataMeta }>;
  getAlertDetail(id: string): Promise<{ alert: EarlyWarning; factors: Array<{ label: string; explanation: string; value?: number | null; unit?: string }>; evidence: string[]; assumptions: string[]; timeline: Array<{ at: string; event: string; actor?: string }>; recommendations?: string[]; meta: DataMeta }>;
  acknowledgeAlert(id: string): Promise<EarlyWarning>;
  updateAlert(id: string, patch: { status?: EarlyWarning['status']; assigneeId?: string | null }): Promise<EarlyWarning>;
  addAlertNote(id: string, note: string): Promise<{ id: string; createdAt: string }>;
}
```

Replace `unknown` option responses with concrete interfaces during implementation. Prefer existing shared API contracts if available.

## 6. Request and error requirements

- Encode filters using `URLSearchParams`; never concatenate unsafe query strings.
- Handle 401/403/404/422/429/5xx responses according to existing app conventions.
- Support abort signals or request IDs to stop stale filter responses from overwriting current state.
- A mutation is successful only after the server confirms it. Keep pending/error states visible.
- Do not silently fall back to a mock adapter when a configured REST request fails.
- Mock adapter must return deterministic fixtures with `provenance: 'mock'` and an explicit mock-mode banner.
