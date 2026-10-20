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

## Tests

```bash
pytest
```

Database-backed tests will be added with the schema implementation.

## Read-only analytics API (feature branch)

The analytics routes are mounted below `/api/v1/analytics`:

- `GET /forecasts` — active forecast-result rows.
- `GET /early-warnings` — active warnings attached to active forecast rows.
- `GET /emerging-skills` — active emerging-skill signals.
- `GET /status` — source-input and validated-output counts.

These endpoints require a Supabase access token in `Authorization: Bearer <access-token>`. The server validates the token through Supabase Auth; it does not trust decoded JWT claims by themselves. Configure `SUPABASE_URL` and either `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY` in the backend environment, alongside `DATABASE_URL`. Never place a service-role key in the React application.

The default `analysis_mode=OFFICIAL` returns only `SOURCE_BACKED` rows. `analysis_mode=DEMO` is an explicit opt-in for mixed/synthetic demo outputs. List endpoints use bounded pagination (`limit` up to 200) and accept optional district, skill and year filters.

An empty output store returns HTTP 200 with `meta.result_state = NO_VALIDATED_RESULTS` and an empty `data.items` list. These are read-only endpoints; they do not create observations, run a model, calculate thresholds, or write forecast results. Those actions remain the responsibility of a reviewed batch pipeline. The current production database has no validated canonical demand/supply or forecast result rows, so the APIs should report that state rather than invent output.
