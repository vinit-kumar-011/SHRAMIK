import type { SupplyInsightsDataAdapter, SupplySnapshot } from './types';

const DEMO_SNAPSHOT: SupplySnapshot = {
  geographyCode: 'IN',
  summary: {
    workforceSupplyEstimate: 94_800_000,
    workforceSupplyUnit: 'persons',
    trainingPipeline: 2_160_000,
    trainingPipelineUnit: 'learners',
    credentialCoveragePct: 48,
  },
  sectors: [
    { id: 'manufacturing', name: 'Manufacturing', availableSupply: 18_600_000, unitCode: 'persons', changePct: 4.2, coveragePct: 74, level: 'High', note: 'Sector crosswalk: illustrative' },
    { id: 'construction', name: 'Construction', availableSupply: 24_100_000, unitCode: 'persons', changePct: 2.1, coveragePct: 61, level: 'Moderate', note: 'Sector crosswalk: illustrative' },
    { id: 'healthcare', name: 'Healthcare', availableSupply: 8_300_000, unitCode: 'persons', changePct: 6.8, coveragePct: 58, level: 'Limited', note: 'Sector crosswalk: illustrative' },
    { id: 'transport-logistics', name: 'Transport & Logistics', availableSupply: 12_700_000, unitCode: 'persons', changePct: 3.4, coveragePct: 66, level: 'Moderate', note: 'Sector crosswalk: illustrative' },
    { id: 'agriculture', name: 'Agriculture', availableSupply: 31_200_000, unitCode: 'persons', changePct: -1.3, coveragePct: 42, level: 'Limited', note: 'Sector crosswalk: illustrative' },
  ],
  pipeline: [
    { id: 'enrolled', label: 'Enrolled in training', valuePct: 76, note: 'Programme participation' },
    { id: 'completed', label: 'Completed training', valuePct: 61, note: 'Completion signal' },
    { id: 'credential-verified', label: 'Credential verified', valuePct: 48, note: 'Credential coverage' },
    { id: 'employment-linked', label: 'Employment outcome linked', valuePct: 33, note: 'Outcome linkage' },
  ],
  readiness: [
    { id: 'geography', label: 'Canonical geography mapping', value: 'In review', status: 'moderate' },
    { id: 'providers', label: 'Training-provider records', value: 'Demo available', status: 'ready' },
    { id: 'credentials', label: 'Credential linkage', value: 'Partial', status: 'limited' },
    { id: 'outcomes', label: 'Employment outcome linkage', value: 'Not verified', status: 'limited' },
  ],
  meta: {
    provenance: 'SYNTHETIC_DEMO',
    note: 'Illustrative fixture only. Stage percentages are separate signals, not matched learner cohort conversion rates; geography selections do not recalculate these demo values.',
    sourceLabel: 'Synthetic Supply fixture',
    updatedAt: null,
  },
};

export class MockSupplyInsightsDataAdapter implements SupplyInsightsDataAdapter {
  readonly mode = 'mock' as const;

  async getSnapshot(geographyCode: string, signal?: AbortSignal): Promise<SupplySnapshot> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    // Only the filter scope changes. Demo figures are deliberately not regionalized.
    return {
      ...DEMO_SNAPSHOT,
      geographyCode,
      summary: { ...DEMO_SNAPSHOT.summary },
      sectors: DEMO_SNAPSHOT.sectors.map(row => ({ ...row })),
      pipeline: DEMO_SNAPSHOT.pipeline.map(row => ({ ...row })),
      readiness: DEMO_SNAPSHOT.readiness.map(row => ({ ...row })),
      meta: { ...DEMO_SNAPSHOT.meta },
    };
  }
}

export const mockSupplyInsightsDataAdapter: SupplyInsightsDataAdapter = new MockSupplyInsightsDataAdapter();
