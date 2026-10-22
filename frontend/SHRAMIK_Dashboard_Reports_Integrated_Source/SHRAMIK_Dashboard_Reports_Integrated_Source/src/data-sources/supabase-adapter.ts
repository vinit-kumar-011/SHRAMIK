import { SUPABASE_URL, supabaseHeaders } from '../supabase/config';
import type { DataSourcesDataAdapter } from './DataSourcesDataAdapter';
import { DataSourcesAdapterError } from './DataSourcesDataAdapter';
import type {
  CoverageSummary, DataSourceRecord, FieldMappingRecord, IngestionRunRecord,
  PagedResult, SourceListQuery, SourceType,
} from './data-sources.types';

type RegistryRow = {
  id: string;
  name: string;
  source_type: 'DATASET' | 'REPORT' | 'WEB' | 'SURVEY' | 'OTHER';
  publisher: string;
  url: string | null;
  publication_date: string | null;
  accessed_at: string | null;
  coverage_start: number | null;
  coverage_end: number | null;
};

const TYPE_MAP: Record<RegistryRow['source_type'], SourceType> = {
  DATASET: 'GOVERNMENT_DATASET',
  REPORT: 'REFERENCE_DATA',
  WEB: 'INDUSTRY_FEED',
  SURVEY: 'GOVERNMENT_DATASET',
  OTHER: 'OTHER',
};
const PAGE_LIMIT = 1000;

function fail(message: string, code = 'SUPABASE_DATA_SOURCE_ERROR'): never {
  throw new DataSourcesAdapterError({ code, message, retryable: code === 'NETWORK_ERROR' || code === 'SERVER_ERROR' });
}
function toSource(row: RegistryRow): DataSourceRecord {
  const periods = row.coverage_start != null || row.coverage_end != null
    ? [{
        label: String(row.coverage_start ?? 'start not reported') + '–' + String(row.coverage_end ?? 'end not reported'),
        start: row.coverage_start == null ? null : String(row.coverage_start) + '-01-01',
        end: row.coverage_end == null ? null : String(row.coverage_end) + '-12-31',
        grain: 'UNKNOWN' as const,
      }]
    : [];
  return {
    id: row.id,
    name: row.name,
    description: 'Registry type: ' + row.source_type + '. Retrieval health, geography crosswalks and validation history are not exposed through the public read view.',
    type: TYPE_MAP[row.source_type] ?? 'OTHER',
    agencyOwner: row.publisher || null,
    purpose: 'Source registry entry · ' + row.source_type,
    accessMethod: row.url ? 'Registered source URL' : 'Not reported',
    geographicCoverage: [],
    reportingPeriods: periods,
    sourceReleaseDate: row.publication_date,
    lastSuccessfulRetrievalAt: row.accessed_at,
    lastValidatedAt: null,
    // Do not imply that a registered URL is connected, fresh, validated or ingestible.
    lifecycleStatus: row.url ? 'UNKNOWN' : 'NOT_CONFIGURED',
    freshnessStatus: 'UNKNOWN',
    provenance: 'SOURCE_BACKED',
    tags: [row.source_type],
    notes: row.url
      ? 'Read-only source registry metadata. A registered URL is not proof of a successful retrieval or a validated dataset.'
      : 'No source URL is registered. Retrieval and validation status are not available from this public registry view.',
    capabilities: { view: true, edit: false, retryIngestion: false, createIngestionRun: false, delete: false },
  };
}
function emptyPage<T>(page = 1, pageSize = 10, provenance: 'SOURCE_BACKED' | 'UNKNOWN' = 'UNKNOWN'): PagedResult<T> {
  return { items: [], total: 0, page: Math.max(1, page), pageSize: Math.max(1, pageSize), provenance };
}
function hasText(value: string | null | undefined, needle: string): boolean {
  return (value ?? '').toLocaleLowerCase().includes(needle);
}

export class SupabaseDataSourcesAdapter implements DataSourcesDataAdapter {
  readonly capabilities = { createSource: false };
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly headers: typeof supabaseHeaders;
  private readonly useSameOriginProxy: boolean;
  constructor(
    baseUrl?: string,
    fetcher: typeof fetch = fetch,
    headers: typeof supabaseHeaders = supabaseHeaders,
  ) {
    this.baseUrl = baseUrl ?? SUPABASE_URL;
    this.fetcher = fetcher;
    this.headers = headers;
    // The default production adapter uses the same-origin proxy; injected local/test URLs remain direct.
    this.useSameOriginProxy = baseUrl === undefined;
  }

