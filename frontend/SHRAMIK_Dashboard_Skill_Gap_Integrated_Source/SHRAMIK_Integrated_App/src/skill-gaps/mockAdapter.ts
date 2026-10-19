import type {
  GapClassificationDefinition, GapDataMeta, GapDetailPayload, GapEntityType, GapFilterOptions, GapFilters,
  GapInsight, GapLandscape, GapLandscapePoint, GapMetric, GapOverview, GapProvenance, GapClass,
  RankedSkillGap, RankedSkillsQuery, RankedSkillsResponse, RegionalGapResponse, RegionalGapValue,
  SectorFlowResponse, SkillGapDataAdapter,
} from './types';

const UNIT = 'persons (illustrative)';
const SOURCE_LABEL = 'Illustrative demo data';
const CLASSIFICATIONS: GapClassificationDefinition[] = [
  { key: 'high_shortage', label: 'High shortage', colorToken: 'orange', thresholdDescription: 'Gap at or above 20% of demand (demo configuration).' },
  { key: 'moderate_shortage', label: 'Moderate shortage', colorToken: 'yellow', thresholdDescription: 'Gap from +5% to below +20% of demand (demo configuration).' },
  { key: 'balanced', label: 'Balanced', colorToken: 'teal', thresholdDescription: 'Absolute gap within the configured 5% of demand tolerance.' },
  { key: 'moderate_surplus', label: 'Moderate surplus', colorToken: 'blue', thresholdDescription: 'Supply exceeds demand by 5% to below 20% of demand (demo configuration).' },
  { key: 'high_surplus', label: 'High surplus', colorToken: 'navy', thresholdDescription: 'Supply exceeds demand by 20% or more of demand (demo configuration).' },
  { key: 'not_comparable', label: 'Not comparable', colorToken: 'neutral', thresholdDescription: 'Input definitions, units or periods are not compatible.' },
  { key: 'no_data', label: 'No data', colorToken: 'neutral', thresholdDescription: 'No value returned for this region.' },
];

const PERIODS = [{ value: '2024-25', label: '2024–25 (demo period)' }, { value: '2023-24', label: '2023–24 (demo period)' }];
const STATES: Array<{ code: string; label: string; weight: number }> = [
  { code: 'IN-MH', label: 'Maharashtra', weight: 1.5 }, { code: 'IN-UP', label: 'Uttar Pradesh', weight: 1.6 },
  { code: 'IN-TN', label: 'Tamil Nadu', weight: 1.2 }, { code: 'IN-GJ', label: 'Gujarat', weight: 1.2 },
  { code: 'IN-KA', label: 'Karnataka', weight: 1.1 }, { code: 'IN-WB', label: 'West Bengal', weight: 1 },
  { code: 'IN-RJ', label: 'Rajasthan', weight: .9 }, { code: 'IN-BR', label: 'Bihar', weight: .9 },
  { code: 'IN-KL', label: 'Kerala', weight: .7 }, { code: 'IN-PB', label: 'Punjab', weight: .6 },
  { code: 'IN-OD', label: 'Odisha', weight: .6 }, { code: 'IN-LA', label: 'Ladakh', weight: 0 },
];
const SECTORS = [
  { code: 'MFG', label: 'Manufacturing', weight: .3 }, { code: 'CON', label: 'Construction', weight: .2 },
  { code: 'RET', label: 'Retail & trade', weight: .17 }, { code: 'HLT', label: 'Healthcare', weight: .12 },
  { code: 'LOG', label: 'Logistics', weight: .1 }, { code: 'ENG', label: 'Energy', weight: .06 },
];
const OCCUPATIONS = [
  { code: 'O1', label: 'Welders & flame cutters', demand: 26000, supply: 17400 },
  { code: 'O2', label: 'Machine tool operators', demand: 31000, supply: 21000 },
  { code: 'O3', label: 'Electricians', demand: 44000, supply: 40500 },
  { code: 'O4', label: 'Data entry operators', demand: 24000, supply: 33000 },
  { code: 'O5', label: 'Retail salespersons', demand: 52000, supply: 54500 },
  { code: 'O6', label: 'Plumbers & pipe fitters', demand: 16500, supply: 12100 },
  { code: 'O7', label: 'Nursing associates', demand: 29000, supply: 18500 },
  { code: 'O8', label: 'Warehouse workers', demand: 35000, supply: 34000 },
];
const SKILLS = [
  { code: 'S01', label: 'Welding', demand: 48200, supply: 31000 },
  { code: 'S02', label: 'CNC machine operation', demand: 36500, supply: 22100 },
  { code: 'S03', label: 'Electrical wiring', demand: 52000, supply: 47800 },
  { code: 'S04', label: 'Data entry', demand: 30100, supply: 41500 },
  { code: 'S05', label: 'Solar PV installation', demand: 18700, supply: 9800 },
  { code: 'S06', label: 'Retail sales', demand: 61000, supply: 63400 },
  { code: 'S07', label: 'Plumbing', demand: 22400, supply: 15900 },
  { code: 'S08', label: 'Basic digital literacy', demand: 44000, supply: 52300 },
  { code: 'S09', label: 'Equipment maintenance', demand: 27800, supply: 20100 },
  { code: 'S10', label: 'Warehouse operations', demand: 39500, supply: 36200 },
  { code: 'S11', label: 'Patient care assistance', demand: 33200, supply: 19800 },
  { code: 'S12', label: 'Garment stitching', demand: 41000, supply: 43900 },
];

