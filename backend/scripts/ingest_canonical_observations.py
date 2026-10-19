"""Reference-validated canonical demand/supply CSV importer.

Default mode is a read-only database validation. To write, pass --write and
explicitly confirm the configured database hostname with --confirm-db-host.
Production environments are deliberately blocked by this command.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.ingestion.canonical_csv import ParsedBatch, parse_canonical_csv
from app.ingestion.repository import ObservationRepository, PersistenceValidationError


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Validate source/provenance references in SHRAMIK canonical CSVs; "
            "database writes are opt-in and blocked in production."
        )
    )
    parser.add_argument("--demand-csv", type=Path, required=True)
    parser.add_argument("--supply-csv", type=Path, required=True)
    parser.add_argument(
        "--write",
        action="store_true",
        help="Persist both batches atomically. Default is read-only reference validation.",
    )
    parser.add_argument(
        "--confirm-db-host",
        help="Required with --write; must exactly match the hostname in DATABASE_URL.",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        help="Optional path for a machine-readable ingestion report.",
    )
    return parser


def _validate_files(demand_path: Path, supply_path: Path) -> tuple[ParsedBatch, ParsedBatch]:
    for label, path in (("demand", demand_path), ("supply", supply_path)):
        if not path.is_file():
            raise ValueError(f"{label} CSV does not exist: {path}")

    demand = parse_canonical_csv(demand_path, "demand")
    supply = parse_canonical_csv(supply_path, "supply")
    errors: list[str] = []
    for label, batch in (("demand", demand), ("supply", supply)):
        if batch.issues:
            errors.extend(f"{label} {issue}" for issue in batch.issues[:30])
            if len(batch.issues) > 30:
                errors.append(f"{label}: and {len(batch.issues) - 30} additional validation issue(s)")
        elif not batch.observations:
            errors.append(f"{label}: CSV contains no observations")
    if errors:
        raise ValueError("CSV validation failed:\n- " + "\n- ".join(errors))
    return demand, supply


def _report_for_batch(
    batch: ParsedBatch,
    *,
    validated_rows: int,
    write_result: Any | None,
) -> dict[str, Any]:
    item: dict[str, Any] = {
        "kind": batch.kind,
        "source_file": batch.source_path,
        "sha256": batch.sha256,
        "rows_in_file": len(batch.observations),
        "rows_reference_validated": validated_rows,
    }
    if write_result is not None:
        item.update(
            rows_inserted=write_result.inserted_rows,
            rows_skipped_identical=write_result.skipped_identical_rows,
        )
    return item


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    settings = get_settings()
    if SessionLocal is None or not settings.database_url:
        print(
            "DATABASE_URL is not configured. Set it in the backend environment before running ingestion.",
            file=sys.stderr,
        )
        return 2

    if args.write:
        if settings.environment.strip().casefold() == "production":
            print(
                "Refusing ingestion writes in a production environment. Use the reviewed release process.",
                file=sys.stderr,
            )
            return 2
        expected_host = make_url(settings.database_url).host
        if not expected_host:
            print("DATABASE_URL must include a database hostname.", file=sys.stderr)
            return 2
        if not args.confirm_db_host or args.confirm_db_host.casefold() != expected_host.casefold():
            print(
                "Refusing ingestion writes: pass --confirm-db-host with the exact hostname from DATABASE_URL.",
                file=sys.stderr,
            )
            return 2

    try:
        demand, supply = _validate_files(args.demand_csv, args.supply_csv)
        report: dict[str, Any] = {
            "mode": "WRITE" if args.write else "VALIDATE_ONLY",
            "database_modified": False,
            "batches": [],
        }

        # One outer transaction covers demand and supply. If either batch fails,
        # SessionLocal.begin() rolls back both rather than leaving a partial import.
        with SessionLocal.begin() as session:
            repository = ObservationRepository(session, allow_writes=args.write)
            if args.write:
                demand_summary = repository.persist_batch(demand)
                supply_summary = repository.persist_batch(supply)
                report["batches"] = [
                    _report_for_batch(demand, validated_rows=len(demand.observations), write_result=demand_summary),
                    _report_for_batch(supply, validated_rows=len(supply.observations), write_result=supply_summary),
                ]
                report["database_modified"] = (
                    demand_summary.inserted_rows + supply_summary.inserted_rows > 0
                )
            else:
                demand_rows = repository.validate_batch(demand)
                supply_rows = repository.validate_batch(supply)
                report["batches"] = [
                    _report_for_batch(demand, validated_rows=demand_rows, write_result=None),
                    _report_for_batch(supply, validated_rows=supply_rows, write_result=None),
                ]

        print(json.dumps(report, indent=2, ensure_ascii=False))
        if args.output_json:
            args.output_json.parent.mkdir(parents=True, exist_ok=True)
            args.output_json.write_text(
                json.dumps(report, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            print(f"Report written to {args.output_json}")
        return 0

    except (OSError, ValueError, SQLAlchemyError, PersistenceValidationError) as exc:
        print(str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
