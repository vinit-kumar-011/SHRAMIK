#!/usr/bin/env python3
"""Reproducibly import the official DGE NCO-2015 occupation catalogue.

The importer preserves the occupation hierarchy and never invents NIC sectors.
By default it writes only a CSV and manifest. Database synchronization is explicit.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE_URL = "https://dge.gov.in/nat"
# Alternate official Drupal route if the path alias returns a non-catalogue page.
FALLBACK_BASE_URLS = ("https://dge.gov.in/index.php/nat",)
SOURCE_NAME = "National Classification of Occupations 2015"
SOURCE_CODE_URL = "https://dge.gov.in/nco-2015"
NCO_CODE_RE = re.compile(r"^\d{4}\.\d{4}$")
USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
              "AppleWebKit/537.36 (KHTML, like Gecko) "
              "Chrome/130.0.0.0 Safari/537.36")
CORE_FIELDS = (
    "nco_code", "occupation_title", "nco_2004_code",
    "division", "sub_division", "occupation_group", "occupation_family",
)
CSV_FIELDS = (
    *CORE_FIELDS, "source_url", "source_page", "source_row_number",
    "source_snapshot_sha256", "retrieved_at",
)


def clean_text(value: str) -> str:
    return " ".join((value or "").replace("\xa0", " ").split()).strip()


def header_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", clean_text(value).casefold())


class _RowParser(HTMLParser):
    """Minimal stdlib table parser which retains cell text, not markup."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self._row: list[str] | None = None
        self._cell_parts: list[str] | None = None

    def handle_starttag(self, tag: str, attrs) -> None:
        tag = tag.casefold()
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell_parts = []
        elif tag in ("br", "p", "div") and self._cell_parts is not None:
            self._cell_parts.append(" ")

    def handle_data(self, data: str) -> None:
        if self._cell_parts is not None:
            self._cell_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.casefold()
        if tag in ("td", "th") and self._row is not None and self._cell_parts is not None:
            self._row.append(clean_text("".join(self._cell_parts)))
            self._cell_parts = None
        elif tag == "tr":
            if self._row:
                self.rows.append(self._row)
            self._row = None
            self._cell_parts = None


def _html_response_summary(html: str) -> str:
    """Return a bounded text-only preview to diagnose non-catalogue responses."""
    title_match = re.search(r"<title\b[^>]*>(.*?)</title\\s*>", html, flags=re.I | re.S)
    title = clean_text(unescape(re.sub(r"<[^>]+>", " ", title_match.group(1)))) if title_match else "(no title tag)"
    without_scripts = re.sub(r"<(script|style)\b[^>]*>.*?</\1\s*>", " ", html, flags=re.I | re.S)
    visible = clean_text(unescape(re.sub(r"<[^>]+>", " ", without_scripts)))
    return f"title={title[:160]!r}; body_preview={visible[:400]!r}; html_chars={len(html)}"


def _find_header(rows: list[list[str]], html: str = "") -> tuple[int, dict[str, int]]:
    """Find the occupation table header while tolerating harmless label variations."""
    aliases = {
        "occupation_title": {"occupationaltitle", "occupationtitle"},
        "nco_code": {"nco2015", "nco2015code", "nco2015occupationcode"},
        "nco_2004_code": {"nco2004", "nco2004code"},
        "division": {"division"},
        "sub_division": {"subdivision", "subdivisionname"},
        "occupation_group": {"group", "occupationgroup"},
        "occupation_family": {"family", "occupationfamily"},
    }

    def matches(field: str, key: str) -> bool:
        if key in aliases[field]:
            return True
        # DGE has changed minor display labels over time. Match by unambiguous
        # normalized tokens, but never confuse NCO-2004 with NCO-2015.
        if field == "occupation_title":
            return ("occupation" in key and "title" in key) or key == "occupation"
        if field == "nco_code":
            return "nco" in key and "2015" in key and "2004" not in key
        if field == "nco_2004_code":
            return "nco" in key and "2004" in key
        if field == "sub_division":
            return "subdivision" in key
        if field == "occupation_group":
            return key.endswith("group")
        if field == "occupation_family":
            return key.endswith("family")
        return False

    for row_index, row in enumerate(rows):
        keys = [header_key(cell) for cell in row]
        indices: dict[str, int] = {}
        for field in aliases:
            for idx, key in enumerate(keys):
                if matches(field, key):
                    indices[field] = idx
                    break
        if {"occupation_title", "nco_code"} <= set(indices):
            return row_index, indices

    samples = [
        [clean_text(cell)[:80] for cell in row[:8]]
        for row in rows[:8]
        if any(clean_text(cell) for cell in row)
    ]
    raise ValueError(
        "Could not find the DGE occupation-table header. "
        f"Parsed {len(rows)} HTML table row(s); first row samples={samples!r}. "
        f"Response summary: {_html_response_summary(html)}. "
        "The response may be an interstitial or JavaScript shell rather than the catalogue. "
        "No database changes were made."
    )


