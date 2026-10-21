import type {
  BaselineOption,
  EntityType,
  ResultView,
  ScenarioResults,
  ScenarioRunMetadata,
  ScenarioRunRequest,
  ScenarioSimulatorOptions,
  SelectOption,
} from "../contracts/scenario-simulator.types";
import type { ScenarioSimulatorDataAdapter } from "./ScenarioSimulatorDataAdapter";

const BASELINE_ID = "LOCAL-PLANNING-NO-VALIDATED-BASELINE";
const GEOGRAPHY_ID = "INDIA";
const SKILL_ID = "LOCAL-PLANNING-SKILL-GROUP";
const OCCUPATION_ID = "LOCAL-PLANNING-OCCUPATION-GROUP";
const MAX_SEATS = 200000;
const SEAT_STEP = 1000;
const LIMITATIONS = [
  "This is an assumptions-only local planning calculator, not a calibrated SHRAMIK model.",
  "This calculator does not estimate labour demand, workforce supply, skill gaps, or employment outcomes.",
  "No validated demand, total workforce supply, forecast, skill-gap baseline, regional or sector distribution was loaded.",
  "Training completion and post-training transition rates are editable illustrative assumptions and are not source-backed estimates.",
  "Potential transitions are not jobs; they are not verified placements or employment outcomes.",
  "Do not use these outputs for official policy, budgeting, or public reporting.",
];

type StoredRun = { metadata: ScenarioRunMetadata; results: ScenarioResults; request: ScenarioRunRequest };

function abortIfNeeded(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");
}
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function localBaseline(): BaselineOption {
  return {
    baselineForecastRunId: BASELINE_ID,
    label: "No validated baseline — intervention-only calculation",
    modelName: "Assumptions-only planning calculator",
    modelVersion: "local-planning-v1",
    inputWindowStart: "No validated history",
    inputWindowEnd: "No validated history",
    targetYearStart: 2026,
    targetYearEnd: 2040,
    qualityStatus: "UNSUPPORTED",
    provenance: "SYNTHETIC_DEMO",
    compatible: true,
    incompatibilityReason: "This is not a forecast baseline. It only permits transparent arithmetic on user-entered intervention assumptions.",
  };
}
function userDefinedEntity(type: EntityType): SelectOption {
  return type === "skill"
    ? {
        id: SKILL_ID,
        label: "User-defined skill group (not NCO/NSQF mapped)",
        code: "UNMAPPED-SKILL-GROUP",
        codeSystem: "LOCAL_PLANNING_ASSUMPTION",
        description: "A planning placeholder only; not an entry from a validated skills taxonomy.",
        available: true,
      }
    : {
        id: OCCUPATION_ID,
        label: "User-defined occupation group (not NCO mapped)",
        code: "UNMAPPED-OCCUPATION-GROUP",
        codeSystem: "LOCAL_PLANNING_ASSUMPTION",
        description: "A planning placeholder only; not an entry from a validated occupation taxonomy.",
        available: true,
      };
}
function entityMatches(type: EntityType, id: string): boolean {
  return id === (type === "skill" ? SKILL_ID : OCCUPATION_ID);
}
function numberAssumption(request: ScenarioRunRequest, key: string): number {
  const value = request.intervention.advancedParameters[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("The " + key + " assumption must be a number from 0 to 100.");
  }
  return value;
}
function count(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}
function eligibleCohorts(request: ScenarioRunRequest): number {
  const lagYears = Math.ceil(request.intervention.trainingLagMonths / 12);
  return Math.max(0, request.evaluationYear - request.intervention.interventionStartYear - lagYears + 1);
}
function makeUnavailableOutcome(metricCode: string, label: string, reason: string) {
  return {
    metricCode,
    label,
    unitCode: "not_available",
    baselineValue: null,
    scenarioValue: null,
    deltaValue: null,
    qualityStatus: "UNSUPPORTED" as const,
    notAvailableReason: reason,
    definition: "No validated data or model output is available in the local planning calculator.",
  };
}

