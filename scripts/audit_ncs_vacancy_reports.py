"""Audit public NCS aggregate vacancy report availability without collecting live jobseeker data.

This probe requests one known, dated FY 2024-25 state report plus its parent directory URL.
It saves only compact response metadata and parsed aggregate table text for assessment.
It does not access authenticated pages, post credentials, write to a database, or crawl job listings.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

BASE = (
    "https://www.ncs.gov.in/NCS%20Reports/Active%20Job%20Vacancy%20Reports/"
    "Active%20Job%20Vacancy%20-%20State%20wise/2024-25%28Post%20Data%20Cleansing%29/"
)
BIHAR_REPORT = urljoin(
    BASE,
    "Bihar/Job%20Vacancy%20-%20Bihar%20-%202024-25.html",
)
SOURCES = {
    "bihar_sample_report_legacy_url": BIHAR_REPORT,
    "statewise_parent_directory_legacy_url": BASE,
    "official_static_analytics_legacy_url": "https://www.ncs.gov.in/_layouts/15/ncsp/ViewStaticReport.aspx",
    "current_ncs_report_dashboard": "https://ncs.gov.in/NCSReportDashboard",
    "official_newsletters_page": "https://www.ncs.gov.in/Pages/Newsletters.aspx",
}
MAX_RESPONSE_BYTES = 5_000_000


class HTMLInventoryParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self._in_title = False
        self._skip_content_depth = 0
        self._current_context_tag: str | None = None
        self._current_context_parts: list[str] = []
        self.context_elements: list[dict[str, str]] = []
        self.visible_text_parts: list[str] = []
        self._cell_depth = 0
        self._table_depth = 0
        self._current_cell: list[str] | None = None
        self._current_row: list[str] | None = None
        self._current_table: list[list[str]] | None = None
        self.tables: list[list[list[str]]] = []
        self.links: list[dict[str, str]] = []
        self.script_sources: list[str] = []
        self.stylesheet_sources: list[str] = []
        self._current_link: dict[str, str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_map = dict(attrs)
        if tag.lower() == "title":
            self._in_title = True
        elif tag.lower() in ("script", "style"):
            self._skip_content_depth += 1
            if tag.lower() == "script":
                source = attrs_map.get("src") or ""
                if source:
                    self.script_sources.append(source)
        elif tag.lower() in ("h1", "h2", "h3", "h4", "caption", "legend"):
            self._current_context_tag = tag.lower()
            self._current_context_parts = []
        elif tag.lower() == "link":
            rel = (attrs_map.get("rel") or "").lower()
            href = attrs_map.get("href") or ""
            if href and "stylesheet" in rel:
                self.stylesheet_sources.append(href)
        elif tag.lower() == "a":
            href = attrs_map.get("href") or ""
            if href:
                self._current_link = {"href": href, "text": ""}
        elif tag.lower() == "table":
            if self._table_depth == 0:
                self._current_table = []
            self._table_depth += 1
        elif tag.lower() == "tr" and self._table_depth > 0:
            self._current_row = []
        elif tag.lower() in ("td", "th") and self._table_depth > 0:
            self._current_cell = []
            self._cell_depth += 1
        elif self._current_cell is not None and tag.lower() == "br":
            self._current_cell.append(" ")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in ("script", "style"):
            self._skip_content_depth = max(0, self._skip_content_depth - 1)
        if self._current_context_tag == tag:
            text = re.sub(r"\s+", " ", "".join(self._current_context_parts)).strip()
            if text:
                self.context_elements.append({"tag": tag, "text": text[:500]})
            self._current_context_tag = None
            self._current_context_parts = []
        if tag == "title":
            self._in_title = False
        elif tag == "a":
            if self._current_link:
                self._current_link["text"] = re.sub(
                    r"\s+", " ", self._current_link["text"]
                ).strip()
                self.links.append(self._current_link)
                self._current_link = None
        elif tag in ("td", "th") and self._table_depth > 0 and self._current_cell is not None:
            cell = re.sub(r"\s+", " ", "".join(self._current_cell)).strip()
            if self._current_row is not None:
                self._current_row.append(cell)
            self._current_cell = None
            self._cell_depth = max(0, self._cell_depth - 1)
        elif tag == "tr" and self._table_depth > 0 and self._current_row is not None:
            if any(cell for cell in self._current_row):
                if self._current_table is not None:
                    self._current_table.append(self._current_row)
            self._current_row = None
        elif tag == "table" and self._table_depth > 0:
            self._table_depth -= 1
            if self._table_depth == 0:
                if self._current_table:
                    self.tables.append(self._current_table)
                self._current_table = None

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
        if self._skip_content_depth == 0:
            self.visible_text_parts.append(data)
        if self._current_context_tag is not None:
            self._current_context_parts.append(data)
        if self._current_cell is not None:
            self._current_cell.append(data)
        if self._current_link is not None:
            self._current_link["text"] += data


def fetch_page(url: str, timeout: int = 25) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "SHRAMIK-source-audit/1.0 (public aggregate-report availability check)",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    result: dict[str, Any] = {
        "requested_url": url,
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "http_status": None,
        "final_url": None,
        "content_type": None,
        "bytes": 0,
        "sha256": None,
        "title": "",
        "context_elements": [],
        "visible_text_excerpt": "",
        "table_count": 0,
        "table_previews": [],
        "link_count": 0,
        "relevant_links": [],
        "script_sources": [],
        "stylesheet_sources": [],
        "route_redirected_to_root": False,
        "outcome": "",
        "error": None,
    }
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
            result["http_status"] = getattr(response, "status", None)
            result["final_url"] = response.geturl()
            result["content_type"] = response.headers.get("Content-Type", "")
        if len(body) > MAX_RESPONSE_BYTES:
            result["outcome"] = "REJECTED_RESPONSE_TOO_LARGE"
            result["bytes"] = len(body)
            return result
        result["bytes"] = len(body)
        result["sha256"] = hashlib.sha256(body).hexdigest()
        content_type = (result["content_type"] or "").lower()
        if "html" not in content_type and body[:100].lstrip().startswith(b"%PDF"):
            result["outcome"] = "PDF_RESPONSE_NOT_PARSED_BY_HTML_PROBE"
            return result
        text = body.decode("utf-8", errors="replace")
        parser = HTMLInventoryParser()
        parser.feed(text)
        result["title"] = re.sub(r"\s+", " ", parser.title).strip()
        result["context_elements"] = parser.context_elements[:100]
        visible_text = re.sub(r"\s+", " ", " ".join(parser.visible_text_parts)).strip()
        result["visible_text_excerpt"] = visible_text[:6000]
        result["route_redirected_to_root"] = (
            (result["final_url"] or "").rstrip("/") in ("https://ncs.gov.in", "https://www.ncs.gov.in")
            and url.rstrip("/") not in ("https://ncs.gov.in", "https://www.ncs.gov.in")
        )
        result["script_sources"] = parser.script_sources[:40]
        result["stylesheet_sources"] = parser.stylesheet_sources[:40]
        result["table_count"] = len(parser.tables)
        result["table_previews"] = [
            {
                "row_count": len(table),
                "rows": [row[:16] for row in table[:60]],
            }
            for table in parser.tables[:12]
        ]
        result["link_count"] = len(parser.links)
        result["relevant_links"] = [
            link for link in parser.links
            if re.search(r"vacan|district|state|report|2024.?25", link["href"] + " " + link["text"], re.I)
        ][:100]
        if result["http_status"] == 200 and "html" in content_type:
            result["outcome"] = "HTML_RETRIEVED"
        elif result["http_status"] == 200:
            result["outcome"] = "HTTP_200_NON_HTML"
        else:
            result["outcome"] = f"HTTP_{result['http_status']}"
    except urllib.error.HTTPError as exc:
        result["http_status"] = exc.code
        result["final_url"] = exc.geturl()
        result["outcome"] = f"HTTP_{exc.code}"
        result["error"] = str(exc)
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        result["outcome"] = "REQUEST_FAILED"
        result["error"] = str(exc)[:500]
    return result


def audit() -> dict[str, Any]:
    results = {name: fetch_page(url) for name, url in SOURCES.items()}
    return {
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "purpose": "Public NCS aggregate report access test only; no live job-listing crawl.",
        "sources": results,
        "summary": {
            name: {
                "outcome": item["outcome"],
                "http_status": item["http_status"],
                "bytes": item["bytes"],
                "table_count": item["table_count"],
                "final_url": item["final_url"],
                "redirected_to_root": item["route_redirected_to_root"],
                "script_count": len(item["script_sources"]),
            }
            for name, item in results.items()
        },
        "database_modified": False,
    }



STATE_REGISTRATION_FIELDS = (
    "source_state_label",
    "record_type",
    "fy_2015_16_registered",
    "fy_2016_17_registered",
    "fy_2017_18_registered",
    "fy_2018_19_registered",
    "fy_2019_20_registered",
    "ncs_dashboard_grand_total_registered",
    "reference_period",
    "source_page_url",
    "observed_at_utc",
    "source_page_data_freshness_label",
    "website_footer_last_updated_label",
    "semantics_note",
)

DASHBOARD_METRIC_FIELDS = (
    "metric_code",
    "display_label",
    "value_numeric",
    "display_value",
    "geography_scope",
    "observed_at_utc",
    "source_page_url",
    "source_page_data_freshness_label",
    "website_footer_last_updated_label",
    "freshness_status",
    "interpretation_note",
)



MAX_STATIC_ASSET_BYTES = 5_000_000
STATIC_ASSET_CANDIDATE_LIMIT = 40
DASHBOARD_JS_KEYWORDS = (
    "NCSReportDashboard",
    "Jobseeker Registered",
    "Active Jobseekers",
    "Active Employers",
    "Grand Total",
    "Vacancies",
    "Vacancy",
    "apiUrl",
    "apiUrls",
    "BASE_URL",
    "baseUrl",
    "dashboard-report",
    "dashboardReport",
    "allColumns",
    "columnBatches",
    "allTabData",
    "selectedBatchStart",
)


def extract_static_route_candidates(js_text: str) -> list[dict[str, str]]:
    """Inventory probable public API route strings from static JS without requesting them."""
    candidates: list[dict[str, str]] = []
    seen: set[str] = set()
    patterns = (
        r"""(?P<route>https?://[^"'\s<>\x60]+)""",
        r"""(?P<route>/?(?:api|apis|services|dashboard|report|reports|vacancy|jobseeker)[A-Za-z0-9_./?=&%{}:-]*(?:\.aspx|\.ashx|\.asmx|/|\?)[A-Za-z0-9_./?=&%{}:-]*)""",
        r"""(?P<route>/[A-Za-z0-9_./-]+\.(?:aspx|ashx|asmx)(?:\?[^"'\s<>\x60]*)?)""",
    )
    for pattern in patterns:
        for match in re.finditer(pattern, js_text, flags=re.I):
            route = match.group("route").rstrip("),;")
            if not route or route in seen:
                continue
            low = route.casefold()
            if not any(token in low for token in ("api", "vacan", "jobseek", "report", "dashboard", ".aspx", ".ashx", ".asmx")):
                continue
            seen.add(route)
            start = max(0, match.start() - 120)
            end = min(len(js_text), match.end() + 160)
            context = re.sub(r"\s+", " ", js_text[start:end]).strip()
            candidates.append({"route": route[:500], "context": context[:400]})
            if len(candidates) >= STATIC_ASSET_CANDIDATE_LIMIT:
                return candidates
    return candidates