def is_terminal_empty_page(html: str, requested_page: int) -> bool:
    """Recognize an out-of-range final pager request, not a mid-run parse failure.

    Requires official DGE page branding, no actual table rows, and pagination
    links proving the requested page exceeds the last available page.
    """
    if requested_page < 1:
        return False
    if not re.search(r"<\\s*tr(?:\\s|>)", html, flags=re.I):
        has_dge_branding = (
            "National Classification of Occupations" in html
            and "Directorate General of Employment" in html
        )
        if not has_dge_branding:
            return False
        hrefs = re.findall(r"""href\\s*=\\s*(['"])(.*?)\\1""", html, flags=re.I | re.S)
        linked_pages: list[int] = []
        for _, href in hrefs:
            decoded_href = unescape(href).replace("&amp;", "&")
            if re.search(r"(?:[?&])page=\\d+", decoded_href):
                match = re.search(r"(?:[?&])page=(\\d+)", decoded_href)
                if match:
                    linked_pages.append(int(match.group(1)))
        return bool(linked_pages) and requested_page > max(linked_pages)
    return False


def parse_nco_page(html: str, page: int, page_url: str) -> list[dict[str, object]]:
    parser = _RowParser()
    parser.feed(html)
    header_row, indices = _find_header(parser.rows, html)
    records: list[dict[str, object]] = []
    required_idx = max(indices.values())

    for row in parser.rows[header_row + 1:]:
        if len(row) <= required_idx:
            continue
        code = clean_text(row[indices["nco_code"]])
        title = clean_text(row[indices["occupation_title"]])
        if not NCO_CODE_RE.fullmatch(code) or not title:
            continue
        serial_match = re.match(r"^\s*(\d+)", row[0] if row else "")
        if not serial_match:
            raise ValueError(f"Catalogue record {code} has no numeric source row number.")
        record: dict[str, object] = {
            "nco_code": code,
            "occupation_title": title,
            "nco_2004_code": None,
            "division": None,
            "sub_division": None,
            "occupation_group": None,
            "occupation_family": None,
            "source_url": page_url,
            "source_page": page,
            "source_row_number": int(serial_match.group(1)),
        }
        for field in ("nco_2004_code", "division", "sub_division", "occupation_group", "occupation_family"):
            index = indices.get(field)
            if index is not None and index < len(row):
                value = clean_text(row[index])
                record[field] = value or None
        records.append(record)
    return records


def fetch_page(page: int, timeout: int = 45, base_url: str = BASE_URL) -> tuple[str, str]:
    # Drupal's first pager page is the canonical route with no query string.
    # Subsequent pages use Drupal's page query parameter.
    url = base_url if page == 0 else f"{base_url}?{urlencode({'page': page})}"
    request = Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
        "Cache-Control": "no-cache",
    })
    try:
        with urlopen(request, timeout=timeout) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            return response.read().decode(charset, errors="replace"), response.geturl()
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(f"Could not fetch DGE page {page} ({url}): {exc}") from exc


