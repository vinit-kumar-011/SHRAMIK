# SHRAMIK Data Sources — Frontend Integration Contract

## Module boundary

Suggested export: `DataSourcesPage` plus a typed adapter injected through props or a project-standard dependency context. The main application owns route registration, global sidebar/topbar, authentication and authorisation context.

```tsx
<DataSourcesPage adapter={dataSourcesAdapter} />
```

Adapt the signature to existing project conventions. Do not create a second application shell or introduce a new router if the project already has one.

## Adapter requirements

The page must depend on an adapter rather than calling `fetch` inside many child components. The supplied interface in `contracts/DataSourcesDataAdapter.ts` is a starting point, not a requirement to rename existing services.

Adapter responsibilities:
- List sources with filters and page controls.
- Load selected-source details.
- Load ingestion runs, coverage and field mappings independently.
- Return capability flags for actions supported by the actual environment.
- Surface typed errors/safe messages.

Provide `mock` and `REST` implementations only if useful in the repo. The mock adapter may filter/search the fixture and simulate normal UI states; it must never be represented as a live integration. If simulated delays are used, keep them deterministic and easy to disable in tests.

## State ownership

- Page owns query, filters, pagination and selected source ID.
- Drawer owns active internal tab but receives selected source from the page.
- Query/filter state stays stable when the drawer closes.
- Loading/error state is per resource; an unavailable coverage tab should not erase available overview details.
- No secrets or private upstream connection strings are passed into UI props.

## Error and capability handling

- If an operation is unsupported, display `Not configured` with a brief explanation, not a working-looking disabled control with no feedback.
- If the backend returns permission denied, show an appropriate restricted state and do not retry repeatedly.
- A `202 Accepted` run request means the run was queued, not that ingestion succeeded.
- Show retry actions only where capability metadata and the API confirm retry is allowed.

## Shared styling

Use `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md` and the actual tokens/components from the current repository. Do not duplicate global sidebar styles inside this module. Page-specific styles should be namespaced or composed with the repo's established styling pattern.