function meta(period: string, unit = UNIT, extraNotes: string[] = []): GapDataMeta {
  return {
    period, unit, provenance: 'mock', sourceLabel: SOURCE_LABEL, sourceIds: ['demo-generator'], updatedAt: null,
    coverage: { observedCount: 12, expectedCount: 36, geographyCovered: 12, geographyExpected: 36, summary: 'Illustrative coverage only; this is not a verified national dataset.' },
    notes: ['Values are generated for layout and interaction testing, not source-backed labour-market findings.', ...extraNotes],
  };
}

function seededRandom(seedText: string): () => number {
  let a = [...seedText].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function multiplier(filters: GapFilters): number {
  let factor = filters.period === '2023-24' ? .93 : 1;
  const state = STATES.find((item) => item.code === filters.stateCode);
  if (state) factor *= state.weight > 0 ? state.weight / 1.1 : .12;
  const sector = SECTORS.find((item) => item.code === filters.sectorCode);
  if (sector) factor *= sector.weight * 3;
  return factor;
}
function classify(demand: number | null, supply: number | null, balancedTolerance: number, significantThreshold: number): GapClass {
  if (demand == null || supply == null || (demand === 0 && supply !== 0)) return 'not_comparable';
  if (demand === 0 && supply === 0) return 'balanced';
  const relativeGap = (demand - supply) / demand;
  if (relativeGap >= significantThreshold) return 'high_shortage';
  if (relativeGap >= balancedTolerance) return 'moderate_shortage';
  if (relativeGap > -balancedTolerance) return 'balanced';
  if (relativeGap > -significantThreshold) return 'moderate_surplus';
  return 'high_surplus';
}
function gapPercent(demand: number | null, supply: number | null): number | null {
  return demand == null || supply == null || demand <= 0 ? null : (demand - supply) / demand;
}
function formatted(value: number | null): string {
  return value == null ? 'Not available' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}
function filtersLabel(filters: GapFilters): string {
  const region = STATES.find((item) => item.code === filters.stateCode)?.label ?? 'All India';
  return `${PERIODS.find((item) => item.value === filters.period)?.label ?? filters.period}; ${region}`;
}

interface Snapshot {
  filters: GapFilters;
  skills: GapLandscapePoint[];
  occupations: GapLandscapePoint[];
  sectors: Array<{ id: string; label: string; demand: number; supply: number; gap: number; gapPercent: number | null; classification: GapClass }>;
  regions: RegionalGapValue[];
  demandTotal: number;
  supplyTotal: number;
  skillGapTotal: number;
  significantCount: number;
  meta: GapDataMeta;
}

function createSnapshot(filters: GapFilters): Snapshot {
  const rng = seededRandom(`${filters.period}:${filters.regionCode}:${filters.stateCode}:${filters.sectorCode}:${filters.ncoCode}:${filters.skillCode}`);
  const scale = multiplier(filters);
  const shift = (base: number) => Math.max(0, Math.round(base * scale * (.92 + rng() * .16)));
  const stateScale = STATES.reduce((sum, item) => sum + item.weight, 0) || 1;
  const skillSources = filters.skillCode ? SKILLS.filter((item) => item.code === filters.skillCode) : SKILLS;
  const occSources = filters.ncoCode ? OCCUPATIONS.filter((item) => item.code === filters.ncoCode) : OCCUPATIONS;
  const skills = skillSources.map((item): GapLandscapePoint => {
    const demand = shift(item.demand); const supply = shift(item.supply); const gap = demand - supply;
    return { id: item.code, code: item.code, entityType: 'skill', label: item.label, demand, supply, gap, gapPercent: gapPercent(demand, supply), unit: UNIT, classification: classify(demand, supply, .05, .2), detailAvailable: true, meta: meta(filters.period) };
  }).sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity));
  const occupations = occSources.map((item): GapLandscapePoint => {
    const demand = shift(item.demand); const supply = shift(item.supply); const gap = demand - supply;
    return { id: item.code, code: item.code, entityType: 'occupation', label: item.label, demand, supply, gap, gapPercent: gapPercent(demand, supply), unit: UNIT, classification: classify(demand, supply, .05, .2), detailAvailable: true, meta: meta(filters.period) };
  }).sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity));
  const demandTotal = skills.reduce((sum, item) => sum + (item.demand ?? 0), 0);
  const supplyTotal = skills.reduce((sum, item) => sum + (item.supply ?? 0), 0);
  const skillGapTotal = demandTotal - supplyTotal;
  const significantCount = skills.filter((item) => item.classification === 'high_shortage').length;
  const sectors = SECTORS.filter((item) => !filters.sectorCode || item.code === filters.sectorCode).map((item) => {
    const demand = Math.round(demandTotal * item.weight * (.9 + rng() * .2));
    const supply = Math.round(supplyTotal * item.weight * (.85 + rng() * .3));
    return { id: item.code, label: item.label, demand, supply, gap: demand - supply, gapPercent: gapPercent(demand, supply), classification: classify(demand, supply, .05, .2) };
  }).sort((a, b) => b.gap - a.gap);
  const regions = STATES.map((item): RegionalGapValue => {
    if (item.weight <= 0) return { regionCode: item.code, regionName: item.label, demand: null, supply: null, gap: null, gapPercent: null, unit: UNIT, classification: 'no_data', missingReason: 'Illustrative suppression: no usable record in demo adapter.', meta: meta(filters.period) };
    const demand = Math.round((demandTotal * item.weight / stateScale) * (.9 + rng() * .2));
    const supply = Math.round((supplyTotal * item.weight / stateScale) * (.85 + rng() * .3));
    const gap = demand - supply;
    return { regionCode: item.code, regionName: item.label, demand, supply, gap, gapPercent: gapPercent(demand, supply), unit: UNIT, classification: classify(demand, supply, .05, .2), rank: null, meta: meta(filters.period) };
  });
  return { filters: { ...filters }, skills, occupations, sectors, regions, demandTotal, supplyTotal, skillGapTotal, significantCount, meta: meta(filters.period) };
}

