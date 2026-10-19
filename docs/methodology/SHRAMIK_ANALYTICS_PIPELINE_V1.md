# SHRAMIK Canonical Ingestion & Analytics Pipeline v1

**Status:** First implementation slice; contract-aligned baseline, with provisional warning rules  
**Scope:** CSV ingestion validation, canonical observation upsert, naive forecasts, gap classification, emerging-skill signals, early warnings and evidence links  
**No schema migration is performed by these scripts.**

## 1. What this adds

The pipeline is a single transactional path:

1. Validate a UTF-8 canonical observation CSV.
2. Validate state, district, sector, skill, source, retrieval, evidence and source-capability references against Supabase.
3. Register a synthetic generation run when DEMO observations are present and attach its ID to those rows.
4. Upsert observations into `demand_observations` and `supply_observations`.
5. Compute analytical records using the pure `ml.analytics_engine` module.
6. Persist `model_versions`, `forecast_results`, `emerging_skill_signals`, `early_warnings` and existing evidence links in the same database transaction.

Any validation or persistence error aborts the transaction; the loader does not partially ingest a batch. The pipeline acquires a transaction-level advisory lock while writing so concurrent pipeline runs using this implementation do not race each other on the nullable logical observation keys.

## 2. Runtime setup

From the repository root, install the backend dependencies (SQLAlchemy and psycopg are already in `backend/requirements.txt`):

```powershell
python -m pip install -r backend/requirements.txt
$env:DATABASE_URL = "postgresql+psycopg://<server-side-user>:<password>@<host>:<port>/<database>?sslmode=require"
```

Use a development/non-production database URL while testing. Never paste the URL into source files, CSVs, browser variables, logs or issue comments.

## 3. Canonical CSV schema

The template is `data/templates/canonical_observations_template.csv`. It contains one observation per row.

| Column | Meaning |
|---|---|
| `kind` | `DEMAND` or `SUPPLY` |
| `state_id` | Existing canonical state/UT ID; required at every grain |
| `district_id`, `sector_id`, `skill_id` | Existing canonical IDs, blank when the source does not provide that dimension |
| `observation_grain` | One of the eight national grains documented in `SHRAMIK_CANONICAL_DATASET_PLAN.md` |
| `period_type`, `period_year` | MVP accepts annual periods only; no annual-to-monthly expansion |
| `quantity` | Non-negative number or blank for unavailable data; blank is never converted to zero |
| `signal_type` | Exact demand/supply signal vocabulary registered for the source |
| `source_id`, `retrieval_id`, `evidence_item_id` | Existing provenance UUIDs; source-backed rows require source and retrieval IDs |
| `provenance_state`, `is_synthetic`, `generation_run_id` | Explicit provenance flags; leave the run ID blank for a new synthetic batch |
| `unit`, `flow_stock_semantics` | Must agree with the registered `source_capabilities` entry for source-backed rows |
| `occupation_scope` | Explicit scope tag used to prevent unlike signals being compared |
| `transformation_note` | Required for synthetic rows; describe any transformation or derived measure |
| `source_date` | Optional ISO date (`YYYY-MM-DD`) |

Grain requirements are validated: for example, `DISTRICT_SECTOR_SKILL` requires district, sector and skill IDs. The loader does not fill in missing dimensions from a name or distribute aggregate counts across skills.

Source-backed rows require `source_id` and `retrieval_id`, with the retrieval and optional evidence item belonging to the same source. The matching `source_capabilities` row must exist for source ID + grain + signal type, and its unit/flow-stock semantics must match the CSV. Register/approve the capability first if it is absent.

For synthetic observations, leave source, retrieval and evidence IDs blank. The pipeline creates one `synthetic_generation_runs` record for the input file, keyed by input SHA-256, and sets the foreign key on the canonical observation rows. Re-running the same file under the same generator name reuses that run record.

## 4. Generate a test DEMO dataset

This utility reads canonical IDs but writes only a local CSV; it does not modify Supabase.

```powershell
python -m scripts.generate_shramik_demo_dataset `
  --output-csv data/demo_observations.csv `
  --allow-inactive-skill-for-demo `
  --start-year 2021 --end-year 2025 --random-seed 26246
