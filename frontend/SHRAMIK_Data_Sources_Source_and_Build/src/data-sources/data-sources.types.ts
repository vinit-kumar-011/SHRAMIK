export type Provenance = 'SOURCE_BACKED' | 'SYNTHETIC_DEMO' | 'DERIVED' | 'MIXED' | 'UNKNOWN';
export type SourceType = 'GOVERNMENT_DATASET' | 'REFERENCE_DATA' | 'INDUSTRY_FEED' | 'TRAINING_DATASET' | 'INTERNAL_DATASET' | 'OTHER';
export type SourceLifecycleStatus = 'ACTIVE' | 'PENDING_VALIDATION' | 'STALE' | 'FAILED' | 'NOT_CONFIGURED' | 'DISABLED' | 'UNKNOWN';
export type FreshnessStatus = 'UP_TO_DATE' | 'DUE_SOON' | 'STALE' | 'UNKNOWN' | 'NOT_APPLICABLE';
export type IngestionRunStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'WARNING' | 'FAILED' | 'CANCELLED' | 'NOT_CONFIGURED';
export type MappingStatus = 'MAPPED' | 'NEEDS_REVIEW' | 'UNMAPPED' | 'REJECTED' | 'NOT_CONFIGURED';

export interface CoverageArea {
  level: 'COUNTRY' | 'STATE_UT' | 'DISTRICT' | 'MULTI_REGION' | 'UNKNOWN';
  code?: string | null;
  label: string;
}
export interface ReportingPeriod {
  label: string;
  start?: string | null;
  end?: string | null;
  grain?: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'IRREGULAR' | 'UNKNOWN';
}
export interface SourceCapabilities {
  view: boolean;
  edit: boolean;
  retryIngestion: boolean;
  createIngestionRun: boolean;
  delete: boolean;
}
export interface DataSourceRecord {
  id: string;
  name: string;
  description?: string | null;
  type: SourceType;
  agencyOwner?: string | null;
  purpose?: string | null;
  accessMethod?: string | null;
  geographicCoverage: CoverageArea[];
  reportingPeriods: ReportingPeriod[];
  sourceReleaseDate?: string | null;
  lastSuccessfulRetrievalAt?: string | null;
  lastValidatedAt?: string | null;
  lifecycleStatus: SourceLifecycleStatus;
  freshnessStatus: FreshnessStatus;
  provenance: Provenance;
  tags: string[];
  notes?: string | null;
  capabilities: SourceCapabilities;
}
export interface IngestionRunRecord {
  runId: string;
  sourceId: string;
  status: IngestionRunStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  recordsRetrieved?: number | null;
  recordsAccepted?: number | null;
  recordsRejected?: number | null;
  warningCount?: number | null;
  safeMessage?: string | null;
  provenance: Provenance;
}
export interface CoverageSummary {
  sourceId: string;
  geography: CoverageArea[];
  reportingPeriods: ReportingPeriod[];
  taxonomyVersions?: string[];
  state: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN' | 'NOT_CONFIGURED';
  limitations: string[];
  provenance: Provenance;
}
export interface FieldMappingRecord {
  id: string;
  sourceId: string;
  sourceField: string;
  sourceType: string;
  canonicalField?: string | null;
  canonicalType?: string | null;
  transformation?: string | null;
  status: MappingStatus;
  schemaVersion?: string | null;
  note?: string | null;
  provenance: Provenance;
}
export interface SourceSummary {
  total: number;
  active: number;
  needsAttention: number;
  notConfigured: number;
}
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  summary?: SourceSummary;
  /** Optional server-provided facets so filters include values beyond the current page. */
  facets?: { agencies?: string[] };
  /** Some API responses place provenance and timestamps under `meta`; the adapter normalizes both shapes. */
  provenance?: Provenance;
  updatedAt?: string | null;
  meta?: { provenance?: Provenance; updatedAt?: string | null };
}
export interface SourceListQuery {
  query?: string;
  status?: SourceLifecycleStatus | 'ALL';
  type?: SourceType | 'ALL';
  agency?: string | 'ALL';
  page: number;
  pageSize: number;
}
export interface SourceError {
  code: string;
  message: string;
  retryable: boolean;
  requestId?: string;
}
export interface DataSourcesViewCapabilities {
  createSource?: boolean;
}
