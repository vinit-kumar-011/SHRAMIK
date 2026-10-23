"""Minimal resilient client for the official OGD Platform resource API."""
from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import Any, Callable

import httpx

OGD_RESOURCE_BASE_URL = "https://api.data.gov.in/resource/"
_RESOURCE_ID_RE = re.compile(r"^[A-Za-z0-9-]{6,100}$")
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


class OGDAPIError(RuntimeError):
    """Sanitised upstream error; never includes a URL containing the API key."""


@dataclass(frozen=True)
class OGDResult:
    records: list[dict[str, Any]]
    reported_total: int | None
    field_names: list[str]
    received_records: int
    truncated: bool
    resource_id: str


class OGDClient:
    """Fetch paginated records from a known OGD resource.

    Resource IDs are validated, the host is fixed, API keys are passed only as
    request parameters, and error messages exclude the request URL. The client
    performs no database writes; callers persist a reviewed raw snapshot.
    """

    def __init__(
        self,
        api_key: str,
        *,
        timeout_seconds: float = 20.0,
        max_retries: int = 2,
        transport: httpx.BaseTransport | None = None,
        sleeper: Callable[[float], None] = time.sleep,
    ) -> None:
        if not api_key or not api_key.strip():
            raise ValueError("OGD API key is required.")
        self._api_key = api_key.strip()
        self._timeout_seconds = timeout_seconds
        self._max_retries = max(0, min(max_retries, 4))
        self._transport = transport
        self._sleeper = sleeper

    @staticmethod
    def validate_resource_id(resource_id: str) -> str:
        cleaned = (resource_id or "").strip()
        if not _RESOURCE_ID_RE.fullmatch(cleaned):
            raise ValueError("Invalid OGD resource ID. Use the resource identifier shown by data.gov.in.")
        return cleaned

    def _get_page(
        self,
        client: httpx.Client,
        resource_id: str,
        offset: int,
        limit: int,
    ) -> tuple[list[dict[str, Any]], int | None]:
        url = OGD_RESOURCE_BASE_URL + resource_id
        last_error = "OGD API request failed."
        for attempt in range(self._max_retries + 1):
            try:
                response = client.get(
                    url,
                    params={
                        "api-key": self._api_key,
                        "format": "json",
                        "limit": limit,
                        "offset": offset,
                    },
                )
            except httpx.TimeoutException:
                last_error = "OGD API request timed out."
                if attempt < self._max_retries:
                    self._sleeper(0.25 * (2**attempt))
                    continue
                raise OGDAPIError(last_error) from None
            except httpx.TransportError:
                last_error = "OGD API connection failed."
                if attempt < self._max_retries:
                    self._sleeper(0.25 * (2**attempt))
                    continue
                raise OGDAPIError(last_error) from None
            if response.status_code in _RETRYABLE_STATUS_CODES and attempt < self._max_retries:
                retry_after = response.headers.get("Retry-After")
                try:
                    delay = min(3.0, max(0.0, float(retry_after))) if retry_after else 0.25 * (2**attempt)
                except ValueError:
                    delay = 0.25 * (2**attempt)
                self._sleeper(delay)
                continue
            if response.status_code >= 400:
                raise OGDAPIError(f"OGD API returned HTTP {response.status_code}.")
            try:
                payload = response.json()
            except ValueError:
                raise OGDAPIError("OGD API returned invalid JSON.") from None
            if not isinstance(payload, dict):
                raise OGDAPIError("OGD API response was not a JSON object.")
            records = payload.get("records")
            if not isinstance(records, list) or any(not isinstance(row, dict) for row in records):
                raise OGDAPIError(
                    "OGD response did not contain a records array of objects; verify this resource's API contract."
                )
            reported_total = self._parse_total(payload.get("total", payload.get("count")))
            return records, reported_total
        raise OGDAPIError(last_error)

    @staticmethod
    def _parse_total(value: Any) -> int | None:
        if value is None:
            return None
        try:
            parsed = int(value)
            return parsed if parsed >= 0 else None
        except (TypeError, ValueError):
            return None

    def fetch_records(
        self, resource_id: str, *, page_size: int = 500, max_records: int = 5000
    ) -> OGDResult:
        resource_id = self.validate_resource_id(resource_id)
        if not 1 <= page_size <= 500:
            raise ValueError("page_size must be between 1 and 500.")
        if not 1 <= max_records <= 25_000:
            raise ValueError("max_records must be between 1 and 25000.")
        records: list[dict[str, Any]] = []
        reported_total: int | None = None
        offset = 0
        with httpx.Client(timeout=self._timeout_seconds, transport=self._transport) as client:
            while len(records) < max_records:
                limit = min(page_size, max_records - len(records))
                page, total = self._get_page(client, resource_id, offset, limit)
                if reported_total is None:
                    reported_total = total
                records.extend(page)
                offset += len(page)
                if not page or len(page) < limit:
                    break
                if reported_total is not None and offset >= reported_total:
                    break
        fields = sorted({key for row in records for key in row.keys()})
        truncated = (reported_total is not None and len(records) < reported_total) or (
            len(records) >= max_records and (reported_total is None or len(records) < reported_total)
        )
        return OGDResult(records, reported_total, fields, len(records), truncated, resource_id)
