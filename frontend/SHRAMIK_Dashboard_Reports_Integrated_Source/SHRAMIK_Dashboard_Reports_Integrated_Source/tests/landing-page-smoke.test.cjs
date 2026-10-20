const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const landing = fs.readFileSync(path.resolve(__dirname, '../src/landing/SHRAMIKLandingPage.tsx'), 'utf8');

test('landing page identifies its live published source data accurately', () => {
  assert.match(landing, /Published source data/);
  assert.match(landing, /read-only published data view/);
  assert.match(landing, /live, source-backed reads/);
});

test('landing page keeps illustrative preview separate from live indicators', () => {
  assert.match(landing, /PLATFORM PREVIEW · ILLUSTRATIVE DATA/);
  assert.match(landing, /the platform preview uses illustrative values/);
  assert.doesNotMatch(landing, /does not claim official government affiliation or display live labour-market data/);
});

test('landing page points workspace visitors to the protected workspace/login route', () => {
  assert.match(landing, /href="\/dashboard"/);
  assert.match(landing, /href="\/login"/);
});
