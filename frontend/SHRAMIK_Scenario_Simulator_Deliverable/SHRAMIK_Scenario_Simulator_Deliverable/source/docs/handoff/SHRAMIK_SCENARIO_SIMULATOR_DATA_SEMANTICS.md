# Scenario Simulator — Data Semantics & Calculation Rules

This file locks the meaning of the main inputs and outputs so UI labels do not promise more than the model calculates.

## 1. Intervention meaning

**Primary intervention:** additional annual training seats (increment/delta), not total baseline capacity.

- UI label: `Additional annual training seats`.
- Baseline training capacity remains a separate model/baseline fact where available.
- Input is a scenario parameter. It is not itself a count of trained people, certificates, new workers, or employed persons.
- Training lag is a duration between intervention and its modelled effect; its exact timing convention must be documented by the backend/model. UI must not invent it.
- Intervention start year, training lag, chart horizon and evaluation year are distinct fields.
- UI may display advanced conversion assumptions only where the model supports and validates them.

## 2. Required baseline and scenario series

At minimum, the result contract should make the following distinct:

- Baseline demand
- Scenario demand
- Baseline supply
- Scenario supply
- Baseline gap
- Scenario gap

For a supply-side-only training intervention, demand is unchanged: `scenario_demand == baseline_demand` for the same periods/scope unless a separate, explicit demand-side effect is an approved model input and its result is returned by the backend. Do not offset lines to make identical series appear different.

Scenario supply may differ only when the model says the additional seats can affect completions/certifications/workforce entry under its validated lag and conversion assumptions. Never assume one seat equals one additional worker.

## 3. Gap sign convention

Use one convention everywhere and return it from the backend:

`gap = demand - supply`

- `gap > 0`: shortage under the chosen compatible measures.
- `gap == 0`: approximate balance at the metric precision.
- `gap < 0`: surplus under the chosen compatible measures.

This is valid only if demand and supply have compatible scope, geography, period, unit and defensible metric definitions. Backend comparability gate must reject invalid pairs. The frontend must not override a `NOT_COMPARABLE`/unsupported result.

## 4. Gap-to-demand ratio and gap reduction

Only display `gap / demand` when demand is nonzero and the measures are comparable. State whether the UI presents signed ratio or shortage-only ratio.

For a positive baseline shortage, optional shortage reduction can be defined as `(baseline_shortage - scenario_shortage) / baseline_shortage * 100`, but the backend must specify whether negative scenario gaps are capped, whether it uses signed gaps, and how rounding is handled. If the baseline gap is zero or a surplus, do not display a misleading gap-reduction percentage; show absolute change or not-applicable text instead.

## 5. Forecast timeline

- Observed historical values are distinguished from estimates, forecasts and scenario values.
- Forecast horizon, target period and evaluation year must be explicit.
- Draw uncertainty bands only when valid bounds arrive from the backend, and identify what interval/coverage they represent.
- If a metric lacks enough approved history, show an insufficient-data state rather than generating a forecast to fill a chart.
- Demand and supply units should not be mixed on a chart without explicit comparability, scale and label design.

## 6. Regional impact

- Use a verified geography geometry and stable canonical geography codes.
- The map metric and ranking table must come from the same result set and evaluation year.
- Distinguish shortage reduction, no change, increasing gap, surplus and no data. Never map null/unsupported values to zero or the lowest severity.
- Regional aggregation is permitted only where the underlying metric supports that geography.

## 7. Provenance & truthfulness

Use provenance states consistent with SHRAMIK's existing architecture where possible, including `SOURCE_BACKED`, `MIXED`, and `SYNTHETIC_DEMO`. Every mock result must carry a visible demo label. Do not silently mix mock data into real results.

Run metadata should include the baseline forecast run, input manifest/scope, model version, run status, timestamps, quality state and lineage wherever supplied. Show caveats, data coverage and uncertainty in the UI.

## 8. Back-end owns calculations

The React page may format numbers and derive purely presentational geometry (e.g. chart scaling). It must not own the production simulation formula, forecast logic, conversion of seats to employed workers, uncertainty estimation, risk rules or data-quality gate.
