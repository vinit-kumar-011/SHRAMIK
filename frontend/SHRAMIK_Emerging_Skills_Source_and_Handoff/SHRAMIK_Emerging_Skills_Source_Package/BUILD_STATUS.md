# SHRAMIK Emerging Skills Intelligence — Delivery

## Files
- `index.html`: launch page
- `assets/main.js`: browser entry module
- `assets/EmergingSkillsPage.js`: precompiled page from the supplied TSX
- `assets/index.css`: compiled stylesheet from the supplied developer handoff project

## Fast preview
Serve this folder with a local HTTP server. For example:

```bash
cd SHRAMIK_Emerging_Skills_Production
python -m http.server 8000
```
Then open `http://localhost:8000`.

This fallback preview loads pinned React 18.3.1, ReactDOM 18.3.1, Lucide React 0.468.0 and Recharts 2.15.0 from esm.sh and uses Tailwind's browser CDN to cover utility classes introduced by the updated TSX. It therefore needs network access and is not an offline/self-contained bundle. The source has been transpiled at build time; the browser does not transpile TSX.

## Data status
The page uses the deterministic `SYNTHETIC_DEMO` adapter by default. All demo figures are illustrative and are not verified labour-market findings. Watchlist changes are in-memory only in demo mode. The component accepts a host-supplied `EmergingSkillsDataAdapter`; connect the host REST adapter and authentication when integrating with the main SHRAMIK app.

## Important build status
The full Vite build could not be completed in this environment because the supplied `node_modules` is incomplete and Windows-targeted (React, ReactDOM, Recharts, Vite and the Linux Rollup native package were absent). An attempt to restore dependencies via `npm ci` stalled, so this package provides a browser-runnable ESM preview plus the corrected source rather than claiming a successful Vite production build. For a normal Vite build on a network-enabled development machine, restore dependencies from the included lockfile, run `npm ci`, then `npm run build`.

## Validation performed
- TypeScript compiler transpilation: passed with no parser/transpiler diagnostics.
- Generated JavaScript syntax check: passed.
- Required source/spec/package files included in source archive: checked.
- Browser integration test: not verified in this environment; external CDN access may be blocked.

## Page functionality included
The component exposes five view tabs (Overview, Momentum, Connections, Regional Signals, Profiles & Evidence), filter apply/reset, adapter-driven reads with cancellation, retry/error messaging, skill comparison, evidence detail, regional selections, watchlist actions and recent alerts. Preview data remains synthetic; the host app must provide its authenticated API adapter for live results.
