"""Fetch and validate a dated LGD reference snapshot without touching Supabase.

The source archives are published by the ramSeraph/opendata community mirror from
Ministry of Panchayati Raj LGD exports. This tool produces a review artifact only.
It never writes to the SHRAMIK database or changes the canonical district roster.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import subprocess
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

RELEASE_API_URL = (
    "https://api.github.com/repos/ramSeraph/opendata/releases/tags/lgd-latest-extra1"
)
RELEASE_PAGE_URL = "https://github.com/ramSeraph/opendata/releases/tag/lgd-latest-extra1"
LGD_URL = "https://lgdirectory.gov.in/"
LEVELS = ("states", "districts", "subdistricts", "blocks")
MAX_ARCHIVE_BYTES = 20_000_000
ASSET_PATTERN = re.compile(
    r"^(states|districts|subdistricts|blocks)\.(\d{2}[A-Za-z]{3}\d{4})\.csv\.7z$"
)

HEADER_MAPS = {
    "states": {
        "statecode": "code",
        "statename(inenglish)": "name",
        "statename(inlocal)": "name_local",
        "stateorut": "type",
        "census2001code": "census_2001_code",
        "census2011code": "census_2011_code",
    },
    "districts": {
        "districtcode": "code",
        "districtname(inenglish)": "name",
        "statecode": "state_code",
    },
    "subdistricts": {
        "sub-districtcode": "code",
        "sub-districtname": "name",
        "statecode": "state_code",
        "districtcode": "district_code",
    },
    "blocks": {
        "developmentblockcode": "code",
        "developmentblockname(inenglish)": "name",
        "developmentblockname(inlocal)": "name_local",
        "statecode": "state_code",
        "districtcode": "district_code",
    },
}
OUTPUT_FIELDS = {
    "states": ("code", "name", "name_local", "type", "census_2001_code", "census_2011_code"),
    "districts": ("code", "name", "state_code"),
    "subdistricts": ("code", "name", "state_code", "district_code"),
    "blocks": ("code", "name", "name_local", "state_code", "district_code"),
}
MIN_ROWS = {"states": 30, "districts": 700, "subdistricts": 6000, "blocks": 6000}


def _normalise_header(value: str) -> str:
    return re.sub(r"\s+", "", value.lstrip("\ufeff").lower())


def _clean_code(value: Any) -> str:
    text = "" if value is None else str(value).strip()
    if re.fullmatch(r"\d+\.0+", text):
        text = text[:text.index(".")]
    return text


def _clean_text(value: Any) -> str:
    return "" if value is None else str(value).strip()


def parse_asset_date(name: str) -> datetime | None:
    match = ASSET_PATTERN.fullmatch(name)
    if not match:
        return None
    try:
        return datetime.strptime(match.group(2), "%d%b%Y").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def select_latest_complete_set(
    assets: list[dict[str, Any]],
    *,
    now: datetime | None = None,
    max_age_days: int = 14,
) -> tuple[str, dict[str, dict[str, Any]]]:
    """Select the newest complete four-file date, failing closed on stale/missing data."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    grouped: dict[datetime, dict[str, dict[str, Any]]] = {}
    for asset in assets:
        name = str(asset.get("name", ""))
        match = ASSET_PATTERN.fullmatch(name)
        date = parse_asset_date(name)
        if not match or date is None or not asset.get("browser_download_url"):
            continue
        level = match.group(1)
        if not asset.get("digest") or not str(asset["digest"]).startswith("sha256:"):
            continue
        grouped.setdefault(date, {})[level] = {
            "name": name,
            "url": asset["browser_download_url"],
            "digest": asset["digest"],
            "source_date": date.strftime("%d%b%Y"),
        }
    complete = [
        (date, files)
        for date, files in grouped.items()
        if all(level in files for level in LEVELS)
    ]
    if not complete:
        raise ValueError("No complete four-level LGD asset set with SHA-256 digests was found.")
    selected_date, selected = max(complete, key=lambda item: item[0])
    age_days = (now.astimezone(timezone.utc).date() - selected_date.date()).days
    if age_days < -1:
        raise ValueError(f"LGD source date {selected_date.date()} is in the future.")
    if age_days > max_age_days:
        raise ValueError(
            f"Latest complete LGD source set is stale: {selected_date:%d%b%Y} "
            f"({age_days} days old; maximum {max_age_days})."
        )
    return selected_date.strftime("%d%b%Y"), selected


