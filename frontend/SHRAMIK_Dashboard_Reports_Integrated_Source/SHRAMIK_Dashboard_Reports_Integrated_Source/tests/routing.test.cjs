const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const ts = require('typescript');

const input = fs.readFileSync(path.resolve(__dirname, '../src/routing.ts'), 'utf8');
const compiled = ts.transpileModule(input, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10 },
  fileName: 'routing.ts',
});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-routing-'));
const output = path.join(tmp, 'routing.cjs');
fs.writeFileSync(output, compiled.outputText);
const loaded = new Module(output, module);
loaded.filename = output;
loaded.paths = Module._nodeModulePaths(tmp);
loaded._compile(compiled.outputText, output);
const { getRouteFromLocation, getPathForRoute, getRouteLabel, SHRAMIK_ROUTES } = loaded.exports;
const loc = (pathname, search = '', hash = '') => ({ pathname, search, hash });

test('canonical route table covers every required application module', () => {
  const ids = SHRAMIK_ROUTES.map((route) => route.id);
  for (const id of [
    'dashboard', 'demand', 'supply', 'skill-gaps', 'forecasts', 'emerging-skills',
    'scenario-simulator', 'reports', 'data-sources', 'data-quality', 'administration',
  ]) assert.ok(ids.includes(id), `missing route: ${id}`);
});

test('direct paths and trailing slashes resolve to canonical routes', () => {
  assert.equal(getRouteFromLocation(loc('/')), 'dashboard');
  assert.equal(getRouteFromLocation(loc('/dashboard')), 'dashboard');
  assert.equal(getRouteFromLocation(loc('/skill-gaps/')), 'skill-gaps');
  assert.equal(getRouteFromLocation(loc('/scenario-simulator')), 'scenario-simulator');
  assert.equal(getRouteFromLocation(loc('/administration')), 'administration');
  assert.equal(getRouteFromLocation(loc('/demand/occupations')), 'demand');
  assert.equal(getRouteFromLocation(loc('/data-sources/source-123')), 'data-sources');
});

test('route links preserve a configured deployment base', () => {
  assert.equal(getPathForRoute('dashboard', '/shramik/'), '/shramik/');
  assert.equal(getPathForRoute('supply', '/shramik/'), '/shramik/supply');
  assert.equal(getPathForRoute('administration', '/shramik/'), '/shramik/administration');
});

test('direct links also resolve when deployed under a configured subpath', () => {
  const base = '/shramik/';
  assert.equal(getRouteFromLocation(loc('/shramik/'), base), 'dashboard');
  assert.equal(getRouteFromLocation(loc('/shramik/supply'), base), 'supply');
  assert.equal(getRouteFromLocation(loc('/shramik/administration/'), base), 'administration');
  assert.equal(getRouteFromLocation(loc('/shramik/reports.html'), base), 'reports');
  assert.equal(getRouteFromLocation(loc('/shramik/data-sources/source-123'), base), 'data-sources');
});

test('legacy multi-entry links remain compatible', () => {
  assert.equal(getRouteFromLocation(loc('/skill-gap-analysis.html')), 'skill-gaps');
  assert.equal(getRouteFromLocation(loc('/forecasts.html')), 'forecasts');
  assert.equal(getRouteFromLocation(loc('/reports.html')), 'reports');
  assert.equal(getRouteFromLocation(loc('/index.html')), 'dashboard');
});

test('query and hash navigation can deep-link module pages', () => {
  assert.equal(getRouteFromLocation(loc('/', '?page=data-sources')), 'data-sources');
  assert.equal(getRouteFromLocation(loc('/', '', '#scenario-simulator')), 'scenario-simulator');
  assert.equal(getRouteFromLocation(loc('/', '', '#skill-gaps')), 'skill-gaps');
});

test('unknown paths are explicit and route links use canonical paths', () => {
  assert.equal(getRouteFromLocation(loc('/made-up-module')), 'not-found');
  assert.equal(getPathForRoute('scenario-simulator'), '/scenario-simulator');
  assert.equal(getPathForRoute('dashboard'), '/');
  assert.equal(getRouteLabel('administration'), 'Administration');
});
