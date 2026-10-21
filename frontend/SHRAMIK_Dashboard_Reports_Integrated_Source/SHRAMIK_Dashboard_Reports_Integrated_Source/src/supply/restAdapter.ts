import type { SupplyInsightsDataAdapter, SupplySnapshot } from './types';

type ApiErrorBody = { error?: { code?: string; message?: string }; message?: string };

/** Proposed read-only API contract. It never substitutes mock values after a REST failure. */
export class SupplyInsightsApiError extends Error {
  constructor(message: string, readonly status: number, readonly path: string) {
    super(message);
    this.name = 'SupplyInsightsApiError';
  }
}

export class RestSupplyInsightsDataAdapter implements SupplyInsightsDataAdapter {
  readonly mode = 'rest' as const;
  private readonly apiBase: string;

  constructor(baseUrl: string, private readonly fetcher: typeof fetch = fetch) {
    const trimmed = baseUrl.trim().replace(/\/+$/, '');
    this.apiBase = trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
    if (!/^https?:\/\//i.test(this.apiBase)) throw new Error('Supply API base URL must be an absolute HTTP(S) URL.');
  }

  async getSnapshot(geographyCode: string, signal?: AbortSignal): Promise<SupplySnapshot> {
    const path = `/supply/overview?${new URLSearchParams({ geography: geographyCode })}`;
    let response: Response;
    try {
      response = await this.fetcher(`${this.apiBase}${path}`, {
        signal,
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new SupplyInsightsApiError('Cannot reach the Supply API. Check the API URL and network connection.', 0, path);
    }
    const payload = response.status === 204 ? null : await response.json().catch(() => null) as unknown;
    if (!response.ok) {
      const body = payload && typeof payload === 'object' ? payload as ApiErrorBody : {};
      throw new SupplyInsightsApiError(body.error?.message ?? body.message ?? `Supply API request failed (${response.status}).`, response.status, path);
    }
    if (payload == null) throw new SupplyInsightsApiError('The Supply API returned an empty or unreadable response.', response.status, path);
    const snapshot = (typeof payload === 'object' && payload !== null && 'data' in payload
      ? (payload as { data: SupplySnapshot }).data
      : payload) as SupplySnapshot;
    validateSnapshot(snapshot, geographyCode, path);
    return snapshot;
  }
}

function validateSnapshot(snapshot: SupplySnapshot, requestedGeography: string, path: string): void {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.summary || !Array.isArray(snapshot.sectors) ||
      !Array.isArray(snapshot.pipeline) || !Array.isArray(snapshot.readiness) || !snapshot.meta?.provenance) {
    throw new SupplyInsightsApiError('Supply overview response does not match the agreed frontend contract.', 200, path);
  }

  const allowedProvenance = ['SOURCE_BACKED', 'DERIVED', 'MIXED', 'SYNTHETIC_DEMO'];
  if (!allowedProvenance.includes(snapshot.meta.provenance)) {
    throw new SupplyInsightsApiError('Supply overview response contains an unknown provenance value.', 200, path);
  }
  const summaryValues = [
    snapshot.summary.workforceSupplyEstimate,
    snapshot.summary.trainingPipeline,
    snapshot.summary.credentialCoveragePct,
  ];
  if (summaryValues.some(value => typeof value !== 'number' || !Number.isFinite(value)) ||
      snapshot.summary.workforceSupplyEstimate < 0 || snapshot.summary.trainingPipeline < 0 ||
      snapshot.summary.credentialCoveragePct < 0 || snapshot.summary.credentialCoveragePct > 100 ||
      typeof snapshot.summary.workforceSupplyUnit !== 'string' || !snapshot.summary.workforceSupplyUnit.trim() ||
      typeof snapshot.summary.trainingPipelineUnit !== 'string' || !snapshot.summary.trainingPipelineUnit.trim()) {
    throw new SupplyInsightsApiError('Supply overview response contains invalid summary values or missing units.', 200, path);
  }
  const allowedLevels = ['High', 'Moderate', 'Limited'];
  if (snapshot.sectors.some(row => !row || typeof row.id !== 'string' || !row.id ||
      typeof row.name !== 'string' || !row.name || typeof row.unitCode !== 'string' || !row.unitCode.trim() ||
      typeof row.availableSupply !== 'number' || !Number.isFinite(row.availableSupply) || row.availableSupply < 0 ||
      typeof row.changePct !== 'number' || !Number.isFinite(row.changePct) ||
      typeof row.coveragePct !== 'number' || !Number.isFinite(row.coveragePct) || row.coveragePct < 0 || row.coveragePct > 100 ||
      !allowedLevels.includes(row.level))) {
    throw new SupplyInsightsApiError('Supply overview response contains invalid sector fields, units, or readiness values.', 200, path);
  }
  if (snapshot.pipeline.some(row => !row || typeof row.id !== 'string' || !row.id ||
      typeof row.label !== 'string' || !row.label || typeof row.note !== 'string' ||
      typeof row.valuePct !== 'number' || !Number.isFinite(row.valuePct) || row.valuePct < 0 || row.valuePct > 100)) {
    throw new SupplyInsightsApiError('Supply overview response contains invalid pipeline fields or percentages.', 200, path);
  }
  const allowedReadiness = ['ready', 'moderate', 'limited'];
  if (snapshot.readiness.some(row => !row || typeof row.id !== 'string' || !row.id ||
      typeof row.label !== 'string' || !row.label || typeof row.value !== 'string' ||
      !allowedReadiness.includes(row.status))) {
    throw new SupplyInsightsApiError('Supply overview response contains invalid readiness fields.', 200, path);
  }
  if (snapshot.geographyCode !== requestedGeography) {
    throw new SupplyInsightsApiError('Supply overview response geography does not match the requested filter.', 200, path);
  }
}
