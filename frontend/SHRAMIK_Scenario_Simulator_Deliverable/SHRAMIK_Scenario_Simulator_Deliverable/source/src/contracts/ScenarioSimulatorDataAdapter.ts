import type {
  BaselineOption,
  EntityType,
  ResultView,
  ScenarioResults,
  ScenarioRunMetadata,
  ScenarioRunRequest,
  ScenarioSimulatorOptions,
  SelectOption,
} from "./scenario-simulator.types";

export interface ScenarioSimulatorDataAdapter {
  getOptions(signal?: AbortSignal): Promise<ScenarioSimulatorOptions>;
  searchEntities(input: {
    entityType: EntityType;
    query: string;
    geographyId?: string;
    sectorId?: string;
    signal?: AbortSignal;
  }): Promise<SelectOption[]>;
  getCompatibleBaselines(input: {
    entityType: EntityType;
    entityId: string;
    geographyId: string;
    sectorId?: string;
    signal?: AbortSignal;
  }): Promise<BaselineOption[]>;
  runSimulation(input: ScenarioRunRequest, signal?: AbortSignal): Promise<ScenarioRunMetadata>;
  getRunStatus(simulationRunId: string, signal?: AbortSignal): Promise<ScenarioRunMetadata>;
  getResults(input: {
    simulationRunId: string;
    view: ResultView;
    evaluationYear: number;
    signal?: AbortSignal;
  }): Promise<ScenarioResults>;
  runSensitivity?(input: {
    simulationRunId: string;
    parameterKey: string;
    values: number[];
    evaluationYear: number;
    signal?: AbortSignal;
  }): Promise<ScenarioResults["sensitivity"]>;
}

/**
 * Recommended implementations:
 * - MockScenarioSimulatorAdapter: deterministic fixtures, labelled SYNTHETIC_DEMO.
 * - RestScenarioSimulatorAdapter: configured SHRAMIK API; propagate errors and never silently fall back to mock.
 */
