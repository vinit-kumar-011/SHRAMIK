import type {
  AlertDetailResponse, DataMeta, EarlyWarning, ForecastFilterOptions, ForecastFilters, ForecastRequestOptions,
  ForecastPoint, ForecastsDataAdapter, ForecastSeriesResponse, MetricValue, ModelPerformanceResponse,
  OptionItem, RiskCell, RiskClass, RiskDetailResponse, RiskLegendItem, RiskMatrixResponse,
  ScenarioComparisonResponse, ScenarioOptionsResponse, StateRiskMapResponse,
} from './types';

const DEMO_DATE = '2026-10-18';
const mockMeta: DataMeta = {
  provenance: 'mock', sourceLabels: ['Illustrative deterministic fixture'], asOf: DEMO_DATE,
  units: 'persons', geographyCode: 'IN',
  notes: ['Demo values only. Not verified SHRAMIK labour-market findings.', 'No live model or source refresh is implied.'],
  coverage: { usablePeriods: 7, expectedPeriods: 9, percent: 77.8, notes: ['Illustrative training fixture; coverage is not a source-backed statistic.'] },
};
const states: OptionItem[] = [
  { code: 'IN-MH', label: 'Maharashtra' }, { code: 'IN-UP', label: 'Uttar Pradesh' },
  { code: 'IN-TN', label: 'Tamil Nadu' }, { code: 'IN-KA', label: 'Karnataka' },
  { code: 'IN-GJ', label: 'Gujarat' }, { code: 'IN-OD', label: 'Odisha' },
  { code: 'IN-WB', label: 'West Bengal' }, { code: 'IN-BR', label: 'Bihar' },
];
const sectors: OptionItem[] = [
  { code: 'MFG', label: 'Manufacturing' }, { code: 'CON', label: 'Construction' },
  { code: 'ENG', label: 'Energy' }, { code: 'HLT', label: 'Healthcare' },
  { code: 'LOG', label: 'Logistics' }, { code: 'IT', label: 'Information technology' },
];
const occupations: OptionItem[] = [
  { code: '7212', label: 'Welders and flame cutters' }, { code: '7411', label: 'Electrical installation workers' },
  { code: '3115', label: 'Mechanical engineering technicians' }, { code: '2512', label: 'Software developers' },
  { code: '8332', label: 'Heavy truck and lorry drivers' }, { code: '5321', label: 'Health care assistants' },
];
const skills: OptionItem[] = [
  { code: 'SK-WELD', label: 'Industrial welding' }, { code: 'SK-SOLAR', label: 'Solar PV installation' },
  { code: 'SK-ELEC', label: 'Electrical maintenance' }, { code: 'SK-DIGI', label: 'Applied digital skills' },
  { code: 'SK-CNC', label: 'CNC machine operation' }, { code: 'SK-CARE', label: 'Patient care assistance' },
];
const horizons = [1, 3, 5] as const;
const legend: RiskLegendItem[] = [
  { riskClass: 'high-shortage', label: 'High shortage', min: 0.2 },
  { riskClass: 'moderate-shortage', label: 'Moderate shortage', min: 0.08, max: 0.2 },
  { riskClass: 'balanced', label: 'Approximately balanced', min: -0.08, max: 0.08 },
  { riskClass: 'moderate-surplus', label: 'Moderate surplus', min: -0.2, max: -0.08 },
  { riskClass: 'high-surplus', label: 'High surplus', max: -0.2 },
  { riskClass: 'no-data', label: 'No data' },
];

