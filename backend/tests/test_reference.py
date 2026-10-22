from fastapi.testclient import TestClient

from app.db import session as db_session
from app.db.session import get_db
from app.main import app

class FakeResult:
    def __init__(self, *, scalar=None, rows=None):
        self._scalar = scalar
        self._rows = rows or []

    def scalar_one(self):
        return self._scalar

    def mappings(self):
        return self

    def all(self):
        return self._rows


class FakeDb:
    def __init__(self, results):
        self.results = iter(results)
        self.calls = []

    def execute(self, query, params=None):
        self.calls.append((str(query), params))
        return next(self.results)


def make_client(db):
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)


def teardown_function():
    app.dependency_overrides.clear()


def test_district_list_uses_contract_envelope_and_pagination():
    db = FakeDb([
        FakeResult(scalar=2),
        FakeResult(rows=[{
            "district_id": "district_1",
            "name": "Khordha",
            "state_id": "state_od",
            "state_code": "OD",
            "lgd_district_code": "378",
        }]),
    ])
    response = make_client(db).get("/api/v1/districts?state_id=state_od&page=2&page_size=1")

    assert response.status_code == 200
    body = response.json()
    assert body["data"][0]["district_id"] == "district_1"
    assert body["data"][0]["lgd_district_code"] == "378"
    assert body["meta"]["page"] == 2
    assert body["meta"]["page_size"] == 1
    assert body["meta"]["total"] == 2
    assert body["meta"]["request_id"]
    assert response.headers["X-Request-ID"] == body["meta"]["request_id"]
    assert len(db.calls) == 2
    # Count and record queries must both use the typed nullable state filter.
    assert all("cast(:state_id as text)" in query.lower() for query, _ in db.calls)


def test_skills_include_taxonomy_mapping_metadata():
    db = FakeDb([
        FakeResult(scalar=1),
        FakeResult(rows=[{
            "skill_id": "skill_1",
            "name": "Electrician, General",
            "sector_id": "sector_f",
            "sector_name": "Construction",
        }]),
        FakeResult(rows=[{
            "skill_id": "skill_1",
            "taxonomy_name": "NCO-2015",
            "taxonomy_version": "2015",
            "taxonomy_code": "7411.0100",
            "mapping_method": "OFFICIAL_CROSSWALK",
            "mapping_confidence": "HIGH",
        }]),
    ])
    response = make_client(db).get("/api/v1/skills?active_only=false&taxonomy_name=NCO-2015")

    assert response.status_code == 200
    item = response.json()["data"][0]
    assert item["skill_id"] == "skill_1"
    assert item["sector_name"] == "Construction"
    assert item["taxonomy_mappings"] == [{
        "taxonomy_name": "NCO-2015",
        "taxonomy_version": "2015",
        "taxonomy_code": "7411.0100",
        "mapping_method": "OFFICIAL_CROSSWALK",
        "mapping_confidence": "HIGH",
    }]
    assert response.json()["meta"]["total"] == 1


def test_reference_endpoints_reject_page_size_above_contract_maximum():
    db = FakeDb([])
    response = make_client(db).get("/api/v1/districts?page_size=101")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_skill_mapping_query_is_skipped_for_empty_page():
    db = FakeDb([FakeResult(scalar=0), FakeResult(rows=[])])
    response = make_client(db).get("/api/v1/skills")
    assert response.status_code == 200
    assert response.json()["data"] == []
    assert response.json()["meta"]["total"] == 0
    assert len(db.calls) == 2


def test_unconfigured_database_uses_service_unavailable_envelope(monkeypatch):
    app.dependency_overrides.clear()
    monkeypatch.setattr(db_session, "SessionLocal", None)

    response = TestClient(app).get("/api/v1/districts")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SERVICE_UNAVAILABLE"
    assert response.json()["error"]["request_id"]
