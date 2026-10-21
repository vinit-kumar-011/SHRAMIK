const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const src = path.resolve(__dirname, '../src/data-quality');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-data-quality-adapter-'));
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
const { MockDataQualityDataAdapter } = compileAndLoad('mockAdapter.ts');
const { RestDataQualityDataAdapter, DataQualityApiError } = compileAndLoad('restAdapter.ts');

const snapshot = (provenance = 'SOURCE_BACKED') => ({
  summary: { recordsChecked: 1000, validRecords: 980 },
  issues: [{ id: 'DQ-1', title: 'Missing code', dataset: 'Dataset A', field: 'occupation_code', severity: 'high', status: 'open', records: 4, rule: 'NCO-REQUIRED-01', detected: '2026-10-19', description: 'Example issue' }],
  validationRuns: [{ id: 'RUN-1', dataset: 'Dataset A', date: '2026-10-19 09:30', status: 'Succeeded', checked: '1000', findings: '20' }],
  rules: [{ id: 'NCO-REQUIRED-01', name: 'Occupation code required', severity: 'High', family: 'Taxonomy' }],
  meta: { provenance, note: 'Contract fixture', sourceLabel: 'Quality API', updatedAt: '2026-10-19T00:00:00Z' },
});

test('mock Data Quality adapter returns explicit synthetic provenance', async () => {
  const adapter = new MockDataQualityDataAdapter();
  assert.equal(adapter.mode, 'mock');
  const result = await adapter.getSnapshot();
  assert.equal(result.meta.provenance, 'SYNTHETIC_DEMO');
  assert.equal(result.issues[0].id, 'DQ-DEMO-001');
  assert.ok(result.validationRuns.length > 0);
});

test('Data Quality REST adapter retrieves a contract-checked, read-only snapshot', async () => {
  const calls = [];
  const adapter = new RestDataQualityDataAdapter('https://api.example.test/', async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ data: snapshot() }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const result = await adapter.getSnapshot();
  assert.equal(result.meta.provenance, 'SOURCE_BACKED');
  assert.equal(calls[0].url, 'https://api.example.test/api/v1/data-quality/overview');
  assert.equal(calls[0].init.credentials, 'include');
  assert.equal(calls[0].init.method, undefined);
});

test('Data Quality REST adapter rejects impossible counts and surfaces server errors', async () => {
  const invalid = snapshot();
  invalid.summary.validRecords = 1200;
  const malformed = new RestDataQualityDataAdapter('https://api.example.test', async () => new Response(JSON.stringify(invalid), { status: 200, headers: { 'content-type': 'application/json' } }));
  await assert.rejects(malformed.getSnapshot(), error => error instanceof DataQualityApiError && /invalid record counts/.test(error.message));

  const down = new RestDataQualityDataAdapter('https://api.example.test', async () => new Response(JSON.stringify({ error: { message: 'unavailable' } }), { status: 503, headers: { 'content-type': 'application/json' } }));
  await assert.rejects(down.getSnapshot(), error => error instanceof DataQualityApiError && error.status === 503 && error.message === 'unavailable');
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
