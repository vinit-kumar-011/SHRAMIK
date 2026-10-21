# Claude Free — Prompt 2: Build the designed report template and print/PDF path

Continue from the working Reports page. Read `SHRAMIK_REPORT_TEMPLATE_DESIGN_SPEC.md` and `SHRAMIK_REPORT_RENDERING_ENGINE_DESIGN.md`.

Implement reusable report-document components driven by a typed `ReportDocument`: cover; report title and metadata; executive summary; KPI callouts; chart panel; table; regional map/summary; methodology; source register; limitations; document header/footer. Use a separate document stylesheet with A4 page sizing, margins, readable typography, print colour preservation where possible, controlled page breaks, and reasonable table/page continuation. The report must be actual HTML with selectable text and vector charts where possible—not a screenshot, an iframe screenshot or a single canvas.

For this frontend milestone, make the Preview view render the selected structured report with explicit mock provenance. Implement `Print / Save as PDF` with `window.print()` and a dedicated `@media print` stylesheet when no server PDF endpoint is configured. Make sure print styles hide app chrome and preview controls and show only the report document. Keep this behind an `ExportService` abstraction so it can later call a backend Playwright/Chromium renderer. Do not claim a server-side PDF has been generated when using the browser print flow.

CSV export should create a real CSV download from a selected structured table. Never use fake success toast messages. Test the print view and document page-break CSS as far as the available environment allows, and clearly report any browser/PDF checks you couldn't run.
