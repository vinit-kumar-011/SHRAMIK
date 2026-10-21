# Scenario Simulator — API Contract (Proposed)

**Status:** Frontend/backend coordination contract. These routes are proposals, not a claim that they already exist. Reconcile endpoint names/auth with the backend team before binding the REST adapter.

## 1. General rules

- JSON over HTTPS, versioned under `/api/v1` unless the host backend uses another agreed convention.
- Reuse the host app's authenticated session. Do not store API tokens in local storage or expose source API credentials to the browser.
- Stable IDs/codes in requests; display labels only for presentation.
- Use `AbortSignal`/cancellation for reads and ignore out-of-order responses.
- Every result should return metric definitions, units, period, scope, quality/provenance, data coverage and model/run metadata where relevant.
- A production API failure must not silently switch to demo fixtures.

## 2. Proposed endpoints

### `GET /api/v1/simulator/options`

Returns supported skills/occupations, geography hierarchy, sectors, baseline-run choices, input constraints and any optional parameter capabilities for the current user.

Example response:
```json
{
  "meta": { "provenance": "SOURCE_BACKED", "generatedAt": "2026-10-14T00:00:00Z" },
  "supportedEntityTypes": ["skill", "occupation"],
  "trainingCapacity": { "meaning": "ADDITIONAL_ANNUAL_SEATS", "minimum": 0, "maximum": 200000, "step": 1000, "unit": "seats_per_year" },
  "trainingLag": { "unit": "months", "minimum": 0, "maximum": 60, "step": 12 },
  "startYearRange": { "minimum": 2026, "maximum": 2030 },
  "evaluationYears": [2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035],
  "supportedAdvancedParameters": [],
  "entities": [],
  "geographies": [],
  "sectors": [],
  "baselineRuns": []
}
```

The numeric bounds above are illustrative contract examples. The actual API must return model-supported limits. Do not hard-code these example bounds as production rules.

### `GET /api/v1/simulator/entities?type=skill|occupation&q=...&geography_id=...`

Search/select options with stable canonical identifiers, taxonomy edition, title, available scope and compatibility status. Server search must be bounded and rate-safe.

### `GET /api/v1/simulator/baselines?entity_type=...&entity_id=...&geography_id=...&sector_id=...`

Returns only approved baselines compatible with entity, geography, sector, unit, and target horizon. Each baseline option should include `baseline_forecast_run_id`, model version, training/input window, target horizon, metric definitions, quality state, and whether the combination can be simulated.

### `POST /api/v1/simulations`

Submits a scenario run. Backend resolves/validates approved model version and baseline if the API design does not require those IDs from the client.

Example request:
```json
{
  "scenario_name": "Additional training capacity - Data Analysis",
  "baseline_forecast_run_id": "forecast-run-123",
  "scope": {
    "entity_type": "skill",
    "skill_id": "skill-data-analysis",
    "occupation_code": null,
    "occupation_code_system": null,
    "sector_id": null,
    "geography_id": "INDIA"
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

The sample is illustrative. `additional_annual_seats` is the UI-level meaning; the backend adapter may translate it to the schema field `training_capacity_delta`, once units and semantics are agreed. `training_lag_months` aligns with the proposed database column. Unsupported advanced parameters must be rejected, not silently ignored.

Possible immediate response:
```json
{
  "simulation_run_id": "sim-run-456",
  "run_status": "QUEUED",
  "created_at": "2026-10-14T00:00:00Z",
  "resolved_model_version": { "name": "approved-model-name", "version": "1.0" },
  "input_provenance": "SOURCE_BACKED",
  "quality_status": "CAUTION",
  "status_url": "/api/v1/simulations/sim-run-456"
}
```

### `GET /api/v1/simulations/{simulation_run_id}`

Returns run status (`QUEUED`, `RUNNING`, `SUCCEEDED`, `SUCCEEDED_WITH_WARNINGS`, `FAILED`), input echo, baseline/model IDs and versions, timestamps, quality status, error summary safe for users and a result availability flag.

### `GET /api/v1/simulations/{simulation_run_id}/results?view=overview|regional-impact|sector-breakdown|occupation-impact&year=2030`

Returns results for the specified internal view. All values must use the active simulation run, the matching baseline, compatible unit/period/geography, and the chosen evaluation year.

Example result envelope:
```json
{
  "simulation_run_id": "sim-run-456",
  "run_status": "SUCCEEDED",
  "scope": { "entity_type": "skill", "entity_id": "skill-data-analysis", "geography_id": "INDIA" },
  "evaluation_year": 2030,
  "model": { "name": "approved-model-name", "version": "1.0" },
  "provenance": "SOURCE_BACKED",
  "quality_status": "CAUTION",
  "metric_definitions": [],
  "series": {
    "baseline_demand": [],
    "scenario_demand": [],
    "baseline_supply": [],
    "scenario_supply": [],
    "baseline_gap": [],
    "scenario_gap": []
  },
  "outcomes": [],
  "regional_impact": [],
  "limitations": [],
  "last_updated_at": "2026-10-14T00:00:00Z"
}
```

Series are arrays of typed points, for example `{ "period_start": "2030-01-01", "period_end": "2030-12-31", "value": 100, "unit_code": "...", "lower_bound": null, "upper_bound": null, "quality_status": "CAUTION" }`. Null bounds mean no interval was supplied; do not draw invented confidence bands.

### `POST /api/v1/simulations/{simulation_run_id}/sensitivity`

Optional proposed route. Accepts a declared list of parameters and ranges; backend runs/retrieves supported sensitivity points and returns run IDs, fixed assumptions, varied parameter definitions, values and provenance. Do not simulate this client-side with arbitrary curve math.

### Regional geometry

Use existing app geometry if available; otherwise provide a separately versioned static GeoJSON asset in the frontend bundle or an approved geometry endpoint. Join results with stable canonical geography codes. Geometry is not itself labour-market data. Missing value means `No data`, never zero.

## 3. Required result fields

For every metric point or outcome, return where applicable:

- `metric_code`, `label`, `definition`, `unit_code`, `temporal_basis`.
- `value`, `baseline_value`, `scenario_value`, `delta_value`.
- geography/sector/occupation/skill IDs and canonical code systems.
- period or target year.
- calculation kind: estimate/forecast/scenario.
- `quality_status`, `provenance_state`, coverage/limitations.
- model/run version and generation time.
- confidence/interval fields only if defined and supplied by the model.

## 4. Error contract

Suggested safe error envelope:
```json
{
  "error": {
    "code": "BASELINE_NOT_COMPARABLE",
    "message": "This baseline cannot be compared with the selected scope.",
    "field_errors": {},
    "retryable": false
  }
}
```

Preserve draft inputs for all errors. A backend error must not be transformed into a zero-value result.
