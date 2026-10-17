#!/usr/bin/env python3
"""Bounded local capture of e-Shram OGD API rows.

PowerShell from the repository root:
    $env:DATA_GOV_IN_API_KEY = "<your key>"
    python ./scripts/capture_eshram_snapshot.py --max-records 1000 --max-pages 10

Raw pages go to git-ignored data/raw/eshram/; summaries go to
git-ignored data/processed/eshram/. This never crawls the reported total and
never interprets it as a registered-worker count.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

RESOURCE_ID = "1d4d1c5a-feea-423b-be4f-c3636fdd1d82"
ENDPOINT = f"https://api.data.gov.in/resource/{RESOURCE_ID}"
API_KEY_ENV = "DATA_GOV_IN_API_KEY"
ALLOWED_FILTERS = {
    "currentStateName", "currentStateCode", "currentDistrictName",
    "currentDistrictCode", "gender", "age", "DataGovUpdateDate",
    "primaryOccupation",
}
FREQUENCY_FIELDS = {
    "currentStateName": "current_state_name",
    "currentDistrictName": "current_district_name",
    "primaryOccupation": "primary_occupation",
}
SUPPRESS_BELOW = 5


class CaptureError(RuntimeError):
    """Safe-to-display failure; request URLs and keys are never included."""


def parse_filters(values: list[str] | None) -> dict[str, str]:
    result: dict[str, str] = {}
    for item in values or []:
        if "=" not in item:
            raise CaptureError("Filters must use FIELD=VALUE syntax.")
        field, value = (part.strip() for part in item.split("=", 1))
        if field not in ALLOWED_FILTERS or not value:
            raise CaptureError("Unsupported or empty filter field/value.")
        result[field] = value
    return result


def _int(value: Any, name: str, default: int | None = None) -> int:
    if value is None and default is not None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        raise CaptureError(f"Invalid API envelope field '{name}'; capture aborted.") from None


def request_page(api_key: str, offset: int, limit: int, filters: dict[str, str], timeout: float):
    params = [("api-key", api_key), ("format", "json"), ("offset", str(offset)), ("limit", str(limit))]
    params.extend((f"filters[{name}]", value) for name, value in sorted(filters.items()))
    request = Request(
        f"{ENDPOINT}?{urlencode(params)}",
        headers={"Accept": "application/json", "User-Agent": "SHRAMIK-eShram-capture/1.0"},
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            status, body = getattr(response, "status", 200), response.read()
    except HTTPError as exc:
        raise CaptureError(f"e-Shram API returned HTTP {exc.code}; request URL redacted.") from None
    except (URLError, TimeoutError, OSError):
        raise CaptureError("Unable to retrieve e-Shram response; request details redacted.") from None
    if not 200 <= status < 300:
        raise CaptureError(f"e-Shram API returned HTTP {status}; request URL redacted.")
    try:
        payload = json.loads(body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise CaptureError("Response was not valid JSON; capture aborted.") from None
    if not isinstance(payload, dict) or payload.get("success") is False:
        raise CaptureError("API returned a non-success envelope; it is not treated as zero rows.")
    if payload.get("status") not in (None, "ok", "success"):
        raise CaptureError("API returned a non-success envelope; it is not treated as zero rows.")
    records = payload.get("records")
    if not isinstance(records, list) or any(not isinstance(row, dict) for row in records):
        raise CaptureError("Expected a records array of JSON objects; capture aborted.")
    if _int(payload.get("count"), "count") != len(records):
        raise CaptureError("API count does not match returned records; capture aborted.")
    if _int(payload.get("offset"), "offset", offset) != offset:
        raise CaptureError("API response offset differs from requested offset; capture aborted.")
    _int(payload.get("limit"), "limit", limit)
    return body, payload, records


def _type(value: Any) -> str:
    if value is None: return "null"
    if isinstance(value, bool): return "boolean"
    if isinstance(value, int): return "integer"
    if isinstance(value, float): return "number"
    if isinstance(value, str): return "string"
    if isinstance(value, list): return "array"
    if isinstance(value, dict): return "object"
    return type(value).__name__


def _total(value: Any) -> int | str | None:
    if value is None: return None
    try: return int(value)
    except (ValueError, TypeError): return str(value)


def run_capture(*, api_key: str, output_root: Path, page_size: int = 1000,
                max_records: int = 1000, max_pages: int = 10, start_offset: int = 0,
                filters: dict[str, str] | None = None, timeout: float = 30.0) -> dict[str, Any]:
    if not api_key.strip(): raise CaptureError(f"Set {API_KEY_ENV}; key is never printed or written.")
    if not 1 <= page_size <= 10_000: raise CaptureError("page_size must be 1..10000.")
    if not 1 <= max_records <= 100_000: raise CaptureError("max_records must be 1..100000.")
    if not 1 <= max_pages <= 1_000: raise CaptureError("max_pages must be 1..1000.")
    if start_offset < 0: raise CaptureError("offset cannot be negative.")

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    raw_dir = output_root / "data" / "raw" / "eshram" / run_id
    out_dir = output_root / "data" / "processed" / "eshram" / run_id
    raw_dir.mkdir(parents=True, exist_ok=False)
    out_dir.mkdir(parents=True, exist_ok=False)
    filters = filters or {}
    rows_seen, offset = 0, start_offset
    pages: list[dict[str, Any]] = []
    totals: list[str] = []
    hashes: set[str] = set()
    exact_duplicates = 0
    types: dict[str, Counter[str]] = {}
    frequencies = {field: Counter() for field in FREQUENCY_FIELDS}
    suppressed = {field: 0 for field in FREQUENCY_FIELDS}
    first: dict[str, Any] | None = None

    for page_num in range(max_pages):
        remaining = max_records - rows_seen
        if remaining <= 0: break
        requested_limit = min(page_size, remaining)
        body, payload, records = request_page(api_key, offset, requested_limit, filters, timeout)
        if first is None: first = payload
        (raw_dir / f"page_{page_num:04d}_offset_{offset}.json").write_bytes(body)
        response_limit = _int(payload.get("limit"), "limit", requested_limit)
        totals.append(str(_total(payload.get("total"))))
        row_fields = []
        for row in records:
            row_fields.append(tuple(sorted(row)))
            serial = json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            digest = hashlib.sha256(serial.encode("utf-8")).hexdigest()
            if digest in hashes: exact_duplicates += 1
            hashes.add(digest)
            for name, value in row.items():
                types.setdefault(name, Counter())[_type(value)] += 1
            for name, counter in frequencies.items():
                value = row.get(name)
                if value is not None and str(value).strip():
                    counter[str(value).strip()] += 1
        pages.append({
            "page": page_num, "offset": offset, "requested_limit": requested_limit,
            "response_limit": response_limit, "rows": len(records), "response_bytes": len(body),
            "sha256": hashlib.sha256(body).hexdigest(),
            "field_names": sorted({name for row in records for name in row}),
            "field_sets_identical_within_page": len(set(row_fields)) <= 1,
        })
        rows_seen += len(records)
        if not records: break
        offset = _int(payload.get("offset"), "offset", offset) + len(records)
        if len(records) < response_limit: break

    if first is None: raise CaptureError("No page captured; no zero-valued dataset was created.")
    freq_path = out_dir / "captured_row_category_frequencies.csv"
    with freq_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["dimension", "category", "rows_in_bounded_capture", "interpretation"])
        for field, counter in frequencies.items():
            suppressed[field] = sum(n < SUPPRESS_BELOW for n in counter.values())
            for category, count in counter.most_common():
                if count >= SUPPRESS_BELOW:
                    writer.writerow([FREQUENCY_FIELDS[field], category, count,
                                     "frequency among bounded API rows only; not a population count"])
    result = {
        "dataset": "e-Shram district-wise demographic registration resource",
        "source_url": "https://www.data.gov.in/resource/district-wise-demographic-data-unorganised-workers-registered-eshram-previous-day",
        "api_endpoint": ENDPOINT, "resource_id": RESOURCE_ID,
        "capture_run_id_utc": run_id, "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
        "provenance_state": "PROVISIONAL_SOURCE_CONTEXT_ONLY", "capture_scope": "BOUNDED_PARTIAL_CAPTURE",
        "requested_filters": filters, "rows_returned_in_capture": rows_seen, "pages_captured": len(pages),
        "page_summaries": pages, "source_data_fetch_date": first.get("data_fetch_date"),
        "resource_updated_date": first.get("updated_date"),
        "api_reported_total_uninterpreted": _total(first.get("total")),
        "reported_total_equal_across_pages": len(set(totals)) <= 1,
        "record_field_names_observed": sorted(types),
        "record_field_type_counts": {name: dict(counts) for name, counts in sorted(types.items())},
        "exact_duplicate_record_objects_within_capture": exact_duplicates,
        "unique_worker_count": None, "active_jobseeker_count": None,
        "vacancy_count": None, "population_count_from_this_capture": None,
        "suppression_threshold": SUPPRESS_BELOW,
        "suppressed_category_counts": {
            FREQUENCY_FIELDS[field]: count for field, count in suppressed.items()
        },
        "frequency_file": str(freq_path), "raw_pages_local_path": str(raw_dir),
        "interpretation_guardrail": "Capture-row frequencies are not population totals, unique workers, jobseekers, or vacancies. API total is uninterpreted source metadata.",
    }
    summary_path = out_dir / "capture_summary.json"
    summary_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {"summary_path": summary_path, "frequency_path": freq_path, "raw_dir": raw_dir, "report": result}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--page-size", type=int, default=1000)
    parser.add_argument("--max-records", type=int, default=1000)
    parser.add_argument("--max-pages", type=int, default=10)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--filter", action="append", default=[], metavar="FIELD=VALUE")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--output-root", type=Path, default=Path.cwd())
    args = parser.parse_args(argv)
    try:
        result = run_capture(api_key=os.environ.get(API_KEY_ENV, ""), output_root=args.output_root.resolve(),
                             page_size=args.page_size, max_records=args.max_records, max_pages=args.max_pages,
                             start_offset=args.offset, filters=parse_filters(args.filter), timeout=args.timeout)
    except CaptureError as exc:
        print(f"Capture failed: {exc}", file=sys.stderr)
        return 2
    print(json.dumps({
        "status": "captured_bounded_snapshot",
        "rows_returned_in_capture": result["report"]["rows_returned_in_capture"],
        "pages_captured": result["report"]["pages_captured"],
        "summary_path": str(result["summary_path"]),
        "frequency_path": str(result["frequency_path"]),
        "raw_pages_local_path": str(result["raw_dir"]),
        "note": "Reported total remains uninterpreted; capture frequencies are not population counts.",
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
