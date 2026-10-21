const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../src/live-data/DatabaseInsightsPage.tsx'), 'utf8');

test('Forecast page distinguishes a restricted output table from an empty table', () => {
  assert.match(source, /const forecastInputsRestricted = \[forecastStatus, demandStatus, supplyStatus, warningStatus, modelStatus\]\.includes\('Restricted'\)/);
  assert.match(source, /No validated forecast result is available in this view/);
  assert.match(source, /“Restricted” means this application cannot inspect that table; it does not prove the underlying table is empty/);
  assert.match(source, /A server-authorized read of validated outputs is required/);
});

test('Forecast page does not create a projection from context indicators', () => {
  assert.match(source, /We will not manufacture projections from dashboard indicators/);
  assert.match(source, /Context data, not future projections/);
  assert.match(source, /model-version metadata and an auditable calculation run/);
});
