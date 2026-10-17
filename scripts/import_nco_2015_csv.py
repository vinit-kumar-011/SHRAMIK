#!/usr/bin/env python3
"""Validate a prepared NCO-2015 CSV and optionally sync it to Supabase staging.

This path is intended for the source-reviewed PDF-derived catalogue. It does not
fetch from DGE and does not infer NIC sector mappings. Dry-run is the default;
use --sync-db explicitly to write to public.stg_nco_2015_occupations.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

SOURCE_NAME = "National Classification of Occupations 2015"
NCO_CODE_RE = re.compile(r"^\d{4}\.\d{4}$")
SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
CORE_FIELDS = (
    "nco_code", "occupation_title", "nco_2004_code", "division",
    "sub_division", "occupation_group", "occupation_family",
)
CSV_FIELDS = (
    *CORE_FIELDS, "source_url", "source_page", "source_row_number",
    "source_snapshot_sha256", "retrieved_at",
)


def canonical_snapshot_hash(records: list[dict[str, Any]]) -> str:
    """Hash the normalized occupation identity and classification fields."""
    payload = [
        {field: (row.get(field) or None) for field in CORE_FIELDS}
        for row in sorted(records, key=lambda item: str(item["nco_code"]))
    ]
    blob = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def read_and_validate_csv(
    csv_path: Path, expected_count: int = 3451
) -> tuple[list[dict[str, Any]], str]:
    if not csv_path.is_file():
        raise ValueError(f"CSV file not found: {csv_path}")

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing_fields = set(CSV_FIELDS) - set(reader.fieldnames or [])
        if missing_fields:
            raise ValueError(f"CSV is missing required columns: {sorted(missing_fields)}")
        records = [{field: (row.get(field) or "").strip() for field in CSV_FIELDS} for row in reader]

    if expected_count > 0 and len(records) != expected_count:
        raise ValueError(
            f"Row count mismatch: expected exactly {expected_count}, found {len(records)}. "
            "No database changes were made. Adjust --expected-count only after reviewing the catalogue."
        )
    if not records:
        raise ValueError("CSV contains no occupation records.")

    seen: set[str] = set()
    for row_number, row in enumerate(records, start=2):
        code = row["nco_code"]
        if not NCO_CODE_RE.fullmatch(code):
            raise ValueError(f"Invalid NCO code at CSV row {row_number}: {code!r}")
        if code in seen:
            raise ValueError(f"Duplicate NCO code at CSV row {row_number}: {code}")
        seen.add(code)
        if not row["occupation_title"]:
            raise ValueError(f"Blank occupation_title at CSV row {row_number} ({code})")
        if not row["source_url"].startswith("https://dge.gov.in/"):
            raise ValueError(f"Unexpected/non-HTTPS source URL at CSV row {row_number} ({code})")
        try:
            source_page = int(row["source_page"])
            source_row_number = int(row["source_row_number"])
            if source_page < 1 or source_row_number < 1:
                raise ValueError
        except (TypeError, ValueError):
            raise ValueError(f"Invalid source page/ordinal at CSV row {row_number} ({code})")
        row["source_page"] = source_page
        row["source_row_number"] = source_row_number
        if not SHA256_RE.fullmatch(row["source_snapshot_sha256"]):
            raise ValueError(f"Invalid snapshot SHA-256 at CSV row {row_number} ({code})")
        try:
            row["retrieved_at"] = datetime.fromisoformat(row["retrieved_at"].replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError(f"Invalid retrieved_at at CSV row {row_number} ({code})") from exc

    hashes = {row["source_snapshot_sha256"] for row in records}
    if len(hashes) != 1:
        raise ValueError("Records contain multiple snapshot hashes; refusing to import a mixed snapshot.")
    actual_hash = canonical_snapshot_hash(records)
    recorded_hash = next(iter(hashes))
    if actual_hash != recorded_hash:
        raise ValueError(
            f"Snapshot hash mismatch: CSV records hash to {actual_hash}, but record metadata says "
            f"{recorded_hash}. No database changes were made."
        )
    return records, actual_hash


def sync_database(records: list[dict[str, Any]], database_url: str, snapshot_hash: str) -> int:
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError(
            "Database sync needs psycopg. Install dependencies with: "
            "python -m pip install -r backend/requirements.txt"
        ) from exc

    upsert_sql = """
        insert into public.stg_nco_2015_occupations (
            nco_code, occupation_title, nco_2004_code, division, sub_division,
            occupation_group, occupation_family, source_id, source_url,
            source_page, source_row_number, source_snapshot_sha256, retrieved_at,
            imported_at, is_current
        ) values (
            %(nco_code)s, %(occupation_title)s, %(nco_2004_code)s, %(division)s,
            %(sub_division)s, %(occupation_group)s, %(occupation_family)s,
            %(source_id)s, %(source_url)s, %(source_page)s, %(source_row_number)s,
            %(source_snapshot_sha256)s, %(retrieved_at)s, now(), true
        )
        on conflict (nco_code) do update set
            occupation_title = excluded.occupation_title,
            nco_2004_code = excluded.nco_2004_code,
            division = excluded.division,
            sub_division = excluded.sub_division,
            occupation_group = excluded.occupation_group,
            occupation_family = excluded.occupation_family,
            source_id = excluded.source_id,
            source_url = excluded.source_url,
            source_page = excluded.source_page,
            source_row_number = excluded.source_row_number,
            source_snapshot_sha256 = excluded.source_snapshot_sha256,
            retrieved_at = excluded.retrieved_at,
            imported_at = now(),
            is_current = true
    """

    with psycopg.connect(database_url) as conn:
        with conn.transaction():
            source_rows = conn.execute(
                "select id from public.data_sources where name = %s",
                (SOURCE_NAME,),
            ).fetchall()
            if len(source_rows) != 1:
                raise RuntimeError(
                    f"Expected exactly one data_sources row named {SOURCE_NAME!r}; found {len(source_rows)}."
                )
            source_id = source_rows[0][0]

            # Transactional snapshot replacement: if any insert/verification fails,
            # all is_current changes roll back with the transaction.
            conn.execute("update public.stg_nco_2015_occupations set is_current = false where is_current = true")
            with conn.cursor() as cur:
                cur.executemany(
                    upsert_sql,
                    [{**row, "source_id": source_id} for row in records],
                )

            counts = conn.execute(
                """select count(*)::bigint, count(distinct nco_code)::bigint
                   from public.stg_nco_2015_occupations
                   where is_current = true and source_snapshot_sha256 = %s""",
                (snapshot_hash,),
            ).fetchone()
            if counts != (len(records), len(records)):
                raise RuntimeError(
                    f"Post-import verification failed: expected {len(records)} rows/codes, got {counts}."
                )

            current_count = conn.execute(
                "select count(*)::bigint from public.stg_nco_2015_occupations where is_current = true"
            ).fetchone()[0]
            if current_count != len(records):
                raise RuntimeError(
                    f"Current snapshot verification failed: expected {len(records)} current rows, got {current_count}."
                )
    return len(records)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, required=True, help="Path to nco_2015_occupations_validated.csv")
    parser.add_argument(
        "--expected-count", type=int, default=3451,
        help="Exact expected row count (default: 3451 for the reviewed snapshot).",
    )
    parser.add_argument(
        "--sync-db", action="store_true",
        help="Explicitly replace the current staging snapshot in Supabase after all local validation passes.",
    )
    args = parser.parse_args(argv)
    if args.expected_count < 0:
        parser.error("--expected-count must be >= 0 (0 disables exact row-count check).")

    try:
        records, snapshot_hash = read_and_validate_csv(args.csv, args.expected_count)
        print(f"Validated {len(records)} unique NCO-2015 occupation rows.")
        print(f"Snapshot SHA-256: {snapshot_hash}")
        print(f"Blank NCO-2004 mappings (not inferred): {sum(not r['nco_2004_code'] for r in records)}")
        if not args.sync_db:
            print("Dry run only: Supabase was not changed. Add --sync-db to perform the transactional staging import.")
            return 0

        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise RuntimeError(
                "--sync-db requires DATABASE_URL in the local environment. Set it locally; do not paste credentials into chat."
            )
        count = sync_database(records, database_url, snapshot_hash)
        print(f"Imported and verified {count} current rows in public.stg_nco_2015_occupations.")
        return 0
    except (RuntimeError, ValueError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
