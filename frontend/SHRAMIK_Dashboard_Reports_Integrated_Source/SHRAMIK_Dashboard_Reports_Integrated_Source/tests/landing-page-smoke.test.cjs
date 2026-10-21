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

test('landing page links use the canonical route helper and respect configured base paths', () => {
  assert.match(landing, /getPathForRoute\('dashboard', import\.meta\.env\.BASE_URL\)/);
  assert.match(landing, /getPathForRoute\('login', import\.meta\.env\.BASE_URL\)/);
  assert.match(landing, /href=\{resolveLandingHref\(href\)\}/);
  assert.match(landing, /href=\{resolveLandingHref\('\/login'\)\}/);
  assert.match(landing, /href=\{resolveLandingHref\('\/dashboard'\)\}/);
  assert.doesNotMatch(landing, /href="\/(?:dashboard|login)"/);
});