def _download_verified(asset: dict[str, Any], *, timeout: int = 60) -> tuple[bytes, str]:
    request = urllib.request.Request(
        asset["url"],
        headers={"User-Agent": "SHRAMIK-LGD-reference-audit/1.0", "Accept": "application/octet-stream"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        declared_size = response.headers.get("Content-Length")
        if declared_size and int(declared_size) > MAX_ARCHIVE_BYTES:
            raise ValueError(f"{asset['name']} exceeds the {MAX_ARCHIVE_BYTES}-byte archive limit.")
        payload = response.read(MAX_ARCHIVE_BYTES + 1)
    if len(payload) > MAX_ARCHIVE_BYTES:
        raise ValueError(f"{asset['name']} exceeds the {MAX_ARCHIVE_BYTES}-byte archive limit.")
    sha256 = hashlib.sha256(payload).hexdigest()
    expected = str(asset["digest"]).removeprefix("sha256:").lower()
    if sha256 != expected:
        raise ValueError(
            f"Checksum mismatch for {asset['name']}: expected {expected}, received {sha256}."
        )
    return payload, sha256


def _extract_csv(archive_bytes: bytes, sevenzip: str, asset_name: str) -> str:
    with tempfile.NamedTemporaryFile(prefix="shramik-lgd-", suffix=".7z") as handle:
        handle.write(archive_bytes)
        handle.flush()
        result = subprocess.run(
            [sevenzip, "e", "-so", handle.name],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=90,
        )
    if result.returncode != 0:
        message = result.stderr.decode("utf-8", errors="replace")[-1000:]
        raise ValueError(f"7-Zip could not extract {asset_name}: {message}")
    try:
        return result.stdout.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError(f"{asset_name} did not contain UTF-8 CSV text.") from exc


def parse_source_csv(text: str, level: str) -> list[dict[str, str]]:
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError(f"{level}: source CSV has no header.")
    header_map = HEADER_MAPS[level]
    present_targets = {
        header_map.get(_normalise_header(header), "")
        for header in reader.fieldnames
    }
    missing = [
        field for field in OUTPUT_FIELDS[level]
        if field in ("code", "name", "state_code", "district_code")
        and field not in present_targets
    ]
    if missing:
        raise ValueError(f"{level}: missing required source columns for {', '.join(missing)}.")
    rows: list[dict[str, str]] = []
    for source_row in reader:
        remapped: dict[str, str] = {}
        for source_header, value in source_row.items():
            target = header_map.get(_normalise_header(source_header))
            if target:
                remapped[target] = value or ""
        row: dict[str, str] = {"code": _clean_code(remapped.get("code"))}
        if "name" in remapped:
            row["name"] = _clean_text(remapped["name"])
        for optional in ("name_local", "type", "census_2001_code", "census_2011_code"):
            if optional in OUTPUT_FIELDS[level] and optional in remapped:
                row[optional] = (
                    _clean_code(remapped[optional])
                    if optional.startswith("census_")
                    else _clean_text(remapped[optional])
                )
        if level != "states":
            row["state_code"] = _clean_code(remapped.get("state_code"))
        if level in ("subdistricts", "blocks"):
            row["district_code"] = _clean_code(remapped.get("district_code"))
        rows.append(row)
    if not rows:
        raise ValueError(f"{level}: source CSV contained no data rows.")
    return rows


def validate_snapshot(tables: dict[str, list[dict[str, str]]]) -> list[str]:
    errors: list[str] = []
    for level in LEVELS:
        rows = tables.get(level, [])
        if len(rows) < MIN_ROWS[level]:
            errors.append(f"{level}: only {len(rows)} rows; expected at least {MIN_ROWS[level]}.")
        required = ("code", "name") if level == "states" else (
            ("code", "name", "state_code") if level == "districts"
            else ("code", "name", "state_code", "district_code")
        )
        seen: set[str] = set()
        for row in rows:
            if any(not row.get(field, "").strip() for field in required):
                errors.append(f"{level}: blank required field in row {row!r}.")
                continue
            code = row["code"]
            if not code.isdigit():
                errors.append(f"{level}: non-numeric code {code!r}.")
            identity = (
                f"{row.get('state_code')}|{row.get('district_code')}|{code}"
                if level == "blocks" else code
            )
            if identity in seen:
                errors.append(f"{level}: duplicate code identity {identity!r}.")
            seen.add(identity)

    state_codes = {row["code"] for row in tables.get("states", []) if row.get("code")}
    district_by_code = {
        row["code"]: row for row in tables.get("districts", []) if row.get("code")
    }
    for row in tables.get("districts", []):
        if row.get("state_code") not in state_codes:
            errors.append(
                f"district {row.get('code')!r} has unknown state code {row.get('state_code')!r}."
            )
    for level in ("subdistricts", "blocks"):
        for row in tables.get(level, []):
            parent = district_by_code.get(row.get("district_code", ""))
            if parent is None:
                errors.append(
                    f"{level} {row.get('code')!r} has unknown district code "
                    f"{row.get('district_code')!r}."
                )
            elif parent.get("state_code") != row.get("state_code"):
                errors.append(f"{level} {row.get('code')!r} has a district/state mismatch.")
    return errors


def _write_csv(path: Path, rows: list[dict[str, str]], fields: tuple[str, ...]) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows({field: row.get(field, "") for field in fields} for row in rows)
    return hashlib.sha256(path.read_bytes()).hexdigest()


def refresh(output_dir: Path, *, sevenzip: str = "7z", now: datetime | None = None) -> dict[str, Any]:
    req = urllib.request.Request(
        RELEASE_API_URL,
        headers={"User-Agent": "SHRAMIK-LGD-reference-audit/1.0", "Accept": "application/vnd.github+json"},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        release = json.load(response)
    source_date, selected = select_latest_complete_set(release.get("assets", []), now=now)
    tables: dict[str, list[dict[str, str]]] = {}
    archive_metadata: dict[str, dict[str, str]] = {}
    for level in LEVELS:
        asset = selected[level]
        archive_bytes, archive_sha = _download_verified(asset)
        tables[level] = parse_source_csv(_extract_csv(archive_bytes, sevenzip, asset["name"]), level)
        archive_metadata[level] = {
            "asset_name": asset["name"],
            "url": asset["url"],
            "archive_sha256": archive_sha,
            "source_digest": asset["digest"],
        }
    errors = validate_snapshot(tables)
    if errors:
        raise ValueError("LGD snapshot rejected:\n- " + "\n- ".join(errors[:100]))
    file_hashes = {}
    for level in LEVELS:
        file_hashes[f"{level}.csv"] = _write_csv(
            output_dir / f"{level}.csv", tables[level], OUTPUT_FIELDS[level]
        )
    manifest = {
        "source_date": source_date,
        "retrieved_at_utc": (now or datetime.now(timezone.utc)).astimezone(timezone.utc).isoformat(),
        "publisher": "Ministry of Panchayati Raj — Local Government Directory (LGD)",
        "official_source_url": LGD_URL,
        "mirror_release_url": RELEASE_PAGE_URL,
        "license": "GODL-India (confirm attribution requirements before redistribution)",
        "acceptance_status": "VALIDATED_CANDIDATE_REQUIRES_DATABASE_RECONCILIATION",
        "row_counts": {level: len(tables[level]) for level in LEVELS},
        "source_archives": archive_metadata,
        "normalised_csv_sha256": file_hashes,
        "database_modified": False,
        "notes": [
            "Fetched from a community mirror that attributes the Ministry of Panchayati Raj LGD.",
            "Archive checksums, headers, unique codes, row-volume floors and parent relationships were validated.",
            "This script produces a candidate source snapshot only; it does not update Supabase or approve mappings.",
            "Compare the district roster against the current SHRAMIK database and review every add, rename, move or retirement before any database change.",
        ],
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=Path("artifacts/lgd-reference"))
    parser.add_argument("--sevenzip", default="7z", help="7-Zip executable name/path.")
    args = parser.parse_args()
    manifest = refresh(args.output_dir, sevenzip=args.sevenzip)
    print(json.dumps(manifest, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
