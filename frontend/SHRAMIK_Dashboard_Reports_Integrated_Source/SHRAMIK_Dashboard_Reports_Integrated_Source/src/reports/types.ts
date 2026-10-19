export type ProvenanceState = 'SOURCE_BACKED' | 'DERIVED' | 'MIXED' | 'SYNTHETIC_DEMO' | 'NOT_AVAILABLE';
export type ReportType = 'STATE' | 'SECTOR' | 'SKILL' | 'POLICY_BRIEF' | 'CUSTOM';
export type ReportView = 'builder' | 'library' | 'preview';
export type ReportStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'NOT_CONFIGURED';
export type ReportSectionKey = 'EXECUTIVE_SUMMARY' | 'DEMAND' | 'SUPPLY' | 'SKILL_GAPS' | 'EMERGING_SKILLS' | 'FORECASTS' | 'SCENARIO' | 'REGIONAL' | 'SECTOR' | 'OCCUPATION' | 'POLICY_RECOMMENDATIONS' | 'SOURCES_METHOD';
export interface ReportPeriod { start: string; end: string; label?: string }
export interface ReportConfig {
  reportType: ReportType;
  title: string;
  geographyIds: string[];
  period: ReportPeriod;
  referenceYear?: number;
  sectionKeys: ReportSectionKey[];
  sourcePolicy: { mode: 'LATEST_VALIDATED' | 'FIXED_SNAPSHOT'; snapshotIds?: string[] };
  options: { includeUncertainty: boolean; includeDataAppendix: boolean; compareGeographyIds?: string[] };
  templateVersion: string;
}
export interface ReportMetric {
  key: string; label: string; value: number | null; formattedValue?: string; unit: string; period?: string; definition?: string;
  provenance: ProvenanceState; sourceLabel?: string; qualityStatus?: 'APPROVED' | 'CAUTION' | 'SUPPRESSED' | 'UNSUPPORTED' | 'NOT_COMPARABLE'; note?: string;
}
export interface ReportDataRow { id: string; cells: Record<string, string | number | null> }
export type ReportBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'finding'; title: string; text: string; evidenceRefs?: string[] }
  | { kind: 'metric_grid'; metrics: ReportMetric[] }
  | { kind: 'chart'; chartType: 'line' | 'bar' | 'stacked_bar'; title: string; xLabel?: string; yLabel?: string; unit?: string; series: Array<{ name: string; points: Array<{ x: string | number; y: number | null }> }>; caption?: string }
  | { kind: 'table'; title: string; columns: Array<{ key: string; label: string; unit?: string }>; rows: ReportDataRow[]; caption?: string }
  | { kind: 'map'; title: string; metricLabel: string; geometryKey: string; valuesByGeographyId: Record<string, number | null>; legend?: Array<{ label: string; min?: number; max?: number }> }
  | { kind: 'callout'; tone: 'info' | 'warning' | 'limitation'; title: string; text: string }
  | { kind: 'source_list'; sources: Array<{ name: string; datasetVersion?: string; observationPeriod?: string; asOfDate?: string; notes?: string }> }
  | { kind: 'methodology'; title: string; text: string; version?: string }
  | { kind: 'unavailable'; reason: string; nextStep?: string };
export interface ReportSection { key: ReportSectionKey; title: string; status: 'READY' | 'PARTIAL' | 'UNAVAILABLE'; blocks: ReportBlock[] }
export interface ReportDocumentModel {
  id: string; version?: number; title: string; reportType: ReportType; geographyLabels: string[]; period: ReportPeriod; referenceYear?: number;
  createdAt?: string | null; templateVersion: string; provenance: ProvenanceState; sections: ReportSection[]; configSnapshot?: ReportConfig;
  metadata: { sourceSnapshotIds: string[]; methodologyVersion?: string; sourceLabels: string[]; limitations: string[]; generatedByLabel?: string };
}
export interface ReportListItem {
  id: string; title: string; reportType: ReportType; geographyLabels: string[]; period: ReportPeriod; status: ReportStatus;
  createdAt?: string; updatedAt?: string; provenance: ProvenanceState;
  capabilities: { open: boolean; duplicate: boolean; retry: boolean; delete: boolean; pdf: boolean; csv: boolean };
}
export interface ReportsOptions {
  reportTypes: ReportType[];
  sections: Array<{ key: ReportSectionKey; label: string; description: string; required?: boolean }>;
  geographies: Array<{ id: string; label: string; level: string }>;
  periods: ReportPeriod[];
  referenceYears: number[];
  exportCapabilities: { serverPdf: boolean; browserPrint: boolean; csv: boolean; xlsx: boolean };
  provenance: ProvenanceState;
  sourceSnapshots?: Array<{ id: string; label: string; asOfDate?: string }>;
}