function checkSignal(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('The request was cancelled.', 'AbortError');
}
function metaFor(filters: ForecastFilters, provenance: DataMeta['provenance'] = 'mock'): DataMeta {
  return { ...mockMeta, provenance, geographyCode: filters.stateCode || filters.geographyCode || 'IN', period: filters.period ?? 'Demo baseline', forecastHorizon: { startYear: 2025, endYear: 2024 + filters.horizonYears } };
}
function scaleFor(filters: ForecastFilters): number {
  let factor = 1;
  if (filters.stateCode) factor *= ({ 'IN-MH': 0.24, 'IN-UP': 0.31, 'IN-TN': 0.15, 'IN-KA': 0.14, 'IN-GJ': 0.12, 'IN-OD': 0.07, 'IN-WB': 0.13, 'IN-BR': 0.1 } as Record<string, number>)[filters.stateCode] ?? 0.1;
  if (filters.sectorCode) factor *= ({ MFG: 0.32, CON: 0.2, ENG: 0.1, HLT: 0.16, LOG: 0.12, IT: 0.1 } as Record<string, number>)[filters.sectorCode] ?? 0.15;
  if (filters.occupationCode) factor *= 0.17;
  if (filters.skillCode) factor *= 0.14;
  return factor;
}
function makeSeries(filters: ForecastFilters, viewBy: ForecastSeriesResponse['viewBy']): ForecastSeriesResponse {
  const factor = scaleFor(filters);
  const historicalThrough = 2024;
  const horizonEnd = 2024 + filters.horizonYears;
  const points: ForecastPoint[] = [];
  let lastDemand = 0;
  let lastSupply = 0;
  for (let year = 2018; year <= horizonEnd; year += 1) {
    if (year <= historicalThrough) {
      const demand = Math.round((79000 + (year - 2018) * 4750) * factor);
      const supply = Math.round((76500 + (year - 2018) * 4140) * factor);
      lastDemand = demand;
      lastSupply = supply;
      points.push({ period: String(year), year, actualDemand: demand, actualSupply: supply, forecastDemand: null, forecastSupply: null });
    } else {
      const n = year - historicalThrough;
      const demand = Math.round(lastDemand * Math.pow(1.041, n));
      const supply = Math.round(lastSupply * Math.pow(1.029, n));
      const demandSpread = demand * (0.025 + n * 0.009);
      const supplySpread = supply * (0.022 + n * 0.007);
      points.push({
        period: String(year), year, actualDemand: null, actualSupply: null, forecastDemand: demand, forecastSupply: supply,
        demandInterval: { lower: Math.max(0, Math.round(demand - demandSpread)), upper: Math.round(demand + demandSpread), level: 80 },
        supplyInterval: { lower: Math.max(0, Math.round(supply - supplySpread)), upper: Math.round(supply + supplySpread), level: 80 },
      });
    }
  }
  return { points, unit: 'persons', historicalThrough, horizon: { startYear: historicalThrough + 1, endYear: horizonEnd }, intervalLevel: 80, viewBy, meta: metaFor(filters, 'mock') };
}
function riskClassFor(gap: number, demand: number): RiskClass {
  if (demand <= 0) return 'no-data';
  const ratio = gap / demand;
  if (ratio >= 0.2) return 'high-shortage';
  if (ratio >= 0.08) return 'moderate-shortage';
  if (ratio > -0.08) return 'balanced';
  if (ratio > -0.2) return 'moderate-surplus';
  return 'high-surplus';
}
function fmt(value: number | null | undefined): string { return value == null ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value); }
function currentPoint(filters: ForecastFilters): ForecastPoint {
  const data = makeSeries(filters, 'total');
  return data.points.find((point) => point.year === data.horizon.endYear) ?? data.points[data.points.length - 1];
}
function makeWarning(id: string, title: string, entityCode: string, entityLabel: string, entityType: EarlyWarning['entityType'], regionCode: string, regionLabel: string, severity: EarlyWarning['severity'], category: EarlyWarning['category'], startYear: number, endYear: number, status: EarlyWarning['status'], ruleId: string, ruleLabel: string, thresholdDescription: string, summary: string, assigneeId: string | null = null, assigneeLabel: string | null = null): EarlyWarning {
  return { id, title, entityCode, entityLabel, entityType, regionCode, regionLabel, severity, category, expectedHorizon: { startYear, endYear }, status, rule: { id: ruleId, label: ruleLabel, thresholdDescription }, summary, provenance: 'mock', sourceLabels: ['Illustrative forecast fixture'], createdAt: '2026-10-15T08:00:00.000Z', updatedAt: '2026-10-17T09:30:00.000Z', assigneeId, assigneeLabel };
}
const warningFixtures: EarlyWarning[] = [
  makeWarning('FW-001', 'Welders — projected shortage risk', '7212', 'Welders and flame cutters', 'occupation', 'IN-MH', 'Maharashtra', 'critical', 'shortage', 2026, 2028, 'new', 'DEMO-GAP-20', 'Projected gap threshold', 'Illustrative rule: projected gap-to-demand ratio at or above the configured high-shortage band.', 'Mock forecast shows demand outpacing available supply over the selected horizon.'),
  makeWarning('FW-002', 'Solar installation — elevated growth signal', 'SK-SOLAR', 'Solar PV installation', 'skill', 'IN-GJ', 'Gujarat', 'high', 'emerging-skill', 2026, 2030, 'under-review', 'DEMO-GROWTH-15', 'Growth threshold', 'Illustrative rule: projected growth band crossed; actual production rule must come from analytics configuration.', 'The demo scenario carries a higher growth trajectory than the comparison period.', 'analyst-a', 'Workforce Analyst'),
  makeWarning('FW-003', 'Electrical installers — regional pressure', '7411', 'Electrical installation workers', 'occupation', 'IN-OD', 'Odisha', 'high', 'regional-risk', 2027, 2029, 'acknowledged', 'DEMO-REGION-01', 'Regional concentration', 'Illustrative rule: regional risk class returned as high shortage.', 'Regional matrix fixture indicates concentration under this demo filter.', 'planning-unit', 'State Planning Unit'),
  makeWarning('FW-004', 'Health care assistants — demand increase', '5321', 'Health care assistants', 'occupation', 'IN-TN', 'Tamil Nadu', 'moderate', 'high-growth', 2026, 2028, 'new', 'DEMO-TREND-02', 'Demand trend rule', 'Illustrative rule: demand growth crosses a demo trend threshold.', 'The fixture trend grows more quickly than its preceding period.', null, null),
  makeWarning('FW-005', 'Manufacturing maintenance — potential shortage', '3115', 'Mechanical engineering technicians', 'occupation', 'IN-KA', 'Karnataka', 'moderate', 'shortage', 2028, 2030, 'under-review', 'DEMO-GAP-08', 'Gap threshold', 'Illustrative rule: projected gap-to-demand ratio crosses the demo moderate-shortage band.', 'A conditional forecast indicates a possible gap; the values are not verified observations.', 'analyst-a', 'Workforce Analyst'),
  makeWarning('FW-006', 'Applied digital skills — coverage watch', 'SK-DIGI', 'Applied digital skills', 'skill', 'IN-WB', 'West Bengal', 'low', 'emerging-skill', 2027, 2030, 'resolved', 'DEMO-COVERAGE-01', 'Coverage review', 'Illustrative workflow record, not a live production alert.', 'This fixture exists to exercise resolved-state and timeline handling.', 'planning-unit', 'State Planning Unit'),
  makeWarning('FW-007', 'Heavy vehicle operators — horizon watch', '8332', 'Heavy truck and lorry drivers', 'occupation', 'IN-UP', 'Uttar Pradesh', 'high', 'shortage', 2027, 2029, 'new', 'DEMO-GAP-20-B', 'Projected gap threshold', 'Illustrative threshold metadata returned by demo fixture.', 'Demo alert record for search, status, pagination and details testing.'),
];

