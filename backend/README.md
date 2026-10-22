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

For presentation and integration smoke testing, the separately labelled synthetic pilot can be created and processed:

```powershell
python -m app.ingestion.demo
python -m app.ingestion.pipeline --mode DEMO
```

Demo output is stored as `SYNTHETIC_DEMO` and returned only when the analytics endpoints are queried with `analysis_mode=DEMO`. It must not be described as source-backed evidence. Official runs require an explicit demand signal, supply signal, and `--confirm-compatible-signals` after reviewing the source semantics.

## Tests

Run from this directory:

```bash
pytest
```

Tests cover API contracts, ingestion validation, source-metric promotion guardrails, and baseline analytics semantics.
