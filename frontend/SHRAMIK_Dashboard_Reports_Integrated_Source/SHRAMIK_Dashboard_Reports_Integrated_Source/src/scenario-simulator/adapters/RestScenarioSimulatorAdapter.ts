import type { BaselineOption, EntityType, ResultView, ScenarioResults, ScenarioRunMetadata, ScenarioRunRequest, ScenarioSimulatorOptions, SelectOption } from "../contracts/scenario-simulator.types";
import type { ScenarioSimulatorDataAdapter } from "./ScenarioSimulatorDataAdapter";

/** REST adapter for the proposed API contract. Paths are configurable because the handoff calls them proposals. */
export class RestScenarioSimulatorAdapter implements ScenarioSimulatorDataAdapter {
  private readonly baseUrl: string;

  constructor(baseUrl = "", private readonly fetcher: typeof fetch = fetch) {
    // Endpoint paths below already include /api/v1. Accept either the API host
    // or a host ending in /api/v1, without accidentally duplicating the prefix.
    const trimmed = baseUrl.trim().replace(/\\/+$/, "");
    this.baseUrl = trimmed.endsWith("/api/v1") ? trimmed.slice(0, -"/api/v1".length) : trimmed;
    if (this.baseUrl && !/^https?:\\/\\//i.test(this.baseUrl)) {
      throw new Error("Scenario API base URL must be an absolute HTTP(S) URL.");
    }
  }

  private async request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init, signal, credentials: "include",
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
    const body = await response.json().catch(() => null) as unknown;
    if (!response.ok) {
      const root = body && typeof body === "object" ? body as Record<string, unknown> : {};
      const error = root.error && typeof root.error === "object" ? root.error as Record<string, unknown> : root;
      const message = typeof error.message === "string" ? error.message : `Scenario API request failed (${response.status}).`;
      throw new Error(message);
    }
    if (body == null) throw new Error("The scenario service returned an empty response.");
    return camelize(body) as T;
  }

  async getOptions(signal?: AbortSignal): Promise<ScenarioSimulatorOptions> {
    const raw = await this.request<Record<string, any>>("/api/v1/simulator/options", {}, signal);
    const capacity = raw.additionalAnnualSeats ?? raw.trainingCapacity;
    const lag = raw.trainingLagMonths ?? raw.trainingLag;
    const startRange = raw.startYearRange;
    const provenance = raw.provenance ?? raw.meta?.provenance;
    if (!capacity || !lag || !Array.isArray(raw.evaluationYears) || !Array.isArray(raw.geographies) || !Array.isArray(raw.baselines)) {
      throw new Error("The options response does not match the Scenario Simulator contract.");
    }
    if (!provenance) throw new Error("The options response is missing provenance metadata.");
    return {
      entityTypes: raw.entityTypes ?? raw.supportedEntityTypes ?? ["skill", "occupation"],
      additionalAnnualSeats: { minimum: Number(capacity.minimum), maximum: Number(capacity.maximum), step: Number(capacity.step), unit: String(capacity.unit ?? "seats_per_year") },
      trainingLagMonths: { minimum: Number(lag.minimum), maximum: Number(lag.maximum), step: Number(lag.step), unit: String(lag.unit ?? "months") },
      startYears: Array.isArray(raw.startYears) ? raw.startYears : range(startRange?.minimum, startRange?.maximum),
      evaluationYears: raw.evaluationYears.map(Number),
      supportedAdvancedParameters: Array.isArray(raw.supportedAdvancedParameters) ? raw.supportedAdvancedParameters : [],
      geographies: raw.geographies as SelectOption[], sectors: (raw.sectors ?? []) as SelectOption[],
      baselines: (raw.baselines ?? raw.baselineRuns) as BaselineOption[], provenance,
    };
  }

  async searchEntities(input: { entityType: EntityType; query: string; geographyId?: string; sectorId?: string; signal?: AbortSignal }): Promise<SelectOption[]> {
    const q = new URLSearchParams({ type: input.entityType, q: input.query });
    if (input.geographyId) q.set("geography_id", input.geographyId);
    if (input.sectorId) q.set("sector_id", input.sectorId);
    const body = await this.request<unknown>(`/api/v1/simulator/entities?${q.toString()}`, {}, input.signal);
    const rows = Array.isArray(body) ? body : (body as { items?: unknown[] }).items;
    if (!Array.isArray(rows)) throw new Error("Entity search response must contain an items array.");
    return rows as SelectOption[];
  }

  async getCompatibleBaselines(input: { entityType: EntityType; entityId: string; geographyId: string; sectorId?: string; signal?: AbortSignal }): Promise<BaselineOption[]> {
    const q = new URLSearchParams({ entity_type: input.entityType, entity_id: input.entityId, geography_id: input.geographyId });
    if (input.sectorId) q.set("sector_id", input.sectorId);
    const body = await this.request<unknown>(`/api/v1/simulator/baselines?${q.toString()}`, {}, input.signal);
    const rows = Array.isArray(body) ? body : (body as { items?: unknown[] }).items;
    if (!Array.isArray(rows)) throw new Error("Baseline response must contain an items array.");
    return rows as BaselineOption[];
  }

  async runSimulation(input: ScenarioRunRequest, signal?: AbortSignal): Promise<ScenarioRunMetadata> {
    const body = {
      scenario_name: input.scenarioName,
      baseline_forecast_run_id: input.baselineForecastRunId,
      scope: {
        entity_type: input.scope.entityType,
        entity_id: input.scope.entityId,
        entity_code: input.scope.entityCode ?? null,
        code_system: input.scope.codeSystem ?? null,
        geography_id: input.scope.geographyId,
        sector_id: input.scope.sectorId ?? null,
      },
      intervention: {
        type: "TRAINING_CAPACITY_DELTA",
        additional_annual_seats: input.intervention.additionalAnnualSeats,
        start_year: input.intervention.interventionStartYear,
        training_lag_months: input.intervention.trainingLagMonths,
      },
      evaluation_year: input.evaluationYear,
      parameters: input.intervention.advancedParameters,
    };
    const raw = await this.request<Record<string, any>>("/api/v1/simulations", { method: "POST", body: JSON.stringify(body) }, signal);
    return normalizeRun(raw);
  }

  async getRunStatus(simulationRunId: string, signal?: AbortSignal): Promise<ScenarioRunMetadata> {
    const raw = await this.request<Record<string, any>>(`/api/v1/simulations/${encodeURIComponent(simulationRunId)}`, {}, signal);
    return normalizeRun(raw);
  }

  async getResults(input: { simulationRunId: string; view: ResultView; evaluationYear: number; signal?: AbortSignal }): Promise<ScenarioResults> {
    const q = new URLSearchParams({ view: input.view, year: String(input.evaluationYear) });
    const raw = await this.request<Record<string, any>>(`/api/v1/simulations/${encodeURIComponent(input.simulationRunId)}/results?${q.toString()}`, {}, input.signal);
    const run = raw.run ? normalizeRun(raw.run) : normalizeRun({
      simulationRunId: raw.simulationRunId ?? input.simulationRunId, runStatus: raw.runStatus ?? "SUCCEEDED",
      baselineForecastRunId: raw.baselineForecastRunId ?? "", modelName: raw.model?.name ?? "unknown",
      modelVersion: raw.model?.version ?? "unknown", evaluationYear: raw.evaluationYear ?? input.evaluationYear,
      qualityStatus: raw.qualityStatus ?? "CAUTION", provenance: raw.provenance ?? "MIXED", limitations: raw.limitations ?? [],
      lastUpdatedAt: raw.lastUpdatedAt,
    });
    if (!raw.series || !raw.scope) throw new Error("Simulation results are missing scope or time-series data.");
    return { ...raw, run, scope: raw.scope, metricDefinitions: raw.metricDefinitions ?? [], outcomes: raw.outcomes ?? [], regionalImpact: raw.regionalImpact ?? [], sectorBreakdown: raw.sectorBreakdown ?? [], occupationImpact: raw.occupationImpact ?? [], coverageSummary: raw.coverageSummary ?? [], limitations: raw.limitations ?? [] } as ScenarioResults;
  }

  async runSensitivity(input: { simulationRunId: string; parameterKey: string; values: number[]; evaluationYear: number; signal?: AbortSignal }): Promise<ScenarioResults["sensitivity"]> {
    const raw = await this.request<Record<string, any>>(`/api/v1/simulations/${encodeURIComponent(input.simulationRunId)}/sensitivity`, {
      method: "POST", body: JSON.stringify({ parameter_key: input.parameterKey, values: input.values, evaluation_year: input.evaluationYear }),
    }, input.signal);
    return raw.sensitivity as ScenarioResults["sensitivity"];
  }
}

