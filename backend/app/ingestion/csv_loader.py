"""Source-backed canonical CSV loader. Dry-run unless --apply is supplied."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.ingestion.db import get_engine
from app.ingestion.validation import validate_dataset_rows

PARSER_VERSION = "shramik-canonical-csv-v1"
TRANSFORMATION_VERSION = "shramik-canonical-normalizer-v1"
SOURCE_TYPES = {"DATASET", "REPORT", "WEB", "SURVEY", "OTHER"}


def _read_csv(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        raise FileNotFoundError(f"CSV file not found: {path}")
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("CSV has no header row.")
        return [dict(row) for row in reader]


def _check_references(conn: Connection, rows: list[dict[str, Any]]) -> None:
    states = {r[0] for r in conn.execute(text("SELECT id FROM public.states")).all()}
    districts = {r[0]: r[1] for r in conn.execute(
        text("SELECT id, state_id FROM public.districts")
    ).all()}
    sectors = {r[0] for r in conn.execute(text("SELECT id FROM public.sectors")).all()}
    skills = {r[0]: r[1] for r in conn.execute(
        text("SELECT id, sector_id FROM public.skills")
    ).all()}

    for line, row in enumerate(rows, start=2):
        if row["state_id"] not in states:
            raise ValueError(f"CSV row {line}: unknown state_id {row['state_id']!r}.")
        district_id = row.get("district_id")
        if district_id:
            if district_id not in districts:
                raise ValueError(f"CSV row {line}: unknown district_id {district_id!r}.")
            if districts[district_id] != row["state_id"]:
                raise ValueError(f"CSV row {line}: district does not belong to state_id.")
        sector_id, skill_id = row.get("sector_id"), row.get("skill_id")
        if sector_id and sector_id not in sectors:
            raise ValueError(f"CSV row {line}: unknown sector_id {sector_id!r}.")
        if skill_id and skill_id not in skills:
            raise ValueError(f"CSV row {line}: unknown skill_id {skill_id!r}.")
        if sector_id and skill_id and skills[skill_id][1] != sector_id:
            raise ValueError(
                f"CSV row {line}: sector_id differs from the current skills mapping. "
                "Review the mapping before loading this record."
            )


def _source_id(conn: Connection, *, name: str, publisher: str,
               url: str, source_type: str, years: list[int]) -> str:
    source = conn.execute(
        text("SELECT id, name, publisher, source_type FROM public.data_sources "
             "WHERE url = :url ORDER BY created_at DESC LIMIT 1"),
        {"url": url},
    ).mappings().first()
    if source:
        if (source["name"], source["publisher"], source["source_type"]) != (
            name, publisher, source_type
        ):
            raise ValueError(
                "This URL is already registered with different source metadata. "
                "Reconcile public.data_sources rather than overwriting it automatically."
            )
        return str(source["id"])
    return str(conn.execute(
        text("""
            INSERT INTO public.data_sources
                (name, source_type, publisher, url, accessed_at, coverage_start, coverage_end, notes)
            VALUES
                (:name, :source_type, :publisher, :url, now(), :start_year, :end_year,
                 'Registered by the SHRAMIK canonical CSV loader; verify grain in SOURCE_REGISTER.md.')
            RETURNING id
        """),
        {"name": name, "source_type": source_type, "publisher": publisher, "url": url,
         "start_year": min(years), "end_year": max(years)},
    ).scalar_one())


def _retrieval_id(conn: Connection, *, source_id: str, url: str, path: Path) -> str:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    found = conn.execute(
        text("""
            SELECT id FROM public.source_retrievals
            WHERE source_id = :source_id AND canonical_url = :url
              AND sha256_hash = :digest AND retrieval_status = 'SUCCESS'
            ORDER BY retrieved_at DESC LIMIT 1
        """),
        {"source_id": source_id, "url": url, "digest": digest},
    ).scalar()
    if found:
        return str(found)
    return str(conn.execute(
        text("""
            INSERT INTO public.source_retrievals
                (source_id, canonical_url, content_identifier, sha256_hash,
                 retrieval_status, parser_version, transformation_version, notes)
            VALUES
                (:source_id, :url, :path, :digest, 'SUCCESS', :parser, :transform, :notes)
            RETURNING id
        """),
        {
            "source_id": source_id, "url": url, "path": str(path.resolve()), "digest": digest,
            "parser": PARSER_VERSION, "transform": TRANSFORMATION_VERSION,
            "notes": (
                "SHA-256 covers the normalized CSV passed to this loader, not necessarily "
                "publisher-original bytes. Archive and hash the raw source separately when available."
            ),
        },
    ).scalar_one())


def _ensure_capabilities(
    conn: Connection, source_id: str, rows: list[dict[str, Any]], kind: str
) -> None:
    groups: dict[tuple[str, str, str, str], list[int]] = defaultdict(list)
    for row in rows:
        signal = row["demand_signal_type"] if kind == "demand" else row["supply_signal_type"]
        groups[(row["observation_grain"], signal, row["quantity_unit"],
                row["quantity_semantics"])].append(row["period_year"])
    for (grain, signal, unit, semantics), years in groups.items():
        found = conn.execute(text("""
            SELECT id FROM public.source_capabilities
            WHERE source_id = :source_id AND observation_grain = :grain
              AND signal_type = :signal AND unit = :unit
              AND flow_stock_semantics IS NOT DISTINCT FROM :semantics LIMIT 1
        """), {"source_id": source_id, "grain": grain, "signal": signal,
               "unit": unit, "semantics": semantics}).scalar()
        if found:
            continue
        conn.execute(text("""
            INSERT INTO public.source_capabilities
                (source_id, observation_grain, signal_type, unit, flow_stock_semantics,
                 coverage_start, coverage_end, geography_notes, occupation_notes)
            VALUES
                (:source_id, :grain, :signal, :unit, :semantics, :start_year, :end_year,
                 'Geography is limited to state IDs present in this normalized CSV.',
                 'Skill and sector dimensions are retained only where explicitly present.')
        """), {"source_id": source_id, "grain": grain, "signal": signal, "unit": unit,
               "semantics": semantics, "start_year": min(years), "end_year": max(years)})


def _observation_exists(conn: Connection, row: dict[str, Any], kind: str,
                        source_id: str) -> dict[str, Any] | None:
    table = "demand_observations" if kind == "demand" else "supply_observations"
    signal_col = "demand_signal_type" if kind == "demand" else "supply_signal_type"
    value_col = "demand_quantity" if kind == "demand" else row["measure"]
    return conn.execute(text(f"""
        SELECT {value_col}, quantity_unit, quantity_semantics, transformation_note
        FROM public.{table}
        WHERE state_id = :state_id AND district_id IS NOT DISTINCT FROM :district_id
          AND sector_id IS NOT DISTINCT FROM :sector_id
          AND skill_id IS NOT DISTINCT FROM :skill_id
          AND observation_grain = :grain AND period_type = 'YEAR'
          AND period_year = :year AND source_id = :source_id
          AND source_release IS NOT DISTINCT FROM :release
          AND {signal_col} = :signal AND provenance_state = 'SOURCE_BACKED'
        LIMIT 1
    """), {
        "state_id": row["state_id"], "district_id": row["district_id"],
        "sector_id": row["sector_id"], "skill_id": row["skill_id"],
        "grain": row["observation_grain"], "year": row["period_year"],
        "source_id": source_id, "release": row["source_release"],
        "signal": row[signal_col],
    }).mappings().first()


def _insert_row(conn: Connection, row: dict[str, Any], kind: str,
                source_id: str, retrieval_id: str) -> None:
    shared = {
        "state_id": row["state_id"], "district_id": row["district_id"],
        "sector_id": row["sector_id"], "skill_id": row["skill_id"],
        "grain": row["observation_grain"], "year": row["period_year"],
        "unit": row["quantity_unit"], "semantics": row["quantity_semantics"],
        "source_id": source_id, "release": row["source_release"],
        "source_date": row["source_date"], "retrieval_id": retrieval_id,
        "note": row["transformation_note"],
    }
    if kind == "demand":
        conn.execute(text("""
            INSERT INTO public.demand_observations
                (state_id, district_id, sector_id, skill_id, observation_grain, period_type,
                 period_year, demand_quantity, quantity_unit, quantity_semantics,
                 demand_signal_type, source_id, source_release, source_date, retrieval_id,
                 provenance_state, is_synthetic, generation_run_id, transformation_note)
            VALUES
                (:state_id, :district_id, :sector_id, :skill_id, :grain, 'YEAR', :year,
                 :value, :unit, :semantics, :signal, :source_id, :release, :source_date,
                 :retrieval_id, 'SOURCE_BACKED', FALSE, NULL, :note)
        """), {**shared, "value": row["demand_quantity"],
               "signal": row["demand_signal_type"]})
        return

    measure = row["measure"]
    measure_columns = ("supply_quantity", "training_capacity", "enrollment", "completions")
    value_slots = {column: (":value" if column == measure else "NULL")
                   for column in measure_columns}
    conn.execute(text(f"""
        INSERT INTO public.supply_observations
            (state_id, district_id, sector_id, skill_id, observation_grain, period_type,
             period_year, supply_quantity, training_capacity, enrollment, completions,
             quantity_unit, quantity_semantics, supply_signal_type, source_id, source_release,
             source_date, retrieval_id, provenance_state, is_synthetic, generation_run_id,
             transformation_note)
        VALUES
            (:state_id, :district_id, :sector_id, :skill_id, :grain, 'YEAR', :year,
             {value_slots['supply_quantity']}, {value_slots['training_capacity']},
             {value_slots['enrollment']}, {value_slots['completions']}, :unit, :semantics,
             :signal, :source_id, :release, :source_date, :retrieval_id, 'SOURCE_BACKED',
             FALSE, NULL, :note)
    """), {**shared, "value": row["value"], "signal": row["supply_signal_type"]})


def ingest_csv(*, path: Path, kind: str, source_name: str, publisher: str,
               source_url: str, source_type: str, apply: bool) -> dict[str, Any]:
    parsed = urlparse(source_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("source-url must be a complete HTTP(S) URL.")
    if source_type not in SOURCE_TYPES:
        raise ValueError(f"source-type must be one of {sorted(SOURCE_TYPES)}.")
    if not source_name.strip() or not publisher.strip():
        raise ValueError("source-name and publisher are required.")

    rows = validate_dataset_rows(_read_csv(path), kind)
    engine = get_engine()
    try:
        with engine.begin() as conn:
            _check_references(conn, rows)
            result: dict[str, Any] = {
                "mode": "APPLY" if apply else "DRY_RUN", "kind": kind,
                "input_file": str(path.resolve()), "rows_validated": len(rows),
                "period_years": sorted({r["period_year"] for r in rows}),
                "grains": sorted({r["observation_grain"] for r in rows}),
                "source_url": source_url, "writes_performed": False,
            }
            if not apply:
                result["message"] = "Validation passed; no database writes. Add --apply to ingest."
                return result

            source_id = _source_id(conn, name=source_name, publisher=publisher,
                                   url=source_url, source_type=source_type,
                                   years=[r["period_year"] for r in rows])
            retrieval_id = _retrieval_id(conn, source_id=source_id, url=source_url, path=path)
            _ensure_capabilities(conn, source_id, rows, kind)
            inserted = unchanged = 0
            for row in rows:
                current = _observation_exists(conn, row, kind, source_id)
                measure_col = "demand_quantity" if kind == "demand" else row["measure"]
                value = row["demand_quantity"] if kind == "demand" else row["value"]
                if current:
                    is_same = (
                        current[measure_col] is not None
                        and str(current[measure_col]) == str(value)
                        and current["quantity_unit"] == row["quantity_unit"]
                        and current["quantity_semantics"] == row["quantity_semantics"]
                        and current["transformation_note"] == row["transformation_note"]
                    )
                    if is_same:
                        unchanged += 1
                        continue
                    raise ValueError(
                        f"Conflicting source-backed row exists for year {row['period_year']} "
                        f"and signal {row.get('demand_signal_type') or row.get('supply_signal_type')!r}; "
                        "review the source release rather than silently duplicating or replacing it."
                    )
                _insert_row(conn, row, kind, source_id, retrieval_id)
                inserted += 1

            result.update({
                "source_id": source_id, "retrieval_id": retrieval_id,
                "rows_inserted": inserted, "rows_unchanged": unchanged,
                "writes_performed": True, "message": "Ingestion transaction completed.",
            })
            return result
    finally:
        engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kind", choices=("demand", "supply"), required=True)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--source-name", required=True)
    parser.add_argument("--publisher", required=True)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--source-type", choices=sorted(SOURCE_TYPES), required=True)
    parser.add_argument("--apply", action="store_true",
                        help="Write rows. Without this flag the command only validates.")
    args = parser.parse_args()
    result = ingest_csv(path=args.input, kind=args.kind, source_name=args.source_name,
                        publisher=args.publisher, source_url=args.source_url,
                        source_type=args.source_type, apply=args.apply)
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
