import type {
  DashboardQuery, DashboardRow, DashboardSummary, DataMeta,
  DetailPayload, DetailQuery, LabourMarketDataAdapter, MetricCardData, NotificationItem,
  RankedRegion, RankedRegionsResponse, RankingsQuery, RegionMetric, RegionOption,
  SearchQuery, SearchResult, TrendPoint, UserProfile,
} from './contracts';

const MOCK_META: DataMeta = {
  provenance: 'mock',
  sourceLabel: 'Illustrative prototype data',
  updatedAt: '2026-10-11T00:00:00.000Z',
  coverage: 'UI demonstration only',
  notes: ['Not source-backed labour-market statistics. Replace with validated API data before production use.'],
};

const regions: RegionOption[] = [
  { code: 'IN', label: 'India (National)', level: 'national' },
  { code: 'EAST', label: 'East India', level: 'region' },
  { code: 'OD', label: 'Odisha', level: 'state' },
  { code: 'MH', label: 'Maharashtra', level: 'state' },
  { code: 'TN', label: 'Tamil Nadu', level: 'state' },
  { code: 'KA', label: 'Karnataka', level: 'state' },
  { code: 'GJ', label: 'Gujarat', level: 'state' },
  { code: 'UP', label: 'Uttar Pradesh', level: 'state' },
];

function metric(id: string, key: string, title: string, subtitle: string, value: number, formattedValue: string, unit: string, deltaPct: number, context: string, trend: number[]): MetricCardData {
  return { id, key, title, subtitle, value, formattedValue, unit, deltaPct, context, trend, meta: MOCK_META };
}

const baseKpis: MetricCardData[] = [
  metric('total-labour-demand', 'demand', 'Total Labour Demand', 'Estimated workforce demand', 236.8, '236.8M', 'million workers', 4.2, 'vs. last year', [18, 25, 23, 36, 32, 45, 49, 64]),
  metric('total-labour-supply', 'supply', 'Total Labour Supply', 'Estimated workforce supply', 229.1, '229.1M', 'million workers', 3.1, 'vs. last year', [17, 22, 20, 30, 35, 32, 44, 54]),
  metric('overall-skill-gap', 'skill-gap', 'Overall Skill Gap', 'Demand − Supply', 7.7, '7.7M', 'million workers', 12.6, 'vs. last year', [15, 19, 17, 31, 28, 41, 38, 52]),
  metric('emerging-skills', 'emerging-skills', 'Emerging Skills', 'High-growth opportunities', 312, '312', 'signals', 28, 'new this year', [13, 18, 15, 26, 24, 35, 33, 47]),
];

const demandTrend: TrendPoint[] = [
  { year: 2020, demand: 112, supply: 82 },
  { year: 2021, demand: 151, supply: 107 },
  { year: 2022, demand: 169, supply: 132 },
  { year: 2023, demand: 202, supply: 163 },
  { year: 2024, demand: 236, supply: 214 },
];

const skillRows: DashboardRow[] = [
  { id: 'artificial-intelligence', name: 'Artificial Intelligence', deltaPct: 52, formattedDelta: '+52%', displayScore: 83, tone: 'navy', iconKey: 'brain-circuit', meta: MOCK_META },
  { id: 'green-energy-systems', name: 'Green Energy Systems', deltaPct: 41, formattedDelta: '+41%', displayScore: 62, tone: 'teal', iconKey: 'leaf', meta: MOCK_META },
  { id: 'data-analysis', name: 'Data Analysis', deltaPct: 37, formattedDelta: '+37%', displayScore: 53, tone: 'orange', iconKey: 'chart-column', meta: MOCK_META },
  { id: 'industrial-automation', name: 'Industrial Automation', deltaPct: 33, formattedDelta: '+33%', displayScore: 70, tone: 'navy', iconKey: 'wrench', meta: MOCK_META },
  { id: 'sustainable-construction', name: 'Sustainable Construction', deltaPct: 29, formattedDelta: '+29%', displayScore: 46, tone: 'teal', iconKey: 'building-2', meta: MOCK_META },
];

const gapRows: DashboardRow[] = [
  { id: 'manufacturing', name: 'Manufacturing', value: 2.8, formattedValue: '2.8M', displayScore: 93, tone: 'orange', iconKey: 'factory', meta: MOCK_META },
  { id: 'construction', name: 'Construction', value: 1.9, formattedValue: '1.9M', displayScore: 66, tone: 'orange', iconKey: 'building-2', meta: MOCK_META },
  { id: 'retail-trade', name: 'Retail & Trade', value: 1.1, formattedValue: '1.1M', displayScore: 48, tone: 'orange', iconKey: 'truck', meta: MOCK_META },
  { id: 'healthcare', name: 'Healthcare', value: 0.8, formattedValue: '0.8M', displayScore: 31, tone: 'navy', iconKey: 'heart-pulse', meta: MOCK_META },
  { id: 'agriculture', name: 'Agriculture', value: 0.6, formattedValue: '0.6M', displayScore: 22, tone: 'teal', iconKey: 'leaf', meta: MOCK_META },
];

