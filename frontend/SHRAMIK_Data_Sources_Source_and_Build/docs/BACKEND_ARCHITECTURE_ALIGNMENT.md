# Data Sources — Backend Architecture Alignment

**Status:** alignment note and proposed interface guidance, not confirmation that the service/schema is implemented.

SHRAMIK's architecture planning includes concepts for source registries, source retrievals, mapping metadata and validation/provenance. Before coding the REST adapter, inspect the current checked-in SQL, migrations, API routers and auth model. Do not treat this document's suggested route names, enum values, columns or operations as existing production contracts.

## Frontend-first milestone

Use a typed adapter plus `SYNTHETIC_DEMO` fixture so the page can be built before all source access is validated. The frontend should be useful without any live source connection. Keep source list, details, run history, coverage and mapping as separate adapter calls so one missing backend capability does not block the rest.

## Suggested data concepts

- `data_sources`: registry metadata, source type, display name, owner, purpose, access-mode summary, status, source cadence/update policy, tags, permissions and provenance.
- `source_retrievals` / `ingestion_runs`: retrieval attempt ID, source ID, job status, started/completed times, counts, warnings/errors and output/version pointer.
- `source_field_mappings`: source schema/version, source field, canonical field, mapping method, confidence/review state and transformation summary.
- `source_coverage` or equivalent aggregation: supported geography/time/taxonomy ranges and known gaps.
- validation records/issues: validation timestamp, rule, severity, affected source/data version and safe explanation.

These names are illustrative. Prefer existing schema vocabulary and avoid duplicating tables if the blueprint already has equivalents.

## Production safeguards

- Keep connector credentials and access tokens server-side, preferably in a secrets store.
- Validate every create/update/ingestion action on the server and enforce permissions.
- Separate job acceptance/queueing from job completion/success.
- Preserve source, retrieval, validation and mapping provenance for auditability.
- Do not infer freshness from the last retrieval time alone. Use source-specific release/cadence metadata.
- Avoid exposing restricted row-level source data from this operational screen.
- Return safe error codes/messages and a correlation ID; keep detailed logs server-side.
- Add transactions, indexes, data retention rules and row-level access constraints only after checking the actual database and tenancy/auth requirements.

## Suggested integration sequence

1. Agree on existing/required source-registry schema and status semantics.
2. Implement read-only list/detail/coverage/history/mapping endpoints and test permissions.
3. Plug the typed REST adapter into the frontend only when routes are present.
4. Add create/edit/retry actions as separate work after validation of backend capabilities and authorization.
