# Skill Gap Analysis — Data Semantics and Interpretation Rules

## Core calculation

`gap = demand - supply` is permitted only when demand and supply have comparable definitions, units, period/horizon, geography and entity classification.

- Positive: estimated shortage (demand above supply).
- Negative: estimated surplus (supply above demand).
- Near zero: balanced only under a documented server-defined tolerance.
- Not comparable: show this explicitly and do not compute a numeric gap.

## Definitions that must remain separate

Do not mix people employed, labour-force participants, job postings, a demand index, training seat capacity, annual training completions, certification counts and available workforce supply. These are not interchangeable measures, and annual flows must not be subtracted from workforce stocks without a documented transformation.

## Scatter plot

A demand-versus-supply parity line only makes sense if x/y share an identical unit/definition. Above line means demand exceeds supply; below means supply exceeds demand. If units differ, do not draw the parity line; choose a suitable indexed/scaled comparison only if the analytics team defines it and explain the transform.

## Regional map

- Join map features to values by canonical region/state/UT code and a versioned crosswalk.
- Use a proper, licensed and versioned GeoJSON geometry source.
- Missing/suppressed data must use a neutral “No data” class; never style missing values as low shortage or as surplus.
- Map legend breaks/classification come from the API or governed config.
- The supplied PNG reference is decorative and must never be used as data geography.

## Percent gap

Do not assume a denominator. The API must provide a formula/definition for `gapPercent`, including how zero or missing demand/supply is handled. If there is no valid denominator, omit the percentage and explain why.

## Forecast vs observation

Use `Observed estimate` for a period estimate and `Forecast` for generated future values. Forecast horizons, model/version, uncertainty bounds, data coverage and as-of time must be available where applicable. Never label a historical estimate “Projected Shortage” unless it truly is a forecast.

## Insight claims

Each numeric statement in an insight needs source IDs and a reference to response metrics from the current applied-filter snapshot. If the AI insight service is unavailable, show a deterministic mock clearly labeled as demo or a service-unavailable message; do not present a prewritten mock as an AI result.

## Provenance

Every panel should distinguish `source_backed`, `derived`, `mixed`, `mock`, stale, partial coverage and unavailable states as appropriate. Never fall back silently from a failed API to mock data.