export class PlanningScenarioSimulatorAdapter implements ScenarioSimulatorDataAdapter {
  private readonly runs = new Map<string, StoredRun>();
  private sequence = 0;

  async getOptions(signal?: AbortSignal): Promise<ScenarioSimulatorOptions> {
    abortIfNeeded(signal);
    return {
      entityTypes: ["skill", "occupation"],
      additionalAnnualSeats: { minimum: 0, maximum: MAX_SEATS, step: SEAT_STEP, unit: "seats_per_year" },
      trainingLagMonths: { minimum: 0, maximum: 60, step: 12, unit: "months" },
      startYears: [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035],
      evaluationYears: [2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040],
      supportedAdvancedParameters: [
        {
          key: "completionRatePct",
          label: "Illustrative training completion assumption",
          type: "number",
          unit: "%",
          minimum: 0,
          maximum: 100,
          step: 5,
          defaultValue: 75,
          description: "Editable planning assumption. The 75% default is illustrative, not sourced or calibrated from SHRAMIK.",
        },
        {
          key: "placementRatePct",
          label: "Illustrative post-training transition assumption",
          type: "number",
          unit: "%",
          minimum: 0,
          maximum: 100,
          step: 5,
          defaultValue: 60,
          description: "Illustrative transition rate only; not a placement forecast, employment rate, or observed SHRAMIK statistic.",
        },
      ],
      geographies: [{
        id: GEOGRAPHY_ID,
        label: "India — broad planning scope only",
        description: "No state or district allocation is calculated.",
        available: true,
      }],
      sectors: [],
      baselines: [localBaseline()],
      provenance: "SYNTHETIC_DEMO",
    };
  }

  async searchEntities(input: { entityType: EntityType; query: string; geographyId?: string; sectorId?: string; signal?: AbortSignal }): Promise<SelectOption[]> {
    abortIfNeeded(input.signal);
    if (input.geographyId && input.geographyId !== GEOGRAPHY_ID) return [];
    if (input.sectorId) return [];
    const entity = userDefinedEntity(input.entityType);
    const query = input.query.trim().toLocaleLowerCase();
    return !query || entity.label.toLocaleLowerCase().includes(query) || "user defined local planning assumption".includes(query)
      ? [entity]
      : [];
  }

  async getCompatibleBaselines(input: { entityType: EntityType; entityId: string; geographyId: string; sectorId?: string; signal?: AbortSignal }): Promise<BaselineOption[]> {
    abortIfNeeded(input.signal);
    if (input.geographyId !== GEOGRAPHY_ID || !entityMatches(input.entityType, input.entityId) || input.sectorId) return [];
    return [localBaseline()];
  }

