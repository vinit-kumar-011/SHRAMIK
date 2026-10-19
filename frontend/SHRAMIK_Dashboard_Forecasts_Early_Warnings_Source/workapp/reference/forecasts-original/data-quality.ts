export type ProvenanceState =
  | "SOURCE_BACKED"
  | "DERIVED"
  | "MIXED"
  | "SYNTHETIC_DEMO"
  | "NOT_AVAILABLE";

export type IssueSeverity = "critical" | "high" | "medium" | "low" | "info";
export type IssueStatus = "open" | "in_review" | "resolved" | "suppressed";
export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface DataQualitySummary {
  provenance_state: ProvenanceState;
  scope: { run_id?: string | null; dataset_id?: string | null; label?: string | null };
  records_checked: number | null;
  valid_records: number | null;
  records_with_findings: number | null;
  open_critical_issue_count: number | null;
  as_of?: string | null;
  definitions_version?: string | null;
  unavailable_reason?: string | null;
}

export interface ValidationIssue {
  issue_id: string;
  title: string;
  description?: string | null;
  dataset_id: string;
  dataset_label: string;
  rule_id?: string | null;
  rule_name?: string | null;
  field_names: string[];
  severity: IssueSeverity;
  status: IssueStatus;
  affected_records: number | null;
  detected_at?: string | null;
  run_id?: string | null;
  provenance_state: ProvenanceState;
  sample_ids?: string[];
  suggested_steps?: string[];
}

export interface ValidationRun {
  run_id: string;
  dataset_id: string;
  dataset_label: string;
  status: RunStatus;
  started_at?: string | null;
  completed_at?: string | null;
  records_checked?: number | null;
  valid_records?: number | null;
  records_with_findings?: number | null;
  rule_set_version?: string | null;
  provenance_state: ProvenanceState;
  safe_error?: string | null;
}

export interface ValidationRule {
  rule_id: string;
  name: string;
  description?: string | null;
  severity_on_failure: IssueSeverity;
  field_names: string[];
  enabled: boolean;
  version?: string | null;
}

export interface IssueFilters {
  query?: string;
  dataset_id?: string;
  severity?: IssueSeverity | "all";
  status?: IssueStatus | "all";
  detected_after?: string;
  detected_before?: string;
}

export interface PageInfo {
  next_cursor?: string | null;
  total_items?: number | null;
  page?: number;
  page_size?: number;
}

export type AdapterResult<T> =
  | { state: "available"; data: T; provenance_state: ProvenanceState }
  | { state: "empty"; data: T; provenance_state: ProvenanceState }
  | { state: "not_available"; reason: string; provenance_state: "NOT_AVAILABLE" }
  | { state: "forbidden"; message?: string }
  | { state: "error"; message: string; correlation_id?: string };

export interface PagedResult<T> { items: T[]; page: PageInfo; provenance_state: ProvenanceState }
