import copy
import csv
import json
import tempfile
from pathlib import Path

from ml.demo_generator import ConfigError, generate, validate_config, write_outputs
from .helpers import raises

CFG = {
    "seed": 7,
    "years": [2021, 2022, 2023, 2024, 2025],
    "demand_signal_type": "TEST_DEMAND",
    "supply_signal_type": "TEST_SUPPLY",
    "supply_measure": "completions",
    "demand_quantity_unit": "persons",
    "demand_quantity_semantics": "annual_flow",
    "supply_quantity_unit": "persons",
    "supply_quantity_semantics": "annual_flow",
    "source_context": "unit test",
    "cells": [
        {"state_id": "st", "district_id": "d1", "skill_id": "k1",
         "demand": {"start": 100, "annual_growth": 0.1}, "supply": {"start": 80}},
        {"state_id": "st", "district_id": "d2", "skill_id": "k1",
         "demand": {"start": 50}, "supply": {"start": 60}, "skip_years": [2023]},
    ],
}


def test_same_inputs_same_rows_and_ids():
    a = generate(copy.deepcopy(CFG), generated_at="2026-10-19T00:00:00+00:00")
    b = generate(copy.deepcopy(CFG), generated_at="2026-10-19T00:00:00+00:00")
    assert a == b


def test_different_seed_different_run():
    other = dict(copy.deepcopy(CFG), seed=8)
    assert generate(CFG)[0]["id"] != generate(other)[0]["id"]


def test_rows_are_labelled_synthetic_with_no_fake_source():
    run, demand, supply = generate(copy.deepcopy(CFG))
    for row in demand + supply:
        assert row["is_synthetic"] is True and row["provenance_state"] == "SYNTHETIC_DEMO"
        assert row["source_id"] is None and row["generation_run_id"] == run["id"]
        assert row["period_type"] == "YEAR" and row["observation_grain"] == "DISTRICT_SKILL"
        assert "SYNTHETIC" in row["transformation_note"]
        assert row["quantity_unit"] == "persons" and row["quantity_semantics"] == "annual_flow"
    assert all(r["completions"] is not None and r["supply_quantity"] is None for r in supply)
    assert all(r["demand_quantity"] >= 0 for r in demand)


def test_skip_years_leaves_real_gaps():
    _, demand, _ = generate(copy.deepcopy(CFG))
    d2_years = sorted(r["period_year"] for r in demand if r["district_id"] == "d2")
    assert d2_years == [2021, 2022, 2024, 2025]


def test_refuses_placeholders_missing_ids_and_bad_values():
    raises(ConfigError, validate_config, dict(copy.deepcopy(CFG), demand_signal_type="REPLACE_WITH_X"))
    bad = copy.deepcopy(CFG); bad["cells"][0]["district_id"] = ""
    raises(ConfigError, validate_config, bad)
    bad = copy.deepcopy(CFG); del bad["supply_quantity_unit"]
    raises(ConfigError, validate_config, bad)
    bad = copy.deepcopy(CFG); bad["supply_measure"] = "jobs"
    raises(ConfigError, validate_config, bad)
    bad = copy.deepcopy(CFG); bad["cells"][1]["district_id"] = "d1"
    raises(ConfigError, validate_config, bad)


def test_example_config_is_refused_until_filled_in():
    example = json.loads((Path(__file__).parents[2] / "data/demo/demo_config.example.json").read_text())
    raises(ConfigError, validate_config, example)


def test_written_files_round_trip():
    with tempfile.TemporaryDirectory() as tmp:
        summary = write_outputs(Path(tmp), *generate(copy.deepcopy(CFG), "2026-10-19T00:00:00+00:00"))
        assert summary["demand_rows"] == 9 and summary["supply_rows"] == 9
        rows = list(csv.DictReader(open(Path(tmp) / "supply_observations.csv", encoding="utf-8")))
        assert rows[0]["source_id"] == "" and rows[0]["is_synthetic"] == "true"
        assert "\\copy public.demand_observations(" in (Path(tmp) / "load_demo.sql").read_text()