export class MockForecastsAdapter implements ForecastsDataAdapter {
  readonly mode = 'mock' as const;
  private alerts: EarlyWarning[] = warningFixtures.map((item) => ({ ...item, expectedHorizon: { ...item.expectedHorizon }, rule: { ...item.rule } }));
  private timeline = new Map<string, Array<{ at: string; event: string; actor?: string }>>();
  private notes = new Map<string, string[]>();

  async getFilterOptions(options?: { signal?: AbortSignal }): Promise<ForecastFilterOptions> {
    checkSignal(options?.signal);
    return {
      horizons: [...horizons], geographies: [{ code: 'IN', label: 'All India' }], states: [...states], sectors: [...sectors], occupations: [...occupations], skills: [...skills],
      defaults: { horizonYears: 5, geographyCode: 'IN', stateCode: '', sectorCode: '', occupationCode: '', skillCode: '' },
      meta: { ...mockMeta },
    };
  }
  async getOverview(filters: ForecastFilters, options?: { signal?: AbortSignal }): Promise<{ kpis: MetricValue[]; meta: DataMeta }> {
    checkSignal(options?.signal);
    const series = makeSeries(filters, 'total');
    const point = series.points.find((entry) => entry.year === series.horizon.endYear) ?? series.points[series.points.length - 1];
    const demand = point.forecastDemand ?? point.actualDemand ?? null;
    const supply = point.forecastSupply ?? point.actualSupply ?? null;
    const gap = demand !== null && supply !== null ? demand - supply : null;
    const previous = series.points.find((entry) => entry.year === series.horizon.endYear - 1);
    const previousDemand = previous?.forecastDemand ?? previous?.actualDemand ?? null;
    const previousSupply = previous?.forecastSupply ?? previous?.actualSupply ?? null;
    const warnings = await this.getWarnings(filters, { limit: 100 }, options);
    const highRisk = new Set(warnings.items.filter((item) => item.entityType === 'occupation' && (item.severity === 'critical' || item.severity === 'high') && item.status !== 'resolved').map((item) => item.entityCode)).size;
    const meta = metaFor(filters, 'mock');
    const metric = (key: string, label: string, value: number | null, unit: string, note: string, prior: number | null): MetricValue => ({
      key, label, value, formattedValue: fmt(value), unit, period: String(series.horizon.endYear), note,
      delta: value !== null && prior !== null && prior !== 0 ? { value: ((value - prior) / Math.abs(prior)) * 100, unit: 'percent', direction: value >= prior ? 'up' : 'down', comparisonLabel: 'vs prior year (demo)' } : undefined,
      meta,
    });
    return { kpis: [
      metric('projectedDemand', 'Projected Demand', demand, 'persons', 'Forecast point for the selected horizon; illustrative fixture.', previousDemand),
      metric('projectedSupply', 'Projected Supply', supply, 'persons', 'Compatible supply proxy in the same illustrative unit and horizon.', previousSupply),
      metric('projectedGap', 'Projected Gap', gap, 'persons', gap === null ? 'Unavailable because compatible inputs are missing.' : gap > 0 ? 'Positive values indicate potential shortage (demand − supply).' : gap < 0 ? 'Negative values indicate potential surplus (demand − supply).' : 'Demand and supply are equal in this fixture.', null),
      metric('highRiskOccupations', 'High-Risk Occupations', highRisk, 'occupations', 'Distinct occupations in high/critical non-resolved demo warnings; rule metadata is illustrative.', null),
    ], meta };
  }
  async getSeries(filters: ForecastFilters, viewBy: ForecastSeriesResponse['viewBy'], options?: { signal?: AbortSignal }): Promise<ForecastSeriesResponse> {
    checkSignal(options?.signal); return makeSeries(filters, viewBy);
  }
  async getWarnings(filters: ForecastFilters, params?: { limit?: number; category?: string }, options?: { signal?: AbortSignal }): Promise<{ items: EarlyWarning[]; counts: Record<string, number>; meta: DataMeta }> {
    checkSignal(options?.signal);
    let list = this.alerts.filter((alert) => {
      if (filters.stateCode && alert.regionCode !== filters.stateCode) return false;
      if (filters.occupationCode && alert.entityCode !== filters.occupationCode && alert.entityType === 'occupation') return false;
      if (filters.skillCode && alert.entityCode !== filters.skillCode && alert.entityType === 'skill') return false;
      if (params?.category && alert.category !== params.category) return false;
      return true;
    });
    const severityWeight: Record<EarlyWarning['severity'], number> = { critical: 0, high: 1, moderate: 2, low: 3, information: 4 };
    list = list.sort((a, b) => severityWeight[a.severity] - severityWeight[b.severity] || a.expectedHorizon.startYear - b.expectedHorizon.startYear);
    const counts: Record<string, number> = { total: list.length, new: 0, 'under-review': 0, acknowledged: 0, resolved: 0, critical: 0, high: 0, moderate: 0, low: 0, information: 0 };
    for (const item of list) { counts[item.status] = (counts[item.status] ?? 0) + 1; counts[item.severity] = (counts[item.severity] ?? 0) + 1; }
    return { items: list.slice(0, params?.limit ?? list.length).map((item) => ({ ...item })), counts, meta: metaFor(filters, 'mock') };
  }
  async getRiskMatrix(filters: ForecastFilters, entityType: RiskCell['entityType'], options?: { signal?: AbortSignal }): Promise<RiskMatrixResponse> {
    checkSignal(options?.signal);
    const regionList = filters.stateCode ? states.filter((item) => item.code === filters.stateCode) : states;
    const entityList = entityType === 'occupation' ? occupations : entityType === 'sector' ? sectors : skills;
    const filteredEntities = entityType === 'occupation' && filters.occupationCode ? entityList.filter((item) => item.code === filters.occupationCode)
      : entityType === 'sector' && filters.sectorCode ? entityList.filter((item) => item.code === filters.sectorCode)
      : entityType === 'skill' && filters.skillCode ? entityList.filter((item) => item.code === filters.skillCode) : entityList;
    const factorByRegion: Record<string, number> = { 'IN-MH': 1.12, 'IN-UP': 1.23, 'IN-TN': 0.9, 'IN-KA': 0.88, 'IN-GJ': 1.04, 'IN-OD': 0.78, 'IN-WB': 0.96, 'IN-BR': 1.01 };
    const gapRatios = [0.26, 0.14, 0.04, -0.12, -0.24, 0.18, 0.1, -0.04];
    const cells: RiskCell[] = [];
    regionList.forEach((region, ri) => filteredEntities.forEach((entity, ei) => {
      const demand = Math.round((40000 + ei * 8400) * (factorByRegion[region.code] ?? 1));
      const ratio = gapRatios[(ri * 3 + ei * 5) % gapRatios.length];
      const gap = Math.round(demand * ratio);
      const supply = demand - gap;
      cells.push({ regionCode: region.code, entityCode: entity.code, entityType, riskClass: riskClassFor(gap, demand), demand, supply, gap, unit: 'persons', forecastYear: 2024 + filters.horizonYears, ruleId: `DEMO-RISK-${riskClassFor(gap, demand).toUpperCase()}`, provenance: 'mock', sourceLabels: [...mockMeta.sourceLabels], notes: ['Deterministic risk cell for UI validation only; not a production risk classification.'] });
    }));
    return { regions: regionList, entities: filteredEntities, cells, legend: [...legend], meta: metaFor(filters, 'mock') };
  }
  async getStateRiskMap(filters: ForecastFilters, entityType: RiskCell['entityType'], options?: { signal?: AbortSignal }): Promise<StateRiskMapResponse> {
    checkSignal(options?.signal);
    const matrix = await this.getRiskMatrix(filters, entityType, options);
    const valuesByStateCode: StateRiskMapResponse['valuesByStateCode'] = {};
    for (const region of matrix.regions) {
      const cells = matrix.cells.filter((cell) => cell.regionCode === region.code && cell.gap !== null);
      if (!cells.length) valuesByStateCode[region.code] = { value: null, riskClass: 'no-data' };
      else {
        const maximum = [...cells].sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity))[0];
        valuesByStateCode[region.code] = { value: maximum.gap, riskClass: maximum.riskClass };
      }
    }
    return { valuesByStateCode, unit: 'persons', legend: [...legend], geometryAvailable: false, geometryUnavailableReason: 'No verified, licensed State/UT GeoJSON is included in this frontend package; map shading is intentionally disabled.', meta: metaFor(filters, 'mock') };
  }
  async getRiskDetails(filters: ForecastFilters, regionCode: string, entityCode: string, options?: ForecastRequestOptions): Promise<RiskDetailResponse> {
    checkSignal(options?.signal);
    const entityType: RiskCell['entityType'] = options?.entityType ?? (sectors.some((item) => item.code === entityCode) ? 'sector' : skills.some((item) => item.code === entityCode) ? 'skill' : 'occupation');
    const matrix = await this.getRiskMatrix({ ...filters, stateCode: '' }, entityType, options);
    const cell = matrix.cells.find((item) => item.regionCode === regionCode && item.entityCode === entityCode);
    if (!cell) throw new Error('Risk detail is not available for this region/entity in the active fixture.');
    return { cell, evidence: ['Illustrative historical and projected series used by the fixture.', `Rule ${cell.ruleId} returned this illustrative risk band.`, 'No source-backed labour-market observation is included in this demo detail.'], assumptions: ['Forecast growth follows the scenario fixture and does not represent an official projection.', 'Regional and occupation series are simplified synthetic aggregates.'], drivers: [{ label: 'Projected demand pressure', contribution: cell.gap === null ? null : cell.gap / Math.max(1, cell.demand ?? 1), unit: 'gap / demand ratio' }], meta: metaFor(filters, 'mock') };
  }
  async getScenarioOptions(filters: ForecastFilters, options?: { signal?: AbortSignal }): Promise<ScenarioOptionsResponse> {
    checkSignal(options?.signal);
    return {
      scenarios: [
        { id: 'baseline', label: 'Baseline', description: 'Current fixture trajectory with no additional growth adjustment.', isDefault: true },
        { id: 'higher-growth', label: 'Higher Growth', description: 'Conditional trajectory with growth above the baseline.' },
        { id: 'lower-growth', label: 'Lower Growth', description: 'Conditional trajectory with growth below the baseline.' },
      ],
      assumptions: [{ key: 'growthRatePct', label: 'Annual demand growth adjustment', value: 0, unit: 'percentage points', min: -4, max: 4, step: 0.5, editable: true, source: 'Mock scenario fixture (demo only)' }],
      meta: metaFor(filters, 'mock'),
    };
  }
  async compareScenarios(filters: ForecastFilters, scenarioIds: string[], assumptionValues: Record<string, number> = {}, options?: { signal?: AbortSignal }): Promise<ScenarioComparisonResponse> {
    checkSignal(options?.signal);
    const series = makeSeries(filters, 'total');
    const baseDemand = series.points.filter((point) => point.forecastDemand !== null && point.forecastDemand !== undefined);
    const baseSupply = series.points.filter((point) => point.forecastSupply !== null && point.forecastSupply !== undefined);
    const adjustment = Math.max(-4, Math.min(4, assumptionValues.growthRatePct ?? 0)) / 100;
    const labels: Record<string, string> = { baseline: 'Baseline', 'higher-growth': 'Higher Growth', 'lower-growth': 'Lower Growth' };
    const scenarios = scenarioIds.map((id) => {
      const direction = id === 'higher-growth' ? 1 : id === 'lower-growth' ? -1 : 0;
      return { id, label: labels[id] ?? id, points: baseDemand.map((point, i) => {
        const base = point.forecastDemand ?? 0;
        const supply = baseSupply[i]?.forecastSupply ?? 0;
        const deltaRate = (direction * 0.022) + adjustment;
        const demand = Math.round(base * Math.pow(1 + deltaRate, i + 1));
        return { ...point, forecastDemand: demand, forecastSupply: supply, demandInterval: point.demandInterval, supplyInterval: point.supplyInterval };
      }) };
    });
    return { scenarios, assumptions: [{ key: 'growthRatePct', label: 'Annual demand growth adjustment', value: adjustment * 100, unit: 'percentage points', min: -4, max: 4, editable: true, source: 'Mock scenario fixture (demo only)' }], meta: metaFor(filters, 'mock') };
  }
  async getModelPerformance(filters: ForecastFilters, options?: { signal?: AbortSignal }): Promise<ModelPerformanceResponse> {
    checkSignal(options?.signal);
    const factor = scaleFor(filters);
    const source = [
      { period: '2019', actual: 83500, error: -1500 }, { period: '2020', actual: 87100, error: 2300 },
      { period: '2022', actual: 95600, error: -2800 }, { period: '2023', actual: 99800, error: 1900 }, { period: '2024', actual: 104600, error: 2700 },
    ].map((item) => ({ period: item.period, actual: Math.round(item.actual * factor), predicted: Math.round((item.actual + item.error) * factor) }));
    const errors = source.map((item) => item.predicted - item.actual);
    const mae = errors.reduce((sum, value) => sum + Math.abs(value), 0) / errors.length;
    const rmse = Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length);
    const mape = source.every((item) => Math.abs(item.actual) > 1) ? errors.reduce((sum, value, i) => sum + Math.abs(value / source[i].actual), 0) / errors.length * 100 : null;
    return {
      series: source.map((item) => ({ ...item, lower: Math.round(item.predicted * 0.97), upper: Math.round(item.predicted * 1.03) })),
      metrics: [
        { key: 'mae', label: 'Mean absolute error (MAE)', value: mae, unit: 'persons', definition: 'Average absolute difference between actual and predicted values.', suitabilityNote: 'Unit remains persons; lower is better for the same series and evaluation window.' },
        { key: 'rmse', label: 'Root mean square error (RMSE)', value: rmse, unit: 'persons', definition: 'Square root of mean squared prediction error; larger misses receive more weight.' },
        ...(mape === null ? [] : [{ key: 'mape', label: 'Mean absolute percentage error (MAPE)', value: mape, unit: '%', definition: 'Mean absolute percentage error over the supplied non-zero actuals.', suitabilityNote: 'Only shown because all fixture actuals are non-zero; interpret cautiously.' }]),
      ],
      evaluation: { startPeriod: '2019', endPeriod: '2024', horizon: 1, modelVersion: 'DEMO-FCST-0.1', baseline: 'Illustrative historical baseline' },
      coverage: { usablePeriods: 5, expectedPeriods: 6, percent: 83.3, gaps: ['2021: no fixture observation supplied'] },
      limitations: ['All values are synthetic fixture values, not validated model backtests.', 'Historical backtest performance does not guarantee future accuracy.', 'Coverage values exist solely to exercise the explanatory UI.'],
      meta: metaFor(filters, 'mock'),
    };
  }
  async getAlerts(filters: ForecastFilters, params?: { status?: string; severity?: string; query?: string; page?: number; pageSize?: number }, options?: { signal?: AbortSignal }): Promise<{ items: EarlyWarning[]; total: number; counts: Record<string, number>; meta: DataMeta }> {
    checkSignal(options?.signal);
    const needle = (params?.query ?? '').trim().toLowerCase();
    const matched = this.alerts.filter((item) => {
      if (filters.stateCode && item.regionCode !== filters.stateCode) return false;
      if (params?.status && params.status !== 'all' && item.status !== params.status) return false;
      if (params?.severity && params.severity !== 'all' && item.severity !== params.severity) return false;
      if (needle && ![item.id, item.title, item.entityLabel, item.regionLabel, item.rule.label].some((v) => (v ?? '').toLowerCase().includes(needle))) return false;
      return true;
    });
    const counts: Record<string, number> = { total: matched.length, new: 0, 'under-review': 0, acknowledged: 0, resolved: 0, critical: 0, high: 0, moderate: 0, low: 0, information: 0 };
    matched.forEach((item) => { counts[item.status] = (counts[item.status] ?? 0) + 1; counts[item.severity] = (counts[item.severity] ?? 0) + 1; });
    const page = Math.max(0, params?.page ?? 0);
    const pageSize = Math.max(1, params?.pageSize ?? 8);
    return { items: matched.slice(page * pageSize, page * pageSize + pageSize).map((item) => ({ ...item })), total: matched.length, counts, meta: metaFor(filters, 'mock') };
  }
  async getAlertDetail(id: string, options?: { signal?: AbortSignal }): Promise<AlertDetailResponse> {
    checkSignal(options?.signal);
    const alert = this.alerts.find((item) => item.id === id);
    if (!alert) throw new Error(`Alert ${id} was not found.`);
    const timeline = this.timeline.get(id) ?? [{ at: alert.createdAt, event: 'Illustrative alert fixture created', actor: 'Demo adapter' }, ...(alert.status !== 'new' ? [{ at: alert.updatedAt, event: `Status set to ${alert.status}`, actor: alert.assigneeLabel ?? 'Demo adapter' }] : [])];
    return {
      alert: { ...alert },
      factors: [
        { label: 'Projected demand pressure', explanation: 'Synthetic projected demand compared with a compatible illustrative supply proxy.', value: alert.severity === 'critical' ? 0.26 : alert.severity === 'high' ? 0.18 : 0.1, unit: 'gap / demand ratio' },
        { label: 'Observation coverage', explanation: 'This fixture does not contain source-backed coverage evidence.', value: null },
      ],
      evidence: ['The alert is part of the deterministic mock fixture.', `Rule ${alert.rule.id}: ${alert.rule.thresholdDescription}`, `Entity: ${alert.entityLabel}; region: ${alert.regionLabel ?? 'not specified'}.`],
      assumptions: ['This is not a production warning.', 'A model/service must supply verified source observations, thresholds and evaluation horizon before operational use.'],
      timeline: timeline.map((item) => ({ ...item })),
      recommendations: ['Validate source coverage and rule configuration with the analytics owner.', 'Review the projected horizon against observed data before taking action.'],
      meta: metaFor({ horizonYears: 5, geographyCode: alert.regionCode ?? 'IN' }, 'mock'),
    };
  }
  async acknowledgeAlert(id: string, options?: { signal?: AbortSignal }): Promise<EarlyWarning> {
    checkSignal(options?.signal);
    return this.updateAlert(id, { status: 'acknowledged' }, options);
  }
  async updateAlert(id: string, patch: { status?: EarlyWarning['status']; assigneeId?: string | null; assigneeLabel?: string | null }, options?: { signal?: AbortSignal }): Promise<EarlyWarning> {
    checkSignal(options?.signal);
    const index = this.alerts.findIndex((item) => item.id === id);
    if (index < 0) throw new Error(`Alert ${id} was not found.`);
    const prior = this.alerts[index];
    const updated: EarlyWarning = { ...prior, ...patch, updatedAt: new Date().toISOString() };
    this.alerts[index] = updated;
    const events = this.timeline.get(id) ?? [{ at: prior.createdAt, event: 'Illustrative alert fixture created', actor: 'Demo adapter' }];
    if (patch.status && patch.status !== prior.status) events.push({ at: updated.updatedAt, event: `Status changed: ${prior.status} → ${patch.status}`, actor: updated.assigneeLabel ?? 'Demo analyst' });
    if (patch.assigneeId !== undefined && patch.assigneeId !== prior.assigneeId) events.push({ at: updated.updatedAt, event: `Assignment updated: ${updated.assigneeLabel ?? updated.assigneeId ?? 'Unassigned'}`, actor: 'Demo analyst' });
    this.timeline.set(id, events);
    return { ...updated };
  }
  async addAlertNote(id: string, note: string, options?: { signal?: AbortSignal }): Promise<{ id: string; createdAt: string }> {
    checkSignal(options?.signal);
    if (!this.alerts.some((item) => item.id === id)) throw new Error(`Alert ${id} was not found.`);
    const clean = note.trim();
    if (!clean) throw new Error('Enter a note before saving.');
    const createdAt = new Date().toISOString();
    const noteId = `demo-note-${(this.notes.get(id)?.length ?? 0) + 1}`;
    const notes = this.notes.get(id) ?? [];
    notes.push(clean); this.notes.set(id, notes);
    const timeline = this.timeline.get(id) ?? [];
    timeline.push({ at: createdAt, event: `Note added: ${clean}`, actor: 'Demo analyst' }); this.timeline.set(id, timeline);
    return { id: noteId, createdAt };
  }
}

export { mockMeta as MOCK_FORECAST_META };
