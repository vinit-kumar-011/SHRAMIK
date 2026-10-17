#!/usr/bin/env python3
"""Generate review-only CTS trade -> NCO occupation candidates.

Similarity scores are prioritization aids, not evidence of equivalence. Every row
remains pending review; this script does not approve or write taxonomy mappings.
"""
from __future__ import annotations

import argparse
import csv
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path


def normalize_title(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"\bNSQF\b", " ", value, flags=re.IGNORECASE)
    value = value.casefold().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def score_titles(left: str, right: str) -> int:
    a, b = normalize_title(left), normalize_title(right)
    if not a or not b:
        return 0
    if a == b:
        return 100
    sequence = SequenceMatcher(None, a, b).ratio()
    at, bt = set(a.split()), set(b.split())
    token_jaccard = len(at & bt) / len(at | bt) if at | bt else 0.0
    return round(100 * (0.65 * sequence + 0.35 * token_jaccard))


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def make_candidates(
    cts_rows: list[dict[str, str]],
    nco_rows: list[dict[str, str]],
    top_k: int = 5,
    min_score: int = 25,
) -> list[dict[str, str]]:
    if top_k < 1 or not 0 <= min_score <= 100:
        raise ValueError("top_k must be >= 1 and min_score must be between 0 and 100.")

    by_trade: dict[str, int] = {}
    for row in cts_rows:
        trade = (row.get("trade_name_source") or "").strip()
        if not trade:
            continue
        try:
            occurrences = int(row.get("occurrences") or "1")
        except ValueError:
            occurrences = 1
        by_trade[trade] = max(by_trade.get(trade, 0), occurrences)

    catalogue = []
    for row in nco_rows:
        code = (row.get("nco_code") or "").strip()
        title = (row.get("occupation_title") or "").strip()
        if code and title:
            catalogue.append(row)

    output: list[dict[str, str]] = []
    for trade, occurrences in sorted(by_trade.items(), key=lambda item: item[0].casefold()):
        ranked = sorted(
            ((score_titles(trade, row["occupation_title"]), row) for row in catalogue),
            key=lambda item: (-item[0], item[1]["nco_code"]),
        )
        selected = [(score, row) for score, row in ranked if score >= min_score][:top_k]
        if not selected:
            output.append({
                "trade_name_source": trade, "source_occurrences": str(occurrences),
                "candidate_rank": "", "nco_code": "", "occupation_title": "",
                "division": "", "sub_division": "", "occupation_group": "",
                "occupation_family": "", "similarity_score": "0",
                "match_type": "NO_CANDIDATE", "review_status": "PENDING_REVIEW",
                "approved_mapping_method": "", "approved_mapping_confidence": "",
                "reviewer": "", "reviewed_at": "", "review_note": "",
            })
            continue

        for rank, (score, row) in enumerate(selected, start=1):
            exact = normalize_title(trade) == normalize_title(row["occupation_title"])
            match_type = "EXACT_NORMALIZED" if exact else (
                "HIGH_SUGGESTION" if score >= 75 else
                "MEDIUM_SUGGESTION" if score >= 50 else
                "LOW_SUGGESTION"
            )
            output.append({
                "trade_name_source": trade,
                "source_occurrences": str(occurrences),
                "candidate_rank": str(rank),
                "nco_code": row["nco_code"],
                "occupation_title": row["occupation_title"],
                "division": row.get("division", ""),
                "sub_division": row.get("sub_division", ""),
                "occupation_group": row.get("occupation_group", ""),
                "occupation_family": row.get("occupation_family", ""),
                "similarity_score": str(score),
                "match_type": match_type,
                "review_status": "PENDING_REVIEW",
                "approved_mapping_method": "",
                "approved_mapping_confidence": "",
                "reviewer": "",
                "reviewed_at": "",
                "review_note": "",
            })
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cts-csv", type=Path, required=True,
                        help="CSV with trade_name_source and optional occurrences columns.")
    parser.add_argument("--nco-csv", type=Path, default=Path("data/raw/nco_2015_occupations.csv"))
    parser.add_argument("--output", type=Path, default=Path("data/processed/cts_nco_2015_candidates.csv"))
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--min-score", type=int, default=25)
    args = parser.parse_args()
    try:
        cts_rows, nco_rows = load_rows(args.cts_csv), load_rows(args.nco_csv)
        if not cts_rows or "trade_name_source" not in cts_rows[0]:
            raise ValueError("CTS CSV must include trade_name_source and at least one data row.")
        required = {"nco_code", "occupation_title"}
        if not nco_rows or not required <= set(nco_rows[0]):
            raise ValueError("NCO CSV must contain nco_code and occupation_title columns.")
        output = make_candidates(cts_rows, nco_rows, args.top_k, args.min_score)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        fields = [
            "trade_name_source", "source_occurrences", "candidate_rank", "nco_code",
            "occupation_title", "division", "sub_division", "occupation_group",
            "occupation_family", "similarity_score", "match_type", "review_status",
            "approved_mapping_method", "approved_mapping_confidence", "reviewer",
            "reviewed_at", "review_note",
        ]
        with args.output.open("w", newline="", encoding="utf-8-sig") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(output)
        unique_trades = len({r["trade_name_source"] for r in output})
        print(f"Wrote {len(output)} review rows covering {unique_trades} CTS trade names: {args.output}")
        print("All rows remain PENDING_REVIEW; no mappings were auto-approved.")
        return 0
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
