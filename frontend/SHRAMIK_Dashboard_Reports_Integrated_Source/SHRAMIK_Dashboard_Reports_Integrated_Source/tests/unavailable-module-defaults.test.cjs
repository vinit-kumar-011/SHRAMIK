const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-unavailable-modules-'));

function compileAndLoad(relativePath) {
  const inputPath = path.join(root, relativePath);
  const source = fs.readFileSync(inputPath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, esModuleInterop: true },
    fileName: inputPath,
    reportDiagnostics: true,
  });
  const errors = (compiled.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\\n')).join('\\n'));
  const outputPath = path.join(tmp, path.basename(relativePath).replace(/\\.ts$/, '.cjs'));
  fs.writeFileSync(outputPath, compiled.outputText);
  const loaded = new Module(outputPath, module);
  loaded.filename = outputPath;
  loaded.paths = Module._nodeModulePaths(tmp);
  loaded._compile(compiled.outputText, outputPath);
  return loaded.exports;
}

const { UnavailableEmergingSkillsDataAdapter } = compileAndLoad('src/emerging-skills/unavailableAdapter.ts');
const { UnavailableSupplyInsightsDataAdapter } = compileAndLoad('src/supply/unavailableAdapter.ts');
const { UnavailableDataQualityDataAdapter } = compileAndLoad('src/data-quality/unavailableAdapter.ts');
const { UnavailableForecastsAdapter } = compileAndLoad('src/forecasts/unavailableAdapter.ts');
const { UnavailableSkillGapDataAdapter } = compileAndLoad('src/skill-gaps/unavailableAdapter.ts');

test('Emerging Skills is unavailable by default instead of serving mock signals', async () => {
  const adapter = new UnavailableEmergingSkillsDataAdapter();
  await assert.rejects(adapter.getSummary(), /API is not configured.*No live skill signals/);
  await assert.rejects(adapter.getSkills(), /API is not configured/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(adapter.getSummary({}, controller.signal), /Aborted/);
});

test('Supply Insights is unavailable by default instead of inventing supply estimates', async () => {
  const adapter = new UnavailableSupplyInsightsDataAdapter();
  assert.equal(adapter.mode, 'unavailable');
  await assert.rejects(adapter.getSnapshot('IN'), /No validated workforce-supply output is available/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(adapter.getSnapshot('IN', controller.signal), /Aborted/);
});

test('Data Quality is unavailable by default instead of inventing runs and issues', async () => {
  const adapter = new UnavailableDataQualityDataAdapter();
  assert.equal(adapter.mode, 'unavailable');
  await assert.rejects(adapter.getSnapshot(), /No live validation runs or issue records are available/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(adapter.getSnapshot(controller.signal), /Aborted/);
});

test('Forecasts is unavailable by default instead of presenting mock forecasts', async () => {
  const adapter = new UnavailableForecastsAdapter();
  assert.equal(adapter.mode, 'unavailable');
  await assert.rejects(adapter.getFilterOptions(), /No validated official forecast/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(adapter.getFilterOptions({ signal: controller.signal }), /Aborted/);
});

test('Skill Gap Analysis is unavailable by default instead of presenting mock shortages', async () => {
  const adapter = new UnavailableSkillGapDataAdapter();
  assert.equal(adapter.mode, 'unavailable');
  await assert.rejects(adapter.getFilterOptions(), /No validated official district-by-skill shortage estimate/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(adapter.getOverview({}, controller.signal), /Aborted/);
});

test('module factories have unavailable defaults and production-safe demo guards', () => {
  const checks = [
    ['src/administration/adapter.ts', 'VITE_ADMINISTRATION_API_BASE_URL', 'UnavailableAdministrationDataAdapter'],
    ['src/data-quality/adapter.ts', 'VITE_DATA_QUALITY_API_BASE_URL', 'UnavailableDataQualityDataAdapter'],
    ['src/emerging-skills/adapter.ts', 'VITE_EMERGING_SKILLS_API_BASE_URL', 'UnavailableEmergingSkillsDataAdapter'],
    ['src/supply/adapter.ts', 'VITE_SUPPLY_API_BASE_URL', 'UnavailableSupplyInsightsDataAdapter'],
    ['src/forecasts/adapter.ts', 'VITE_SHRAMIK_API_BASE_URL', 'UnavailableForecastsAdapter'],
    ['src/skill-gaps/adapter.ts', 'VITE_SHRAMIK_API_BASE_URL', 'UnavailableSkillGapDataAdapter'],
  ];
  for (const [file, apiEnv, unavailableClass] of checks) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(source.includes("const showcaseMode = env?.MODE === 'production' || env?.VITE_SHRAMIK_SHOWCASE_MODE === 'true'"), file + ' must detect production/showcase mode');
    if (file === 'src/administration/adapter.ts') {
      assert.ok(source.includes('if (showcaseMode) return new UnavailableAdministrationDataAdapter()'),
        'Administration must fail closed in production until its secured server-side API is verified');
      assert.ok(source.includes("if (env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true') return mockAdministrationDataAdapter"),
        'the local demo remains an explicit development-only choice');
    } else {
      assert.ok(source.includes("if (!showcaseMode && env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true'"), file + ' must ignore demo flag in production');
    }
    assert.ok(source.includes(apiEnv), file + ' must allow configuration of a real API outside the showcase guard');
    assert.ok(source.includes('new ' + unavailableClass + '()'), file + ' must fail closed when unconfigured');
  }
});

test('Data Quality presentation never shows zero findings when there is no data snapshot', () => {
  const source = fs.readFileSync(path.join(root, 'src/data-quality/DataQualityPage.tsx'), 'utf8');
  assert.ok(source.includes("snapshot ? openCount : '—'"));
  assert.ok(source.includes("snapshot ? criticalCount : '—'"));
  assert.ok(source.includes('No live issue register is connected'));
  assert.ok(source.includes("const readOnly = activeAdapter.mode !== 'mock'"));
});

test('Emerging Skills does not render the fixed sample findings as if they were live results', () => {
  const source = fs.readFileSync(path.join(root, 'src/emerging-skills/EmergingSkillsPage.tsx'), 'utf8');
  assert.ok(source.includes('suppliedAdapter || new UnavailableEmergingSkillsDataAdapter()'));
  assert.ok(source.includes("summary?.meta.provenance === 'SYNTHETIC_DEMO'"));
  assert.ok(source.includes('Emerging Skills results unavailable'));
  assert.ok(source.includes("evidenceData ? profileEvidence.evidenceCount.toLocaleString() : 'Not supplied'"));
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
