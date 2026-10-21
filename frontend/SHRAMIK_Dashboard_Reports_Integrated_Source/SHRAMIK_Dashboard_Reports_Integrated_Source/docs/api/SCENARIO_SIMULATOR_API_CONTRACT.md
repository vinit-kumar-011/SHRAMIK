# Scenario Simulator REST API contract proposal

**Status:** proposed contract inferred from the current frontend adapter, not evidence that the backend has implemented the routes. Keep `VITE_SCENARIO_SIMULATOR_API_BASE_URL` blank until the API routes and response payloads below are implemented, authenticated, and integration-tested. A configured REST failure is shown in the UI; the frontend does not substitute the demo fixture.

## Base URL and shared rules

- Configure the API origin in `VITE_SCENARIO_SIMULATOR_API_BASE_URL`. The adapter accepts either the origin (for example, `https://api.example.org`) or the origin ending in `/api/v1`; route paths below already include `/api/v1`.
- Requests use `Accept: application/json`, credentials, and `Content-Type: application/json` when a request body is present.
- Successful responses may be raw JSON or `{ "data": ... }` envelopes. JSON property names are normalized from snake_case to camelCase in the frontend.
- Errors should use `{ "error": { "code": "...", "message": "..." } }` or a root `message`; return appropriate HTTP status codes. The adapter surfaces errors instead of falling back to mock values.
- Model runs must be server-authoritative. Do not accept user-supplied outputs as model results or infer regional impact from geometry.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/simulator/options` | Supported entity types, input bounds, allowed years, geographies, sectors, compatible-baseline catalogue, advanced-parameter schema and provenance |
| GET | `/api/v1/simulator/entities?type={skill\|occupation}&q={query}` | Search candidate entities; optionally accept `geography_id` and `sector_id` |
| GET | `/api/v1/simulator/baselines?entity_type={type}&entity_id={id}&geography_id={id}` | Return baselines compatible with the selected entity and geography; optionally filter `sector_id` |
| POST | `/api/v1/simulations` | Validate and queue/run an intervention scenario |
| GET | `/api/v1/simulations/{simulationRunId}` | Return the persisted run status and immutable model/run metadata |
| GET | `/api/v1/simulations/{simulationRunId}/results?view={view}&year={year}` | Return the selected results view for an evaluation year |
| POST | `/api/v1/simulations/{simulationRunId}/sensitivity` | Run a model-backed sensitivity analysis for the requested parameter values |

## Request bodies

### Create simulation

```json
{
  "scenario_name": "Additional training capacity",
  "baseline_forecast_run_id": "baseline-run-id",
  "scope": {
    "entity_type": "skill",
    "entity_id": "canonical-skill-id",
    "entity_code": "NCO/NSQF code when applicable",
    "code_system": "taxonomy version or code system",
    "geography_id": "IN",
    "sector_id": null
  },
  "intervention": {
    "type": "TRAINING_CAPACITY_DELTA",
    "additional_annual_seats": 50000,
    "start_year": 2027,
    "training_lag_months": 24
  },
  "evaluation_year": 2030,
  "parameters": {}
}
```

The response must identify the persisted run, including `simulation_run_id`, `run_status`, `baseline_forecast_run_id`, `model_name`, `model_version`, `evaluation_year`, `quality_status`, `provenance`, timestamps where available, and an explicit limitations array. Do not return a successful status unless the server has actually executed or loaded a valid, persisted result.

### Sensitivity

```json
{
  "parameter_key": "additional_annual_seats",
  "values": [10000, 25000, 50000],
  "evaluation_year": 2030
}
```

## Result response contract

A results response must provide:
- `run`: authoritative run metadata and quality/provenance.
- `scope`: canonical entity, geography, sector and taxonomy details.
- `series`: time-indexed demand and supply series. Observed historical rows must be distinguished from projections. Confidence/interval bounds must be included only when returned by the model, not fabricated by the client.
- `outcomes`, `metric_definitions`, and optional `regional_impact`, `sector_breakdown`, and `occupation_impact` rows.
- `coverage_summary` and `limitations`, including missing states/UTs, training-data gaps, evaluation period, and known compatibility limits.
- Optional `sensitivity` points with the varied parameter, fixed assumptions and the metric output; sensitivity is not a confidence interval.

Regional rows must include a canonical geography code, name, baseline gap, scenario gap, delta, unit code, quality status and provenance. The bundled GeoJSON supplies geometry only. A region must remain neutral/no-data unless the response contains compatible values for that region.

## Validation and security requirements

1. Validate intervention bounds server-side even when the UI sends validated form values.
2. Verify the authenticated user can view the baseline and run simulations for the requested geography, entity and sector.
3. Pin each run to immutable baseline ID, model name/version, input snapshot and parameters; store timestamps and a stable run ID.
4. Expose an explicit run lifecycle (queued/running/succeeded/failed/cancelled) and return model errors without presenting a failed run as successful.
5. Do not label synthetic/demo fixture output as source-backed or model-generated.
6. Enforce rate/size limits and idempotency for run submissions where appropriate. Do not expose secrets in client-visible environment variables.
7. Test empty/unknown entities, incompatible baselines, invalid bounds, unauthorized requests, unavailable models, malformed payloads, aborts/network errors, missing years, and regional coverage gaps.

## Current frontend configuration

The app's `src/scenario-simulator/adapters/RestScenarioSimulatorAdapter.ts` currently implements the route paths above. `VITE_SCENARIO_SIMULATOR_API_BASE_URL` is independent from the shared dashboard/gap/forecast/report host so the module can remain on its fixed synthetic example until the actual simulator service is available.
