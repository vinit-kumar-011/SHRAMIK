# SHRAMIK Live Database Reconciliation Audit

**Audit date:** 2026-10-18  
**Project:** Supabase `SHRAMIK` (`vnmvejubmypbpiaxtrgc`)  
**Target repository branch reviewed:** `develop`  
**Mode:** Read-only live inspection. No DDL, data writes, migration repairs, or production changes were performed during this audit.

## 1. Executive result

The live database has a substantial operational schema, but **the repository does not yet contain a complete, reproducible migration history for it**. Do not run `supabase db push`, `supabase db reset`, or migration-repair commands against production as a shortcut.

The live database is not empty or merely a table skeleton: it contains seeded reference data, source staging data, and 2,087 general source-metric observations. It has not yet been populated with canonical demand/supply time series or persisted forecast/ML outputs.

### Live catalog counts

| Item | Verified result |
|---|---:|
| Public base tables | 25 |
| Public tables with RLS enabled | 25 / 25 |
| Public tables with RLS forced | 0 / 25 |
| Explicit RLS policies | 0 |
| Columns across public base tables | 364 |
| Primary-key constraints | 25 |
| Unique constraints | 16 |
| Check constraints | 139 |
| Foreign-key constraints | 56 |
| Public indexes | 118 |
| User-defined public trigger functions found | 5 |
| Trigger event rows found | 17 |
| Remote migration records | 23 |
| SQL migration files in `develop` | 4 |

The four migration files present on `develop` match the final four names/versions in the remote ledger. The other **19 remote migration records have no corresponding SQL migration file in the `develop` tree**. The remote ledger records migration version/name, not the SQL source that originally ran.

## 2. Verified current row counts

| Table | Rows | Interpretation |
|---|---:|---|
| `states` | 36 | State/UT reference |
| `districts` | 784 | Canonical districts |
| `sectors` | 21 | Canonical sectors |
| `skills` | 7 | Pilot canonical skills |
| `skill_taxonomy_mappings` | 7 | Pilot NCO mappings; not evidence that provisional skill-sector mappings are approved |
| `sector_taxonomy_mappings` | 21 | Sector taxonomy mappings |
| `source_geography_mappings` | 1,498 | Source geography crosswalk records |
| `source_capabilities` | 23 | Source-grain/capability records |
| `source_retrievals` | 12 | Retrieval metadata |
| `evidence_items` | 12 | Evidence metadata |
| `source_metric_observations` | 2,087 | General source-context metrics, not canonical demand/supply observations |
| `stg_dgt_cts_seat_matrix` | 29,372 | Source-specific seat matrix |
| `stg_ncvt_iti_listing_snapshot` | 16,815 | Source-specific ITI listing snapshot |
| `stg_plfs_2025_benchmark_cells` | 538 | Published benchmark-cell registry |
| `stg_eshram_page_metadata` | 2 | Retrieval/metadata records only |
| `stg_nco_2015_occupations` | 3,451 | Current reviewed NCO-2015 catalogue |
| `demand_observations` | 0 | No canonical demand time series yet |
| `supply_observations` | 0 | No canonical supply time series yet |
| `model_versions` | 0 | No model version registered yet |
| `forecast_results` | 0 | No persisted forecast outputs |
| `emerging_skill_signals` | 0 | No persisted emerging-skill outputs |
| `early_warnings` | 0 | No persisted warnings |
| `evidence_links` | 0 | No analytic-output evidence links yet |
| `synthetic_generation_runs` | 0 | No synthetic generation run registered yet |

The 2,087 `source_metric_observations` are all source-backed in the audited snapshot:
- 1 national COUNT metric dated `AS_OF_2026-07-14`;
- 1,951 state COUNT metrics across four sources, periods ranging from `ACADEMIC_SESSION_2026` to `FY2025-26`;
- 108 national RATE metrics for `CY2025`;
- 27 state RATE metrics for `CY2025`.

These heterogeneous metrics must not be silently repurposed as skill-level demand or employed-worker supply. Their semantic definitions, units, period and grain must be checked in adapters before engines consume them.

## 3. Column-level comparison with the database schema design

The table/column tables in `docs/database/SHRAMIK_DATABASE_SCHEMA.md` were compared with live `information_schema.columns` data.

### What matches

- Every table section/field listed in the current design document (17 tabulated entities) exists in the live database.
- No field listed by those 17 design sections was missing from the corresponding live table in the column-level comparison.

### Additive live columns not described in the current design tables

