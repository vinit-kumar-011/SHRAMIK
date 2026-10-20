# CTS seat matrix → canonical supply CSV

Turns the staged DGT CTS seat matrix (`stg_dgt_cts_seat_matrix`, one row per ITI × trade ×
academic session) into a **canonical supply CSV** for the importer from PR #60
(`backend/app/ingestion/canonical_csv.py`, `scripts.ingest_canonical_observations`).
This adapter never writes to the database. Validation, idempotency and the guarded write all stay
in #60's importer, so there is one write path.

| File | Who runs it | What it does |
|---|---|---|
| `scripts/sql/cts_seat_supply_export.sql` | anyone, in the SQL Editor | Read-only SELECT. Its result is the supply CSV, with exactly #60's columns. |
| `scripts/sql/cts_seat_supply_gaps.sql` | anyone, in the SQL Editor | Read-only. Lists every left-out seat row by reason, biggest first. |
| `tests/test_cts_seat_supply_sql.py` | CI | The export's columns equal #60's required supply columns; both files stay read-only. |

## How to use it

1. Run `cts_seat_supply_export.sql` in the SQL Editor and download the result as CSV
   (for example `data/processed/cts_supply_2026.csv`; it is not committed).
2. From `backend/`, validate it read-only with #60's importer:
   `python -m scripts.ingest_canonical_observations --supply-csv ../data/processed/cts_supply_2026.csv --demand-csv <demand csv> --output-json ../data/processed/ingestion-validation.json`
3. Writes follow #60's runbook: non-production database first, `--write` plus `--confirm-db-host`.

## Mapping rules (nothing is guessed)

| Step | Rule | If it fails (gaps report) |
|---|---|---|
| District | `source_geography_mappings`, `source_code_system = 'DGT_CTS_DISTRICT_LABEL'`, key `UPPER(TRIM(state))::UPPER(TRIM(district))`, confidence HIGH or MEDIUM, exactly one district | `DISTRICT_NOT_MAPPED` / `DISTRICT_AMBIGUOUS` |
| State check | `DGT_CTS_STATE_LABEL` mapping of the state label must equal the district mapping's state | `STATE_MISMATCH` |
| Trade → skill | `skill_taxonomy_mappings`, `taxonomy_name = 'DGT_CTS_TRADE'`, `taxonomy_code` = trimmed source trade label, method `OFFICIAL_CROSSWALK` or `MANUAL`, confidence HIGH or MEDIUM, exactly one skill, skill active | `TRADE_NOT_MAPPED` / `TRADE_MAPS_TO_MANY` / `SKILL_INACTIVE` |
| Source | row must have `source_retrieval_id`; `source_id` comes from that retrieval; one retrieval per output row | `NO_SOURCE_RETRIEVAL` |
| Capability | the same test as #60's `validate_source_capabilities`: exactly one `source_capabilities` row for (source, `CTS_PROVISIONAL_SEAT_CAPACITY`, `DISTRICT_SECTOR_SKILL`), and that row has unit `seats`, covers the state and the year | `CAPABILITY_NOT_REGISTERED` |

Several trades may map to one skill (their seats add up). One trade may not map to several
skills, because that would count the same seats twice.

## What each CSV row contains

| Column | Value |
|---|---|
| grain / period | `DISTRICT_SECTOR_SKILL`, `YEAR`, `period_year = academic_session` |
| `sector_id` | the skill's own `skills.sector_id` (a lookup, not a redistribution). This is the grain #60's pipeline reads. |
| `training_capacity` | `SUM(provisional_seat_capacity)` |
| `supply_quantity`, `enrollment`, `completions` | empty (seats are none of these) |
| `unit` / `quantity_semantics` | `seats` / `CAPACITY` |
| `flow_stock_semantics` | copied from the registered capability, so it always matches |
| `supply_signal_type` | `CTS_PROVISIONAL_SEAT_CAPACITY` |
| provenance | `SOURCE_BACKED`, `is_synthetic = false`, `source_id`, `retrieval_id`, `source_date = publication_date`, no `generation_run_id` |
| `source_release` | e.g. `PROVISIONAL as of 2026-07-08` |
| `transformation_note` | row count, ITI count, trade labels, mapping ids, district-mapping method/confidence |

#60's forecast engine uses only `supply_quantity`, so these rows are stored as a capacity measure and
do not become "current supply" in forecasts. That is intended.

## Capability the database owner must register (proposal)

The export returns 0 rows until this exists. Values to review:

| source_capabilities column | Proposed value |
|---|---|
| `source_id` | `7abbec65-2612-4564-a837-5691a058a91b` (DGT CTS-2026 provisional dynamic seat matrix) |
| `signal_type` | `CTS_PROVISIONAL_SEAT_CAPACITY` |
| `observation_grain` | `DISTRICT_SECTOR_SKILL` |
| `unit` | `seats` |
| `flow_stock_semantics` | `ANNUAL_TRAINING_CAPACITY` (or whatever wording the registry uses for capacity) |
| `state_scope` | `NATIONAL` |
| `coverage_start` / `coverage_end` | `2026` / `2026` |

## Known limits (state them in the demo)

- The staged matrix covers **one academic session (2026), PROVISIONAL**: 29,372 rows,
  685 district labels, 151 trades, 973,058 seats (checked 2026-10-20). One year is below
  `MIN_FORECAST_HISTORY = 3`, so official forecasts from this signal return INSUFFICIENT_DATA.
  It fully supports a current-capacity view.
- Capacity is not completions. A capacity-vs-vacancy comparison is gap-ineligible
  (`INCOMPATIBLE_FLOW_STOCK`). The slide's supply formula (seats × fill × certification) needs
  fill and pass rates from another source; this adapter supplies the seats term only.
- District links are `INFERRED / MEDIUM`; the note on every row says so.
- As of 2026-10-20 there are **no** `DGT_CTS_TRADE` mappings, all 7 pilot skills are inactive and
  no capability is registered, so the export correctly returns 0 rows. The gaps report gives the
  review list ordered by seats.

## How to approve a trade → skill link

Use the official DGT CTS curriculum PDF for the trade, which states its NCO-2015 code. Record a
`skill_taxonomy_mappings` row with `taxonomy_name = 'DGT_CTS_TRADE'`, `taxonomy_version = 'CTS-2026'`,
`taxonomy_code` = the trade label exactly as in the seat matrix, `mapping_method = 'OFFICIAL_CROSSWALK'`,
`mapping_confidence = 'HIGH'`, `source_id` = the curriculum source, and the PDF URL in `mapping_note`.
That is a data change, so it goes through the database owner like any other.

## Verified on a replica

Built tables matching the live columns and CHECK constraints (Queries 2–9, 2026-10-20), plus a
`source_capabilities` table, then loaded fixtures covering: messy spacing and case, two trades → one
skill, ambiguous, low-confidence and cross-state district labels, a same-label row from another code
system, unmapped, inferred, double-mapped and inactive-skill trades, and a row with no retrieval.

- Export = the 3 valid rows; the gaps report lists all 9 mapping problems.
- Capability cases: two capabilities for the same grain → 0 rows; scope `IN-OR` → only Odisha rows;
  coverage ending 2025 → 0 rows; each refusal listed as `CAPABILITY_NOT_REGISTERED`.
- The CSV passed a line-by-line transcription of #60's `parse_canonical_csv` (supply) and
  `validate_source_capabilities` with 0 problems. Loading it into the replica's `supply_observations`
  under the live CHECKs worked, and a replay added nothing.
- An earlier draft counted capabilities after filtering by unit; the transcription caught that #60
  counts first, and the SQL now matches #60.
