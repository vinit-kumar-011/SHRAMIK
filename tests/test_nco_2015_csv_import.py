import csv
from pathlib import Path

import pytest

from scripts.import_nco_2015_csv import (
    CSV_FIELDS,
    canonical_snapshot_hash,
    read_and_validate_csv,
)


def sample_rows():
    rows = [
        {
            "nco_code": "7321.1100",
            "occupation_title": "Router",
            "nco_2004_code": "",
            "division": "Craft and Related Trades Workers",
            "sub_division": "Handicraft and Printing Workers",
            "occupation_group": "Printing Trades Workers",
            "occupation_family": "Pre-press Technicians",
            "source_url": "https://dge.gov.in/nco-2015",
            "source_page": "199",
            "source_row_number": "2",
            "source_snapshot_sha256": "",
            "retrieved_at": "2026-10-17T15:42:26+00:00",
        },
        {
            "nco_code": "7322.0100",
            "occupation_title": "Job Printer",
            "nco_2004_code": "",
            "division": "Craft and Related Trades Workers",
            "sub_division": "Handicraft and Printing Workers",
            "occupation_group": "Printing Trades Workers",
            "occupation_family": "Printers",
            "source_url": "https://dge.gov.in/nco-2015",
            "source_page": "201",
            "source_row_number": "4",
            "source_snapshot_sha256": "",
            "retrieved_at": "2026-10-17T15:42:26+00:00",
        },
    ]
    digest = canonical_snapshot_hash(rows)
    for row in rows:
        row["source_snapshot_sha256"] = digest
    return rows


def write_rows(path: Path, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def test_valid_rows_and_snapshot_hash_pass(tmp_path):
    path = tmp_path / "valid.csv"
    rows = sample_rows()
    write_rows(path, rows)
    parsed, digest = read_and_validate_csv(path, expected_count=2)
    assert len(parsed) == 2
    assert digest == canonical_snapshot_hash(parsed)


def test_duplicate_code_fails_closed(tmp_path):
    path = tmp_path / "duplicate.csv"
    rows = sample_rows()
    rows.append(dict(rows[0]))
    digest = canonical_snapshot_hash(rows)
    for row in rows:
        row["source_snapshot_sha256"] = digest
    write_rows(path, rows)
    with pytest.raises(ValueError, match="Duplicate NCO code"):
        read_and_validate_csv(path, expected_count=3)


def test_snapshot_hash_tampering_fails_closed(tmp_path):
    path = tmp_path / "tampered.csv"
    rows = sample_rows()
    rows[0]["occupation_title"] = "Altered title"
    write_rows(path, rows)
    with pytest.raises(ValueError, match="Snapshot hash mismatch"):
        read_and_validate_csv(path, expected_count=2)


def test_incomplete_row_count_fails_closed(tmp_path):
    path = tmp_path / "partial.csv"
    write_rows(path, sample_rows())
    with pytest.raises(ValueError, match="Row count mismatch"):
        read_and_validate_csv(path, expected_count=3451)


def test_invalid_code_and_blank_title_fail_closed(tmp_path):
    path = tmp_path / "invalid.csv"
    rows = sample_rows()
    rows[0]["nco_code"] = "7321.110"
    digest = canonical_snapshot_hash(rows)
    for row in rows:
        row["source_snapshot_sha256"] = digest
    write_rows(path, rows)
    with pytest.raises(ValueError, match="Invalid NCO code"):
        read_and_validate_csv(path, expected_count=2)

    rows = sample_rows()
    rows[0]["occupation_title"] = ""
    digest = canonical_snapshot_hash(rows)
    for row in rows:
        row["source_snapshot_sha256"] = digest
    write_rows(path, rows)
    with pytest.raises(ValueError, match="Blank occupation_title"):
        read_and_validate_csv(path, expected_count=2)