def merge_and_validate(records: list[dict[str, object]]) -> list[dict[str, object]]:
    by_code: dict[str, dict[str, object]] = {}
    for row in records:
        code = str(row["nco_code"])
        if not NCO_CODE_RE.fullmatch(code):
            raise ValueError(f"Invalid NCO code: {code!r}")
        current_core = {field: row.get(field) for field in CORE_FIELDS}
        prior = by_code.get(code)
        if prior is None:
            by_code[code] = row
            continue
        prior_core = {field: prior.get(field) for field in CORE_FIELDS}
        if current_core != prior_core:
            raise ValueError(f"Conflicting catalogue rows for NCO code {code}.")
    return [by_code[code] for code in sorted(by_code)]


def canonical_snapshot_hash(records: list[dict[str, object]]) -> str:
    payload = [
        {field: row.get(field) for field in CORE_FIELDS}
        for row in sorted(records, key=lambda item: str(item["nco_code"]))
    ]
    blob = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def fetch_catalogue(max_pages: int = 30, minimum_records: int = 2000, delay_seconds: float = 0.15):
    collected: list[dict[str, object]] = []
    page_urls: list[str] = []
    reached_end = False

    for page in range(max_pages):
        page_records = None
        final_url = ""
        errors: list[str] = []

        for base_url in (BASE_URL, *FALLBACK_BASE_URLS):
            try:
                html, candidate_url = fetch_page(page, base_url=base_url)
                try:
                    candidate_records = parse_nco_page(html, page, candidate_url)
                except ValueError as exc:
                    errors.append(f"{candidate_url}: {exc}")
                    continue
                page_records = candidate_records
                final_url = candidate_url
                break
            except RuntimeError as exc:
                errors.append(str(exc))

        if page_records is None:
            # A request beyond the last Drupal pager page can return the normal
            # DGE site shell with no table at all. Treat that as end-of-data only
            # when a linked pager proves this page is out of range and we've
            # already collected enough records to satisfy the completeness floor.
            terminal_match = False
            for base_url in (BASE_URL, *FALLBACK_BASE_URLS):
                try:
                    html, _candidate_url = fetch_page(page, base_url=base_url)
                except RuntimeError:
                    continue
                if is_terminal_empty_page(html, page):
                    terminal_match = True
                    break
            if terminal_match and len(collected) >= minimum_records:
                reached_end = True
                break
            raise RuntimeError(
                f"Could not parse DGE page {page} from the primary or fallback official route. "
                f"Records collected so far: {len(collected)}; required minimum: {minimum_records}. "
                + " | ".join(errors)
            )

        page_urls.append(final_url)
        if not page_records:
            if page == 0:
                raise RuntimeError("DGE page 0 returned no parseable NCO rows.")
            reached_end = True
            break
        collected.extend(page_records)
        time.sleep(delay_seconds)

    if not reached_end:
        raise RuntimeError(
            f"Reached --max-pages={max_pages} without an empty end page. "
            "Increase --max-pages; the partial catalogue was not saved."
        )

    records = merge_and_validate(collected)
    if len(records) < minimum_records:
        raise RuntimeError(
            f"Parsed only {len(records)} unique occupations; expected at least {minimum_records}. "
            "The source may be incomplete or have changed layout."
        )

    snapshot_hash = canonical_snapshot_hash(records)
    retrieved_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for row in records:
        row["source_snapshot_sha256"] = snapshot_hash
        row["retrieved_at"] = retrieved_at
    return records, snapshot_hash, retrieved_at, page_urls


