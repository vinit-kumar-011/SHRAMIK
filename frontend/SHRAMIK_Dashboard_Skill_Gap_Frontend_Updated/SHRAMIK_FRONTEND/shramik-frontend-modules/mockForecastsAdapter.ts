import type { ForecastsDataAdapter, ForecastFilters, DataMeta, Provenance, MetricValue, ForecastSeriesResponse, EarlyWarning, RiskClass, ModelPerformanceResponse } from '../types/forecasts';

const mockMeta: DataMeta = {
  provenance: 'mock' as Provenance,
  sourceLabels: ['Mock Data'],
  asOf: new Date().toISOString().split('T')[0],
  updatedAt: new Date().toISOString(),
  units: 'persons',
  geographyCode: 'IN',
  notes: ['Illustrative mock data only - not real SHRAMIK data']
};

export class MockForecastsAdapter implements ForecastsDataAdapter {
  async getFilterOptions() {
    return { horizons: [1,3,5], geographies: [{code:'IN',label:'India'},{code:'MH',label:'Maharashtra'}], sectors: [{code:'IT',label:'IT Services'},{code:'MFG',label:'Manufacturing'}], occupations: [{code:'2411',label:'Software Developers'}], skills: [{code:'PY',label:'Python'},{code:'JS',label:'JavaScript'}], meta: mockMeta };
  }

  async getOverview(_filters: ForecastFilters): Promise<{ kpis: MetricValue[]; meta: DataMeta }> {
    return {
      kpis: [
        { key: 'projectedDemand', label: 'Projected Demand', value: 125000, formattedValue: '125,000', unit: 'persons', period: '2026', meta: mockMeta },
        { key: 'projectedSupply', label: 'Projected Supply', value: 110000, formattedValue: '110,000', unit: 'persons', period: '2026', meta: mockMeta },
        { key: 'projectedGap', label: 'Projected Gap', value: 15000, formattedValue: '15,000', unit: 'persons', period: '2026', meta: mockMeta },
        { key: 'highRiskOccupations', label: 'High-Risk Occupations', value: 8, formattedValue: '8', unit: 'count', period: '2026', meta: mockMeta }
      ],
      meta: mockMeta
    };
  }

  async getSeries(_filters: ForecastFilters, viewBy: ForecastSeriesResponse['viewBy']): Promise<ForecastSeriesResponse> {
    const points = [];
    for (let year = 2020; year <= 2028; year++) {
      const isForecast = year > 2024;
      points.push({
        period: year.toString(), year,
        actualDemand: isForecast ? null : 95000 + (year - 2020) * 3000,
        actualSupply: isForecast ? null : 88000 + (year - 2020) * 2500,
        forecastDemand: isForecast ? 95000 + (year - 2020) * 3000 : null,
        forecastSupply: isForecast ? 88000 + (year - 2020) * 2500 : null,
        demandInterval: isForecast ? { lower: 110000, upper: 140000, level: 95 } : undefined,
        supplyInterval: isForecast ? { lower: 105000, upper: 115000, level: 95 } : undefined
      });
    }
    return { points, unit: 'persons', historicalThrough: 2024, horizon: { startYear: 2025, endYear: 2028 }, intervalLevel: 95, viewBy, meta: mockMeta };
  }