| Table | Extra live columns |
|---|---|
| `demand_observations` | `quantity_unit`, `quantity_semantics`, `source_release` |
| `supply_observations` | `quantity_unit`, `quantity_semantics`, `source_release` |
| `forecast_results` | `demand_unit`, `supply_unit`, `demand_temporal_semantics`, `supply_temporal_semantics` |

These appear to be deliberate unit/semantics additions, but that intention must be confirmed. Keep them; do not drop fields merely because the design document is behind. Update the schema/ML/API contracts to define them after the owners approve their intended semantics.

### Live tables not represented as column tables in the primary schema document

- `sector_taxonomy_mappings` — 21 rows
- `source_geography_mappings` — 1,498 rows
- `source_metric_observations` — 2,087 rows
- `stg_dgt_cts_seat_matrix` — documented in source-specific context, but not as a complete entity table in the main schema
- `stg_eshram_page_metadata`
- `stg_nco_2015_occupations` — its behaviour is separately documented in `docs/data/NCO_2015_CATALOGUE_AND_CTS_CROSSWALK.md`
- `stg_ncvt_iti_listing_snapshot`
- `stg_plfs_2025_benchmark_cells`

Several tables have their own source documentation, but the primary schema document needs a clear canonical vs source-specific staging inventory and links to the authoritative DDL/field contract for each table.

**Scope limit:** this is a table/column audit plus catalog-level constraint/RLS/trigger/index inventory. It is not yet a full semantic comparison of every CHECK expression, UNIQUE/index predicate, FK delete rule, grant, and trigger body against the written design. That diff remains an acceptance item before schema freeze.

## 4. Constraints, triggers, indexes and RLS

### Referential/integrity constraints

The database reports 56 foreign keys, 139 CHECK constraints, 25 primary keys, and 16 unique constraints. Five public trigger functions are present:
- `shramik_check_forecast_model_cutoff()`
- `shramik_check_observation_grain()`
- `shramik_check_source_metric_observation()`
- `shramik_check_warning_forecast()`
- `shramik_reject_update_delete()`

The trigger functions inspected use an explicit restricted search path: `pg_catalog, public, pg_temp`. Triggers enforce observation grain/provenance relationships, model cutoff, warning/forecast quality, and append-only handling for certain provenance/model tables.

### Immediate index issue

Supabase Performance Advisor now reports **one uncovered foreign key**:

- Constraint: `stg_nco_2015_occupations_source_id_fkey`
- Column: `public.stg_nco_2015_occupations.source_id`
- Reason: the new NCO staging migration added the foreign key but did not add a covering index on `source_id`.

Proposed follow-up migration SQL (do **not** run manually against production while history remains unreconciled):

```sql
CREATE INDEX IF NOT EXISTS ix_stg_nco_2015_source_id
  ON public.stg_nco_2015_occupations (source_id);
```

Add this as a timestamped migration after migration-history reconciliation, test it on a clean disposable database, then apply through the normal reviewed process. The advisor also reports 44 unused indexes. Given the project is early and most analytical tables are empty, **do not drop those indexes solely because usage counters are currently zero**; revisit after representative API/engine query workloads exist.

### RLS posture

All 25 public base tables have RLS enabled. No explicit policies exist on any of these tables, and RLS is not forced. Supabase Security Advisor marks “RLS enabled, no policy” for all 25 as an INFO finding.

With RLS enabled and no policies, anonymous/authenticated direct table access is denied by default. This is compatible with the documented boundary **Frontend → FastAPI → PostgreSQL/Supabase**, provided the FastAPI server uses a protected server-side database credential. The frontend must not call the tables directly and must never receive `DATABASE_URL` or a service-role secret. If a later requirement introduces direct client-side PostgREST reads, add narrowly scoped, tested policies first rather than opening tables globally.

## 5. Remote migration ledger vs repository

Remote ledger (version — migration name):

```text
20261017080248 — 001_initial_schema
20261017080315 — 002_cts_seat_source_staging
20261017080434 — 003_seed_source_registry
20261017085250 — 004_enable_rls_all_tables
20261017092052 — 005_eshram_metadata_staging
20261017092555 — 006_seed_geography_and_nic_sectors
20261017093235 — 007_register_cts_iti_import_sources
20261017100331 — 008_link_staging_rows_to_source_retrievals
20261017100428 — 008_cts_source_geography_labels
20261017101246 — 009_seed_training_centre_state_metrics
20261017104418 — 010_eshram_published_state_registration_snapshot
20261017111753 — 011_seed_lgd_district_roster_2026_09_23
20261017112024 — 012_link_exact_dgt_cts_district_name_matches
20261017113018 — 013_plfs_2025_district_crosswalk_and_lgd_source_register
20261017113147 — 014_link_exact_plfs_district_names_to_lgd_snapshot
20261017114318 — 015_seed_cts_provisional_seat_capacity_by_state_trade
20261017120624 — 014_harden_trigger_function_search_path
20261017122716 — 015_add_plfs_2025_benchmark_cell_registry
20261017124949 — 015_index_uncovered_foreign_keys
20261017132404 — seed_nco_skill_taxonomy_pilot
20261017132537 — attach_nco_taxonomy_mappings_to_pilot
20261017134206 — create_nco_2015_staging
20261017141152 — correct_dge_source_urls_nco_mappings
```

