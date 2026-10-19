import type {
  EmergingSkill, EmergingSkillsDataAdapter, EmergingSkillsFilters, EmergingSkillsSummary, RegionalSignal,
} from './EmergingSkillsPage';

type ApiErrorPayload = { error?: { message?: string; code?: string }; message?: string };
type ApiEnvelope<T> = T | { data: T; meta?: unknown };

/**
 * REST adapter for the proposed Emerging Skills API. The backend must implement
 * the documented paths before this adapter is enabled in a deployed environment.
 * Errors are surfaced to the page; this adapter never silently returns fixtures.
 */
export class EmergingSkillsApiError extends Error {
  constructor(message: string, readonly status: number, readonly path: string) {
    super(message);
    this.name = 'EmergingSkillsApiError';
  }
}

export class RestEmergingSkillsDataAdapter implements EmergingSkillsDataAdapter {
  private readonly apiBase: string;
  private readonly fetcher: typeof fetch;

  constructor(baseUrl: string, fetcher: typeof fetch = fetch) {
    const trimmed = baseUrl.trim().replace(/\/+$/, '');
    this.apiBase = trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
    this.fetcher = fetcher;
    if (!/^https?:\/\//i.test(this.apiBase)) {
      throw new Error('Emerging Skills API base URL must be an absolute HTTP(S) URL.');
    }
  }