  async getWarnings(): Promise<{ items: EarlyWarning[]; counts: Record<string, number>; meta: DataMeta }> {
    const items: EarlyWarning[] = [
      { id: 'w1', title: 'Software Developer shortage projected', entityCode: '2411', entityLabel: 'Software Developers', entityType: 'occupation', regionCode: 'IN', regionLabel: 'India', severity: 'high', category: 'shortage', expectedHorizon: { startYear: 2025, endYear: 2027 }, status: 'new', rule: { id: 'r1', label: 'Gap > 15%', thresholdDescription: 'Gap exceeds 15%' }, summary: 'Projected shortage of ~15,000 software developers by 2026', provenance: 'mock', sourceLabels: ['Mock Model'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    return { items, counts: { total: 1, high: 1, new: 1 }, meta: mockMeta };
  }

  async getRiskMatrix(): Promise<any> {
    return { regions: [{code:'IN',label:'India'},{code:'MH',label:'Maharashtra'}], entities: [{code:'2411',label:'Software Developers'}], cells: [{ regionCode: 'IN', entityCode: '2411', entityType: 'occupation', riskClass: 'high-shortage' as RiskClass, demand: 125000, supply: 110000, gap: 15000, unit: 'persons', forecastYear: 2026, provenance: 'mock', sourceLabels: ['Mock Data'] }], legend: [{riskClass:'high-shortage',label:'High Shortage'},{riskClass:'moderate-shortage',label:'Moderate Shortage'},{riskClass:'balanced',label:'Balanced'},{riskClass:'moderate-surplus',label:'Moderate Surplus'},{riskClass:'high-surplus',label:'High Surplus'},{riskClass:'no-data',label:'No Data'}], meta: mockMeta };
  }

  async getStateRiskMap(): Promise<any> {
    return { valuesByStateCode: { 'MH': { value: 15000, riskClass: 'high-shortage' as RiskClass }, 'KA': { value: 12000, riskClass: 'moderate-shortage' as RiskClass } }, unit: 'persons', legend: [{riskClass:'high-shortage',label:'High Shortage'},{riskClass:'moderate-shortage',label:'Moderate Shortage'}], meta: mockMeta };
  }

  async getRiskDetails(): Promise<any> {
    return { cell: { regionCode: 'IN', entityCode: '2411', entityType: 'occupation', riskClass: 'high-shortage' as RiskClass, demand: 125000, supply: 110000, gap: 15000, unit: 'persons', forecastYear: 2026, provenance: 'mock', sourceLabels: ['Mock Data'] }, evidence: ['Historical trend shows increasing demand'], assumptions: ['Economic growth continues at current rate'], drivers: [{ label: 'Digital transformation', contribution: 0.6, unit: 'ratio' }], meta: mockMeta };
  }

  async getScenarioOptions(): Promise<any> {
    return { scenarios: [{id:'baseline',label:'Baseline',isDefault:true},{id:'high-growth',label:'Higher Growth'},{id:'low-growth',label:'Lower Growth'}], assumptions: [{key:'growthRate',label:'Growth Rate',unit:'percent',min:-5,max:15}], meta: mockMeta };
  }

  async compareScenarios(_filters: ForecastFilters, scenarioIds: string[]): Promise<any> {
    return { scenarios: scenarioIds.map(id => ({ id, label: id === 'baseline' ? 'Baseline' : id === 'high-growth' ? 'Higher Growth' : 'Lower Growth', points: [{ period: '2026', year: 2026, forecastDemand: 125000 * (id === 'high-growth' ? 1.1 : id === 'low-growth' ? 0.9 : 1.0), forecastSupply: 110000 }] })), assumptions: [{key:'growthRate',label:'Growth Rate',value:5,unit:'percent'}], meta: mockMeta };
  }

  async getModelPerformance(): Promise<ModelPerformanceResponse> {
    return { series: [{period:'2023',actual:105000,predicted:107000},{period:'2024',actual:108000,predicted:109500}], metrics: [{key:'mae',label:'MAE',value:2500,unit:'persons',definition:'Mean Absolute Error',suitabilityNote:'Suitable for this series'},{key:'rmse',label:'RMSE',value:3200,unit:'persons',definition:'Root Mean Square Error'}], evaluation: {startPeriod:'2023',endPeriod:'2024',horizon:1,modelVersion:'v1.0',baseline:'Historical Average'}, coverage: {usablePeriods:5,expectedPeriods:5,percent:100,gaps:[]}, limitations: ['Model performance based on historical data'], meta: mockMeta };
  }

  async getAlerts(): Promise<any> {
    const warnings = await this.getWarnings();
    return { items: warnings.items, total: warnings.items.length, counts: warnings.counts, meta: mockMeta };
  }

  async getAlertDetail(_id: string): Promise<any> {
    return { alert: (await this.getWarnings()).items[0], factors: [{label:'Industry growth',explanation:'Rapid growth in software sector'}], evidence: ['Job postings increased by 25%'], assumptions: ['Continued economic growth'], timeline: [{at:new Date().toISOString(),event:'Alert created'}], recommendations: ['Monitor skill development programs'], meta: mockMeta };
  }

  async acknowledgeAlert(_id: string): Promise<EarlyWarning> {
    const alert = (await this.getWarnings()).items[0];
    return { ...alert, status: 'acknowledged', updatedAt: new Date().toISOString() };
  }

  async updateAlert(_id: string, patch: any): Promise<EarlyWarning> {
    const alert = (await this.getWarnings()).items[0];
    return { ...alert, ...patch, updatedAt: new Date().toISOString() };
  }

  async addAlertNote(_id: string, _note: string): Promise<{ id: string; createdAt: string }> {
    return { id: `note-${Date.now()}`, createdAt: new Date().toISOString() };
  }
}
