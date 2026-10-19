const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const shell = read('src/SHRAMIKDashboard.tsx');
const routes = read('src/routing.ts');

test('canonical shell imports and mounts all eleven navigation modules', () => {
  const modules = [
    ['dashboard', 'India’s Labour Market'],
    ['demand', 'DemandInsightsPage'],
    ['supply', 'SupplyInsightsPage'],
    ['skill-gaps', 'SkillGapAnalysisPage'],
    ['forecasts', 'ForecastsPage'],
    ['emerging-skills', 'EmergingSkillsPage'],
    ['scenario-simulator', 'ScenarioSimulatorPage'],
    ['reports', 'ReportsPage'],
    ['data-sources', 'DataSourcesPage'],
    ['data-quality', 'DataQualityPage'],
    ['administration', 'AdministrationPage'],
  ];
  for (const [route, component] of modules) {
    assert.match(routes, new RegExp(`id: ['"]${route}['"]`), `route registry is missing ${route}`);
    assert.ok(shell.includes(component), `shared shell does not reference ${component}`);
    if (route !== 'dashboard') {
      assert.ok(shell.includes(`activePage === '${route}'`), `shared shell does not mount the ${route} route`);
    }
  }
  assert.match(shell, /<Header /, 'shared topbar/header must be provided by the shell');
  assert.match(shell, /<Sidebar /, 'shared sidebar must be provided by the shell');
});

test('Demand Insights bundles its icons and does not rely on an undeclared browser global', () => {
  const demand = read('src/demand/DemandInsightsPage.jsx');
  assert.match(demand, /from ['"]lucide-react['"]/);
  assert.doesNotMatch(demand, /window\.lucide/);
  assert.doesNotMatch(demand, /mkIcon/);
});

test('demo-only modules prominently disclose synthetic data and local-only actions', () => {
  const supply = read('src/supply/SupplyInsightsPage.tsx');
  const quality = read('src/data-quality/DataQualityPage.tsx');
  const administration = read('src/administration/AdministrationPage.tsx');
  assert.match(supply, /SYNTHETIC_DEMO/);
  assert.match(supply, /no live Supply API is connected/i);
  assert.match(quality, /SYNTHETIC_DEMO/);
  assert.match(quality, /local fixtures/i);
  assert.match(quality, /does not update a backend/i);
  assert.match(administration, /SYNTHETIC_DEMO/);
  assert.match(administration, /No account, authentication policy, or permission is changed on a server/i);
  assert.match(administration, /no authentication account was modified/i);
});
