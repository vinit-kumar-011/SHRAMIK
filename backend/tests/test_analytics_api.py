from collections.abc import Generator
from importlib import import_module

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.analytics import router  # noqa: F401 - ensures route module imports in tests

analytics_routes = import_module("app.api.routes.analytics")
from app.core.auth import require_supabase_user
from app.core.config import get_settings
from app.db.session import get_db
from app.main import app


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    tables = [
        """
        CREATE TABLE forecast_results (
            id TEXT, contract_version TEXT, analysis_mode TEXT, provenance_state TEXT,
            district_id TEXT, skill_id TEXT, period_type TEXT, period_year INTEGER,
            data_status TEXT, reason_code TEXT, demand_quantity NUMERIC, supply_quantity NUMERIC,
            demand_index NUMERIC, supply_index NUMERIC, forecast_demand NUMERIC, forecast_supply NUMERIC,
            demand_unit TEXT, supply_unit TEXT, demand_temporal_semantics TEXT, supply_temporal_semantics TEXT,
            gap_eligible BOOLEAN, gap_eligibility_reason TEXT, gap NUMERIC, status TEXT,
            forecast_uncertainty TEXT, confidence_level TEXT, confidence_inputs TEXT, evidence_coverage NUMERIC,
            model_version_id TEXT, calculation_run_id TEXT, is_active BOOLEAN,
            calculated_at TEXT, created_at TEXT
        )
        """,
        """
        CREATE TABLE early_warnings (
            id TEXT, forecast_result_id TEXT, emerging_skill_signal_id TEXT, warning_type TEXT,
            severity TEXT, detected_period INTEGER, explanation_code TEXT, calculation_run_id TEXT,
            is_active BOOLEAN, created_at TEXT
        )
        """,
        """
        CREATE TABLE emerging_skill_signals (
            id TEXT, contract_version TEXT, district_id TEXT, skill_id TEXT, period_type TEXT,
            period_year INTEGER, data_status TEXT, emerging_skill_status TEXT, recent_growth_rate NUMERIC,
            historical_growth_rate NUMERIC, signal_strength NUMERIC, analysis_mode TEXT,
            provenance_state TEXT, history_periods INTEGER, total_history_periods INTEGER,
            synthetic_history_periods INTEGER, is_contiguous BOOLEAN, calculation_run_id TEXT,
            is_active BOOLEAN, calculated_at TEXT, created_at TEXT
        )
        """,
        "CREATE TABLE demand_observations (id TEXT, provenance_state TEXT, is_synthetic BOOLEAN)",
        "CREATE TABLE supply_observations (id TEXT, provenance_state TEXT, is_synthetic BOOLEAN)",
    ]
    with engine.begin() as connection:
        for ddl in tables:
            connection.execute(text(ddl))

    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.state.test_session_factory = TestSession
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides.pop(require_supabase_user, None)
    test_client = TestClient(app)
    try:
        yield test_client
    finally:
        app.dependency_overrides.clear()
        if hasattr(app.state, 'test_session_factory'):
            del app.state.test_session_factory
        engine.dispose()


def authenticate() -> None:
    app.dependency_overrides[require_supabase_user] = lambda: {
        "id": "qa-user",
        "email": "qa@example.invalid",
        "role": "authenticated",
    }


def insert_forecast(client: TestClient, *, mode: str, provenance: str, forecast_id: str, year: int = 2025) -> None:
    # Use the same in-memory engine backing the TestClient dependency.
    db = app.state.test_session_factory()
    try:
        db.execute(
            text("""
                INSERT INTO forecast_results (
                    id, contract_version, analysis_mode, provenance_state, district_id, skill_id,
                    period_type, period_year, data_status, reason_code, demand_quantity, supply_quantity,
                    demand_index, supply_index, forecast_demand, forecast_supply, demand_unit, supply_unit,
                    demand_temporal_semantics, supply_temporal_semantics, gap_eligible, gap_eligibility_reason,
                    gap, status, forecast_uncertainty, confidence_level, confidence_inputs, evidence_coverage,
                    model_version_id, calculation_run_id, is_active, calculated_at, created_at
                ) VALUES (
                    :id, '1.1', :mode, :provenance, 'IN-OD-CUTTACK', 'SKILL-01',
                    'YEAR', :year, 'SUFFICIENT', NULL, 100, 80, NULL, NULL, 110, 90,
                    'persons', 'persons', 'FLOW', 'FLOW', TRUE, NULL, 20, 'SHORTAGE',
                    NULL, 'LOW', '{}', NULL, NULL, 'run-1', TRUE,
                    '2026-10-20T00:00:00Z', '2026-10-20T00:00:00Z'
                )
            """),
            {"id": forecast_id, "mode": mode, "provenance": provenance, "year": year},
        )
        db.commit()
    finally:
        db.close()