Only the final four corresponding timestamped SQL files are tracked in `develop` at the time of this audit:
- `20261017132404_seed_nco_skill_taxonomy_pilot.sql`
- `20261017132537_attach_nco_taxonomy_mappings_to_pilot.sql`
- `20261017134206_create_nco_2015_staging.sql`
- `20261017141152_correct_dge_source_urls_nco_mappings.sql`

### Why not run migration repair now?

Supabase docs clarify that the migration ledger is tracking metadata and `migration repair` changes the ledger; it does not execute the missing SQL. Marking 19 versions reverted/applied blindly could produce a falsely green history while the code cannot recreate the database. See:
- [Supabase database migrations guide](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase CLI migration list and repair](https://supabase.com/docs/reference/cli/supabase-migration-list)
- [Supabase CLI db pull](https://supabase.com/docs/reference/cli/supabase-db-pull)

## 6. Reconciliation decision tree

### Preferred path — recover exact historical migration SQL

1. Search the local SHRAMIK folder, team member's clone, Git history/branches, backups, and any earlier PR artifacts for the 19 missing migration files.
2. Restore the original SQL files at their exact recorded timestamps/names; do not recreate files from the migration names alone.
3. Inspect each SQL file against the current live schema and data history.
4. Run `supabase migration list` and verify local/remote versions match.
5. Build and reset a **disposable local database only**. Confirm every migration applies from empty state and the final schema is equivalent to the captured live schema.
6. Add an explicit reviewed migration for the NCO source-FK index and any approved documentation/schema changes.
7. Apply only approved migrations to the live project after a backup and a written review.

### Fallback — a reviewed baseline if original SQL cannot be recovered

Do not guess the 19 missing migration bodies. Instead, create a dedicated reconciliation PR that:
1. captures a schema-only dump/snapshot from the live project;
2. captures required canonical/reference seed data as separate, reviewable seed scripts (do not include secrets or personal data);
3. produces a deterministic baseline migration that can reconstruct a clean development database, including custom constraints, indexes, triggers/functions, and RLS;
4. validates the baseline on a fresh disposable Postgres/Supabase instance;
5. defines a carefully reviewed transition for the existing remote migration ledger, only after schema equivalence is proved.

A baseline/ledger rewrite is a separate, explicitly approved operation. Do not combine it with adding business features or ingesting new data. Prefer a temporary/disposable project for the rehearsal; never reset the production project to test a migration.

## 7. Acceptance checklist for declaring the database reconciled

- [ ] Full original migrations recovered, or a reviewed baseline strategy approved.
- [ ] Local and remote migration histories intentionally match.
- [ ] A clean disposable database builds from repository migrations without manual dashboard steps.
- [ ] Live-vs-rebuilt catalog comparison passes for columns/types/nullability/defaults, PK/unique/CHECK constraints, foreign keys/delete rules, indexes/predicates, RLS/policies, triggers/functions and table grants.
- [ ] Data/seed reproducibility documented for reference/geography/source registry tables.
- [ ] The 3 extra columns on demand/supply and 4 extra forecast semantic columns are documented and owned.
- [ ] All 8 tables missing from the main schema inventory have either their fields documented there or an explicit link to an authoritative standalone schema document.
- [ ] The uncovered NCO `source_id` foreign-key index is added through a reviewed migration and advisor rechecked.
- [ ] RLS policy absence is an explicit choice, with server-only access confirmed; no accidental public reads.
- [ ] Backend owners agree schema/API/ML field semantics before engines persist results.
- [ ] No forecast or production analytics writes are mixed into schema reconciliation.

## Next action

The immediate next step is for the repository owner / database lead to search for and restore the 19 original missing migration SQL files. If they cannot be found, agree on the reviewed baseline fallback above. Once the source migration strategy is settled, complete the full catalog diff and queue the NCO index migration. No production changes were made by this audit.
