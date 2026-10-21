const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../src/live-data/DatabaseInsightsPage.tsx'), 'utf8');

test('Reports page identifies itself as a read-only source catalogue when the Reports API is not configured', () => {
  assert.match(source, /VITE_SHRAMIK_API_BASE_URL/);
  assert.match(source, /Report generation is not connected in this deployment/);
  assert.match(source, /This page currently provides a read-only evidence catalogue/);
  assert.match(source, /No report is generated from the catalogue alone/);
});

test('Reports catalogue distinguishes registered source metadata from actual retrieval or validation', () => {
  assert.match(source, /A registered source is not, by itself, proof of an up-to-date retrieval or successful validation/);
  assert.match(source, /Registered data sources/);
  assert.match(source, /Source-backed metric rows/);
});
