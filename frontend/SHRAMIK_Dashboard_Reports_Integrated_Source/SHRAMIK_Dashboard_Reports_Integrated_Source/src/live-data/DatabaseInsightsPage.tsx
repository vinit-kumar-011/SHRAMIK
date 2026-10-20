import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Database, FileCheck2, GraduationCap, Info, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { SUPABASE_URL, supabaseHeaders } from '../supabase/config';

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
  return d.sex === 'person' && d.area === 'combined' && d.age_domain === 'all_ages';
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
  }
  return rows;
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
  const params = new URLSearchParams(query);
  const response = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + params.toString(), {
    method: 'GET',
    headers: supabaseHeaders(null),
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
async function checkPublicTable(table: string): Promise<TableVisibility> {
  try {
    const rows = await getRows<{ id: string }>(table, { select: 'id', limit: '1' });
    return { state: rows.length ? 'HAS_ROWS' : 'NO_PUBLIC_ROWS', sampleRows: rows.length };
  } catch {
    return { state: 'RESTRICTED', sampleRows: 0 };
  }
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
  const tableNames = ['demand_observations', 'supply_observations', 'forecast_results', 'model_versions', 'emerging_skill_signals', 'early_warnings'];
  const outputChecks = await Promise.all(tableNames.map(async table => [table, await checkPublicTable(table)] as const));
  const outputs: Record<string, TableVisibility> = {};
  outputChecks.forEach(([table, status]) => { outputs[table] = status; });
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
  return <div className="dbi-table-wrap"><table className="dbi-table"><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{children || <tr><td colSpan={columns.length} className="dbi-empty-cell">{empty}</td></tr>}</tbody></table></div>;
}
function contextRates(snapshot: Snapshot, regionCode: string): MetricRow[] {
  const wanted = ['UR', 'LFPR', 'WPR'];
  let rows = snapshot.metrics.filter(row => wanted.includes(row.metric_code) && row.reference_period === 'CY2025');
  if (regionCode !== 'IN') {
    const id = selectedStateId(snapshot, regionCode);
    const regional = rows.filter(row => row.state_id === id);
    if (regional.length) rows = regional;
    else rows = rows.filter(row => !row.state_id || row.observation_grain === 'NATIONAL');
  } else {
    rows = rows.filter(row => !row.state_id || row.observation_grain === 'NATIONAL');
  }
  return rows;
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
function statusCount(snapshot: Snapshot, table: string): string {
  const entry = snapshot.outputs[table];
  if (!entry) return 'Checking';
  if (entry.state === 'RESTRICTED') return 'Restricted';
  if (entry.state === 'NO_PUBLIC_ROWS') return '0 visible';
  return 'Available';
}

export default function DatabaseInsightsPage({ module, regionCode = 'IN', onNavigate }: {
  module: DatabaseModule;
  regionCode?: string;
  onNavigate?: (route: string) => void;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const page = TITLES[module];

  useEffect(() => {
    let active = true;
    setError('');
    loadSnapshot().then(result => {
      if (active) setSnapshot(result);
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not read the SHRAMIK database.');
    });
    return () => { active = false; };
  }, [refreshVersion]);

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
      setRefreshVersion(v => v + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not refresh the SHRAMIK database snapshot.');
    } finally {
      setRefreshing(false);
    }
  }

  if (error && !snapshot) return <section className="dbi-shell">
    <div className="dbi-hero"><div><div className="dbi-eyebrow">{page.eyebrow}</div><h1>{page.title}</h1><p>{page.subtitle}</p></div></div>
    <div className="dbi-error" role="alert"><Info size={18}/><div><strong>Live database read failed.</strong><p>{error}</p><button type="button" onClick={() => void refresh()}>Retry database connection</button></div></div>
  </section>;

  if (!snapshot) return <section className="dbi-shell">
    <div className="dbi-hero"><div><div className="dbi-eyebrow">{page.eyebrow}</div><h1>{page.title}</h1><p>{page.subtitle}</p></div></div>
    <div className="dbi-loading"><RefreshCw size={18} className="dbi-spin"/> Reading live source-backed data from Supabase…</div>
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
  const itiRows = mostRecentRows(snapshot, 'CTS_ITI_COUNT', regionCode);
  const itiTotal = regionCode === 'IN'
    ? snapshot.metrics.filter(row => row.metric_code === 'CTS_ITI_COUNT' && row.reference_period === 'AS_OF_2024-10-31').reduce((sum, row) => sum + numeric(row.value_numeric), 0)
    : itiRows.reduce((sum, row) => sum + numeric(row.value_numeric), 0);
  const centreMetrics = ['PMKVY_TRAINING_CENTRE_COUNT', 'JSS_TRAINING_CENTRE_COUNT', 'NAPS_ESTABLISHMENT_COUNT'];
  const centreValues = centreMetrics.map(code => {
    const rows = mostRecentRows(snapshot, code, regionCode);
    const national = snapshot.metrics.filter(row => row.metric_code === code && row.reference_period === rows[0]?.reference_period);
    const selected = regionCode === 'IN' ? national : (rows.length ? rows : national);
    return { code, rows: selected, total: selected.reduce((sum, row) => sum + numeric(row.value_numeric), 0), period: selected[0]?.reference_period || '—' };
  });
  const apprenticeRows = mostRecentRows(snapshot, 'SPACE_GEOSPATIAL_NAPS_APPRENTICES_ENGAGED', regionCode);
  const apprenticeTotal = regionCode === 'IN'
    ? snapshot.metrics.filter(row => row.metric_code === 'SPACE_GEOSPATIAL_NAPS_APPRENTICES_ENGAGED' && row.reference_period === apprenticeRows[0]?.reference_period).reduce((sum, row) => sum + numeric(row.value_numeric), 0)
    : apprenticeRows.reduce((sum, row) => sum + numeric(row.value_numeric), 0);
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
  const recentRates = rateRows.filter(row => row.metric_code === 'UR' || row.metric_code === 'LFPR' || row.metric_code === 'WPR');
  const stateRegistrations = snapshot.metrics.filter(row => row.metric_code === 'ESHRAM_REGISTRATION_COUNT' && row.observation_grain === 'STATE');
  const stateRegTotals = stateTotals(snapshot, stateRegistrations);
  const sectorsForSkill = (skill: SkillRow) => snapshot.sectors.find(sector => sector.id === skill.sector_id)?.name || 'Sector mapping unavailable';
  const seatSource = sourceFor(snapshot, snapshot.metrics.find(row => row.metric_code === 'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE')?.source_id || null);
  const employmentSource = sourceFor(snapshot, rates.find(value => value.row)?.row?.source_id || null);
  const registrationSource = sourceFor(snapshot, registration?.source_id || null);
  const inventory = metricInventory.filter(row => !query || metricLabel(row.code).toLocaleLowerCase().includes(query.toLocaleLowerCase()) || row.code.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const gapReason = demandStatus === '0 visible' && supplyStatus === '0 visible'
    ? 'The public database currently exposes no demand-observation or supply-observation rows for this view. The system therefore does not calculate or display a numerical skill gap.'
    : 'A skill gap is shown only when compatible demand and supply observations are available through the validated analytical contract.';

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
      </div>
    </header>

    {error ? <div className="dbi-inline-warning" role="status"><Info size={16}/>{error}</div> : null}
    {snapshot.warnings.length > 0 ? <div className="dbi-inline-warning"><Info size={16}/>Some reference tables could not be read; displayed values are limited to the sources that loaded successfully.</div> : null}

    <div className="dbi-kpi-grid">
      {module === 'demand' ? <>
        {rates.map(({ code, label, row }) => <KpiCard key={code} label={label} value={row ? numberFormat(numeric(row.value_numeric), false) : '—'} unit={row?.unit === 'percent' ? '%' : row?.unit} note={row ? periodLabel(row.reference_period) + ' · ' + (row.state_id ? stateLabel(snapshot, row) : 'India') : 'No published value for this slice'} icon="activity"/>)}
        <KpiCard label="e-Shram registrations" value={registration ? numberFormat(numeric(registration.value_numeric), true) : '—'} note={registration ? periodLabel(registration.reference_period) + ' · registrations, not job demand' : 'No published registration snapshot'} icon="people"/>
      </> : null}
      {module === 'supply' ? <>
        <KpiCard label="Provisional CTS seat capacity" value={numberFormat(seatTotal, true)} note={regionCode === 'IN' ? 'Academic session 2026 · seats, not completions' : 'Selected region · academic session 2026'} icon="training"/>
        <KpiCard label="CTS ITIs" value={numberFormat(itiTotal, true)} note="Published reference snapshot · 31 Oct 2024" icon="database"/>
        <KpiCard label="Apprentices engaged" value={numberFormat(apprenticeTotal, true)} note={apprenticeRows[0] ? periodLabel(apprenticeRows[0].reference_period) : 'Latest published reporting period'} icon="people"/>
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
        <KpiCard label="Provisional training seats" value={numberFormat(seatTotal, true)} note="Available baseline context, not a forecast" icon="training"/>
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

    {module === 'demand' ? <>
      <div className="dbi-two-col">
        <section className="dbi-panel"><SectionHead title="PLFS 2025 published benchmarks" note="Official annual indicator values. Selected-region values are used where published; otherwise India values remain explicitly labelled."/>
          <DataTable columns={['Indicator', 'Published value', 'Period', 'Geography', 'Source']}>
            {rates.map(({ code, label, row }) => row ? <tr key={code}><td><strong>{label}</strong><small>{code}</small></td><td className="dbi-number">{numberFormat(numeric(row.value_numeric))}{row.unit === 'percent' ? '%' : ' ' + row.unit}</td><td>{periodLabel(row.reference_period)}</td><td>{row.state_id ? stateLabel(snapshot, row) : 'India (national)'}</td><td><SourceLink source={sourceFor(snapshot, row.source_id) || employmentSource}/></td></tr> : null)}
            {rates.every(item => !item.row) ? <tr><td colSpan={5} className="dbi-empty-cell">No canonical person-level PLFS slice is published for this region.</td></tr> : null}
          </DataTable>
        </section>
        <section className="dbi-panel"><SectionHead title="Worker-registration distribution" note="State-level e-Shram registrations are cumulative registration counts, not employment, vacancy volume or available labour supply."/>
          <DataTable columns={['State / UT', 'Registrations', 'Reference', 'Source']}>
            {stateRegTotals.slice(0, 10).map(row => <tr key={row.id}><td><strong>{row.label}</strong></td><td className="dbi-number">{numberFormat(row.value, true)}</td><td>{periodLabel(row.period)}</td><td><SourceLink source={sourceFor(snapshot, row.sourceId) || registrationSource}/></td></tr>)}
          </DataTable>
        </section>
      </div>
      <div className="dbi-note"><Info size={17}/><div><strong>Interpretation boundary</strong><p>Direct demand_observations are not yet populated for the public application. This page gives users source-backed labour-market context without mislabelling worker registrations or PLFS rates as vacancy demand.</p></div></div>
    </> : null}

    {module === 'supply' ? <>
      <section className="dbi-panel"><SectionHead title="Provisional training capacity by state" note="Sum of source-backed CTS trade-level seat-capacity records for academic session 2026. It measures planned training capacity—not enrolment, completion or employed workers."/>
        <div className="dbi-ranking-list">
          {visibleStateSeats.slice(0, 12).map((row, index) => <div className="dbi-ranking-row" key={row.id}>
            <span className="dbi-rank">{String(index + 1).padStart(2, '0')}</span><span className="dbi-ranking-name">{row.label}</span>
            <div className="dbi-bar-track"><span style={{ width: Math.max(2, (row.value / (visibleStateSeats[0]?.value || 1)) * 100) + '%' }}/></div>
            <strong className="dbi-ranking-value">{numberFormat(row.value)}</strong>
          </div>)}
        </div>
        <div className="dbi-table-foot"><SourceLink source={seatSource}/><span>Reference: Academic session 2026</span><Provenance/></div>
      </section>
      <div className="dbi-two-col">
        <section className="dbi-panel"><SectionHead title="Training & apprenticeship indicators" note="Metrics remain separated by programme and reference period."/>
          <DataTable columns={['Indicator', 'Value', 'Reference period', 'Source']}>
            {centreValues.map(item => item.rows.length ? <tr key={item.code}><td><strong>{metricLabel(item.code)}</strong></td><td className="dbi-number">{numberFormat(item.total)}</td><td>{periodLabel(item.period)}</td><td><SourceLink source={sourceFor(snapshot, item.rows[0]?.source_id)}/></td></tr> : null)}
            {apprenticeRows.length ? <tr><td><strong>Apprentices engaged (NAPS)</strong></td><td className="dbi-number">{numberFormat(apprenticeTotal)}</td><td>{periodLabel(apprenticeRows[0].reference_period)}</td><td><SourceLink source={sourceFor(snapshot, apprenticeRows[0].source_id)}/></td></tr> : null}
            <tr><td><strong>PMKVY trained / oriented</strong></td><td className="dbi-number">{numberFormat(mostRecentRows(snapshot, 'SPACE_GEOSPATIAL_PMKVY_TRAINED_ORIENTED', regionCode).reduce((sum, row) => sum + numeric(row.value_numeric), 0))}</td><td>{periodLabel(mostRecentRows(snapshot, 'SPACE_GEOSPATIAL_PMKVY_TRAINED_ORIENTED', regionCode)[0]?.reference_period || '—')}</td><td><SourceLink source={sourceFor(snapshot, mostRecentRows(snapshot, 'SPACE_GEOSPATIAL_PMKVY_TRAINED_ORIENTED', regionCode)[0]?.source_id || null)}/></td></tr>
          </DataTable>
        </section>
        <section className="dbi-panel"><SectionHead title="Training capacity is not workforce supply" note="Signals that should be kept distinct in the analytics pipeline."/>
          <div className="dbi-rule-list"><div><span className="dbi-rule-index">01</span><div><strong>Seat capacity</strong><p>Potential seats offered for a trade/session.</p></div></div><div><span className="dbi-rule-index">02</span><div><strong>Enrolment and completions</strong><p>Different stages of the training pipeline; not interchangeable.</p></div></div><div><span className="dbi-rule-index">03</span><div><strong>Employed or available workers</strong><p>Requires distinct, source-backed labour-stock/flow evidence.</p></div></div></div>
        </section>
      </div>
    </> : null}

    {module === 'skill-gaps' ? <>
      <div className="dbi-note dbi-note-warn"><Info size={17}/><div><strong>Gap output is not yet publishable</strong><p>{gapReason} A numerically populated chart here would overstate what the data supports.</p></div></div>
      <div className="dbi-two-col">
        <section className="dbi-panel"><SectionHead title="Canonical skill catalogue" note="Reference skills from Supabase, including existing sector-mapping confidence."/>
          <DataTable columns={['Skill / role', 'Code', 'Sector mapping', 'Mapping method', 'Confidence']}>
            {snapshot.skills.map(skill => <tr key={skill.id}><td><strong>{skill.name}</strong><small>{skill.description || 'Canonical reference skill'}</small></td><td>{skill.code}</td><td>{sectorsForSkill(skill)}</td><td>{skill.sector_mapping_method.replace(/_/g, ' ')}</td><td><span className={'dbi-confidence dbi-confidence-' + skill.sector_mapping_confidence.toLowerCase()}>{skill.sector_mapping_confidence}</span></td></tr>)}
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
      <div className="dbi-note dbi-note-warn"><Info size={17}/><div><strong>No published forecast result is available to this app</strong><p>We will not manufacture projections from dashboard indicators. The live database needs validated forecast_results, model-version metadata and an auditable calculation run before a forecast line or early-warning count can appear here.</p></div></div>
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
      <div className="dbi-note dbi-note-warn"><Info size={17}/><div><strong>Signal history is not yet available</strong><p>The skill reference catalogue is live, but this application cannot see published emerging_skill_signals. Growth rates, momentum ranks and confidence scores will appear only when backed by validated historical observations and an approved calculation.</p></div></div>
      <section className="dbi-panel"><SectionHead title="Skills ready for signal tracking" note="Live canonical skills with their mapped sector and mapping confidence."/>
        <DataTable columns={['Skill / role', 'Sector', 'Mapping confidence', 'Published signal']}>
          {snapshot.skills.map(skill => <tr key={skill.id}><td><strong>{skill.name}</strong><small>{skill.code}</small></td><td>{sectorsForSkill(skill)}</td><td><span className={'dbi-confidence dbi-confidence-' + skill.sector_mapping_confidence.toLowerCase()}>{skill.sector_mapping_confidence}</span></td><td><span className="dbi-status-pill">Awaiting historical series</span></td></tr>)}
        </DataTable>
      </section>
    </> : null}

    {module === 'scenario-simulator' ? <>
      <div className="dbi-note dbi-note-warn"><Info size={17}/><div><strong>Simulation is waiting for a validated baseline</strong><p>The intervention can be modelled only after a published forecast baseline, capacity assumptions and time lag are available. This page intentionally does not run on illustrative values.</p></div></div>
      <div className="dbi-two-col">
        <section className="dbi-panel"><SectionHead title="Inputs currently available" note="Source-backed context that can support future scenario construction."/>
          <div className="dbi-readiness-list"><div className="dbi-readiness-item"><span className="dbi-status-dot" data-status="ready"/><span>Training capacity by trade and state</span><strong>Available</strong></div><div className="dbi-readiness-item"><span className="dbi-status-dot" data-status="ready"/><span>Canonical skill and sector catalogue</span><strong>Available</strong></div><div className="dbi-readiness-item"><span className="dbi-status-dot" data-status="pending"/><span>Published demand history</span><strong>{demandStatus}</strong></div><div className="dbi-readiness-item"><span className="dbi-status-dot" data-status="pending"/><span>Published forecast baseline</span><strong>{forecastStatus}</strong></div></div>
        </section>
        <section className="dbi-panel"><SectionHead title="Capacity context by state" note="Academic session 2026 provisional seat capacity; not worker supply."/>
          <div className="dbi-ranking-list">{stateSeats.slice(0, 8).map((row, index) => <div className="dbi-ranking-row" key={row.id}><span className="dbi-rank">{String(index + 1).padStart(2, '0')}</span><span className="dbi-ranking-name">{row.label}</span><div className="dbi-bar-track"><span style={{ width: Math.max(2, row.value / (stateSeats[0]?.value || 1) * 100) + '%' }}/></div><strong className="dbi-ranking-value">{numberFormat(row.value)}</strong></div>)}</div>
          <div className="dbi-table-foot"><SourceLink source={seatSource}/><Provenance/></div>
        </section>
      </div>
    </> : null}

    {module === 'reports' ? <>
      <section className="dbi-panel"><SectionHead title="Registered source catalogue" note="Reports can cite these source records. A registered source is not, by itself, proof of an up-to-date retrieval or successful validation."/>
        <div className="dbi-table-tools"><label htmlFor="dbi-source-search">Filter sources</label><input id="dbi-source-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search publisher or dataset"/></div>
        <DataTable columns={['Source', 'Publisher', 'Type', 'Coverage', 'Publication / access', 'Reference']}>
          {filteredSources.map(source => <tr key={source.id}><td><strong>{source.name}</strong><small>{source.notes || 'Registered source metadata'}</small></td><td>{source.publisher}</td><td><span className="dbi-type-pill">{source.source_type}</span></td><td>{source.coverage_start || '—'} – {source.coverage_end || '—'}</td><td>{source.publication_date || source.accessed_at?.slice(0, 10) || 'Not reported'}</td><td><SourceLink source={source}/></td></tr>)}
        </DataTable>
      </section>
    </> : null}

    {module === 'data-quality' ? <>
      <div className="dbi-note"><FileCheck2 size={17}/><div><strong>Public analytics view</strong><p>The metric inventory below is filtered to source-backed, non-synthetic records by the Supabase read policy. Staging-table row-level diagnostics and restricted administrative validation logs are not exposed through this public application.</p></div></div>
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
