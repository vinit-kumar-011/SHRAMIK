import { DataSourcesAdapterError } from './DataSourcesDataAdapter';
function safeApiError(status, payload) {
    const body = payload && typeof payload === 'object' ? payload : {};
    const rawError = body.error && typeof body.error === 'object' ? body.error : {};
    const code = typeof rawError.code === 'string' ? rawError.code : status === 401 ? 'AUTHENTICATION_REQUIRED' : status === 403 ? 'ACCESS_DENIED' : status === 404 ? 'NOT_FOUND' : status >= 500 ? 'SERVER_ERROR' : 'REQUEST_FAILED';
    const defaultMessage = status === 401 ? 'Sign in is required to view data sources.' : status === 403 ? 'You do not have permission to view this resource.' : status === 404 ? 'The requested resource is not configured or could not be found.' : status >= 500 ? 'The SHRAMIK service is temporarily unavailable.' : 'The request could not be completed.';
    return {
        code,
        message: typeof rawError.message === 'string' ? rawError.message : defaultMessage,
        retryable: typeof rawError.retryable === 'boolean' ? rawError.retryable : status === 408 || status === 429 || status >= 500,
        ...(typeof rawError.requestId === 'string' ? { requestId: rawError.requestId } : {}),
    };
}
function fail(error) { throw new DataSourcesAdapterError(error); }
export function createRestDataSourcesAdapter(baseUrl, features = {}) {
    const base = baseUrl.replace(/\/$/, '');
    async function request(path, init) {
        let response;
        try {
            response = await fetch(`${base}${path}`, { ...init, credentials: 'include', headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } });
        }
        catch {
            return fail({ code: 'NETWORK_ERROR', message: 'Could not reach the SHRAMIK API. Check the connection and retry.', retryable: true });
        }
        let body = null;
        try {
            body = await response.json();
        }
        catch { /* a non-JSON payload is handled as an invalid response below */ }
        if (!response.ok)
            return fail(safeApiError(response.status, body));
        if (body === null)
            return fail({ code: 'INVALID_RESPONSE', message: 'The SHRAMIK API returned an unreadable response.', retryable: true });
        return body;
    }
    const adapter = {
        listSources(query) {
            const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
            if (query.query?.trim())
                params.set('query', query.query.trim());
            if (query.status && query.status !== 'ALL')
                params.set('status', query.status);
            if (query.type && query.type !== 'ALL')
                params.set('type', query.type);
            if (query.agency && query.agency !== 'ALL')
                params.set('agency', query.agency);
            return request(`/data-sources?${params.toString()}`).then((validatePage));
        },
        getSource(id) { return request(`/data-sources/${encodeURIComponent(id)}`); },
        listIngestionRuns(id, options = {}) {
            const params = new URLSearchParams({ page: String(options.page ?? 1), pageSize: String(options.pageSize ?? 10) });
            return request(`/data-sources/${encodeURIComponent(id)}/ingestion-runs?${params.toString()}`).then((validatePage));
        },
        getCoverage(id) { return request(`/data-sources/${encodeURIComponent(id)}/coverage`); },
        getFieldMappings(id, schemaVersion) {
            const params = new URLSearchParams();
            if (schemaVersion)
                params.set('schemaVersion', schemaVersion);
            const suffix = params.size ? `?${params.toString()}` : '';
            return request(`/data-sources/${encodeURIComponent(id)}/field-mappings${suffix}`).then((validatePage));
        },
    };
    if (features.createSource) {
        adapter.capabilities = { createSource: true };
        adapter.createSource = input => request('/data-sources', { method: 'POST', body: JSON.stringify(input) });
    }
    if (features.ingestion) {
        adapter.requestIngestion = (id) => request(`/data-sources/${encodeURIComponent(id)}/ingestion-runs`, { method: 'POST' });
    }
    return adapter;
}
function validatePage(page) {
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
