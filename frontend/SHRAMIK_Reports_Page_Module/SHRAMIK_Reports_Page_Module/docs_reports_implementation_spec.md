# SHRAMIK Reports & Intelligence Briefs — Implementation Specification

**Purpose:** an integration-ready React page module for building, previewing, managing and exporting evidence-backed SHRAMIK reports. This is an implementation contract, not proof that the UI/API already exists.

## 1. User goals

- Configure a report for a geography, period and reporting type.
- Select the relevant analytics sections and understand what will be included.
- Generate a structured report from available backend results.
- Preview the report as a designed multi-page document before export.
- Find and reopen previously generated reports.
- Export a PDF for decision-makers and CSV for underlying table data.
- Trace metrics to their definitions, sources, observation periods, model versions and limitations.

## 2. Page views

One sidebar route, `Reports`, with three internal views. Only one view is active at a time.

### A. Report Builder (default)

Desktop composition: page heading and brief intro; left/configuration area taking roughly 56–60% of content width; right live outline/document preview area taking 40–44%. At narrower widths, stack configuration before preview and allow a compact preview summary.

Controls:
- Report type: State Report, Sector Report, Skill Report, Policy Brief, Custom Report.
- Geography: country/India, supported State/UT, district only when coverage supports it, and optional comparison geography if supported.
- Reporting period and reference year for metrics; only supported values should be selectable.
- Source/data policy: latest available validated data by default, or a fixed snapshot/version when backend supports it. Show source status and data coverage; no fake traffic-light states.
- Report sections with descriptive helper labels and select-all: Executive Summary; Demand Analysis; Supply Analysis; Skill Gap Analysis; Emerging Skills; Forecasts & Early Warnings; Scenario Analysis; Regional Breakdown; Sector Breakdown; Occupation Analysis; Policy Recommendations; Data Sources & Methodology.
- Advanced options: title, language only if supported, audience/brief length if supported, compare region, inclusion of uncertainty/technical appendices, output format. Do not display controls with no defined behaviour.
- Generate Report button and clear validation. Disable generation only with an explanation.

On successful generation, transition to the Preview view and return a real `ReportRecord`/`ReportDocument` from the adapter. Keep the configuration available to edit/regenerate.

### B. Report Library

Search by report title/identifier. Filters: report type, geography, period and status. Table columns: title, type, geography, period, generated/updated timestamp (only if backend supplies it), status, provenance/data snapshot, actions. Provide loading, no reports, no matches, permission denied, API error, failed generation and retry states. Actions are adapter-backed: Open, Duplicate/Use as template, Retry if a generation failed, and Delete only if delete is implemented and permitted. Do not hard-code rows with a “Completed” status in REST mode.

### C. Report Preview

Two-panel screen on desktop: table-of-contents/section outline on the left; document preview on the right. On mobile, switch outline to a disclosure list above the document. Buttons: back to edit, save/update if supported, Print / Save as PDF, Export table data / CSV, and share only if backend permissions and sharing routes exist.

The document preview is a React/HTML document assembled from a structured `ReportDocument` object. It must be real text and visual components, not a full-screen screenshot. Section outline click scrolls to the matching section. A report with unavailable data shows an explanatory section/omission note, not a fake zero. Source footnotes and report metadata remain present.

## 3. Document contents/layout

A standard report can use this sequence (selected sections may vary):
1. Cover page (brand, report type/title, geography, period, publication/generation date when provided, snapshot/model labels, decorative artwork).
2. Executive summary and key findings.
3. KPI summary with explicit metric names/units/periods.
4. Analytical sections selected by the user (charts, tables, maps, written interpretations).
5. Regional, sector and occupation tables as selected.
6. Methodology, source list, definitions, data coverage, uncertainty and limitations.
7. Appendix/data tables where selected and supported.

Policy Brief can use a shorter layout with key question, findings, implications and recommendations. State/Sector/Skill reports use the corresponding geographic or taxonomy breakdown. Shared typography, colour, table/chart/map styles must stay consistent.

## 4. State model

Use explicit states such as `idle`, `validating`, `generating`, `ready`, `saving`, `exporting`, `failed`, `not-configured`, `stale`. A configuration change after generation marks the previous preview as stale. Preserve user inputs on error. Ignore or cancel stale requests. Avoid double generation.

Builder may have separate `draftConfig` and `applied/generatedConfig`. Report content is immutable to a generation snapshot unless the user regenerates; do not quietly update an existing PDF to reflect newer data without changing its report/version metadata.

## 5. Data and integration

Use `ReportsDataAdapter` (see `contracts/ReportsDataAdapter.ts`) for options, preview/draft assembly, listing saved reports, creating a report, status retrieval, record retrieval, exporting, and saving. A deterministic mock adapter powers development. A REST adapter uses only configured backend URLs and documented response contracts.

Do not put source API keys in browser code. Do not fetch upstream government APIs directly from the report UI. The backend must return approved aggregates/analytics outputs plus provenance. `SYNTHETIC_DEMO`, `SOURCE_BACKED`, `DERIVED` and `MIXED` provenance should be visible where applicable.

## 6. Shared shell and design

The full application owns the canonical shell. `ReportsPage` renders page content and expects shell/navigation context through composition/integration. A development-only shell preview may be provided separately. Sidebar visual reference is `reference/SHRAMIK_Dashboard_Reference.png`; report design board is `reference/SHRAMIK_Reports_Design_Board.png`.

Use SHRAMIK global tokens: canvas `#F7F6F0`, surface `#FFFEFA`, muted surface `#F0EFE8`, ink `#171717`, outline `#292929`, muted text `#62625C`, yellow `#F2D34F`, navy `#203A5B`, orange `#EB791D`, teal `#20A89C`. Reuse the application's actual token definitions and shared components rather than copying values into page-specific CSS.

## 7. Responsive rules

- Desktop (>=1200px): Builder split layout; Library full-width table; Preview with outline and report content side-by-side.
- Tablet (768–1199px): tighter gutters; builder sections adapt to two columns; preview outline becomes narrower or collapsible.
- Mobile (<=767px): stack fields, section tiles and document view; tables become horizontally manageable or card rows without causing page-wide overflow; sticky bottom CTA only if it does not cover content.
- Print: hide app shell, tabs, controls and buttons; print only the document. Use dedicated page margins and break rules.

## 8. Acceptance criteria

- Three views behave as one route/internal tab workspace.
- Builder selections drive the preview outline and generated document.
- All actions have meaningful outcomes or a truthful not-configured message.
- Mock provenance remains visible on preview/export.
- Report preview consists of selectable HTML text plus charts/tables, not an image.
- CSV export produces a real CSV from structured data.
- Print flow applies report-specific CSS; server PDF status is never faked.
- Shared shell is not duplicated in production `ReportsPage`.
- Loading/empty/error/stale/insufficient-data states are implemented.
- Responsive, keyboard, focus and reduced-motion checks are completed or explicitly marked pending.
- Existing project lint/typecheck/test/build commands are run; results are reported accurately.