function makeMetric(label: string, value: number | null, unit: string, definition: string, m: GapDataMeta, extra: Record<string, unknown> = {}): GapMetric {
  return { label, value, formattedValue: formatted(value), unit, definition, meta: m, ...extra } as GapMetric;
}
function detailFromPoint(type: GapEntityType, point: GapLandscapePoint | RegionalGapValue | RankedSkillGap, filters: GapFilters): GapDetailPayload {
  const row = point as GapLandscapePoint & RegionalGapValue & RankedSkillGap;
  return {
    id: row.id ?? row.regionCode ?? row.skillId,
    type,
    title: row.label ?? row.regionName ?? row.skillLabel,
    description: 'Detail record from the illustrative adapter. Replace with traceable source-backed evidence before analytical use.',
    facts: [
      { label: 'Demand', value: formatted(row.demand ?? null) },
      { label: 'Supply', value: formatted(row.supply ?? null) },
      { label: 'Gap', value: formatted(row.gap ?? null) },
      { label: 'Gap %', value: row.gapPercent == null ? 'Not available' : `${(row.gapPercent * 100).toFixed(1)}%` },
      { label: 'Unit', value: row.unit ?? UNIT },
      { label: 'Period', value: filtersLabel(filters) },
      { label: 'Classification', value: String(row.classification ?? row.gapClass ?? 'Not returned') },
      { label: 'Applied filters', value: Object.entries(filters).map(([key, value]) => `${key}: ${value || 'All'}`).join(' · ') },
    ],
    meta: row.meta ?? meta(filters.period),
  };
}

