from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_successful_envelope():
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["status"] == "ok"
    assert body["meta"]["request_id"]
    assert response.headers["X-Request-ID"] == body["meta"]["request_id"]


def test_health_echoes_valid_request_id():
    response = client.get("/api/health", headers={"X-Request-ID": "req_test_123"})
    assert response.status_code == 200
    assert response.json()["meta"]["request_id"] == "req_test_123"


def test_missing_resource_uses_standard_error_envelope():
    response = client.get("/api/not-found")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "RESOURCE_NOT_FOUND"
    assert response.json()["error"]["request_id"]


def test_invalid_request_id_is_replaced():
    response = client.get("/api/health", headers={"X-Request-ID": "contains whitespace"})
    assert response.status_code == 200
    request_id = response.json()["meta"]["request_id"]
    assert request_id != "contains whitespace"
    assert request_id.startswith("req_")
