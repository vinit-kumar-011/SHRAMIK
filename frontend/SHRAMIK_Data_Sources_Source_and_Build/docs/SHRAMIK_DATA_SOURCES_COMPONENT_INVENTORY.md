# SHRAMIK Data Sources — Component Inventory

| Component | Responsibility | Inputs / behaviours | Important states |
|---|---|---|---|
| `DataSourcesPage` | Orchestrates page content and adapter calls; no global shell | query/filter/page state; open selected source | loading, ready, empty, error, permission denied |
| `DataSourcesHeader` | Title, intro, conditional create action | `canCreateSource` capability | create disabled/not configured, open draft form |
| `SourceSummaryCards` | Shows total, active, needs attention | API aggregate or counts derived from current agreed scope | loading, unavailable, ready |
| `SourceFilters` | Search and structured filtering | search, status, source type, agency, reset | default, filtered, no matches |
| `SourceRegistryTable` | Dense desktop source list | rows, sort/page state, select/view action | loading skeleton, ready, empty, error |
| `SourceRegistryCardList` | Mobile accessible equivalent | same rows and actions as table | ready, empty |
| `SourceStatusBadge` | Human-readable lifecycle/validation state | status enum, optional freshness | every state includes text/icon, not colour alone |
| `SourceDetailsDrawer` | Focus-managed source details surface | selected source ID and close callback | loading, ready, error |
| `SourceDetailsTabs` | Overview/history/coverage/mapping internal views | active tab | independently loaded tab data |
| `SourceOverviewPanel` | Describes selected source and key metadata | owner, type, purpose, method, periods, dates, provenance | unknown metadata explicit |
| `IngestionRunsTable` | Summarises retrieval/ingestion attempts | run list, capability flags | loading, no runs, success, warning, failed, not configured |
| `CoveragePanel` | Reports available geography/time/taxonomy coverage | coverage object and limitations | coverage available, partial, unavailable |
| `FieldMappingTable` | Shows source-to-canonical field mappings | mapping records and schema version | configured, partial, no mapping, error |
| `DataSourcesEmptyState` | No registered sources in current scope | description, optional permitted action | empty |
| `DataSourcesErrorState` | Safe error and retry affordance | safe message, retry callback | list/detail/tab errors |
| `LoadingSkeleton` | Stable loading layout | variant | loading |

## Existing primitives to prefer

Use the repository's shared components for buttons, form controls, table, drawer/dialog, tabs, badge, tooltip, skeleton, icons, pagination and notifications. Component names above are logical roles, not a command to duplicate an existing library.

## Component boundaries

- Page component receives shell/navigation context from composition; it does not define sidebar widths or topbar markup.
- Adapter owns data retrieval and mutation capability detection.
- Presentation components should be mostly pure and accept typed props.
- Status semantics live in a single utility rather than separate ad-hoc labels.
- Mock data must live outside UI components, in `examples/mock-data-sources.json` or the repository's existing fixture location.
