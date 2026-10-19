# SHRAMIK ingestion and baseline analytics — first implementation slice

## What is included

- Canonical CSV parsing for demand and supply observations.
- Validation of observation grain, required fields, yearly periods, numeric ranges, UUID metadata and source/synthetic provenance.
- A deterministic naive-last-value baseline with the provisional three-year history threshold.
- Gap eligibility checks and gap classification only when an explicitly approved demand/supply signal pair is configured.
- JSON output containing run parameters, input hashes, row counts, model metadata, provenance and history diagnostics.
- Automated unit tests.

This is not yet a complete production ingestion service. The CLI reads files and writes a local JSON result; it does not insert canonical observations or analytics into Supabase. A SQLAlchemy observation repository now provides live reference/capability validation and guarded, idempotent observation persistence, but writes are disabled by default and the repository is not wired into the API/CLI. Do not enable it until the natural-key migration and tests have been run against a dedicated non-production database.

## CSV input format

Pass two separate CSV files: one for demand and one for supply. Each CSV must include the fields documented in the parse_canonical_csv module.

Common required fields include:

- state_id, observation dimensions supported by observation_grain, period_type=YEAR, period_year
- source_id, source_date, retrieval_id, evidence_item_id
- provenance_state, is_synthetic, generation_run_id, transformation_note
- unit, flow_stock_semantics, quantity_semantics

Demand additionally uses demand_quantity and demand_signal_type.

Supply additionally uses supply_quantity, training_capacity, enrollment, completions, and supply_signal_type. Training capacity, enrollment and completions are preserved as separate measures; the forecast engine uses only supply_quantity as current supply.

Every source-backed row needs registered source and retrieval IDs; evidence is checked against the same source when supplied. The detailed flow_stock_semantics value must match source_capabilities (case-insensitively). quantity_semantics is a separate database enum: FLOW or STOCK for demand; FLOW, STOCK or CAPACITY for supply. Synthetic rows need explicit synthetic provenance, a generation-run ID and a transformation note. The CLI may generate a missing run UUID for offline processing, but a database import must register that run in synthetic_generation_runs before observations can be persisted. Synthetic rows must not claim source/retrieval/evidence IDs.

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
- The CLI does not write to Supabase. The new repository writer is opt-in (allow_writes=True), requires registered database references and does not commit the caller’s outer transaction.
- Observation replays are keyed by grain, period, signal and provenance references. Identical replays are skipped; changed content under an existing natural identity is rejected.
- The new natural-key migration is committed to this feature branch only and has not been applied to any database. It uses PostgreSQL 15+ NULLS NOT DISTINCT indexes and intentionally fails if existing duplicate identities are found.
- A few source_capabilities.state_scope values are descriptive strings rather than canonical state IDs (for example, MADHYA_PRADESH_SATNA_ONLY); those rows remain blocked by strict scope validation until the registry is normalized or a reviewed scope-mapping contract is added.

## Next gate

1. Run the expanded CI test suite and inspect every failure.
2. Apply the natural-key migration only to a dedicated non-production database after reviewing its duplicate preflight.
3. Run an end-to-end source-backed import, replay it to prove idempotency, and verify that bad foreign keys, mismatched retrieval/source links, unknown capabilities and conflicting replays all fail without partial writes.
4. Add a supported synthetic-generation metadata registration step, then repeat the end-to-end/replay tests for synthetic DEMO data.
5. Only after those gates pass, connect persistence to an API/worker transaction boundary. Do not point the writer at production until an owner explicitly approves it.
6. Follow with backtesting, finalized gap thresholds, confidence/evidence scoring, early-warning rules and emerging-skill detection.
