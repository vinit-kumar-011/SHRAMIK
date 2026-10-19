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

export interface ForecastFilters {
  horizonYears: 1 | 3 | 5;
  geographyCode?: string;
  stateCode?: string;
  sectorCode?: string;
  occupationCode?: string;
  skillCode?: string;
  period?: string;
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

export interface ForecastsDataAdapter {
  getFilterOptions(): Promise<any>;
  getOverview(filters: ForecastFilters): Promise<{ kpis: MetricValue[]; meta: DataMeta }>;
  getSeries(filters: ForecastFilters, viewBy: ForecastSeriesResponse['viewBy']): Promise<ForecastSeriesResponse>;
  getWarnings(filters: ForecastFilters, params?: { limit?: number; category?: string }): Promise<{ items: EarlyWarning[]; counts: Record<string, number>; meta: DataMeta }>;
  getRiskMatrix(filters: ForecastFilters, entityType: RiskCell['entityType']): Promise<{ regions: Array<{ code: string; label: string }>; entities: Array<{ code: string; label: string }>; cells: RiskCell[]; legend: Array<{ riskClass: RiskClass; label: string; min?: number; max?: number }>; meta: DataMeta }>;
  getStateRiskMap(filters: ForecastFilters, entityType: RiskCell['entityType']): Promise<{ valuesByStateCode: Record<string, { value: number | null; riskClass: RiskClass }>; unit: string; legend: Array<{ riskClass: RiskClass; label: string; min?: number; max?: number }>; meta: DataMeta }>;
  getRiskDetails(filters: ForecastFilters, regionCode: string, entityCode: string): Promise<{ cell: RiskCell; evidence: string[]; assumptions: string[]; drivers: Array<{ label: string; contribution?: number | null; unit?: string }>; meta: DataMeta }>;
  getScenarioOptions(filters: ForecastFilters): Promise<any>;
  compareScenarios(filters: ForecastFilters, scenarioIds: string[]): Promise<{ scenarios: Array<{ id: string; label: string; points: ForecastPoint[] }>; assumptions: Array<{ key: string; label: string; value: number | string; unit: string }>; meta: DataMeta }>;
  getModelPerformance(filters: ForecastFilters): Promise<ModelPerformanceResponse>;
  getAlerts(filters: ForecastFilters, params?: { status?: string; severity?: string; query?: string; page?: number; pageSize?: number }): Promise<{ items: EarlyWarning[]; total: number; counts: Record<string, number>; meta: DataMeta }>;
  getAlertDetail(id: string): Promise<{ alert: EarlyWarning; factors: Array<{ label: string; explanation: string; value?: number | null; unit?: string }>; evidence: string[]; assumptions: string[]; timeline: Array<{ at: string; event: string; actor?: string }>; recommendations?: string[]; meta: DataMeta }>;
  acknowledgeAlert(id: string): Promise<EarlyWarning>;
  updateAlert(id: string, patch: { status?: EarlyWarning['status']; assigneeId?: string | null }): Promise<EarlyWarning>;
  addAlertNote(id: string, note: string): Promise<{ id: string; createdAt: string }>;
}
