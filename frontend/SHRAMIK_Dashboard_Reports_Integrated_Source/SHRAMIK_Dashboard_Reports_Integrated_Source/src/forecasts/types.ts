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
export interface OptionItem { code: string; label: string }
export interface ForecastFilters {
  horizonYears: 1 | 3 | 5;
  geographyCode?: string;
  stateCode?: string;
  sectorCode?: string;
  occupationCode?: string;
  skillCode?: string;
  period?: string;
}
export interface ForecastFilterOptions {
  horizons: Array<1 | 3 | 5>;
  geographies: OptionItem[];
  states: OptionItem[];
  sectors: OptionItem[];
  occupations: OptionItem[];
  skills: OptionItem[];
  defaults: ForecastFilters;
  meta: DataMeta;
}
export interface MetricValue {
  key: string;
  label: string;
  value: number | null;
  formattedValue?: string;
  unit: string;
  period?: string;
  delta?: { value: number; unit: 'percent' | 'absolute'; direction?: 'up' | 'down' | 'flat'; comparisonLabel: string };
  note?: string;
  meta: DataMeta;
}
export interface ForecastPoint {
  period: string;
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
  ruleLabel?: string;
  provenance: Provenance;
  sourceLabels: string[];
  notes?: string[];
}
export interface RiskLegendItem { riskClass: RiskClass; label: string; min?: number; max?: number }
export interface RiskMatrixResponse {
  regions: OptionItem[];
  entities: OptionItem[];
  cells: RiskCell[];
  legend: RiskLegendItem[];
  meta: DataMeta;
}
export interface StateRiskMapResponse {
  valuesByStateCode: Record<string, { value: number | null; riskClass: RiskClass }>;
  unit: string;
  legend: RiskLegendItem[];
  geometryAvailable: boolean;
  geometryUnavailableReason?: string;
  geometryVersion?: string;
  sourceLicense?: string;
  canonicalCodeProperty?: string;
  geometry?: { type: 'FeatureCollection'; features: Array<{ id?: string | number; properties?: Record<string, unknown>; geometry?: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] } | null }> };
  meta: DataMeta;
}
export interface RiskDetailResponse {
  cell: RiskCell;
  evidence: string[];
  assumptions: string[];
  drivers: Array<{ label: string; contribution?: number | null; unit?: string }>;
  meta: DataMeta;
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
  assigneeId?: string | null;
  assigneeLabel?: string | null;
}
export interface AlertDetailResponse {
  alert: EarlyWarning;
  factors: Array<{ label: string; explanation: string; value?: number | null; unit?: string }>;
  evidence: string[];
  assumptions: string[];
  timeline: Array<{ at: string; event: string; actor?: string; kind?: 'workflow' | 'forecast' | 'review' }>;
  recommendations?: string[];
  meta: DataMeta;
}
export interface ModelPerformanceResponse {
  series: Array<{ period: string; actual: number; predicted: number; lower?: number; upper?: number }>;
  metrics: Array<{ key: string; label: string; value: number | null; unit: string; definition: string; suitabilityNote?: string }>;
  evaluation: { startPeriod: string; endPeriod: string; horizon: number; modelVersion?: string; baseline?: string; scope?: string; evaluatedThrough?: string };
  forecastUnavailableReason?: string;
  coverage: { usablePeriods: number; expectedPeriods?: number; percent?: number; gaps: string[] };
  limitations: string[];
  meta: DataMeta;
}
export interface ScenarioOption { id: string; label: string; description?: string; isDefault?: boolean }
export interface ScenarioAssumptionOption {
  key: string; label: string; value: number | string; unit: string;
  min?: number; max?: number; step?: number; editable?: boolean; source?: string; owner?: string;
}
export interface ScenarioOptionsResponse { scenarios: ScenarioOption[]; assumptions: ScenarioAssumptionOption[]; meta: DataMeta }
export interface ScenarioComparisonResponse {
  scenarios: Array<{ id: string; label: string; points: ForecastPoint[] }>;
  assumptions: ScenarioAssumptionOption[];
  meta: DataMeta;
}
export interface ForecastRequestOptions { signal?: AbortSignal; entityType?: RiskCell['entityType'] }
export interface ForecastsDataAdapter {
  readonly mode: 'mock' | 'rest';
  getFilterOptions(options?: ForecastRequestOptions): Promise<ForecastFilterOptions>;
  getOverview(filters: ForecastFilters, options?: ForecastRequestOptions): Promise<{ kpis: MetricValue[]; meta: DataMeta }>;
  getSeries(filters: ForecastFilters, viewBy: ForecastSeriesResponse['viewBy'], options?: ForecastRequestOptions): Promise<ForecastSeriesResponse>;
  getWarnings(filters: ForecastFilters, params?: { limit?: number; category?: string }, options?: ForecastRequestOptions): Promise<{ items: EarlyWarning[]; counts: Record<string, number>; meta: DataMeta }>;
  getRiskMatrix(filters: ForecastFilters, entityType: RiskCell['entityType'], options?: ForecastRequestOptions): Promise<RiskMatrixResponse>;
  getStateRiskMap(filters: ForecastFilters, entityType: RiskCell['entityType'], options?: ForecastRequestOptions): Promise<StateRiskMapResponse>;
  getRiskDetails(filters: ForecastFilters, regionCode: string, entityCode: string, options?: ForecastRequestOptions): Promise<RiskDetailResponse>;
  getScenarioOptions(filters: ForecastFilters, options?: ForecastRequestOptions): Promise<ScenarioOptionsResponse>;
  compareScenarios(filters: ForecastFilters, scenarioIds: string[], assumptionValues?: Record<string, number>, options?: ForecastRequestOptions): Promise<ScenarioComparisonResponse>;
  getModelPerformance(filters: ForecastFilters, options?: ForecastRequestOptions): Promise<ModelPerformanceResponse>;
  getAlerts(filters: ForecastFilters, params?: { status?: string; severity?: string; query?: string; page?: number; pageSize?: number }, options?: ForecastRequestOptions): Promise<{ items: EarlyWarning[]; total: number; counts: Record<string, number>; meta: DataMeta }>;
  getAlertDetail(id: string, options?: ForecastRequestOptions): Promise<AlertDetailResponse>;
  acknowledgeAlert(id: string, options?: ForecastRequestOptions): Promise<EarlyWarning>;
  updateAlert(id: string, patch: { status?: EarlyWarning['status']; assigneeId?: string | null; assigneeLabel?: string | null }, options?: ForecastRequestOptions): Promise<EarlyWarning>;
  addAlertNote(id: string, note: string, options?: ForecastRequestOptions): Promise<{ id: string; createdAt: string }>;
}


/** Compatibility aliases used by the original Forecasts & Early Warnings page module. */
export type AlertStatus = EarlyWarning['status'];
export type EntityType = RiskCell['entityType'];
export type RiskDetailsResponse = RiskDetailResponse;
export interface AlertListResponse { items: EarlyWarning[]; total: number; counts: Record<string, number>; meta: DataMeta }
