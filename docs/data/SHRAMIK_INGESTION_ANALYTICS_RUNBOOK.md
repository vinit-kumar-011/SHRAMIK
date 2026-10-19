# SHRAMIK ingestion and baseline analytics — first implementation slice

## What is included

- Canonical CSV parsing for demand and supply observations.
- Validation of observation grain, required fields, yearly periods, numeric ranges, UUID metadata and source/synthetic provenance.
- A deterministic naive-last-value baseline with the provisional three-year history threshold.
- Gap eligibility checks and gap classification only when an explicitly approved demand/supply signal pair is configured.
- JSON output containing run parameters, input hashes, row counts, model metadata, provenance and history diagnostics.
- Automated unit tests.

This remains an early backend slice rather than the full production service. There are now two separate commands:

- `scripts.run_baseline_pipeline` is offline/read-only: it validates CSVs and writes baseline analytics JSON locally. It never writes to Supabase.
- `scripts.ingest_canonical_observations` validates CSVs against registered reference/provenance data in the configured database. Its default mode performs read-only validation. Writes require both `--write` and an exact `--confirm-db-host` match. Writes are refused when `ENVIRONMENT=production`.

The SQLAlchemy repository writes only when explicitly enabled, validates foreign keys and source capabilities, and uses the database's canonical natural observation keys for replay detection. The importer stores historical observations only; it does not persist forecasts or warnings, create new source/retrieval/evidence records, expose an ingestion API endpoint, or register synthetic generator runs automatically. A dedicated non-production end-to-end database run is still required before this is considered release-ready.

## CSV input format

Pass two separate CSV files: one for demand and one for supply. Each CSV must include the fields documented in the parse_canonical_csv module.

Common required fields include:

- state_id, observation dimensions supported by observation_grain, period_type=YEAR, period_year
- source_id, source_date, retrieval_id, evidence_item_id
- provenance_state, is_synthetic, generation_run_id, transformation_note
- unit, flow_stock_semantics, quantity_semantics

Demand additionally uses demand_quantity and demand_signal_type.

Supply additionally uses supply_quantity, training_capacity, enrollment, completions, and supply_signal_type. Training capacity, enrollment and completions are preserved as separate measures; the forecast engine uses only supply_quantity as current supply.

Every source-backed row needs registered source and retrieval IDs; evidence is checked against the same source when supplied. The detailed flow_stock_semantics value must match source_capabilities (case-insensitively). quantity_semantics is a separate database enum: FLOW or STOCK for demand; FLOW, STOCK or CAPACITY for supply. Synthetic rows need explicit synthetic provenance, a generation-run ID and a transformation note. The offline analytics CLI may generate a missing run UUID for demonstration processing. The database importer deliberately does not create generation metadata: every synthetic row must carry a `generation_run_id` that already exists in `synthetic_generation_runs`. That run's generator/version/seed/parameters must be registered through the separately reviewed synthetic-data generation process before import. Synthetic rows must not claim source/retrieval/evidence IDs.

## Run the pipeline

From the repository root, run the tests:

    python -m pytest backend/tests/test_analytics_pipeline.py backend/tests/test_ingestion_repository.py backend/tests/test_ingestion_cli.py backend/tests/test_canonical_ingestion.py -q

Then run the CLI from the backend directory so the package imports resolve:

    cd backend
    python -m scripts.run_baseline_pipeline ^
      --demand-csv ../data/processed/demand_observations.csv ^
      --supply-csv ../data/processed/supply_observations.csv ^
      --output-json ../data/processed/baseline-results.json ^
      --analysis-mode DEMO ^
      --demand-signal-type VACANCY_HEADCOUNT ^
      --supply-signal-type WORKER_HEADCOUNT

The baseline command currently uses reviewed `DISTRICT_SECTOR_SKILL` series only for detailed forecasts. Aggregate grains are not expanded into skill-level records. Use the actual signal names in your dataset.

## Import canonical observations

From the `backend` directory, the default importer command is a **read-only database validation**. It checks the demand and supply CSVs against canonical reference IDs, registered source retrieval/evidence links, and the source-capability registry. It does not insert records:

    python -m scripts.ingest_canonical_observations ^
      --demand-csv ../data/processed/demand_observations.csv ^
      --supply-csv ../data/processed/supply_observations.csv ^
      --output-json ../data/processed/ingestion-validation.json

Only run a write test against a dedicated, reviewed non-production database. Set `ENVIRONMENT=development` (or another non-production value) and `DATABASE_URL` to that database, then confirm the hostname explicitly:

    python -m scripts.ingest_canonical_observations ^
      --demand-csv ../data/processed/demand_observations.csv ^
      --supply-csv ../data/processed/supply_observations.csv ^
      --write ^
      --confirm-db-host YOUR_NON_PRODUCTION_DATABASE_HOST ^
      --output-json ../data/processed/ingestion-report.json

The demand and supply batches share one outer transaction: a failure in either batch should roll back the import as a whole. Re-running an identical source release is skipped; changed content under the same natural key fails closed. A revised source release is a new version. Never infer that a dry-run guarantees successful commit; the database remains the authority for transaction-time constraints and concurrent imports.

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
- Observation identity matches the schema's unique keys. Source-backed identity includes geography/occupation grain, period, source ID, source release and signal type. Synthetic identity includes geography/occupation grain, period, generation-run ID and signal type. Retrieval/evidence references are payload provenance rather than alternate identities.
- The natural-key migration uses the established `uq_demand_source_key`, `uq_demand_synthetic_key`, `uq_supply_source_key` and `uq_supply_synthetic_key` names so it does not create duplicate indexes in environments where the canonical keys already exist. It intentionally stops if duplicate identities are found before index creation. Review actual index definitions and migration state in each target database before applying it.
- A few source_capabilities.state_scope values are descriptive strings rather than canonical state IDs (for example, MADHYA_PRADESH_SATNA_ONLY); those rows remain blocked by strict scope validation until the registry is normalized or a reviewed scope-mapping contract is added.

## Next gate

1. Keep CI green for the analytics engine, CSV validation, repository, and guarded importer.
2. Execute the read-only importer against a dedicated non-production database and check the row/hash report.
3. Run a write test in non-production, replay the same files to prove idempotency, and verify bad foreign keys, mismatched retrieval/source links, unknown capabilities and conflicting replays all fail without partial writes.
4. Add a supported synthetic-generation metadata registration step, then repeat the end-to-end/replay tests for synthetic DEMO data.
5. Add API/worker integration only after authentication, authorization, and transaction-boundary decisions are reviewed. Do not point the writer at production without an owner explicitly approving a release procedure.
6. Follow with backtesting, finalized gap thresholds, confidence/evidence scoring, early-warning rules and emerging-skill detection.
