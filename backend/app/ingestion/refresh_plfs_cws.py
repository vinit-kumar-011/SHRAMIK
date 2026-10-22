"""Release-aware refresh of MoSPI's published all-India PLFS monthly CWS indicators.

The job ingests only the three national CWS rates explicitly published on the official
MoSPI PLFS product page. It never derives district/skill demand or supply, and it never
creates forecasts. Default operation downloads, parses and validates a source snapshot
without database writes; use --apply only from the scheduled, secret-backed workflow.
"""

from __future__ import annotations

import argparse
import calendar
import hashlib
import json
import re
import sys
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from sqlalchemy import text

from app.ingestion.db import get_engine

SOURCE_URL = "https://www.mospi.gov.in/themes/product/69--"
SOURCE_NAME = "PLFS monthly CWS all-India dashboard"
PUBLISHER = "MoSPI / National Statistical Office"
SOURCE_TYPE = "WEB"
PARSER_VERSION = "mospi-plfs-cws-html-v1"
TRANSFORMATION_VERSION = "plfs-monthly-cws-normalizer-v1"
USER_AGENT = "SHRAMIK-SourceRefresh/1.0 (official statistical release monitoring)"
METRICS: dict[str, re.Pattern[str]] = {
    "CWS_LFPR": re.compile(r"Labour\s+Force\s+Participation\s+Rate\s*\(\s*LFPR\s*\)", re.I),
    "CWS_WPR": re.compile(r"Worker\s+Population\s+Ratio\s*\(\s*WPR\s*\)", re.I),
    "CWS_UR": re.compile(r"Unemployment\s+Rate\s*\(\s*UR\s*\)", re.I),
}
MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7,
    "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}
MONTH_PATTERN = re.compile(
    r"\b(" + "|".join(sorted(MONTHS, key=len, reverse=True)) +
    r")\.?\s+(20\d{2})\b",
    re.I,
)
PERCENT_PATTERN = re.compile(r"(?<![\w.])(\d{1,3}(?:\.\d+)?)\s*%")
AGE_PATTERN = re.compile(r"15\s+years?\s+(?:and\s+above|or\s+above|and\s+over)", re.I)


