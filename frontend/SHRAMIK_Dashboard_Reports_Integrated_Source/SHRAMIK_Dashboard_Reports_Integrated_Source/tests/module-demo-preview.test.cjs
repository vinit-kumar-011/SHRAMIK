const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const shell = read('src/SHRAMIKDashboard.tsx');
const liveModules = read('src/live-data/DatabaseInsightsPage.tsx');
const liveNotice = read('src/LiveModuleNotice.tsx');
const forecastPage = read('src/forecasts/ForecastsEarlyWarningsPage.tsx');
const forecastAdapter = read('src/forecasts/legacyAdapter.ts');

test('source-backed readiness remains the default and exposes opt-in previews by module', () => {
  for (const module of ['demand', 'supply', 'skill-gaps', 'forecasts', 'emerging-skills', 'data-quality']) {
    assert.ok(shell.includes(`onPreviewDemo={showcaseMode ? undefined : () => setDemoPreviewPage('${module}')}`), module + ' must expose demo actions only outside showcase mode');
  }
  assert.match(liveModules, /Open synthetic demo preview/);
  assert.match(shell, /Illustrative preview — not live labour-market findings/);
  assert.match(shell, /SYNTHETIC_DEMO/);
  assert.match(shell, /Return to live view/);
});
test('module previews explicitly pin fixture adapters instead of silently substituting for live data', () => {
  assert.match(shell, /new MockSkillGapDataAdapter\(\)/);
  assert.match(shell, /createForecastsDataAdapter\(new MockForecastsAdapter\(\)\)/);
  assert.match(shell, /adapter=\{mockSupplyInsightsDataAdapter\}/);
  assert.match(shell, /dataAdapter=\{demoEmergingSkillsDataAdapter\}/);
  assert.match(shell, /adapter=\{mockDataQualityDataAdapter\}/);
  assert.match(shell, /adapter=\{mockAdministrationDataAdapter\}/);
  assert.match(shell, /previewingModule = !showcaseMode && !demoMode && demoPreviewPage === activePage/);
  assert.match(forecastAdapter, /adapterOverride\?: ForecastsDataAdapter/);
  assert.match(forecastPage, /dataAdapter\?: ReturnType<typeof createForecastsDataAdapter>/);
});

test('production builds enforce the official-only showcase experience', () => {
  const persistedPanel = read('src/live-data/PersistedAnalyticsPanel.tsx');
  const scenario = read('src/scenario-simulator/ScenarioSimulatorPage.tsx');
  const apiAdapter = read('src/api/adapter.ts');
  const reportsAdapter = read('src/reports/adapter.ts');
  assert.match(shell, /runtimeEnv\?\.MODE === 'production' \|\| runtimeEnv\?\.VITE_SHRAMIK_SHOWCASE_MODE === 'true'/);
  assert.match(shell, /const demoMode = !showcaseMode && runtimeEnv\?\.VITE_SHRAMIK_USE_DEMO_DATA === 'true'/);
  assert.match(liveModules, /onPreviewDemo && !showcaseMode/);
  assert.ok(liveModules.includes('{onPreviewDemo && !showcaseMode ? <button className="dbi-demand-demo-launch"'), 'the Demand illustrative CTA must be hidden in production');
  assert.match(liveModules, /!showcaseMode \? <><option value="EXAMPLES">Illustrative role examples/);
  assert.match(persistedPanel, /!showcaseMode \? <option value="DEMO">Demo · synthetic/);
  assert.match(scenario, /disabled=\{busy \|\| !options \|\| showcaseBlocksLocalPlanning\}/);
  assert.match(scenario, /selectedBaseline.provenance !== "SOURCE_BACKED"/);
  assert.match(scenario, /selectedBaseline.qualityStatus !== "APPROVED"/);
  assert.match(scenario, /Official showcase mode — approved source-backed baseline required/);
  assert.ok(apiAdapter.includes("const showcaseMode = env?.MODE === 'production' || env?.VITE_SHRAMIK_SHOWCASE_MODE === 'true'"));
  assert.ok(apiAdapter.includes("if (!showcaseMode && env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true') return new MockLabourMarketDataAdapter();"));
  assert.ok(reportsAdapter.includes("if (!showcaseMode && env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true') return new DemoReportsAdapter();"));
  assert.ok(shell.includes("onPreviewDemo={showcaseMode ? undefined : () => setDemoPreviewPage('administration')}"));
});
test('administration preview explains fictional decisions cannot grant real access', () => {
  assert.match(liveNotice, /Open a clearly labelled synthetic preview/);
  assert.match(liveNotice, /does not approve real requests, create accounts or change permissions/);
  assert.match(liveNotice, /onPreviewDemo\?/);
});
test('navigating away or using browser history exits the per-module preview', () => {
  assert.match(shell, /setActivePage\(page\);\s*setDemoPreviewPage\(null\)/);
  assert.match(shell, /setActivePage\(route\);\s*setDemoPreviewPage\(null\)/);
});
