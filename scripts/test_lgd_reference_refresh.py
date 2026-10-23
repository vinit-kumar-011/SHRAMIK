import unittest
from datetime import datetime, timezone

from scripts.refresh_lgd_reference import (
    LEVELS,
    OUTPUT_FIELDS,
    parse_asset_date,
    parse_source_csv,
    select_latest_complete_set,
    validate_snapshot,
)


def assets_for(date_label, levels=LEVELS):
    return [
        {
            "name": f"{level}.{date_label}.csv.7z",
            "browser_download_url": f"https://example.invalid/{level}.{date_label}.csv.7z",
            "digest": f"sha256:{'a' * 64}",
        }
        for level in levels
    ]


class LGDReferenceRefreshTests(unittest.TestCase):
    def test_parse_asset_date_rejects_invalid_names_and_dates(self):
        self.assertEqual(
            parse_asset_date("districts.21Oct2026.csv.7z"),
            datetime(2026, 10, 21, tzinfo=timezone.utc),
        )
        self.assertIsNone(parse_asset_date("districts.latest.csv.7z"))
        self.assertIsNone(parse_asset_date("districts.32Oct2026.csv.7z"))

    def test_selects_newest_complete_snapshot_not_newer_partial_snapshot(self):
        assets = assets_for("20Oct2026") + assets_for("21Oct2026", ("states", "districts"))
        date_label, files = select_latest_complete_set(
            assets, now=datetime(2026, 10, 23, tzinfo=timezone.utc)
        )
        self.assertEqual(date_label, "20Oct2026")
        self.assertEqual(set(files), set(LEVELS))

    def test_rejects_stale_or_checksumless_source_sets(self):
        with self.assertRaisesRegex(ValueError, "stale"):
            select_latest_complete_set(
                assets_for("01Sep2026"),
                now=datetime(2026, 10, 23, tzinfo=timezone.utc),
            )
        bad_assets = assets_for("21Oct2026")
        bad_assets[0].pop("digest")
        with self.assertRaisesRegex(ValueError, "No complete"):
            select_latest_complete_set(
                bad_assets, now=datetime(2026, 10, 23, tzinfo=timezone.utc)
            )

    def test_source_headers_are_normalized_by_name_not_position(self):
        raw = (
            "S.No., District Code, District Name(In English), State Code, ignored\n"
            "1,603,Nicobars,35,x\n"
        )
        rows = parse_source_csv(raw, "districts")
        self.assertEqual(rows, [{"code": "603", "name": "Nicobars", "state_code": "35"}])
        self.assertEqual(set(rows[0]), set(OUTPUT_FIELDS["districts"]))

    def test_integrity_validation_passes_a_complete_fixture(self):
        states = [
            {"code": str(i), "name": f"State {i}", "type": "S"}
            for i in range(1, 37)
        ]
        districts = [
            {"code": str(1000 + i), "name": f"District {i}", "state_code": str((i % 36) + 1)}
            for i in range(784)
        ]
        subdistricts = []
        blocks = []
        for i in range(6000):
            district = districts[i % len(districts)]
            subdistricts.append({
                "code": str(100000 + i), "name": f"Subdistrict {i}",
                "state_code": district["state_code"], "district_code": district["code"],
            })
            blocks.append({
                "code": str(200000 + i), "name": f"Block {i}",
                "name_local": "", "state_code": district["state_code"],
                "district_code": district["code"],
            })
        tables = {
            "states": states,
            "districts": districts,
            "subdistricts": subdistricts,
            "blocks": blocks,
        }
        self.assertEqual(validate_snapshot(tables), [])

    def test_integrity_validation_rejects_duplicate_codes_and_orphan_parent(self):
        states = [{"code": str(i), "name": f"State {i}"} for i in range(1, 37)]
        districts = [
            {"code": str(1000 + i), "name": f"District {i}", "state_code": "1"}
            for i in range(784)
        ]
        subdistricts = [
            {"code": str(100000 + i), "name": f"Subdistrict {i}",
             "state_code": "1", "district_code": districts[0]["code"]}
            for i in range(6000)
        ]
        blocks = [
            {"code": str(200000 + i), "name": f"Block {i}",
             "state_code": "1", "district_code": districts[0]["code"]}
            for i in range(6000)
        ]
        districts[0]["state_code"] = "999"
        districts[1]["code"] = districts[0]["code"]
        errors = validate_snapshot({
            "states": states, "districts": districts,
            "subdistricts": subdistricts, "blocks": blocks,
        })
        self.assertTrue(any("duplicate code" in error for error in errors))
        self.assertTrue(any("unknown state code" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
