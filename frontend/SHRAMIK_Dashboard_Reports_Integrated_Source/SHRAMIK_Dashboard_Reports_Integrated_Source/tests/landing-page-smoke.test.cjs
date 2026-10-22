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

test('official showcase landing preview never draws illustrative demand/supply/forecast curves', () => {
  assert.ok(landing.includes("const showcaseMode = runtimeEnv?.MODE === 'production' || runtimeEnv?.VITE_SHRAMIK_SHOWCASE_MODE === 'true'"));
  assert.ok(landing.includes("const preview = showcaseMode ? showcasePreview : previews[previewKey]"));
  assert.ok(landing.includes("OFFICIAL SHOWCASE · SOURCE-BACKED ONLY"));
  assert.ok(landing.includes("No validated demand/supply trend published"));
  assert.ok(landing.includes("{!showcaseMode ? <><path className={c('sl-chart-forecast')}"));
  assert.ok(landing.includes("{!showcaseMode ? <div className={c('sl-tabs')}"));
  assert.ok(landing.includes("values: ['Not published', 'Not published', 'Not calculated']"));
});
