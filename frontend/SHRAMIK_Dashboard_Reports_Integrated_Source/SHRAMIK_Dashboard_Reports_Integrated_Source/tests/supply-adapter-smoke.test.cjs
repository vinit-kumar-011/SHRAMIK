const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const src = path.resolve(__dirname, '../src/supply');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-supply-adapter-'));
function compileAndLoad(fileName) {
  const inputPath = path.join(src, fileName);
  const source = fs.readFileSync(inputPath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      esModuleInterop: true,
    },
    fileName: inputPath,
  });
  const outputPath = path.join(tmp, fileName.replace(/\.ts$/, '.cjs'));
  fs.writeFileSync(outputPath, compiled.outputText);
  const loaded = new Module(outputPath, module);
  loaded.filename = outputPath;
  loaded.paths = Module._nodeModulePaths(tmp);
  loaded._compile(compiled.outputText, outputPath);
  return loaded.exports;
}
const { MockSupplyInsightsDataAdapter } = compileAndLoad('mockAdapter.ts');
const { RestSupplyInsightsDataAdapter, SupplyInsightsApiError } = compileAndLoad('restAdapter.ts');

function snapshot(geographyCode = 'IN', provenance = 'SOURCE_BACKED') {
  return {
    geographyCode,
    summary: {
      workforceSupplyEstimate: 1000000,
      workforceSupplyUnit: 'persons',
      trainingPipeline: 50000,
      trainingPipelineUnit: 'learners',
      credentialCoveragePct: 62,
    },
    sectors: [{
      id: 'manufacturing', name: 'Manufacturing', availableSupply: 120000,
      unitCode: 'persons', changePct: 3.2, coveragePct: 80, level: 'High',
    }],
    pipeline: [{ id: 'enrolled', label: 'Enrolled', valuePct: 76, note: 'Reported stage signal' }],
    readiness: [{ id: 'geo', label: 'Geography crosswalk', value: 'Verified', status: 'ready' }],
    meta: { provenance, note: 'Test fixture', sourceLabel: 'Test API', updatedAt: '2026-10-19T00:00:00Z' },
  };
}

test('mock Supply adapter labels synthetic provenance and does not fake regional recalculation', async () => {
  const adapter = new MockSupplyInsightsDataAdapter();
  assert.equal(adapter.mode, 'mock');
  const national = await adapter.getSnapshot('IN');
  const odisha = await adapter.getSnapshot('IN-OD');
  assert.equal(national.meta.provenance, 'SYNTHETIC_DEMO');
  assert.equal(odisha.geographyCode, 'IN-OD');
  assert.equal(odisha.summary.workforceSupplyEstimate, national.summary.workforceSupplyEstimate);
  assert.match(odisha.meta.note, /do not recalculate|do not regionalize|do not change/i);
});

test('Supply REST adapter uses versioned endpoint and validates requested geography', async () => {
  const calls = [];
  const adapter = new RestSupplyInsightsDataAdapter('https://api.example.test/', async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ data: snapshot('IN-OD') }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  });
  const result = await adapter.getSnapshot('IN-OD');
  assert.equal(result.meta.provenance, 'SOURCE_BACKED');
  assert.equal(calls[0].url, 'https://api.example.test/api/v1/supply/overview?geography=IN-OD');
  assert.equal(calls[0].init.credentials, 'include');
});

test('Supply REST adapter rejects invalid units, enums and percentage ranges', async () => {
  const invalid = snapshot('IN');
  invalid.sectors[0].level = 'Outstanding';
  invalid.sectors[0].coveragePct = 120;
  const adapter = new RestSupplyInsightsDataAdapter('https://api.example.test', async () => new Response(JSON.stringify(invalid), { status: 200, headers: { 'content-type': 'application/json' } }));
  await assert.rejects(adapter.getSnapshot('IN'), error => error instanceof SupplyInsightsApiError && /invalid sector fields/.test(error.message));
});

test('Supply REST adapter refuses mismatched geography and does not silently use fixtures on errors', async () => {
  const wrongScope = new RestSupplyInsightsDataAdapter('https://api.example.test', async () => new Response(JSON.stringify(snapshot('IN')), { status: 200, headers: { 'content-type': 'application/json' } }));
  await assert.rejects(wrongScope.getSnapshot('IN-OD'), error => error instanceof SupplyInsightsApiError && /geography does not match/.test(error.message));

  const down = new RestSupplyInsightsDataAdapter('https://api.example.test', async () => new Response(JSON.stringify({ error: { message: 'unavailable' } }), { status: 503, headers: { 'content-type': 'application/json' } }));
  await assert.rejects(down.getSnapshot('IN'), error => error instanceof SupplyInsightsApiError && error.status === 503 && error.message === 'unavailable');
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
