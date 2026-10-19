/**
 * Proposed frontend contracts for SHRAMIK Scenario Simulator.
 * Align endpoint names and enums with the backend team before production use.
 */

export type ProvenanceState = "SOURCE_BACKED" | "MIXED" | "SYNTHETIC_DEMO";
export type QualityStatus = "APPROVED" | "CAUTION" | "SUPPRESSED" | "UNSUPPORTED" | "NOT_COMPARABLE";
export type EntityType = "skill" | "occupation";
export type ScenarioRunStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "SUCCEEDED_WITH_WARNINGS" | "FAILED";
export type ResultView = "overview" | "regional-impact" | "sector-breakdown" | "occupation-impact" | "sensitivity-analysis";

export interface SelectOption {
  id: string;
  label: string;
  code?: string;
  codeSystem?: string;
  description?: string;
  available?: boolean;
  unavailableReason?: string;
}

export interface NumericConstraint {
  minimum: number;
  maximum: number;
  step: number;
  unit: string;
}

export interface ScenarioSimulatorOptions {
  entityTypes: EntityType[];
  additionalAnnualSeats: NumericConstraint;
  trainingLagMonths: NumericConstraint;
  startYears: number[];
  evaluationYears: number[];
  supportedAdvancedParameters: Array<{
    key: string;
    label: string;
    type: "number" | "boolean" | "enum";
    unit?: string;
    options?: SelectOption[];
    minimum?: number;
    maximum?: number;
    step?: number;
    description?: string;
  }>;
  geographies: SelectOption[];
  sectors: SelectOption[];
  baselines: BaselineOption[];
  provenance: ProvenanceState;
}

export interface BaselineOption {
  baselineForecastRunId: string;
  label: string;
  modelName: string;
  modelVersion: string;
  inputWindowStart: string;
  inputWindowEnd: string;
  targetYearStart: number;
  targetYearEnd: number;
  qualityStatus: QualityStatus;
  provenance: ProvenanceState;
  compatible: boolean;
  incompatibilityReason?: string;
}

export interface ScenarioScope {
  entityType: EntityType;
  entityId: string;
  entityCode?: string;
  codeSystem?: string;
  geographyId: string;
  sectorId?: string;
}

export interface ScenarioIntervention {
  /** Positive increment of annual training seats, not total baseline capacity. */
  additionalAnnualSeats: number;
  interventionStartYear: number;
  /** Displayed as years only if the model supports whole-year steps. */
  trainingLagMonths: number;
  advancedParameters: Record<string, string | number | boolean>;
}

export interface ScenarioRunRequest {
  scenarioName: string;
  baselineForecastRunId: string;
  scope: ScenarioScope;
  intervention: ScenarioIntervention;
  evaluationYear: number;
}

export interface MetricDefinition {
  metricCode: string;
  label: string;
  definition: string;
  unitCode: string;
  temporalBasis: "STOCK" | "FLOW" | "RATE" | "SURVEY_ESTIMATE" | "INDEX" | "OTHER";
}

export interface TimeSeriesPoint {
  periodStart: string;
  periodEnd: string;
  value: number | null;
  unitCode: string;
  calculationKind: "ESTIMATE" | "FORECAST" | "SCENARIO";
  lowerBound?: number | null;
  upperBound?: number | null;
  qualityStatus: QualityStatus;
  provenance: ProvenanceState;
}

export interface OutcomeMetric {
  metricCode: string;
  label: string;
  unitCode: string;
  baselineValue: number | null;
  scenarioValue: number | null;
  deltaValue: number | null;
  displayValue?: string;
  comparisonDisplay?: string;
  definition?: string;
  qualityStatus: QualityStatus;
  notAvailableReason?: string;
}

export interface RegionalImpactRow {
  geographyId: string;
  canonicalCode: string;
  regionName: string;
  metricCode: string;
  baselineGap: number | null;
  scenarioGap: number | null;
  deltaValue: number | null;
  reductionPercent: number | null;
  unitCode: string;
  qualityStatus: QualityStatus;
  provenance: ProvenanceState;
  limitations: string[];
}

export interface ScenarioRunMetadata {
  simulationRunId: string;
  runStatus: ScenarioRunStatus;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  baselineForecastRunId: string;
  modelName: string;
  modelVersion: string;
  evaluationYear: number;
  qualityStatus: QualityStatus;
  provenance: ProvenanceState;
  statusMessage?: string;
  limitations: string[];
}

export interface ScenarioResults {
  run: ScenarioRunMetadata;
  scope: ScenarioScope;
  metricDefinitions: MetricDefinition[];
  series: {
    baselineDemand: TimeSeriesPoint[];
    scenarioDemand: TimeSeriesPoint[];
    baselineSupply: TimeSeriesPoint[];
    scenarioSupply: TimeSeriesPoint[];
    baselineGap: TimeSeriesPoint[];
    scenarioGap: TimeSeriesPoint[];
  };
  outcomes: OutcomeMetric[];
  regionalImpact: RegionalImpactRow[];
  sectorBreakdown: Array<Record<string, string | number | null>>;
  occupationImpact: Array<Record<string, string | number | null>>;
  sensitivity?: {
    variedParameter: string;
    fixedAssumptions: string[];
    points: Array<{ inputValue: number; outputValue: number | null; unitCode: string; qualityStatus: QualityStatus }>;
  };
  coverageSummary: string[];
  limitations: string[];
  lastUpdatedAt?: string;
}