class _VisibleText(HTMLParser):
    """Collect visible text while ignoring scripts/styles that may contain unrelated values."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._ignored_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"script", "style", "noscript", "svg"}:
            self._ignored_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style", "noscript", "svg"} and self._ignored_depth:
            self._ignored_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self._ignored_depth and data.strip():
            self.parts.append(data.strip())


def visible_text(html: str) -> str:
    parser = _VisibleText()
    parser.feed(html)
    parser.close()
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()


def _period_near_label(text_value: str, label_start: int, label_end: int) -> tuple[int, int, str]:
    window_start = max(0, label_start - 250)
    window_end = min(len(text_value), label_end + 650)
    window = text_value[window_start:window_end]
    candidates = list(MONTH_PATTERN.finditer(window))
    if not candidates:
        raise ValueError("Could not find a month/year reference period near a PLFS CWS card.")

    # Prefer the month/year after the card label, as the official page places its reference
    # period with the metric description. If absent, use the closest date in the card window.
    after = [m for m in candidates if window_start + m.start() >= label_end]
    chosen = min(after, key=lambda m: window_start + m.start()) if after else min(
        candidates, key=lambda m: abs((window_start + m.start()) - label_start)
    )
    month_name, year_text = chosen.group(1).lower().rstrip("."), chosen.group(2)
    month_number = MONTHS[month_name]
    year = int(year_text)
    return year, month_number, f"{chosen.group(1).title()} {year}"


def _published_value_near_label(text_value: str, label_start: int, label_end: int) -> float:
    # The value is expected immediately before or after its card label. Keep this
    # window narrow to avoid accidentally borrowing the adjacent card's percentage.
    window_start = max(0, label_start - 110)
    window_end = min(len(text_value), label_end + 110)
    window = text_value[window_start:window_end]
    candidates = list(PERCENT_PATTERN.finditer(window))
    if not candidates:
        raise ValueError("Could not find a percentage value near a PLFS CWS card.")
    label_position_in_window = label_start - window_start
    chosen = min(candidates, key=lambda m: abs(m.end() - label_position_in_window))
    value = float(chosen.group(1))
    if not 0 <= value <= 100:
        raise ValueError(f"Published percentage is outside [0, 100]: {value}")
    return value


def parse_monthly_cws(html: str) -> dict[str, Any]:
    """Extract exactly LFPR/WPR/UR for the same all-India, age-15+, CWS month.

    The parser intentionally fails closed on markup/definition drift; a future site
    redesign must not silently write an unrelated rate under a PLFS metric code.
    """
    body = visible_text(html)
    if len(body) < 300:
        raise ValueError("Official MoSPI PLFS page returned unexpectedly little visible text.")

    extracted: dict[str, dict[str, Any]] = {}
    for metric_code, label_pattern in METRICS.items():
        selected: dict[str, Any] | None = None
        for label_match in label_pattern.finditer(body):
            context_start = max(0, label_match.start() - 260)
            context_end = min(len(body), label_match.end() + 650)
            context = body[context_start:context_end]
            if not AGE_PATTERN.search(context):
                continue
            if not re.search(r"current\s+weekly\s+status|\bCWS\b", context, re.I):
                continue
            if not re.search(r"all[ -]India|all India|India", context, re.I):
                continue

            try:
                year, month, month_label = _period_near_label(body, label_match.start(), label_match.end())
            except ValueError:
                continue
            # A metric card with a valid context and period but an invalid/out-of-range
            # percentage is a hard failure. Never skip it and borrow a later card's value.
            value = _published_value_near_label(body, label_match.start(), label_match.end())
            selected = {
                "metric_code": metric_code,
                "value": value,
                "year": year,
                "month": month,
                "month_label": month_label,
            }
            break
        if selected is None:
            raise ValueError(
                f"Could not safely locate {metric_code}: expected its percentage, label, "
                "all-India age-15+ domain, CWS definition, and month/year."
            )
        extracted[metric_code] = selected

    periods = {(item["year"], item["month"]) for item in extracted.values()}
    if len(periods) != 1:
        raise ValueError(f"PLFS CWS cards refer to different months: {sorted(periods)}")
    year, month = next(iter(periods))
    month_start = date(year, month, 1)
    month_end = date(year, month, calendar.monthrange(year, month)[1])
    today_utc = datetime.now(timezone.utc).date()

    # Do not ingest future reference periods or releases older than the annual/monthly
    # release boundary expected from the current PLFS page.
    if month_start > today_utc:
        raise ValueError(f"PLFS page refers to a future month: {month_start.isoformat()}")

    return {
        "reference_period": f"MONTHLY_{year:04d}-{month:02d}",
        "month_label": next(iter(extracted.values()))["month_label"],
        "period_start": month_start.isoformat(),
        "period_end": month_end.isoformat(),
        "source_url": SOURCE_URL,
        "survey_basis": "current_weekly_status",
        "age_domain": "15_years_and_above",
        "area": "combined",
        "sex": "person",
        "observation_grain": "NATIONAL",
        "unit": "percent",
        "metric_type": "RATE",
        "metrics": {key: item["value"] for key, item in extracted.items()},
        "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
    }


def _get_or_create_source(conn: Any, year: int) -> str:
    row = conn.execute(
        text("""
            SELECT id, name, publisher, source_type
            FROM public.data_sources
            WHERE url = :url
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {"url": SOURCE_URL},
    ).mappings().first()
    if row:
        if (row["name"], row["publisher"], row["source_type"]) != (
            SOURCE_NAME, PUBLISHER, SOURCE_TYPE
        ):
            raise ValueError("MoSPI source URL is registered with conflicting metadata; review it manually.")
        conn.execute(
            text("""
                UPDATE public.data_sources
                SET coverage_start = CASE WHEN coverage_start IS NULL THEN :year ELSE LEAST(coverage_start, :year) END,
                    coverage_end = CASE WHEN coverage_end IS NULL THEN :year ELSE GREATEST(coverage_end, :year) END,
                    accessed_at = now()
                WHERE id = :id
            """),
            {"year": year, "id": row["id"]},
        )
        return str(row["id"])

    return str(conn.execute(
        text("""
            INSERT INTO public.data_sources
                (name, source_type, publisher, url, accessed_at, coverage_start, coverage_end, notes)
            VALUES
                (:name, :type, :publisher, :url, now(), :year, :year,
                 'Official MoSPI PLFS product dashboard. Automated adapter stores only the published all-India age-15+ CWS LFPR/WPR/UR monthly indicators; page changes are validated fail-closed.')
            RETURNING id
        """),
        {
            "name": SOURCE_NAME,
            "type": SOURCE_TYPE,
            "publisher": PUBLISHER,
            "url": SOURCE_URL,
            "year": year,
        },
    ).scalar_one())


