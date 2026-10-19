import type {
  DashboardQuery, DashboardSummary, DetailPayload, DetailQuery, LabourMarketDataAdapter,
  NotificationItem, RankedRegionsResponse, RankingsQuery, RegionOption, SearchQuery,
  SearchResult, UserProfile,
} from './contracts';

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number, readonly path: string) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type RestAdapterOptions = {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  fetchImpl?: typeof fetch;
};

type ApiEnvelope<T> = T | { data: T; meta?: unknown };

/** REST implementation for the backend contract described in docs/API_CONTRACT.md. */
export class RestLabourMarketDataAdapter implements LabourMarketDataAdapter {
  readonly mode = 'rest' as const;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly getAccessToken?: RestAdapterOptions['getAccessToken'];

  constructor(options: RestAdapterOptions) {
    const trimmed = options.baseUrl.replace(/\/+$/, '');
    this.baseUrl = trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.getAccessToken = options.getAccessToken;
  }

  private async request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const token = await this.getAccessToken?.();
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: signal ?? init.signal ?? undefined,
        credentials: init.credentials ?? 'include',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiRequestError('Cannot reach the SHRAMIK API. Check the API URL and network connection.', 0, path);
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new ApiRequestError(detail.trim() || `Request failed (${response.status}).`, response.status, path);
    }
    if (response.status === 204) return undefined as T;
    const payload = await response.json() as ApiEnvelope<T>;
    return typeof payload === 'object' && payload !== null && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  getRegions(signal?: AbortSignal): Promise<RegionOption[]> {
    return this.request('/regions', {}, signal);
  }
  getProfile(signal?: AbortSignal): Promise<UserProfile> {
    return this.request('/me', {}, signal);
  }
  getDashboard(query: DashboardQuery): Promise<DashboardSummary> {
    const params = new URLSearchParams({ region: query.regionCode, period: `${query.periodYears}y` });
    return this.request(`/dashboard/summary?${params}`, {}, query.signal);
  }
  getRegionRankings(query: RankingsQuery): Promise<RankedRegionsResponse> {
    const params = new URLSearchParams({ region: query.regionCode, metric: query.metric });
    return this.request(`/dashboard/regions/rankings?${params}`, {}, query.signal);
  }
  search(query: SearchQuery): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query.query, region: query.regionCode });
    return this.request(`/search?${params}`, {}, query.signal);
  }
  getNotifications(signal?: AbortSignal): Promise<NotificationItem[]> {
    return this.request('/notifications', {}, signal);
  }
  markNotificationRead(id: string, signal?: AbortSignal): Promise<void> {
    return this.request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }, signal);
  }
  getIndicatorDetail(id: string, query: DetailQuery): Promise<DetailPayload> {
    const params = new URLSearchParams({ region: query.regionCode });
    return this.request(`/dashboard/indicators/${encodeURIComponent(id)}?${params}`, {}, query.signal);
  }
  getSectionDetail(section: string, query: DetailQuery): Promise<DetailPayload> {
    const params = new URLSearchParams({ region: query.regionCode });
    return this.request(`/dashboard/details/${encodeURIComponent(section)}?${params}`, {}, query.signal);
  }
}
