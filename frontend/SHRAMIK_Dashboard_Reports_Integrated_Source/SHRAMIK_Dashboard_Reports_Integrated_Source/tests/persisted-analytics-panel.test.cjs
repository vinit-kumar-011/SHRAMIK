const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'src/live-data/PersistedAnalyticsPanel.tsx'), 'utf8');
const livePage = fs.readFileSync(path.join(root, 'src/live-data/DatabaseInsightsPage.tsx'), 'utf8');
const vite = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');

test('persisted analytics panel uses protected persisted backend endpoints', () => {
  assert.match(panel, /\/api\/v1\/analytics\/status/);
  assert.match(panel, /\/api\/v1\/analytics\/forecasts/);
  assert.match(panel, /\/api\/v1\/analytics\/early-warnings/);
  assert.match(panel, /\/api\/v1\/analytics\/emerging-skills/);
  assert.match(panel, /Authorization:\s*'Bearer '\s*\+\s*token/);
  assert.match(panel, /restoreAuthSession/);
});

test('official and demo outputs are visibly distinguished', () => {
  assert.match(panel, /value="OFFICIAL"/);
  assert.match(panel, /value="DEMO"/);
  assert.match(panel, /Synthetic demo mode/);
  assert.match(panel, /Do not cite it as government data or policy evidence/);
  assert.match(panel, /source-backed/);
});

test('live forecast and emerging skill pages render the authenticated results panel', () => {
  assert.match(livePage, /<PersistedAnalyticsPanel module=\{module\}\/>/);
  assert.match(livePage, /Authenticated persisted results for the selected analysis mode are shown in the panel above/);
});

test('Vite proxies analytics API requests to the local backend without exposing credentials', () => {
  assert.match(vite, /VITE_SHRAMIK_API_PROXY_TARGET/);
  assert.match(vite, /proxy:\s*\{\s*'\/api\/v1':\s*\{\s*target:\s*analyticsProxyTarget,\s*changeOrigin:\s*true\s*\}\s*\}/);
});
