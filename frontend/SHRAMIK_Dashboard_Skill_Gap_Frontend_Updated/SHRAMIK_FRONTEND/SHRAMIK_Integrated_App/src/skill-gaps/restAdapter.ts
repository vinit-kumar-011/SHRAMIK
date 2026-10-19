import type {
  GapDetailPayload, GapEntityType, GapFilterOptions, GapFilters, GapInsight, GapLandscape, GapMetricKey,
  GapOverview, RankedSkillsQuery, RankedSkillsResponse, RegionalGapResponse, SectorFlowResponse, SkillGapDataAdapter,
} from './types';

export class SkillGapApiError extends Error {
  constructor(message: string, readonly status: number, readonly endpoint: string, readonly code?: string, readonly requestId?: string) {
    super(message); this.name = 'SkillGapApiError';
  }
}

type ApiEnvelope<T> = T | { data: T; meta?: unknown };
type RestOptions = { baseUrl: string; fetchImpl?: typeof fetch; getAccessToken?: () => string | null | Promise<string | null> };

function apiPath(baseUrl: string): string {
  const clean = baseUrl.replace(/\/+$/, '');
  if (clean.endsWith('/api/v1/skill-gaps')) return clean;
  if (clean.endsWith('/api/v1')) return `${clean}/skill-gaps`;
  return `${clean}/api/v1/skill-gaps`;
}
function filterParams(filters: GapFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== null && value !== '') params.set(key, value);
  return params;
}

/** REST adapter following SHRAMIK_SKILL_GAP_ANALYSIS_API_CONTRACT.md. No mock fallback on errors. */
export class RestSkillGapDataAdapter implements SkillGapDataAdapter {
  readonly mode = 'rest' as const;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly getAccessToken?: RestOptions['getAccessToken'];

  constructor(options: RestOptions) {
    this.baseUrl = apiPath(options.baseUrl);
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.getAccessToken = options.getAccessToken;
  }

  private async request<T>(endpoint: string, params?: URLSearchParams, signal?: AbortSignal): Promise<T> {
    const token = await this.getAccessToken?.();
    const query = params?.toString();
    const url = `${this.baseUrl}${endpoint}${query ? `?${query}` : ''}`;
    const headers = new Headers({ Accept: 'application/json' });
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try {
      response = await this.fetchImpl(url, { method: 'GET', headers, credentials: 'include', signal });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') throw reason;
      throw new SkillGapApiError('Cannot reach the SHRAMIK Skill Gap API. Check the API URL and network connection.', 0, endpoint);
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { code?: string; message?: string; requestId?: string; error?: { code?: string; message?: string; requestId?: string } } | null;
      const code = payload?.code ?? payload?.error?.code;
      const requestId = payload?.requestId ?? payload?.error?.requestId;
      const message = payload?.message ?? payload?.error?.message ?? `Request failed (${response.status}).`;
      throw new SkillGapApiError(message, response.status, endpoint, code, requestId);
    }
    if (response.status === 204) return undefined as T;
    const body = await response.json() as ApiEnvelope<T>;
    return typeof body === 'object' && body !== null && 'data' in body ? (body as { data: T }).data : body as T;
  }

  getFilterOptions(signal?: AbortSignal): Promise<GapFilterOptions> { return this.request('/filters', undefined, signal); }
  getOverview(filters: GapFilters, signal?: AbortSignal): Promise<GapOverview> { return this.request('/overview', filterParams(filters), signal); }
  getGapLandscape(filters: GapFilters, signal?: AbortSignal): Promise<GapLandscape> { return this.request('/landscape', filterParams(filters), signal); }
  getRegionalGaps(filters: GapFilters, metric: GapMetricKey, signal?: AbortSignal): Promise<RegionalGapResponse> {
    const params = filterParams(filters); params.set('metric', metric); return this.request('/regions', params, signal);
  }
  getRankedSkills(filters: GapFilters, query: RankedSkillsQuery, signal?: AbortSignal): Promise<RankedSkillsResponse> {
    const params = filterParams(filters); params.set('sort', query.sort); params.set('direction', query.direction); params.set('page', String(query.page)); params.set('pageSize', String(query.pageSize)); return this.request('/skills', params, signal);
  }
  getSkillGapInsights(filters: GapFilters, signal?: AbortSignal): Promise<GapInsight[]> { return this.request('/insights', filterParams(filters), signal); }
  getSectorFlow(filters: GapFilters, sectorCode: string, signal?: AbortSignal): Promise<SectorFlowResponse> {
    const params = filterParams(filters); if (sectorCode) params.set('sectorCode', sectorCode); return this.request('/sector-flow', params, signal);
  }
  getDetail(type: GapEntityType, id: string, filters: GapFilters, signal?: AbortSignal): Promise<GapDetailPayload> {
    const params = filterParams(filters); return this.request(`/details/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, params, signal);
  }
}
