import initialData from './mock-data-sources.json';
import type { DataSourcesDataAdapter, CreateSourceInput } from './DataSourcesDataAdapter';
import type { CoverageSummary, DataSourceRecord, FieldMappingRecord, IngestionRunRecord, PagedResult, SourceListQuery } from './data-sources.types';

type Fixture = {
  notice: string;
  provenance: 'SYNTHETIC_DEMO';
  items: DataSourceRecord[];
  ingestionRunsBySource: Record<string, IngestionRunRecord[]>;
  coverageBySource: Record<string, CoverageSummary>;
  fieldMappingsBySource: Record<string, FieldMappingRecord[]>;
};
const fixture = initialData as unknown as Fixture;
// Each browser session gets its own in-memory copy: locally created drafts are deliberately not persistent.
let sources: DataSourceRecord[] = structuredClone(fixture.items);
let draftCounter = 1;
const match = (value: string | undefined | null, query: string) => value?.toLocaleLowerCase().includes(query) ?? false;
function summary(items: DataSourceRecord[]) {
  return {
    total: items.length,
    active: items.filter(s => s.lifecycleStatus === 'ACTIVE').length,
    needsAttention: items.filter(s => ['PENDING_VALIDATION', 'STALE', 'FAILED'].includes(s.lifecycleStatus)).length,
    notConfigured: items.filter(s => s.lifecycleStatus === 'NOT_CONFIGURED').length,
  };
}
function paged<T>(items: T[], page = 1, pageSize = 8): PagedResult<T> {
  const safePage = Math.max(1, Math.floor(page || 1));
  const safeSize = Math.max(1, Math.min(100, Math.floor(pageSize || 8)));
  return { items: items.slice((safePage - 1) * safeSize, safePage * safeSize), total: items.length, page: safePage, pageSize: safeSize, provenance: 'SYNTHETIC_DEMO' };
}
const clone = <T,>(value: T): T => structuredClone(value);
export const mockDataSourcesAdapter: DataSourcesDataAdapter = {
  capabilities: { createSource: true },
  async listSources(query: SourceListQuery) {
    const needle = query.query?.trim().toLocaleLowerCase() ?? '';
    const filtered = sources.filter(s =>
      (!needle || [s.name, s.agencyOwner, s.type, s.purpose, ...s.tags].some(v => match(v, needle))) &&
      (!query.status || query.status === 'ALL' || s.lifecycleStatus === query.status) &&
      (!query.type || query.type === 'ALL' || s.type === query.type) &&
      (!query.agency || query.agency === 'ALL' || s.agencyOwner === query.agency)
    );
    return {
      ...paged(filtered, query.page, query.pageSize),
      summary: summary(filtered),
      facets: { agencies: [...new Set(sources.map(s => s.agencyOwner).filter((v): v is string => Boolean(v)))].sort((a,b) => a.localeCompare(b)) },
    };
  },
  async getSource(id) {
    const source = sources.find(s => s.id === id);
    if (!source) throw new Error('Source details are not available in this demo registry.');
    return clone(source);
  },
  async listIngestionRuns(id, options) {
    return clone(paged(fixture.ingestionRunsBySource[id] ?? [], options?.page ?? 1, options?.pageSize ?? 10));
  },
  async getCoverage(id) {
    return clone(fixture.coverageBySource[id] ?? {
      sourceId: id, geography: [], reportingPeriods: [], state: 'NOT_CONFIGURED',
      limitations: ['Coverage metadata has not been configured for this illustrative source.'], provenance: 'SYNTHETIC_DEMO',
    });
  },
  async getFieldMappings(id, _schemaVersion) {
    return clone(paged(fixture.fieldMappingsBySource[id] ?? [], 1, 50));
  },
  async createSource(input: CreateSourceInput) {
    const source: DataSourceRecord = {
      id: `src_demo_draft_${draftCounter++}`,
      name: input.name.trim(),
      description: 'Local draft only. No connector or external integration has been configured.',
      type: input.type,
      agencyOwner: input.agencyOwner?.trim() || null,
      purpose: input.purpose?.trim() || null,
      accessMethod: null,
      geographicCoverage: [], reportingPeriods: [],
      sourceReleaseDate: null, lastSuccessfulRetrievalAt: null, lastValidatedAt: null,
      lifecycleStatus: 'NOT_CONFIGURED', freshnessStatus: 'UNKNOWN', provenance: 'SYNTHETIC_DEMO',
      tags: (input.tags ?? []).map(x => x.trim()).filter(Boolean),
      notes: 'This demo draft exists only in this browser session. It is not persisted to the SHRAMIK backend.',
      capabilities: { view: true, edit: false, retryIngestion: false, createIngestionRun: false, delete: false },
    };
    sources = [source, ...sources];
    return clone(source);
  },
};
