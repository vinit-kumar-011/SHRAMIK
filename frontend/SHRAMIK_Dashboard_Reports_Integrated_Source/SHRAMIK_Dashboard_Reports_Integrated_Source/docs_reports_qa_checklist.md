# SHRAMIK Reports — QA Checklist

## Builder
- [ ] Type selection updates the configuration and helper text.
- [ ] Geography/period/reference year options only show supported values.
- [ ] Dependent options update correctly; invalid selections are not silently kept.
- [ ] Section toggles and Select all/Deselect all work.
- [ ] Generate validates required fields and blocks duplicate requests.
- [ ] Successful mock generation switches to Preview with an explicit demo label.
- [ ] Errors preserve inputs and offer a meaningful retry.
- [ ] Editing configuration after generation marks previous results stale.

## Library
- [ ] Search and filters affect the displayed adapter data.
- [ ] Empty search, empty library, loading and error states work.
- [ ] Status labels reflect actual adapter/server state.
- [ ] Open actions load the selected report.
- [ ] Duplicate/retry/delete are visible only if the adapter supports them and permissions allow.
- [ ] Pagination/sorting, if present, preserve filter state.

## Document preview / export
- [ ] Preview is real structured HTML and selectable text, not a PNG.
- [ ] Report sections follow selected section order.
- [ ] Chart/table data matches report model and shows units/periods.
- [ ] No-data sections explain unavailability instead of showing zero.
- [ ] Source/methodology/limitations remain in preview and printed output.
- [ ] Synthetic-demo label remains visible on every relevant page/CSV.
- [ ] Print hides app shell/buttons and uses correct page margins/breaks.
- [ ] Long tables and charts do not clip or overlap in PDF/print.
- [ ] PDF button uses browser print fallback unless real endpoint exists; no false success.
- [ ] CSV download contains the selected structured rows and appropriate column headers.

## Integration, accessibility and responsiveness
- [ ] ReportsPage does not duplicate global sidebar/topbar in production.
- [ ] Active sidebar item is Reports when hosted by the app shell.
- [ ] Keyboard navigation, visible focus, labels and semantic tables work.
- [ ] Reduced-motion preference is respected.
- [ ] Test viewport widths 320, 390, 768, 1024 and 1440 px.
- [ ] No page-wide horizontal overflow on mobile.
- [ ] REST failures never silently fall back to demo data.
- [ ] Lint, typecheck, tests and build run if available; report exactly what was run.
