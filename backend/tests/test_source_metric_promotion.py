from __future__ import annotations

from decimal import Decimal

import pytest

from app.ingestion.promote_source_metrics import (
    fiscal_year_ending_year,
    normalize_metric_row,
)


def metric_row(**overrides):
    row = {
        "id": "metric-row-1",
        "source_id": "20000000-0000-4000-8000-000000000001",
        "retrieval_id": "00000000-0000-4000-8000-000000000001",
        "evidence_item_id": None,
        "source_release": "PIB_PRID_2289890_ANNEXURE_I_FY2023-24_TO_FY2025-26",
        "metric_code": "SPACE_GEOSPATIAL_PMKVY_TRAINED_ORIENTED",
        "value_numeric": Decimal("273"),
        "unit": "persons",
        "observation_grain": "STATE",
        "state_id": "IN-OD",
        "district_id": None,
        "sector_id": None,
        "skill_id": None,
        "reference_period": "FY2023-24",
        "as_of_date": None,
        "provenance_state": "SOURCE_BACKED",
        "is_synthetic": False,
    }
    row.update(overrides)
    return row


def test_fiscal_year_end_convention() -> None:
    assert fiscal_year_ending_year("FY2023-24") == 2024
    assert fiscal_year_ending_year("FY2025-26") == 2026
    assert fiscal_year_ending_year("FY1999-00") == 2000
    assert fiscal_year_ending_year("FY2023-2024") == 2024


def test_rejects_non_fiscal_year_period() -> None:
    with pytest.raises(ValueError, match="Unsupported reference_period"):
        fiscal_year_ending_year("CY2025")


def test_promotes_source_backed_state_flow_without_inventing_skill() -> None:
    row = normalize_metric_row(metric_row())
    assert row["state_id"] == "IN-OD"
    assert row["period_year"] == 2024
    assert row["supply_quantity"] == Decimal("273")
    assert row["quantity_unit"] == "persons"
    assert row["supply_signal_type"] == "SPACE_GEOSPATIAL_PMKVY_TRAINED_ORIENTED"
    assert row["metric_code"] == "SPACE_GEOSPATIAL_PMKVY_TRAINED_ORIENTED"
    assert "original_reference_period=FY2023-24" in row["transformation_note"]
    assert "not employed-worker stock" in row["transformation_note"]
    assert "district_id" not in row


def test_promotes_apprentice_engagement_with_its_own_unit_and_signal() -> None:
    row = normalize_metric_row(metric_row(
        metric_code="SPACE_GEOSPATIAL_NAPS_APPRENTICES_ENGAGED",
        unit="apprentices",
        value_numeric=Decimal("3995"),
        reference_period="FY2024-25",
    ))
    assert row["period_year"] == 2025
    assert row["quantity_unit"] == "apprentices"
    assert row["supply_signal_type"] == "SPACE_GEOSPATIAL_NAPS_APPRENTICES_ENGAGED"


@pytest.mark.parametrize(
    "overrides, message",
    [
        ({"is_synthetic": True, "provenance_state": "SYNTHETIC_DEMO"}, "SOURCE_BACKED"),
        ({"observation_grain": "DISTRICT"}, "STATE-grain"),
        ({"district_id": "IN-LGD-355"}, "state-only dimensions"),
        ({"retrieval_id": None}, "retrieval_id is required"),
        ({"unit": "centres"}, "expected unit"),
        ({"value_numeric": Decimal("-1")}, "finite, non-negative"),
        ({"metric_code": "PLFS_UR"}, "not approved"),
    ],
)
def test_rejects_unapproved_or_ambiguous_metric_rows(overrides, message) -> None:
    with pytest.raises(ValueError, match=message):
        normalize_metric_row(metric_row(**overrides))
