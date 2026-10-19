const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const shell = read('src/SHRAMIKDashboard.tsx');
const routes = read('src/routing.ts');
const postcss = require('postcss');

function splitSelectorList(value) {
  const result = [];
  let start = 0, round = 0, square = 0, quote = '', escaped = false;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '(') round++;
    else if (char === ')') round = Math.max(0, round - 1);
    else if (char === '[') square++;
    else if (char === ']') square = Math.max(0, square - 1);
    else if (char === ',' && round === 0 && square === 0) {
      result.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  result.push(value.slice(start).trim());
  return result.filter(Boolean);
}

function assertCssScoped(css, filename, scope) {
  const parsed = postcss.parse(css, { from: filename });
  parsed.walkRules((rule) => {
    let parent = rule.parent;
    let keyframes = false;
    while (parent && parent.type !== 'root') {
      if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) keyframes = true;
      parent = parent.parent;
    }
    if (keyframes) return;
    for (const selector of splitSelectorList(rule.selector)) {
      assert.ok(
        selector === scope || selector.startsWith(scope + ' ') || selector.startsWith(scope + ':') || selector.startsWith(scope + '>'),
        `Unscoped selector "${selector}" found in ${filename}`,
      );
    }
  });
}

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

test('module preparation safely reuses canonical JSON/CSS files', () => {
  const prepare = read('scripts/prepare-react-modules.mjs');
  assert.match(prepare, /if \(sourcePath === targetPath\)/);
  assert.match(prepare, /kind: 'reuse'/);
});

test('module preparation uses the canonical React source files in this app package', () => {
  const prepare = read('scripts/prepare-react-modules.mjs');
  assert.match(prepare, /src\/emerging-skills\/EmergingSkillsPage\.tsx/);
  assert.match(prepare, /src\/scenario-simulator\/ScenarioSimulatorPage\.tsx/);
  assert.match(prepare, /src\/data-sources\/DataSourcesPage\.tsx/);
  assert.doesNotMatch(prepare, /SHRAMIK_Emerging_Skills_React_Integrated/);
  assert.doesNotMatch(prepare, /SHRAMIK_Scenario_Simulator_Deliverable/);
  assert.doesNotMatch(prepare, /SHRAMIK_Data_Sources_Source_and_Build/);
});

test('Demand Insights bundles its icons and does not rely on an undeclared browser global', () => {
  const demand = read('src/demand/DemandInsightsPage.jsx');
  assert.match(demand, /from ['"]lucide-react['"]/);
  assert.doesNotMatch(demand, /window\.lucide/);
  assert.doesNotMatch(demand, /mkIcon/);
});

test('Demand Insights inline styles cannot leak into the shared shell', () => {
  const demand = read('src/demand/DemandInsightsPage.jsx');
  const styles = [...demand.matchAll(/const CSS2? = `([\\s\\S]*?)`;/g)];
  assert.equal(styles.length, 2, 'expected the two canonical Demand style constants');
  for (let index = 0; index < styles.length; index++) {
    assertCssScoped(styles[index][1], `Demand CSS ${index + 1}`, '.sh.embedded');
  }
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
