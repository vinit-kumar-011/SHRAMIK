export type SupplyProvenance = 'SOURCE_BACKED' | 'DERIVED' | 'MIXED' | 'SYNTHETIC_DEMO';
export type SupplyReadinessLevel = 'High' | 'Moderate' | 'Limited';
export type SupplyReadinessStatus = 'ready' | 'moderate' | 'limited';

export interface SupplySector {
  id: string;
  name: string;
  availableSupply: number;
  unitCode: string;
  changePct: number;
  coveragePct: number;
  level: SupplyReadinessLevel;
  note?: string;
}

export interface SupplyPipelineStage {
  id: string;
  label: string;
  valuePct: number;
  note: string;
}

export interface SupplyReadinessSignal {
  id: string;
  label: string;
  value: string;
  status: SupplyReadinessStatus;
}

export interface SupplySnapshot {
  geographyCode: string;
  summary: {
    workforceSupplyEstimate: number;
    workforceSupplyUnit: string;
    trainingPipeline: number;
    trainingPipelineUnit: string;
    credentialCoveragePct: number;
  };
  sectors: SupplySector[];
  pipeline: SupplyPipelineStage[];
  readiness: SupplyReadinessSignal[];
  meta: {
    provenance: SupplyProvenance;
    note: string;
    sourceLabel?: string;
    updatedAt?: string | null;
  };
}

export interface SupplyInsightsDataAdapter {
  readonly mode: 'mock' | 'rest';
  getSnapshot(geographyCode: string, signal?: AbortSignal): Promise<SupplySnapshot>;
}