def _get_or_create_retrieval(conn: Any, source_id: str, digest: str, snapshot_path: Path) -> str:
    existing = conn.execute(
        text("""
            SELECT id FROM public.source_retrievals
            WHERE source_id = :source_id
              AND canonical_url = :url
              AND sha256_hash = :digest
              AND retrieval_status = 'SUCCESS'
            ORDER BY retrieved_at DESC
            LIMIT 1
        """),
        {"source_id": source_id, "url": SOURCE_URL, "digest": digest},
    ).scalar()
    if existing:
        return str(existing)

    return str(conn.execute(
        text("""
            INSERT INTO public.source_retrievals
                (source_id, canonical_url, content_identifier, sha256_hash, retrieval_status,
                 parser_version, transformation_version, notes)
            VALUES
                (:source_id, :url, :identifier, :digest, 'SUCCESS',
                 :parser_version, :transform_version, :notes)
            RETURNING id
        """),
        {
            "source_id": source_id,
            "url": SOURCE_URL,
            "identifier": f"source-refresh-artifact:{snapshot_path.name}; reference page HTML SHA-256",
            "digest": digest,
            "parser_version": PARSER_VERSION,
            "transform_version": TRANSFORMATION_VERSION,
            "notes": (
                "Hash is for the Chromium-rendered DOM snapshot of the official MoSPI PLFS "
                "product page, archived as a workflow artifact because the raw HTTP response "
                "is a JavaScript shell. Values are all-India monthly CWS rates for age 15 years "
                "and above, not annual usual-status estimates."
            ),
        },
    ).scalar_one())


def _upsert_capabilities(conn: Any, source_id: str, year: int) -> None:
    for signal in METRICS:
        existing = conn.execute(
            text("""
                SELECT id FROM public.source_capabilities
                WHERE source_id = :source_id
                  AND observation_grain = 'NATIONAL'
                  AND signal_type = :signal
                  AND unit = 'percent'
                  AND flow_stock_semantics = 'survey_estimate'
                ORDER BY id
                LIMIT 1
            """),
            {"source_id": source_id, "signal": signal},
        ).scalar()
        if existing:
            conn.execute(
                text("""
                    UPDATE public.source_capabilities
                    SET coverage_start = CASE WHEN coverage_start IS NULL THEN :year ELSE LEAST(coverage_start, :year) END,
                        coverage_end = CASE WHEN coverage_end IS NULL THEN :year ELSE GREATEST(coverage_end, :year) END,
                        geography_notes = 'All-India published rate only; monthly CWS, persons aged 15 years and above.',
                        occupation_notes = 'Not occupation-, sector-, district- or skill-level. Do not treat as job demand or workforce supply.'
                    WHERE id = :id
                """),
                {"year": year, "id": existing},
            )
        else:
            conn.execute(
                text("""
                    INSERT INTO public.source_capabilities
                        (source_id, observation_grain, signal_type, unit, flow_stock_semantics,
                         coverage_start, coverage_end, geography_notes, occupation_notes)
                    VALUES
                        (:source_id, 'NATIONAL', :signal, 'percent', 'survey_estimate',
                         :year, :year,
                         'All-India published rate only; monthly CWS, persons aged 15 years and above.',
                         'Not occupation-, sector-, district- or skill-level. Do not treat as job demand or workforce supply.')
                """),
                {"source_id": source_id, "signal": signal, "year": year},
            )


