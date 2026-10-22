import type {
  DashboardPeriod, DashboardRow, DashboardSummary, DataMeta, DetailPayload, DetailQuery,
  LabourMarketDataAdapter, MetricCardData, NotificationItem, RankedRegion, RankedRegionsResponse,
  RankingsQuery, RegionMetric, RegionOption, SearchQuery, SearchResult, UserProfile,
} from './contracts';
import { SUPABASE_URL, supabaseHeaders } from '../supabase/config';

type KpiRow = {
  metric_code: string; title: string; value_numeric: string | number; unit: string;
  reference_period: string; source_label: string | null; source_url: string | null;
  as_of_date: string | null; interpretation_note: string | null;
};
type RegionalRow = {
  metric_key: string; metric_label: string; state_id: string; state_name: string;
  value_numeric: string | number; unit: string; reference_period: string;
  source_label: string | null; source_url: string | null; as_of_date: string | null;
  interpretation_note: string | null;
};
type PublishedRateRow = {
  metric_code: string; value_numeric: string | number; unit: string; reference_period: string;
  dimension_values: Record<string, unknown>; provenance_state: string; is_synthetic: boolean;
};
type SourceMeta = {
  sourceLabel: string; sourceUrl?: string | null; updatedAt?: string | null; note?: string | null;
};
type SourceMetricRow = {
  id: string;
  metric_code: string;
  value_numeric: string | number;
  unit: string;
  state_id: string | null;
  reference_period: string;
  as_of_date: string | null;
  dimension_values: Record<string, unknown> | null;
  provenance_state: string;
  is_synthetic: boolean;
};

const SUPABASE_SOURCE_LABEL = 'SHRAMIK Supabase source observations';

