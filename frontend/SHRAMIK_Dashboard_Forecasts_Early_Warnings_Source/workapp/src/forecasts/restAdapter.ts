import type {
  AlertDetailResponse, EarlyWarning, ForecastFilterOptions, ForecastFilters, ForecastRequestOptions,
  ForecastSeriesResponse, ForecastsDataAdapter, MetricValue, ModelPerformanceResponse, RiskCell,
  RiskDetailResponse, RiskMatrixResponse, ScenarioComparisonResponse, ScenarioOptionsResponse, StateRiskMapResponse,
} from './types';

export class ForecastsApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message); this.name = 'ForecastsApiError'; this.status = status; this.code = code;
  }
}
type FetchLike = typeof fetch;
interface RestOptions { baseUrl: string; getAccessToken?: () => string | null | Promise<string | null>; fetchImpl?: FetchLike }

function normalizePrefix(baseUrl: string): string {
  const root = baseUrl.trim().replace(/\/+$/, '');
  if (/\/api\/v1\/forecasts$/i.test(root)) return root;
  if (/\/api\/v1$/i.test(root)) return `${root}/forecasts`;
  return `${root}/api/v1/forecasts`;
}
function queryFor(filters: ForecastFilters, extra: Record<string, string | number | undefined> = {}): string {
  const params = new URLSearchParams();
  params.set('horizonYears', String(filters.horizonYears));
  if (filters.geographyCode) params.set('geographyCode', filters.geographyCode);
  if (filters.stateCode) params.set('stateCode', filters.stateCode);
  if (filters.sectorCode) params.set('sectorCode', filters.sectorCode);
  if (filters.occupationCode) params.set('occupationCode', filters.occupationCode);
  if (filters.skillCode) params.set('skillCode', filters.skillCode);
  if (filters.period) params.set('period', filters.period);
  for (const [key, value] of Object.entries(extra)) if (value !== undefined && value !== '') params.set(key, String(value));
  return params.toString();
}