  async runSimulation(input: ScenarioRunRequest, signal?: AbortSignal): Promise<ScenarioRunMetadata> {
    abortIfNeeded(signal);
    if (!entityMatches(input.scope.entityType, input.scope.entityId) || input.scope.geographyId !== GEOGRAPHY_ID) {
      throw new Error("Choose the user-defined local planning entity and India-wide planning scope.");
    }
    if (input.baselineForecastRunId !== BASELINE_ID) {
      throw new Error("The local planning calculator cannot use an unrecognized or purported live forecast baseline.");
    }
    const seats = input.intervention.additionalAnnualSeats;
    if (!Number.isInteger(seats) || seats < 0 || seats > MAX_SEATS || seats % SEAT_STEP !== 0) {
      throw new Error("Additional annual seats must be an integer from 0 to " + MAX_SEATS + " in steps of " + SEAT_STEP + ".");
    }
    if (!Number.isInteger(input.intervention.trainingLagMonths) || input.intervention.trainingLagMonths < 0 || input.intervention.trainingLagMonths > 60 || input.intervention.trainingLagMonths % 12 !== 0) {
      throw new Error("Training lag must be a whole number of months from 0 to 60 in 12-month steps.");
    }
    if (!Number.isInteger(input.intervention.interventionStartYear) || !Number.isInteger(input.evaluationYear) || input.evaluationYear < input.intervention.interventionStartYear) {
      throw new Error("Choose valid years and keep the evaluation year on or after the intervention start year.");
    }
    const completionRate = numberAssumption(input, "completionRatePct");
    const transitionRate = numberAssumption(input, "placementRatePct");
    if (completionRate % 5 !== 0 || transitionRate % 5 !== 0) {
      throw new Error("Illustrative percentage assumptions must be entered in 5-point steps.");
    }

    const cohortYears = eligibleCohorts(input);
    const plannedSeats = seats * cohortYears;
    const estimatedCompletions = Math.round(plannedSeats * completionRate / 100);
    const potentialTransitions = Math.round(estimatedCompletions * transitionRate / 100);
    this.sequence += 1;
    const createdAt = new Date().toISOString();
    const runId = "LOCAL-PLANNING-" + Date.now().toString(36).toUpperCase() + "-" + this.sequence;
    const metadata: ScenarioRunMetadata = {
      simulationRunId: runId,
      runStatus: "SUCCEEDED_WITH_WARNINGS",
      createdAt,
      startedAt: createdAt,
      finishedAt: createdAt,
      baselineForecastRunId: BASELINE_ID,
      modelName: "Assumptions-only planning calculator",
      modelVersion: "local-planning-v1",
      evaluationYear: input.evaluationYear,
      qualityStatus: "UNSUPPORTED",
      provenance: "SYNTHETIC_DEMO",
      statusMessage: "Local arithmetic completed using editable illustrative assumptions; this is not a calibrated forecast or a workforce outcome.",
      limitations: LIMITATIONS.slice(),
    };
    const results: ScenarioResults = {
      run: metadata,
      scope: copy(input.scope),
      metricDefinitions: [],
      series: {
        baselineDemand: [],
        scenarioDemand: [],
        baselineSupply: [],
        scenarioSupply: [],
        baselineGap: [],
        scenarioGap: [],
      },
      outcomes: [
        makeUnavailableOutcome("DEMAND_ESTIMATE", "Projected Labour Demand", "Not available: this calculator does not estimate labour demand."),
        makeUnavailableOutcome("SUPPLY_ESTIMATE", "Total Workforce Supply", "Not available: training completions are not equivalent to total available workforce supply."),
        makeUnavailableOutcome("SKILL_GAP", "Projected Skill Gap", "Not available: no comparable, validated demand and supply series is available."),
        makeUnavailableOutcome("GAP_TO_DEMAND_RATIO", "Gap-to-Demand Ratio", "Not available: neither a validated demand estimate nor a compatible gap is available."),
        {
          metricCode: "PLANNED_TRAINING_SEATS",
          label: "Illustrative seat opportunities (cumulative)",
          unitCode: "seats",
          baselineValue: null,
          scenarioValue: plannedSeats,
          deltaValue: null,
          displayValue: count(plannedSeats),
          comparisonDisplay: cohortYears + " eligible annual cohorts × " + count(seats) + " additional seats/year. This is a scenario assumption, not an observed training count.",
          definition: "Additional annual seats multiplied by the number of cohorts whose training lag could finish by the selected evaluation year.",
          qualityStatus: "UNSUPPORTED",
        },
        {
          metricCode: "INTERVENTION_COMPLETIONS",
          label: "Illustrative training completions",
          unitCode: "people_assumed",
          baselineValue: null,
          scenarioValue: estimatedCompletions,
          deltaValue: null,
          displayValue: count(estimatedCompletions),
          comparisonDisplay: count(plannedSeats) + " seat opportunities × " + completionRate + "% editable completion assumption. Not observed completions or total workforce supply.",
          definition: "Arithmetic result from an editable assumed completion rate; not an empirically validated estimate.",
          qualityStatus: "UNSUPPORTED",
        },
        {
          metricCode: "POTENTIAL_TRANSITIONS_NOT_JOBS",
          label: "Potential post-training transitions (not jobs)",
          unitCode: "people_assumed",
          baselineValue: null,
          scenarioValue: potentialTransitions,
          deltaValue: null,
          displayValue: count(potentialTransitions),
          comparisonDisplay: count(estimatedCompletions) + " assumed completions × " + transitionRate + "% editable transition assumption. Not verified placements or employment outcomes.",
          definition: "Illustrative transition arithmetic only. The number does not represent job openings, actual placements or jobs created.",
          qualityStatus: "UNSUPPORTED",
        },
      ],
      regionalImpact: [],
      sectorBreakdown: [],
      occupationImpact: [],
      coverageSummary: [
        "Scope: India-wide planning assumption only; no regional, sectoral or occupation-level allocation.",
        "Eligible annual cohorts by evaluation year: " + cohortYears + ".",
      ],
      limitations: LIMITATIONS.slice(),
      lastUpdatedAt: createdAt,
    };
    this.runs.set(runId, { metadata, results, request: copy(input) });
    return copy(metadata);
  }

