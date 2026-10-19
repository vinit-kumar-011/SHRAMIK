import type { DataQualityDataAdapter, DataQualitySnapshot } from './types';

const demoSnapshot: DataQualitySnapshot = {
  summary: { recordsChecked: 12440, validRecords: 11982 },
  issues: [
    { id: 'DQ-DEMO-001', title: 'Missing occupation code', dataset: 'Synthetic Job Posting Fixture', field: 'occupation_code', severity: 'critical', status: 'open', records: 124, rule: 'NCO-REQUIRED-01', detected: '2026-10-17', description: 'A demo batch contains records without a canonical occupation code. This fixture tests the issue-review interface only.' },
    { id: 'DQ-DEMO-002', title: 'Unknown State / UT code', dataset: 'Synthetic Regional Fixture', field: 'region_code', severity: 'high', status: 'in_review', records: 67, rule: 'GEO-CROSSWALK-02', detected: '2026-10-16', description: 'Some synthetic records use region identifiers absent from the illustrative canonical crosswalk.' },
    { id: 'DQ-DEMO-003', title: 'Reporting period is absent', dataset: 'Synthetic Training Fixture', field: 'period_start', severity: 'high', status: 'open', records: 42, rule: 'PERIOD-REQUIRED-01', detected: '2026-10-16', description: 'The reporting period is missing from a fixture payload. Do not infer period alignment from retrieval time.' },
    { id: 'DQ-DEMO-004', title: 'Conflicting unit metadata', dataset: 'Synthetic Supply Fixture', field: 'unit_code', severity: 'medium', status: 'open', records: 18, rule: 'UNIT-COMPAT-03', detected: '2026-10-15', description: 'The fixture deliberately mixes incompatible units to exercise the comparability warning.' },
    { id: 'DQ-DEMO-005', title: 'Duplicate logical record', dataset: 'Synthetic Training Fixture', field: 'record_key', severity: 'medium', status: 'resolved', records: 9, rule: 'IDENTITY-UNIQUE-01', detected: '2026-10-14', description: 'A duplicate-key example. The resolved state is local to this demo session.' },
    { id: 'DQ-DEMO-006', title: 'Source timestamp not reported', dataset: 'Synthetic Job Posting Fixture', field: 'retrieved_at', severity: 'low', status: 'open', records: 5, rule: 'PROVENANCE-TIME-02', detected: '2026-10-14', description: 'The fixture omits retrieval metadata to demonstrate an explicit missing-value state.' },
  ],
  validationRuns: [
    { id: 'RUN-DEMO-014', dataset: 'Synthetic Job Posting Fixture', date: '2026-10-17 09:40', status: 'Succeeded', checked: '4,820', findings: '191' },
    { id: 'RUN-DEMO-013', dataset: 'Synthetic Training Fixture', date: '2026-10-16 16:12', status: 'Succeeded with findings', checked: '2,140', findings: '69' },
    { id: 'RUN-DEMO-012', dataset: 'Synthetic Regional Fixture', date: '2026-10-16 11:05', status: 'Failed', checked: '—', findings: '—' },
  ],
  rules: [
    { id: 'NCO-REQUIRED-01', name: 'Canonical occupation code is required', severity: 'Critical', family: 'Taxonomy mapping' },
    { id: 'GEO-CROSSWALK-02', name: 'Geography identifier must resolve to the approved crosswalk', severity: 'High', family: 'Geography' },
    { id: 'PERIOD-REQUIRED-01', name: 'Observation period must be explicit', severity: 'High', family: 'Time semantics' },
    { id: 'UNIT-COMPAT-03', name: 'Comparable values must use compatible units', severity: 'Medium', family: 'Analytical compatibility' },
    { id: 'PROVENANCE-TIME-02', name: 'Retrieval time must not be conflated with reporting period', severity: 'Low', family: 'Provenance' },
  ],
  meta: {
    provenance: 'SYNTHETIC_DEMO',
    note: 'Illustrative issue, validation-run, and rule fixtures. No live checks ran and local changes do not persist to a server.',
    sourceLabel: 'Synthetic Data Quality fixtures',
    updatedAt: null,
  },
};

export class MockDataQualityDataAdapter implements DataQualityDataAdapter {
  readonly mode = 'mock' as const;
  async getSnapshot(signal?: AbortSignal): Promise<DataQualitySnapshot> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return {
      ...demoSnapshot,
      summary: { ...demoSnapshot.summary },
      issues: demoSnapshot.issues.map(issue => ({ ...issue })),
      validationRuns: demoSnapshot.validationRuns.map(run => ({ ...run })),
      rules: demoSnapshot.rules.map(rule => ({ ...rule })),
      meta: { ...demoSnapshot.meta },
    };
  }
}
export const mockDataQualityDataAdapter: DataQualityDataAdapter = new MockDataQualityDataAdapter();
