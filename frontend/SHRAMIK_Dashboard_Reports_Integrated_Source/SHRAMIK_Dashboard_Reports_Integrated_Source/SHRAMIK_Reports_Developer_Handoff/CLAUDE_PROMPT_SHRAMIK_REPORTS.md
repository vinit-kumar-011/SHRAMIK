# Claude Code Prompt — SHRAMIK Reports & Intelligence Briefs

You are implementing the **Reports & Intelligence Briefs** feature for SHRAMIK, an existing React/TypeScript labour-market intelligence application. Build this as an **independently integratable page module**; the owner is developing pages one by one and will bind them into the full app later.

## First: inspect, then implement

Inspect the current repository before changing files. Identify framework/version, package manager, routing, shared shell components, global design tokens, existing chart/table patterns, test tools, and any existing data-adapter conventions. Reuse existing patterns wherever possible. Do not replace project configuration, recreate the entire app, or install an overlapping component/chart library without a clear need.

Read these handoff files first:
1. `SHRAMIK_REPORTS_IMPLEMENTATION_SPEC.md`
2. `SHRAMIK_REPORTS_SIDEBAR_CONSISTENCY_LOCK.md`
3. `SHRAMIK_REPORTS_COMPONENT_INVENTORY.md`
4. `SHRAMIK_REPORTS_API_CONTRACT.md`
5. `SHRAMIK_REPORT_TEMPLATE_DESIGN_SPEC.md`
6. `SHRAMIK_REPORTS_DATA_SEMANTICS.md`

## Core product requirement

Implement one Reports page with **three internal views**, not three separate sidebar routes:

1. **Report Builder** (default): report type cards, geography/period/reference year, data-source policy, selectable report sections, and a live document outline/preview. Use the visual hierarchy in `reference/views/01-report-builder.png`.
2. **Report Library**: searchable/filterable saved-report table with status, region, type, period, created time and meaningful row actions. Use `reference/views/02-report-library.png`.
3. **Report Preview**: an actual document rendered from a structured `ReportDocument` model, with outline, section navigation, edit-section/select-sections actions, Save, PDF/Print, and CSV/data export where relevant. Use `reference/views/03-report-preview.png`.

The full board is `reference/SHRAMIK_Reports_Design_Board.png`. Treat it as a visual target only. Never use it as the actual page, a report cover image, a chart, a map, or a flattened document.

## UI implementation requirements

- Build with the repository's existing React and TypeScript setup.
- Export a clean `ReportsPage` route component that **does not hardcode a second production sidebar/topbar**. If useful for standalone review, build a clearly separated development-only shell preview; keep it out of the page module's production markup.
- Use the existing SHRAMIK global tokens/components. The global canvas is warm off-white with a dotted CSS texture; yellow is the main action colour; use the shared typography, card border, radius, shadows, control heights and spacing. Do not make a page-specific design system.
- Preserve the canonical sidebar from the Dashboard: Dashboard, Demand, Supply, Skill Gaps, Forecasts, Emerging Skills, Scenario Simulator, Reports (active), divider, Data Sources, Data Quality. Do not copy extra `Settings`, `Data Explorer`, `User Management` or `Access Requests` entries shown in some generated concepts unless the owner has explicitly approved a global navigation change. In final integration, the existing app shell owns the sidebar and topbar.
- Keep UI components presentation-focused. Fetch/assemble data through a typed `ReportsDataAdapter`; no hardcoded values directly in the components.
- Implement the interactions specified in the component inventory: report-type selection, section selection/select-all, scope and period controls, source policy, generate action, builder-to-preview transition, library search/filters, open/duplicate/retry actions where supported, section navigation, PDF/print flow, CSV export from structured table data, and clear save/generate statuses.
- Include loading, empty, error, stale, insufficient-data and retry states. Preserve user selections on failure. Don't silently switch from REST/API failure to mock data.
- Include accessibility: labelled controls, keyboard operation, visible focus, semantic buttons, table headers, chart alternatives/text summaries and reduced-motion support.

## Report design / renderer requirements

Build reusable HTML/React document components, not screenshots: cover, title/metadata, executive summary, KPI highlights, chart section, data table, map/region section, methodology, sources and limitations, header/footer. Add print-specific CSS for A4 pages, margins, explicit page breaks, `break-inside: avoid` for small visual units and sensible table continuation. Avoid a massive single canvas or rasterised report. Make text selectable. Use real SVG/chart output or table fallback. Do not use untrusted raw HTML for findings or source labels.

For the first milestone, the preview must render an actual HTML document from a typed mock report model. The PDF button may call the browser print dialog (`window.print`) with a print stylesheet if no PDF API exists. Do not pretend this is a server-generated downloadable PDF. Keep the export action behind an `ExportService`/adapter so a backend Playwright/Chromium PDF service can replace it later. CSV export should generate a real download from the selected structured dataset when such a dataset exists.

## Mock and backend boundaries

- Use deterministic mock fixtures from `examples/mock-state-report.json`, explicitly marked `SYNTHETIC_DEMO`.
- Define and use the interface in `contracts/ReportsDataAdapter.ts` and models in `contracts/report.types.ts` (adapt to existing repository naming if needed).
- REST mode is only enabled when the existing configured API base URL is present; proposed endpoints are in `SHRAMIK_REPORTS_API_CONTRACT.md` and may not exist yet.
- Never fabricate real source coverage, freshness, saved statuses, report IDs, completion results, model accuracy or current data. Mock values need a persistent, visible demo label.
- If the production report generation API is not implemented, the adapter must return a typed `NOT_CONFIGURED`/unsupported result and the UI should explain the current limitation; it must not show a false success.

## Keep scope appropriate for Claude Free

Implement in small stages and keep the repository changes focused:
A. Build the three-view page shell and functional Builder controls with mock adapter.
B. Build Report Library interactions using the adapter.
C. Build the HTML document template and print stylesheet.
D. Add API integration seams/CSV export and tests.
Do not attempt to build a whole general-purpose AI report-writing platform, database migrations, a PDF worker and the entire app at once. Use the existing backend schema/conventions after inspection; document any endpoint that is only proposed.

## Definition of done

- The page can render as a standalone module and can later sit inside the global shell without duplicate navigation.
- Three internal views work and maintain selection state appropriately.
- Generated preview is a real, selectable-text HTML report built from structured data.
- Mock provenance remains visible on preview and exports.
- Buttons do the action their label promises; unsupported backend actions explain they are not configured.
- Responsive behaviour works down to 320px without horizontal page overflow.
- Run the existing lint/typecheck/test/build commands if available. Report exactly which commands passed and which were not run; do not claim browser/build validation without doing it.
- Summarise files created/changed, how to run the page, expected integration props, and remaining backend work.

Start by inspecting the repository and outlining a compact implementation plan, then implement. Do not stop after writing a plan.