  private async request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.apiBase}${path}`, {
        ...init,
        signal: signal ?? init.signal,
        credentials: init.credentials ?? 'include',
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new EmergingSkillsApiError('Cannot reach the Emerging Skills API. Check the API URL and network connection.', 0, path);
    }
    if (response.status === 204) return undefined as T;
    let payload: unknown = null;
    try { payload = await response.json(); } catch { /* invalid JSON gets an explicit contract error below */ }
    if (!response.ok) {
      const body = payload && typeof payload === 'object' ? payload as ApiErrorPayload : {};
      const message = body.error?.message ?? body.message ?? `Emerging Skills API request failed (${response.status}).`;
      throw new EmergingSkillsApiError(message, response.status, path);
    }
    if (payload == null) {
      throw new EmergingSkillsApiError('The Emerging Skills API returned an empty or unreadable response.', response.status, path);
    }
    const value = typeof payload === 'object' && payload !== null && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
    return value;
  }

  private filterQuery(filters: Partial<EmergingSkillsFilters> = {}): string {
    const params = new URLSearchParams();
    if (filters.period) params.set('period', filters.period);
    if (filters.geography) params.set('geography', filters.geography);
    if (filters.sector) params.set('sector', filters.sector);
    if (filters.category && filters.category !== 'ALL') params.set('category', filters.category);
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  async getSummary(filters: Partial<EmergingSkillsFilters> = {}, signal?: AbortSignal): Promise<EmergingSkillsSummary> {
    const summary = await this.request<EmergingSkillsSummary>(`/emerging-skills/summary${this.filterQuery(filters)}`, {}, signal);
    if (!summary || typeof summary !== 'object' || !Array.isArray(summary.topSkills) || !summary.meta?.provenance) {
      throw new EmergingSkillsApiError('Summary response does not match the Emerging Skills API contract.', 200, '/emerging-skills/summary');
    }
    return summary;
  }

  async getSkills(filters: Partial<EmergingSkillsFilters> = {}, signal?: AbortSignal): Promise<EmergingSkill[]> {
    const response = await this.request<unknown>(`/emerging-skills/skills${this.filterQuery(filters)}`, {}, signal);
    const rows = Array.isArray(response) ? response :
      response && typeof response === 'object' ?
        ((response as { items?: unknown[]; skills?: unknown[] }).items ?? (response as { skills?: unknown[] }).skills) : undefined;
    if (!Array.isArray(rows)) throw new EmergingSkillsApiError('Skills response must contain an items array.', 200, '/emerging-skills/skills');
    return rows as EmergingSkill[];
  }

  async getSkillDetail(skillId: string, filters: Partial<EmergingSkillsFilters> = {}, signal?: AbortSignal): Promise<EmergingSkill | null> {
    try {
      return await this.request<EmergingSkill>(`/emerging-skills/skills/${encodeURIComponent(skillId)}${this.filterQuery(filters)}`, {}, signal);
    } catch (error) {
      if (error instanceof EmergingSkillsApiError && error.status === 404) return null;
      throw error;
    }
  }

  async getRelationships(skillId: string, filters: Partial<EmergingSkillsFilters> = {}, signal?: AbortSignal): Promise<{ nodes: any[]; edges: any[]; meta: any } | null> {
    const value = await this.request<unknown>(`/emerging-skills/skills/${encodeURIComponent(skillId)}/relationships${this.filterQuery(filters)}`, {}, signal);
    if (value == null) return null;
    if (typeof value !== 'object' || !Array.isArray((value as { nodes?: unknown[] }).nodes) || !Array.isArray((value as { edges?: unknown[] }).edges)) {
      throw new EmergingSkillsApiError('Relationships response must contain nodes and edges arrays.', 200, '/emerging-skills/skills/{id}/relationships');
    }
    return value as { nodes: any[]; edges: any[]; meta: any };
  }

  async getRegionalSignals(skillId: string, filters: Partial<EmergingSkillsFilters> = {}, signal?: AbortSignal): Promise<RegionalSignal[] | null> {
    const value = await this.request<unknown>(`/emerging-skills/skills/${encodeURIComponent(skillId)}/regional-signals${this.filterQuery(filters)}`, {}, signal);
    if (value == null) return null;
    const rows = Array.isArray(value) ? value : value && typeof value === 'object' ? (value as { items?: unknown[] }).items : undefined;
    if (!Array.isArray(rows)) throw new EmergingSkillsApiError('Regional signal response must contain an items array.', 200, '/emerging-skills/skills/{id}/regional-signals');
    return rows as RegionalSignal[];
  }

  async getEvidence(skillId: string, filters: Partial<EmergingSkillsFilters> = {}, signal?: AbortSignal): Promise<any | null> {
    return this.request<any | null>(`/emerging-skills/skills/${encodeURIComponent(skillId)}/evidence${this.filterQuery(filters)}`, {}, signal);
  }

  async compareSkills(skillIds: string[], filters: Partial<EmergingSkillsFilters> = {}, signal?: AbortSignal): Promise<any | null> {
    return this.request<any | null>('/emerging-skills/compare', {
      method: 'POST',
      body: JSON.stringify({ skillIds, filters }),
    }, signal);
  }

  async getWatchlist(signal?: AbortSignal): Promise<string[]> {
    const value = await this.request<unknown>('/emerging-skills/watchlist', {}, signal);
    const rows = Array.isArray(value) ? value : value && typeof value === 'object' ? (value as { items?: unknown[] }).items : undefined;
    if (!Array.isArray(rows)) throw new EmergingSkillsApiError('Watchlist response must contain an items array.', 200, '/emerging-skills/watchlist');
    return rows.map(item => typeof item === 'string' ? item : item && typeof item === 'object' && typeof (item as { skillId?: unknown }).skillId === 'string' ? (item as { skillId: string }).skillId : '').filter(Boolean);
  }

  async addWatchlistItem(skillId: string, signal?: AbortSignal): Promise<boolean> {
    await this.request<unknown>(`/emerging-skills/watchlist/${encodeURIComponent(skillId)}`, { method: 'PUT' }, signal);
    return true;
  }

  async removeWatchlistItem(skillId: string, signal?: AbortSignal): Promise<boolean> {
    await this.request<unknown>(`/emerging-skills/watchlist/${encodeURIComponent(skillId)}`, { method: 'DELETE' }, signal);
    return true;
  }

  async getSkillAlerts(signal?: AbortSignal): Promise<any[]> {
    const value = await this.request<unknown>('/emerging-skills/alerts', {}, signal);
    const rows = Array.isArray(value) ? value : value && typeof value === 'object' ? (value as { items?: unknown[] }).items : undefined;
    if (!Array.isArray(rows)) throw new EmergingSkillsApiError('Alerts response must contain an items array.', 200, '/emerging-skills/alerts');
    return rows;
  }
}
