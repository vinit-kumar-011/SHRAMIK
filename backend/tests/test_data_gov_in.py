import httpx
import pytest

from app.ingestion.data_gov_in import DataGovInClient, DataGovInError


RESOURCE_ID = "12345678-1234-1234-1234-123456789abc"


def test_fetch_page_returns_records_and_metadata():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith(RESOURCE_ID)
        assert request.url.params["api-key"] == "test-key"
        assert request.url.params["format"] == "json"
        assert request.url.params["offset"] == "0"
        assert request.url.params["limit"] == "2"
        return httpx.Response(
            200,
            json={"total": 3, "count": 2, "records": [{"district": "A"}, {"district": "B"}]},
        )

    with DataGovInClient(
        "test-key",
        transport=httpx.MockTransport(handler),
    ) as client:
        page = client.fetch_page(RESOURCE_ID, limit=2)

    assert page.total == 3
    assert page.offset == 0
    assert page.records == [{"district": "A"}, {"district": "B"}]


def test_iter_records_pages_until_all_records_are_received():
    offsets: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        offset = int(request.url.params["offset"])
        limit = int(request.url.params["limit"])
        offsets.append(offset)
        all_records = [
            {"id": 1},
            {"id": 2},
            {"id": 3},
        ]
        records = all_records[offset : offset + limit]
        return httpx.Response(
            200,
            json={
                "total": len(all_records),
                "count": len(records),
                "records": records,
            },
        )

    with DataGovInClient(
        "test-key",
        transport=httpx.MockTransport(handler),
    ) as client:
        records = list(client.iter_records(RESOURCE_ID, page_size=2))

    assert records == [{"id": 1}, {"id": 2}, {"id": 3}]
    assert offsets == [0, 2]


def test_iter_records_respects_hard_maximum():
    def handler(request: httpx.Request) -> httpx.Response:
        offset = int(request.url.params["offset"])
        limit = int(request.url.params["limit"])
        return httpx.Response(
            200,
            json={
                "total": 10_000,
                "count": limit,
                "records": [{"id": offset + index} for index in range(limit)],
            },
        )

    with DataGovInClient(
        "test-key",
        transport=httpx.MockTransport(handler),
    ) as client:
        records = list(client.iter_records(RESOURCE_ID, page_size=3, max_records=5))

    assert len(records) == 5
    assert [record["id"] for record in records] == [0, 1, 2, 3, 4]


def test_missing_records_array_is_reported_as_source_access_error():
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"message": "API is not enabled"})

    with DataGovInClient(
        "test-key",
        transport=httpx.MockTransport(handler),
    ) as client:
        with pytest.raises(DataGovInError, match="API may be disabled"):
            client.fetch_page(RESOURCE_ID)


def test_http_error_does_not_echo_api_key():
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(403, json={"error": "forbidden", "secret": "do not leak"})

    with DataGovInClient(
        "test-secret-key",
        transport=httpx.MockTransport(handler),
    ) as client:
        with pytest.raises(DataGovInError) as exc_info:
            client.fetch_page(RESOURCE_ID)

    assert "test-secret-key" not in str(exc_info.value)
    assert "do not leak" not in str(exc_info.value)


@pytest.mark.parametrize(
    ("resource_id", "offset", "limit"),
    [
        ("", 0, 100),
        ("https://evil.example/resource", 0, 100),
        (RESOURCE_ID, -1, 100),
        (RESOURCE_ID, 0, 1001),
    ],
)
def test_invalid_request_parameters_are_rejected(resource_id, offset, limit):
    with DataGovInClient("test-key", transport=httpx.MockTransport(lambda _: httpx.Response(200))) as client:
        with pytest.raises(ValueError):
            client.fetch_page(resource_id, offset=offset, limit=limit)


def test_missing_api_key_is_rejected():
    with pytest.raises(ValueError, match="API key is required"):
        DataGovInClient("  ")


def test_non_json_response_is_reported():
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>Access denied</html>")

    with DataGovInClient(
        "test-key",
        transport=httpx.MockTransport(handler),
    ) as client:
        with pytest.raises(DataGovInError, match="non-JSON"):
            client.fetch_page(RESOURCE_ID)
