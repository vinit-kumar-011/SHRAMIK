# Claude Free — Prompt 1: Build the Reports page module

Please inspect this project first, then implement SHRAMIK's **Reports & Intelligence Briefs** as an independent React/TypeScript page module that I can integrate into the full app later.

Read: `SHRAMIK_REPORTS_IMPLEMENTATION_SPEC.md`, `SHRAMIK_REPORTS_SIDEBAR_CONSISTENCY_LOCK.md`, `SHRAMIK_REPORTS_COMPONENT_INVENTORY.md`, and the existing global design system. Keep scope to the UI module and its adapter seam; do not build an entire app or duplicate the production sidebar/topbar. If you need a shell to inspect the page locally, keep a development-only preview wrapper separate from `ReportsPage`.

Implement three internal views: **Report Builder** (default), **Report Library**, and **Report Preview**. Follow `reference/views/01-report-builder.png`, `02-report-library.png`, and `03-report-preview.png` as references. These images are not UI assets. Use React components, normal HTML/CSS, and real chart/table structures; never embed screenshots.

Builder requirements: report type selection (State, Sector, Skill, Policy Brief, Custom), region and period, source policy, configurable report sections, select-all, advanced options, Generate Report, live document outline/preview. Library requirements: search, type/region/status filters, status-aware table, open/duplicate/retry actions only where supported by the adapter. Preview requirements: readable document template, outline navigation, Save, Print/PDF via browser print if there is no PDF endpoint, and CSV download from real structured demo table data.

Use a typed adapter from `contracts/ReportsDataAdapter.ts` and models from `contracts/report.types.ts` (fit these into existing conventions rather than copying blindly). Use `examples/mock-state-report.json` for deterministic mock mode. Keep `SYNTHETIC_DEMO`/illustrative labels visible. Do not invent actual SHRAMIK results. Include loading, empty, error, stale and not-configured states. The REST endpoints are proposals; don't pretend they exist if the repo doesn't implement them.

Use the canonical shell/navigation from `SHRAMIK_REPORTS_SIDEBAR_CONSISTENCY_LOCK.md`. The existing Dashboard sidebar is the source of truth for sizes/labels/order; only Reports is active. Use shared tokens rather than per-page replacements.

Work in small commits/files, avoid new dependencies if the project already has suitable libraries, run available lint/typecheck/tests/build, and report honestly which checks you completed. Finish the page before expanding backend scope. See `SHRAMIK_REPORTS_IMPLEMENTATION_SPEC.md` for the exact requirements.
