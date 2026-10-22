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
