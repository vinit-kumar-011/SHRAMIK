# SHRAMIK ingestion, baseline analytics and guarded persistence

## Scope

This implementation slice includes:

- Canonical CSV parsing for demand and supply.
- Validation of geography grain, dimension presence, annual periods, numeric values, source/synthetic provenance, UUID fields and separate supply measures.
- A deterministic naive-last-value baseline using the provisional minimum of three usable annual observations.
- Gap eligibility and classification only where units, quantity semantics, source-specific flow/stock semantics, periods and an explicitly approved signal pair are compatible.
- A non-production-only persistence command that validates reference IDs, retrieval status, source capabilities, and evidence ownership before writing.
- Idempotent upserts for observations and forecast results, immutable model-version rows, synthetic generation provenance, and forecast evidence links.
- Automated tests for analytics, the target guard, and mocked repository persistence.

The command does not run on the connected live SHRAMIK Supabase project. It blocks that project's identifier and requires an exact expected database hostname plus explicit non-production environment flags. There is no automatic fallback to production.

## CSV input format

Provide two separate CSV files: one demand file and one supply file. Each file must include the columns listed below; blank values are allowed only where the schema/provenance permits them.

Common columns:

- state_id, district_id, sector_id, skill_id, observation_grain
- period_type (YEAR), period_year
- source_id, source_release, source_date, retrieval_id, evidence_item_id
- provenance_state, is_synthetic, generation_run_id, transformation_note
- unit, flow_stock_semantics, quantity_semantics

Demand additionally requires demand_quantity and demand_signal_type.

Supply additionally requires supply_quantity, training_capacity, enrollment, completions, and supply_signal_type. Exactly one of the four numeric supply measures must be populated per row. Training capacity, enrollment and completions stay separate signals and are never silently treated as current employed supply; the first forecasting slice uses only supply_quantity.

flow_stock_semantics preserves a source-specific description and must be registered in source_capabilities for source-backed data. quantity_semantics is the canonical database enum:

- Demand quantity: FLOW or STOCK
- Supply quantity: FLOW or STOCK
- Training capacity: CAPACITY
- Enrollment or completions: FLOW

Use only dimensions actually supported by the source. Aggregate STATE or DISTRICT observations remain aggregate and are not expanded into skill-level rows.

### Source-backed rows

Source-backed rows must identify a registered source_id and successful retrieval_id. The retrieved source must have a registered capability matching signal type, observation grain, unit, flow/stock semantics and state scope. evidence_item_id is optional, but when supplied it must belong to the same source. Missing source/retrieval/evidence metadata is not invented.

### Synthetic demo rows

Synthetic rows require provenance_state=SYNTHETIC_DEMO, is_synthetic=true, and a non-empty transformation_note. They must not claim source_id, retrieval_id, or evidence_item_id. If generation_run_id is blank, the importer assigns an id derived deterministically from the demand and supply file hashes and registers that import run. Re-importing the same files is therefore idempotent; changing either file creates a new synthetic import run.

## Run tests (no database connection or writes)

From the repository root:

    python -m pytest backend/tests/test_analytics_pipeline.py backend/tests/test_write_safety.py backend/tests/test_pipeline_repository.py -q

GitHub Actions runs the same suite for this pipeline branch.

## Read-only analytics output

The existing read-only runner writes analytics JSON without touching Supabase. Use it when you only want to validate or inspect an input dataset.

    python backend/scripts/run_baseline_pipeline.py --help

## Persistence to a non-production database

Do not point this command at production. The current live SHRAMIK project is deliberately deny-listed. A separate non-production Supabase project or approved staging PostgreSQL database must be provisioned by the team before doing a database write test.

The persistence command requires all of the following:

1. --confirm-nonproduction-write on the command line.
2. SHRAMIK_ENABLE_DB_WRITES=true.
3. SHRAMIK_DEPLOYMENT_ENV=development, staging, or test.
4. SHRAMIK_DATABASE_TARGET=NON_PRODUCTION.
5. SHRAMIK_EXPECTED_DATABASE_HOST set to the exact host in the non-production DATABASE_URL.
6. DATABASE_URL pointing at that exact non-production host.

Example environment configuration in PowerShell (replace the host and connection string with your own approved non-production database values):

    $env:SHRAMIK_ENABLE_DB_WRITES = "true"
    $env:SHRAMIK_DEPLOYMENT_ENV = "staging"
    $env:SHRAMIK_DATABASE_TARGET = "NON_PRODUCTION"
    $env:SHRAMIK_EXPECTED_DATABASE_HOST = "db.<your-staging-project-ref>.supabase.co"
    $env:DATABASE_URL = "postgresql+psycopg://<user>:<password>@db.<your-staging-project-ref>.supabase.co:5432/postgres"

Then run from the repository root:

    python backend/scripts/persist_baseline_pipeline.py --demand-csv data/processed/demand_observations.csv --supply-csv data/processed/supply_observations.csv --output-json data/processed/baseline-results.json --analysis-mode DEMO --demand-signal-type VACANCY_HEADCOUNT --supply-signal-type WORKER_HEADCOUNT --confirm-nonproduction-write

Use the signal names actually present in your CSVs. The sample signal pair above is illustrative only; without a reviewed compatibility JSON, gap outputs remain gap-ineligible by default. If a compatibility JSON is supplied, it must contain an explicit approved pair and an approval note. Do not approve vacancies versus training-seat capacity/completions as a worker shortage unless the methodology owner has explicitly defined and approved the interpretation.

The importer validates existing canonical states/districts/sectors/skills, source/retrieval/capability references and evidence ownership. It writes observations, model versions, forecast results and evidence links inside a single SQL transaction. A validation/SQL error aborts the transaction. Source-backed observations require a successful retrieval and matching source capability. The persistence command does not apply schema migrations.

## Baseline behaviour and deliberate limitations

- naive_last_value forecasts from the latest usable annual observation. It is a required MVP baseline, not a validated best model.
- OFFICIAL excludes synthetic history. DEMO can use synthetic/mixed history while preserving its actual provenance.
- At least three usable years per demand and supply series are required by default. Missing years are not fabricated.
- Detailed forecasts are emitted only for DISTRICT_SECTOR_SKILL observations.
- Gap calculation is blocked by incompatible units, quantity class, source-specific semantics or period, and by any unapproved signal pair.
- Confidence stays LOW until time-aware backtesting and the Issue #16 confidence methodology are implemented.
- Demand/supply indices remain null until the approved normalization formula is implemented.
- Early-warning and emerging-skill engines are not part of this slice; their thresholds are owned by separate methodologies.
- The repository persistence tests use a fake SQL session. A real non-production PostgreSQL integration test is still required before treating persistence as production-ready.
