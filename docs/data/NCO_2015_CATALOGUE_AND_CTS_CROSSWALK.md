# NCO-2015 catalogue ingestion and CTS crosswalk review

## Why a separate staging catalogue exists

The Directorate General of Employment's NCO-2015 browser (https://www.dge.gov.in/nat) and NCO-2015 download page (https://www.dge.gov.in/nco-2015) publish occupation titles, NCO 2015 codes, NCO 2004 concordance codes, and the occupation hierarchy: division, sub-division, group, and family.

An occupation taxonomy is not an industry taxonomy. Do not force every NCO occupation into a NIC sector just to store the official title and code. The new RLS-enabled table public.stg_nco_2015_occupations stores source-faithful records without sector assignments and has no public read policy.

## 1. Export/import the official catalogue

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
