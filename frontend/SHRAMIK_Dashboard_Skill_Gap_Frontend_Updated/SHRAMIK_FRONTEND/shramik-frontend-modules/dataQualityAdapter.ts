import type {
  AdapterResult,
  DataQualitySummary,
  IssueFilters,
  PagedResult,
  ValidationIssue,
  ValidationRule,
  ValidationRun,
} from "./data-quality";

export interface DataQualityDataAdapter {
  getSummary(scope?: { datasetId?: string; runId?: string }): Promise<AdapterResult<DataQualitySummary>>;
  listIssues(filters: IssueFilters, page?: { cursor?: string; pageSize?: number }): Promise<AdapterResult<PagedResult<ValidationIssue>>>;
  getIssue(issueId: string): Promise<AdapterResult<ValidationIssue>>;
  listAffectedSamples(issueId: string, page?: { cursor?: string; pageSize?: number }): Promise<AdapterResult<PagedResult<Record<string, unknown>>>>;
  listRuns(filters?: { datasetId?: string; status?: string }, page?: { cursor?: string; pageSize?: number }): Promise<AdapterResult<PagedResult<ValidationRun>>>;
  getRun(runId: string): Promise<AdapterResult<ValidationRun>>;
  listRules(): Promise<AdapterResult<ValidationRule[]>>;
}
