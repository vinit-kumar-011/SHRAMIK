"""Create deterministic, explicitly synthetic observations for a local SHRAMIK demo.

This script reads canonical IDs from the configured database, but does not write to it.
It is not a generator of official labour-market statistics.
"""
from __future__ import annotations

import argparse
import csv
import os
import random
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import create_engine, text


COLUMNS = [
    "kind", "state_id", "district_id", "sector_id", "skill_id",
    "observation_grain", "period_type", "period_year", "quantity",
    "signal_type", "source_id", "retrieval_id", "evidence_item_id",
    "provenance_state", "is_synthetic", "generation_run_id",
    "unit", "flow_stock_semantics", "occupation_scope",
    "transformation_note", "source_date",
]


def _database_url() -> str:
    value = os.getenv("DATABASE_URL", "").strip()
    if not value:
        raise RuntimeError("DATABASE_URL is required for reading canonical IDs.")
    if value.startswith("postgres://"):
        return "postgresql+psycopg://" + value[len("postgres://"):]
    if value.startswith("postgresql://"):
        return "postgresql+psycopg://" + value[len("postgresql://"):]
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-csv", default="data/demo_observations.csv")
    parser.add_argument("--district-id", help="Canonical district ID; defaults to the first active district.")
    parser.add_argument("--skill-id", help="Canonical skill ID; defaults to the first active skill.")
    parser.add_argument("--allow-inactive-skill-for-demo", action="store_true",
                        help="Explicitly permit a provisional/inactive pilot skill in DEMO-only records.")
    parser.add_argument("--start-year", type=int, default=2021)
    parser.add_argument("--end-year", type=int, default=date.today().year - 1)
    parser.add_argument("--random-seed", type=int, default=26246)
    parser.add_argument("--demand-signal-type", default="DEMO_JOB_DEMAND")
    parser.add_argument("--supply-signal-type", default="DEMO_TRAINING_COMPLETIONS")
    parser.add_argument("--demand-base", type=int, default=800)
    parser.add_argument("--supply-base", type=int, default=620)
    parser.add_argument("--demand-step", type=int, default=55)
    parser.add_argument("--supply-step", type=int, default=28)
    args = parser.parse_args()

    if args.start_year < 1900 or args.end_year > date.today().year or args.end_year < args.start_year:
        parser.error("Provide a valid historical year range not later than the current year.")
    if args.end_year - args.start_year + 1 < 3:
        parser.error("Demo forecast history must contain at least three annual observations.")
    if min(args.demand_base, args.supply_base, args.demand_step, args.supply_step) < 0:
        parser.error("Base quantities and increments must be non-negative.")

    engine = None
    try:
        engine = create_engine(_database_url(), pool_pre_ping=True)
        with engine.connect() as conn:
            if args.district_id:
                district = conn.execute(text("""
                    SELECT id, state_id, name, is_active FROM districts WHERE id = :id
                """), {"id": args.district_id}).mappings().first()
            else:
                district = conn.execute(text("""
                    SELECT id, state_id, name, is_active FROM districts
                    WHERE is_active = true ORDER BY state_id, name, id LIMIT 1
                """)).mappings().first()
            if not district:
                raise RuntimeError("No matching district exists in the canonical districts table.")
            if not district["is_active"]:
                raise RuntimeError("The selected district is inactive; choose an active district.")

            if args.skill_id:
                skill = conn.execute(text("""
                    SELECT id, sector_id, name, is_active FROM skills WHERE id = :id
                """), {"id": args.skill_id}).mappings().first()
            else:
                skill = conn.execute(text("""
                    SELECT id, sector_id, name, is_active FROM skills
                    WHERE is_active = true ORDER BY name, id LIMIT 1
                """)).mappings().first()
                if not skill and args.allow_inactive_skill_for_demo:
                    skill = conn.execute(text("""
                        SELECT id, sector_id, name, is_active FROM skills
                        ORDER BY name, id LIMIT 1
                    """)).mappings().first()
            if not skill:
                raise RuntimeError(
                    "No active canonical skill is available. Review a skill/sector mapping, "
                    "or specify --skill-id with --allow-inactive-skill-for-demo for a labelled DEMO only."
                )
            if not skill["is_active"] and not args.allow_inactive_skill_for_demo:
                raise RuntimeError(
                    "The selected skill is inactive pending mapping review. For demo-only data, "
                    "pass --allow-inactive-skill-for-demo; this does not activate or approve the mapping."
                )
            sector = conn.execute(text(
                "SELECT id, is_active FROM sectors WHERE id = :id"
            ), {"id": skill["sector_id"]}).mappings().first()
            if not sector:
                raise RuntimeError("The selected skill references an unknown canonical sector.")
            state_id = str(district["state_id"])
            district_id = str(district["id"])
            skill_id = str(skill["id"])
            sector_id = str(skill["sector_id"])
            district_name = district["name"]
            skill_name = skill["name"]
            skill_is_active = bool(skill["is_active"])
    except Exception as exc:
        print(f"Unable to prepare demo dataset: {exc}", file=sys.stderr)
        if engine:
            engine.dispose()
        return 2
    finally:
        if engine:
            engine.dispose()

    rng = random.Random(args.random_seed)
    output_rows = []
    for year in range(args.start_year, args.end_year + 1):
        offset = year - args.start_year
        demand = max(0, args.demand_base + args.demand_step * offset + rng.randint(-18, 18))
        supply = max(0, args.supply_base + args.supply_step * offset + rng.randint(-15, 15))
        shared = {
            "state_id": state_id,
            "district_id": district_id,
            "sector_id": sector_id,
            "skill_id": skill_id,
            "observation_grain": "DISTRICT_SECTOR_SKILL",
            "period_type": "YEAR",
            "period_year": year,
            "source_id": "",
            "retrieval_id": "",
            "evidence_item_id": "",
            "provenance_state": "SYNTHETIC_DEMO",
            "is_synthetic": "true",
            "generation_run_id": "",
            "unit": "HEADCOUNT",
            "flow_stock_semantics": "ANNUAL_FLOW",
            "occupation_scope": f"DISTRICT_SECTOR_SKILL:{district_id}:{sector_id}:{skill_id}",
            "transformation_note": (
                "SYNTHETIC DEMO ONLY; deterministic seeded values generated for pipeline testing. "
                "Not official labour-market statistics and not evidence of real vacancies or completions. "
                f"skill_is_active_at_generation={str(skill_is_active).lower()}."
            ),
            "source_date": "",
        }
        output_rows.append({**shared, "kind": "DEMAND", "quantity": demand, "signal_type": args.demand_signal_type})
        output_rows.append({**shared, "kind": "SUPPLY", "quantity": supply, "signal_type": args.supply_signal_type})

    destination = Path(args.output_csv)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(output_rows)

    print(
        f"Wrote {len(output_rows)} explicitly synthetic rows to {destination}\n"
        f"District: {district_name} ({district_id})\n"
        f"Skill: {skill_name} ({skill_id}); sector: {sector_id}\n"
        f"Years: {args.start_year}-{args.end_year}; seed: {args.random_seed}\n"
        "No database rows were changed. Pass this CSV to the pipeline with --analysis-mode DEMO."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
