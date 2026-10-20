# SHRAMIK analytics engine (`ml/`)

Pure Python functions that turn yearly demand and supply observations into records that follow
`docs/methodology/SHRAMIK_ML_OUTPUT_CONTRACT.md` **v1.1**, plus a reproducible DEMO data generator.

Nothing in this folder connects to Supabase, calls FastAPI, or writes to the database.
Persisting results is a separate, reviewed step (readiness plan, workstream C).

| File | What it does | Contract section |
|---|---|---|
| `config/` | Every policy number: model-selection rules, 10% gap band, `MIN_FORECAST_HISTORY = 3`, `HIGH_CONFIDENCE_MIN_HISTORY = 5`, `MIN_FORECAST_DEMAND` (still **unset**) | 9, 14, 15, 18 |
| `vocab.py` | All allowed values (data_status, reason_code, status, …) in one place | 5, 13, schema 17.2 |
| `series.py` | Picks the usable yearly observations; OFFICIAL drops synthetic; no filling of missing years; refuses two values for one year | 5, 9, 9.1 |
| `forecast.py` | `naive_last_value` baseline and a time-aware back-test error | 10, 11 |
| `models.py` | Candidates `linear_trend` and `simple_exp_smoothing`, rolling-origin back-test, and the rule that picks a candidate over the baseline | 9.1, 10, 11, 20 |
| `gap.py` | Gap eligibility (unit, flow/stock, time basis, geography, occupation scope) and SHORTAGE / BALANCED / OVERSUPPLY / NO_DEMAND | 12–15 |
| `confidence.py` | Final confidence **caps**; a clearly labelled **provisional** base rule until Issue #16 | 16–19 |
| `pipeline.py` | `build_forecast_record()` → one contract record; `to_forecast_results_row()` → `forecast_results` columns | 2–24 |
| `contract.py` | `validate_record()` / `assert_valid()`: rejects any record that breaks the contract | all |
| `demo_generator.py` | Reproducible SYNTHETIC_DEMO observations + `synthetic_generation_runs` row | schema 6.3, 7, 14 |

## Baseline vs candidate models

The contract (section 10) allows a transparent model to be "evaluated against the baseline", and
says the baseline may legitimately win on short yearly series. `models.py` does exactly that:

1. **Candidates:** `linear_trend` (least squares on the real year numbers, so missing years are
   never filled in) and `simple_exp_smoothing` (fixed weight 0.5; refuses non-consecutive years).
   Forecasts below 0 are floored at 0 and the record says so. No model produces an uncertainty
   interval, so `forecast_uncertainty` stays `null`.
2. **Back-test (time-aware):** rolling origin with an expanding window. At each origin every model
   trains only on earlier years and predicts the next observed year. Every model is scored on the
   same years, and only years up to the cutoff are ever used.
3. **Selection rule (fixed in advance in `config/model_selection.py`, provisional, Issue #14):**
   one model per record for both demand and supply. A candidate replaces the baseline only if
   - every series has at least **3** back-test origins (so at least **6** usable years), **and**
   - it cuts the pooled, scale-free error by at least **10%**, **and**
   - it is strictly better than the baseline on **more than half** of the origins where they differ.

   Otherwise the baseline is used. With today's real data (at most a few years per series) that
   means the baseline, which is the expected, honest MVP outcome.
4. **Transparency:** every record carries `confidence_inputs.model_selection` with the selected
   model, the reason (`BASELINE_DEFAULT_SHORT_HISTORY`, `BASELINE_NOT_BEATEN`, `CANDIDATE_BETTER`,
   `BASELINE_FALLBACK_NOT_APPLICABLE`), the number of origins, each model's error and win share,
   and whether a forecast was floored at 0. It is stored in `forecast_results.confidence_inputs`.
   When a candidate is used, `forecast_error` is that candidate's back-test error.

Persisting a candidate's result needs a `model_versions` row for `linear_trend v1` or
`simple_exp_smoothing v1` (database owner), because `forecast_results.model_version_id` must
match `record["model"]`.

## What is final and what is provisional

**Final** (copied from the frozen contract): yearly periods, the minimum history of 3, OFFICIAL vs DEMO
counting, the null rules when data is insufficient, the reason-code mappings, gap eligibility,
the ±10% band with exactly 10% = BALANCED, NO_DEMAND precedence, the confidence caps, the
model-cutoff leakage rule, and `forecast_uncertainty = null` for the naive baseline.

**Provisional — owned by other issues, clearly labelled in the output:**
- Confidence base rule → Issue #16. Records carry `confidence_inputs.confidence_method = "PROVISIONAL_V0_PENDING_ISSUE_16"`.
- `evidence_coverage` = share of used observations that are source-backed **and** linked to an evidence item → Issues #16/#21.
- `demand_index` / `supply_index` are returned as `null` until Issue #13 fixes the normalisation reference set.
- `MIN_FORECAST_DEMAND` is `None` on purpose. The pipeline stops with a clear error until it is chosen from
  **source-backed** data (Issue #7). Tests inject a value, as the contract requires.

## Run the tests

From the repository root:

```
python -m pytest tests/analytics -q
```

Expected: `55 passed`.

## Generate DEMO data

1. Copy `data/demo/demo_config.example.json` to `data/demo/demo_config.json`.
2. Replace every `REPLACE_WITH_*` value with a **real id from the database** (`states.id`, `districts.id`, `skills.id`).
   The generator refuses to run while a placeholder remains. The config must also state
   `demand_/supply_quantity_unit` and `demand_/supply_quantity_semantics`: both columns are NOT NULL in the
   live `demand_observations` / `supply_observations` tables. Proposed names (`DEMO_SKILL_DEMAND`,
   `DEMO_SKILL_COMPLETIONS`, unit `persons`, semantics `FLOW` (the live tables only accept FLOW / STOCK / CAPACITY)) follow the style already used in
   `source_capabilities`; confirm with the database owner before loading.
3. Run:
   ```
   python -m ml.demo_generator --config data/demo/demo_config.json --out data/processed/demo
   ```
4. Give the output folder to the **database owner**. `load_demo.sql` loads it inside one transaction.
   It must be tried on a disposable database first, never directly on production.

The same seed and parameters always give the same rows and the same ids, so a repeated load is
rejected instead of creating duplicates.
