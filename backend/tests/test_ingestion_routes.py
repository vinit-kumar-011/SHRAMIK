from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.ingestion import router
from app.core.config import get_settings


def build_client(monkeypatch, **env):
    monkeypatch.setenv("INGESTION_ADMIN_TOKEN", env.get("INGESTION_ADMIN_TOKEN", "test-ingest-token"))
    if env.get("OGD_API_KEY"):
        monkeypatch.setenv("OGD_API_KEY", env["OGD_API_KEY"])
    else:
        monkeypatch.delenv("OGD_API_KEY", raising=False)
    if env.get("OGD_ESHRAM_RESOURCE_ID"):
        monkeypatch.setenv("OGD_ESHRAM_RESOURCE_ID", env["OGD_ESHRAM_RESOURCE_ID"])
    else:
        monkeypatch.delenv("OGD_ESHRAM_RESOURCE_ID", raising=False)
    get_settings.cache_clear()
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return TestClient(app)


def test_source_registry_endpoint_never_exposes_resource_ids_or_secrets(monkeypatch):
    client = build_client(monkeypatch, OGD_API_KEY="secret-key-value", OGD_ESHRAM_RESOURCE_ID="resource-123")
    response = client.get("/api/v1/ingestion/sources")
    assert response.status_code == 200
    body = response.text
    assert "secret-key-value" not in body
    assert "resource-123" not in body
    assert "eshram_district_registrations" in body


def test_preview_requires_admin_token(monkeypatch):
    client = build_client(monkeypatch, OGD_API_KEY="secret-key-value", OGD_ESHRAM_RESOURCE_ID="resource-123")
    response = client.post("/api/v1/ingestion/preview/eshram_district_registrations")
    assert response.status_code == 401


def test_preview_is_disabled_until_api_key_configured(monkeypatch):
    client = build_client(monkeypatch)
    response = client.post(
        "/api/v1/ingestion/preview/eshram_district_registrations",
        headers={"X-Ingestion-Token": "test-ingest-token"},
    )
    assert response.status_code == 503
    assert "OGD_API_KEY" in response.text
