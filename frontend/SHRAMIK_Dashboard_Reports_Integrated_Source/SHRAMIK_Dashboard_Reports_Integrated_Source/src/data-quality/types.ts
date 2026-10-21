export type QualitySeverity = 'critical' | 'high' | 'medium' | 'low';
export type QualityIssueStatus = 'open' | 'in_review' | 'resolved' | 'suppressed';
export type QualityProvenance = 'SOURCE_BACKED' | 'DERIVED' | 'MIXED' | 'SYNTHETIC_DEMO' | 'NOT_AVAILABLE';

export interface QualityIssue {
  id: string;
  title: string;
  dataset: string;
  field: string;
  severity: QualitySeverity;
  status: QualityIssueStatus;
  records: number;
  rule: string;
  detected: string;
  description: string;
}
export interface ValidationRun {
  id: string;
  dataset: string;
  date: string;
  status: string;
  checked: string;
  findings: string;
}
export interface QualityRule {
  id: string;
  name: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  family: string;
}
export interface DataQualitySnapshot {
  summary: { recordsChecked: number; validRecords: number };
  issues: QualityIssue[];
  validationRuns: ValidationRun[];
  rules: QualityRule[];
  meta: { provenance: QualityProvenance; note: string; sourceLabel?: string; updatedAt?: string | null };
}
export interface DataQualityDataAdapter {
  readonly mode: 'mock' | 'rest' | 'unavailable';
  getSnapshot(signal?: AbortSignal): Promise<DataQualitySnapshot>;
}
