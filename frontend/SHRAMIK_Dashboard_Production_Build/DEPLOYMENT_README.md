# SHRAMIK Dashboard — Static Production Bundle

This folder is the static dashboard bundle. Upload the contents of this folder to the root of a static web host, or serve it from a web server that can serve `index.html`, JavaScript, CSS, and PNG assets.

## What's included

- `index.html` — production entry page
- `app.js` — TypeScript/JSX precompiled at build time; no browser-side Babel compiler
- `shramik-dashboard.css` — dashboard styles
- `assets/` — all eight dashboard image assets
- `config.js` — deployment configuration
- `BUILD_REPORT.json` — build method and validation record

## Data mode

The default is the dashboard's clearly-labelled mock adapter. To activate the REST adapter, change `config.js` to:

```js
window.SHRAMIK_CONFIG = {
  apiBaseUrl: 'https://YOUR-SHRAMIK-API-HOST'
};
```

The backend must implement the routes and response contracts documented in `docs/API_CONTRACT.md` in the source package. This bundle does not include a backend or auth service. Keep mock/demo values labelled as such; do not present them as verified labour-market statistics.

## Runtime dependencies

This static build loads React 18.3.1 and ReactDOM 18.3.1 from cdnjs, and fonts from Google Fonts. Dashboard JS, CSS, icons and image assets are local. The host browser must be able to reach those CDNs. The app itself does not require Babel at runtime.

## Build provenance and limitation

This is a custom static production bundle generated with the TypeScript compiler available in the build environment. The standard Vite `npm run build` was not run because the npm registry could not be resolved from that environment and dependencies were not installed. The normal Vite build remains the preferred fully bundled build when the project dependencies can be installed; run `npm install` followed by `npm run build` in the source project. That Vite build bundles React and the icon package locally rather than loading React from cdnjs.

## Validation performed

- TypeScript/JSX transpilation completed without transpilation diagnostics.
- Generated JavaScript syntax check passed.
- Production module-loader/root-initialization smoke test passed.
- Existing adapter test suite passed: 4/4.
- Static HTML, CSS parsing, asset-presence and no-runtime-Babel checks passed.
- A complete browser visual test and Vite production build were not completed in the build environment.
