# Emerging Skills API contract proposal

**Status:** proposed frontend/backend handoff, not evidence that these routes exist in the current backend. The UI should keep the demo adapter selected until the backend implements and contract-tests these endpoints.

## Base URL and conventions

The shared `VITE_SHRAMIK_API_BASE_URL` points to the API host (for example, `http://localhost:8000`). The adapter adds `/api/v1` unless the configured URL already ends in that prefix. Requests include credentials and request JSON. The frontend accepts either a plain JSON body or a `{ "data": ... }` envelope for successful responses.

Query filters are optional: `period`, `geography`, `sector`, and `category`. The adapter omits `category=ALL` from requests. Error responses should use the project's standard envelope, preferably `{ "error": { "code": "...", "message": "..." } }`. HTTP and network errors are shown as errors; they do not trigger mock-data fallback.

## Proposed routes

| Method | Route | Use |
| --- | --- | --- |
| GET | `/api/v1/emerging-skills/summary` | Count summary and top skills for the applied filters |
| GET | `/api/v1/emerging-skills/skills` | Filtered skill register; return an array or `{ "items": [] }` |
| GET | `/api/v1/emerging-skills/skills/{skillId}` | One canonical skill record; 404 maps to a not-found UI state |
| GET | `/api/v1/emerging-skills/skills/{skillId}/relationships` | `nodes`, `edges`, and provenance metadata |
| GET | `/api/v1/emerging-skills/skills/{skillId}/regional-signals` | Regional signals as an array or `{ "items": [] }` |
| GET | `/api/v1/emerging-skills/skills/{skillId}/evidence` | Classification rule, observation window, source references, coverage, and limitations |
| POST | `/api/v1/emerging-skills/compare` | Compare selected skill IDs under a filter snapshot |
| GET | `/api/v1/emerging-skills/watchlist` | Current user's watchlist IDs; array or `{ "items": [] }` |
| PUT | `/api/v1/emerging-skills/watchlist/{skillId}` | Add item to the authenticated user's watchlist |
| DELETE | `/api/v1/emerging-skills/watchlist/{skillId}` | Remove item from the authenticated user's watchlist |
| GET | `/api/v1/emerging-skills/alerts` | Current user's skill alerts; array or `{ "items": [] }` |

## Data and provenance rules

- Do not infer emerging status, momentum, growth, demand forecasts, or regional coverage in the frontend. Return only backend-calculated, versioned signals.
- Skill records should include `skillId`, `canonicalName`, `category`, `momentumScore`, `mentions`, `growthRate`, `ruleVersion`, `observationWindow`, `provenanceState`, `sectors`, and their supported relationship/regional fields.
- Summary metadata must include a provenance value (`SOURCE_BACKED`, `DERIVED`, `MIXED`, or `SYNTHETIC_DEMO`), update timestamp if supplied, and a clear note/limitation.
- Relationship edges must return their relation basis and evidence count. An approved taxonomy mapping must not be presented as a directly observed relationship.
- Watchlist writes and alerts must be scoped to the authenticated user. Enforce authorization in the API; frontend state is not an access-control boundary.
- Implement pagination for larger list/alert collections before production use.

## Minimum backend acceptance checks

1. Implement the endpoints and JSON schemas above, or approve a revised mapping in this document and the adapter.
2. Test validation, authentication/authorization, empty results, unknown IDs, rate limiting, and server/network failures.
3. Confirm filter and provenance metadata is consistent across summary, skill list, detail, relationship, evidence, and regional signal responses.
4. Confirm PUT/DELETE watchlist writes are idempotent and scoped to the current authenticated user.
5. Keep `VITE_SHRAMIK_API_BASE_URL` blank until this contract is implemented and verified. A configured but incomplete backend must surface errors, not synthetic results.
