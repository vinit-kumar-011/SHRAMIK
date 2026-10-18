# SHRAMIK baseline recovery rehearsal evidence — 2026-10-18

## Snapshot received

The supplied file `SHRAMIK_live_schema_20261018.sql` was exported with PostgreSQL `pg_dump` 18.6 from a PostgreSQL 17.11 server. It is a schema-only export, 97,785 bytes.

**SHA-256 of the untouched source dump:**
`5adec31c499521af6d31c579a1a1ef421a0372365532430577da32da844af3be`

## Static inspection results

| Object/check | Result |
|---|---:|
| Public tables | 25 |
| Public trigger functions | 5 |
| Explicit index definitions | 77 |
| Foreign-key clauses | 56 |
| Triggers | 9 |
| Tables with RLS enabled | 25 |
| Explicit policies in dump | 0 |
| Public views | 0 |
| Index on `stg_nco_2015_occupations(source_id)` | Absent |

The 77 explicit index definitions plus indexes owned by primary-key/unique constraints are consistent with the previously audited overall public-index count of 118. The dump contains table DDL, constraint definitions, index statements, function bodies, triggers, object comments, identity-column setup and RLS enablement statements.

## Rehearsal artifact

A separate candidate SQL file was prepared from the dump, removing only the psql `\\restrict`/`\\unrestrict` directives and the `CREATE SCHEMA public` and schema-comment statements. Its SHA-256 is:

`e3025851a0d06b0a0788c36cc588834feb9f252e915d18d6504d69630c170cb4`

This is a **rehearsal candidate only**, not a migration and not approved for production. Static inspection is complete; SQL execution against a disposable PostgreSQL instance has **not** been performed. The candidate does not include seed/application rows, grants, Supabase Auth/Storage setup, non-public schemas, or remote migration history. It therefore cannot, by itself, reproduce the current SHRAMIK database.

## Safe next steps

1. Preserve the original schema dump and its hash as the immutable snapshot.
2. Rehearse the candidate only on a disposable PostgreSQL 17-compatible database with `psql -v ON_ERROR_STOP=1`; never on the live project.
3. Compare the rebuilt catalog to the source schema, including indexes/predicates, FK actions, CHECK/UNIQUE constraints, function bodies, triggers and RLS.
4. Separately define and test how reference/staging data will be seeded from approved original source artifacts.
5. Perform one final search on the repository owner/backend teammate machines and backup archives for the 19 missing historical SQL migration bodies. If the source files are not recovered, approve a baseline/ledger-transition plan explicitly before adding any baseline under `supabase/migrations/`.
6. Add the NCO `source_id` index only as a separate reviewed migration after reconciliation.

No production SQL, migration ledger, or database data was changed in preparing this evidence.