  private async listRegistryRows(): Promise<RegistryRow[]> {
    const values = {
      select: 'id,name,source_type,publisher,url,publication_date,accessed_at,coverage_start,coverage_end',
      order: 'name.asc',
      limit: String(PAGE_LIMIT),
    };
    const sameOriginProxy = this.useSameOriginProxy;
    const url = sameOriginProxy
      ? '/api/shramik-data?' + new URLSearchParams({ table: 'data_sources', ...values })
      : this.baseUrl.replace(/\/+$/, '') + '/rest/v1/data_sources?' + new URLSearchParams(values);
    const init: RequestInit = {
      method: 'GET',
      headers: sameOriginProxy ? new Headers({ Accept: 'application/json' }) : this.headers(null),
    };
    // A transient proxy/upstream failure should not turn an otherwise readable
    // registry into a blank page. Retry once only for network, 429 or 5xx errors;
    // permanent permission/schema errors remain fail-closed.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: Response;
      try {
        // Use the platform global as the receiver for native fetch. Some browser
        // implementations reject calling Window.fetch with the adapter as "this".
        response = await Reflect.apply(this.fetcher, globalThis, [url, init]);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 250));
          continue;
        }
        const cause = error instanceof Error ? error.name : 'UnknownNetworkError';
        return fail(
          'Cannot reach the live SHRAMIK source registry. Check network access and the Supabase project URL. (' + cause + ')',
          'NETWORK_ERROR',
        );
      }
      const payload = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
        const message = typeof body.message === 'string'
          ? body.message
          : typeof body.error === 'string'
            ? body.error
            : 'Source registry request failed (' + response.status + ').';
        const transient = response.status === 429 || response.status >= 500;
        if (attempt === 0 && transient) {
          await new Promise(resolve => setTimeout(resolve, 250));
          continue;
        }
        return fail(message, transient ? 'SERVER_ERROR' : 'ACCESS_DENIED');
      }
      if (!Array.isArray(payload)) return fail('Supabase returned an invalid source registry response.', 'INVALID_RESPONSE');
      return payload as RegistryRow[];
    }
    return fail('The source registry could not be loaded after a retry.', 'SERVER_ERROR');
  }

  async listSources(query: SourceListQuery): Promise<PagedResult<DataSourceRecord>> {
    const all = (await this.listRegistryRows()).map(toSource);
    const needle = query.query?.trim().toLocaleLowerCase() ?? '';
    const filtered = all.filter(source =>
      (!needle || [source.name, source.agencyOwner, source.type, source.purpose, source.accessMethod, ...source.tags].some(value => hasText(value, needle))) &&
      (!query.status || query.status === 'ALL' || source.lifecycleStatus === query.status) &&
      (!query.type || query.type === 'ALL' || source.type === query.type) &&
      (!query.agency || query.agency === 'ALL' || source.agencyOwner === query.agency)
    );
    const page = Math.max(1, Math.floor(query.page || 1));
    const pageSize = Math.max(1, Math.min(100, Math.floor(query.pageSize || 8)));
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);
    const agencies = [...new Set(all.map(source => source.agencyOwner).filter((value): value is string => Boolean(value)))].sort((x, y) => x.localeCompare(y));
    return {
      items, total: filtered.length, page, pageSize, provenance: 'SOURCE_BACKED',
      summary: {
        total: filtered.length,
        active: filtered.filter(source => source.lifecycleStatus === 'ACTIVE').length,
        needsAttention: filtered.filter(source => ['PENDING_VALIDATION', 'STALE', 'FAILED'].includes(source.lifecycleStatus)).length,
        notConfigured: filtered.filter(source => source.lifecycleStatus === 'NOT_CONFIGURED').length,
      },
      facets: { agencies },
    };
  }

  async getSource(sourceId: string): Promise<DataSourceRecord> {
    const row = (await this.listRegistryRows()).find(source => source.id === sourceId);
    if (!row) return fail('That source is not present in the public registry.', 'NOT_FOUND');
    return toSource(row);
  }

  async listIngestionRuns(_sourceId: string, options: { page?: number; pageSize?: number } = {}): Promise<PagedResult<IngestionRunRecord>> {
    // Retrieval/ingestion logs are deliberately not public. Never fabricate run history.
    return emptyPage(options.page, options.pageSize, 'UNKNOWN');
  }

  async getCoverage(sourceId: string): Promise<CoverageSummary> {
    const source = await this.getSource(sourceId);
    return {
      sourceId,
      geography: [],
      reportingPeriods: source.reportingPeriods,
      state: 'UNKNOWN',
      limitations: [
        'Geographic coverage mappings are not exposed through the public source registry.',
        'Registered release years are not proof of complete observation coverage.',
        'Connect the authorized Data Sources API to view validation and retrieval history.',
      ],
      provenance: 'SOURCE_BACKED',
    };
  }

  async getFieldMappings(_sourceId: string, _schemaVersion?: string): Promise<PagedResult<FieldMappingRecord>> {
    // Field mapping tables have no browser read grant until an approved safe view is provided.
    return emptyPage(1, 50, 'UNKNOWN');
  }
}