export class MockSkillGapDataAdapter implements SkillGapDataAdapter {
  readonly mode = 'mock' as const;

  async getFilterOptions(signal?: AbortSignal): Promise<GapFilterOptions> {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    const m = meta('2024–25 (illustrative period)');
    return {
      periods: PERIODS,
      geographyLevels: [{ value: 'national', label: 'All India' }, { value: 'state', label: 'State / UT' }],
      regions: [{ code: 'IN', value: 'IN', label: 'All India', level: 'national' }, ...STATES.map((item) => ({ code: item.code, value: item.code, label: item.label, level: 'state' as const }))],
      sectors: [{ value: '', label: 'All sectors' }, ...SECTORS.map((item) => ({ value: item.code, label: item.label }))],
      occupations: [{ value: '', label: 'All occupations' }, ...OCCUPATIONS.map((item) => ({ value: item.code, label: item.label }))],
      skills: [{ value: '', label: 'All skills' }, ...SKILLS.map((item) => ({ value: item.code, label: item.label }))],
      defaults: { period: '2024-25', geographyLevel: 'national', regionCode: 'IN', stateCode: '', sectorCode: '', ncoCode: '', skillCode: '' },
      configuration: { balancedTolerance: .05, significantGapThreshold: .2, classificationVersion: 'demo-thresholds-v1' },
      meta: m,
    };
  }

  async getOverview(filters: GapFilters, signal?: AbortSignal): Promise<GapOverview> {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    const s = createSnapshot(filters); const m = s.meta;
    return {
      demand: makeMetric('Estimated demand', s.demandTotal, UNIT, 'Sum of the listed skill-demand estimates for the current filter snapshot. Demonstration only.', m),
      supply: makeMetric('Estimated supply', s.supplyTotal, UNIT, 'Sum of the listed skill-supply estimates for the current filter snapshot. Demonstration only.', m),
      gap: makeMetric('Estimated gap / shortage', s.skillGapTotal, UNIT, 'Observed-period estimate, calculated in the mock adapter as comparable demand minus supply; it is not a forecast.', m, { kind: 'observed_estimate', formulaId: 'demo-demand-minus-supply-v1', gapPercent: gapPercent(s.demandTotal, s.supplyTotal), gapPercentFormula: 'gap / demand; unavailable when demand is zero', denominator: s.demandTotal }),
      significantGaps: makeMetric('Skills with significant gaps', s.significantCount, 'skills', 'Count of currently listed skills classified high shortage using the adapter demo threshold.', m),
      balancedTolerance: { value: .05, unit: 'share of demand', configId: 'demo-thresholds-v1' },
      dataStatus: 'partial', meta: { ...m, notes: [...(m.notes ?? []), 'Only 12 of 36 State/UTs are listed by this illustrative adapter.'] },
    };
  }

  async getGapLandscape(filters: GapFilters, signal?: AbortSignal): Promise<GapLandscape> {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    const snapshot = createSnapshot(filters);
    const points = filters.ncoCode ? snapshot.occupations : snapshot.skills;
    return { points, xAxis: { key: 'supply', label: 'Supply', unit: UNIT, scale: 'linear' }, yAxis: { key: 'demand', label: 'Demand', unit: UNIT, scale: 'linear' }, parityLineEligible: true, classifications: CLASSIFICATIONS, meta: snapshot.meta };
  }

