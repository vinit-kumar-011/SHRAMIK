"""Reproducible DEMO synthetic-data generator (readiness plan, workstream B).

Writes rows shaped exactly like the database tables:
  synthetic_generation_runs.csv   one immutable run record
  demand_observations.csv         SYNTHETIC_DEMO rows, DISTRICT_SKILL grain, YEAR
  supply_observations.csv         same rules

Rules it enforces (schema sections 6.3, 7, 14; dataset plan section 10):
- It never invents IDs. state_id / district_id / skill_id come from the config
  file, which the team fills with IDs that exist in the live database.
- Every row: is_synthetic=true, provenance_state=SYNTHETIC_DEMO,
  generation_run_id set, source_id NULL (no fake source), transformation_note set.
- Yearly only. No months or quarters.
- Same generator version + seed + parameters ⇒ identical rows and identical ids.
- Signal types must be given explicitly (their vocabulary is owned by
  Issues #13/#17); there is no default to hide behind.

Synthetic ranges must never be used to choose MIN_FORECAST_DEMAND or any
official threshold.

Usage (from the repository root):
  python -m ml.demo_generator --config data/demo/demo_config.json --out data/processed/demo
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

GENERATOR_NAME = "shramik_demo_generator"
GENERATOR_VERSION = "1.0.0"
NAMESPACE = uuid.UUID("6f1c2a52-3b7e-4f0a-9a0e-5348524d494b")  # fixed, for deterministic ids
SUPPLY_MEASURES = ("supply_quantity", "training_capacity", "enrollment", "completions")

DEMAND_COLUMNS = (
    "id", "state_id", "district_id", "sector_id", "skill_id", "observation_grain", "period_type",
    "period_year", "demand_quantity", "demand_signal_type", "source_id", "source_date",
    "retrieval_id", "evidence_item_id", "provenance_state", "is_synthetic", "generation_run_id",
    "transformation_note",
)
SUPPLY_COLUMNS = (
    "id", "state_id", "district_id", "sector_id", "skill_id", "observation_grain", "period_type",
    "period_year", "supply_quantity", "training_capacity", "enrollment", "completions",
    "supply_signal_type", "source_id", "source_date", "retrieval_id", "evidence_item_id",
    "provenance_state", "is_synthetic", "generation_run_id", "transformation_note",
)
RUN_COLUMNS = ("id", "generator_name", "generator_version", "random_seed", "parameters",
               "generated_at", "source_context")


class ConfigError(ValueError):
    pass


def _canonical(obj) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def validate_config(cfg: dict) -> dict:
    need = ("seed", "years", "demand_signal_type", "supply_signal_type", "supply_measure", "cells",
            "source_context")
    missing = [k for k in need if k not in cfg or cfg[k] in (None, "", [])]
    if missing:
        raise ConfigError(f"config is missing: {', '.join(missing)}")
    if "REPLACE_WITH" in _canonical({k: cfg[k] for k in need}):
        raise ConfigError("config still contains REPLACE_WITH_* placeholders; use real ids and agreed signal types")
    if not isinstance(cfg["seed"], int):
        raise ConfigError("seed must be an integer")
    years = cfg["years"]
    if not all(isinstance(y, int) and 1000 <= y <= 9999 for y in years):
        raise ConfigError("years must be 4-digit integers")
    if sorted(set(years)) != sorted(years):
        raise ConfigError("years must not repeat")
    if cfg["supply_measure"] not in SUPPLY_MEASURES:
        raise ConfigError(f"supply_measure must be one of {SUPPLY_MEASURES}")
    seen = set()
    for i, cell in enumerate(cfg["cells"]):
        for key in ("state_id", "district_id", "skill_id"):
            if not cell.get(key):
                raise ConfigError(f"cells[{i}].{key} is required (use the real id from the database)")
        key = (cell["district_id"], cell["skill_id"])
        if key in seen:
            raise ConfigError(f"cells[{i}] repeats district/skill {key}")
        seen.add(key)
        for side in ("demand", "supply"):
            spec = cell.get(side) or {}
            if not isinstance(spec.get("start"), (int, float)) or spec["start"] < 0:
                raise ConfigError(f"cells[{i}].{side}.start must be a number >= 0")
            if not isinstance(spec.get("annual_growth", 0), (int, float)):
                raise ConfigError(f"cells[{i}].{side}.annual_growth must be a number")
            if not 0 <= spec.get("noise", 0.05) < 1:
                raise ConfigError(f"cells[{i}].{side}.noise must be in [0, 1)")
        skip = cell.get("skip_years", [])
        if any(y not in years for y in skip):
            raise ConfigError(f"cells[{i}].skip_years must be a subset of years")
    return cfg


def _series(rng: random.Random, spec: dict, years: list) -> dict:
    out = {}
    for i, year in enumerate(sorted(years)):
        base = spec["start"] * (1 + spec.get("annual_growth", 0)) ** i
        noise = spec.get("noise", 0.05)
        value = base * (1 + rng.uniform(-noise, noise))
        out[year] = max(0, round(value))
    return out


def generate(cfg: dict, generated_at: str | None = None):
    cfg = validate_config(cfg)
    params = {k: cfg[k] for k in ("seed", "years", "demand_signal_type", "supply_signal_type",
                                  "supply_measure", "cells")}
    run_id = str(uuid.uuid5(NAMESPACE, f"{GENERATOR_NAME}|{GENERATOR_VERSION}|{_canonical(params)}"))
    run = {
        "id": run_id,
        "generator_name": GENERATOR_NAME,
        "generator_version": GENERATOR_VERSION,
        "random_seed": cfg["seed"],
        "parameters": _canonical(params),
        "generated_at": generated_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_context": cfg["source_context"],
    }
    note = (f"SYNTHETIC DEMO data from {GENERATOR_NAME} {GENERATOR_VERSION} (seed {cfg['seed']}). "
            "Not a government observation. Excluded from OFFICIAL analysis and from threshold setting.")

    rng = random.Random(cfg["seed"])
    demand_rows, supply_rows = [], []
    for cell in cfg["cells"]:
        skip = set(cell.get("skip_years", []))
        years = [y for y in cfg["years"] if y not in skip]
        dvals = _series(rng, cell["demand"], cfg["years"])
        svals = _series(rng, cell["supply"], cfg["years"])
        base = {
            "state_id": cell["state_id"], "district_id": cell["district_id"],
            "sector_id": cell.get("sector_id") or None, "skill_id": cell["skill_id"],
            "observation_grain": "DISTRICT_SKILL", "period_type": "YEAR",
            "source_id": None, "source_date": None, "retrieval_id": None, "evidence_item_id": None,
            "provenance_state": "SYNTHETIC_DEMO", "is_synthetic": True,
            "generation_run_id": run_id, "transformation_note": note,
        }
        for year in years:
            key = f"{run_id}|{cell['district_id']}|{cell['skill_id']}|{year}"
            demand_rows.append(dict(base, id=str(uuid.uuid5(NAMESPACE, key + "|demand")),
                                    period_year=year, demand_quantity=dvals[year],
                                    demand_signal_type=cfg["demand_signal_type"]))
            srow = dict(base, id=str(uuid.uuid5(NAMESPACE, key + "|supply")), period_year=year,
                        supply_signal_type=cfg["supply_signal_type"],
                        supply_quantity=None, training_capacity=None, enrollment=None, completions=None)
            srow[cfg["supply_measure"]] = svals[year]
            supply_rows.append(srow)
    return run, demand_rows, supply_rows


def _write(path: Path, columns, rows):
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=columns)
        w.writeheader()
        for row in rows:
            w.writerow({c: ("" if row.get(c) is None else
                            ("true" if row.get(c) is True else row.get(c))) for c in columns})


LOAD_SQL = """-- Load SHRAMIK DEMO synthetic data. FOR THE DATABASE OWNER ONLY.
-- Run against a disposable/dev database first. Never on production without review.
-- From this folder:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f load_demo.sql
BEGIN;
\\copy public.synthetic_generation_runs(id,generator_name,generator_version,random_seed,parameters,generated_at,source_context) FROM 'synthetic_generation_runs.csv' CSV HEADER
\\copy public.demand_observations({demand}) FROM 'demand_observations.csv' CSV HEADER
\\copy public.supply_observations({supply}) FROM 'supply_observations.csv' CSV HEADER
COMMIT;
"""


def write_outputs(out_dir: Path, run, demand_rows, supply_rows) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    _write(out_dir / "synthetic_generation_runs.csv", RUN_COLUMNS, [run])
    _write(out_dir / "demand_observations.csv", DEMAND_COLUMNS, demand_rows)
    _write(out_dir / "supply_observations.csv", SUPPLY_COLUMNS, supply_rows)
    (out_dir / "load_demo.sql").write_text(
        LOAD_SQL.format(demand=",".join(DEMAND_COLUMNS), supply=",".join(SUPPLY_COLUMNS)), encoding="utf-8")
    digest = hashlib.sha256()
    for name in ("demand_observations.csv", "supply_observations.csv"):
        digest.update((out_dir / name).read_bytes())
    summary = {"generation_run_id": run["id"], "demand_rows": len(demand_rows),
               "supply_rows": len(supply_rows), "observations_sha256": digest.hexdigest()}
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    ap.add_argument("--config", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=Path("data/processed/demo"))
    ap.add_argument("--generated-at", default=None, help="fixed ISO timestamp (optional)")
    args = ap.parse_args(argv)
    try:
        cfg = json.loads(args.config.read_text(encoding="utf-8"))
        summary = write_outputs(args.out, *generate(cfg, args.generated_at))
    except (OSError, json.JSONDecodeError, ConfigError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(summary, indent=2))
    print("All rows are SYNTHETIC_DEMO. Hand load_demo.sql to the database owner; do not run it on production.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
