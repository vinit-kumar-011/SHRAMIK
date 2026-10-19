import type { DataQualityDataAdapter, DataQualitySnapshot } from './types';

type ApiErrorBody = { error?: { message?: string }; message?: string };
export class DataQualityApiError extends Error {
  constructor(message: string, readonly status: number, readonly path: string) {
    super(message);
    this.name = 'DataQualityApiError';
  }
}

/** Read-only integration. Validation runs and issue mutations are deliberately not sent by this adapter. */
export class RestDataQualityDataAdapter implements DataQualityDataAdapter {
  readonly mode = 'rest' as const;
  private readonly apiBase: string;
  constructor(baseUrl: string, private readonly fetcher: typeof fetch = fetch) {
    const trimmed = baseUrl.trim().replace(/\/+$/, '');
    this.apiBase = trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
    if (!/^https?:\/\//i.test(this.apiBase)) throw new Error('Data Quality API base URL must be an absolute HTTP(S) URL.');
  }
  async getSnapshot(signal?: AbortSignal): Promise<DataQualitySnapshot> {
    const path = '/data-quality/overview';
    let response: Response;
    try {
      response = await this.fetcher(`${this.apiBase}${path}`, { signal, credentials: 'include', headers: { Accept: 'application/json' } });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new DataQualityApiError('Cannot reach the Data Quality API. Check the API URL and network connection.', 0, path);
    }
    const payload = response.status === 204 ? null : await response.json().catch(() => null) as unknown;
    if (!response.ok) {
      const body = payload && typeof payload === 'object' ? payload as ApiErrorBody : {};
      throw new DataQualityApiError(body.error?.message ?? body.message ?? `Data Quality API request failed (${response.status}).`, response.status, path);
    }
    if (!payload) throw new DataQualityApiError('The Data Quality API returned an empty or unreadable response.', response.status, path);
    const snapshot = (typeof payload === 'object' && payload !== null && 'data' in payload
      ? (payload as { data: DataQualitySnapshot }).data
      : payload) as DataQualitySnapshot;
    validateSnapshot(snapshot, path);
    return snapshot;
  }
}

function validateSnapshot(snapshot: DataQualitySnapshot, path: string): void {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.summary ||
      !Array.isArray(snapshot.issues) || !Array.isArray(snapshot.validationRuns) ||
      !Array.isArray(snapshot.rules) || !snapshot.meta?.provenance) {
    throw new DataQualityApiError('Data Quality response does not match the overview contract.', 200, path);
  }
  if (![snapshot.summary.recordsChecked, snapshot.summary.validRecords].every(value =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0) ||
    snapshot.summary.validRecords > snapshot.summary.recordsChecked) {
    throw new DataQualityApiError('Data Quality response contains invalid record counts.', 200, path);
  }
  const allowedProvenance = ['SOURCE_BACKED', 'DERIVED', 'MIXED', 'SYNTHETIC_DEMO'];
  if (!allowedProvenance.includes(snapshot.meta.provenance)) {
    throw new DataQualityApiError('Data Quality response contains an unknown provenance value.', 200, path);
  }
  const severities = ['critical', 'high', 'medium', 'low'];
  const statuses = ['open', 'in_review', 'resolved', 'suppressed'];
  if (snapshot.issues.some(issue => !issue || typeof issue.id !== 'string' || !issue.id ||
      typeof issue.title !== 'string' || !issue.title || !severities.includes(issue.severity) ||
      !statuses.includes(issue.status) || typeof issue.records !== 'number' || !Number.isFinite(issue.records) || issue.records < 0)) {
    throw new DataQualityApiError('Data Quality response contains invalid issue fields.', 200, path);
  }
}
