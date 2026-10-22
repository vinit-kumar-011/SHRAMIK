const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../src/live-data/DatabaseInsightsPage.tsx'), 'utf8');

test('Forecast page distinguishes a restricted output table from an empty table', () => {
  assert.match(source, /const forecastInputsRestricted = \[forecastStatus, demandStatus, supplyStatus, warningStatus, modelStatus\]\.includes\('Restricted'\)/);
  assert.match(source, /Direct browser table visibility is restricted/);
  assert.match(source, /“Restricted” means this app cannot query those tables through the public data path; it does not prove the tables are empty/);
  assert.match(source, /Authenticated persisted results for the selected analysis mode are shown in the panel above/);
});

test('Production Forecasts/Emerging Skills reports missing API configuration instead of calling a nonexistent same-origin route', () => {
  const panel = fs.readFileSync(path.resolve(__dirname, '../src/live-data/PersistedAnalyticsPanel.tsx'), 'utf8');
  assert.match(panel, /if \(!env\?\.DEV && !configuredBase\)/);
  assert.match(panel, /The authenticated analytics API is not configured for this production build/);
  assert.match(panel, /this page will not fall back to synthetic results/);
  assert.match(panel, /The API service URL is not configured for this build/);
  assert.doesNotMatch(panel, /local \/api\/v1 proxy targets port 8000/);
});

test('Forecast page does not create a projection from context indicators', () => {
  assert.match(source, /SHRAMIK will not manufacture projections from dashboard indicators/);
  assert.match(source, /Context data, not future projections/);
  assert.match(source, /compatible, validated district-by-skill history and an auditable calculation run/);
});
