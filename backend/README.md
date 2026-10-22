# SHRAMIK Backend

FastAPI backend foundation for SHRAMIK.

## Run locally

From the repository root:

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

Endpoints:
- `GET /api/health`
- `GET /docs`
- Versioned application prefix: `/api/v1`

## Environment

Use the root `.env.example`. Database-backed endpoints will use:

```text
DATABASE_URL=postgresql+psycopg://user:password@host:5432/database
```

For CORS, use an explicit comma-separated allowlist:

```text
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Never commit secrets.

## Official SIH showcase mode

Set `SHRAMIK_SHOWCASE_MODE=true` and `ENVIRONMENT=production` in the backend's server-side environment before the official showcase. The API rejects `analysis_mode=DEMO` for forecasts, warnings and emerging-skill results with HTTP 403. This is enforced server-side; hiding a frontend selector alone is not considered a data-safety boundary. Synthetic rows may remain in the database for development regression tests, but the official showcase API cannot return them via the DEMO mode routes.

Copy `backend/.env.example` as a local reference only. Set real credentials in the host's secret/environment settings; do not commit `.env` or place service-role credentials in any `VITE_*` variable. Verify the flag by requesting the official route (expected to work) and the DEMO route (expected HTTP 403) after configuration.

## Ingestion and analytics

The canonical CSV loader validates source-backed demand or supply observations and is **dry-run by default**. Run it from this directory with the source metadata and normalized CSV columns documented in `data/SOURCE_REGISTER.md`:

```powershell
python -m app.ingestion.csv_loader --kind supply --input ..\data\processed\supply_pilot.csv --source-name "Verified source title" --publisher "Source publisher" --source-url "https://source.example/data" --source-type DATASET
```

Add `--apply` only after reviewing a successful validation preview. Never place synthetic/demo data in this loader; use the dedicated demo generator so its seed and run metadata are recorded.

The committed DGE pilot transcription is `data/processed/employment_exchange_vacancies_state_2022.csv`. It contains 34 directly mappable State/UT rows from the official 2022 vacancies-notified table. From the backend directory, verify the source rows and idempotency with a dry run:

```powershell
python -m app.ingestion.csv_loader --kind demand --input ..\data\processed\employment_exchange_vacancies_state_2022.csv --source-name "Employment Exchange Statistics 2023 (reference period 2022)" --publisher "Directorate General of Employment / Ministry of Labour & Employment" --source-url "https://dge.gov.in/dge/sites/default/files/2023-03/Employment_Exchange_2023.pdf" --source-type REPORT
```

The connected Supabase project already has these 34 observations, so the dry run should validate all 34 rows without writing anything. If a deliberate `--apply` is later used, the loader should recognise matching observation rows as unchanged and add no duplicate demand rows. The CSV and retrieval hash are pinned to LF line endings by the root `.gitattributes`. Values remain State × Year and source-rounded; they are not mapped to districts or skills.

The audited source-metric promotion adapter normalizes two existing official, **state-level training-pipeline** metrics from source metric storage into `supply_observations`. It preserves the source/retrieval/evidence references, retains each fiscal year in a transformation note, and does not infer district or skill dimensions. It is dry-run by default:

```powershell
python -m app.ingestion.promote_source_metrics
python -m app.ingestion.promote_source_metrics --apply
```

These PMKVY trained/oriented and NAPS apprentices-engaged measures are training/apprenticeship flows, **not employed-worker stock**. They must not be compared directly with vacancy counts or fed into the district-by-skill baseline. The official analytics pipeline requires compatible `DISTRICT_SKILL` demand and supply series with at least three common years.

## Synthetic fixtures: local development only

**Do not seed synthetic history into the shared Supabase project or SIH showcase environment.** The production UI is official-only and does not offer a demo mode. The pilot synthetic observations/outputs previously used for integration testing were removed from the shared Supabase analytical tables on 22 October 2026; only the append-only generation audit record remains.

The demo generator is now guarded: it permits a local throwaway database by default and refuses remote database URLs. Remote writes require both the explicit CLI flag `--allow-synthetic-remote-db` and environment variable `SHRAMIK_ALLOW_SYNTHETIC_REMOTE_DB=true`; never enable that override for SHRAMIK's shared or SIH database.

For offline unit tests, rely on fixtures and mocked adapters. If a developer specifically needs a disposable local Postgres database, start it with a localhost `DATABASE_URL` before running:

```powershell
python -m app.ingestion.demo
python -m app.ingestion.pipeline --mode DEMO
```

Synthetic values use `SYNTHETIC_DEMO` provenance and must never be described as source-backed evidence. Official runs require compatible source-backed demand/supply series and explicit signals after reviewing their semantics.

## Tests

Run from this directory:

```bash
pytest
```

Tests cover API contracts, ingestion validation, source-metric promotion guardrails, and baseline analytics semantics.
