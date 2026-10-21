# Backend skill relationship gap — additive proposal

## Summary

The current SHRAMIK architecture proposal already includes `analytics.emerging_skill_signals` with fields such as `skill_label`, `occupation_id`, geography, time window, trend statistic, source coverage, mapping confidence, evidence and rule/model version. It also includes canonical `ref.occupations`, `ref.sectors`, `ref.qualifications`, `ref.occupation_qualification_mappings`, `obs.job_postings`, and source/result lineage.

**Gap identified:** the reviewed SQL blueprint does not yet define a canonical `ref.skills` table or a canonical many-to-many `ref.occupation_skill_mappings` table. `analytics.emerging_skill_signals.skill_label` alone is insufficient to guarantee stable identity across the graph, skill profile, comparisons and watchlists. The job-posting observation schema maps occupations, but it does not yet store normalised skill mentions as a separate relation.

This is an additive proposal for the backend team to review. It is not a migration already applied to the database. Validate existing schema and naming before using it.

## Suggested implementation order

1. Add a canonical skill dimension with aliases and lifecycle/version semantics.
2. Add evidence-backed skill↔occupation relationship records and, where supported, skill↔sector mappings.
3. Add normalised job-posting skill-mention observations only after an authorised demand source and extraction pipeline are validated.
4. Add nullable `skill_id` to emerging-skill signal records while preserving `skill_label` for historical/backfill compatibility.
5. Build a graph API/view returning typed nodes/edges with relation basis, evidence, coverage and mapping versions.
6. Add user-specific watchlist/alert persistence using the existing auth/user schema; do not create parallel auth tables.

## Relationship source hierarchy

- Explicit, reviewed mapping/crosswalks may support a `APPROVED_MAPPING` edge.
- Normalised skill mentions in authorised, deduplicated postings may support `DIRECT_OBSERVATION` links from a posting to a skill and an occupation/sector association only to the extent the same posting has validated occupation/sector mappings.
- A computed association from aggregated observations may support `DERIVED_ASSOCIATION` only with a defined method/window and suitable coverage.
- Do not generate graph edges simply because an occupation and skill appear plausible together.

## Proposed migration

See `backend/proposed_skill_relationship_schema.sql`. It assumes the existing `ref`, `obs`, and `analytics` schemas and the named occupation/sector/posting/signal tables exist. It is a design draft: adapt enum names, indexes, triggers, access policies and migration ordering to the live schema and deployment tool. Test rollback and existing data compatibility in development/staging before production.

## Required backend tests

- Canonical IDs and aliases remain stable across ingestion versions.
- Duplicate skill aliases and posting mentions are resolved idempotently.
- Mapping confidence/review status/evidence survive API serialization.
- Rejected/deprecated mappings are excluded from production graph outputs by default.
- Graph edges identify relation basis and observation period.
- Filtering by geography/period/sector changes edges consistently.
- No unauthorised/raw posting content is exposed by graph/evidence endpoints.
- Existing `analytics.emerging_skill_signals` rows without `skill_id` still appear with a flagged legacy/unmapped state until reviewed, not automatically matched by string similarity.