export class RestForecastsAdapter implements ForecastsDataAdapter {
  readonly mode = 'rest' as const;
  private readonly prefix: string;
  private readonly getAccessToken: RestOptions['getAccessToken'];
  private readonly fetchImpl: FetchLike;
  constructor(options: RestOptions) {
    if (!options.baseUrl.trim()) throw new Error('A SHRAMIK API base URL is required for REST mode.');
    this.prefix = normalizePrefix(options.baseUrl);
    this.getAccessToken = options.getAccessToken;
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }
  private async request<T>(path: string, init: RequestInit = {}, options?: ForecastRequestOptions): Promise<T> {
    const token = await this.getAccessToken?.();
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.prefix}${path}`, { ...init, headers, credentials: 'include', signal: options?.signal ?? init.signal });
    } catch (error) {
      if (options?.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
      throw new ForecastsApiError(error instanceof Error ? `Forecast service is unreachable: ${error.message}` : 'Forecast service is unreachable.', 0, 'NETWORK_ERROR');
    }
    if (response.status === 204) return undefined as T;
    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json') ? await response.json().catch(() => null) : await response.text().catch(() => '');
    if (!response.ok) {
      const message = typeof body === 'string' ? body : body?.message ?? body?.error ?? `Forecast service returned HTTP ${response.status}.`;
      const code = typeof body === 'object' && body ? body.code : undefined;
      throw new ForecastsApiError(String(message), response.status, typeof code === 'string' ? code : undefined);
    }
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'data')) return body.data as T;
    return body as T;
  }
  private path(route: string, query = ''): string { return `/${route}${query ? `?${query}` : ''}`; }
  async getFilterOptions(options?: ForecastRequestOptions): Promise<ForecastFilterOptions> {
    return this.request(this.path('filter-options'), {}, options);
  }
  async getOverview(filters: ForecastFilters, options?: ForecastRequestOptions): Promise<{ kpis: MetricValue[]; meta: import('./types').DataMeta }> {
    return this.request(this.path('overview', queryFor(filters)), {}, options);
  }
  async getSeries(filters: ForecastFilters, viewBy: 'total' | 'sector' | 'occupation' | 'region', options?: ForecastRequestOptions): Promise<ForecastSeriesResponse> {
    return this.request(this.path('series', queryFor(filters, { viewBy })), {}, options);
  }
  async getWarnings(filters: ForecastFilters, params?: { limit?: number; category?: string }, options?: ForecastRequestOptions): Promise<{ items: EarlyWarning[]; counts: Record<string, number>; meta: import('./types').DataMeta }> {
    return this.request(this.path('warnings', queryFor(filters, { limit: params?.limit, category: params?.category })), {}, options);
  }
  async getRiskMatrix(filters: ForecastFilters, entityType: RiskCell['entityType'], options?: ForecastRequestOptions): Promise<RiskMatrixResponse> {
    return this.request(this.path('risk-matrix', queryFor(filters, { entityType })), {}, options);
  }
  async getStateRiskMap(filters: ForecastFilters, entityType: RiskCell['entityType'], options?: ForecastRequestOptions): Promise<StateRiskMapResponse> {
    return this.request(this.path('state-risk-map', queryFor(filters, { entityType })), {}, options);
  }
  async getRiskDetails(filters: ForecastFilters, regionCode: string, entityCode: string, options?: ForecastRequestOptions): Promise<RiskDetailResponse> {
    return this.request(this.path('risk-details', queryFor(filters, { regionCode, entityCode, entityType: options?.entityType })), {}, options);
  }
  async getScenarioOptions(filters: ForecastFilters, options?: ForecastRequestOptions): Promise<ScenarioOptionsResponse> {
    return this.request(this.path('scenario-options', queryFor(filters)), {}, options);
  }
  async compareScenarios(filters: ForecastFilters, scenarioIds: string[], assumptionValues: Record<string, number> = {}, options?: ForecastRequestOptions): Promise<ScenarioComparisonResponse> {
    return this.request(this.path('scenario-comparisons'), { method: 'POST', body: JSON.stringify({ filters, scenarioIds, assumptionValues }) }, options);
  }
  async getModelPerformance(filters: ForecastFilters, options?: ForecastRequestOptions): Promise<ModelPerformanceResponse> {
    return this.request(this.path('model-performance', queryFor(filters)), {}, options);
  }
  async getAlerts(filters: ForecastFilters, params?: { status?: string; severity?: string; query?: string; page?: number; pageSize?: number }, options?: ForecastRequestOptions): Promise<{ items: EarlyWarning[]; total: number; counts: Record<string, number>; meta: import('./types').DataMeta }> {
    return this.request(this.path('alerts', queryFor(filters, { status: params?.status, severity: params?.severity, query: params?.query, page: params?.page, pageSize: params?.pageSize })), {}, options);
  }
  async getAlertDetail(id: string, options?: ForecastRequestOptions): Promise<AlertDetailResponse> {
    return this.request(this.path(`alerts/${encodeURIComponent(id)}`), {}, options);
  }
  async acknowledgeAlert(id: string, options?: ForecastRequestOptions): Promise<EarlyWarning> {
    return this.request(this.path(`alerts/${encodeURIComponent(id)}/acknowledge`), { method: 'POST', body: JSON.stringify({}) }, options);
  }
  async updateAlert(id: string, patch: { status?: EarlyWarning['status']; assigneeId?: string | null; assigneeLabel?: string | null }, options?: ForecastRequestOptions): Promise<EarlyWarning> {
    return this.request(this.path(`alerts/${encodeURIComponent(id)}`), { method: 'PATCH', body: JSON.stringify(patch) }, options);
  }
  async addAlertNote(id: string, note: string, options?: ForecastRequestOptions): Promise<{ id: string; createdAt: string }> {
    return this.request(this.path(`alerts/${encodeURIComponent(id)}/notes`), { method: 'POST', body: JSON.stringify({ note }) }, options);
  }
}
