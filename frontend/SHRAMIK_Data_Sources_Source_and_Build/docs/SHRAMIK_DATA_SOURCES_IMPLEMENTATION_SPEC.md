# SHRAMIK Data Sources & Integrations — Implementation Specification

**Status:** Frontend implementation contract. Proposed behaviour only; this document does not assert that corresponding routes or backend jobs are implemented.

## 1. User goals

- Find a registered source and understand what it contributes to SHRAMIK.
- See the source owner, data type, geographic scope, source reporting period, last successful retrieval and status.
- Open a source without losing the registry context.
- Inspect recent ingestion outcomes, available coverage periods and field-mapping quality when those data are available.
- Identify missing, stale, failed, or awaiting-validation sources without mistaking demo fixtures for real operational health.

## 2. Page structure

One sidebar destination: **Data Sources**. The page content, not the global app shell, is owned by this module.

### Header
- Breadcrumb: `Home / Data Sources` using the application's existing breadcrumb conventions.
- Page title `Data Sources` with concise supporting copy: `Manage and monitor the datasets used in SHRAMIK. Track integration status, freshness and key details.`
- Primary action `Add New Source` only if a create-source flow is supported. In mock mode it may open a local draft flow clearly labelled as demo; it must not claim an integration has been configured or connected.

### Summary cards
Use a restrained strip of three cards:
1. **Total sources** — count of all records in the currently authorised scope.
2. **Active** — records whose source lifecycle state is active and whose last successful retrieval/validation is not currently classified as stale under backend policy. If backend status does not support this definition, display the backend-provided count and definition instead.
3. **Needs attention** — records explicitly in `PENDING_VALIDATION`, `STALE` or `FAILED`. Keep `NOT_CONFIGURED` distinct unless the product owner explicitly defines it as part of this count.

Counts must be derived from the loaded dataset or returned aggregate metadata, never hard-coded separately from the registry. With filters applied, either update counts to reflect the filtered subset or visibly state that cards reflect all accessible sources; choose one convention and use it consistently.

### Search and filters
- Search by source name, agency/owner, type and tags.
- Status filter.
- Source type filter.
- Agency/owner filter if available.
- Reset button clears all filters.
- Filters combine predictably, and the visible result count updates.
- Search must be debounced if wired to remote queries; local mock filtering may be immediate.

### Source registry table
Recommended desktop columns:
- Source (source name, short description, optional tags)
- Type
- Agency / owner
- Coverage
- Reporting period
- Last updated / last successful retrieval (label precisely; these timestamps are not interchangeable)
- Status (text plus icon)
- Actions

Row behaviour:
- `View` opens the source-details drawer for that row.
- Overflow menu contains only actions the adapter advertises. It may include `View details` or `Copy source ID`; do not invent edit/delete/retry behaviour if unsupported.
- Selecting another row updates the drawer and preserves scroll/filter context.
- Add pagination or load-more if the API is paginated. The shown mock reference uses a page size of eight, but do not assume total rows are always eight.
- On narrow screens, transform each row into a labelled card or use an accessible horizontal table scroller; never cause whole-page horizontal overflow.

### Source details drawer
A right-side drawer on large screens, near-full-width sheet on tablets and full-screen modal/panel on mobile. Include close button, source name, source type and status.

Internal tabs are **inside the drawer** and do not add sidebar routes:
1. `Overview` (default): purpose, owner, source type, access mode, reporting period, last source publication/release date if known, last successful retrieval, source lifecycle status, tags, notes, provenance.
2. `Ingestion History`: recent ingestion/retrieval runs with started/completed time, duration, records retrieved, accepted/rejected counts, warning count, status, and safe detail action where supported.
3. `Data Coverage`: geographic scope and actual available reporting periods, with coverage limitations. A geographic visual is optional and must use real supported coverage; a coverage table is sufficient for v1.
4. `Field Mapping`: source-field to canonical-field mapping, transformation notes, mapping state, and unmapped fields. If no mappings are returned, show a helpful `Mapping is not configured` state rather than an empty table implying perfection.

Keep drawer overview readable. Do not dump every field and run into one long first screen; advanced details belong in their relevant tabs.

## 3. Data and terminology

- `source reporting period`: period described by the source dataset.
- `source release/publication date`: when the upstream source published that dataset/version, when known.
- `last successful retrieval`: time SHRAMIK last successfully retrieved/ingested the source, not the publication date.
- `last validated at`: time the data passed SHRAMIK's validation process, if available.
- `freshness state`: a rule-based assessment against an explicit source-specific expected-update policy; never infer `stale` from retrieval date alone.
- `coverage`: supported geographic/time/taxonomy scope, not the number of records by itself.
- `provenance`: `SOURCE_BACKED`, `SYNTHETIC_DEMO`, `DERIVED` or `MIXED`, where applicable.