```

The `--allow-inactive-skill-for-demo` switch is intentionally explicit. The current pilot skill mappings were inactive pending review in the October 18 audit. This flag does not approve or activate a mapping; it merely permits clearly synthetic DEMO records for a technical pipeline test. For a real dashboard, get the canonical skill-sector mapping approved.

All generated rows are tagged `SYNTHETIC_DEMO`, have no source/retrieval/evidence IDs and state that their quantities are synthetic. Do not use them in OFFICIAL mode or as evidence for government statistics. Their demand-versus-training-completions comparison is a **skill-pipeline pressure indicator**, not a literal worker-shortage estimate.

## 5. Run ingestion and analytics

```powershell
python -m scripts.run_shramik_pipeline `
  --input-csv data/demo_observations.csv `
  --analysis-mode DEMO `
  --demand-signal-type DEMO_JOB_DEMAND `
  --supply-signal-type DEMO_TRAINING_COMPLETIONS `
  --random-seed 26246 `
  --generator-name shramik_demo_generator `
  --generator-version 1.0 `
  --output-json artifacts/demo_pipeline_run.json
```

For source-backed data, choose signal types matching the source capability registry. When more than one source supplies a chosen signal type for the same district/skill, pass `--demand-source-id` or `--supply-source-id` to disambiguate. The engine never averages duplicate/conflicting sources without an approved aggregation rule.

The command persists rows and emits a JSON summary. The output includes canonical analytical fields, the calculation run ID, input SHA-256, history diagnostics and warning summaries. It does not create tables or run migrations.

## 6. Analytics methodology and semantics

### Forecast baseline

- MVP model: `naive_last_value`; each forecast quantity is the most recent valid observed quantity.
- Forecast period is derived from the latest actually observed year plus `--forecast-horizon`.
- `MIN_FORECAST_HISTORY` defaults to 3 usable annual observations per selected demand/supply series.
- OFFICIAL mode counts source-backed observations only. DEMO mode can use source-backed and synthetic rows and labels the output `SOURCE_BACKED`, `SYNTHETIC_DEMO` or `MIXED_PROVENANCE`.
- Non-contiguous history is not filled with fabricated periods. The naive baseline can use the last observed value, while emerging-skill annual growth requires consecutive latest years.
- Forecast uncertainty is `null` unless a separate validated uncertainty method is implemented. Demand/supply indices remain `null` until the normalization reference set is approved.

### Gap eligibility and classification

A gap is created only if demand and supply have matching units, flow/stock semantics, annual time basis, geography and occupation scope. When incompatible, the forecast quantities can be retained, but `gap` and `status` stay null and `gap_eligibility_reason` is populated.

`gap = forecast_demand - forecast_supply`. The initial ±10% of demand classification is read from the ML contract: above +10% is SHORTAGE; below -10% is OVERSUPPLY; otherwise BALANCED. A forecast demand at/below `--min-forecast-demand` is NO_DEMAND. The CLI default is **0** because the final positive demand floor remains a policy/configuration decision; do not treat this default as a validated national threshold.

### Confidence and evidence

Evidence coverage is the proportion of historical input rows carrying an actual `evidence_item_id`. It does not count source IDs as evidence links. Confidence is a deterministic trust indicator, not a probability. The first slice caps confidence at MEDIUM until held-out model evaluation is available; sparse history, synthetic contributions or insufficient linked evidence yield LOW. HIGH requires future evaluation/calibration work and must not be inferred from a long history alone.

### Emerging skills and warnings

- Emerging-skill detection uses a configurable 20% recent-growth threshold and requires at least the configured history floor. The latest two years must be consecutive and the previous quantity must be positive; otherwise the record is `INSUFFICIENT_DATA`, not zero growth.
- Early warnings consume forecast/gap outputs rather than recalculating them. Initial warning types are `PROJECTED_SHORTAGE` and `POTENTIAL_OVERSUPPLY`; warning severity thresholds are provisional until Issue #17 is reviewed. Low-confidence conditions are downgraded to WATCH.
- These thresholds are explicit parameters/constants and should be approved against source-backed pilot data. No LLM is used for numerical outputs.

## 7. Tests

From repository root:

```powershell
python -m pytest -q tests/test_shramik_analytics_pipeline.py
```

Tests cover deterministic forecast/gap output, insufficient-history nulls, incompatible signals, OFFICIAL/DEMO separation, source ambiguity, missing-year handling for emerging growth, synthetic/source provenance, and CSV validation. Database integration still needs to be run against a dedicated non-production database that has the current schema and approved reference rows.

## 8. Important boundaries

- Do not use `source_metric_observations`, PLFS benchmark-cell registries, seat capacity or aggregate district/state records as skill-level demand/supply without a reviewed adapter.
- The runner is for trusted server-side operators only; do not expose it as an unauthenticated web endpoint.
- No production DDL, migration-ledger edit, reset, or schema push is performed.
- This slice does not implement the later model-evaluation API (Issue #22), simulator, AI brief or browser-side database access.
