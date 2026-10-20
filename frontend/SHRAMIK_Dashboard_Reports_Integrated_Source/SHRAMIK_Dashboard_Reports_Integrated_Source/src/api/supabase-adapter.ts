import type {
  DashboardPeriod, DashboardSummary, DataMeta, DetailPayload, DetailQuery,
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
  };
  return titles[code] || code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function subtitleForCode(code: string, unit: string): string {
  if (code === 'ESHRAM_REGISTRATION_COUNT') return 'Cumulative portal registrations · not available labour supply';
  if (code === 'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE') return 'Provisional training capacity · not trained workers';
  if (code === 'CTS_ITI_COUNT') return 'Registered institute count · source coverage applies';
  if (code === 'UR') return 'Published annual benchmark · persons, all ages';
  if (code === 'LFPR') return 'Published annual benchmark · persons, all ages';
  if (code === 'WPR') return 'Published annual benchmark · persons, all ages';
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
    subtitle: subtitleForCode(metricCode, unit),
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

export class SupabaseLabourMarketDataAdapter implements LabourMarketDataAdapter {
  readonly mode = 'rest' as const;
  private regionCache: RegionOption[] | null = null;
  private readonly stateIdByCode = new Map<string, string>();
  constructor(
    private readonly baseUrl = SUPABASE_URL,
    private readonly fetcher: typeof fetch = fetch,
    private readonly publishableKeyHeaders = supabaseHeaders,
  ) {}

  private async rows<T>(table: string, values: Record<string, string>, signal?: AbortSignal): Promise<T[]> {
    const url = this.baseUrl.replace(/\/+$/, '') + '/rest/v1/' + table + '?' + queryString(values);
    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: 'GET',
        // Labour-market reads exposed by this adapter are deliberately public, read-only
        // surfaces guarded by Supabase RLS. Do not couple them to the sign-in session:
        // expired user tokens must not make the dashboard's public data unavailable.
        headers: this.publishableKeyHeaders(null),
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

  private async getPublishedRates(regionCode: string, signal?: AbortSignal): Promise<PublishedRateRow[]> {
    const filters: Record<string, string> = {
      select: 'metric_code,value_numeric,unit,reference_period,dimension_values,provenance_state,is_synthetic',
      metric_code: 'in.(UR,LFPR,WPR)',
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
    if (query.regionCode === 'IN') {
      const rows = await this.rows<KpiRow>('sh_public_dashboard_kpis', {
        select: 'metric_code,title,value_numeric,unit,reference_period,source_label,source_url,as_of_date,interpretation_note,sort_order',
        order: 'sort_order.asc',
      }, query.signal);
      cards = rows.map(row => kpiFrom(row, sourceForKpi(row)));
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

    let rateRows: PublishedRateRow[] = [];
    try {
      rateRows = await this.getPublishedRates(query.regionCode, query.signal);
    } catch (error) {
      if (query.signal?.aborted) throw error;
      diagnostics.push('Some optional PLFS published benchmarks could not be loaded. The published dashboard indicators remain available; benchmark enrichment can be retried.');
    }
    for (const row of rateRows) {
      if (cards.some(card => card.id === metricId(row.metric_code))) continue;
      const sourceUrl = typeof row.dimension_values.source_url === 'string' ? row.dimension_values.source_url : undefined;
      const reviewDate = typeof row.dimension_values.source_value_review_date === 'string' ? row.dimension_values.source_value_review_date : null;
      cards.push(kpiFrom(row, {
        sourceLabel: 'PLFS 2025 Annual Report published benchmark',
        sourceUrl, updatedAt: reviewDate,
        note: typeof row.dimension_values.validation_caveat === 'string' ? row.dimension_values.validation_caveat : 'Published benchmark, not an estimator output.',
      }));
    }
    cards.sort((a, b) => {
      const order: Record<string, number> = {
        'eshram-registration-count': 1,
        'cts-provisional-seat-capacity-by-trade-state': 2,
        'cts-iti-count': 3,
        ur: 4,
        lfpr: 5,
        wpr: 6,
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
      trend: [], emergingSkills: [], sectorGaps: [], occupationForecasts: [], meta,
    };
  }

  async getRegionRankings(query: RankingsQuery): Promise<RankedRegionsResponse> {
    await this.getRegions(query.signal);
    const metricMap: Record<RegionMetric, { key: string; unit: string; label: string }> = {
      demand: { key: 'REGISTRATIONS', unit: 'registrations', label: 'e-Shram registrations' },
      supply: { key: 'TRAINING_SEATS', unit: 'seats', label: 'Provisional CTS seat capacity' },
      'skill-gap': { key: 'ITI_COUNT', unit: 'ITIs', label: 'Industrial Training Institutes' },
    };
    const selected = metricMap[query.metric];
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
