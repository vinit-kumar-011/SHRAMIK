# SHRAMIK Dashboard + Skill Gaps — Static Bundle

This folder is a review/deployment bundle of the unified SHRAMIK Dashboard and Skill Gap Analysis app. It is generated from the React + TypeScript source in the parent project.

## Entry points

- `index.html` opens the Dashboard.
- `skill-gap-analysis.html` opens **Skill Gaps** inside the same shared app shell.
- Both pages use the exact same built application bundle, header, sidebar, drawer, CSS tokens, and navigation behavior. The Skill Gaps route changes only the selected global nav item and page content.

## How to try it

Extract the ZIP, keep all contents together, and serve the folder with any static HTTP server. For example, with Python installed:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/` or `http://localhost:8000/skill-gap-analysis.html`.

## Data mode and backend connection

`config.js` defaults to clearly-labelled illustrative/mock data. To use the REST adapter, set:

```js
window.SHRAMIK_CONFIG = {
  apiBaseUrl: 'https://YOUR-SHRAMIK-API-HOST'
};
```

The host must implement the endpoint and response contract documented in `docs/API_CONTRACT.md` and `docs/skill-gap-analysis/SHRAMIK_SKILL_GAP_ANALYSIS_API_CONTRACT.md`. Confirm route names and envelope shapes with the backend before enabling it. API failures are surfaced; they do not silently fall back to mock data.

The map is unavailable in demo mode because verified, licensed, versioned India state/UT GeoJSON and its canonical code crosswalk are not supplied. A measured supply-demand flow is shown only if compatible nodes/links arrive from the API. The illustrative map PNG is never treated as data geometry.

## Build provenance — important

This `dist/` was generated with the installed TypeScript compiler by `scripts/build-static-fallback.cjs`, because npm registry DNS resolution failed in the build environment and project dependencies were not installed. **It is a custom precompiled static fallback bundle, not an output of Vite's normal production build.**

The bundle's JavaScript, CSS, SVG icon components, and images are local. It loads React 18.3.1 and ReactDOM 18.3.1 from cdnjs and fonts from Google Fonts, so those CDNs must be reachable. For a fully self-contained production build, use a machine with npm access and run `npm install` then `npm run build` in the source project.

## Validation actually performed

- Dashboard adapter + Skill Gap adapter tests: 11 passed, 0 failed.
- TypeScript/TSX parser checks: 11 files passed.
- Custom production bundle JavaScript syntax check: passed.
- Static module-loader/root mount smoke test: passed.
- Shared dashboard/gap entry check: passed (identical app entry markup).
- Source and generated CSS parse checks: passed.
- Required image assets and JS/config entry references: passed.
- Standard Vite build and browser-based visual/responsive regression: not completed.
