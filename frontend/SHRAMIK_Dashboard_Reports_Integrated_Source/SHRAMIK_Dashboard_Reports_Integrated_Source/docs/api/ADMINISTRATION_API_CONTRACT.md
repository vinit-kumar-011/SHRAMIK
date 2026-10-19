# Administration API contract proposal

**Status:** proposed read-only overview route. The current backend scaffold is not assumed to implement it. Do not enable live Administration views before authentication, role authorization and audit access have been verified.

## Route

`GET /api/v1/admin/overview`

The shared `VITE_SHRAMIK_API_BASE_URL` points to the API host; the adapter adds `/api/v1` when needed. Requests include credentials. The adapter accepts a raw JSON body or `{ "data": ... }` envelope. HTTP/network/contract errors are shown as errors; no mock fixture fallback occurs in REST mode.

## Response shape

The response contains four collections plus provenance metadata:

- `accessRequests[]`: `id`, `name`, `email`, `organisation`, `requestedRole`, `submitted`, `purpose`, `status` (`pending` / `approved` / `denied`), and a safe evidence/document reference.
- `users[]`: `id`, `name`, `email`, `organisation`, `role`, `status` (`active` / `suspended`), `lastSeen`.
- `roles[]`: `name`, `summary`, and `permissions[]`.
- `audit[]`: `id`, `timestamp`, `actor`, `action`, `target`, and `outcome`.
- `meta`: `provenance` (`SOURCE_BACKED`, `DERIVED`, `MIXED`, or `SYNTHETIC_DEMO`), source label, update timestamp if supplied, and limitation note.

Do not put raw credentials, access tokens, private keys, passwords, identity-document bytes or unnecessary personal data in this overview. Use authorized, expiring evidence references if evidence review is part of the workflow.

## Security boundary

The frontend adapter deliberately performs GET only. In REST mode, approve/deny, role-change and account status controls are disabled. No UI-only role selection is authorization: every restricted route and mutation must be authorized server-side and recorded in an immutable audit trail.

Before adding mutation routes, agree on separate authenticated endpoints for request decisions, role changes and user status changes. Each must validate the caller's permissions, enforce allowed state transitions, return the persisted result, prevent duplicate/replayed decisions, and produce an audit event. The frontend must only report success after it receives the server-confirmed response.

## Acceptance checks

1. Apply server-side authorization to the overview according to actor role and tenant/workspace scope.
2. Test 401, 403, empty lists, invalid enum values, cross-workspace IDs, malformed JSON and 5xx responses.
3. Validate that audit records are server-generated, access-controlled and not editable from this UI.
4. Keep `VITE_SHRAMIK_API_BASE_URL` blank until the overview endpoint and session/auth integration are implemented and verified.