const forecastRows: DashboardRow[] = [
  { id: 'construction-workers', name: 'Construction Workers', deltaPct: 22, formattedDelta: '+22%', displayScore: 66, tone: 'navy', iconKey: 'building-2', meta: MOCK_META },
  { id: 'machine-operators', name: 'Machine Operators', deltaPct: 18, formattedDelta: '+18%', displayScore: 52, tone: 'teal', iconKey: 'wrench', meta: MOCK_META },
  { id: 'healthcare-assistants', name: 'Healthcare Assistants', deltaPct: 16, formattedDelta: '+16%', displayScore: 44, tone: 'orange', iconKey: 'heart-pulse', meta: MOCK_META },
  { id: 'logistics-supply-chain', name: 'Logistics & Supply Chain', deltaPct: 15, formattedDelta: '+15%', displayScore: 37, tone: 'navy', iconKey: 'truck', meta: MOCK_META },
  { id: 'data-ai-specialists', name: 'Data & AI Specialists', deltaPct: 35, formattedDelta: '+35%', displayScore: 82, tone: 'teal', iconKey: 'brain-circuit', meta: MOCK_META },
];

let notifications: NotificationItem[] = [
  { id: 'demo-data-warning', title: 'Prototype data active', body: 'Values are illustrative until a source-backed API is configured.', createdAt: '2026-10-11T08:00:00.000Z', read: false, severity: 'warning' },
  { id: 'demo-refresh', title: 'Dashboard adapter ready', body: 'Configure VITE_SHRAMIK_API_BASE_URL to use the REST adapter.', createdAt: '2026-10-11T07:00:00.000Z', read: false, severity: 'info' },
];

const profile: UserProfile = { id: 'demo-analyst', displayName: 'Arjun Mehta', role: 'Research Analyst', initials: 'A', organisation: 'SHRAMIK Demo Workspace' };

function detailFor(title: string, description: string, rows: DashboardRow[] = []): DetailPayload {
  const tableRows = rows.map((row) => ({
    Item: row.name,
    Value: row.formattedValue ?? row.formattedDelta ?? '—',
    'Display score': row.displayScore ?? '—',
  }));
  return {
    id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), title, description,
    facts: [
      { label: 'Data mode', value: 'Illustrative mock adapter' },
      { label: 'Provenance', value: 'Not source-backed' },
      { label: 'Region', value: 'Selected region filter applied for integration parity' },
    ],
    table: tableRows.length ? { columns: ['Item', 'Value', 'Display score'], rows: tableRows } : undefined,
    meta: MOCK_META,
  };
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
}

export class MockLabourMarketDataAdapter implements LabourMarketDataAdapter {
  readonly mode = 'mock' as const;

  async getRegions(signal?: AbortSignal): Promise<RegionOption[]> { assertNotAborted(signal); return regions; }
  async getProfile(signal?: AbortSignal): Promise<UserProfile> { assertNotAborted(signal); return profile; }

  async getDashboard(query: DashboardQuery): Promise<DashboardSummary> {
    assertNotAborted(query.signal);
    const period = query.periodYears;
    return {
      regionCode: query.regionCode,
      regionName: regions.find((item) => item.code === query.regionCode)?.label ?? 'Selected region',
      periodYears: period,
      kpis: baseKpis.map((item) => ({ ...item, trend: [...item.trend] })),
      trend: period === 3 ? demandTrend.slice(-3) : demandTrend,
      emergingSkills: skillRows,
      sectorGaps: gapRows,
      occupationForecasts: forecastRows,
      meta: MOCK_META,
    };
  }

