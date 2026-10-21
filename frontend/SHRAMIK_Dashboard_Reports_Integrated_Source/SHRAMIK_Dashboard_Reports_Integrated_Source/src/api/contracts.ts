/** Canonical API contract used by every SHRAMIK dashboard component. */
export type Provenance = 'source-backed' | 'derived' | 'mixed' | 'mock';
export type RegionMetric = 'demand' | 'supply' | 'skill-gap';
export type DashboardPeriod = 3 | 5;

export interface DataMeta {
  provenance: Provenance;
  sourceLabel: string;
  updatedAt: string | null;
  coverage?: string;
  notes?: string[];
}

export interface RegionOption {
  code: string;
  label: string;
  level: 'national' | 'state' | 'region';
}

export interface MetricCardData {
  id: string;
  key: 'demand' | 'supply' | 'skill-gap' | 'emerging-skills' | string;
  title: string;
  subtitle: string;
  value: number;
  formattedValue: string;
  unit: string;
  deltaPct: number | null;
  context: string;
  trend: number[];
  meta: DataMeta;
}

export interface TrendPoint {
  year: number;
  /** Human-readable fiscal/calendar period label for the x-axis. */
  label?: string;
  demand: number;
  supply: number;
}

export interface RankedRegion {
  code: string;
  name: string;
  value: number;
  formattedValue: string;
  rank?: number;
  level?: 'high' | 'medium' | 'low';
}

export interface RankedRegionsResponse {
  metric: RegionMetric;
  unit: string;
  items: RankedRegion[];
  meta: DataMeta;
}

export interface DashboardRow {
  id: string;
  name: string;
  deltaPct?: number;
  formattedDelta?: string;
  value?: number;
  formattedValue?: string;
  /** Bar length is a display score from 0 to 100, not the underlying statistic. */
  displayScore?: number;
  tone: 'navy' | 'teal' | 'orange';
  iconKey: string;
  meta?: DataMeta;
}

export interface DashboardSummary {
  regionCode: string;
  regionName: string;
  periodYears: DashboardPeriod;
  kpis: MetricCardData[];
  trend: TrendPoint[];
  /** Identifies what the two live series actually measure; never relabel programme counts as labour demand/supply. */
  trendKind?: 'demand-supply' | 'training-programmes';
  emergingSkills: DashboardRow[];
  sectorGaps: DashboardRow[];
  occupationForecasts: DashboardRow[];
  meta: DataMeta;
}

export interface SearchResult {
  id: string;
  label: string;
  description: string;
  kind: 'skill' | 'occupation' | 'sector' | 'region' | 'indicator' | 'report';
  target: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  severity: 'info' | 'success' | 'warning';
}

export interface UserProfile {
  id: string;
  displayName: string;
  role: string;
  initials: string;
  organisation?: string;
}

export interface DetailTable {
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
}

export interface DetailPayload {
  id: string;
  title: string;
  description: string;
  facts: Array<{ label: string; value: string }>;
  table?: DetailTable;
  meta: DataMeta;
}

export interface DashboardQuery {
  regionCode: string;
  periodYears: DashboardPeriod;
  signal?: AbortSignal;
}

export interface RankingsQuery {
  regionCode: string;
  metric: RegionMetric;
  signal?: AbortSignal;
}

export interface SearchQuery {
  query: string;
  regionCode: string;
  signal?: AbortSignal;
}

export interface DetailQuery {
  regionCode: string;
  signal?: AbortSignal;
}

/**
 * All dashboard-facing reads and mutations go through this interface.
 * Components must never embed fetch URLs or hard-coded server payloads themselves.
 */
export interface LabourMarketDataAdapter {
  readonly mode: 'mock' | 'rest' | 'supabase';
  getRegions(signal?: AbortSignal): Promise<RegionOption[]>;
  getProfile(signal?: AbortSignal): Promise<UserProfile>;
  getDashboard(query: DashboardQuery): Promise<DashboardSummary>;
  getRegionRankings(query: RankingsQuery): Promise<RankedRegionsResponse>;
  search(query: SearchQuery): Promise<SearchResult[]>;
  getNotifications(signal?: AbortSignal): Promise<NotificationItem[]>;
  markNotificationRead(id: string, signal?: AbortSignal): Promise<void>;
  getIndicatorDetail(id: string, query: DetailQuery): Promise<DetailPayload>;
  getSectionDetail(section: string, query: DetailQuery): Promise<DetailPayload>;
}
