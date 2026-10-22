from __future__ import annotations

import pytest

from app.ingestion.demo import _resolve_pilot_districts


def test_resolves_canonical_kataka_alias_for_cuttack_without_rewriting_id() -> None:
    rows = [
        {"id": "IN-LGD-362", "name": "Khordha"},
        {"id": "IN-LGD-354", "name": "Ganjam"},
        {"id": "IN-LGD-350", "name": "Kataka"},
        {"id": "IN-LGD-355", "name": "Jagatsinghapur"},
    ]

    selected = _resolve_pilot_districts(rows)

    assert selected == [
        {"id": "IN-LGD-350", "name": "Kataka"},
        {"id": "IN-LGD-354", "name": "Ganjam"},
        {"id": "IN-LGD-362", "name": "Khordha"},
    ]


def test_rejects_missing_pilot_district_instead_of_using_a_nearby_id() -> None:
    rows = [
        {"id": "IN-LGD-354", "name": "Ganjam"},
        {"id": "IN-LGD-362", "name": "Khordha"},
    ]

    with pytest.raises(RuntimeError, match="cuttack/kataka"):
        _resolve_pilot_districts(rows)
