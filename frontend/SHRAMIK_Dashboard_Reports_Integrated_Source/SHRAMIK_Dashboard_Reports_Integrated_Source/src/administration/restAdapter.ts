import type { AdministrationDataAdapter, AdministrationSnapshot } from './types';

type ApiErrorBody = { error?: { message?: string }; message?: string };
export class AdministrationApiError extends Error {
  constructor(message: string, readonly status: number, readonly path: string) {
    super(message);
    this.name = 'AdministrationApiError';
  }
}

/**
 * Read-only API adapter. It intentionally does not implement role, account, or
 * access-request writes; production mutations need explicit backend authorization.
 */
export class RestAdministrationDataAdapter implements AdministrationDataAdapter {
  readonly mode = 'rest' as const;
  private readonly apiBase: string;
  constructor(baseUrl: string, private readonly fetcher: typeof fetch = fetch) {
    const trimmed = baseUrl.trim().replace(/\/+$/, '');
    this.apiBase = trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
    if (!/^https?:\/\//i.test(this.apiBase)) throw new Error('Administration API base URL must be an absolute HTTP(S) URL.');
  }
  async getSnapshot(signal?: AbortSignal): Promise<AdministrationSnapshot> {
    const path = '/admin/overview';
    let response: Response;
    try {
      response = await this.fetcher(`${this.apiBase}${path}`, { signal, credentials: 'include', headers: { Accept: 'application/json' } });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new AdministrationApiError('Cannot reach the Administration API. Check the API URL and network connection.', 0, path);
    }
    const payload = response.status === 204 ? null : await response.json().catch(() => null) as unknown;
    if (!response.ok) {
      const body = payload && typeof payload === 'object' ? payload as ApiErrorBody : {};
      throw new AdministrationApiError(body.error?.message ?? body.message ?? `Administration API request failed (${response.status}).`, response.status, path);
    }
    if (!payload) throw new AdministrationApiError('The Administration API returned an empty or unreadable response.', response.status, path);
    const snapshot = (typeof payload === 'object' && payload !== null && 'data' in payload
      ? (payload as { data: AdministrationSnapshot }).data
      : payload) as AdministrationSnapshot;
    validateSnapshot(snapshot, path);
    return snapshot;
  }
}

function validateSnapshot(snapshot: AdministrationSnapshot, path: string): void {
  if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.accessRequests) ||
      !Array.isArray(snapshot.users) || !Array.isArray(snapshot.roles) || !Array.isArray(snapshot.audit) ||
      !snapshot.meta?.provenance) {
    throw new AdministrationApiError('Administration response does not match the overview contract.', 200, path);
  }
  if (!['SOURCE_BACKED', 'DERIVED', 'MIXED', 'SYNTHETIC_DEMO'].includes(snapshot.meta.provenance)) {
    throw new AdministrationApiError('Administration response contains an unknown provenance value.', 200, path);
  }
  if (snapshot.accessRequests.some(item => !item || !item.id || !item.name || !item.email ||
      !['pending', 'approved', 'denied'].includes(item.status)) ||
      snapshot.users.some(item => !item || !item.id || !item.email || !item.role ||
        !['active', 'suspended'].includes(item.status)) ||
      snapshot.roles.some(item => !item || !item.name || !Array.isArray(item.permissions)) ||
      snapshot.audit.some(item => !item || !item.id || !item.action || !item.target)) {
    throw new AdministrationApiError('Administration response contains invalid request, user, role, or audit fields.', 200, path);
  }
}