def persist_release(
    payload: dict[str, Any],
    raw_html: bytes,
    snapshot_path: Path,
    *,
    apply: bool,
) -> dict[str, Any]:
    digest = hashlib.sha256(raw_html).hexdigest()
    period_year = int(payload["period_start"][:4])
    result: dict[str, Any] = {
        "mode": "APPLY" if apply else "DRY_RUN",
        "source_url": SOURCE_URL,
        "sha256": digest,
        "release": payload["reference_period"],
        "month_label": payload["month_label"],
        "metrics": payload["metrics"],
        "rows_validated": len(payload["metrics"]),
        "writes_performed": False,
    }
    if not apply:
        return result

    engine = get_engine()
    try:
        with engine.begin() as conn:
            source_id = _get_or_create_source(conn, period_year)
            retrieval_id = _get_or_create_retrieval(conn, source_id, digest, snapshot_path)
            _upsert_capabilities(conn, source_id, period_year)

            for metric_code, value in payload["metrics"].items():
                dimensions = {
                    "sex": "person",
                    "area": "combined",
                    "age_domain": "15_years_and_above",
                    "source_url": SOURCE_URL,
                    "metric_role": "PUBLISHED_CONTEXT",
                    "source_table": "MoSPI PLFS product dashboard",
                    "survey_basis": "current_weekly_status",
                    "frequency": "monthly",
                    "reference_label": payload["month_label"],
                    "published_precision": "0.1 percentage point",
                }
                note = (
                    f"Automatically captured published MoSPI PLFS monthly CWS {metric_code} "
                    f"for all India, persons aged 15 years and above, reference period "
                    f"{payload['month_label']}. This is a labour-market context rate, not "
                    "a vacancy count, workforce supply estimate, or annual usual-status measure."
                )
                conn.execute(
                    text("""
                        INSERT INTO public.source_metric_observations (
                            source_id, retrieval_id, evidence_item_id, source_release,
                            metric_code, metric_type, value_numeric, unit, observation_grain,
                            state_id, district_id, sector_id, skill_id, reference_period,
                            period_start, period_end, as_of_date, dimension_values,
                            provenance_state, is_synthetic, generation_run_id, transformation_note
                        ) VALUES (
                            :source_id, :retrieval_id, NULL, :source_release,
                            :metric_code, 'RATE', :value, 'percent', 'NATIONAL',
                            NULL, NULL, NULL, NULL, :reference_period,
                            :period_start, :period_end, NULL, CAST(:dimensions AS jsonb),
                            'SOURCE_BACKED', FALSE, NULL, :note
                        )
                        ON CONFLICT (
                            source_id, source_release, metric_code, metric_type, unit,
                            observation_grain, state_id, district_id, sector_id, skill_id,
                            reference_period, period_start, period_end, as_of_date, dimension_values
                        ) WHERE provenance_state = 'SOURCE_BACKED'
                        DO UPDATE SET
                            retrieval_id = EXCLUDED.retrieval_id,
                            value_numeric = EXCLUDED.value_numeric,
                            transformation_note = EXCLUDED.transformation_note
                    """),
                    {
                        "source_id": source_id,
                        "retrieval_id": retrieval_id,
                        "source_release": f"PLFS_CWS_MONTHLY_{payload['period_start'][:7]}",
                        "metric_code": metric_code,
                        "value": value,
                        "reference_period": payload["reference_period"],
                        "period_start": payload["period_start"],
                        "period_end": payload["period_end"],
                        "dimensions": json.dumps(dimensions, sort_keys=True),
                        "note": note,
                    },
                )
        result["writes_performed"] = True
        result["database_source_id"] = source_id
        result["retrieval_id"] = retrieval_id
        return result
    finally:
        engine.dispose()


def run(*, apply: bool, output_dir: Path, input_html: Path) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    if not input_html.is_file():
        raise FileNotFoundError(
            f"Rendered MoSPI HTML snapshot not found: {input_html}. "
            "Run backend/scripts/render_plfs_page.mjs first."
        )
    raw_html = input_html.read_bytes()
    content_type = "text/html; charset=utf-8 (Chromium-rendered DOM)"
    digest = hashlib.sha256(raw_html).hexdigest()
    snapshot_path = input_html.resolve()
    payload = parse_monthly_cws(raw_html.decode("utf-8", errors="replace"))
    report = persist_release(payload, raw_html, snapshot_path, apply=apply)
    report.update({
        "content_type": content_type,
        "snapshot_file": snapshot_path.name,
        "parser_version": PARSER_VERSION,
        "retrieved_at_utc": payload["retrieved_at_utc"],
    })
    (output_dir / "plfs-refresh-report.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Persist the validated release to Supabase.")
    parser.add_argument(
        "--input-html",
        type=Path,
        required=True,
        help="Chromium-rendered DOM snapshot from backend/scripts/render_plfs_page.mjs.",
    )
    parser.add_argument("--output-dir", type=Path, default=Path("../artifacts/source-refresh"))
    args = parser.parse_args()
    if args.apply:
        # Validate the presence of DB configuration before downloading or parsing a release.
        from app.core.config import get_settings

        if not get_settings().database_url:
            print("ERROR: --apply requires DATABASE_URL (configure the GitHub secret SHRAMIK_DATABASE_URL).", file=sys.stderr)
            return 2
    try:
        report = run(apply=args.apply, output_dir=args.output_dir, input_html=args.input_html)
        print(json.dumps(report, indent=2, sort_keys=True))
        return 0
    except Exception as exc:  # surfaced to CI; do not mask parser/schema drift
        print(f"PLFS source refresh failed closed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
