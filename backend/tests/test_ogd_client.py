import httpx
import pytest

from app.services.ingestion.ogd_client import OGDAPIError, OGDClient


def test_fetch_records_paginates_and_caps_rows():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        offset = int(request.url.params.get("offset", "0"))
        limit = int(request.url.params.get("limit", "0"))
        assert request.url.host == "api.data.gov.in"
        assert request.url.params.get("api-key") == "test-key"
        assert request.url.params.get("format") == "json"
        rows = [{"district": f"D{i}", "count": i} for i in range(offset, min(offset + limit, 5))]
        return httpx.Response(200, json={"total": 5, "records": rows})

    client = OGDClient("test-key", transport=httpx.MockTransport(handler), max_retries=0)
    result = client.fetch_records("abc12345-1234-1234-1234-123456789012", page_size=2, max_records=4)

    assert result.received_records == 4
    assert result.reported_total == 5
    assert result.truncated is True
    assert result.field_names == ["count", "district"]
    assert len(calls) == 2
    assert [int(request.url.params["offset"]) for request in calls] == [0, 2]


def test_fetch_records_reports_complete_snapshot():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"total": 2, "records": [{"x": 1}, {"x": 2}]})

    client = OGDClient("test-key", transport=httpx.MockTransport(handler), max_retries=0)
    result = client.fetch_records("abc12345", page_size=2, max_records=10)
    assert result.received_records == 2
    assert result.truncated is False


def test_rejects_resource_id_path_injection():
    client = OGDClient("test-key", max_retries=0)
    with pytest.raises(ValueError):
        client.fetch_records("../../other-host/api-key", page_size=1, max_records=1)


def test_errors_do_not_echo_api_key_or_request_url():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, json={"message": "not authorised"})

    client = OGDClient("secret-api-key", transport=httpx.MockTransport(handler), max_retries=0)
    with pytest.raises(OGDAPIError) as error:
        client.fetch_records("abc12345", page_size=1, max_records=1)
    assert "secret-api-key" not in str(error.value)
    assert "api.data.gov.in" not in str(error.value)


def test_rejects_unexpected_response_shape():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"message": "resource restricted"})

    client = OGDClient("test-key", transport=httpx.MockTransport(handler), max_retries=0)
    with pytest.raises(OGDAPIError, match="records array"):
        client.fetch_records("abc12345", page_size=1, max_records=1)
