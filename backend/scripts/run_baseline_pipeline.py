"""Validate demand/supply canonical CSVs and emit reproducible baseline analytics JSON.

The command is deliberately read-only with respect to Supabase. DB persistence is a
separate, reviewed step and must be tested against a non-production database first.
"""
from __future__ import annotations

import argparse
import json
import sys
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from app.analytics.engine import AnalyticsConfig, AnalyticsInputError, run_baseline_analytics
from app.ingestion.canonical_csv import ParsedBatch, parse_canonical_csv, sha256_file
from app.ingestion.capability_validation import (
    CapabilityValidationError,
    load_capabilities,
    validate_source_capabilities,
)


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
        note = str(item.get("approval_note", "")).strip()
        if not demand or not supply or not note:
            raise ValueError(
                f"approved compatibility item {index} requires demand_signal_type, "
                "supply_signal_type, and approval_note"
            )
        approved.add((demand, supply))
    return frozenset(approved)


def _check_batch(batch: ParsedBatch, label: str) -> None:
    if batch.issues:
        rendered = "\n".join(str(issue) for issue in batch.issues[:30])
        remainder = len(batch.issues) - min(30, len(batch.issues))
        if remainder > 0:
            rendered += f"\n... and {remainder} additional issue(s)"
        raise ValueError(f"{label} CSV failed validation:\n{rendered}")
    if not batch.observations:
        raise ValueError(f"{label} CSV contains no valid observations.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate SHRAMIK canonical demand/supply CSVs and run the baseline engine."
    )
    parser.add_argument("--demand-csv", type=Path, required=True)
    parser.add_argument("--supply-csv", type=Path, required=True)
    parser.add_argument("--output-json", type=Path, required=True)
    parser.add_argument("--demand-signal-type", required=True)
    parser.add_argument("--supply-signal-type", required=True)
    parser.add_argument("--analysis-mode", choices=("OFFICIAL", "DEMO"), default="DEMO")
    parser.add_argument("--forecast-horizon", type=int, default=1)
    parser.add_argument("--min-history", type=int, default=3)
    parser.add_argument(
        "--balance-tolerance",
        type=Decimal,
        default=Decimal("0"),
        help="Absolute headcount tolerance; defaults to exact equality while Issue #15 thresholds remain pending.",
    )
    parser.add_argument(
        "--compatibility-json",
        type=Path,
        help="Reviewed JSON list of explicitly approved demand/supply signal pairs; without it, gaps remain ineligible.",
    )
    parser.add_argument(
        "--capabilities-json",
        type=Path,
        help="Read-only JSON export of source_capabilities; required whenever source-backed rows are present.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if not args.demand_csv.is_file():
        print(f"demand CSV does not exist: {args.demand_csv}", file=sys.stderr)
        return 2
    if not args.supply_csv.is_file():
        print(f"supply CSV does not exist: {args.supply_csv}", file=sys.stderr)
        return 2

    generation_run_id = str(uuid4())
    try:
        demand = parse_canonical_csv(
            args.demand_csv, "demand", default_generation_run_id=generation_run_id
        )
        supply = parse_canonical_csv(
            args.supply_csv, "supply", default_generation_run_id=generation_run_id
        )
        _check_batch(demand, "demand")
        _check_batch(supply, "supply")

        source_backed_present = any(
            not observation.is_synthetic
            for observation in (*demand.observations, *supply.observations)
        )
        capability_snapshot_sha256 = None
        if source_backed_present:
            if args.capabilities_json is None:
                raise CapabilityValidationError(
                    "source-backed rows require --capabilities-json so unit, grain, "
                    "geographic scope and period coverage can be verified against "
                    "source_capabilities; the pipeline will not trust CSV metadata alone"
                )
            capabilities = load_capabilities(args.capabilities_json)
            validate_source_capabilities(demand, capabilities)
            validate_source_capabilities(supply, capabilities)
            capability_snapshot_sha256 = sha256_file(args.capabilities_json)

        approved_pairs = _load_compatibility_pairs(args.compatibility_json)
        result = run_baseline_analytics(
            demand,
            supply,
            demand_signal_type=args.demand_signal_type,
            supply_signal_type=args.supply_signal_type,
            config=AnalyticsConfig(
                analysis_mode=args.analysis_mode,
                forecast_horizon=args.forecast_horizon,
                min_history=args.min_history,
                balance_tolerance=args.balance_tolerance,
                approved_gap_signal_pairs=approved_pairs,
            ),
        )
        synthetic_run_ids = sorted({
            observation.generation_run_id
            for observation in (*demand.observations, *supply.observations)
            if observation.is_synthetic and observation.generation_run_id
        })
        result["ingestion"] = {
            "demand": {
                "source_file": demand.source_path,
                "sha256": demand.sha256,
                "rows_validated": len(demand.observations),
                "synthetic_capabilities": demand.synthetic_capabilities,
            },
            "supply": {
                "source_file": supply.source_path,
                "sha256": supply.sha256,
                "rows_validated": len(supply.observations),
                "synthetic_capabilities": supply.synthetic_capabilities,
            },
            "capability_snapshot_sha256": capability_snapshot_sha256,
            "synthetic_generation_run_ids": synthetic_run_ids,
        }
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(
            json.dumps(result, indent=2, ensure_ascii=False, default=str) + "\n",
            encoding="utf-8",
        )
    except (OSError, ValueError, CapabilityValidationError, AnalyticsInputError) as exc:
        print(str(exc), file=sys.stderr)
        return 2

    print(json.dumps(result["summary"], indent=2))
    print(f"Output written to {args.output_json}; Supabase was not modified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
