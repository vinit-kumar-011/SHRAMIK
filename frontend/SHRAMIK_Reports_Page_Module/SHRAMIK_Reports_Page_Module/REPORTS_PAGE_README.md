# SHRAMIK Reports & Intelligence Briefs

This page is integrated into the existing SHRAMIK app and uses the shared navigation shell.

## Preview

1. Extract `SHRAMIK_Reports_Static_Bundle.zip`.
2. Open a terminal in the extracted folder.
3. Run `python -m http.server 8000`.
4. Open `http://localhost:8000/reports.html`.

Use an HTTP server rather than opening `reports.html` with `file://`. The static fallback loads React 18/ReactDOM 18 and the selected fonts from external CDNs.

## Source

`SHRAMIK_Dashboard_Reports_Integrated_Source.zip` contains the complete editable dashboard source, shared app shell, Reports module, static fallback build, tests, docs and the supplied handoff references. The focused `SHRAMIK_Reports_Page_Module.zip` contains the Reports component, document renderer, CSS, adapters, types, fixture, tests, and supporting contract/spec documents.

## Tests

```bash
node --test tests/*.test.cjs
node scripts/build-static-fallback.cjs
node scripts/test-static-bundle.cjs
```

The current combined test result is 30 passed / 0 failed. The static fallback is compiled and smoke-tested, but this is not a Vite-generated build. Normal Vite build/typecheck, browser visual regression and live API integration remain outstanding because dependencies could not be installed from the registry in this environment.

## Demo and export notes

The default adapter contains synthetic example content. The report preview and CSV identify that provenance. PDF uses browser Print / Save as PDF when no server-PDF capability is configured; no server-side PDF is claimed to have been created. The REST routes in the handoff are proposals until confirmed by the backend team.
