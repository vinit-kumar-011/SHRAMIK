from __future__ import annotations

import csv
from decimal import Decimal
from pathlib import Path


CSV_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "processed"
    / "employment_exchange_vacancies_state_2022.csv"
)


def test_dge_state_vacancy_pilot_preserves_source_grain_and_units() -> None:
    with CSV_PATH.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))

    assert len(rows) == 34
    assert len({row["state_id"] for row in rows}) == 34
    assert all(row["observation_grain"] == "STATE" for row in rows)
    assert all(row["period_year"] == "2022" for row in rows)
    assert all(row["quantity_unit"] == "vacancies" for row in rows)
    assert all(row["quantity_semantics"] == "FLOW" for row in rows)
    assert all(
        row["demand_signal_type"] == "VACANCIES_NOTIFIED_TO_EMPLOYMENT_EXCHANGES"
        for row in rows
    )
    assert all(not row["district_id"] and not row["sector_id"] and not row["skill_id"] for row in rows)

    # The report presents thousands to one decimal; preserve that displayed precision.
    source_total_thousands = sum(
        (Decimal(row["source_reported_value_thousands"]) for row in rows),
        Decimal("0"),
    )
    converted_total = sum((Decimal(row["demand_quantity"]) for row in rows), Decimal("0"))
    assert source_total_thousands == Decimal("1367.6")
    assert converted_total == Decimal("1367600")
    assert all(
        Decimal(row["demand_quantity"])
        == Decimal(row["source_reported_value_thousands"]) * Decimal("1000")
        for row in rows
    )

    # Sikkim is unreported, and two legacy UT rows cannot be losslessly mapped to the
    # current merged Dadra-and-Nagar-Haveli-and-Daman-and-Diu reference geography.
    state_ids = {row["state_id"] for row in rows}
    assert "IN-SK" not in state_ids
    assert "IN-DNDD" not in state_ids
