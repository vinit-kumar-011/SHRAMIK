const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const src = path.resolve(__dirname, '../src/api');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-adapter-smoke-'));
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
  });
  const outPath = path.join(tmp, fileName.replace(/\.ts$/, '.cjs'));
  fs.writeFileSync(outPath, result.outputText);
  const loadedModule = new Module(outPath, module);
  loadedModule.filename = outPath;
  loadedModule.paths = Module._nodeModulePaths(tmp);
  loadedModule._compile(result.outputText, outPath);
  return loadedModule.exports;
}
const { MockLabourMarketDataAdapter } = compileAndLoad('mock-adapter.ts');
const { RestLabourMarketDataAdapter, ApiRequestError } = compileAndLoad('rest-adapter.ts');

test('mock adapter supplies explicit demo provenance and all dashboard sections', async () => {
  const adapter = new MockLabourMarketDataAdapter();
  const result = await adapter.getDashboard({ regionCode: 'IN', periodYears: 5 });
  assert.equal(result.meta.provenance, 'mock');
  assert.equal(result.kpis.length, 4);
  assert.equal(result.emergingSkills.length, 5);
  assert.equal(result.sectorGaps.length, 5);
  assert.equal(result.occupationForecasts.length, 5);
  assert.equal((await adapter.getDashboard({ regionCode: 'IN', periodYears: 3 })).trend.length, 3);
});

test('mock adapter region metric, search, notification mutation and details are active', async () => {
  const adapter = new MockLabourMarketDataAdapter();
  const ranking = await adapter.getRegionRankings({ regionCode: 'IN', metric: 'supply' });
  assert.equal(ranking.metric, 'supply');
  assert.equal(ranking.items.length, 5);
  assert.ok((await adapter.search({ query: 'construction', regionCode: 'IN' })).length > 0);
  const current = await adapter.getNotifications();
  await adapter.markNotificationRead(current[0].id);
  assert.equal((await adapter.getNotifications()).find((n) => n.id === current[0].id).read, true);
  assert.equal((await adapter.getIndicatorDetail('construction-workers', { regionCode: 'IN' })).meta.provenance, 'mock');
  assert.ok((await adapter.getSectionDetail('skill-gaps', { regionCode: 'IN' })).table.rows.length > 0);
});

test('REST adapter builds documented URL, unwraps data envelope and sends notification mutation', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/notifications/abc/read')) return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ data: [{ code: 'IN', label: 'India (National)', level: 'national' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const adapter = new RestLabourMarketDataAdapter({ baseUrl: 'http://localhost:8000/', fetchImpl });
  const regions = await adapter.getRegions();
  assert.equal(regions[0].code, 'IN');
  await adapter.getDashboard({ regionCode: 'OD', periodYears: 3 });
  await adapter.markNotificationRead('abc');
  assert.equal(calls[0].url, 'http://localhost:8000/api/v1/regions');
  assert.equal(calls[1].url, 'http://localhost:8000/api/v1/dashboard/summary?region=OD&period=3y');
  assert.equal(calls[2].url, 'http://localhost:8000/api/v1/notifications/abc/read');
  assert.equal(calls[2].init.method, 'PATCH');
  assert.equal(calls[2].init.credentials, 'include');
});

test('REST adapter surfaces HTTP errors rather than silently falling back to mock values', async () => {
  const adapter = new RestLabourMarketDataAdapter({
    baseUrl: 'https://example.invalid',
    fetchImpl: async () => new Response('Forbidden', { status: 403 }),
  });
  await assert.rejects(adapter.getRegions(), (error) => error instanceof ApiRequestError && error.status === 403);
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
