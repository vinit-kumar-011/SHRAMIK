/** Skill Gap Analysis adapter types. Keep analytical semantics out of view components. */
export type GapProvenance = 'source_backed' | 'derived' | 'mixed' | 'mock';
export type GapClass = 'high_shortage' | 'moderate_shortage' | 'balanced' | 'moderate_surplus' | 'high_surplus' | 'not_comparable' | 'no_data' | 'suppressed';
export type GapEntityType = 'kpi' | 'skill' | 'occupation' | 'region' | 'sector' | 'insight';
export type GapMetricKey = 'gap_absolute' | 'gap_percent' | 'demand' | 'supply';
export type GapSortKey = 'rank' | 'skillLabel' | 'demand' | 'supply' | 'gap' | 'gapPercent';
export type SortDirection = 'asc' | 'desc';

export interface GapDataMeta {
  period: string;
  unit: string;
  provenance: GapProvenance;
  sourceLabel: string;
  sourceIds: string[];
  updatedAt?: string | null;
  coverage?: {
    observedCount?: number;
    expectedCount?: number;
    geographyCovered?: number;
    geographyExpected?: number;
    missingCodes?: string[];
    suppressedCodes?: string[];
    summary?: string;
  };
  notes?: string[];
}

export interface SelectOption { value: string; label: string; }
export interface GapFilterOptions {
  periods: SelectOption[];
  geographyLevels: SelectOption[];
  regions: Array<SelectOption & { level: 'national' | 'state' | 'region'; code: string }>;
  sectors: SelectOption[];
  occupations: SelectOption[];
  skills: SelectOption[];
  defaults: GapFilters;
  configuration: {
    balancedTolerance: number;
    significantGapThreshold: number;
    classificationVersion: string;
  };
  meta: GapDataMeta;
}

export interface GapFilters {
  period: string;
  geographyLevel: string;
  regionCode: string;
  stateCode: string;
  sectorCode: string;
  ncoCode: string;
  skillCode: string;
}

export interface GapMetric {
  value: number | null;
  formattedValue?: string;
  unit: string;
  label: string;
  definition: string;
  comparison?: { value: number; period: string; delta?: number; deltaPercent?: number };
  meta: GapDataMeta;
}

export interface GapOverview {
  demand: GapMetric;
  supply: GapMetric;
  gap: GapMetric & { kind: 'observed_estimate' | 'forecast'; formulaId: string; gapPercent?: number | null; gapPercentFormula?: string; denominator?: number | null };
  significantGaps: GapMetric;
  balancedTolerance: { value: number; unit: string; configId: string };
  dataStatus: 'complete' | 'partial' | 'stale' | 'unavailable';
  meta: GapDataMeta;
}

export interface GapClassificationDefinition {
  key: GapClass;
  label: string;
  colorToken: string;
  thresholdDescription: string;
}

export interface GapLandscapePoint {
  id: string;
  entityType: 'skill' | 'occupation';
  code: string;
  label: string;
  demand: number | null;
  supply: number | null;
  gap: number | null;
  gapPercent?: number | null;
  unit: string;
  classification: GapClass;
  sizeValue?: number | null;
  detailAvailable: boolean;
  meta: GapDataMeta;
}

export interface GapLandscape {
  points: GapLandscapePoint[];
  xAxis: { key: 'supply'; label: string; unit: string; scale: 'linear' | 'log' };
  yAxis: { key: 'demand'; label: string; unit: string; scale: 'linear' | 'log' };
  parityLineEligible: boolean;
  parityLineReason?: string;
  classifications: GapClassificationDefinition[];
  meta: GapDataMeta;
}

export interface RegionalGapValue {
  regionCode: string;
  regionName: string;
  demand: number | null;
  supply: number | null;
  gap: number | null;
  gapPercent?: number | null;
  unit: string;
  classification: GapClass;
  rank?: number | null;
  sharePercent?: number | null;
  missingReason?: string;
  meta: GapDataMeta;
}

export interface RegionGeometryMetadata {
  assetId: string;
  version: string;
  source: string;
  licence: string;
  codeProperty: string;
  codeCrosswalkVersion: string;
  assetUrl?: string;
}

export interface RegionalGapResponse {
  metric: GapMetricKey;
  regions: RegionalGapValue[];
  geometry?: RegionGeometryMetadata | null;
  scale: GapClassificationDefinition[];
  meta: GapDataMeta;
  geometryUnavailableReason?: string;
}

export interface RankedSkillGap {
  rank: number;
  skillId: string;
  skillCode: string;
  skillLabel: string;
  demand: number | null;
  supply: number | null;
  gap: number | null;
  gapPercent?: number | null;
  gapClass: GapClass;
  trend?: Array<{ period: string; gap: number | null }>;
  unit: string;
  detailAvailable: boolean;
  meta: GapDataMeta;
}

export interface RankedSkillsResponse {
  items: RankedSkillGap[];
  page: number;
  pageSize: number;
  total: number;
  sort: string;
  skillTaxonomyVersion: string;
  meta: GapDataMeta;
}

export interface GapInsight {
  id: string;
  title: string;
  summary: string;
  importance?: 'info' | 'watch' | 'priority';
  claims: Array<{ text: string; metricId: string; value?: number | null; unit?: string; sourceIds: string[] }>;
  evidenceEntity?: { type: 'skill' | 'occupation' | 'region' | 'sector'; id: string };
  generatedBy: 'rule_engine' | 'ai_grounded' | 'mock';
  meta: GapDataMeta;
}

export interface SectorFlowNode { id: string; label: string; group: string; total: number; unit: string; }
export interface SectorFlowLink { source: string; target: string; value: number; unit: string; sourceIds: string[]; }
export interface SectorFlowResponse {
  available: boolean;
  sectorCode: string;
  nodes: SectorFlowNode[];
  links: SectorFlowLink[];
  flowDefinition?: string;
  conservationRule?: string;
  unavailableReason?: string;
  meta: GapDataMeta;
}

export interface GapDetailPayload {
  id: string;
  type: GapEntityType;
  title: string;
  description: string;
  facts: Array<{ label: string; value: string }>;
  meta: GapDataMeta;
}

export interface RankedSkillsQuery {
  sort: GapSortKey;
  direction: SortDirection;
  page: number;
  pageSize: number;
}

export interface SkillGapDataAdapter {
  readonly mode: 'mock' | 'rest';
  getFilterOptions(signal?: AbortSignal): Promise<GapFilterOptions>;
  getOverview(filters: GapFilters, signal?: AbortSignal): Promise<GapOverview>;
  getGapLandscape(filters: GapFilters, signal?: AbortSignal): Promise<GapLandscape>;
  getRegionalGaps(filters: GapFilters, metric: GapMetricKey, signal?: AbortSignal): Promise<RegionalGapResponse>;
  getRankedSkills(filters: GapFilters, query: RankedSkillsQuery, signal?: AbortSignal): Promise<RankedSkillsResponse>;
  getSkillGapInsights(filters: GapFilters, signal?: AbortSignal): Promise<GapInsight[]>;
  getSectorFlow(filters: GapFilters, sectorCode: string, signal?: AbortSignal): Promise<SectorFlowResponse>;
  getDetail(type: GapEntityType, id: string, filters: GapFilters, signal?: AbortSignal): Promise<GapDetailPayload>;
}
