const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'src/pages/EmergingSkillsPage.tsx'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'src/SHRAMIKDashboard.tsx'), 'utf8');
const tailwind = fs.readFileSync(path.join(root, 'tailwind.config.js'), 'utf8');

test('Emerging Skills module exports a typed React page and adapter contract', () => {
  assert.match(page, /export interface EmergingSkillsDataAdapter/);
  assert.match(page, /export const EmergingSkillsPage/);
  assert.match(page, /export default EmergingSkillsPage/);
});
test('Five internal views are implemented', () => {
  for (const name of ['OverviewView', 'MomentumView', 'ConnectionsView', 'RegionalSignalsView', 'ProfileEvidenceView']) assert.ok(page.includes(name), `${name} not found`);
});
test('The dashboard shell contains the module and its canonical sidebar destination', () => {
  assert.match(dashboard, /EmergingSkillsPage dataAdapter=\{skillsAdapter\}/);
  assert.match(dashboard, /item\.section === 'emerging-skills'/);
  assert.match(dashboard, /<Sidebar active=\{active\}/);
  assert.ok(!page.includes('SHRAMIKDashboard'));
});
test('Demo values and in-memory watchlist are provenance-labelled', () => {
  assert.match(page, /SYNTHETIC_DEMO/);
  assert.match(page, /Illustrative demo data/);
  assert.match(page, /new Set<string>\(/);
  assert.ok(!page.includes('localStorage'));
});
test('Page reads are adapter-backed and cancellable', () => {
  assert.match(page, /adapter\.getSummary\(appliedFilters, controller\.signal\)/);
  assert.match(page, /return \(\) => controller\.abort\(\)/);
  assert.match(page, /setRetryKey\(k => k \+ 1\)/);
});
test('Strict app shell is protected from Tailwind preflight reset', () => {
  assert.match(tailwind, /preflight:\s*false/);
  assert.match(dashboard, /emerging-skills-main/);
});