def find_dashboard_keyword_contexts(js_text: str) -> list[dict[str, str]]:
    """Return small context excerpts for dashboard-specific labels/config identifiers."""
    results: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for keyword in DASHBOARD_JS_KEYWORDS:
        count = 0
        for match in re.finditer(re.escape(keyword), js_text, flags=re.I):
            start = max(0, match.start() - 180)
            end = min(len(js_text), match.end() + 280)
            context = re.sub(r"\s+", " ", js_text[start:end]).strip()
            key = (keyword, context)
            if key not in seen:
                results.append({"keyword": keyword, "context": context[:600]})
                seen.add(key)
            count += 1
            if count >= 6:
                break
    return results[:100]


def probe_dashboard_static_assets(source: dict[str, Any]) -> dict[str, Any]:
    """Fetch first-party JS bundles only; inventory endpoint-like strings, never call them."""
    base_url = str(source.get("final_url") or source.get("requested_url") or "")
    source_host = urlparse(base_url).hostname
    records: list[dict[str, Any]] = []
    for raw_url in source.get("script_sources", []):
        asset_url = urljoin(base_url, raw_url)
        parsed = urlparse(asset_url)
        if parsed.scheme != "https" or parsed.hostname != source_host:
            continue
        record: dict[str, Any] = {
            "asset_url": asset_url,
            "http_status": None,
            "bytes": 0,
            "sha256": None,
            "outcome": "",
            "route_candidate_count": 0,
            "route_candidates": [],
            "dashboard_keyword_contexts": [],
            "error": None,
        }
        try:
            req = urllib.request.Request(
                asset_url,
                headers={"User-Agent": "SHRAMIK-source-audit/1.0 (public JS endpoint inventory)", "Accept": "application/javascript,*/*"},
            )
            with urllib.request.urlopen(req, timeout=20) as response:
                body = response.read(MAX_STATIC_ASSET_BYTES + 1)
                record["http_status"] = getattr(response, "status", None)
                final_url = response.geturl()
                if urlparse(final_url).hostname != source_host:
                    record["outcome"] = "REJECTED_REDIRECT_TO_OTHER_HOST"
                    records.append(record)
                    continue
            if len(body) > MAX_STATIC_ASSET_BYTES:
                record["bytes"] = len(body)
                record["outcome"] = "REJECTED_ASSET_TOO_LARGE"
                records.append(record)
                continue
            record["bytes"] = len(body)
            record["sha256"] = hashlib.sha256(body).hexdigest()
            text = body.decode("utf-8", errors="replace")
            routes = extract_static_route_candidates(text)
            record["route_candidate_count"] = len(routes)
            record["route_candidates"] = routes
            record["dashboard_keyword_contexts"] = find_dashboard_keyword_contexts(text)
            record["outcome"] = "FIRST_PARTY_JS_SCANNED"
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
            record["outcome"] = "ASSET_FETCH_FAILED"
            record["error"] = str(exc)[:300]
        records.append(record)
    return {
        "scope": "First-party static JS from the public NCS dashboard only; candidate strings are not invoked.",
        "assets_scanned": len(records),
        "candidate_routes": sum(r["route_candidate_count"] for r in records),
        "assets": records,
        "database_modified": False,
    }

