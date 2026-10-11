"""One-shot smoke test for an API-enabled data.gov.in resource.

Run from the backend directory:
    python -m app.ingestion.probe_data_gov_in \
        --resource-id <RESOURCE_UUID> \
        --source-id eshram-district-demographics \
        --source-url https://www.data.gov.in/resource/<resource-slug> \
        --max-records 10

Set DATA_GOV_IN_API_KEY in the shell environment first. The API key is never
written to the output or printed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.ingestion.data_gov_in import DataGovInClient, DataGovInError

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,80}$")


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _write_json(path: Path, payload: dict[str, Any]) -> bytes:
    encoded = (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_bytes(encoded)
    temporary.replace(path)
    return encoded


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Fetch and hash a small data.gov.in API sample.")
    parser.add_argument("--resource-id", required=True, help="Exact resource UUID from the official OGD API URL.")
    parser.add_argument("--source-id", required=True, help="Stable local slug, e.g. eshram-district-demographics.")
    parser.add_argument("--source-url", required=True, help="Official human-facing dataset/resource page URL.")
    parser.add_argument("--page-size", type=int, default=10, help="Rows requested per page (1-1000).")
    parser.add_argument("--max-records", type=int, default=10, help="Maximum total rows retrieved for this probe.")
    parser.add_argument("--output-dir", type=Path, default=None, help="Output folder; defaults to repository data/raw/.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if not _SLUG_RE.fullmatch(args.source_id):
        parser.error("--source-id must be a simple lowercase slug (letters, digits, hyphen, underscore).")
    if not args.source_url.startswith("https://"):
        parser.error("--source-url must use HTTPS.")
    if args.max_records < 1 or args.max_records > 10_000:
        parser.error("--max-records must be between 1 and 10000.")

    api_key = os.environ.get("DATA_GOV_IN_API_KEY", "").strip()
    if not api_key:
        parser.error("Set DATA_GOV_IN_API_KEY in your terminal environment first. Do not paste the key into chat or Git.")

    output_dir = args.output_dir
    if output_dir is None:
        repository_root = Path(__file__).resolve().parents[3]
        output_dir = repository_root / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)

    retrieved_at = datetime.now(timezone.utc)
    timestamp = retrieved_at.strftime("%Y%m%dT%H%M%S%fZ")
    records_path = output_dir / f"{args.source_id}_{timestamp}.json"
    manifest_path = output_dir / f"{args.source_id}_{timestamp}.manifest.json"

    try:
        with DataGovInClient(api_key) as client:
            records = list(
                client.iter_records(
                    args.resource_id,
                    page_size=args.page_size,
                    max_records=args.max_records,
                )
            )
    except (DataGovInError, ValueError) as exc:
        print(f"Source probe failed: {exc}", file=sys.stderr)
        return 2

    if not records:
        print("Source probe returned zero records; no files were written.", file=sys.stderr)
        return 2

    records_payload = {
        "resource_id": args.resource_id,
        "records": records,
    }
    records_bytes = _write_json(records_path, records_payload)
    observed_fields = sorted({key for record in records for key in record})
    manifest = {
        "source_id": args.source_id,
        "publisher": "Open Government Data (OGD) Platform India",
        "source_url": args.source_url,
        "resource_id": args.resource_id,
        "access_method": "API_JSON",
        "retrieved_at_utc": retrieved_at.isoformat(),
        "record_count": len(records),
        "page_size": args.page_size,
        "record_limit": args.max_records,
        "observed_fields": observed_fields,
        "grain_status": "PENDING_VERIFICATION",
        "signal_type_status": "PENDING_VERIFICATION",
        "records_file": records_path.name,
        "records_sha256": _sha256(records_bytes),
        "api_key_stored": False,
        "notes": [
            "Source records were captured without field mapping or analytical transformation.",
            "Verify source grain, units, period and field semantics before normalization.",
            "This probe does not establish a forecastable time series.",
        ],
    }
    _write_json(manifest_path, manifest)
    print(f"Fetched {len(records)} records.")
    print(f"Records: {records_path}")
    print(f"Manifest: {manifest_path}")
    print(f"SHA-256: {manifest['records_sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
