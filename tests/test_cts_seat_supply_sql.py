"""Guards for scripts/sql/cts_seat_supply_*.sql (no database needed).

The export's output columns must be exactly the supply CSV columns that PR #60's
canonical importer requires (backend/app/ingestion/canonical_csv.py: COMMON_COLUMNS
and KIND_COLUMNS["supply"]), and both SQL files must stay read-only.
"""
import re
from pathlib import Path

SQL = Path(__file__).resolve().parents[1] / "scripts" / "sql"

# Copied from canonical_csv.py on feature/ingestion-analytics-pipeline (2026-10-20).
CANONICAL_SUPPLY_COLUMNS = {
    "state_id", "district_id", "sector_id", "skill_id", "observation_grain",
    "period_type", "period_year", "source_id", "source_release", "source_date", "retrieval_id",
    "evidence_item_id", "provenance_state", "is_synthetic", "generation_run_id",
    "transformation_note", "unit", "flow_stock_semantics", "quantity_semantics",
    "supply_quantity", "training_capacity", "enrollment", "completions", "supply_signal_type",
}


def _code(name):
    return "\n".join(l.split("--", 1)[0] for l in (SQL / name).read_text(encoding="utf-8").splitlines())


def _output_columns(code):
    final = code[code.rindex("\nselect\n") + len("\nselect\n"):code.rindex("\nfrom with_source")]
    items, depth, quoted, cur = [], 0, False, ""
    for ch in final:
        quoted ^= ch == "'"
        if not quoted:
            depth += ch == "("
            depth -= ch == ")"
        if ch == "," and depth == 0 and not quoted:
            items.append(cur)
            cur = ""
        else:
            cur += ch
    items.append(cur)
    return [re.findall(r"[a-z_]+", item.strip().lower())[-1] for item in items if item.strip()]


def test_export_outputs_exactly_the_canonical_supply_columns():
    cols = _output_columns(_code("cts_seat_supply_export.sql"))
    assert len(cols) == len(set(cols)), "duplicate output column"
    assert set(cols) == CANONICAL_SUPPLY_COLUMNS


def test_export_is_capacity_only_and_source_backed():
    code = _code("cts_seat_supply_export.sql").lower()
    assert "null::numeric                    as supply_quantity" in code
    assert "'capacity'                       as quantity_semantics" in code
    assert "'source_backed'                  as provenance_state" in code
    assert "'district_sector_skill'          as observation_grain" in code


def test_sql_files_are_read_only():
    for name in ("cts_seat_supply_export.sql", "cts_seat_supply_gaps.sql"):
        code = _code(name).lower()
        for word in ("insert ", "update ", "delete ", "drop ", "alter ", "truncate ", "create ", "grant "):
            assert word not in code, f"{name} must stay read-only (found {word.strip()!r})"
