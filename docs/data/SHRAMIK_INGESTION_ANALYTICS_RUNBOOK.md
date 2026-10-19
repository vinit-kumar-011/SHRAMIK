# SHRAMIK ingestion and baseline analytics — first implementation slice

## What is included

- Canonical CSV parsing for demand and supply observations.
- Validation of observation grain, required fields, yearly periods, numeric ranges, UUID metadata and source/synthetic provenance.
- A deterministic naive-last-value baseline with the provisional three-year history threshold.
- Gap eligibility checks and gap classification only when an explicitly approved demand/supply signal pair is configured.
- JSON output containing run parameters, input hashes, row counts, model metadata, provenance and history diagnostics.
- Automated unit tests.

This is not yet a complete production ingestion service. The command reads files and writes a local JSON result; it does not insert canonical observations or analytics into Supabase. Source IDs, retrieval IDs, generation-run IDs, district/skill IDs and compatibility mappings must be checked against the target database before a future persistence adapter is allowed to write.

## CSV input format

Pass two separate CSV files: one for demand and one for supply. Each CSV must include the fields documented in the parse_canonical_csv module.

Common required fields include:

- state_id, observation dimensions supported by observation_grain, period_type=YEAR, period_year
- source_id, source_date, retrieval_id, evidence_item_id
- provenance_state, is_synthetic, generation_run_id, transformation_note
- unit, flow_stock_semantics

Demand additionally uses demand_quantity and demand_signal_type.

Supply additionally uses supply_quantity, training_capacity, enrollment, completions, and supply_signal_type. Training capacity, enrollment and completions are preserved as separate measures; the forecast engine uses only supply_quantity as current supply.

Every source-backed row needs a registered source ID. Synthetic rows need explicit synthetic provenance, a reproducible generation-run ID (the CLI creates one when missing), and a transformation note. Synthetic rows must not claim source/retrieval/evidence IDs.

## Run the pipeline

From the repository root, run the tests:

    python -m pytest backend/tests/test_analytics_pipeline.py -q

Then run the CLI from the backend directory so the package imports resolve:

    cd backend
    python -m scripts.run_baseline_pipeline ^
      --demand-csv ../data/processed/demand_observations.csv ^
      --supply-csv ../data/processed/supply_observations.csv ^
      --output-json ../data/processed/baseline-results.json ^
      --analysis-mode DEMO ^
      --demand-signal-type VACANCY_HEADCOUNT ^
      --supply-signal-type WORKER_HEADCOUNT

The command currently uses the reviewed DISTRICT_SECTOR_SKILL series only for detailed forecasts. Aggregate grains are not expanded into skill-level records. Use the actual signal names in your dataset.

## Gap compatibility

Matching units is not proof that two signals are semantically comparable. By default, gap classification is disabled unless an explicit pair has been reviewed. To enable one, provide a JSON file such as:

    [
      {
        "demand_signal_type": "VACANCY_HEADCOUNT",
        "supply_signal_type": "WORKER_HEADCOUNT",
        "approved": true,
        "approval_note": "Reviewed and approved by the methodology owner; cite the unit/time-basis rationale here."
      }
    ]

Do not use this example pair with real data unless the domain owners approve the semantics. Training-seat capacity or training completions must not be labelled employed worker supply merely to make the gap calculate.

## Deliberate limitations

- naive_last_value is the required MVP baseline, not a validated best model.
- Confidence stays LOW until proper time-aware backtesting and the Issue #16 methodology exist.
- Demand/supply indices remain null until the approved normalization formula is implemented.
- Gap tolerance defaults to exact equality pending Issue #15's approved thresholds.
- Early-warning and emerging-skill thresholds are not implemented in this slice.
- No Supabase writes are performed.
- There is no source-adapter registry or live source_capabilities DB validation yet; these are part of the next integration/persistence stage.

## Next gate

1. Run this workflow's tests and inspect any failures.
2. Add a reviewed reference-validation/repository layer against a non-production database.
3. Add safe, idempotent persistence for canonical observations and analytics only after canonical DB IDs and provenance references are verified.
4. Follow with backtesting, finalized gap thresholds, confidence/evidence scoring, early-warning rules and emerging-skill detection.
