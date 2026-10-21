import type {
  AdapterResult,
  DataQualitySummary,
  IssueFilters,
  PagedResult,
  ValidationIssue,
  ValidationRule,
  ValidationRun,
} from '../../types/data-quality';
import type { DataQualityDataAdapter } from '../../types/dataQualityAdapter';
import mockData from '../../../../../examples/mock-data-quality.json';

export class DemoDataQualityAdapter implements DataQualityDataAdapter {
  async getSummary(): Promise<AdapterResult<DataQualitySummary>> {
    return {
      state: 'available',
      data: mockData.summary as DataQualitySummary,
      provenance_state: mockData.summary.provenance_state as any,
    };
  }

  async listIssues(filters: IssueFilters): Promise<AdapterResult<PagedResult<ValidationIssue>>> {
    let items: ValidationIssue[] = (mockData.issues as ValidationIssue[]).map((i) => ({
      ...i,
    }));

    if (filters.query) {
      const q = filters.query.toLowerCase();
      items = items.filter((i) =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.dataset_label || '').toLowerCase().includes(q) ||
        (i.rule_id || '').toLowerCase().includes(q)
      );
    }
    if (filters.dataset_id) {
      items = items.filter((i) => i.dataset_id === filters.dataset_id);
    }
    if (filters.severity && filters.severity !== 'all') {
      items = items.filter((i) => i.severity === filters.severity);
    }
    if (filters.status && filters.status !== 'all') {
      items = items.filter((i) => i.status === filters.status);
    }

    const pageSize = 10;
    const totalItems = items.length;

    return {
      state: 'available',
      data: {
        items,
        page: { total_items: totalItems, page_size: pageSize },
        provenance_state: mockData.summary.provenance_state as any,
      },
      provenance_state: mockData.summary.provenance_state as any,
    };
  }

  async getIssue(issueId: string): Promise<AdapterResult<ValidationIssue>> {
    const issue = (mockData.issues as ValidationIssue[]).find((i) => i.issue_id === issueId);
    if (!issue) {
      return { state: 'not_available', reason: 'Issue not found', provenance_state: 'NOT_AVAILABLE' };
    }
    return {
      state: 'available',
      data: issue,
      provenance_state: mockData.summary.provenance_state as any,
    };
  }

  async listAffectedSamples(_issueId: string): Promise<AdapterResult<PagedResult<Record<string, unknown>>>> {
    return {
      state: 'not_available',
      reason: 'Affected record samples not available in demo fixture',
      provenance_state: 'NOT_AVAILABLE',
    };
  }

  async listRuns(): Promise<AdapterResult<PagedResult<ValidationRun>>> {
    const runs = mockData.runs as ValidationRun[];
    return {
      state: 'available',
      data: {
        items: runs,
        page: { total_items: runs.length },
        provenance_state: mockData.summary.provenance_state as any,
      },
      provenance_state: mockData.summary.provenance_state as any,
    };
  }

  async getRun(runId: string): Promise<AdapterResult<ValidationRun>> {
    const run = (mockData.runs as ValidationRun[]).find((r) => r.run_id === runId);
    if (!run) {
      return { state: 'not_available', reason: 'Run not found', provenance_state: 'NOT_AVAILABLE' };
    }
    return {
      state: 'available',
      data: run,
      provenance_state: mockData.summary.provenance_state as any,
    };
  }

  async listRules(): Promise<AdapterResult<ValidationRule[]>> {
    return {
      state: 'not_available',
      reason: 'Rule catalogue not provided in fixture',
      provenance_state: 'NOT_AVAILABLE',
    };
  }
}
