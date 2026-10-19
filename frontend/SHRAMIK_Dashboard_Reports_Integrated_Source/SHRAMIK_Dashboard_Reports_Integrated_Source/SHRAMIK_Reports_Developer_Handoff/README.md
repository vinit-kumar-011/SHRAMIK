# SHRAMIK — Reports & Intelligence Briefs

**Purpose:** Developer handoff for an independently built, integration-ready React/TypeScript Reports page. It is a specification and prompt package, not a completed implementation.

## Start here (Claude Free-friendly)

1. Open your SHRAMIK frontend project/workspace.
2. Give Claude only `PROMPTS_FOR_CLAUDE_FREE/01_BUILD_REPORTS_PAGE.md` first, plus `SHRAMIK_REPORTS_IMPLEMENTATION_SPEC.md`, `SHRAMIK_REPORTS_SIDEBAR_CONSISTENCY_LOCK.md`, and `SHRAMIK_REPORTS_COMPONENT_INVENTORY.md` if it can read files.
3. Ask it to inspect the repository and implement the Reports page as an independent React module. Do not let it generate an entire new application if one already exists.
4. After the page is working, use `PROMPTS_FOR_CLAUDE_FREE/02_REPORT_TEMPLATE_AND_PRINT_PDF.md` to implement the reusable document renderer and print layout.
5. Finally use `PROMPTS_FOR_CLAUDE_FREE/03_REVIEW_TEST_AND_FIX.md` to review responsive layout, interactions and integration boundaries.

Alternatively, use `CLAUDE_PROMPT_SHRAMIK_REPORTS.md` as the single comprehensive prompt. If Claude Free starts losing context, use the three smaller staged prompts instead.

## Files

- `reference/SHRAMIK_Reports_Design_Board.png`: visual reference for Builder, Library and Preview.
- `reference/views/`: cropped references for each of those views.
- `reference/SHRAMIK_Dashboard_Reference.png`: authority for the shared app shell.
- `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`: canonical visual system copy for implementation reference.
- `SHRAMIK_REPORTS_IMPLEMENTATION_SPEC.md`: layout and behaviour contract.
- `SHRAMIK_REPORTS_COMPONENT_INVENTORY.md`: component responsibilities and states.
- `SHRAMIK_REPORTS_API_CONTRACT.md`: proposed frontend/backend contract. These endpoints are proposals, not proof of existing routes.
- `SHRAMIK_REPORT_TEMPLATE_DESIGN_SPEC.md`: document design and page layout rules.
- `SHRAMIK_REPORT_RENDERING_ENGINE_DESIGN.md`: how the HTML template becomes a paginated PDF.
- `SHRAMIK_REPORTS_INTEGRATION_CONTRACT.md`: how this module plugs into the later app shell.
- `SHRAMIK_REPORTS_DATA_SEMANTICS.md`: provenance and report correctness rules.
- `SHRAMIK_REPORTS_SIDEBAR_CONSISTENCY_LOCK.md`: shared navigation rules.
- `SHRAMIK_REPORTS_QA_CHECKLIST.md`: acceptance checklist.
- `contracts/`: typed adapter and report model examples.
- `examples/mock-state-report.json`: deliberately synthetic fixture for UI development only.

## Important implementation boundary

Build the Report Builder, Report Library and Report Preview UI first, using a typed mock adapter. Create a **real document preview** from structured report data using HTML/CSS components; do not embed the design-board screenshot as the interface. The PDF button can use the browser print dialog in the first frontend milestone (`window.print` with print-specific CSS). A production PDF service using Playwright/Chromium belongs on the backend and is specified separately. The page must not claim that a file was generated or saved unless the operation actually succeeded.

All generated values in the included fixture are synthetic. Keep the `SYNTHETIC_DEMO` label visible anywhere those fixture values are shown or exported.