Display `Unknown` / `Not reported` where information is absent. Do not substitute today's date, zero, `India`, or `Active` for missing metadata.

## 4. Suggested component decomposition

- `DataSourcesPage` — page-level state, calls adapter, contains page content only.
- `DataSourcesHeader` — title, description, conditional add action.
- `SourceSummaryCards` — derived or backend-provided summary totals.
- `SourceFilters` — search and select filters.
- `SourceRegistryTable` / `SourceRegistryCardList` — desktop/mobile presentations.
- `SourceStatusBadge` — semantic, text-labelled state.
- `SourceDetailsDrawer` — accessible focus-managed details surface.
- `SourceDetailsTabs` — overview, ingestion, coverage, mapping.
- `SourceOverviewPanel` — key source metadata.
- `IngestionRunsTable` — run history and empty/error states.
- `CoveragePanel` — available geography/periods plus limitations.
- `FieldMappingTable` — mappings, warnings and unmapped fields.
- `DataSourcesEmptyState`, `DataSourcesErrorState`, `LoadingSkeleton`.

Use existing shared Button, Input, Select, Table, Drawer/Dialog, Badge, Tabs, Tooltip, Skeleton and Icon primitives wherever they exist. Do not create parallel base components just for this route.

## 5. State model

Represent states explicitly:
- Page list: `loading`, `ready`, `empty`, `error`, `permission-denied`.
- Detail drawer: `closed`, `loading`, `ready`, `error`.
- Per-tab data: loading/error/empty/ready independently; one tab failing should not erase all other source details.
- Actions: `idle`, `pending`, `succeeded`, `failed`, `not-configured`.

Preserve search/filter state when the drawer opens/closes. Ignore stale detail responses after the user selects a different source. Cancel in-flight requests on unmount when supported. Avoid duplicate mutation submissions.

## 6. Responsive behaviour

- Desktop (>=1200px): registry as the primary area; drawer approximately 400–460px wide or project-token equivalent; summary cards in three columns.
- Tablet (768–1199px): tighten spacing; drawer overlays the registry rather than crushing the table; filters wrap onto multiple rows.
- Mobile (<=767px): single-column heading and metrics; filters in a wrap or collapsible filter area; source rows become labelled cards or horizontally scrollable table; detail view becomes full-screen; tabs can scroll horizontally with visible focus; actions remain reachable without overflow.
- Maintain usable targets, visible keyboard focus and reduced-motion support. Avoid hover-only controls.

## 7. Shared shell and visual system

The global application owns sidebar and topbar. `DataSourcesPage` must not render an independent production sidebar/topbar. The supplied page reference may guide page content density, yellow primary action, warm canvas, bordered cards and detail drawer; the global design system and existing dashboard shell are the authority for the actual shell.

Canonical app sidebar order:
1. Dashboard
2. Demand
3. Supply
4. Skill Gaps
5. Forecasts
6. Emerging Skills
7. Scenario Simulator
8. Reports
9. Divider
10. Data Sources (active)
11. Data Quality

Do not add User Management, Settings, Access Requests or other unapproved routes from the generated visual.

## 8. Security and permissions

- Never render API keys, bearer tokens, client secrets or private connection strings.
- Any create/edit/retry action must be permission-gated by backend capabilities, not merely hidden from view.
- Never call external government, job-platform or partner APIs directly from the browser.
- Errors should be safe user-facing messages; detailed stack traces and secrets stay server-side.
- Registry/list/detail access must match the user's backend authorisation scope.

## 9. Acceptance criteria

- Search, filters, reset, pagination and source selection work with mock data.
- Opening/closing/changing a drawer selection preserves registry state.
- Each internal tab renders valid data or a clear empty/not-configured state.
- Summary numbers come from the source list or API aggregates and use one documented count convention.
- Freshness, source period, publication date and retrieval time are labelled separately.
- `SYNTHETIC_DEMO` provenance is visible whenever fixture data is visible.
- The module imports the shared shell components rather than duplicating global navigation.
- It never displays credentials or claims a connection succeeded because a mock record says so.
- Responsive, keyboard, focus, empty, loading, failure, and reduced-motion states are checked.
- Existing repo lint, typecheck, tests and build are run where available; the developer reports actual results rather than asserting success without running them.
