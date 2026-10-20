const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../src/live-data/DatabaseInsightsPage.tsx'), 'utf8');

test('Scenario Simulator explains when the server-side API is not configured', () => {
  assert.match(source, /VITE_SCENARIO_SIMULATOR_API_BASE_URL/);
  assert.match(source, /Scenario execution API is not configured/);
  assert.match(source, /No intervention run will be submitted until a server-side simulation endpoint is configured/);
});

test('Scenario Simulator does not manufacture a run without a validated baseline', () => {
  assert.match(source, /Simulation is waiting for a validated baseline/);
  assert.match(source, /This page intentionally does not run on illustrative values/);
  assert.match(source, /Published forecast baseline/);
});