def test_analytics_endpoints_require_a_supabase_bearer_session(client: TestClient) -> None:
    response = client.get("/api/v1/analytics/forecasts")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_empty_forecast_store_is_explicit_not_fabricated(client: TestClient) -> None:
    authenticate()
    response = client.get("/api/v1/analytics/forecasts")
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["items"] == []
    assert body["meta"]["result_state"] == "NO_VALIDATED_RESULTS"
    assert body["meta"]["total"] == 0


def test_official_endpoint_excludes_demo_and_keeps_source_provenance(client: TestClient) -> None:
    authenticate()
    insert_forecast(client, mode="OFFICIAL", provenance="SOURCE_BACKED", forecast_id="official")
    insert_forecast(client, mode="DEMO", provenance="SYNTHETIC_DEMO", forecast_id="demo")

    response = client.get("/api/v1/analytics/forecasts")
    assert response.status_code == 200
    body = response.json()
    assert [item["id"] for item in body["data"]["items"]] == ["official"]
    assert body["meta"]["provenance_filter"] == "SOURCE_BACKED only"

    demo_response = client.get("/api/v1/analytics/forecasts?analysis_mode=DEMO")
    assert demo_response.status_code == 200
    assert [item["id"] for item in demo_response.json()["data"]["items"]] == ["demo"]


@pytest.mark.parametrize(
    "environment,showcase_mode",
    [("production", "false"), ("development", "true")],
)
def test_demo_analytics_mode_is_blocked_in_showcase_environment(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    environment: str,
    showcase_mode: str,
) -> None:
    authenticate()
    monkeypatch.setenv("ENVIRONMENT", environment)
    monkeypatch.setenv("SHRAMIK_SHOWCASE_MODE", showcase_mode)
    get_settings.cache_clear()
    try:
        for endpoint in ("forecasts", "early-warnings", "emerging-skills"):
            response = client.get(f"/api/v1/analytics/{endpoint}?analysis_mode=DEMO")
            assert response.status_code == 403
            assert "disabled for the official showcase" in str(response.json())

        # The same configured API remains available for the source-backed official mode.
        response = client.get("/api/v1/analytics/forecasts?analysis_mode=OFFICIAL")
        assert response.status_code == 200
    finally:
        get_settings.cache_clear()

def test_bad_year_range_returns_a_client_error(client: TestClient) -> None:
    authenticate()
    response = client.get("/api/v1/analytics/forecasts?year_from=2026&year_to=2024")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_status_reports_empty_pipeline_outputs(client: TestClient) -> None:
    authenticate()
    response = client.get("/api/v1/analytics/status")
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["result_state"] == "NO_VALIDATED_RESULTS"
    assert body["data"]["source_inputs"] == {"demand_observations": 0, "supply_observations": 0}
    assert body["data"]["published_outputs"]["active_official_source_backed_forecasts"] == 0
    assert body["data"]["published_outputs"]["active_official_source_backed_warnings"] == 0



def test_status_source_input_counts_exclude_synthetic_demo_rows(client: TestClient) -> None:
    authenticate()
    db = app.state.test_session_factory()
    try:
        db.execute(text("""
            INSERT INTO demand_observations (id, provenance_state, is_synthetic)
            VALUES ('official-demand', 'SOURCE_BACKED', FALSE),
                   ('demo-demand', 'SYNTHETIC_DEMO', TRUE)
        """))
        db.execute(text("""
            INSERT INTO supply_observations (id, provenance_state, is_synthetic)
            VALUES ('official-supply', 'SOURCE_BACKED', FALSE),
                   ('demo-supply', 'SYNTHETIC_DEMO', TRUE)
        """))
        db.commit()
    finally:
        db.close()

    response = client.get("/api/v1/analytics/status")
    assert response.status_code == 200
    assert response.json()["data"]["source_inputs"] == {
        "demand_observations": 1,
        "supply_observations": 1,
    }

def test_official_early_warnings_require_an_active_official_forecast(client: TestClient) -> None:
    authenticate()
    insert_forecast(client, mode="OFFICIAL", provenance="SOURCE_BACKED", forecast_id="official")
    db = app.state.test_session_factory()
    try:
        db.execute(
            text("""
                INSERT INTO early_warnings (
                    id, forecast_result_id, warning_type, severity, detected_period,
                    explanation_code, calculation_run_id, is_active, created_at
                ) VALUES ('warning-1', 'official', 'SHORTAGE', 'MEDIUM', 2025,
                          'RULE_TEST', 'run-1', TRUE, '2026-10-20T00:00:00Z')
            """)
        )
        db.commit()
    finally:
        db.close()

    response = client.get("/api/v1/analytics/early-warnings")
    assert response.status_code == 200
    assert [item["id"] for item in response.json()["data"]["items"]] == ["warning-1"]
