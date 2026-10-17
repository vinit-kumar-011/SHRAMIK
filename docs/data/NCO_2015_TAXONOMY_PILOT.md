# NCO-2015 taxonomy pilot

**Status:** initial source-native occupation slice loaded; all seven records remain inactive.

## Purpose

This small pilot establishes stable canonical job-role records and attaches exact NCO-2015 identity codes. It is deliberately not a claim that these occupations have an official one-to-one mapping to a NIC 2008 industry sector.

The official Directorate General of Employment NCO-2015 occupation browser and classification download page are the source of the occupation titles and codes:

- https://www.dge.gov.in/nat
- https://www.dge.gov.in/nco-2015

## Pilot records

| NCO-2015 code | Exact occupation title | Provisional NIC sector | Sector mapping confidence | Active |
|---|---|---|---|---|
| 7411.0100 | Electrician, General | F — Construction | LOW | No |
| 7233.0100 | Fitter, General | C — Manufacturing | LOW | No |
| 7112.0200 | Bricklayerer, Construction | F — Construction | LOW | No |
| 7112.0100 | Stone Mason | F — Construction | LOW | No |
| 2512.0100 | Computer Programmer/Software Engineer | J — Information and communication | LOW | No |
| 2513.0101 | Web Developer | J — Information and communication | LOW | No |
| 2519.0402 | Test Engineer – Software Products | J — Information and communication | LOW | No |

The occupation identity mapping is marked HIGH because the title/code pair is copied from the official NCO reference. The separate sector mapping is MANUAL/LOW and each skill is inactive because an NCO occupational classification does not itself provide an official NCO-to-NIC crosswalk. Do not activate these rows or use them in forecasts until the sector decision is reviewed.

## Implementation notes

- Skill IDs and codes are deterministic and include the NCO version/code.
- NCO rows use `taxonomy_name = NCO-2015`, `taxonomy_version = 2015`.
- NCO mapping records point to the existing `National Classification of Occupations 2015` source registry entry.
- The migration is idempotent (`ON CONFLICT DO NOTHING`).
- The two migrations are split because PostgreSQL data-modifying CTEs cannot be observed through a regular table join from another part of the same statement; the follow-up migration attaches mappings to the inserted skills.

## Next steps

1. Review and document the NIC sector assignment rule before activating any pilot record.
2. Ingest the broader NCO-2015 occupation hierarchy reproducibly from official DGE data, preserving source title, code, family/group hierarchy, and version.
3. Add only explicit, source-backed NQR/NSQF/QP/NOS relationships where the official source establishes the mapping.
4. Create a reviewed alias/crosswalk from DGT CTS trade names to NCO occupations before linking training-seat observations to canonical skills. A course/trade title is not automatically equivalent to an occupation code.

## Migration history caveat

At the time these files were added, the live Supabase database reported earlier migrations beginning at `20261017080248`, but the `develop` branch did not contain a `supabase/migrations` directory. These two files track the new taxonomy changes, but they are **not** a complete local mirror of the remote migration history. Reconcile/pull the remote schema and earlier migrations before using `supabase db push` or `supabase db reset` from this branch.