  async getRegionalGaps(filters: GapFilters, metric: RegionalGapResponse['metric'], signal?: AbortSignal): Promise<RegionalGapResponse> {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    const snapshot = createSnapshot(filters);
    const items = snapshot.regions.map((item) => ({ ...item, rank: item.gap == null ? null : null }));
    const val = (item: RegionalGapValue) => metric === 'demand' ? item.demand : metric === 'supply' ? item.supply : metric === 'gap_percent' ? item.gapPercent : item.gap;
    items.sort((a, b) => (val(b) ?? -Infinity) - (val(a) ?? -Infinity));
    let rank = 0;
    for (const item of items) if (val(item) != null) item.rank = ++rank;
    return { metric, regions: items, geometry: null, geometryUnavailableReason: 'No verified, licensed state/UT GeoJSON and canonical-code crosswalk are included in this package. The illustrative PNG is deliberately not used as data geography.', scale: CLASSIFICATIONS, meta: { ...snapshot.meta, coverage: { geographyCovered: 11, geographyExpected: 36, missingCodes: ['multiple states/UTs not present in demo data'], summary: 'Illustrative coverage only; no geometry available.' } } };
  }

  async getRankedSkills(filters: GapFilters, query: RankedSkillsQuery, signal?: AbortSignal): Promise<RankedSkillsResponse> {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    const snapshot = createSnapshot(filters);
    const sortKeys: Record<RankedSkillsQuery['sort'], (item: RankedSkillGap) => string | number | null> = {
      rank: (item) => item.rank, skillLabel: (item) => item.skillLabel, demand: (item) => item.demand,
      supply: (item) => item.supply, gap: (item) => item.gap, gapPercent: (item) => item.gapPercent ?? null,
    };
    const items: RankedSkillGap[] = snapshot.skills.map((item, index) => ({
      rank: index + 1, skillId: item.id, skillCode: item.code, skillLabel: item.label, demand: item.demand,
      supply: item.supply, gap: item.gap, gapPercent: item.gapPercent, gapClass: item.classification,
      trend: [-2, -1, 0, 1].map((step, idx) => ({ period: idx === 3 ? filters.period : `t${step}`, gap: item.gap == null ? null : Math.round(item.gap * (0.78 + idx * .06)) })),
      unit: item.unit, detailAvailable: true, meta: item.meta,
    }));
    const selector = sortKeys[query.sort]; const direction = query.direction === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      const aa = selector(a); const bb = selector(b);
      if (typeof aa === 'string' && typeof bb === 'string') return direction * aa.localeCompare(bb);
      return direction * ((Number(aa) || 0) - (Number(bb) || 0));
    });
    const start = query.page * query.pageSize;
    return { items: items.slice(start, start + query.pageSize), page: query.page, pageSize: query.pageSize, total: items.length, sort: `${query.sort}:${query.direction}`, skillTaxonomyVersion: 'DEMO-SKILLS-1.0', meta: snapshot.meta };
  }

  async getSkillGapInsights(filters: GapFilters, signal?: AbortSignal): Promise<GapInsight[]> {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    const snapshot = createSnapshot(filters); const metaValue = snapshot.meta;
    const insights: GapInsight[] = [];
    const skills = [...snapshot.skills].sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity));
    const largestShortage = skills.find((item) => item.gap != null && item.gap > 0);
    const largestSurplus = [...skills].reverse().find((item) => item.gap != null && item.gap < 0);
    const topRegion = [...snapshot.regions].filter((item) => item.gap != null).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))[0];
    if (largestShortage) insights.push({ id: 'demo-insight-shortage', title: `${largestShortage.label} has the largest listed shortage`, summary: `Demand exceeds supply by ${formatted(largestShortage.gap)} ${UNIT}.`, importance: 'priority', claims: [{ text: 'Calculated from the corresponding demo point in the current filter snapshot.', metricId: largestShortage.id, value: largestShortage.gap, unit: UNIT, sourceIds: ['demo-generator'] }], evidenceEntity: { type: 'skill', id: largestShortage.id }, generatedBy: 'mock', meta: metaValue });
    if (largestSurplus) insights.push({ id: 'demo-insight-surplus', title: `${largestSurplus.label} has a potential surplus`, summary: `Supply exceeds demand by ${formatted(Math.abs(largestSurplus.gap ?? 0))} ${UNIT}.`, importance: 'info', claims: [{ text: 'Calculated from the corresponding demo point in the current filter snapshot.', metricId: largestSurplus.id, value: largestSurplus.gap, unit: UNIT, sourceIds: ['demo-generator'] }], evidenceEntity: { type: 'skill', id: largestSurplus.id }, generatedBy: 'mock', meta: metaValue });
    insights.push({ id: 'demo-insight-count', title: `${snapshot.significantCount} of ${snapshot.skills.length} listed skills are in the high-shortage class`, summary: 'The classification uses the explicitly labelled demo threshold, not a source-backed policy rule.', importance: 'watch', claims: [{ text: 'Count returned by the demo adapter configuration.', metricId: 'significantGaps', value: snapshot.significantCount, unit: 'skills', sourceIds: ['demo-generator'] }], evidenceEntity: { type: 'skill', id: largestShortage?.id ?? snapshot.skills[0]?.id ?? 'none' }, generatedBy: 'mock', meta: metaValue });
    if (topRegion) insights.push({ id: 'demo-insight-region', title: `${topRegion.regionName} ranks highest on the current demo gap measure`, summary: `Listed gap: ${formatted(topRegion.gap)} ${UNIT}. This ranking is not source-backed.`, importance: 'watch', claims: [{ text: 'Regional ranking from the current demo filter snapshot.', metricId: topRegion.regionCode, value: topRegion.gap, unit: UNIT, sourceIds: ['demo-generator'] }], evidenceEntity: { type: 'region', id: topRegion.regionCode }, generatedBy: 'mock', meta: metaValue });
    return insights.slice(0, 4);
  }

  async getSectorFlow(filters: GapFilters, sectorCode: string, signal?: AbortSignal): Promise<SectorFlowResponse> {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    return { available: false, sectorCode, nodes: [], links: [], unavailableReason: 'No measured, unit-compatible sector-flow dataset is provided by the demo adapter. SHRAMIK will not infer flows from skill gaps.', meta: meta(filters.period, UNIT, ['Flow visualisation is intentionally unavailable in demo mode.']) };
  }

  async getDetail(type: GapEntityType, id: string, filters: GapFilters, signal?: AbortSignal): Promise<GapDetailPayload> {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    const snapshot = createSnapshot(filters); let point: GapLandscapePoint | RegionalGapValue | RankedSkillGap | undefined;
    if (type === 'skill') point = [...snapshot.skills, ...snapshot.occupations].find((item) => item.id === id);
    if (type === 'occupation') point = snapshot.occupations.find((item) => item.id === id);
    if (type === 'region') point = snapshot.regions.find((item) => item.regionCode === id);
    if (type === 'sector') {
      const item = snapshot.sectors.find((row) => row.id === id);
      if (item) point = { ...item, id: item.id, code: item.id, label: item.label, unit: UNIT, detailAvailable: true, entityType: 'skill', meta: snapshot.meta } as GapLandscapePoint;
    }
    if (type === 'kpi') {
      const overview = await this.getOverview(filters, signal);
      const item = id === 'demand' ? overview.demand : id === 'supply' ? overview.supply : id === 'gap' ? overview.gap : overview.significantGaps;
      return { id, type, title: item.label, description: item.definition, facts: [{ label: 'Value', value: item.formattedValue ?? formatted(item.value) }, { label: 'Unit', value: item.unit }, { label: 'Period', value: item.meta.period }, { label: 'Formula', value: id === 'gap' ? 'Demand − supply when definitions, units and period are compatible.' : 'Returned estimate for the applied filter snapshot.' }, { label: 'Applied filters', value: filtersLabel(filters) }], meta: item.meta };
    }
    if (type === 'insight') {
      const item = (await this.getSkillGapInsights(filters, signal)).find((row) => row.id === id);
      if (item) return { id, type, title: item.title, description: item.summary, facts: [{ label: 'Generated by', value: item.generatedBy === 'mock' ? 'Illustrative rule (mock)' : item.generatedBy }, { label: 'Evidence IDs', value: item.claims.flatMap((claim) => claim.sourceIds).join(', ') || 'No evidence IDs returned' }, { label: 'Applied filters', value: filtersLabel(filters) }], meta: item.meta };
    }
    if (!point) throw new Error(`No ${type} detail found for ${id}.`);
    return detailFromPoint(type, point, filters);
  }
}

export { CLASSIFICATIONS, STATES, SECTORS, SKILLS, OCCUPATIONS };
