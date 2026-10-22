import { Activity, ArrowUpRight, Database, FileCheck2, GraduationCap, Info, MapPin, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { Children, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type DatabaseModule = 'demand' | 'supply' | 'skill-gaps' | 'forecasts' | 'emerging-skills' | 'scenario-simulator' | 'reports' | 'data-quality';

type DimensionValues = Record<string, unknown>;
type MetricRow = {
  id: string;
  source_id: string | null;
  metric_code: string;
  value_numeric: string | number;
  unit: string;
  observation_grain: string;
  state_id: string | null;
  reference_period: string;
  as_of_date: string | null;
  dimension_values: DimensionValues | null;
  provenance_state: string;
  is_synthetic: boolean;
};
type StateRow = { id: string; name: string; code: string };
type DistrictRow = { id: string; state_id: string; name: string };
type SectorRow = { id: string; code: string; name: string; description: string | null };
type SkillRow = { id: string; code: string; name: string; sector_id: string; sector_mapping_method: string; sector_mapping_confidence: string; description: string | null };
type SourceRow = { id: string; name: string; publisher: string; source_type: string; url: string | null; publication_date: string | null; accessed_at: string | null; coverage_start: number | null; coverage_end: number | null; notes: string | null };
type TableVisibility = { state: 'HAS_ROWS' | 'NO_PUBLIC_ROWS' | 'RESTRICTED'; sampleRows: number };
type GeoPosition = [number, number];
type GeoRing = GeoPosition[];
type GeoPolygon = GeoRing[];
type IndiaFeature = {
  type: 'Feature';
  properties: { name: string; code: string };
  geometry: { type: 'Polygon'; coordinates: GeoPolygon } | { type: 'MultiPolygon'; coordinates: GeoPolygon[] };
};
type IndiaFeatureCollection = { type: 'FeatureCollection'; features: IndiaFeature[] };

type Snapshot = {
  metrics: MetricRow[];
  states: StateRow[];
  districts: DistrictRow[];
  sectors: SectorRow[];
  skills: SkillRow[];
  sources: SourceRow[];
  outputs: Record<string, TableVisibility>;
  warnings: string[];
  loadedAt: string;
};

const LIMIT = 1000;
const scenarioApiConfigured = Boolean(
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_SCENARIO_SIMULATOR_API_BASE_URL?.trim(),
);
const reportsApiConfigured = Boolean(
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_SHRAMIK_API_BASE_URL?.trim(),
);
const TITLES: Record<DatabaseModule, { title: string; subtitle: string; eyebrow: string }> = {
  demand: {
    title: 'Demand & labour-market context',
    subtitle: 'Published workforce indicators and worker-registration context from the live database. These indicators are not job-posting demand, so SHRAMIK keeps them separate from validated demand observations.',
    eyebrow: 'SHRAMIK / DEMAND INTELLIGENCE',
  },
  supply: {
    title: 'Training capacity & supply context',
    subtitle: 'Source-backed training seats, institute counts, apprenticeship engagement and programme context. Training capacity and registrations are not presented as employed or available workers.',
    eyebrow: 'SHRAMIK / SUPPLY INTELLIGENCE',
  },
  'skill-gaps': {
    title: 'Skill-gap readiness',
    subtitle: 'Canonical skill and sector references are loaded from Supabase. A shortage is only calculated when comparable demand and supply observations exist with documented units, time basis and geography.',
    eyebrow: 'SHRAMIK / SKILL GAP ANALYSIS',
  },
  forecasts: {
    title: 'Forecasts & early warnings',
    subtitle: 'A clear view of published analytical outputs and the live data foundation. Historical benchmark indicators below are context only—not forecasts.',
    eyebrow: 'SHRAMIK / FORECAST INTELLIGENCE',
  },
  'emerging-skills': {
    title: 'Emerging skills intelligence',
    subtitle: 'The canonical skill catalogue and supporting data coverage, with published emerging-skill signals shown only when they exist in the database.',
    eyebrow: 'SHRAMIK / SKILL SIGNALS',
  },
  'scenario-simulator': {
    title: 'Scenario simulator readiness',
    subtitle: 'Review the real training-capacity baseline and whether validated forecast outputs are available before running an intervention scenario.',
    eyebrow: 'SHRAMIK / POLICY SCENARIOS',
  },
  reports: {
    title: 'Reports & evidence catalogue',
    subtitle: 'Explore registered source material and the source-backed metrics currently available for reporting. This view does not claim a report has been generated when no stored report exists.',
    eyebrow: 'SHRAMIK / REPORTS & EVIDENCE',
  },
  'data-quality': {
    title: 'Data quality & coverage',
    subtitle: 'Live database inventory, source coverage, metric provenance and reporting periods. Counts reflect rows readable through SHRAMIK’s public, source-backed data interface.',
    eyebrow: 'SHRAMIK / DATA QUALITY',
  },
};

function numeric(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function numberFormat(value: number, compact = false): string {
  return new Intl.NumberFormat('en-IN', compact
    ? { notation: 'compact', maximumFractionDigits: 1 }
    : { maximumFractionDigits: 1 }).format(value);
}
function metricLabel(code: string): string {
  const labels: Record<string, string> = {
    UR: 'Unemployment rate',
    LFPR: 'Labour force participation rate',
    WPR: 'Worker population ratio',
    CWS_UR: 'Current weekly status unemployment rate',
    CWS_LFPR: 'Current weekly status labour force participation',
    CWS_WPR: 'Current weekly status worker population ratio',
    CTS_ITI_COUNT: 'Industrial Training Institutes',
    CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE: 'Provisional CTS seat capacity',
    ESHRAM_REGISTRATION_COUNT: 'e-Shram registrations',
    PMKVY_TRAINING_CENTRE_COUNT: 'PMKVY training centres',
    JSS_TRAINING_CENTRE_COUNT: 'Jan Shikshan Sansthan centres',
    NAPS_ESTABLISHMENT_COUNT: 'NAPS establishments',
    SPACE_GEOSPATIAL_NAPS_APPRENTICES_ENGAGED: 'Apprentices engaged (NAPS)',
    SPACE_GEOSPATIAL_PMKVY_TRAINED_ORIENTED: 'PMKVY trained/oriented',
  };
  return labels[code] || code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function periodLabel(value: string): string {
  return value
    .replace('AS_OF_', 'As of ')
    .replace('ACADEMIC_SESSION_', 'Academic session ')
    .replace('CY', 'Calendar year ')
    .replace('FY', 'Financial year ');
}
function dimensionLabel(row: MetricRow): string {
  const d = row.dimension_values || {};
  const state = textValue(d.state_ut_source_label);
  if (state) return state;
  const sex = textValue(d.sex);
  const area = textValue(d.area);
  const age = textValue(d.age_domain);
  const labels = [sex, area, age].filter(Boolean);
  return labels.length ? labels.join(' · ') : (row.observation_grain === 'NATIONAL' ? 'India (national)' : row.state_id || row.observation_grain);
}
function textValue(v: unknown): string {
  return typeof v === 'string' || typeof v === 'number' ? String(v) : '';
}
function isCanonicalPersonRate(row: MetricRow): boolean {
  const d = row.dimension_values || {};
  // This detail page uses the published PLFS 15+ age-domain benchmark. The
  // public landing/dashboard cards separately show all-ages context, so keep
  // the age universe explicit wherever these values are displayed.
  return d.sex === 'person' && d.area === 'combined' && d.age_domain === '15_plus';
}
function sourceFor(snapshot: Snapshot, sourceId: string | null): SourceRow | undefined {
  return sourceId ? snapshot.sources.find(source => source.id === sourceId) : undefined;
}
function stateLabel(snapshot: Snapshot, row: MetricRow): string {
  const d = row.dimension_values || {};
  const fromSource = textValue(d.state_ut_source_label);
  if (fromSource) return fromSource;
  return snapshot.states.find(state => state.id === row.state_id)?.name || row.state_id || 'India (national)';
}
function selectedStateId(snapshot: Snapshot, code: string): string | null {
  if (!code || code === 'IN') return null;
  return snapshot.states.find(state => state.code === code || state.id === code || state.id === 'IN-' + code)?.id || (code.startsWith('IN-') ? code : 'IN-' + code);
}
function canonicalRate(snapshot: Snapshot, code: string, regionCode: string): MetricRow | undefined {
  const rows = snapshot.metrics.filter(row => row.metric_code === code && row.reference_period === 'CY2025' && isCanonicalPersonRate(row));
  if (regionCode !== 'IN') {
    const regional = rows.find(row => row.state_id === selectedStateId(snapshot, regionCode));
    if (regional) return regional;
  }
  return rows.find(row => !row.state_id || row.observation_grain === 'NATIONAL');
}
function mostRecentRows(snapshot: Snapshot, code: string, regionCode = 'IN'): MetricRow[] {
  let rows = snapshot.metrics.filter(row => row.metric_code === code);
  if (!rows.length) return [];
  const mostRecent = rows.map(row => row.reference_period).sort().at(-1);
  rows = rows.filter(row => row.reference_period === mostRecent);
  if (regionCode !== 'IN') {
    const id = selectedStateId(snapshot, regionCode);
    const regional = rows.filter(row => row.state_id === id);
    if (regional.length) return regional;
    return rows.filter(row => !row.state_id || row.observation_grain === 'NATIONAL');
  }
  return rows;
}
function indiaFeaturePath(feature: IndiaFeature, width = 260, height = 260): string {
  const polygons: GeoPolygon[] = feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
  const project = ([longitude, latitude]: GeoPosition) => [
    ((longitude - 68) / (98 - 68)) * width,
    ((38.5 - latitude) / (38.5 - 5)) * height,
  ] as const;
  return polygons.map(polygon => polygon.map(ring => ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ') + ' Z').join(' ')).join(' ');
}
function registrationColor(value: number, maxValue: number): string {
  const ratio = maxValue > 0 ? value / maxValue : 0;
  if (ratio >= 0.75) return '#b94a0e';
  if (ratio >= 0.5) return '#dc7117';
  if (ratio >= 0.25) return '#f2a83d';
  if (ratio > 0) return '#f8d783';
  return '#f3ead0';
}
function compactPeriodLabel(period: string): string {
  return period.replace('FY', '').replace('-', '–');
}

function stateTotals(snapshot: Snapshot, rows: MetricRow[]): Array<{ id: string; label: string; value: number; unit: string; period: string; sourceId: string | null }> {
  const grouped = new Map<string, { value: number; unit: string; period: string; sourceId: string | null }>();
  rows.forEach(row => {
    const key = row.state_id || 'NATIONAL';
    const previous = grouped.get(key) || { value: 0, unit: row.unit, period: row.reference_period, sourceId: row.source_id };
    previous.value += numeric(row.value_numeric);
    if (row.reference_period > previous.period) previous.period = row.reference_period;
    if (!previous.sourceId) previous.sourceId = row.source_id;
    grouped.set(key, previous);
  });
  return [...grouped.entries()].map(([id, v]) => ({
    id,
    label: id === 'NATIONAL' ? 'India (national)' : (snapshot.states.find(s => s.id === id)?.name || (rows.find(r => r.state_id === id) ? stateLabel(snapshot, rows.find(r => r.state_id === id) as MetricRow) : id)),
    value: v.value,
    unit: v.unit,
    period: v.period,
    sourceId: v.sourceId,
  })).sort((a, b) => b.value - a.value);
}
async function getRows<T>(table: string, query: Record<string, string>): Promise<T[]> {
  const params = new URLSearchParams({ table, ...query });
  const response = await fetch('/api/shramik-data?' + params.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string; details?: string } | null;
    throw new Error(body?.message || body?.details || 'Supabase read failed for ' + table + ' (' + response.status + ').');
  }
  const result = await response.json().catch(() => null) as unknown;
  if (!Array.isArray(result)) throw new Error('Supabase response for ' + table + ' was not a row list.');
  return result as T[];
}
async function getAllSourceMetrics(): Promise<MetricRow[]> {
  const all: MetricRow[] = [];
  for (let offset = 0; offset < 10000; offset += LIMIT) {
    const rows = await getRows<MetricRow>('source_metric_observations', {
      select: 'id,source_id,metric_code,value_numeric,unit,observation_grain,state_id,reference_period,as_of_date,dimension_values,provenance_state,is_synthetic',
      provenance_state: 'eq.SOURCE_BACKED',
      is_synthetic: 'eq.false',
      order: 'metric_code.asc,reference_period.asc,state_id.asc,id.asc',
      limit: String(LIMIT),
      offset: String(offset),
    });
    all.push(...rows);
    if (rows.length < LIMIT) break;
  }
  return all;
}
// These analytical output tables are intentionally excluded from the browser-facing
// public data proxy. Do not probe them from the client: that creates avoidable 400s
// on every module load, and a failed public read cannot establish whether a table is
// empty. A future authenticated server endpoint can replace this declared state.
function publicOutputVisibility(): Record<string, TableVisibility> {
  const tableNames = [
    'demand_observations', 'supply_observations', 'forecast_results',
    'model_versions', 'emerging_skill_signals', 'early_warnings',
  ];
  return Object.fromEntries(tableNames.map(table => [table, {
    state: 'RESTRICTED' as const,
    sampleRows: 0,
  }]));
}
async function loadSnapshot(): Promise<Snapshot> {
  const warnings: string[] = [];
  const metricRows = await getAllSourceMetrics();
  const names = [
    ['states', getRows<StateRow>('states', { select: 'id,name,code', order: 'name.asc', limit: '1000' })],
    ['districts', getRows<DistrictRow>('districts', { select: 'id,state_id,name', order: 'name.asc', limit: '1000' })],
    ['sectors', getRows<SectorRow>('sectors', { select: 'id,code,name,description', order: 'name.asc', limit: '1000' })],
    ['skills', getRows<SkillRow>('skills', { select: 'id,code,name,sector_id,sector_mapping_method,sector_mapping_confidence,description', order: 'name.asc', limit: '1000' })],
    ['sources', getRows<SourceRow>('data_sources', { select: 'id,name,publisher,source_type,url,publication_date,accessed_at,coverage_start,coverage_end,notes', order: 'name.asc', limit: '1000' })],
  ] as const;
  const referenceResults = await Promise.all(names.map(async ([name, promise]) => {
    try { return { name, rows: await promise, error: '' }; }
    catch (error) { return { name, rows: [], error: error instanceof Error ? error.message : 'Read failed' }; }
  }));
  const refs: Record<string, unknown[]> = {};
  referenceResults.forEach(result => {
    refs[result.name] = result.rows;
    if (result.error) warnings.push(result.name + ': ' + result.error);
  });
  const outputs = publicOutputVisibility();
  return {
    metrics: metricRows,
    states: (refs.states || []) as StateRow[],
    districts: (refs.districts || []) as DistrictRow[],
    sectors: (refs.sectors || []) as SectorRow[],
    skills: (refs.skills || []) as SkillRow[],
    sources: (refs.sources || []) as SourceRow[],
    outputs,
    warnings,
    loadedAt: new Date().toISOString(),
  };
}

function KpiCard({ label, value, unit, note, icon }: { label: string; value: string; unit?: string; note?: string; icon?: 'activity' | 'training' | 'database' | 'people' }) {
  const Icon = icon === 'training' ? GraduationCap : icon === 'people' ? Users : icon === 'database' ? Database : Activity;
  return <article className="dbi-kpi">
    <div className="dbi-kpi-top"><span>{label}</span><Icon size={17} strokeWidth={1.7}/></div>
    <div className="dbi-kpi-value">{value}{unit ? <small>{unit}</small> : null}</div>
    {note ? <div className="dbi-kpi-note">{note}</div> : null}
  </article>;
}
function Provenance({ label = 'SOURCE_BACKED' }: { label?: string }) {
  return <span className="dbi-provenance"><ShieldCheck size={12}/>{label.replace(/_/g, ' ')}</span>;
}
function SectionHead({ title, note }: { title: string; note?: string }) {
  return <div className="dbi-section-head"><div><h2>{title}</h2>{note ? <p>{note}</p> : null}</div></div>;
}
function SourceLink({ source }: { source?: SourceRow }) {
  if (!source?.url) return <span className="dbi-source-plain">{source?.name || 'Source registered; URL not available'}</span>;
  return <a className="dbi-source-link" href={source.url} target="_blank" rel="noreferrer">{source.name}<ArrowUpRight size={13}/></a>;
}
function DataTable({ columns, children, empty = 'No matching source-backed rows are available.' }: { columns: string[]; children: ReactNode; empty?: string }) {
  const rows = Children.toArray(children);
  return <div className="dbi-table-wrap"><table className="dbi-table"><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.length ? rows : <tr><td colSpan={columns.length} className="dbi-empty-cell">{empty}</td></tr>}</tbody></table></div>;
}
function contextRates(snapshot: Snapshot, regionCode: string): MetricRow[] {
  return ['UR', 'LFPR', 'WPR'].map(code => canonicalRate(snapshot, code, regionCode)).filter((row): row is MetricRow => Boolean(row));
}
function seatsByState(snapshot: Snapshot): ReturnType<typeof stateTotals> {
  return stateTotals(snapshot, snapshot.metrics.filter(row =>
    row.metric_code === 'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE' && row.reference_period === 'ACADEMIC_SESSION_2026'));
}
function selectedTotals(snapshot: Snapshot, rows: ReturnType<typeof stateTotals>, regionCode: string): number {
  if (regionCode === 'IN') return rows.reduce((sum, row) => sum + row.value, 0);
  const stateId = selectedStateId(snapshot, regionCode);
  return rows.find(row => row.id === stateId)?.value || 0;
}
function metricCountByCode(snapshot: Snapshot): Array<{ code: string; count: number; unit: string; period: string; states: number; sources: number }> {
  const groups = new Map<string, MetricRow[]>();
  snapshot.metrics.forEach(row => {
    if (!groups.has(row.metric_code)) groups.set(row.metric_code, []);
    groups.get(row.metric_code)?.push(row);
  });
  return [...groups.entries()].map(([code, rows]) => ({
    code,
    count: rows.length,
    unit: rows[0]?.unit || '—',
    period: rows.map(row => row.reference_period).sort().at(-1) || '—',
    states: new Set(rows.map(row => row.state_id).filter(Boolean)).size,
    sources: new Set(rows.map(row => row.source_id).filter(Boolean)).size,
  })).sort((a, b) => b.count - a.count);
}
function preferRowsForScope(rows: MetricRow[], regionCode: string): MetricRow[] {
  if (regionCode !== 'IN') return rows;
  const national = rows.filter(row => !row.state_id || row.observation_grain === 'NATIONAL');
  return national.length ? national : rows;
}

function metricCoverageLabel(snapshot: Snapshot, rows: MetricRow[], regionCode: string): string {
  if (!rows.length) return regionCode === 'IN' ? 'No published rows' : 'No published value for selected region';
  if (regionCode === 'IN') return rows.some(row => !row.state_id || row.observation_grain === 'NATIONAL') ? 'India (national snapshot)' : 'Published state / UT rows';
  const stateId = selectedStateId(snapshot, regionCode);
  if (rows.some(row => row.state_id === stateId)) return snapshot.states.find(state => state.id === stateId)?.name || regionCode;
  if (rows.some(row => !row.state_id || row.observation_grain === 'NATIONAL')) return 'India (national fallback)';
  return 'No published value for selected region';
}

function statusCount(snapshot: Snapshot, table: string): string {
  const entry = snapshot.outputs[table];
  if (!entry) return 'Checking';
  if (entry.state === 'RESTRICTED') return 'Restricted';
  if (entry.state === 'NO_PUBLIC_ROWS') return '0 visible';
  return 'Available';
}

export default function DatabaseInsightsPage({ module, regionCode = 'IN', onNavigate, onRegionChange, onPreviewDemo }: {
  module: DatabaseModule;
  regionCode?: string;
  onNavigate?: (route: string) => void;
  onRegionChange?: (value: string) => void;
  onPreviewDemo?: () => void;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [indiaMap, setIndiaMap] = useState<IndiaFeatureCollection | null>(null);
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [occupationScope, setOccupationScope] = useState('EXAMPLES');
  const [regionSort, setRegionSort] = useState<'registrations' | 'name'>('registrations');
  const [periodFilter, setPeriodFilter] = useState('LATEST');
  const page = TITLES[module];

  useEffect(() => {
    if (module === 'demand') window.scrollTo({ top: 0, behavior: 'auto' });
  }, [module]);

  useEffect(() => {
    if (module !== 'demand') return;
    let active = true;
    fetch('/assets/india-states.geojson', { headers: { Accept: 'application/geo+json, application/json' } })
      .then(response => {
        if (!response.ok) throw new Error('Map boundaries are not available.');
        return response.json() as Promise<IndiaFeatureCollection>;
      })
      .then(data => { if (active && data?.type === 'FeatureCollection' && Array.isArray(data.features)) setIndiaMap(data); })
      .catch(() => { if (active) setIndiaMap(null); });
    return () => { active = false; };
  }, [module]);

  useEffect(() => {
    let active = true;
    setError('');
    loadSnapshot().then(result => {
      if (active) setSnapshot(result);
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not read the SHRAMIK database.');
    });
    return () => { active = false; };
  }, []);

  const stateSeats = useMemo(() => snapshot ? seatsByState(snapshot) : [], [snapshot]);
  const visibleStateSeats = useMemo(() => {
    if (!snapshot || regionCode === 'IN') return stateSeats;
    const id = selectedStateId(snapshot, regionCode);
    return stateSeats.filter(row => row.id === id);
  }, [snapshot, stateSeats, regionCode]);
  const rateRows = useMemo(() => snapshot ? contextRates(snapshot, regionCode) : [], [snapshot, regionCode]);
  const metricInventory = useMemo(() => snapshot ? metricCountByCode(snapshot) : [], [snapshot]);
  const filteredSources = useMemo(() => {
    if (!snapshot) return [];
    const needle = query.trim().toLocaleLowerCase();
    return snapshot.sources.filter(source => !needle || [source.name, source.publisher, source.source_type].join(' ').toLocaleLowerCase().includes(needle));
  }, [snapshot, query]);

  async function refresh() {
    setRefreshing(true);
    setError('');
    try {
      const result = await loadSnapshot();
      setSnapshot(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not refresh the SHRAMIK database snapshot.');
    } finally {
      setRefreshing(false);
    }
  }

  if (error && !snapshot) return <section className={module === 'demand' ? 'dbi-shell dbi-demand-reference' : 'dbi-shell'}>
    <div className="dbi-hero"><div><div className="dbi-eyebrow">{page.eyebrow}</div><h1>{page.title}</h1><p>{page.subtitle}</p></div></div>
    <div className="dbi-error" role="alert"><Info size={18}/><div><strong>Live database read failed.</strong><p>{error}</p><button type="button" onClick={() => void refresh()}>Retry database connection</button></div></div>
    {onPreviewDemo ? <button className="dbi-refresh dbi-demo-preview" type="button" onClick={onPreviewDemo}>Open synthetic demo preview</button> : null}
  </section>;

  if (!snapshot) return <section className={module === 'demand' ? 'dbi-shell dbi-demand-reference' : 'dbi-shell'}>
    <div className="dbi-hero"><div><div className="dbi-eyebrow">{page.eyebrow}</div><h1>{page.title}</h1><p>{page.subtitle}</p></div></div>
    <div className="dbi-loading"><RefreshCw size={18} className="dbi-spin"/> Reading live source-backed data from Supabase…</div>
    {onPreviewDemo ? <button className="dbi-refresh dbi-demo-preview" type="button" onClick={onPreviewDemo}>Open synthetic demo preview</button> : null}
  </section>;

  const rates = ['UR', 'LFPR', 'WPR'].map(code => {
    const item = canonicalRate(snapshot, code, regionCode);
    return { code, label: metricLabel(code), row: item };
  });
  const registrationRows = mostRecentRows(snapshot, 'ESHRAM_REGISTRATION_COUNT', regionCode);
  const registration = registrationRows.find(row => regionCode === 'IN' ? !row.state_id : row.state_id === selectedStateId(snapshot, regionCode))
    || registrationRows.find(row => !row.state_id)
    || registrationRows[0];
  const seatTotal = selectedTotals(snapshot, stateSeats, regionCode);
  const itiRows = preferRowsForScope(mostRecentRows(snapshot, 'CTS_ITI_COUNT', regionCode), regionCode);
  const itiTotal = itiRows.reduce((sum, row) => sum + numeric(row.value_numeric), 0);
  const itiCoverage = metricCoverageLabel(snapshot, itiRows, regionCode);
  const centreMetrics = ['PMKVY_TRAINING_CENTRE_COUNT', 'JSS_TRAINING_CENTRE_COUNT', 'NAPS_ESTABLISHMENT_COUNT'];
  const centreValues = centreMetrics.map(code => {
    const selected = preferRowsForScope(mostRecentRows(snapshot, code, regionCode), regionCode);
    return {
      code, rows: selected,
      total: selected.reduce((sum, row) => sum + numeric(row.value_numeric), 0),
      period: selected[0]?.reference_period || '—',
      coverage: metricCoverageLabel(snapshot, selected, regionCode),
    };
  });
  const apprenticeRows = preferRowsForScope(mostRecentRows(snapshot, 'SPACE_GEOSPATIAL_NAPS_APPRENTICES_ENGAGED', regionCode), regionCode);
  const apprenticeTotal = apprenticeRows.reduce((sum, row) => sum + numeric(row.value_numeric), 0);
  const apprenticeCoverage = metricCoverageLabel(snapshot, apprenticeRows, regionCode);
  const pmkvyTrainedRows = preferRowsForScope(mostRecentRows(snapshot, 'SPACE_GEOSPATIAL_PMKVY_TRAINED_ORIENTED', regionCode), regionCode);
  const pmkvyTrainedTotal = pmkvyTrainedRows.reduce((sum, row) => sum + numeric(row.value_numeric), 0);
  const pmkvyTrainedCoverage = metricCoverageLabel(snapshot, pmkvyTrainedRows, regionCode);
  const canonicalSkillCount = snapshot.skills.length;
  const sectorCount = snapshot.sectors.length;
  const sourceCount = snapshot.sources.length;
  const geographyCount = snapshot.states.length;
  const districtCount = snapshot.districts.length;
  const totalMetrics = snapshot.metrics.length;
  const forecastStatus = statusCount(snapshot, 'forecast_results');
  const demandStatus = statusCount(snapshot, 'demand_observations');
  const supplyStatus = statusCount(snapshot, 'supply_observations');
  const emergingStatus = statusCount(snapshot, 'emerging_skill_signals');
  const warningStatus = statusCount(snapshot, 'early_warnings');
  const modelStatus = statusCount(snapshot, 'model_versions');
  const forecastInputsRestricted = [forecastStatus, demandStatus, supplyStatus, warningStatus, modelStatus].includes('Restricted');
  const lowConfidenceSkillCount = snapshot.skills.filter(skill =>
    (skill.sector_mapping_confidence || '').toUpperCase() === 'LOW').length;
  const lowConfidenceManualMappingCount = snapshot.skills.filter(skill =>
    (skill.sector_mapping_confidence || '').toUpperCase() === 'LOW'
    && (skill.sector_mapping_method || '').toUpperCase() === 'MANUAL').length;
  const recentRates = rateRows.filter(row => row.metric_code === 'UR' || row.metric_code === 'LFPR' || row.metric_code === 'WPR');
  const stateRegistrations = snapshot.metrics.filter(row => row.metric_code === 'ESHRAM_REGISTRATION_COUNT' && row.observation_grain === 'STATE');
  const stateRegTotals = stateTotals(snapshot, stateRegistrations);
  const sectorsForSkill = (skill: SkillRow) => snapshot.sectors.find(sector => sector.id === skill.sector_id)?.name || 'Sector mapping unavailable';
  const seatSource = sourceFor(snapshot, snapshot.metrics.find(row => row.metric_code === 'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE')?.source_id || null);
  const employmentSource = sourceFor(snapshot, rates.find(value => value.row)?.row?.source_id || null);
  const registrationSource = sourceFor(snapshot, registration?.source_id || null);
  const inventory = metricInventory.filter(row => !query || metricLabel(row.code).toLocaleLowerCase().includes(query.toLocaleLowerCase()) || row.code.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const gapReason = demandStatus === 'Restricted' || supplyStatus === 'Restricted'
    ? 'The public data reader cannot inspect one or both of the demand/supply observation tables. A comparable demand/supply pair cannot be validated here, so the app does not calculate or display a numerical skill gap.'
    : demandStatus === '0 visible' && supplyStatus === '0 visible'
      ? 'The public database currently exposes no demand-observation or supply-observation rows for this view. The system therefore does not calculate or display a numerical skill gap.'
      : 'A skill gap is shown only when compatible demand and supply observations are available through the validated analytical contract.';

  if (module === 'demand') {
    const showPlfs = periodFilter === 'LATEST' || periodFilter === 'CY2025';
    const showRegistrations = periodFilter === 'LATEST' || periodFilter === 'ESHRAM';
    const showNaps = periodFilter === 'LATEST' || periodFilter.startsWith('FY');
    const rateValue = (code: string) => {
      const row = rates.find(item => item.code === code)?.row;
      if (!showPlfs || !row) return '—';
      return `${numberFormat(numeric(row.value_numeric))}${row.unit === 'percent' ? '%' : row.unit ? ` ${row.unit}` : ''}`;
    };
    const demandTableNote = 'The live database currently has no validated demand-observation rows. PLFS rates, e-Shram registrations and apprenticeship engagement are useful labour-market context, but none is relabelled as job demand.';
    const selectedId = selectedStateId(snapshot, regionCode);
    const sortedRegionRows = [...stateRegTotals]
      .filter(row => regionCode === 'IN' || row.id === selectedId)
      .sort((a, b) => regionSort === 'name' ? a.label.localeCompare(b.label) : b.value - a.value);
    const visibleSkills = snapshot.skills
      .filter(skill => sectorFilter === 'ALL' || skill.sector_id === sectorFilter)
      .filter(skill => skillFilter === 'ALL' || skill.id === skillFilter)
      .sort((a, b) => a.name.localeCompare(b.name));
    const napsByPeriod = new Map<string, number>();
    snapshot.metrics.forEach(row => {
      if (row.metric_code !== 'SPACE_GEOSPATIAL_NAPS_APPRENTICES_ENGAGED' || row.observation_grain !== 'STATE') return;
      if (regionCode !== 'IN' && row.state_id !== selectedId) return;
      napsByPeriod.set(row.reference_period, (napsByPeriod.get(row.reference_period) || 0) + numeric(row.value_numeric));
    });
    const napsTrend = [...napsByPeriod.entries()].map(([period, value]) => ({ period, value })).sort((a, b) => a.period.localeCompare(b.period));
    const trendMax = Math.max(1, ...napsTrend.map(point => point.value));
    const trendLinePoints = napsTrend.map((point, index) => {
      const x = napsTrend.length < 2 ? 260 : 38 + index * (444 / (napsTrend.length - 1));
      const y = 176 - (point.value / trendMax) * 126;
      return `${x},${y}`;
    }).join(' ');
    const currentStateName = regionCode === 'IN' ? 'All India' : (snapshot.states.find(state => state.code === regionCode || state.id === selectedId)?.name || regionCode);
    const maxRegistration = Math.max(1, ...stateRegTotals.map(row => row.value));
    const periodNote = periodFilter === 'LATEST' ? 'Latest available record from each source' : periodFilter === 'CY2025' ? 'PLFS benchmark period · CY2025' : periodFilter === 'ESHRAM' ? 'e-Shram snapshot · 14 July 2026' : `Apprenticeship context · ${periodFilter}`;
    const illustrativeOccupations = [
      'Retail Salespersons', 'Construction Labourers', 'Software Developers',
      'Drivers and Mobile Plant Operators', 'Teaching Professionals',
    ];
    return <section className="dbi-shell dbi-demand-reference">
      <header className="dbi-demand-hero">
        <div className="dbi-demand-hero-copy">
          <div className="dbi-demand-breadcrumb"><span>Home</span><span aria-hidden="true">›</span><strong>Demand Insights</strong></div>
          <h1>Demand Insights</h1>
          <p>Explore labour-market evidence across India. Published workforce indicators are shown alongside a clear status for validated job-demand analytics.</p>
          <div className="dbi-demand-meta"><span><ShieldCheck size={13}/> Source-backed, non-synthetic records</span><span><Database size={13}/>{numberFormat(totalMetrics)} metric rows loaded</span><span>Updated {new Date(snapshot.loadedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
        </div>
        <div className="dbi-demand-callout" title={demandTableNote}>
          <span className="dbi-demand-callout-icon"><Activity size={25}/></span>
          <div><small>Total Estimated Demand</small><strong>Not published</strong><span>No validated estimate published from the current demand data</span></div>
        </div>
        <div className="dbi-demand-hero-art" aria-hidden="true"><img src="/assets/industrial-skyline.png" alt=""/><div>DATA<br/>INSIGHTS<br/>PLANNING<br/>OPPORTUNITIES</div></div>
        {onPreviewDemo ? <button className="dbi-demand-demo-launch" type="button" onClick={onPreviewDemo}>Open illustrative demo <ArrowUpRight size={14}/></button> : null}
      </header>

      <section className="dbi-demand-filters" aria-label="Demand insights filters">
        <label className="dbi-demand-filter"><span>Time Period</span><select value={periodFilter} onChange={event => setPeriodFilter(event.target.value)}><option value="LATEST">Latest per source</option><option value="CY2025">Calendar year 2025 · PLFS</option><option value="ESHRAM">14 July 2026 · e-Shram</option><option value="FY2023-24">FY 2023–24 · NAPS</option><option value="FY2024-25">FY 2024–25 · NAPS</option><option value="FY2025-26">FY 2025–26 · NAPS</option></select></label>
        <label className="dbi-demand-filter"><span>Geography</span><select value={regionCode === 'IN' ? 'national' : 'state'} onChange={event => { if (event.target.value === 'national') onRegionChange?.('IN'); else if (regionCode === 'IN') onRegionChange?.(snapshot.states.find(state => state.code === 'OD')?.code || snapshot.states[0]?.code || 'IN'); }}><option value="national">All India</option><option value="state">State / UT</option></select></label>
        <label className="dbi-demand-filter"><span>State / UT</span><select value={regionCode} onChange={event => onRegionChange?.(event.target.value)}><option value="IN">All States</option>{snapshot.states.slice().sort((a, b) => a.name.localeCompare(b.name)).map(state => <option key={state.id} value={state.code}>{state.name}</option>)}</select></label>
        <label className="dbi-demand-filter"><span>Sector</span><select value={sectorFilter} onChange={event => { setSectorFilter(event.target.value); setSkillFilter('ALL'); }}><option value="ALL">All Sectors</option>{snapshot.sectors.slice().sort((a, b) => a.name.localeCompare(b.name)).map(sector => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></label>
        <label className="dbi-demand-filter"><span>Occupation (NCO)</span><select value={occupationScope} onChange={event => { setOccupationScope(event.target.value); if (event.target.value === 'DEMO') onPreviewDemo?.(); }}><option value="LIVE">Live ranking · unavailable</option><option value="EXAMPLES">Illustrative role examples</option><option value="DEMO">Open illustrative demo…</option></select></label>
        <label className="dbi-demand-filter"><span>Skill</span><select value={skillFilter} onChange={event => setSkillFilter(event.target.value)}><option value="ALL">All Skills</option>{snapshot.skills.filter(skill => sectorFilter === 'ALL' || skill.sector_id === sectorFilter).slice().sort((a, b) => a.name.localeCompare(b.name)).map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label>
        <button className="dbi-demand-refresh" type="button" disabled={refreshing} onClick={() => void refresh()}><RefreshCw size={14} className={refreshing ? 'dbi-spin' : ''}/>{refreshing ? 'Refreshing' : 'Refresh data'}</button>
      </section>
      <div className="dbi-demand-filter-status" role="status"><Info size={14}/><span>{periodNote}. Region selection updates the national/state context; sector and skill selections filter the canonical skill catalogue. These filters cannot create job-demand estimates where no demand observations exist.</span></div>

      <section className="dbi-demand-kpis" aria-label="Published labour-market indicators">
        <article className="dbi-demand-kpi dbi-demand-kpi-blue"><span className="dbi-demand-kpi-icon"><Activity size={23}/></span><div><small>Unemployment Rate</small><strong>{rateValue('UR')}</strong><span>{showPlfs ? 'Persons aged 15+ · PLFS CY2025' : 'Select Calendar year 2025 to view PLFS'}</span></div></article>
        <article className="dbi-demand-kpi dbi-demand-kpi-orange"><span className="dbi-demand-kpi-icon"><Users size={23}/></span><div><small>Labour Force Participation</small><strong>{rateValue('LFPR')}</strong><span>{showPlfs ? 'Persons aged 15+ · PLFS CY2025' : 'Select Calendar year 2025 to view PLFS'}</span></div></article>
        <article className="dbi-demand-kpi dbi-demand-kpi-teal"><span className="dbi-demand-kpi-icon"><GraduationCap size={23}/></span><div><small>Worker Population Ratio</small><strong>{rateValue('WPR')}</strong><span>{showPlfs ? 'Persons aged 15+ · PLFS CY2025' : 'Select Calendar year 2025 to view PLFS'}</span></div></article>
        <article className="dbi-demand-kpi dbi-demand-kpi-yellow"><span className="dbi-demand-kpi-icon"><Users size={23}/></span><div><small>e-Shram Registrations</small><strong>{showRegistrations && registration ? numberFormat(numeric(registration.value_numeric), true) : '—'}</strong><span>{showRegistrations && registration ? `${periodLabel(registration.reference_period)} · registrations, not job demand` : 'Select the e-Shram snapshot to view this measure'}</span></div></article>
      </section>

      <div className="dbi-demand-middle">
        <section className="dbi-demand-panel dbi-demand-trend" aria-labelledby="dbi-demand-trend-title">
          <div className="dbi-demand-panel-head"><div><h2 id="dbi-demand-trend-title">Demand Trend</h2><p>Job-demand series is not published; related source-backed context is shown below</p></div><span className="dbi-demand-tag dbi-demand-tag-warn">No demand rows</span></div>
          {showNaps ? <div className="dbi-demand-trend-content">
            <div className="dbi-demand-trend-caption"><strong>Apprentices engaged (NAPS)</strong><span>Related labour-market context · not job demand · {currentStateName}</span></div>
            <svg className="dbi-demand-trend-svg" viewBox="0 0 520 220" role="img" aria-label={`Source-backed apprenticeship engagement context for ${currentStateName}`}>
              {[0,1,2,3].map(index => <line key={index} x1="30" x2="495" y1={28 + index * 42} y2={28 + index * 42} stroke="#e8e4d9" strokeWidth="1"/>)}
              <line x1="30" x2="495" y1="184" y2="184" stroke="#c9c4b7" strokeWidth="1"/>
              <polyline points={trendLinePoints} fill="none" stroke="#174d80" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
              {napsTrend.map((point, index) => { const x = napsTrend.length < 2 ? 260 : 38 + index * (444 / (napsTrend.length - 1)); const y = 176 - (point.value / trendMax) * 126; const active = periodFilter === point.period; return <g key={point.period}><circle cx={x} cy={y} r={active ? 6 : 4.5} fill={active ? '#f2c93d' : '#174d80'} stroke="#fffefa" strokeWidth="2"><title>{periodLabel(point.period)}: {numberFormat(point.value)} apprentices engaged</title></circle><text x={x} y={Math.max(17, y - 12)} textAnchor="middle" className="dbi-demand-chart-value">{numberFormat(point.value, true)}</text><text x={x} y="204" textAnchor="middle" className="dbi-demand-chart-label">{compactPeriodLabel(point.period)}</text></g>; })}
            </svg>
            <p className="dbi-demand-chart-note"><Info size={13}/> The NAPS series sums state/UT apprentice-engagement counts for the selected geography. It is a training-program indicator, not a proxy for vacancies or estimated demand.</p>
          </div> : <div className="dbi-demand-no-period"><strong>No NAPS series for this period selection</strong><p>Choose “Latest per source” or one of the NAPS financial years to view the published apprenticeship context trend.</p></div>}
          <div className="dbi-demand-legend"><span><i className="dbi-demand-legend-dot"/> Published NAPS counts</span><span><i className="dbi-demand-legend-dash"/> No validated demand forecast available</span></div>
        </section>

        <section className="dbi-demand-panel dbi-demand-region" aria-labelledby="dbi-demand-region-title">
          <div className="dbi-demand-panel-head"><div><h2 id="dbi-demand-region-title">Regional Labour-Market Context</h2><p>e-Shram registrations by State / UT · not job demand</p></div><span className="dbi-demand-tag">{showRegistrations ? '36 state / UT rows' : 'Choose e-Shram period'}</span></div>
          {showRegistrations ? <div className="dbi-demand-region-body">
            <div className="dbi-demand-map-placeholder dbi-demand-live-map">
              {indiaMap ? <svg viewBox="0 0 260 260" role="img" aria-label="India state map coloured by e-Shram registrations. Select a state to filter the page." className="dbi-demand-india-map">
                {indiaMap.features.map(feature => {
                  const code = feature.properties.code.split('-').pop() || '';
                  const state = snapshot.states.find(item => item.code === code || item.id === feature.properties.code);
                  const row = state ? stateRegTotals.find(item => item.id === state.id) : undefined;
                  const selected = regionCode !== 'IN' && state?.id === selectedId;
                  return <path key={feature.properties.code} d={indiaFeaturePath(feature)} fill={registrationColor(row?.value || 0, maxRegistration)} stroke={selected ? '#171717' : '#fffefa'} strokeWidth={selected ? 1.6 : .65} role={state ? 'button' : undefined} tabIndex={state ? 0 : -1} aria-label={state ? `${state.name}: ${row ? numberFormat(row.value, true) + ' registrations' : 'no registration record'}` : feature.properties.name} onClick={() => state && onRegionChange?.(state.code)} onKeyDown={event => { if (state && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onRegionChange?.(state.code); } }}><title>{feature.properties.name}: {row ? numberFormat(row.value, true) + ' registrations' : 'No published registration record'}</title></path>;
                })}
              </svg> : <div className="dbi-demand-map-loading"><MapPin size={26}/><span>Loading official state boundaries…</span></div>}
              <span>Click a state to filter</span><small>Colour = registration count. This is not a demand heatmap.</small>
            </div>
            <div className="dbi-demand-region-table"><div className="dbi-demand-region-table-head"><div className="dbi-demand-table-title">Worker registrations <small>Snapshot: 14 July 2026</small></div><label className="dbi-demand-sort"><span>Sort</span><select value={regionSort} onChange={event => setRegionSort(event.target.value as 'registrations' | 'name')}><option value="registrations">Most registrations</option><option value="name">State name A–Z</option></select></label></div>
              {sortedRegionRows.slice(0, 6).map((row, index) => <div className="dbi-demand-region-row" key={row.id}><span>{regionCode === 'IN' ? index + 1 : '•'}</span><strong>{row.label}</strong><b>{numberFormat(row.value, true)}</b><div className="dbi-demand-bar"><i style={{ width: `${Math.max(5, Math.min(100, row.value / maxRegistration * 100))}%` }}/></div></div>)}
              {!sortedRegionRows.length ? <p className="dbi-demand-empty-small">No state-level registrations were published for this selection.</p> : null}
            </div>
          </div> : <div className="dbi-demand-no-period"><strong>e-Shram registrations are from 14 July 2026</strong><p>Choose “Latest per source” or “e-Shram snapshot” to view regional registration context.</p></div>}
          <div className="dbi-demand-panel-foot">e-Shram counts represent cumulative worker registrations, not employment, vacancies or available labour supply.</div>
        </section>
      </div>

      <div className="dbi-demand-bottom">
        <section className="dbi-demand-panel dbi-demand-ranking"><div className="dbi-demand-panel-head"><div><h2>{occupationScope === 'EXAMPLES' ? 'Occupation Explorer' : 'Top Occupations by Demand'}</h2><p>{occupationScope === 'EXAMPLES' ? 'Illustrative NCO-style role examples · not ranked by demand' : 'NCO-2015 taxonomy is staged; demand ranking requires validated occupation-linked observations'}</p></div><span className="dbi-demand-tag dbi-demand-tag-warn">No demand rows</span></div>
          {occupationScope === 'EXAMPLES' ? <div className="dbi-demand-occupation-examples"><div className="dbi-demand-demo-note"><Info size={14}/> Illustrative role examples only. These are not a ranked list and have no live demand values.</div>{illustrativeOccupations.map((occupation, index) => <div className="dbi-demand-occupation-row" key={occupation}><span>{index + 1}</span><strong>{occupation}</strong><em>Illustrative</em></div>)}</div> : <div className="dbi-demand-empty-ranking"><span className="dbi-demand-empty-icon"><FileCheck2 size={22}/></span><strong>Occupation rankings are not published</strong><p>The database has 3,451 current NCO-2015 occupation records in a protected staging table, but the public reader cannot browse that catalogue. More importantly, there are no demand-observation rows to rank occupations by job demand.</p><button type="button" onClick={() => setOccupationScope('EXAMPLES')}>Show illustrative role examples <ArrowUpRight size={13}/></button></div>}
        </section>
        <section className="dbi-demand-panel dbi-demand-ranking"><div className="dbi-demand-panel-head"><div><h2>Skills Explorer</h2><p>Canonical skills available in the database · no demand ranking published</p></div><span className="dbi-demand-tag">{visibleSkills.length} skills</span></div>
          {visibleSkills.length ? <div className="dbi-demand-skill-list">{visibleSkills.map((skill, index) => <div className="dbi-demand-skill-row" key={skill.id}><span>{index + 1}</span><div><strong>{skill.name}</strong><small>{sectorsForSkill(skill)}</small></div><em data-confidence={(skill.sector_mapping_confidence || 'LOW').toUpperCase()}>{(skill.sector_mapping_confidence || 'LOW').toUpperCase()} mapping</em></div>)}</div> : <div className="dbi-demand-empty-ranking"><strong>No canonical skills match this filter</strong><p>Choose another sector or skill to reset the catalogue filter.</p><button type="button" onClick={() => { setSectorFilter('ALL'); setSkillFilter('ALL'); }}>Reset catalogue filters</button></div>}
          <p className="dbi-demand-chart-note"><Info size={13}/> These are canonical taxonomy records, not a demand ranking. Numeric skill-demand indices will appear only when linked observations are published.</p>
        </section>
        <section className="dbi-demand-panel dbi-demand-insights"><div className="dbi-demand-panel-head"><div><h2>Demand Insights</h2><p>Evidence-led interpretation</p></div><span className="dbi-demand-insight-mark"><Info size={18}/></span></div>
          <ul><li><strong>{numberFormat(totalMetrics)} source-backed metric rows</strong> are readable in this snapshot.</li><li>PLFS rates describe labour-market context, not job-posting demand.</li><li>e-Shram counts measure registrations, not available workers or vacancies.</li><li>NAPS apprenticeship engagement provides related programme context, not a vacancy trend.</li><li>Forecasts and regional occupation/skill rankings remain unavailable until compatible demand observations are published.</li></ul>
          {onPreviewDemo ? <button className="dbi-demand-preview" type="button" onClick={onPreviewDemo}>Open illustrative demo <ArrowUpRight size={14}/></button> : null}
        </section>
      </div>

      <details className="dbi-demand-evidence"><summary>Published source evidence and definitions</summary><div className="dbi-demand-evidence-grid">
        <section className="dbi-demand-panel"><SectionHead title="PLFS 2025 benchmarks · age 15+" note="Published annual rates for persons aged 15+, combined rural/urban. A selected-region value is shown only when published for this exact age/sex/area slice; otherwise the row is explicitly labelled India (national)."/><DataTable columns={['Indicator', 'Published value', 'Period', 'Geography', 'Source']}>
          {rates.map(({ code, label, row }) => row ? <tr key={code}><td><strong>{label}</strong><small>{code}</small></td><td className="dbi-number">{numberFormat(numeric(row.value_numeric))}{row.unit === 'percent' ? '%' : ' ' + row.unit}</td><td>{periodLabel(row.reference_period)}</td><td>{row.state_id ? stateLabel(snapshot, row) : 'India (national)'}</td><td><SourceLink source={sourceFor(snapshot, row.source_id) || employmentSource}/></td></tr> : null)}
          {rates.every(item => !item.row) ? <tr><td colSpan={5} className="dbi-empty-cell">No canonical person-level PLFS slice is published for this region.</td></tr> : null}
        </DataTable></section>
        <section className="dbi-demand-panel"><SectionHead title="Worker-registration distribution" note="Cumulative e-Shram registrations are not job demand, employment or available labour supply."/><DataTable columns={['State / UT', 'Registrations', 'Reference', 'Source']}>
          {stateRegTotals.slice(0, 10).map(row => <tr key={row.id}><td><strong>{row.label}</strong></td><td className="dbi-number">{numberFormat(row.value, true)}</td><td>{periodLabel(row.period)}</td><td><SourceLink source={sourceFor(snapshot, row.sourceId) || registrationSource}/></td></tr>)}
        </DataTable></section>
      </div><div className="dbi-note"><Info size={17}/><div><strong>Interpretation boundary</strong><p>{demandTableNote} Published PLFS and registration context is kept separate from validated job-demand analytics.</p></div></div></details>
      <footer className="dbi-footer"><span><ShieldCheck size={14}/> Source-backed database view · Synthetic data excluded</span><span>{numberFormat(totalMetrics)} readable metric records · {numberFormat(districtCount)} district references</span><button type="button" onClick={() => onNavigate?.('data-sources')}>Open Data Sources <ArrowUpRight size={14}/></button></footer>
    </section>;
  }
  return <section className="dbi-shell">
    <header className="dbi-hero">
      <div className="dbi-hero-copy">
        <div className="dbi-eyebrow">{page.eyebrow}<span className="dbi-live-dot"/>LIVE SUPABASE</div>
        <h1>{page.title}</h1>
        <p>{page.subtitle}</p>
        <div className="dbi-hero-meta"><span><ShieldCheck size={13}/> Source-backed, non-synthetic records</span><span><Database size={13}/>{numberFormat(totalMetrics)} metric rows loaded</span><span>Updated {new Date(snapshot.loadedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
      </div>
      <div className="dbi-hero-actions">
        <div className="dbi-source-count"><span>Registered sources</span><strong>{numberFormat(sourceCount)}</strong><small>{numberFormat(geographyCount)} states / UTs</small></div>
        <button className="dbi-refresh" type="button" onClick={() => void refresh()} disabled={refreshing}><RefreshCw size={15} className={refreshing ? 'dbi-spin' : ''}/>{refreshing ? 'Refreshing' : 'Refresh data'}</button>
        {onPreviewDemo ? <button className="dbi-refresh dbi-demo-preview" type="button" onClick={onPreviewDemo}>Open synthetic demo preview</button> : null}
      </div>
    </header>

    {error ? <div className="dbi-inline-warning" role="status"><Info size={16}/>{error}</div> : null}
    {snapshot.warnings.length > 0 ? <div className="dbi-inline-warning"><Info size={16}/>Some reference tables could not be read; displayed values are limited to the sources that loaded successfully.</div> : null}

    <div className="dbi-kpi-grid">
      {module === 'supply' ? <>
        <KpiCard label="Provisional CTS seat capacity" value={visibleStateSeats.length ? numberFormat(seatTotal, true) : '—'} note={visibleStateSeats.length ? (regionCode === 'IN' ? 'Academic session 2026 · seats, not completions' : 'Selected region · academic session 2026') : 'No published seat-capacity value for this region'} icon="training"/>
        <KpiCard label="CTS ITIs" value={itiRows.length ? numberFormat(itiTotal, true) : '—'} note={itiRows.length ? periodLabel(itiRows[0].reference_period) + ' · ' + itiCoverage : 'No published institute count for this region'} icon="database"/>
        <KpiCard label="Apprentices engaged" value={apprenticeRows.length ? numberFormat(apprenticeTotal, true) : '—'} note={apprenticeRows[0] ? periodLabel(apprenticeRows[0].reference_period) + ' · ' + apprenticeCoverage : 'No published apprenticeship value for this region'} icon="people"/>
        <KpiCard label="Training / apprenticeship metrics" value={numberFormat(centreValues.reduce((sum, row) => sum + (row.rows.length ? 1 : 0), 0))} note="PMKVY centres, JSS centres and NAPS establishments" icon="activity"/>
      </> : null}
      {module === 'skill-gaps' ? <>
        <KpiCard label="Canonical sectors" value={numberFormat(sectorCount)} note="Reference catalogue from Supabase" icon="database"/>
        <KpiCard label="Canonical skills" value={numberFormat(canonicalSkillCount)} note="Sector mapping metadata included" icon="training"/>
        <KpiCard label="Demand observations" value={demandStatus} note="Visible to the public data reader" icon="activity"/>
        <KpiCard label="Supply observations" value={supplyStatus} note="Visible to the public data reader" icon="activity"/>
      </> : null}
      {module === 'forecasts' ? <>
        <KpiCard label="Forecast results" value={forecastStatus} note="Persisted results visible to this app" icon="activity"/>
        <KpiCard label="Model versions" value={modelStatus} note="Registered model baselines visible to this app" icon="database"/>
        <KpiCard label="Early warnings" value={warningStatus} note="Published warning records visible to this app" icon="people"/>
        <KpiCard label="Historical source metrics" value={numberFormat(totalMetrics)} note="Context data, not future projections" icon="training"/>
      </> : null}
      {module === 'emerging-skills' ? <>
        <KpiCard label="Canonical skills" value={numberFormat(canonicalSkillCount)} note="Database reference catalogue" icon="training"/>
        <KpiCard label="Published skill signals" value={emergingStatus} note="Emerging/not-emerging signals visible to this app" icon="activity"/>
        <KpiCard label="Source-backed metrics" value={numberFormat(totalMetrics)} note="Published context for later signal calculation" icon="database"/>
        <KpiCard label="Reference sectors" value={numberFormat(sectorCount)} note="Canonical sector catalogue" icon="people"/>
      </> : null}
      {module === 'scenario-simulator' ? <>
        <KpiCard label="Provisional training seats" value={visibleStateSeats.length ? numberFormat(seatTotal, true) : '—'} note={visibleStateSeats.length ? 'Available baseline context, not a forecast' : 'No published capacity value; a scenario baseline is unavailable'} icon="training"/>
        <KpiCard label="Forecast baseline" value={forecastStatus} note="Required before a scenario can be computed" icon="activity"/>
        <KpiCard label="Canonical skills" value={numberFormat(canonicalSkillCount)} note="Scenario entity reference catalogue" icon="database"/>
        <KpiCard label="Early warnings" value={warningStatus} note="Published output context" icon="people"/>
      </> : null}
      {module === 'reports' ? <>
        <KpiCard label="Registered data sources" value={numberFormat(sourceCount)} note="Publisher, coverage and URL metadata" icon="database"/>
        <KpiCard label="Source-backed metric rows" value={numberFormat(totalMetrics)} note="Rows readable under the public-source policy" icon="activity"/>
        <KpiCard label="Geography coverage" value={numberFormat(geographyCount)} note="States and Union Territories" icon="people"/>
        <KpiCard label="Evidence catalogue" value={snapshot.sources.filter(source => source.url).length.toString()} note="Registered sources with a source URL" icon="training"/>
      </> : null}
      {module === 'data-quality' ? <>
        <KpiCard label="Source-backed metric rows" value={numberFormat(totalMetrics)} note="Public read policy excludes synthetic metrics" icon="activity"/>
        <KpiCard label="Registered sources" value={numberFormat(sourceCount)} note="Source metadata catalogued" icon="database"/>
        <KpiCard label="State / UT references" value={numberFormat(geographyCount)} note="Canonical geography dimension" icon="people"/>
        <KpiCard label="District references" value={numberFormat(districtCount)} note="Canonical roster; not evidence of district-level metrics" icon="training"/>
      </> : null}
    </div>

    {module === 'supply' ? <>
      <section className="dbi-panel"><SectionHead title={regionCode === 'IN' ? 'Provisional training capacity by state' : 'Provisional training capacity · selected region'} note="Sum of source-backed CTS trade-level seat-capacity records for academic session 2026. It measures planned training capacity—not enrolment, completion or employed workers."/>
        {visibleStateSeats.length ? <div className="dbi-ranking-list">
          {visibleStateSeats.slice(0, 12).map((row, index) => <div className="dbi-ranking-row" key={row.id}>
            <span className="dbi-rank">{String(index + 1).padStart(2, '0')}</span><span className="dbi-ranking-name">{row.label}</span>
            <div className="dbi-bar-track"><span style={{ width: Math.max(2, (row.value / (visibleStateSeats[0]?.value || 1)) * 100) + '%' }}/></div>
            <strong className="dbi-ranking-value">{numberFormat(row.value)}</strong>
          </div>)}
        </div> : <div className="dbi-ranking-empty" role="status"><Info size={17}/><div><strong>No published training-capacity rows for this geography</strong><p>No source-backed provisional CTS seat-capacity value is readable for the selected region and academic session. This is unavailable data, not zero capacity.</p><button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Retry data read'}</button></div></div>}
        <div className="dbi-table-foot"><SourceLink source={seatSource}/><span>Reference: Academic session 2026</span><Provenance/></div>
      </section>
      <div className="dbi-two-col">
        <section className="dbi-panel"><SectionHead title="Training & apprenticeship indicators" note="Metrics remain separated by programme and reference period."/>
          <DataTable columns={['Indicator', 'Value', 'Reference period', 'Coverage', 'Source']} empty="No published training or apprenticeship indicators are available for this region and period.">
            {centreValues.map(item => item.rows.length ? <tr key={item.code}><td><strong>{metricLabel(item.code)}</strong></td><td className="dbi-number">{numberFormat(item.total)}</td><td>{periodLabel(item.period)}</td><td>{item.coverage}</td><td><SourceLink source={sourceFor(snapshot, item.rows[0]?.source_id)}/></td></tr> : null)}
            {apprenticeRows.length ? <tr><td><strong>Apprentices engaged (NAPS)</strong></td><td className="dbi-number">{numberFormat(apprenticeTotal)}</td><td>{periodLabel(apprenticeRows[0].reference_period)}</td><td>{apprenticeCoverage}</td><td><SourceLink source={sourceFor(snapshot, apprenticeRows[0].source_id)}/></td></tr> : null}
            {pmkvyTrainedRows.length ? <tr><td><strong>PMKVY trained / oriented</strong></td><td className="dbi-number">{numberFormat(pmkvyTrainedTotal)}</td><td>{periodLabel(pmkvyTrainedRows[0].reference_period)}</td><td>{pmkvyTrainedCoverage}</td><td><SourceLink source={sourceFor(snapshot, pmkvyTrainedRows[0].source_id)}/></td></tr> : null}
          </DataTable>
        </section>
        <section className="dbi-panel"><SectionHead title="Training capacity is not workforce supply" note="Signals that should be kept distinct in the analytics pipeline."/>
          <div className="dbi-rule-list"><div><span className="dbi-rule-index">01</span><div><strong>Seat capacity</strong><p>Potential seats offered for a trade/session.</p></div></div><div><span className="dbi-rule-index">02</span><div><strong>Enrolment and completions</strong><p>Different stages of the training pipeline; not interchangeable.</p></div></div><div><span className="dbi-rule-index">03</span><div><strong>Employed or available workers</strong><p>Requires distinct, source-backed labour-stock/flow evidence.</p></div></div></div>
        </section>
      </div>
    </> : null}

    {module === 'skill-gaps' ? <>
      {lowConfidenceSkillCount > 0 ? <div className="dbi-note dbi-note-warn" role="status"><Info size={17}/><div><strong>Review sector mappings before decisions</strong><p>{lowConfidenceSkillCount} of {canonicalSkillCount} canonical skills have LOW-confidence sector mappings{lowConfidenceManualMappingCount > 0 ? ', including ' + lowConfidenceManualMappingCount + ' manually mapped entries' : ''}. Treat these mappings as provisional reference metadata—not validated evidence of a labour-market shortage.</p></div></div> : null}
      <div className="dbi-note dbi-note-warn"><Info size={17}/><div><strong>Gap output is not yet publishable</strong><p>{gapReason} A numerically populated chart here would overstate what the data supports.</p></div></div>
      <div className="dbi-two-col">
        <section className="dbi-panel"><SectionHead title="Canonical skill catalogue" note="Reference skills from Supabase, including existing sector-mapping confidence."/>
          <DataTable columns={['Skill / role', 'Code', 'Sector mapping', 'Mapping method', 'Confidence']}>
            {snapshot.skills.map(skill => <tr key={skill.id}><td><strong>{skill.name}</strong><small>{skill.description || 'Canonical reference skill'}</small></td><td>{skill.code}</td><td>{sectorsForSkill(skill)}</td><td>{(skill.sector_mapping_method || 'unmapped').replace(/_/g, ' ')}</td><td><span className={'dbi-confidence dbi-confidence-' + (skill.sector_mapping_confidence || 'unmapped').toLowerCase()}>{skill.sector_mapping_confidence}</span></td></tr>)}
          </DataTable>
        </section>
        <section className="dbi-panel"><SectionHead title="Sector catalogue" note="Canonical sectors currently registered in the live database."/>
          <DataTable columns={['Sector', 'Code', 'Skills mapped']}>
            {snapshot.sectors.map(sector => <tr key={sector.id}><td><strong>{sector.name}</strong><small>{sector.description || 'Canonical sector reference'}</small></td><td>{sector.code}</td><td>{snapshot.skills.filter(skill => skill.sector_id === sector.id).length}</td></tr>)}
          </DataTable>
        </section>
      </div>
    </> : null}

    {module === 'forecasts' ? <>
      <div className="dbi-note dbi-note-warn" role="status"><Info size={17}/><div><strong>No validated forecast result is available in this view</strong><p>{forecastInputsRestricted
        ? 'One or more forecast input/output tables are restricted by the public read policy. “Restricted” means this application cannot inspect that table; it does not prove the underlying table is empty. A server-authorized read of validated outputs is required before a forecast line or early-warning result can be shown.'
        : 'We will not manufacture projections from dashboard indicators. Validated forecast results, model-version metadata and an auditable calculation run are required before a forecast line or early-warning result can appear here.'}</p></div></div>
      <div className="dbi-two-col">
        <section className="dbi-panel"><SectionHead title="Output readiness" note="These checks reflect what the public data reader can currently see."/>
          <div className="dbi-readiness-list">{[['Demand observations', demandStatus], ['Supply observations', supplyStatus], ['Forecast results', forecastStatus], ['Model versions', modelStatus], ['Early warnings', warningStatus]].map(([label, status]) => <div className="dbi-readiness-item" key={label}><span className="dbi-status-dot" data-status={status === 'Available' ? 'ready' : status === 'Restricted' ? 'restricted' : 'pending'}/><span>{label}</span><strong>{status}</strong></div>)}</div>
        </section>
        <section className="dbi-panel"><SectionHead title="Published historical context" note="PLFS calendar-year 2025 values are reference indicators, not future predictions."/>
          <DataTable columns={['Indicator', 'Value', 'Period', 'Coverage']}>
            {recentRates.slice(0, 14).map(row => <tr key={row.id}><td><strong>{metricLabel(row.metric_code)}</strong><small>{dimensionLabel(row)}</small></td><td className="dbi-number">{numberFormat(numeric(row.value_numeric))}%</td><td>{periodLabel(row.reference_period)}</td><td>{row.state_id ? stateLabel(snapshot, row) : 'India (national)'}</td></tr>)}
          </DataTable>
        </section>
      </div>
    </> : null}

    {module === 'emerging-skills' ? <>
      {lowConfidenceSkillCount > 0 ? <div className="dbi-note dbi-note-warn" role="status"><Info size={17}/><div><strong>Signal candidates need mapping review</strong><p>{lowConfidenceSkillCount} of {canonicalSkillCount} canonical skills have LOW-confidence sector mappings{lowConfidenceManualMappingCount > 0 ? ', including ' + lowConfidenceManualMappingCount + ' manually mapped entries' : ''}. Review occupation/sector mappings before interpreting future growth or momentum signals.</p></div></div> : null}
      <div className="dbi-note dbi-note-warn"><Info size={17}/><div><strong>Signal history is not yet available</strong><p>The skill reference catalogue is live, but this application cannot see published emerging_skill_signals. Growth rates, momentum ranks and confidence scores will appear only when backed by validated historical observations and an approved calculation.</p></div></div>
      <section className="dbi-panel"><SectionHead title="Skills ready for signal tracking" note="Live canonical skills with their mapped sector and mapping confidence."/>
        <DataTable columns={['Skill / role', 'Sector', 'Mapping confidence', 'Published signal']}>
          {snapshot.skills.map(skill => <tr key={skill.id}><td><strong>{skill.name}</strong><small>{skill.code}</small></td><td>{sectorsForSkill(skill)}</td><td><span className={'dbi-confidence dbi-confidence-' + (skill.sector_mapping_confidence || 'unmapped').toLowerCase()}>{skill.sector_mapping_confidence || 'Unmapped'}</span></td><td><span className="dbi-status-pill">Awaiting historical series</span></td></tr>)}
        </DataTable>
      </section>
    </> : null}

    {module === 'scenario-simulator' ? <>
      {!scenarioApiConfigured ? <div className="dbi-note dbi-note-warn" role="status"><Info size={17}/><div><strong>Scenario execution API is not configured</strong><p>This deployment does not define VITE_SCENARIO_SIMULATOR_API_BASE_URL. No intervention run will be submitted until a server-side simulation endpoint is configured and a compatible validated baseline is available.</p></div></div> : null}
      <div className="dbi-note dbi-note-warn"><Info size={17}/><div><strong>Simulation is waiting for a validated baseline</strong><p>The intervention can be modelled only after a published forecast baseline, capacity assumptions and time lag are available. This page intentionally does not run on illustrative values.</p></div></div>
      <div className="dbi-two-col">
        <section className="dbi-panel"><SectionHead title="Inputs currently available" note="Source-backed context that can support future scenario construction."/>
          <div className="dbi-readiness-list"><div className="dbi-readiness-item"><span className="dbi-status-dot" data-status="ready"/><span>Training capacity by trade and state</span><strong>Available</strong></div><div className="dbi-readiness-item"><span className="dbi-status-dot" data-status="ready"/><span>Canonical skill and sector catalogue</span><strong>Available</strong></div><div className="dbi-readiness-item"><span className="dbi-status-dot" data-status="pending"/><span>Published demand history</span><strong>{demandStatus}</strong></div><div className="dbi-readiness-item"><span className="dbi-status-dot" data-status="pending"/><span>Published forecast baseline</span><strong>{forecastStatus}</strong></div></div>
        </section>
        <section className="dbi-panel"><SectionHead title="Capacity context by state" note="Academic session 2026 provisional seat capacity; not worker supply."/>
          {stateSeats.length ? <div className="dbi-ranking-list">{stateSeats.slice(0, 8).map((row, index) => <div className="dbi-ranking-row" key={row.id}><span className="dbi-rank">{String(index + 1).padStart(2, '0')}</span><span className="dbi-ranking-name">{row.label}</span><div className="dbi-bar-track"><span style={{ width: Math.max(2, row.value / (stateSeats[0]?.value || 1) * 100) + '%' }}/></div><strong className="dbi-ranking-value">{numberFormat(row.value)}</strong></div>)}</div> : <div className="dbi-ranking-empty" role="status"><Info size={17}/><div><strong>No source-backed capacity rows are readable</strong><p>The state-level capacity comparison needs published provisional CTS records for academic session 2026. No sample values are substituted.</p><button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Retry data read'}</button></div></div>}
          <div className="dbi-table-foot"><SourceLink source={seatSource}/><Provenance/></div>
        </section>
      </div>
    </> : null}

    {module === 'reports' ? <>
      {!reportsApiConfigured ? <div className="dbi-note dbi-note-warn" role="status"><Info size={17}/><div><strong>Report generation is not connected in this deployment</strong><p>This page currently provides a read-only evidence catalogue. Report creation, saved-report library actions and server-side exports require a configured SHRAMIK reports API. No report is generated from the catalogue alone.</p></div></div> : null}
      <section className="dbi-panel"><SectionHead title="Registered source catalogue" note="Reports can cite these source records. A registered source is not, by itself, proof of an up-to-date retrieval or successful validation."/>
        <div className="dbi-table-tools"><label htmlFor="dbi-source-search">Filter sources</label><input id="dbi-source-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search publisher or dataset"/></div>
        <DataTable columns={['Source', 'Publisher', 'Type', 'Coverage', 'Publication / access', 'Reference']}>
          {filteredSources.map(source => <tr key={source.id}><td><strong>{source.name}</strong><small>{source.notes || 'Registered source metadata'}</small></td><td>{source.publisher}</td><td><span className="dbi-type-pill">{source.source_type}</span></td><td>{source.coverage_start || '—'} – {source.coverage_end || '—'}</td><td>{source.publication_date || source.accessed_at?.slice(0, 10) || 'Not reported'}</td><td><SourceLink source={source}/></td></tr>)}
        </DataTable>
      </section>
    </> : null}

    {module === 'data-quality' ? <>
      <div className="dbi-note"><FileCheck2 size={17}/><div><strong>Public analytics view</strong><p>The metric inventory below is filtered to source-backed, non-synthetic records by the Supabase read policy. Staging-table row-level diagnostics and restricted administrative validation logs are not exposed through this public application. “Restricted” means the public reader cannot inspect a table; it does not mean the table is empty.</p></div></div>
      <div className="dbi-two-col">
        <section className="dbi-panel"><SectionHead title="Analytical output visibility" note="A lightweight public-read check (at most one sampled row per table). “Available” means at least one row is readable, not that the output is validated or complete."/>
          <div className="dbi-readiness-list">{([
            ['Demand observations', 'demand_observations'],
            ['Supply observations', 'supply_observations'],
            ['Forecast results', 'forecast_results'],
            ['Model versions', 'model_versions'],
            ['Emerging-skill signals', 'emerging_skill_signals'],
            ['Early warnings', 'early_warnings'],
          ] as const).map(([label, table]) => { const status = statusCount(snapshot, table); const dot = status === 'Available' ? 'ready' : status === 'Restricted' ? 'restricted' : 'pending'; return <div className="dbi-readiness-item" key={table}><span className="dbi-status-dot" data-status={dot}/><span>{label}</span><strong>{status}</strong></div>; })}</div>
        </section>
        <section className="dbi-panel"><SectionHead title="Skill-to-sector mapping review" note="Mapping quality is reference-data quality. It is not evidence that a skill is in shortage or emerging."/>
          <div className="dbi-readiness-list">
            <div className="dbi-readiness-item"><span className="dbi-status-dot" data-status="ready"/><span>Canonical skill records</span><strong>{numberFormat(canonicalSkillCount)}</strong></div>
            <div className="dbi-readiness-item"><span className="dbi-status-dot" data-status={lowConfidenceSkillCount > 0 ? 'restricted' : 'ready'}/><span>LOW-confidence sector mappings</span><strong>{numberFormat(lowConfidenceSkillCount)}</strong></div>
            <div className="dbi-readiness-item"><span className="dbi-status-dot" data-status={lowConfidenceManualMappingCount > 0 ? 'restricted' : 'ready'}/><span>Manually mapped, LOW-confidence</span><strong>{numberFormat(lowConfidenceManualMappingCount)}</strong></div>
          </div>
          <p className="dbi-table-foot">{lowConfidenceSkillCount > 0 ? 'Review these occupation/sector links before policy interpretation. The current catalogue records LOW confidence and manual mapping provenance; it does not publish automated mapping validation.' : 'No LOW-confidence mappings are visible in the current public catalogue. This is not a substitute for a formal mapping audit.'}</p>
        </section>
      </div>
      <section className="dbi-panel"><SectionHead title="Metric coverage inventory" note="Record counts, latest available period and breadth of geography/source coverage per metric."/>
        <div className="dbi-table-tools"><label htmlFor="dbi-metric-search">Filter metrics</label><input id="dbi-metric-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search indicators or codes"/></div>
        <DataTable columns={['Metric', 'Rows', 'Unit', 'Latest period', 'States / UTs', 'Sources']}>
          {inventory.map(item => <tr key={item.code}><td><strong>{metricLabel(item.code)}</strong><small>{item.code}</small></td><td className="dbi-number">{numberFormat(item.count)}</td><td>{item.unit}</td><td>{periodLabel(item.period)}</td><td>{item.states}</td><td>{item.sources}</td></tr>)}
        </DataTable>
      </section>
    </> : null}

    <footer className="dbi-footer"><span><ShieldCheck size={14}/> Source-backed database view · Synthetic data excluded</span><span>{numberFormat(totalMetrics)} readable metric records · {numberFormat(districtCount)} district references</span><button type="button" onClick={() => onNavigate?.('data-sources')}>Open Data Sources <ArrowUpRight size={14}/></button></footer>
  </section>;
}
