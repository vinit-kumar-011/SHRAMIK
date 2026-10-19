const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const src = path.resolve(__dirname, '../src/skill-gaps');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-skill-gap-adapter-'));
function compileAndLoad(fileName) {
  const input = fs.readFileSync(path.join(src, fileName), 'utf8');
  const result = ts.transpileModule(input, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      esModuleInterop: true,
    },
    fileName,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
  const outPath = path.join(tmp, fileName.replace(/\.ts$/, '.cjs'));
  fs.writeFileSync(outPath, result.outputText);
  const loadedModule = new Module(outPath, module);
  loadedModule.filename = outPath;
  loadedModule.paths = Module._nodeModulePaths(tmp);
  loadedModule._compile(result.outputText, outPath);
  return loadedModule.exports;
}
const { MockSkillGapDataAdapter } = compileAndLoad('mockAdapter.ts');
const { RestSkillGapDataAdapter, SkillGapApiError } = compileAndLoad('restAdapter.ts');
const defaults = { period: '2024-25', geographyLevel: 'national', regionCode: 'IN', stateCode: '', sectorCode: '', ncoCode: '', skillCode: '' };

test('filter options expose demo provenance, canonical codes, and adapter-owned defaults', async () => {
  const adapter = new MockSkillGapDataAdapter();
  const result = await adapter.getFilterOptions();
  assert.equal(result.meta.provenance, 'mock');
  assert.equal(result.defaults.regionCode, 'IN');
  assert.ok(result.periods.length >= 2);
  assert.ok(result.regions.some((region) => region.code === 'IN-OD' && region.label === 'Odisha'));
  assert.ok(result.configuration.classificationVersion.startsWith('demo'));
});

test('overview calculates gap as demand minus supply and never calls it a forecast', async () => {
  const adapter = new MockSkillGapDataAdapter();
  const result = await adapter.getOverview(defaults);
  assert.equal(result.meta.provenance, 'mock');
  assert.equal(result.gap.value, result.demand.value - result.supply.value);
  assert.equal(result.gap.kind, 'observed_estimate');
  assert.match(result.gap.definition, /not a forecast/i);
  assert.equal(result.demand.unit, result.supply.unit);
  assert.equal(result.dataStatus, 'partial');
});

test('landscape carries compatible units and explicit parity-line eligibility', async () => {
  const adapter = new MockSkillGapDataAdapter();
  const result = await adapter.getGapLandscape(defaults);
  assert.equal(result.parityLineEligible, true);
  assert.equal(result.xAxis.unit, result.yAxis.unit);
  assert.ok(result.points.length > 0);
  for (const point of result.points) {
    assert.equal(point.unit, result.xAxis.unit);
    assert.equal(point.gap, point.demand - point.supply);
    assert.equal(point.meta.provenance, 'mock');
  }
});

test('regional values never treat the illustrative PNG as map geometry', async () => {
  const adapter = new MockSkillGapDataAdapter();
  const result = await adapter.getRegionalGaps(defaults, 'gap_absolute');
  assert.equal(result.geometry, null);
  assert.match(result.geometryUnavailableReason, /no verified, licensed/i);
  assert.ok(result.regions.some((region) => region.classification === 'no_data'));
  assert.equal(result.meta.provenance, 'mock');
});

test('ranked skills provide stable server-adapter-shaped sorting and pagination', async () => {
  const adapter = new MockSkillGapDataAdapter();
  const first = await adapter.getRankedSkills(defaults, { sort: 'gap', direction: 'desc', page: 0, pageSize: 5 });
  const second = await adapter.getRankedSkills(defaults, { sort: 'gap', direction: 'desc', page: 1, pageSize: 5 });
  assert.equal(first.items.length, 5);
  assert.equal(second.items.length, 5);
  assert.equal(first.total, 12);
  assert.ok(first.items[0].gap >= first.items[1].gap);
  assert.ok(!first.items.some((item) => second.items.some((next) => next.skillId === item.skillId)));
  assert.ok(first.items.every((item) => item.skillTaxonomyVersion === undefined || typeof item.skillCode === 'string'));
});

test('insights are labelled mock and flow is unavailable rather than inferred', async () => {
  const adapter = new MockSkillGapDataAdapter();
  const insights = await adapter.getSkillGapInsights(defaults);
  assert.ok(insights.length <= 4);
  assert.ok(insights.every((item) => item.generatedBy === 'mock' && item.claims.every((claim) => claim.sourceIds.length > 0)));
  const flow = await adapter.getSectorFlow(defaults, 'CON');
  assert.equal(flow.available, false);
  assert.deepEqual(flow.nodes, []);
  assert.deepEqual(flow.links, []);
  assert.match(flow.unavailableReason, /will not infer flows/i);
  const detail = await adapter.getDetail('kpi', 'gap', defaults);
  assert.equal(detail.meta.provenance, 'mock');
  assert.ok(detail.facts.some((fact) => fact.label === 'Formula'));
});

test('REST adapter uses the documented namespace and surfaces failures without mock fallback', async () => {
  const calls = [];
  const adapter = new RestSkillGapDataAdapter({
    baseUrl: 'http://localhost:8000/',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ data: { ping: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const result = await adapter.getOverview(defaults);
  assert.deepEqual(result, { ping: true });
  assert.match(calls[0].url, /^http:\/\/localhost:8000\/api\/v1\/skill-gaps\/overview\?/);
  assert.match(calls[0].url, /period=2024-25/);

  const failing = new RestSkillGapDataAdapter({ baseUrl: 'https://api.example.test', fetchImpl: async () => new Response(JSON.stringify({ code: 'INSUFFICIENT_COVERAGE', message: 'Not enough history' }), { status: 422, headers: { 'content-type': 'application/json' } }) });
  await assert.rejects(failing.getOverview(defaults), (error) => error instanceof SkillGapApiError && error.status === 422 && error.code === 'INSUFFICIENT_COVERAGE');
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
