# NCO-2015 catalogue ingestion and CTS crosswalk review

## Why a separate staging catalogue exists

The Directorate General of Employment's NCO-2015 browser (https://dge.gov.in/nat) and NCO-2015 download page (https://dge.gov.in/nco-2015) publish occupation titles, NCO 2015 codes, NCO 2004 concordance codes, and the occupation hierarchy: division, sub-division, group, and family.

An occupation taxonomy is not an industry taxonomy. Do not force every NCO occupation into a NIC sector just to store the official title and code. The new RLS-enabled table public.stg_nco_2015_occupations stores source-faithful records without sector assignments and has no public read policy.

## 1. Export/import the official catalogue

### Preferred path: source-reviewed PDF snapshot

The DGE browser endpoint has intermittently returned its site shell instead of table rows at the end of pagination. A PDF-derived snapshot was therefore extracted from the three official PDFs on DGE's [NCO-2015 download page](https://dge.gov.in/nco-2015). Use that reviewed snapshot rather than repeatedly scraping the live browser:

1. Save the provided `nco_2015_occupations_validated.csv` into `data/raw/nco_2015_occupations_validated.csv`.
2. Run a validation-only pass:
   ```powershell
   python scripts/import_nco_2015_csv.py --csv data/raw/nco_2015_occupations_validated.csv
   ```
3. Once the validation output reports 3,451 unique records and the expected snapshot SHA-256, sync only the staging table:
   ```powershell
   python scripts/import_nco_2015_csv.py --csv data/raw/nco_2015_occupations_validated.csv --sync-db
   ```

The CSV importer validates the exact row count, unique NCO code format, nonblank titles, official DGE source URLs, page/record ordinals, uniform snapshot metadata, and the canonical SHA-256 before opening the database transaction. On sync it requires exactly one `data_sources` registry row named `National Classification of Occupations 2015`, upserts all rows in one transaction, and verifies the final current-row count. Blank NCO-2004 concordances and unavailable hierarchy values are stored as SQL NULLs, not guessed.

The importer reads `DATABASE_URL` from the process environment, or from a local `.env`, `.env.local`, or `backend/.env` file. An explicit local dotenv path can be supplied with `--env-file`. Never commit a connection string or paste credentials into chat.

### Document review decisions

The reviewed merged snapshot contains **3,451 unique codes**: 3,447 Volume I concordance records plus four explicitly coded Volume II-B records missing from the concordance. The following seven discrepancies were inspected against the PDF text and kept visible in `nco_2015_discrepancy_review.csv`:

- `7321.1100` Router, `7322.0100` Job Printer, `7323.0500` Book Binding Operatives, and `7421.0200` Electronics Fitters, Other: include as Volume II-B-backed records; leave NCO-2004 mapping blank because Volume I concordance does not list them.
- `3127.9900`: do not load as a separate code. Volume II-A prints it with the identical title under ISCO unit group 3123, while Volume I concordance lists that title as `3123.9900` (NCO-2004 `7148.90`). This is treated as a likely source-code inconsistency, not an official correction.
- `3123.9900`: retain the Volume I concordance record and mapping.
- `8190.0100` Saw Grinder, Machine: retain the Volume I concordance record and NCO-2004 `8290.40`; group/family headings remain blank because no exact detailed-description code or heading was found in Volumes II-A/II-B searchable text.

No NIC-sector, demand, supply, or CTS mapping is inferred by this catalogue import.

### Live browser fetch (fallback/diagnostic only)

The browser importer remains available for future source snapshots when DGE pagination behaves normally. It fetches pages and writes its own CSV/manifest without DB changes by default. It is not the preferred route for loading the PDF-reviewed snapshot.


From the SHRAMIK repository root, install the backend dependencies:

~~~powershell
python -m pip install -r backend/requirements.txt
~~~

Fetch the paginated catalogue and write a CSV plus a provenance manifest. The default run writes files only; it does not access the database:

~~~powershell
python scripts/import_nco_2015.py
~~~

The importer:
- walks pages sequentially until an empty end page;
- checks expected table headers and NCO code format;
- deduplicates repeated codes and fails if one code has conflicting official fields;
- requires at least 2,000 unique records by default, so partial responses fail closed;
- creates a stable SHA-256 over normalized occupation and hierarchy fields;
- writes data/raw/nco_2015_occupations.csv and data/raw/nco_2015_import_manifest.json.

After inspecting the CSV and setting DATABASE_URL to the project's database connection string, explicitly sync the complete snapshot:

~~~powershell
$env:DATABASE_URL = "YOUR_DATABASE_URL"
python scripts/import_nco_2015.py --sync-db
~~~

The sync runs in one database transaction. If any row fails, all writes roll back. It upserts by NCO code, marks older codes missing from the latest successfully downloaded snapshot as not current (without deleting them), and verifies the current-row count against the input snapshot. Never commit credentials to Git or paste a connection string into an issue.

## 2. Export distinct DGT CTS trade names for candidate generation

In Supabase SQL Editor, export the query result as CSV. This deliberately aggregates repeated training-centre rows by source trade name:

~~~sql
select trade_name_source, count(*)::int as occurrences
from public.stg_dgt_cts_seat_matrix
group by trade_name_source
order by trade_name_source;
~~~

Save the export as data/raw/dgt_cts_trade_names.csv, then run:

~~~powershell
python scripts/build_cts_nco_candidates.py --cts-csv data/raw/dgt_cts_trade_names.csv --nco-csv data/raw/nco_2015_occupations.csv --output data/processed/cts_nco_2015_candidates.csv
~~~

The output gives each CTS trade up to five candidate NCO titles with source hierarchy, a normalized title-similarity score, and reviewer fields. Similarity prioritizes manual review only; it is not a validated mapping.

## 3. Approve mappings only with evidence

Every candidate starts with review_status=PENDING_REVIEW. A reviewer should make a decision only after checking an official trade curriculum or qualification document, NSQF/QP/NOS identifiers where available, or an explicit official crosswalk. Record evidence URL/version and rationale in review_note. If no defensible relationship exists, mark a row REJECTED or UNRESOLVED; do not choose the nearest text match just to complete the catalogue.

Do not:
- map solely on fuzzy similarity;
- equate a training course with an occupation without supporting evidence;
- assign a NIC sector from occupational wording alone;
- activate the seven existing pilot skills while their manual LOW-confidence sector mappings remain unresolved;
- use provisional CTS seat capacity as job demand.

When a mapping is approved, transfer only the reviewed subset to canonical skills and skill_taxonomy_mappings, retaining external code, taxonomy version, mapping method/confidence, evidence source, and review note.

## 4. Run tests

~~~powershell
python -m pytest tests/test_nco_2015_import.py tests/test_cts_nco_candidates.py -q
~~~

## Migration-history warning

The live project contains earlier migrations that are not yet present in the develop branch. Reconcile/pull the remote schema and prior migration files before using supabase db push or supabase db reset from this branch. The staging-table DDL has already been applied to live Supabase and is recorded in the remote migration history.