  async getRegionRankings(query: RankingsQuery): Promise<RankedRegionsResponse> {
    assertNotAborted(query.signal);
    const source: Record<RegionMetric, RankedRegion[]> = {
      demand: [
        { code: 'MH', name: 'Maharashtra', value: 28.4, formattedValue: '28.4M', level: 'high' },
        { code: 'UP', name: 'Uttar Pradesh', value: 24.1, formattedValue: '24.1M', level: 'high' },
        { code: 'TN', name: 'Tamil Nadu', value: 18.7, formattedValue: '18.7M', level: 'medium' },
        { code: 'KA', name: 'Karnataka', value: 16.3, formattedValue: '16.3M', level: 'medium' },
        { code: 'GJ', name: 'Gujarat', value: 14.9, formattedValue: '14.9M', level: 'medium' },
      ],
      supply: [
        { code: 'UP', name: 'Uttar Pradesh', value: 23.2, formattedValue: '23.2M', level: 'high' },
        { code: 'MH', name: 'Maharashtra', value: 22.6, formattedValue: '22.6M', level: 'high' },
        { code: 'TN', name: 'Tamil Nadu', value: 17.8, formattedValue: '17.8M', level: 'medium' },
        { code: 'WB', name: 'West Bengal', value: 15.2, formattedValue: '15.2M', level: 'medium' },
        { code: 'KA', name: 'Karnataka', value: 14.8, formattedValue: '14.8M', level: 'medium' },
      ],
      'skill-gap': [
        { code: 'MH', name: 'Maharashtra', value: 3.1, formattedValue: '3.1M', level: 'high' },
        { code: 'KA', name: 'Karnataka', value: 2.4, formattedValue: '2.4M', level: 'high' },
        { code: 'GJ', name: 'Gujarat', value: 1.8, formattedValue: '1.8M', level: 'medium' },
        { code: 'TN', name: 'Tamil Nadu', value: 1.6, formattedValue: '1.6M', level: 'medium' },
        { code: 'UP', name: 'Uttar Pradesh', value: 1.2, formattedValue: '1.2M', level: 'low' },
      ],
    };
    return { metric: query.metric, unit: query.metric === 'skill-gap' ? 'million workers' : 'million workers', items: source[query.metric], meta: MOCK_META };
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    assertNotAborted(query.signal);
    const q = query.query.trim().toLowerCase();
    if (!q) return [];
    const items: SearchResult[] = [
      ...skillRows.map((row) => ({ id: row.id, label: row.name, description: `Emerging skill · ${row.formattedDelta ?? 'signal'}`, kind: 'skill' as const, target: 'emerging-skills' })),
      ...gapRows.map((row) => ({ id: row.id, label: row.name, description: `Sector skill gap · ${row.formattedValue}`, kind: 'sector' as const, target: 'skill-gaps' })),
      ...forecastRows.map((row) => ({ id: row.id, label: row.name, description: `Occupation forecast · ${row.formattedDelta}`, kind: 'occupation' as const, target: 'forecasts' })),
      ...regions.map((region) => ({ id: region.code, label: region.label, description: `Region filter · ${region.level}`, kind: 'region' as const, target: region.code })),
    ];
    return items.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(q)).slice(0, 7);
  }

  async getNotifications(signal?: AbortSignal): Promise<NotificationItem[]> { assertNotAborted(signal); return [...notifications]; }

  async markNotificationRead(id: string, signal?: AbortSignal): Promise<void> {
    assertNotAborted(signal);
    notifications = notifications.map((item) => item.id === id ? { ...item, read: true } : item);
  }

  async getIndicatorDetail(id: string, query: DetailQuery): Promise<DetailPayload> {
    assertNotAborted(query.signal);
    const item = baseKpis.find((kpi) => kpi.id === id);
    if (item) return detailFor(item.title, `${item.subtitle}. Current demonstration value: ${item.formattedValue}.`, []);
    const row = [...skillRows, ...gapRows, ...forecastRows].find((entry) => entry.id === id);
    if (row) return detailFor(row.name, `Detail record for ${row.name}; values are illustrative in the mock adapter.`, [row]);
    throw new Error(`No indicator found for id '${id}'.`);
  }

  async getSectionDetail(section: string, query: DetailQuery): Promise<DetailPayload> {
    assertNotAborted(query.signal);
    const allRows: Record<string, DashboardRow[]> = {
      demand: [], supply: [], 'skill-gaps': gapRows, 'emerging-skills': skillRows,
      forecasts: forecastRows, reports: [], 'data-sources': [], 'data-quality': [],
      'scenario-simulator': [], dashboard: [],
    };
    const titles: Record<string, string> = {
      demand: 'Demand insights', supply: 'Supply insights', 'skill-gaps': 'Skill gaps',
      'emerging-skills': 'Emerging skills', forecasts: 'Occupation forecasts', reports: 'Reports',
      'data-sources': 'Data sources', 'data-quality': 'Data quality',
      'scenario-simulator': 'Scenario simulator', dashboard: 'Dashboard overview',
    };
    const title = titles[section] ?? section.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());
    return detailFor(title, 'This detail response is delivered by the mock data adapter. The REST adapter loads the same view from the configured API.', allRows[section] ?? []);
  }
}

export { MOCK_META as mockDataMeta };
