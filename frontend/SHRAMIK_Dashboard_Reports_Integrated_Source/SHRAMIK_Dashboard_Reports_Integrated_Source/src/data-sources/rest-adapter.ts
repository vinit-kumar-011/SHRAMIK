import { DataSourcesAdapterError, type DataSourcesDataAdapter } from './DataSourcesDataAdapter';
import type { CoverageSummary, DataSourceRecord, FieldMappingRecord, IngestionRunRecord, PagedResult, SourceListQuery, SourceError } from './data-sources.types';

function safeApiError(status: number, payload: unknown): SourceError {
  const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const rawError = body.error && typeof body.error === 'object' ? body.error as Record<string, unknown> : {};
  const code = typeof rawError.code === 'string' ? rawError.code : status === 401 ? 'AUTHENTICATION_REQUIRED' : status === 403 ? 'ACCESS_DENIED' : status === 404 ? 'NOT_FOUND' : status >= 500 ? 'SERVER_ERROR' : 'REQUEST_FAILED';
  const defaultMessage = status === 401 ? 'Sign in is required to view data sources.' : status === 403 ? 'You do not have permission to view this resource.' : status === 404 ? 'The requested resource is not configured or could not be found.' : status >= 500 ? 'The SHRAMIK service is temporarily unavailable.' : 'The request could not be completed.';
  return {
    code,
    message: typeof rawError.message === 'string' ? rawError.message : defaultMessage,
    retryable: typeof rawError.retryable === 'boolean' ? rawError.retryable : status === 408 || status === 429 || status >= 500,
    ...(typeof rawError.requestId === 'string' ? { requestId: rawError.requestId } : {}),
  };
}
function fail(error: SourceError): never { throw new DataSourcesAdapterError(error); }
export function createRestDataSourcesAdapter(baseUrl: string, features: { createSource?: boolean; ingestion?: boolean } = {}): DataSourcesDataAdapter {
  const base = baseUrl.replace(/\/$/, '');
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, { ...init, credentials: 'include', headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } });
    } catch {
      return fail({ code: 'NETWORK_ERROR', message: 'Could not reach the SHRAMIK API. Check the connection and retry.', retryable: true });
    }
    let body: unknown = null;
    try { body = await response.json(); } catch { /* a non-JSON payload is handled as an invalid response below */ }
    if (!response.ok) return fail(safeApiError(response.status, body));
    if (body === null) return fail({ code: 'INVALID_RESPONSE', message: 'The SHRAMIK API returned an unreadable response.', retryable: true });
    return body as T;
  }
  const adapter: DataSourcesDataAdapter = {
    listSources(query: SourceListQuery) {
      const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
      if (query.query?.trim()) params.set('query', query.query.trim());
      if (query.status && query.status !== 'ALL') params.set('status', query.status);
      if (query.type && query.type !== 'ALL') params.set('type', query.type);
      if (query.agency && query.agency !== 'ALL') params.set('agency', query.agency);
      return request<PagedResult<DataSourceRecord>>(`/data-sources?${params.toString()}`).then(validatePage<DataSourceRecord>);
    },
    getSource(id) { return request<DataSourceRecord>(`/data-sources/${encodeURIComponent(id)}`); },
    listIngestionRuns(id, options = {}) {
      const params = new URLSearchParams({ page: String(options.page ?? 1), pageSize: String(options.pageSize ?? 10) });
      return request<PagedResult<IngestionRunRecord>>(`/data-sources/${encodeURIComponent(id)}/ingestion-runs?${params.toString()}`).then(validatePage<IngestionRunRecord>);
    },
    getCoverage(id) { return request<CoverageSummary>(`/data-sources/${encodeURIComponent(id)}/coverage`); },
    getFieldMappings(id, schemaVersion) {
      const params = new URLSearchParams(); if (schemaVersion) params.set('schemaVersion', schemaVersion);
      const suffix = params.size ? `?${params.toString()}` : '';
      return request<PagedResult<FieldMappingRecord>>(`/data-sources/${encodeURIComponent(id)}/field-mappings${suffix}`).then(validatePage<FieldMappingRecord>);
    },
  };
  if (features.createSource) {
    adapter.capabilities = { createSource: true };
    adapter.createSource = input => request<DataSourceRecord>('/data-sources', { method: 'POST', body: JSON.stringify(input) });
  }
  if (features.ingestion) {
    adapter.requestIngestion = (id) => request<{ runId: string; status: 'QUEUED' | 'RUNNING' }>(`/data-sources/${encodeURIComponent(id)}/ingestion-runs`, { method: 'POST' });
  }
  return adapter;
}
function validatePage<T>(page: PagedResult<T>): PagedResult<T> {
  if (!page || !Array.isArray(page.items) || !Number.isFinite(page.total) || !Number.isFinite(page.page) || !Number.isFinite(page.pageSize)) {
    throw new DataSourcesAdapterError({ code: 'INVALID_RESPONSE', message: 'The SHRAMIK API returned data that does not match the source-registry contract.', retryable: false });
  }
  // Accept both shapes in the supplied API contract: older/top-level fields and meta.provenance/meta.updatedAt.
  return {
    ...page,
    provenance: page.provenance ?? page.meta?.provenance ?? 'UNKNOWN',
    updatedAt: page.updatedAt ?? page.meta?.updatedAt ?? null,
  };
}