  async getRunStatus(simulationRunId: string, signal?: AbortSignal): Promise<ScenarioRunMetadata> {
    abortIfNeeded(signal);
    const run = this.runs.get(simulationRunId);
    if (!run) throw new Error("Local planning run was not found in this browser session.");
    return copy(run.metadata);
  }

  async getResults(input: { simulationRunId: string; view: ResultView; evaluationYear: number; signal?: AbortSignal }): Promise<ScenarioResults> {
    abortIfNeeded(input.signal);
    const run = this.runs.get(input.simulationRunId);
    if (!run) throw new Error("Local planning run was not found in this browser session.");
    if (input.evaluationYear !== run.metadata.evaluationYear) {
      throw new Error("The selected evaluation year differs from this local run. Run the assumptions again.");
    }
    return copy(run.results);
  }

  async runSensitivity(input: { simulationRunId: string; parameterKey: string; values: number[]; evaluationYear: number; signal?: AbortSignal }): Promise<ScenarioResults["sensitivity"]> {
    abortIfNeeded(input.signal);
    const run = this.runs.get(input.simulationRunId);
    if (!run) throw new Error("Local planning run was not found in this browser session.");
    if (input.parameterKey !== "additionalAnnualSeats") throw new Error("Only the additional annual seats assumption can be varied in this local calculator.");
    if (input.evaluationYear !== run.metadata.evaluationYear) throw new Error("The requested sensitivity year differs from this local run.");
    const completionRate = numberAssumption(run.request, "completionRatePct");
    const transitionRate = numberAssumption(run.request, "placementRatePct");
    const cohorts = eligibleCohorts(run.request);
    const points = input.values.map(value => {
      if (!Number.isInteger(value) || value < 0 || value > MAX_SEATS || value % SEAT_STEP !== 0) {
        throw new Error("Sensitivity seat values must use valid increments between 0 and " + MAX_SEATS + ".");
      }
      const transitions = Math.round(Math.round(value * cohorts * completionRate / 100) * transitionRate / 100);
      return {
        inputValue: value,
        outputValue: transitions,
        unitCode: "assumed_transitions_not_jobs",
        qualityStatus: "UNSUPPORTED" as const,
      };
    });
    return {
      variedParameter: "additionalAnnualSeats",
      fixedAssumptions: [
        "Training lag: " + run.request.intervention.trainingLagMonths + " months.",
        "Intervention starts: " + run.request.intervention.interventionStartYear + ".",
        "Illustrative completion assumption: " + completionRate + "%.",
        "Illustrative post-training transition assumption: " + transitionRate + "%.",
        "The output is assumptions arithmetic, not a forecast or uncertainty interval.",
      ],
      points,
    };
  }
}
