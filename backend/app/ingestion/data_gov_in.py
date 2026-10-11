"""Small, testable client for API-enabled resources on data.gov.in.

This module only retrieves source records. It does not map them to canonical
skills, infer missing dimensions, or write to the SHRAMIK database.
"""
from __future__ import annotations

import re
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any

import httpx


_RESOURCE_ID_RE = re.compile(r"^[A-Za-z0-9-]+$")


class DataGovInError(RuntimeError):
    """A safe, source-level error raised while retrieving an OGD resource."""


@dataclass(frozen=True)
class DataGovInPage:
    """One page of source records and the pagination metadata returned by OGD."""

    resource_id: str
    offset: int
    limit: int
    total: int | None
    records: list[dict[str, Any]]


class DataGovInClient:
    """Retrieve records from an API-enabled data.gov.in resource.

    Pass the API key from configuration/environment; never put it in source
    code, browser code, logs, or repository files. Use this client only for
    resources whose portal page exposes a working Data API. Download-only
    resources need a separate file adapter.
    """

    def __init__(
        self,
        api_key: str,
        *,
        timeout: float = 20.0,
        transport: httpx.BaseTransport | None = None,
        base_url: str = "https://api.data.gov.in/resource/",
    ) -> None:
        if not api_key or not api_key.strip():
            raise ValueError("A data.gov.in API key is required.")
        if timeout <= 0:
            raise ValueError("timeout must be greater than zero.")
        if not base_url.startswith("https://"):
            raise ValueError("The OGD API base URL must use HTTPS.")

        self._api_key = api_key.strip()
        self._client = httpx.Client(
            base_url=base_url.rstrip("/") + "/",
            timeout=timeout,
            transport=transport,
            follow_redirects=True,
        )

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> "DataGovInClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    @staticmethod
    def _validate_request(resource_id: str, offset: int, limit: int) -> None:
        if not resource_id or not _RESOURCE_ID_RE.fullmatch(resource_id):
            raise ValueError("resource_id must contain only letters, digits, and hyphens.")
        if offset < 0:
            raise ValueError("offset cannot be negative.")
        if limit < 1 or limit > 1000:
            raise ValueError("limit must be between 1 and 1000.")

    @staticmethod
    def _optional_non_negative_int(value: object) -> int | None:
        if value is None:
            return None
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            return None
        return parsed if parsed >= 0 else None

    def fetch_page(
        self,
        resource_id: str,
        *,
        offset: int = 0,
        limit: int = 100,
    ) -> DataGovInPage:
        """Fetch a single page.

        Errors deliberately omit response bodies and request URLs because the
        request URL contains the API key as a query parameter.
        """
        self._validate_request(resource_id, offset, limit)

        try:
            response = self._client.get(
                resource_id,
                params={
                    "api-key": self._api_key,
                    "format": "json",
                    "offset": offset,
                    "limit": limit,
                },
            )
        except httpx.HTTPError:
            raise DataGovInError("Could not reach the data.gov.in API.") from None

        if not 200 <= response.status_code < 300:
            raise DataGovInError(
                f"data.gov.in returned HTTP {response.status_code}; "
                "check the resource ID, API key, and resource access."
            )

        try:
            payload = response.json()
        except ValueError:
            raise DataGovInError("data.gov.in returned a non-JSON response.") from None

        if not isinstance(payload, dict):
            raise DataGovInError("data.gov.in returned an unexpected response shape.")

        records = payload.get("records")
        if not isinstance(records, list):
            raise DataGovInError(
                "The resource response has no records array. Its API may be disabled "
                "or the response schema may differ; verify the resource page before retrying."
            )
        if any(not isinstance(record, dict) for record in records):
            raise DataGovInError("The resource returned a record that is not a JSON object.")

        total = self._optional_non_negative_int(payload.get("total"))
        return DataGovInPage(
            resource_id=resource_id,
            offset=offset,
            limit=limit,
            total=total,
            records=records,
        )

    def iter_records(
        self,
        resource_id: str,
        *,
        page_size: int = 100,
        max_records: int = 10_000,
    ) -> Iterator[dict[str, Any]]:
        """Yield records using offset pagination, with a hard retrieval cap."""
        self._validate_request(resource_id, 0, page_size)
        if max_records < 1:
            raise ValueError("max_records must be at least 1.")

        offset = 0
        while offset < max_records:
            requested = min(page_size, max_records - offset)
            page = self.fetch_page(resource_id, offset=offset, limit=requested)

            if not page.records:
                break

            for record in page.records:
                yield record

            offset += len(page.records)

            if page.total is not None and offset >= page.total:
                break
            if len(page.records) < requested:
                break
