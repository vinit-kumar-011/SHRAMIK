# SHRAMIK — Forecasts & Early Warnings Handoff

**Deliverable type:** page implementation handoff (not a completed React implementation)  
**Integration plan:** build as one independent React + TypeScript page/workspace and bind it into the existing SHRAMIK app later.  
**Page route:** use the existing repository's route convention; suggested route is `/forecasts`.  
**Internal views:** Forecast Overview, Risk Radar, Scenario Analysis, Model Performance, Alert Management.

## Start here

1. Read `CLAUDE_PROMPT_SHRAMIK_FORECASTS_EARLY_WARNINGS.md` and run it inside the existing SHRAMIK repository.
2. Treat `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`, `SHRAMIK_DASHBOARD_SPEC.md`, and `SHRAMIK_COMPONENT_INVENTORY.md` as canonical shared-system documents.
3. Follow `SIDEBAR_CONSISTENCY_LOCK.md`; the dashboard shell must be reused, not recreated.
4. Implement to `SHRAMIK_FORECASTS_EARLY_WARNINGS_IMPLEMENTATION_SPEC.md` and the API shapes in `SHRAMIK_FORECASTS_EARLY_WARNINGS_API_CONTRACT.md`.
5. Run `FORECASTS_QA_CHECKLIST.md` and record the real build/test/browser results in the implementation report.

## Package contents

- `CLAUDE_PROMPT_SHRAMIK_FORECASTS_EARLY_WARNINGS.md` — copy-ready Claude Code instructions.
- `SHRAMIK_FORECASTS_EARLY_WARNINGS_IMPLEMENTATION_SPEC.md` — one page, five internal views, layout, interactions and responsive behavior.
- `SHRAMIK_FORECASTS_EARLY_WARNINGS_API_CONTRACT.md` — proposed frontend service/API contract.
- `SHRAMIK_FORECASTS_EARLY_WARNINGS_COMPONENT_INVENTORY.md` — component responsibilities and adapter calls.
- `SIDEBAR_CONSISTENCY_LOCK.md` — exact shared-shell/navigation rules with Forecasts active.
- `FORECAST_DATA_SEMANTICS.md` — metric definitions, uncertainty, alert and provenance semantics.
- `FORECASTS_QA_CHECKLIST.md` — functional, responsive, accessibility and data-integrity checks.
- `DESIGN_LOCK.md` — precedence of visual sources and elements not to copy from screenshots literally.
- `VALIDATION_REPORT.md` — package validation status and implementation work still required.
- `reference/Forecasts_Five_View_Design_Board.png` — all five internal views in one board.
- `reference/Forecasts_Command_Centre_Concept.png` and `Forecasts_Command_Centre_Alternate.png` — single-screen concepts; components are visual references.
- `reference/views/` — cropped reference for each internal view.
- `reference/SHRAMIK_Dashboard_Reference.png` — authority for the existing dashboard shell.
- `assets/shared/` — reusable decorative assets only; never use these assets as statistical or geographic data.

## Important boundary

This package is a developer handoff/specification, not a finished page source project. It deliberately does not create a new Vite app or duplicate the dashboard shell. The developer must implement the module in the existing repository and use its router, tokens, shared components, authentication and test conventions.

The displayed forecast values, risk alerts, drivers, scenario results and model metrics in the visual references are **illustrative**. Do not ship them as real SHRAMIK data. Use the mock adapter only in development and label it clearly. Production data must come from configured forecasting and alert services.
