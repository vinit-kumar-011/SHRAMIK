"""Explicitly guarded import-and-persist command for a non-production SHRAMIK DB.

Run from the repository root. The command will refuse the connected live SHRAMIK
Supabase project even if the other write flags are accidentally enabled.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

# Support both repository-root invocation and invocation from backend/.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from app.analytics.engine import AnalyticsConfig, AnalyticsInputError, run_baseline_analytics
from app.core.config import get_settings
from app.db.pipeline_repository import RepositoryValidationError, persist_pipeline
from app.db.write_safety import UnsafeDatabaseTarget, require_nonproduction_write_target
from app.ingestion.canonical_csv import ParsedBatch, parse_canonical_csv, sha256_file


def _load_compatibility_pairs(path: Path | None) -> frozenset[tuple[str, str]]:
    if path is None:
        return frozenset()
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("compatibility configuration must be a JSON list")
    approved: set[tuple[str, str]] = set()
    for index, item in enumerate(payload, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"compatibility item {index} must be an object")
        if item.get("approved") is not True:
            continue
        demand = str(item.get("demand_signal_type", "")).strip()
        supply = str(item.get("supply_signal_type", "")).strip()
        approval_note = str(item.get("approval_note", "")).strip()
        if not demand or not supply or not approval_note:
            raise ValueError(
                f"approved compatibility item {index} requires demand_signal_type, "
                "supply_signal_type, and approval_note"
            )
        approved.add((demand, supply))
    return frozenset(approved)


def _require_batch(batch: ParsedBatch, label: str) -> None:
    if batch.issues:
        rendered = "\n".join(str(issue) for issue in batch.issues[:30])
        remaining = len(batch.issues) - min(30, len(batch.issues))
        if remaining > 0:
            rendered += f"\n... and {remaining} additional issue(s)"
        raise ValueError(f"{label} CSV failed validation:\n{rendered}")
    if not batch.observations:
        raise ValueError(f"{label} CSV contains no observations.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Persist SHRAMIK canonical observations and baseline outputs to a guarded non-production database."
    )
    parser.add_argument("--demand-csv", type=Path, required=True)
    parser.add_argument("--supply-csv", type=Path, required=True)
    parser.add_argument("--output-json", type=Path, required=True)
    parser.add_argument("--demand-signal-type", required=True)
    parser.add_argument("--supply-signal-type", required=True)
    parser.add_argument("--analysis-mode", choices=("OFFICIAL", "DEMO"), default="DEMO")
    parser.add_argument("--forecast-horizon", type=int, default=1)
    parser.add_argument("--min-history", type=int, default=3)
    parser.add_argument("--balance-tolerance", type=float, default=0.0)
    parser.add_argument("--compatibility-json", type=Path)
    parser.add_argument(
        "--confirm-nonproduction-write",
        action="store_true",
        help="Required additional confirmation. Environment-based non-production guards are also mandatory.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if not args.confirm_nonproduction_write:
        print(
            "Refusing to write: pass --confirm-nonproduction-write only after confirming this is a non-production target.",
            file=sys.stderr,
        )
        return 2

    settings = get_settings()
    try:
        # Guard before creating a SQLAlchemy engine or opening a DB connection.
        host = require_nonproduction_write_target(
            settings.database_url,
            environ=dict(os.environ),
        )
        demand_sha = sha256_file(args.demand_csv)
        supply_sha = sha256_file(args.supply_csv)
        input_hashes = {"demand": demand_sha, "supply": supply_sha}
        combined_hash = hashlib.sha256(f"{demand_sha}:{supply_sha}".encode("ascii")).hexdigest()
        generation_run_id = str(uuid5(NAMESPACE_URL, f"shramik-canonical-import-v1:{combined_hash}"))

        demand = parse_canonical_csv(
            args.demand_csv, "demand", default_generation_run_id=generation_run_id
        )
        supply = parse_canonical_csv(
            args.supply_csv, "supply", default_generation_run_id=generation_run_id
        )
        _require_batch(demand, "demand")
        _require_batch(supply, "supply")
        approved_pairs = _load_compatibility_pairs(args.compatibility_json)

        analytics = run_baseline_analytics(
            demand,
            supply,
            demand_signal_type=args.demand_signal_type,
            supply_signal_type=args.supply_signal_type,
            config=AnalyticsConfig(
                analysis_mode=args.analysis_mode,
                forecast_horizon=args.forecast_horizon,
                min_history=args.min_history,
                balance_tolerance=__import__("decimal").Decimal(str(args.balance_tolerance)),
                approved_gap_signal_pairs=approved_pairs,
            ),
        )

        if not settings.database_url:
            raise UnsafeDatabaseTarget("DATABASE_URL is not configured.")
        engine = create_engine(settings.database_url, pool_pre_ping=True)
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
        try:
            with SessionLocal() as session:
                with session.begin():
                    counts = persist_pipeline(
                        session,
                        demand,
                        supply,
                        analytics,
                        demand_signal_type=args.demand_signal_type,
                        supply_signal_type=args.supply_signal_type,
                        default_generation_run_id=generation_run_id,
                        input_hashes=input_hashes,
                    )
        finally:
            engine.dispose()

        analytics["metadata"]["database_modified"] = True
        analytics["metadata"]["database_target_host"] = host
        analytics["metadata"]["persistence_transaction"] = "committed"
        analytics["persistence"] = counts
        analytics["ingestion"] = {
            "demand": {
                "source_file": str(args.demand_csv),
                "sha256": demand.sha256,
                "rows_validated": len(demand.observations),
            },
            "supply": {
                "source_file": str(args.supply_csv),
                "sha256": supply.sha256,
                "rows_validated": len(supply.observations),
            },
            "synthetic_generation_run_id": generation_run_id
            if any(row.is_synthetic for row in (*demand.observations, *supply.observations))
            else None,
        }
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(
            json.dumps(analytics, indent=2, ensure_ascii=False, default=str) + "\n",
            encoding="utf-8",
        )
    except (
        OSError,
        ValueError,
        SQLAlchemyError,
        UnsafeDatabaseTarget,
        RepositoryValidationError,
        AnalyticsInputError,
        json.JSONDecodeError,
    ) as exc:
        print(f"Pipeline failed; the database transaction was rolled back where applicable: {exc}", file=sys.stderr)
        return 2

    print(json.dumps(analytics["summary"], indent=2))
    print(json.dumps(counts, indent=2))
    print(f"Committed to approved non-production host {host}; output written to {args.output_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
