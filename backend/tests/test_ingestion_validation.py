from __future__ import annotations

import pytest

from app.ingestion.validation import DatasetValidationError, validate_dataset_rows


def demand_row(**overrides):
    row = {
        "state_id": "IN-OD",
        "district_id": "IN-LGD-355",
        "sector_id": "",
        "skill_id": "nco2015_7112_0200",
        "observation_grain": "DISTRICT_SKILL",
        "period_year": "2022",
        "demand_quantity": "125",
        "quantity_unit": "persons",
        "quantity_semantics": "STOCK",
        "demand_signal_type": "OBSERVED_WORKFORCE_DEMAND",
        "source_release": "release-2022",
        "source_date": "",
        "transformation_note": "Transcribed from cited source table.",
    }
    row.update(overrides)
    return row


def supply_row(**overrides):
    row = {
        "state_id": "IN-OD",
        "district_id": "IN-LGD-355",
        "sector_id": "",
        "skill_id": "nco2015_7112_0200",
        "observation_grain": "DISTRICT_SKILL",
        "period_year": "2022",
        "measure": "supply_quantity",
        "value": "110",
        "quantity_unit": "persons",
        "quantity_semantics": "STOCK",
        "supply_signal_type": "OBSERVED_AVAILABLE_WORKFORCE",
        "source_release": "release-2022",
        "source_date": "",
        "transformation_note": "Transcribed from cited source table.",
    }
    row.update(overrides)
    return row


def test_validates_district_skill_grain_without_inventing_sector() -> None:
    result = validate_dataset_rows([demand_row()], "demand")[0]
    assert result["observation_grain"] == "DISTRICT_SKILL"
    assert result["sector_id"] is None
    assert result["skill_id"] == "nco2015_7112_0200"
    assert result["period_year"] == 2022


def test_rejects_sector_value_not_supported_by_grain() -> None:
    with pytest.raises(DatasetValidationError, match="sector_id must be blank"):
        validate_dataset_rows([demand_row(sector_id="SECTOR-01")], "demand")


def test_rejects_negative_observation() -> None:
    with pytest.raises(DatasetValidationError, match="finite, non-negative"):
        validate_dataset_rows([demand_row(demand_quantity="-1")], "demand")


def test_rejects_duplicate_logical_keys_in_one_file() -> None:
    with pytest.raises(DatasetValidationError, match="duplicate source observation key"):
        validate_dataset_rows([demand_row(), demand_row()], "demand")


def test_training_completions_must_remain_a_flow_measure() -> None:
    with pytest.raises(DatasetValidationError, match="completions requires FLOW"):
        validate_dataset_rows(
            [supply_row(measure="completions", quantity_semantics="STOCK")],
            "supply",
        )


def test_training_capacity_requires_capacity_semantics() -> None:
    with pytest.raises(DatasetValidationError, match="training_capacity requires CAPACITY"):
        validate_dataset_rows(
            [supply_row(measure="training_capacity", quantity_semantics="STOCK")],
            "supply",
        )


def test_accepts_training_completions_as_flow_not_current_worker_supply() -> None:
    result = validate_dataset_rows(
        [supply_row(measure="completions", quantity_semantics="FLOW")],
        "supply",
    )[0]
    assert result["measure"] == "completions"
    assert result["quantity_semantics"] == "FLOW"
    assert result["value"].as_tuple().digits == (1, 1, 0)
