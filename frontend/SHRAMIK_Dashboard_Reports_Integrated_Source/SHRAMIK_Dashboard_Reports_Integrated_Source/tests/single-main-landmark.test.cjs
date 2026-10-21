const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourceRoot = path.resolve(__dirname, '../src');
const files = [
  ['Demand', 'demand/DemandInsightsPage.jsx'],
  ['Emerging Skills', 'emerging-skills/EmergingSkillsPage.tsx'],
  ['Data Sources', 'data-sources/DataSourcesPage.tsx'],
];

test('embedded workspace pages do not introduce nested main landmarks', () => {
  for (const [label, file] of files) {
    const content = fs.readFileSync(path.join(sourceRoot, file), 'utf8');
    assert.equal((content.match(/<main\b/g) || []).length, 0, label + ' must use the shared workspace main landmark');
    assert.equal((content.match(/<\/main>/g) || []).length, 0, label + ' must not close the shared workspace main landmark');
  }
});

test('the unified shell provides the sole workspace main landmark and skip-link target', () => {
  const shell = fs.readFileSync(path.join(sourceRoot, 'SHRAMIKDashboard.tsx'), 'utf8');
  assert.match(shell, /<main id="shramik-main" tabIndex=\{-1\}/);
  assert.match(shell, /href="#shramik-main"/);
});

test('public login and request-access pages expose a main landmark', () => {
  const publicPages = [
    ['Login', 'auth/LoginPage.tsx', 'login-heading'],
    ['Request Access', 'auth/RequestAccessPage.tsx', 'access-heading'],
  ];
  for (const [label, file, headingId] of publicPages) {
    const content = fs.readFileSync(path.join(sourceRoot, file), 'utf8');
    assert.equal((content.match(/<main\b/g) || []).length, 1, label + ' must expose exactly one main landmark');
    assert.match(content, new RegExp('<main\\b[^>]*aria-labelledby="' + headingId + '"'), label + ' main must be labelled by its page heading');
    assert.equal((content.match(/<\/main>/g) || []).length, 1, label + ' main landmark must close correctly');
  }
});
