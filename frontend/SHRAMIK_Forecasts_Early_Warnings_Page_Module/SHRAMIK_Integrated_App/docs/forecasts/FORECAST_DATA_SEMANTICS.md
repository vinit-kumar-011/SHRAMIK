# Forecast Data Semantics & Trust Rules

## 1. Definitions before presentation

- **Demand:** estimated requirement for workers/skills within a named geography, occupation/sector/skill, period and unit.
- **Supply:** a defined estimate of available workers or a documented proxy for the same target scope. Supply is not automatically equivalent to training completions or annual training seats.
- **Gap:** `demand - supply` only if demand and supply use comparable population definitions, coverage, geography, period and units.
- **Positive gap:** potential shortage under the adopted definition.
- **Negative gap:** potential surplus under the adopted definition.
- **Near zero:** approximately balanced only within a documented tolerance/rule.

If definitions are incomparable, do not calculate a combined gap. Present separate series with an explanation or mark the derived metric unavailable.

## 2. Forecast vs historical

- Historical observation: solid line and labelled observation period.
- Forecast: dashed line and forecast period/horizon clearly indicated.
- Uncertainty: shaded interval only where the response supplies lower/upper bounds and interval semantics (e.g. interval level). Never draw an invented band.
- Point forecast is not a certainty. State that results depend on available history, model assumptions, shocks and source coverage.
- Scenario curves are conditional on named assumptions; they are not independent factual predictions.

## 3. Model reliability

- `Data history coverage` describes the usable observations available for a series relative to a stated expected period/count.
- Backtest metrics must specify model/series/evaluation window and forecast horizon.
- MAE and RMSE keep their data units; MAPE is not suitable for every series, especially values near zero. Do not show invalid metrics without warning.
- A model's error measure must not be relabelled as a percentage confidence score.
- Do not show a model score, 78% history coverage or 65% confidence merely because these values appeared in an image.

## 4. Alert semantics

Each alert should expose:
- alert ID, entity/region and canonical code;
- severity/category and the explicit rule/threshold that triggered it;
- forecast horizon (expected risk period), not only record creation time;
- calculated values and units supporting the trigger;
- provenance/source labels, observation coverage and freshness;
- assumptions/limitations;
- workflow status and audit events as a separate concept from forecast risk.

Severity thresholds should be returned by or agreed with the analytics service. UI code should not invent them. A high-risk label means the configured rule was crossed; it does not guarantee that a shortage will occur.

## 5. Region map and risk matrix

- Use a maintained, verified state/UT geometry source with canonical state/UT codes.
- Join values by code, not fuzzy state names.
- `no-data` must have a neutral visual distinct from balanced/surplus/low risk.
- Legend class ranges and units must match the response/configuration.
- If geometry and measurements do not match, show the ranking table without pretending the map is valid.

## 6. Provenance

Use the app's existing provenance enum if one exists. Otherwise distinguish at minimum:
- `source-backed`: directly sourced observation;
- `derived`: calculated from sourced inputs;
- `forecast`: model output;
- `mock`: deterministic demonstration fixture;
- `mixed`: only when mixed provenance is explained field-by-field or via response metadata.

No mock value should be displayed as a source-backed value. The UI must not silently fall back from REST to mock data after an API error.