function queryString(values: Record<string, string>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => params.set(key, value));
  return params.toString();
}
function numberValue(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}
function compact(value: number): string {
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
function metricId(code: string): string { return code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function metaFor(source: SourceMeta, provenance: DataMeta['provenance'] = 'source-backed'): DataMeta {
  return {
    provenance,
    sourceLabel: source.sourceLabel || SUPABASE_SOURCE_LABEL,
    updatedAt: source.updatedAt || null,
    coverage: 'Published source-backed values only',
    notes: source.note ? [source.note, ...(source.sourceUrl ? ['Source reference: ' + source.sourceUrl] : [])] : (source.sourceUrl ? ['Source reference: ' + source.sourceUrl] : []),
  };
}
function titleForCode(code: string): string {
  const titles: Record<string, string> = {
    ESHRAM_REGISTRATION_COUNT: 'e-Shram registrations',
    CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE: 'Provisional CTS seat capacity',
    CTS_ITI_COUNT: 'Industrial Training Institutes',
    UR: 'Unemployment rate (PLFS 2025)',
    LFPR: 'Labour force participation rate (PLFS 2025)',
    WPR: 'Worker population ratio (PLFS 2025)',
    CWS_UR: 'Unemployment rate (CWS)',
    CWS_LFPR: 'Labour force participation (CWS)',
    CWS_WPR: 'Worker population ratio (CWS)',
  };
  return titles[code] || code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function subtitleForCode(code: string, unit: string, referencePeriod: string): string {
  if (code === 'ESHRAM_REGISTRATION_COUNT') return 'Cumulative portal registrations · not available labour supply';
  if (code === 'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE') return 'Provisional training capacity · not trained workers';
  if (code === 'CTS_ITI_COUNT') return 'Registered institute count · source coverage applies';
  if (['CWS_UR', 'CWS_LFPR', 'CWS_WPR'].includes(code)) {
    // Preserve the exact release period from the published KPI view; do not
    // collapse monthly CWS rates into the separate annual usual-status series.
    if (/monthly CWS/i.test(referencePeriod)) return referencePeriod;
    const match = referencePeriod.match(/^MONTHLY_(20\d{2})-(\d{2})$/);
    if (match) {
      const month = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1))
        .toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
      return `${month} ${match[1]} · monthly CWS · age 15+`;
    }
    return 'Monthly CWS · persons aged 15+';
  }
  if (['UR', 'LFPR', 'WPR'].includes(code)) {
    if (referencePeriod === 'CY2025') return 'PLFS CY2025 · usual status · all ages';
    return `Published annual benchmark · ${referencePeriod} · all ages`;
  }
  return unit;
}
function kpiFrom(row: KpiRow | PublishedRateRow, meta: SourceMeta, code?: string): MetricCardData {
  const metricCode = code || row.metric_code;
  const value = numberValue(row.value_numeric);
  const unit = row.unit === 'percent' ? '%' : row.unit;
  const formattedValue = unit === '%' ? value.toFixed(1) + '%' : compact(value);
  return {
    id: metricId(metricCode),
    key: metricCode === 'UR' ? 'unemployment-rate' : metricCode === 'LFPR' ? 'labour-force-participation' : metricCode === 'WPR' ? 'worker-population-ratio' : metricCode,
    title: titleForCode(metricCode),
    subtitle: subtitleForCode(metricCode, unit, row.reference_period),
    value,
    formattedValue,
    unit,
    deltaPct: null,
    context: 'Published source value',
    trend: [],
    meta: metaFor(meta),
  };
}
function sourceForKpi(row: KpiRow): SourceMeta {
  return { sourceLabel: row.source_label || SUPABASE_SOURCE_LABEL, sourceUrl: row.source_url, updatedAt: row.as_of_date, note: row.interpretation_note };
}
function sourceForRegional(row: RegionalRow): SourceMeta {
  return { sourceLabel: row.source_label || SUPABASE_SOURCE_LABEL, sourceUrl: row.source_url, updatedAt: row.as_of_date, note: row.interpretation_note };
}

type CatalogueRow = { id: string; code: string; name: string; description: string | null; is_active?: boolean };
const NAPS_METRIC = 'SPACE_GEOSPATIAL_NAPS_APPRENTICES_ENGAGED';
const PMKVY_METRIC = 'SPACE_GEOSPATIAL_PMKVY_TRAINED_ORIENTED';

function catalogueDashboardRows(rows: CatalogueRow[], kind: 'skill' | 'sector'): DashboardRow[] {
  const tones: DashboardRow['tone'][] = ['navy', 'teal', 'orange'];
  return rows.slice(0, 5).map((row, index) => {
    const notes = kind === 'skill'
      ? row.is_active === false
        ? 'Canonical skill reference is inactive pending review of its occupation/sector mapping. No validated emerging-skill signal is published for this item; do not treat it as approved for skill-gap or emerging-skill analysis.'
        : 'Canonical skill reference only. No validated emerging-skill signal is published for this item.'
      : 'Canonical sector reference only. No comparable demand/supply pair is available to calculate a sector gap.';
    return {
      id: `catalogue-${kind}-${row.id}`,
      name: row.name,
      formattedValue: kind === 'skill' ? (row.is_active === false ? 'Review mapping' : 'Catalogue') : 'Mapped',
      tone: tones[index % tones.length],
      iconKey: kind === 'skill' ? 'brain-circuit' : 'building-2',
      meta: {
        provenance: 'source-backed',
        sourceLabel: 'SHRAMIK canonical reference catalogue',
        updatedAt: null,
        coverage: rows.length + (kind === 'skill' ? ' canonical skills' : ' active sectors'),
        notes: [notes, row.code],
      },
    };
  });
}

function programmeRowsForRegion(rows: SourceMetricRow[], regionCode: string, stateId: string): SourceMetricRow[] {
  return rows.filter(row => row.state_id !== null
    && (regionCode === 'IN' || row.state_id === stateId)
    && row.provenance_state === 'SOURCE_BACKED'
    && row.is_synthetic === false);
}

function trainingProgrammeTrend(rows: SourceMetricRow[]): DashboardSummary['trend'] {
  const periods = new Map<string, Map<string, { total: number; stateIds: Set<string> }>>();
  rows.forEach(row => {
    if (row.state_id === null || (row.metric_code !== NAPS_METRIC && row.metric_code !== PMKVY_METRIC)) return;
    const byMetric = periods.get(row.reference_period) || new Map<string, { total: number; stateIds: Set<string> }>();
    const aggregate = byMetric.get(row.metric_code) || { total: 0, stateIds: new Set<string>() };
    aggregate.total += numberValue(row.value_numeric);
    aggregate.stateIds.add(row.state_id);
    byMetric.set(row.metric_code, aggregate);
    periods.set(row.reference_period, byMetric);
  });
  const candidates = [...periods.entries()]
    .filter(([period, byMetric]) => /^FY\d{4}-\d{2}$/.test(period) && byMetric.has(NAPS_METRIC) && byMetric.has(PMKVY_METRIC))
    .sort(([a], [b]) => a.localeCompare(b));
  // Do not draw a trend from one shared period; require at least two comparable periods.
  if (candidates.length < 2) return [];
  return candidates.map(([period, byMetric]) => {
    const startYear = Number(period.slice(2, 6));
    const naps = byMetric.get(NAPS_METRIC)!;
    const pmkvy = byMetric.get(PMKVY_METRIC)!;
    return {
      year: startYear + 1,
      label: period.replace('-', '–'),
      demand: naps.total,
      supply: pmkvy.total,
    };
  });
}

function trainingProgrammeContextRows(rows: SourceMetricRow[], regionCode: string, totalStates: number): DashboardRow[] {
  const labels: Record<string, { title: string; unit: string; tone: DashboardRow['tone'] }> = {
    [NAPS_METRIC]: { title: 'NAPS apprentices engaged', unit: 'apprentices', tone: 'navy' },
    [PMKVY_METRIC]: { title: 'PMKVY trained / oriented', unit: 'persons', tone: 'teal' },
  };
  const visible = rows.filter(row => row.state_id !== null
    && row.provenance_state === 'SOURCE_BACKED' && row.is_synthetic === false);
  return Object.entries(labels).flatMap(([code, info]) => {
    const metricRows = visible.filter(row => row.metric_code === code);
    const latestPeriod = metricRows.map(row => row.reference_period).sort().at(-1);
    if (!latestPeriod) return [];
    const current = metricRows.filter(row => row.reference_period === latestPeriod);
    const total = current.reduce((sum, row) => sum + numberValue(row.value_numeric), 0);
    const reportedStates = new Set(current.map(row => row.state_id).filter((id): id is string => Boolean(id))).size;
    const coverage = regionCode === 'IN' ? ` · ${reportedStates}/${totalStates || reportedStates} state/UTs` : '';
    const asOf = current.map(row => row.as_of_date).filter((value): value is string => Boolean(value)).sort().at(-1) || null;
    return [{
      id: `programme-${code.toLowerCase()}-${latestPeriod.toLowerCase()}`,
      name: `${info.title} · ${latestPeriod}${coverage}`,
      formattedValue: `${compact(total)} ${info.unit}`,
      tone: info.tone,
      iconKey: 'users',
      meta: {
        provenance: 'source-backed',
        sourceLabel: SUPABASE_SOURCE_LABEL,
        updatedAt: asOf,
        coverage: regionCode === 'IN' ? `${reportedStates}/${totalStates || reportedStates} state/UT records` : 'Selected state/UT source record',
        notes: ['Published training-programme context, not an occupation forecast or count of available workers.'],
      },
    }];
  });
}

export class SupabaseLabourMarketDataAdapter implements LabourMarketDataAdapter {
  readonly mode = 'supabase' as const;
  private regionCache: RegionOption[] | null = null;
  private readonly stateIdByCode = new Map<string, string>();
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly publishableKeyHeaders: typeof supabaseHeaders;
  private readonly useSameOriginProxy: boolean;
  constructor(
    baseUrl?: string,
    fetcher: typeof fetch = fetch,
    publishableKeyHeaders: typeof supabaseHeaders = supabaseHeaders,
  ) {
    this.baseUrl = baseUrl ?? SUPABASE_URL;
    // Native browser fetch must be called with its global receiver in Firefox.
    // This adapter invokes the stored function as a property, which otherwise binds
    // `this` to the adapter instance and can reject every request with Illegal invocation.
    this.fetcher = fetcher.bind(globalThis);
    this.publishableKeyHeaders = publishableKeyHeaders;
    // The default production adapter uses the first-party proxy; injected test/local URLs remain direct.
    this.useSameOriginProxy = baseUrl === undefined;
  }

  private async rows<T>(table: string, values: Record<string, string>, signal?: AbortSignal): Promise<T[]> {
    const sameOriginProxy = this.useSameOriginProxy;
    const query = sameOriginProxy ? { table, ...values } : values;
    const url = sameOriginProxy
      ? '/api/shramik-data?' + queryString(query)
      : this.baseUrl.replace(/\/+$/, '') + '/rest/v1/' + table + '?' + queryString(values);
    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: 'GET',
        // The public dashboard uses the same-origin proxy in production. Custom URLs
        // remain available to tests and local adapters. Neither path sends user tokens.
        headers: sameOriginProxy ? new Headers({ Accept: 'application/json' }) : this.publishableKeyHeaders(null),
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new Error('Cannot reach the SHRAMIK Supabase data API. Check network access and the project URL.');
    }
    const payload = await response.json().catch(() => null) as unknown;
    if (!response.ok) {
      const message = payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>).message || (payload as Record<string, unknown>).details
        : null;
      throw new Error(typeof message === 'string' ? message : 'Supabase data request failed (' + response.status + ').');
    }
    if (!Array.isArray(payload)) throw new Error('Supabase returned a response that did not match the expected list shape.');
    return payload as T[];
  }

  async getRegions(signal?: AbortSignal): Promise<RegionOption[]> {
    if (this.regionCache) return this.regionCache;
    const rows = await this.rows<{ id: string; name: string; code: string }>('states', {
      select: 'id,name,code', order: 'name.asc',
    }, signal);
    const states: RegionOption[] = rows.map(row => ({ code: row.code, label: row.name, level: 'state' }));
    rows.forEach(row => this.stateIdByCode.set(row.code, row.id));
    this.regionCache = [{ code: 'IN', label: 'India (National)', level: 'national' }, ...states];
    return this.regionCache;
  }

  /**
   * Minimal source-backed rows used as a resilient fallback when a convenience
   * dashboard view is unavailable. Pagination is required because seat-capacity
   * data has more rows than the REST API's usual 1,000-row page.
   */
  private async getDashboardMetricRows(signal?: AbortSignal): Promise<SourceMetricRow[]> {
    const all: SourceMetricRow[] = [];
    const metricCodes = 'in.(ESHRAM_REGISTRATION_COUNT,CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE,CTS_ITI_COUNT,CWS_UR,UR)';
    for (let offset = 0; offset < 10000; offset += 1000) {
      const page = await this.rows<SourceMetricRow>('source_metric_observations', {
        select: 'id,metric_code,value_numeric,unit,state_id,reference_period,as_of_date,dimension_values,provenance_state,is_synthetic',
        metric_code: metricCodes,
        provenance_state: 'eq.SOURCE_BACKED',
        is_synthetic: 'eq.false',
        order: 'metric_code.asc,reference_period.asc,state_id.asc,id.asc',
        limit: '1000',
        offset: String(offset),
      }, signal);
      all.push(...page);
      if (page.length < 1000) break;
    }
    return all;
  }

  private sourceBackedDashboardCards(regionCode: string, rows: SourceMetricRow[]): MetricCardData[] {
    const stateId = regionCode === 'IN' ? null : (this.stateIdByCode.get(regionCode) || 'IN-' + regionCode);
    const latestPeriod = <T extends { reference_period: string }>(items: T[]): T[] => {
      if (!items.length) return [];
      const period = items.map(item => item.reference_period).sort().at(-1);
      return items.filter(item => item.reference_period === period);
    };
    const directCard = (code: string, value: number, unit: string, sampleRows: SourceMetricRow[], note: string): MetricCardData | null => {
      const sample = sampleRows[0];
      if (!sample || !Number.isFinite(value)) return null;
      const dimensions = sample.dimension_values || {};
      const row: PublishedRateRow = {
        metric_code: code,
        value_numeric: value,
        unit,
        reference_period: sample.reference_period,
        dimension_values: dimensions,
        provenance_state: 'SOURCE_BACKED',
        is_synthetic: false,
      };
      return kpiFrom(row, {
        sourceLabel: SUPABASE_SOURCE_LABEL,
        sourceUrl: typeof dimensions.source_url === 'string' ? dimensions.source_url : undefined,
        updatedAt: sample.as_of_date || (typeof dimensions.source_value_review_date === 'string' ? dimensions.source_value_review_date : null),
        note,
      });
    };
    const cards: MetricCardData[] = [];
    const registrations = rows.filter(row => row.metric_code === 'ESHRAM_REGISTRATION_COUNT');
    let registrationRows = regionCode === 'IN'
      ? latestPeriod(registrations.filter(row => !row.state_id))
      : latestPeriod(registrations.filter(row => row.state_id === stateId));
    if (regionCode === 'IN' && !registrationRows.length) {
      // Older source snapshots may have only state-wise counts; only use them
      // when no explicit national total is available.
      registrationRows = latestPeriod(registrations.filter(row => row.state_id !== null));
    }
    if (registrationRows.length) {
      const value = registrationRows.reduce((sum, row) => sum + numberValue(row.value_numeric), 0);
      const card = directCard('ESHRAM_REGISTRATION_COUNT', value, registrationRows[0].unit, registrationRows,
        'Cumulative portal registrations; not active jobseekers or available labour supply.');
      if (card) cards.push(card);
    }

    for (const [code, note] of [
      ['CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE', 'Provisional training capacity; not trained or employed workers.'],
      ['CTS_ITI_COUNT', 'Source-backed institute counts; source coverage applies.'],
    ] as const) {
      const sourceRows = rows.filter(row => row.metric_code === code && row.state_id !== null
        && (regionCode === 'IN' || row.state_id === stateId));
      const selectedRows = latestPeriod(sourceRows);
      if (!selectedRows.length) continue;
      const value = selectedRows.reduce((sum, row) => sum + numberValue(row.value_numeric), 0);
      const card = directCard(code, value, selectedRows[0].unit, selectedRows, note);
      if (card) cards.push(card);
    }

    // The national showcase prefers the latest published monthly CWS unemployment rate.
    // Use the annual CY2025 unemployment benchmark only when the monthly national rate is absent.
    const isValidMonthlyCwsUr = (row: SourceMetricRow) =>
      row.metric_code === 'CWS_UR' &&
      /^MONTHLY_\d{4}-\d{2}$/.test(row.reference_period) &&
      row.dimension_values?.sex === 'person' &&
      row.dimension_values?.area === 'combined' &&
      row.dimension_values?.age_domain === '15_years_and_above' &&
      row.dimension_values?.survey_basis === 'current_weekly_status';
    const monthlyCandidates = rows.filter(row => isValidMonthlyCwsUr(row) &&
      (regionCode === 'IN' ? !row.state_id : row.state_id === stateId));
    const monthlyRows = latestPeriod(monthlyCandidates);
    if (regionCode === 'IN' && monthlyRows.length) {
      const card = directCard('CWS_UR', numberValue(monthlyRows[0].value_numeric),
        monthlyRows[0].unit, monthlyRows,
        'Published all-India monthly PLFS CWS unemployment rate for persons aged 15+; context only, not a forecast.');
      if (card) cards.push(card);
    } else {
      const annualCandidates = rows.filter(row => row.metric_code === 'UR' &&
        row.reference_period === 'CY2025' &&
        row.dimension_values?.sex === 'person' &&
        row.dimension_values?.area === 'combined' &&
        row.dimension_values?.age_domain === 'all_ages' &&
        (regionCode === 'IN' ? !row.state_id : row.state_id === stateId));
      const annualRows = latestPeriod(annualCandidates);
      if (annualRows.length) {
        const card = directCard('UR', numberValue(annualRows[0].value_numeric),
          annualRows[0].unit, annualRows,
          'Published PLFS annual benchmark for persons, all ages, combined rural/urban; not a model forecast.');
        if (card) cards.push(card);
      }
    }
    return cards;
  }

  private sourceBackedRanking(query: RankingsQuery, selected: { key: string; unit: string; label: string }, rows: SourceMetricRow[]): RankedRegionsResponse {
    const metricCode = selected.key === 'REGISTRATIONS' ? 'ESHRAM_REGISTRATION_COUNT'
      : selected.key === 'TRAINING_SEATS' ? 'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE' : 'CTS_ITI_COUNT';
    const groups = new Map<string, SourceMetricRow[]>();
    rows.filter(row => row.metric_code === metricCode && row.state_id !== null).forEach(row => {
      const values = groups.get(row.state_id as string) || [];
      values.push(row);
      groups.set(row.state_id as string, values);
    });
    const items = [...groups.entries()].map(([stateId, stateRows]) => {
      const newestPeriod = stateRows.map(row => row.reference_period).sort().at(-1);
      const current = stateRows.filter(row => row.reference_period === newestPeriod);
      const value = current.reduce((sum, row) => sum + numberValue(row.value_numeric), 0);
      const dimensions = current[0]?.dimension_values || {};
      const nameFromSource = typeof dimensions.state_ut_source_label === 'string' ? dimensions.state_ut_source_label : '';
      const region = this.regionCache?.find(item => item.code === stateId.replace(/^IN-/, ''));
      const name = nameFromSource || region?.label || stateId;
      return {
        code: region?.code || stateId.replace(/^IN-/, ''),
        name,
        value,
        formattedValue: compact(value),
        rank: 0,
        _period: newestPeriod || '',
        _asOfDate: current[0]?.as_of_date || null,
        _note: typeof dimensions.interpretation_note === 'string' ? dimensions.interpretation_note : null,
      };
    }).sort((a, b) => b.value - a.value).slice(0, 36)
      .map((row, index) => ({ code: row.code, name: row.name, value: row.value, formattedValue: row.formattedValue, rank: index + 1 }));
    const first = [...groups.values()].flat().sort((a, b) => b.reference_period.localeCompare(a.reference_period))[0];
    const firstDimensions = first?.dimension_values || {};
    return {
      metric: query.metric,
      unit: selected.unit,
      items,
      meta: {
        provenance: 'source-backed',
        sourceLabel: SUPABASE_SOURCE_LABEL + ' · ' + selected.label,
        updatedAt: first?.as_of_date || null,
        coverage: items.length + ' state/UT records',
        notes: [typeof firstDimensions.interpretation_note === 'string' ? firstDimensions.interpretation_note : 'Aggregated from source-backed, non-synthetic observations.'],
      },
    };
  }


  private async getPublishedRates(regionCode: string, signal?: AbortSignal): Promise<PublishedRateRow[]> {
    const filters: Record<string, string> = {
      select: 'metric_code,value_numeric,unit,reference_period,dimension_values,provenance_state,is_synthetic',
      metric_code: 'eq.UR',
      reference_period: 'eq.CY2025',
      order: 'metric_code.asc',
      limit: '100',
    };
    filters.state_id = regionCode === 'IN' ? 'is.null' : 'eq.' + (this.stateIdByCode.get(regionCode) || 'IN-' + regionCode);
    const rows = await this.rows<PublishedRateRow>('source_metric_observations', filters, signal);
    return rows.filter(row =>
      row.provenance_state === 'SOURCE_BACKED' && row.is_synthetic === false &&
      row.dimension_values?.sex === 'person' &&
      row.dimension_values?.area === 'combined' &&
      row.dimension_values?.age_domain === 'all_ages'
    );
  }

  async getProfile(signal?: AbortSignal): Promise<UserProfile> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return { id: 'public-visitor', displayName: 'Public visitor', role: 'Public access', initials: 'P', organisation: 'SHRAMIK' };
  }

  async getDashboard(query: { regionCode: string; periodYears: DashboardPeriod; signal?: AbortSignal }): Promise<DashboardSummary> {
    // Region options and PLFS enrichments are helpful, but neither may block
    // the core published KPI view. In particular, an expired browser session
    // or a temporarily unavailable optional source must not blank all cards.
    const diagnostics: string[] = [];
    let regions: RegionOption[] = [];
    try {
      regions = await this.getRegions(query.signal);
    } catch (error) {
      if (query.signal?.aborted) throw error;
      diagnostics.push('The region selector could not be refreshed; published dashboard indicators were loaded independently.');
    }
    const regionName = regions.find(item => item.code === query.regionCode)?.label || query.regionCode;
    let cards: MetricCardData[] = [];
    let sourceFallbackAttempted = false;
    try {
      if (query.regionCode === 'IN') {
        const rows = await this.rows<KpiRow>('sh_public_dashboard_kpis', {
          select: 'metric_code,title,value_numeric,unit,reference_period,source_label,source_url,as_of_date,interpretation_note,sort_order',
          order: 'sort_order.asc',
        }, query.signal);
        // Keep the national hero to four unambiguous cards. Monthly CWS UR takes precedence
        // over the separate annual CY2025 UR benchmark, never alongside it.
        const preferredCodes = [
          'ESHRAM_REGISTRATION_COUNT',
          'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE',
          'CTS_ITI_COUNT',
          rows.some(row => row.metric_code === 'CWS_UR') ? 'CWS_UR' : 'UR',
        ];
        cards = preferredCodes.flatMap(code => {
          const row = rows.find(item => item.metric_code === code);
          return row ? [kpiFrom(row, sourceForKpi(row))] : [];
        });
      } else {
        const stateId = this.stateIdByCode.get(query.regionCode) || 'IN-' + query.regionCode;
        const rows = await this.rows<RegionalRow>('sh_public_dashboard_regions', {
          select: 'metric_key,metric_label,state_id,state_name,value_numeric,unit,reference_period,source_label,source_url,as_of_date,interpretation_note',
          state_id: 'eq.' + stateId,
          order: 'metric_key.asc',
        }, query.signal);
        cards = rows.map(row => {
          const code = row.metric_key === 'REGISTRATIONS' ? 'ESHRAM_REGISTRATION_COUNT'
            : row.metric_key === 'TRAINING_SEATS' ? 'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE' : 'CTS_ITI_COUNT';
          const kpiRow: KpiRow = {
            metric_code: code, title: row.metric_label, value_numeric: row.value_numeric, unit: row.unit,
            reference_period: row.reference_period, source_label: row.source_label, source_url: row.source_url,
            as_of_date: row.as_of_date, interpretation_note: row.interpretation_note,
          };
          return kpiFrom(kpiRow, sourceForRegional(row), code);
        });
      }
    } catch {
      if (query.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      sourceFallbackAttempted = true;
      diagnostics.push('The published dashboard view was unavailable; indicators were recovered directly from source-backed database observations.');
      cards = this.sourceBackedDashboardCards(query.regionCode, await this.getDashboardMetricRows(query.signal));
    }
    if (cards.length === 0 && !sourceFallbackAttempted) {
      if (query.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      diagnostics.push('The published dashboard view returned no rows; source-backed observations were checked for available indicators.');
      cards = this.sourceBackedDashboardCards(query.regionCode, await this.getDashboardMetricRows(query.signal));
    }

    let rateRows: PublishedRateRow[] = [];
    try {
      rateRows = await this.getPublishedRates(query.regionCode, query.signal);
    } catch (error) {
      if (query.signal?.aborted) throw error;
      diagnostics.push('Some optional PLFS published benchmarks could not be loaded. The published dashboard indicators remain available; benchmark enrichment can be retried.');
    }
    for (const row of rateRows) {
      if (row.metric_code !== 'UR') continue;
      if (query.regionCode === 'IN' && cards.some(card => card.id === 'cws-ur')) continue;
      if (cards.some(card => card.id === metricId(row.metric_code))) continue;
      const sourceUrl = typeof row.dimension_values.source_url === 'string' ? row.dimension_values.source_url : undefined;
      const reviewDate = typeof row.dimension_values.source_value_review_date === 'string' ? row.dimension_values.source_value_review_date : null;
      cards.push(kpiFrom(row, {
        sourceLabel: 'PLFS 2025 Annual Report published benchmark',
        sourceUrl, updatedAt: reviewDate,
        note: typeof row.dimension_values.validation_caveat === 'string' ? row.dimension_values.validation_caveat : 'Published benchmark, not an estimator output.',
      }));
    }

    // These supporting reads populate the dashboard with real reference catalogues and
    // published training context while keeping analytical outputs strictly evidence-gated.
    let skillCatalogue: CatalogueRow[] = [];
    let sectorCatalogue: CatalogueRow[] = [];
    let programmeMetrics: SourceMetricRow[] = [];
    const supportingReads = await Promise.allSettled([
      this.rows<CatalogueRow>('skills', {
        select: 'id,code,name,description,is_active',
        order: 'name.asc',
        limit: '100',
      }, query.signal),
      this.rows<CatalogueRow>('sectors', {
        select: 'id,code,name,description',
        is_active: 'eq.true',
        order: 'name.asc',
        limit: '100',
      }, query.signal),
      this.rows<SourceMetricRow>('source_metric_observations', {
        select: 'id,metric_code,value_numeric,unit,state_id,reference_period,as_of_date,dimension_values,provenance_state,is_synthetic',
        metric_code: `in.(${NAPS_METRIC},${PMKVY_METRIC})`,
        provenance_state: 'eq.SOURCE_BACKED',
        is_synthetic: 'eq.false',
        order: 'metric_code.asc,reference_period.asc,state_id.asc,id.asc',
        limit: '1000',
      }, query.signal),
    ]);
    if (supportingReads[0].status === 'fulfilled') skillCatalogue = supportingReads[0].value;
    else diagnostics.push('The canonical skill catalogue could not be loaded for dashboard context.');
    if (supportingReads[1].status === 'fulfilled') sectorCatalogue = supportingReads[1].value;
    else diagnostics.push('The canonical sector catalogue could not be loaded for dashboard context.');
    if (supportingReads[2].status === 'fulfilled') programmeMetrics = supportingReads[2].value;
    else {
      if (query.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      diagnostics.push('Published training-programme context could not be loaded for the selected dashboard.');
    }
    const selectedStateId = this.stateIdByCode.get(query.regionCode) || 'IN-' + query.regionCode;
    const selectedProgrammeRows = programmeRowsForRegion(programmeMetrics, query.regionCode, selectedStateId);
    const programmeTrend = trainingProgrammeTrend(selectedProgrammeRows).slice(-query.periodYears);
    const skillCatalogueRows = catalogueDashboardRows(skillCatalogue, 'skill');
    const sectorCatalogueRows = catalogueDashboardRows(sectorCatalogue, 'sector');
    const trainingContextRows = trainingProgrammeContextRows(selectedProgrammeRows, query.regionCode,
      regions.filter(item => item.level === 'state').length);
    cards.sort((a, b) => {
      const order: Record<string, number> = {
        'eshram-registration-count': 1,
        'cts-provisional-seat-capacity-by-trade-state': 2,
        'cts-iti-count': 3,
        'cws-ur': 4,
        ur: 4,
      };
      return (order[a.id] || 99) - (order[b.id] || 99);
    });
    const sourceDates = cards.map(card => card.meta.updatedAt).filter((value): value is string => Boolean(value));
    const latest = sourceDates.sort().at(-1) || null;
    const meta: DataMeta = {
      provenance: 'source-backed',
      sourceLabel: SUPABASE_SOURCE_LABEL,
      updatedAt: latest,
      coverage: query.regionCode === 'IN' ? 'National published indicators and state/UT source snapshots' : 'Published source-backed indicators available for ' + regionName,
      notes: [
        'Demand observation, supply observation and forecast result tables do not yet have validated rows. No demand/supply time-series or forecast values are fabricated.',
        'Published benchmarks and source snapshots retain their own units, dates, and interpretation limits.',
        ...diagnostics,
      ],
    };
    return {
      regionCode: query.regionCode, regionName, periodYears: query.periodYears, kpis: cards,
      trend: programmeTrend,
      trendKind: programmeTrend.length >= 2 ? 'training-programmes' : undefined,
      emergingSkills: skillCatalogueRows,
      sectorGaps: sectorCatalogueRows,
      occupationForecasts: trainingContextRows,
      meta,
    };
  }

  async getRegionRankings(query: RankingsQuery): Promise<RankedRegionsResponse> {
    // The view is the preferred path; source-backed observations are the fallback.
    const metricMap: Record<RegionMetric, { key: string; unit: string; label: string }> = {
      demand: { key: 'REGISTRATIONS', unit: 'registrations', label: 'e-Shram registrations' },
      supply: { key: 'TRAINING_SEATS', unit: 'seats', label: 'Provisional CTS seat capacity' },
      'skill-gap': { key: 'ITI_COUNT', unit: 'ITIs', label: 'Industrial Training Institutes' },
    };
    const selected = metricMap[query.metric];
    try {
      const rows = await this.rows<RegionalRow>('sh_public_dashboard_regions', {
        select: 'metric_key,metric_label,state_id,state_name,value_numeric,unit,reference_period,source_label,source_url,as_of_date,interpretation_note',
        metric_key: 'eq.' + selected.key,
        order: 'value_numeric.desc',
        limit: '36',
      }, query.signal);
      const items: RankedRegion[] = rows.map((row, index) => {
        const value = numberValue(row.value_numeric);
        return {
          code: this.regionCache?.find(region => region.label === row.state_name)?.code || row.state_id.replace(/^IN-/, ''),
          name: row.state_name,
          value,
          formattedValue: compact(value),
          rank: index + 1,
        };
      });
      const first = rows[0];
      return {
        metric: query.metric,
        unit: selected.unit,
        items,
        meta: {
          provenance: 'source-backed',
          sourceLabel: SUPABASE_SOURCE_LABEL + ' · ' + selected.label,
          updatedAt: first?.as_of_date || null,
          coverage: rows.length + ' state/UT records',
          notes: first?.interpretation_note ? [first.interpretation_note] : [],
        },
      };
    } catch {
      if (query.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const metrics = await this.getDashboardMetricRows(query.signal);
      return this.sourceBackedRanking(query, selected, metrics);
    }
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const q = query.query.trim().toLocaleLowerCase();
    if (!q) return [];
    const [regions, sectors, skills] = await Promise.all([
      this.getRegions(query.signal),
      this.rows<{ id: string; code: string; name: string; description: string | null }>('sectors', { select: 'id,code,name,description', is_active: 'eq.true', order: 'name.asc' }, query.signal),
      this.rows<{ id: string; code: string; name: string; description: string | null }>('skills', { select: 'id,code,name,description', is_active: 'eq.true', order: 'name.asc' }, query.signal),
    ]);
    const regionResults: SearchResult[] = regions.filter(item => item.label.toLocaleLowerCase().includes(q)).map(item => ({
      id: item.code, label: item.label, description: 'Published state/UT geography', kind: 'region', target: 'dashboard',
    }));
    const sectorResults: SearchResult[] = sectors.filter(item => (item.name + ' ' + item.code + ' ' + (item.description || '')).toLocaleLowerCase().includes(q)).map(item => ({
      id: item.id, label: item.name, description: 'Sector taxonomy · ' + item.code, kind: 'sector', target: 'skill-gaps',
    }));
    const skillResults: SearchResult[] = skills.filter(item => (item.name + ' ' + item.code + ' ' + (item.description || '')).toLocaleLowerCase().includes(q)).map(item => ({
      id: item.id, label: item.name, description: 'Skill taxonomy · ' + item.code, kind: 'skill', target: 'emerging-skills',
    }));
    return [...regionResults, ...skillResults, ...sectorResults].slice(0, 10);
  }

  async getNotifications(signal?: AbortSignal): Promise<NotificationItem[]> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return [];
  }
  async markNotificationRead(_id: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  }
  async getIndicatorDetail(id: string, query: DetailQuery): Promise<DetailPayload> {
    const dashboard = await this.getDashboard({ regionCode: query.regionCode, periodYears: 5, signal: query.signal });
    const metric = dashboard.kpis.find(item => item.id === id || item.title.toLowerCase() === id.toLowerCase());
    if (!metric) return this.getSectionDetail(id, query);
    return {
      id: metric.id, title: metric.title, description: metric.subtitle,
      facts: [
        { label: 'Published value', value: metric.formattedValue + (metric.unit ? ' ' + metric.unit : '') },
        { label: 'Reference period', value: metric.meta.updatedAt || 'See source notes' },
        { label: 'Data provenance', value: metric.meta.sourceLabel },
      ],
      meta: metric.meta,
    };
  }
  async getSectionDetail(section: string, query: DetailQuery): Promise<DetailPayload> {
    const labels: Record<string, string> = {
      demand: 'Labour demand', 'skill-gaps': 'Skill gaps', forecasts: 'Forecasts',
      'emerging-skills': 'Emerging skills', 'regional-intelligence': 'Regional intelligence',
    };
    const title = labels[section] || section.replace(/-/g, ' ');
    const unavailable = section === 'demand' || section === 'skill-gaps' || section === 'forecasts' || section === 'emerging-skills';
    return {
      id: section, title, description: unavailable
        ? 'This module is connected to SHRAMIK live source metadata, but it has no validated analytical output to display yet.'
        : 'Source-backed information currently available for the selected workspace view.',
      facts: [
        { label: 'Selected geography', value: query.regionCode },
        { label: 'Data availability', value: unavailable ? 'No validated observations/results published' : 'See available source-backed dashboard indicators' },
        { label: 'Next data requirement', value: unavailable ? 'Populate and validate the corresponding observation or model-result table' : 'Use source notes and dates shown on dashboard indicators' },
      ],
      meta: {
        provenance: 'source-backed', sourceLabel: SUPABASE_SOURCE_LABEL, updatedAt: null,
        notes: ['The UI intentionally leaves demand, supply, emerging-skill and forecast results blank rather than substituting illustrative values.'],
      },
    };
  }
}
