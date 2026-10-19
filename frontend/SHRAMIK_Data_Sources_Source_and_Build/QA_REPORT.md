# SHRAMIK Data Sources — validation report

**Release examined:** standalone static build in `release/index.html` and React/TypeScript integration source in `src/`.

## Passed

- Self-contained HTML/CSS/JavaScript static release generated; no runtime JS/CSS CDN is required.
- Inline JavaScript syntax check passed (`node --check`).
- React/TypeScript source files transpile syntactically using TypeScript `transpileModule`: 7 files, 0 syntax diagnostics. This is not a full typecheck.
- Chromium runtime smoke checks passed (14 checks): initial registry and summary values derive from the fixture; search/filter and reset; pagination; opening and closing the detail drawer; unknown dates remain `Not reported`; independent ingestion, coverage and mapping tabs; local draft is session-only; responsive 390px page has no page-wide horizontal overflow; no runtime JS errors; and an API 503 produces an API error state without falling back to demo rows.
- ZIP archives created after package assembly are checked for integrity.

## Not verified / release gates

- `npm run build`, `npm run typecheck` and `npm test` have **not** passed. `npm ci` could not retrieve npm packages because registry requests failed with `EAI_AGAIN`; the local `node_modules` tree was incomplete. Rerun these commands once registry access is restored.
- Actual SHRAMIK API route names, response types, authentication, authorization, CORS, RLS/access scope and endpoint availability have not been checked against the running backend.
- No live upstream source was queried. Preview data remains `SYNTHETIC_DEMO`.
- The standalone build was exercised in Chromium using in-memory page content because direct file/local HTTP navigation is blocked in this execution environment; deploy or serve the page normally for final target-browser checks.
- Keyboard focus-loop and full screen-reader testing remain outstanding; visible focus states, labels, Escape-close handling and reduced-motion CSS are present.

This report distinguishes the runnable static UI from backend and framework build verification. It does not claim that source connectors or operational data are live.

## Shared shell alignment update (2026-10-19)
- Re-aligned desktop sidebar to the dashboard reference: full-height, flush-left 230px shell, dotted warm canvas, a single right divider, no rounded inset card/drop shadow.
- Repositioned navigation and sidebar workforce artwork/callout to match the reference geometry.
- Tightened the SHRAMIK wordmark/descriptor spacing while retaining the 85px shared topbar and global-search/geography/profile row.
- Preserved small-screen behavior: sidebar hides at <=900px; header and page occupy the full width.
- Updated both standalone HTML and React source styles so the shell no longer drifts between preview and app source.
- Browser screenshots and interaction smoke tests should be regenerated from the corrected HTML. These checks do not imply live API/auth integration.
