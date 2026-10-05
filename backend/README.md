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
