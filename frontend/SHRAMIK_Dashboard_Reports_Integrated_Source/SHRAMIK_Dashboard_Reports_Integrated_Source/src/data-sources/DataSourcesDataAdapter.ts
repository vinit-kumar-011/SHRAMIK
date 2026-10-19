import type {
  CoverageSummary, DataSourceRecord, DataSourcesViewCapabilities, FieldMappingRecord,
  IngestionRunRecord, PagedResult, SourceError, SourceListQuery, SourceType,
  SourceLifecycleStatus,
} from './data-sources.types';

export interface DataSourcesDataAdapter {
  /** Optional capabilities describe what this adapter/environment actually supports. */
  capabilities?: DataSourcesViewCapabilities;
  listSources(query: SourceListQuery): Promise<PagedResult<DataSourceRecord>>;
  getSource(sourceId: string): Promise<DataSourceRecord>;
  listIngestionRuns(sourceId: string, options?: { page?: number; pageSize?: number }): Promise<PagedResult<IngestionRunRecord>>;
  getCoverage(sourceId: string): Promise<CoverageSummary>;
  getFieldMappings(sourceId: string, schemaVersion?: string): Promise<PagedResult<FieldMappingRecord>>;
  /** Optional local draft or server create route. The UI always communicates which one is active. */
  createSource?(input: CreateSourceInput): Promise<DataSourceRecord>;
  /** Present only when the configured backend supports triggering ingestion. */
  requestIngestion?(sourceId: string): Promise<{ runId: string; status: 'QUEUED' | 'RUNNING' }>;
  updateSource?(sourceId: string, patch: UpdateSourceInput): Promise<DataSourceRecord>;
}
export interface CreateSourceInput {
  name: string;
  type: SourceType;
  agencyOwner?: string;
  purpose?: string;
  tags?: string[];
}
export interface UpdateSourceInput {
  name?: string;
  agencyOwner?: string;
  purpose?: string;
  lifecycleStatus?: SourceLifecycleStatus;
  tags?: string[];
}
export class DataSourcesAdapterError extends Error {
  constructor(public readonly detail: SourceError) {
    super(detail.message);
    this.name = 'DataSourcesAdapterError';
  }
}