function normalizeRun(raw: Record<string, any>): ScenarioRunMetadata {
  const model = raw.resolvedModelVersion ?? raw.model ?? {};
  const id = raw.simulationRunId ?? raw.simulationRunID;
  if (!id || !raw.runStatus || !raw.baselineForecastRunId || !(raw.modelName ?? model.name) || !(raw.modelVersion ?? model.version)) {
    throw new Error("Simulation run response is missing required run/model metadata.");
  }
  return {
    simulationRunId: String(id), runStatus: raw.runStatus, createdAt: raw.createdAt, startedAt: raw.startedAt, finishedAt: raw.finishedAt,
    baselineForecastRunId: String(raw.baselineForecastRunId), modelName: String(raw.modelName ?? model.name), modelVersion: String(raw.modelVersion ?? model.version),
    evaluationYear: Number(raw.evaluationYear), qualityStatus: raw.qualityStatus ?? "CAUTION", provenance: raw.provenance ?? raw.inputProvenance ?? "MIXED",
    statusMessage: raw.statusMessage, limitations: Array.isArray(raw.limitations) ? raw.limitations : [],
  };
}
function camelize(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(camelize);
  if (!input || typeof input !== "object") return input;
  return Object.fromEntries(Object.entries(input as Record<string, unknown>).map(([key, value]) => [key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), camelize(value)]));
}
function range(min?: number, max?: number): number[] { return Number.isFinite(min) && Number.isFinite(max) && Number(max) >= Number(min) && Number(max) - Number(min) < 50 ? Array.from({ length: Number(max) - Number(min) + 1 }, (_, i) => Number(min) + i) : []; }
