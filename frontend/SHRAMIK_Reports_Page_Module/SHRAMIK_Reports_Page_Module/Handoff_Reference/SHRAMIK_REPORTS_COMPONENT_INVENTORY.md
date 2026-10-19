# SHRAMIK Reports — Component Inventory

| Component | Responsibility | Data/input | Required behaviour |
|---|---|---|---|
| `ReportsPage` | Route content for three internal views | `ReportsDataAdapter`, optional navigation callback | Does not duplicate production shell; handles top-level loading/error boundaries |
| `ReportsViewTabs` | Builder / Library / Preview tabs | current view | Accessible keyboard tabs; preserves draft state when switching |
| `ReportTypeSelector` | State, Sector, Skill, Policy Brief and Custom report types | supported types | Selection and clear descriptions |
| `ReportScopeForm` | Geography, period, reference year and optional comparison | supported options from adapter | Dependent options, validation, unsupported geography handling |
| `SourcePolicySelector` | Latest validated data or a fixed snapshot | source options/snapshot IDs | Honest freshness/coverage display; no fake source status |
| `ReportSectionSelector` | Choose report sections | section registry | Individual toggles; Select all/Deselect all; required sections protected |
| `ReportConfigSummary` | Summarises current report draft | `ReportConfig` | Always reflects draft, not stale generated config |
| `BuilderDocumentPreview` | Quick outline/preview before generation | draft document, if supported | Shows partial/estimated preview distinctly from final generated report |
| `GenerateReportButton` | Starts report generation | valid `ReportConfig` | Validating, loading, success, error, not-configured; duplicate-submit guard |
| `ReportLibraryToolbar` | Search and filter reports | query/filter state | Clear filters, query debounce/cancel for remote search |
| `ReportLibraryTable` | Browse past reports | `ReportListItem[]` | Semantic table; loading, empty, error, paging/sort if supported |
| `ReportStatusBadge` | Displays queue/run/completion/failure state | actual adapter status | Never hard-code completed in REST mode |
| `ReportRowActions` | Open, duplicate, retry; delete only if supported | report capabilities | Permission aware; confirmation for destructive operations |
| `ReportOutline` | Section navigation | document sections | Scroll/focus selected section, visible active section |
| `ReportDocument` | Structured document renderer | `ReportDocumentModel` | Selectable text, stable section order, provenance and limitations |
| `ReportCover` | Branded report front page | title, type, geography, period, metadata | New printed page; omit unknown metadata rather than invent |
| `ExecutiveSummarySection` | Findings and key indicators | report blocks/metrics | Claims tied to evidence; no made-up conclusions |
| `MetricHighlightGrid` | Summary indicators | `ReportMetric[]` | Unit, period, provenance and null states |
| `ReportChartSection` | Charts in report document | typed chart block | Units, labels, legend, caption, accessible text/table fallback |
| `ReportMapSection` | Regional map if geometry/data is available | verified geometry and metrics | Missing value distinct from zero; no fake PNG choropleth |
| `ReportDataTable` | Data tables and rankings | typed columns/rows | Printable widths, numeric units, page-splitting support |
| `MethodologySection` | Defines calculations and methods | approved metadata | Source/model/method versions shown when supplied |
| `SourcesAndLimitationsSection` | Source list, coverage, caveats | source/provenance metadata | Observation period, dataset version and limitations |
| `DocumentExportControls` | Print/PDF and CSV export | export service | Actual print/CSV operation; no false success |
| `MockReportsDataAdapter` | Local deterministic fixture mode | `examples/mock-state-report.json` | Persistent `SYNTHETIC_DEMO` label |
| `RestReportsDataAdapter` | Calls SHRAMIK backend | configured API host/session | Typed errors, abort support, never silently switches to mock |

Keep components focused and reuse existing SHRAMIK buttons, inputs, cards, icons, design tokens and typography where available. Do not create page-specific clones of shared components.
