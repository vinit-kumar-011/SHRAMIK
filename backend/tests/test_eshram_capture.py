import json
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.capture_eshram_snapshot import CaptureError, parse_filters, run_capture


class FakeResponse:
    def __init__(self, value):
        self.body = json.dumps(value).encode("utf-8")
        self.status = 200
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self): return self.body


def payload(offset, limit, rows, total=999):
    return {"status": "ok", "data_fetch_date": "2026-10-15",
            "updated_date": "2026-10-16T20:08:30Z", "total": total,
            "count": len(rows), "limit": str(limit), "offset": str(offset),
            "records": rows}


def test_filter_parser_only_accepts_observed_fields():
    assert parse_filters(["currentStateName=Odisha"]) == {"currentStateName": "Odisha"}
    with pytest.raises(CaptureError):
        parse_filters(["inventedField=value"])


def test_bounded_capture_suppresses_small_categories_and_keeps_total_uninterpreted():
    rows1 = [
        {"currentStateName": "Odisha", "currentDistrictName": "Khordha", "primaryOccupation": "Construction", "age": 38},
        {"currentStateName": "Odisha", "currentDistrictName": "Khordha", "primaryOccupation": "Construction", "age": 41},
    ]
    rows2 = [{"currentStateName": "Odisha", "currentDistrictName": "Khordha", "primaryOccupation": "Construction", "age": 29}]
    with TemporaryDirectory() as directory, patch(
        "scripts.capture_eshram_snapshot.urlopen",
        side_effect=[FakeResponse(payload(0, 2, rows1)), FakeResponse(payload(2, 2, rows2))],
    ):
        result = run_capture(api_key="test-secret-never-written", output_root=Path(directory),
                             page_size=2, max_records=5, max_pages=5)
        text = result["summary_path"].read_text(encoding="utf-8")
        summary = json.loads(text)
        frequencies = result["frequency_path"].read_text(encoding="utf-8")
        assert summary["rows_returned_in_capture"] == 3
        assert summary["pages_captured"] == 2
        assert summary["api_reported_total_uninterpreted"] == 999
        assert summary["unique_worker_count"] is None
        assert summary["population_count_from_this_capture"] is None
        assert "test-secret-never-written" not in text
        assert "Khordha" not in frequencies  # Three rows: suppressed below five.
        assert "age" in summary["record_field_names_observed"]
        assert list(result["raw_dir"].glob("page_*.json"))


def test_count_mismatch_fails_closed():
    bad = payload(0, 10, [{"currentStateName": "Odisha"}])
    bad["count"] = 2
    with patch("scripts.capture_eshram_snapshot.urlopen", return_value=FakeResponse(bad)):
        with TemporaryDirectory() as directory, pytest.raises(CaptureError, match="count does not match"):
            run_capture(api_key="test-secret", output_root=Path(directory), page_size=10,
                        max_records=10, max_pages=1)
