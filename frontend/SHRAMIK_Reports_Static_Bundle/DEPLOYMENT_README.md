# SHRAMIK Dashboard, Skill Gaps, Forecasts and Reports — Static Bundle

Upload the contents of this folder to a static web host. It must serve HTML, JavaScript, CSS and PNG assets.

## Entries
- index.html — shared shell; opens the Dashboard by default.
- skill-gap-analysis.html — direct entry into Skill Gap Analysis, reusing the same shell.
- forecasts.html — direct entry into Forecasts & Early Warnings, reusing the same shell. It contains Forecast Overview, Risk Radar, Scenario Analysis, Model Performance, and Alert Management.
- reports.html — direct entry into Reports & Intelligence Briefs, reusing the shared shell. It contains Builder, Library, and structured Preview views.
- app.js — TypeScript/JSX precompiled at build time; no runtime Babel.
- shramik-dashboard.css — one shared stylesheet containing Dashboard, Skill Gap Analysis, Forecasts, and Reports styles.
- assets/ — shared decorative assets; artwork is not used as measured map geometry.
- config.js — deployment configuration.

## Data mode
The default uses explicitly labelled illustrative mock data. Set window.SHRAMIK_CONFIG.apiBaseUrl in config.js to the SHRAMIK API base URL to activate the REST adapter. Reports and forecast backend routes are proposed in their respective docs_reports_api_contract.md and docs/forecasts/SHRAMIK_FORECASTS_EARLY_WARNINGS_API_CONTRACT.md files; these contracts do not prove the endpoints exist. REST failures do not switch to mock data.

## Runtime and build note
React 18.3.1 and ReactDOM 18.3.1 load from cdnjs, and fonts load from Google Fonts. The application JS, CSS, icons and images are local. This is a custom offline static fallback generated with the available TypeScript compiler, not Vite output: npm registry DNS was unavailable. For a fully bundled release, run npm install and npm run build in an environment with npm access.

## Validation
TypeScript/JSX transpilation diagnostics: zero. JavaScript syntax, module-loader/root-mount, adapter tests, shared-entry consistency and asset checks are run via the source package scripts. Browser screenshot/visual regression and the standard Vite build remain outstanding.