def _parse_count(value: str) -> int | None:
    cleaned = _clean_table_text(value).replace(",", "")
    if not cleaned or cleaned in ("-", "—", "–", "NA", "N/A"):
        return None
    if not cleaned.isdigit():
        return None
    return int(cleaned)


def _clean_table_text(value: Any) -> str:
    return re.sub(r"\s+", " ", "" if value is None else str(value)).strip()


def _extract_labeled_number(text: str, label: str) -> int | None:
    match = re.search(re.escape(label) + r"\s+([\d,]+)", text, flags=re.I)
    return _parse_count(match.group(1)) if match else None


def extract_dashboard_datasets(
    source: dict[str, Any],
    observed_at_utc: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    """Extract the public historical NCS jobseeker-registration table and KPI cards.

    Extraction is accepted only when the table headers match FY 2015-16 through 2019-20
    and the table's Grand Total agrees with the adjacent Jobseeker Registered headline.
    This is a platform registration measure, not worker supply and not vacancy demand.
    """
    matching_table = None
    for table in source.get("table_previews", []):
        rows = table.get("rows", [])
        if not rows:
            continue
        header = [_clean_table_text(x).replace("–", "-").upper() for x in rows[0]]
        expected = ["STATE", "2015-16", "2016-17", "2017-18", "2018-19", "2019-20", "GRAND TOTAL"]
        if header[:len(expected)] == expected:
            matching_table = rows
            break
    if matching_table is None:
        return [], [], {
            "statewise_registration_table_extracted": False,
            "reason": "Expected NCS state/year registration table headers were not found.",
        }

    visible_text = str(source.get("visible_text_excerpt", ""))
    headline_registered = _extract_labeled_number(visible_text, "Jobseeker Registered")
    active_jobseekers = _extract_labeled_number(visible_text, "Active Jobseekers")
    total_vacancies = _extract_labeled_number(visible_text, "Vacancies")
    active_employers = _extract_labeled_number(visible_text, "Active Employers")

    page_update_match = re.search(
        r"Last Updated on\s+(.{1,50}?)(?=\s+Jobseeker Details|\s+Jobseeker Registered|$)",
        visible_text, flags=re.I,
    )
    footer_update_match = re.search(
        r"Last updated:\s*(\d{1,2}-\d{1,2}-\d{2,4})",
        visible_text, flags=re.I,
    )
    page_update_label = _clean_table_text(page_update_match.group(1)) if page_update_match else ""
    footer_update_label = _clean_table_text(footer_update_match.group(1)) if footer_update_match else ""
    update_labels_conflict = bool(page_update_label and footer_update_label)

    grand_total_row = next(
        (row for row in matching_table[1:] if _clean_table_text(row[0]).casefold() == "grand total"),
        None,
    )
    table_total = _parse_count(grand_total_row[-1]) if grand_total_row and grand_total_row else None
    total_matches_headline = (
        headline_registered is not None and table_total is not None and headline_registered == table_total
    )

    state_rows: list[dict[str, Any]] = []
    for row in matching_table[1:]:
        if len(row) < 7:
            continue
        state_label = _clean_table_text(row[0])
        normalized = state_label.casefold()
        if normalized == "grand total":
            record_type = "TOTAL"
        elif normalized == "state not specified":
            record_type = "UNSPECIFIED_STATE"
        else:
            record_type = "STATE_UT"
        numbers = [_parse_count(cell) for cell in row[1:7]]
        state_rows.append({
            "source_state_label": state_label,
            "record_type": record_type,
            "fy_2015_16_registered": numbers[0],
            "fy_2016_17_registered": numbers[1],
            "fy_2017_18_registered": numbers[2],
            "fy_2018_19_registered": numbers[3],
            "fy_2019_20_registered": numbers[4],
            "ncs_dashboard_grand_total_registered": numbers[5],
            "reference_period": "FY 2015-16 to FY 2019-20 columns as shown; Grand Total period not separately specified",
            "source_page_url": str(source.get("final_url") or source.get("requested_url") or ""),
            "observed_at_utc": observed_at_utc,
            "source_page_data_freshness_label": page_update_label,
            "website_footer_last_updated_label": footer_update_label,
            "semantics_note": (
                "State-wise jobseeker registrations as inferred from the table placement and "
                "matching Grand Total against the NCS Dashboard 'Jobseeker Registered' headline. "
                "Platform registrations are not active jobseekers, employed workforce, or available labour supply."
            ),
        })

    freshness_status = (
        "CONFLICTING_PAGE_UPDATE_LABELS_REVIEW"
        if update_labels_conflict
        else "DATA_FRESHNESS_LABEL_NOT_FOUND"
        if not page_update_label and not footer_update_label
        else "LABELS_RECORDED_REVIEW_SOURCE_DEFINED_CADENCE"
    )
    kpis = [
        ("NCS_DASHBOARD_JOBSEEKERS_REGISTERED", "Jobseeker Registered", headline_registered,
         "Registration total on NCS platform; not active jobseekers or available workforce."),
        ("NCS_DASHBOARD_ACTIVE_JOBSEEKERS", "Active Jobseekers", active_jobseekers,
         "NCS platform's own active-jobseeker label; not a measure of employed workers or all available labour."),
        ("NCS_DASHBOARD_VACANCIES_LABELLED_TOTAL", "Vacancies", total_vacancies,
         "Displayed NCS dashboard label only; active-versus-cumulative semantics were not defined in the retrieved page."),
        ("NCS_DASHBOARD_ACTIVE_EMPLOYERS", "Active Employers", active_employers,
         "NCS platform employer metric; not a count of all employers in India."),
    ]
    metric_rows = [{
        "metric_code": code,
        "display_label": label,
        "value_numeric": value if value is not None else "",
        "display_value": f"{value:,}" if value is not None else "",
        "geography_scope": "NCS_PLATFORM_NATIONAL",
        "observed_at_utc": observed_at_utc,
        "source_page_url": str(source.get("final_url") or source.get("requested_url") or ""),
        "source_page_data_freshness_label": page_update_label,
        "website_footer_last_updated_label": footer_update_label,
        "freshness_status": freshness_status,
        "interpretation_note": note,
    } for code, label, value, note in kpis if value is not None]

    summary = {
        "statewise_registration_table_extracted": True,
        "statewise_table_rows_including_state_not_specified_and_total": len(state_rows),
        "state_rows_excluding_unspecified_and_total": sum(1 for row in state_rows if row["record_type"] == "STATE_UT"),
        "ncs_jobseeker_registered_headline": headline_registered,
        "statewise_table_grand_total": table_total,
        "table_grand_total_matches_jobseeker_registered_headline": total_matches_headline,
        "kpi_metrics_extracted": len(metric_rows),
        "source_page_data_freshness_label": page_update_label,
        "website_footer_last_updated_label": footer_update_label,
        "freshness_status": freshness_status,
        "dataset_interpretation": "NCS platform jobseeker registration context, never labour supply or vacancy demand.",
    }
    if not total_matches_headline:
        summary["acceptance_note"] = (
            "Table extraction was structurally successful, but its Grand Total did not match the "
            "Jobseeker Registered headline. Do not accept the semantic inference without review."
        )
    return state_rows, metric_rows, summary


def _write_csv(path: Path, rows: list[dict[str, Any]], fields: tuple[str, ...]) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows({field: row.get(field, "") for field in fields} for row in rows)
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("artifacts/ncs-vacancy-source-audit.json"))
    args = parser.parse_args()
    report = audit()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    observed_at = report["checked_at_utc"]
    dashboard = report["sources"].get("current_ncs_report_dashboard", {})
    state_rows, metric_rows, extracted_summary = extract_dashboard_datasets(dashboard, observed_at)
    report["extracted_datasets"] = extracted_summary
    report["static_asset_route_inventory"] = probe_dashboard_static_assets(dashboard)
    output_dir = args.output.parent
    output_hashes = {}
    if state_rows:
        state_csv = output_dir / "ncs_dashboard_statewise_jobseeker_registrations_fy2015_2020.csv"
        output_hashes[state_csv.name] = _write_csv(state_csv, state_rows, STATE_REGISTRATION_FIELDS)
    if metric_rows:
        metrics_csv = output_dir / "ncs_dashboard_kpi_snapshot_observed_2026-10-23.csv"
        output_hashes[metrics_csv.name] = _write_csv(metrics_csv, metric_rows, DASHBOARD_METRIC_FIELDS)
    report["extracted_dataset_file_sha256"] = output_hashes
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"source_summary": report["summary"], "extracted_datasets": extracted_summary, "csv_files": output_hashes}, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
