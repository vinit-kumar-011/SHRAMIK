"""Audit public NCS aggregate vacancy report availability without collecting live jobseeker data.

This probe requests one known, dated FY 2024-25 state report plus its parent directory URL.
It saves only compact response metadata and parsed aggregate table text for assessment.
It does not access authenticated pages, post credentials, write to a database, or crawl job listings.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("artifacts/ncs-vacancy-source-audit.json"))
    args = parser.parse_args()
    report = audit()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
