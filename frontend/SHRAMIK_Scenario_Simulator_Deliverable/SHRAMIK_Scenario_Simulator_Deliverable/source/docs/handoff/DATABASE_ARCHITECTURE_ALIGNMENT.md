# Scenario Simulator — Database Architecture Alignment

This handoff was aligned to the existing `shramik_database_blueprint.sql` proposal and `shramik_data_sources_database_architecture` document. The schema proposal already defines:

- `analytics.simulation_runs`: baseline forecast run, model version, geography, scenario name, intervention start, training-capacity delta, training lag in months, parameters, input provenance, run status and creation timestamp.
- `analytics.simulation_results`: simulation run, metric code, optional occupation, period, baseline value, scenario value, delta, unit and quality status.
- `analytics.forecast_runs` / `analytics.forecast_results`: baseline forecasts, run configuration, target periods, value intervals and quality metadata.
- `analytics.result_lineage`: lineage to source retrievals and mapping/transform versions.
- `analytics.gap_results`: comparable demand and supply measures, gap value, unit, comparability status and method version.

These tables are specified in the architecture proposal; this file does **not** assert that migrations have already been applied to the active database or that production API routes exist.

## Frontend implications

- UI training lag is displayed in **years** in the design, while the proposed database stores `training_lag_months`; convert at the adapter boundary using integer months, and validate that the model supports the chosen precision.
- `training_capacity_delta` should mean the **additional annual seats** introduced by the scenario, not total baseline capacity. If existing backend semantics differ, resolve the contract before wiring the UI.
- Let the backend resolve the approved model version and baseline forecast when possible; return both in the run metadata. Do not let the frontend select an arbitrary unapproved model.
- Store target/evaluation year and other parameters in the scenario parameters in a documented, validated shape if no explicit columns exist. The backend owns the schema and validation.
- `simulation_results` stores baseline and scenario values by metric/time period; API responses should return demand, baseline supply, scenario supply and gaps using compatible definitions and units.
- No database migrations should be executed from this design package without backend review, integration tests and approval.

## Known prerequisites

The schema shape is suitable as a foundation, but the model calculation, training-seat-to-completion/workforce conversion assumptions, API implementation, data validation gates and scenario benchmark tests must be completed by the backend team. The frontend can proceed using deterministic, labelled fixtures meanwhile.
