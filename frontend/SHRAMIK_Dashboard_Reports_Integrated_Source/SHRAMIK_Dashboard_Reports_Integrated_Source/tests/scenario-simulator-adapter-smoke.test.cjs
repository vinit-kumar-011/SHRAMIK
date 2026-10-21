const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const src = path.resolve(__dirname, '../src/scenario-simulator/adapters');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-scenario-adapter-'));
const inputPath = path.join(src, 'RestScenarioSimulatorAdapter.ts');
const compiled = ts.transpileModule(fs.readFileSync(inputPath, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, esModuleInterop: true },
  fileName: inputPath,
});
const outputPath = path.join(tmp, 'RestScenarioSimulatorAdapter.cjs');
fs.writeFileSync(outputPath, compiled.outputText);
const loaded = new Module(outputPath, module);
loaded.filename = outputPath;
loaded.paths = Module._nodeModulePaths(tmp);
loaded._compile(compiled.outputText, outputPath);
const { RestScenarioSimulatorAdapter } = loaded.exports;

const optionsBody = {
  additional_annual_seats: { minimum: 0, maximum: 100000, step: 5000, unit: 'seats_per_year' },
  training_lag_months: { minimum: 0, maximum: 60, step: 6, unit: 'months' },
  start_years: [2027, 2028], evaluation_years: [2030, 2031],
  geographies: [{ id: 'INDIA', label: 'India' }],
  baselines: [{ id: 'BASE-1', label: 'Baseline', forecastRunId: 'FC-1' }],
  sectors: [], provenance: 'SYNTHETIC_DEMO',
};

for (const base of ['https://api.example.test', 'https://api.example.test/', 'https://api.example.test/api/v1', 'https://api.example.test/api/v1/']) {
  test(`Scenario REST adapter normalizes shared API base ${base}`, async () => {
    const calls = [];
    const adapter = new RestScenarioSimulatorAdapter(base, async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify(optionsBody), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const options = await adapter.getOptions();
    assert.equal(options.provenance, 'SYNTHETIC_DEMO');
    assert.equal(calls[0].url, 'https://api.example.test/api/v1/simulator/options');
    assert.equal(calls[0].init.credentials, 'include');
    assert.equal(calls[0].init.headers.Accept, 'application/json');
  });
}

test('Scenario REST adapter surfaces server failures rather than substituting demo results', async () => {
  const adapter = new RestScenarioSimulatorAdapter('https://api.example.test/api/v1', async () =>
    new Response(JSON.stringify({ error: { message: 'simulator not configured' } }), { status: 503, headers: { 'content-type': 'application/json' } })
  );
  await assert.rejects(adapter.getOptions(), /simulator not configured/);
});

test('Scenario REST adapter rejects malformed shared API base URLs', () => {
  assert.throws(() => new RestScenarioSimulatorAdapter('localhost:8000'), /absolute HTTP\(S\) URL/);
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