def write_outputs(records, snapshot_hash, retrieved_at, page_urls, csv_path: Path, manifest_path: Path) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)
    manifest = {
        "source_name": SOURCE_NAME,
        "source_page_url": BASE_URL,
        "source_downloads_url": SOURCE_CODE_URL,
        "retrieved_at": retrieved_at,
        "source_snapshot_sha256": snapshot_hash,
        "unique_occupation_count": len(records),
        "page_count": len(page_urls),
        "page_urls": page_urls,
        "parser_version": "1.1.0",
        "notes": "No NIC sector assignments are inferred or emitted.",
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sync_database(records: list[dict[str, object]], database_url: str) -> int:
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError(
            "Database sync needs psycopg. Run: python -m pip install -r backend/requirements.txt"
        ) from exc

    sql = """
        insert into public.stg_nco_2015_occupations (
            nco_code, occupation_title, nco_2004_code, division, sub_division,
            occupation_group, occupation_family, source_id, source_url,
            source_page, source_row_number, source_snapshot_sha256, retrieved_at,
            imported_at, is_current
        ) values (
            %(nco_code)s, %(occupation_title)s, %(nco_2004_code)s, %(division)s,
            %(sub_division)s, %(occupation_group)s, %(occupation_family)s,
            %(source_id)s, %(source_url)s, %(source_page)s, %(source_row_number)s,
            %(source_snapshot_sha256)s, %(retrieved_at)s, now(), true
        )
        on conflict (nco_code) do update set
            occupation_title = excluded.occupation_title,
            nco_2004_code = excluded.nco_2004_code,
            division = excluded.division,
            sub_division = excluded.sub_division,
            occupation_group = excluded.occupation_group,
            occupation_family = excluded.occupation_family,
            source_id = excluded.source_id,
            source_url = excluded.source_url,
            source_page = excluded.source_page,
            source_row_number = excluded.source_row_number,
            source_snapshot_sha256 = excluded.source_snapshot_sha256,
            retrieved_at = excluded.retrieved_at,
            imported_at = now(),
            is_current = true
    """
    with psycopg.connect(database_url) as conn:
        with conn.transaction():
            source = conn.execute(
                "select id from public.data_sources where name = %s", (SOURCE_NAME,)
            ).fetchone()
            if not source:
                raise RuntimeError(f"Missing data source registry entry: {SOURCE_NAME}")
            conn.execute("update public.stg_nco_2015_occupations set is_current = false")
            with conn.cursor() as cur:
                cur.executemany(sql, [{**row, "source_id": source[0]} for row in records])
            snapshot_hash = str(records[0]["source_snapshot_sha256"])
            actual = conn.execute(
                """select count(*) from public.stg_nco_2015_occupations
                   where is_current = true and source_snapshot_sha256 = %s""",
                (snapshot_hash,),
            ).fetchone()[0]
            if actual != len(records):
                raise RuntimeError(f"Post-import count mismatch: expected {len(records)}, got {actual}.")
    return len(records)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=Path("data/raw/nco_2015_occupations.csv"))
    parser.add_argument("--manifest", type=Path, default=Path("data/raw/nco_2015_import_manifest.json"))
    parser.add_argument("--max-pages", type=int, default=30)
    parser.add_argument("--minimum-records", type=int, default=2000)
    parser.add_argument("--delay-seconds", type=float, default=0.15)
    parser.add_argument("--sync-db", action="store_true", help="Explicitly upsert the complete snapshot into Supabase.")
    parser.add_argument("--database-url", default=None, help="Database URL; otherwise use DATABASE_URL.")
    args = parser.parse_args(argv)
    if args.max_pages < 2 or args.minimum_records < 1 or args.delay_seconds < 0:
        parser.error("--max-pages must be >= 2; --minimum-records >= 1; --delay-seconds >= 0.")
    try:
        records, snapshot_hash, retrieved_at, page_urls = fetch_catalogue(
            args.max_pages, args.minimum_records, args.delay_seconds
        )
        write_outputs(records, snapshot_hash, retrieved_at, page_urls, args.csv, args.manifest)
        print(f"Exported {len(records)} unique NCO-2015 occupations.")
        print(f"Snapshot SHA-256: {snapshot_hash}")
        print(f"CSV: {args.csv}")
        print(f"Manifest: {args.manifest}")
        if args.sync_db:
            database_url = args.database_url or os.getenv("DATABASE_URL")
            if not database_url:
                raise RuntimeError("--sync-db requires --database-url or DATABASE_URL.")
            count = sync_database(records, database_url)
            print(f"Verified {count} current rows in public.stg_nco_2015_occupations.")
        return 0
    except (RuntimeError, ValueError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
