const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const project = path.resolve(__dirname, '..');
const src = path.join(project, 'src', 'administration');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-admin-unavailable-'));

function compileAndLoad(fileName) {
  const inputPath = path.join(src, fileName);
  const source = fs.readFileSync(inputPath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, esModuleInterop: true },
    fileName: inputPath,
    reportDiagnostics: true,
  });
  const errors = (compiled.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
  const outputPath = path.join(tmp, fileName.replace(/\.ts$/, '.cjs'));
  fs.writeFileSync(outputPath, compiled.outputText);
  const loaded = new Module(outputPath, module);
  loaded.filename = outputPath;
  loaded.paths = Module._nodeModulePaths(tmp);
  loaded._compile(compiled.outputText, outputPath);
  return loaded.exports;
}

const { UnavailableAdministrationDataAdapter } = compileAndLoad('unavailableAdapter.ts');

test('unconfigured Administration returns an explicit unavailable state, never demo users', async () => {
  const adapter = new UnavailableAdministrationDataAdapter();
  assert.equal(adapter.mode, 'unavailable');
  const snapshot = await adapter.getSnapshot();
  assert.equal(snapshot.meta.provenance, 'NOT_AVAILABLE');
  assert.deepEqual(snapshot.accessRequests, []);
  assert.deepEqual(snapshot.users, []);
  assert.deepEqual(snapshot.roles, []);
  assert.deepEqual(snapshot.audit, []);
  assert.match(snapshot.meta.note, /fictional records/i);
});

test('unavailable adapter respects cancellation', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(new UnavailableAdministrationDataAdapter().getSnapshot(controller.signal), /Aborted/);
});

test('default Administration never picks fake fixtures unless demo mode is explicit', () => {
  const factory = fs.readFileSync(path.join(src, 'adapter.ts'), 'utf8');
  assert.match(factory, /VITE_SHRAMIK_USE_DEMO_DATA === 'true'/);
  assert.match(factory, /new UnavailableAdministrationDataAdapter\(\)/);
  assert.match(factory, /configuredBase\?\.trim\(\)\s*\?\s*new RestAdministrationDataAdapter/);
});

test('Administration UI disables all mutations unless it is the explicit demo adapter', () => {
  const page = fs.readFileSync(path.join(src, 'AdministrationPage.tsx'), 'utf8');
  assert.match(page, /const readOnly = activeAdapter\.mode !== 'mock'/);
  assert.match(page, /const unavailable = activeAdapter\.mode === 'unavailable'/);
  assert.match(page, /Live Administration service is unavailable/);
  assert.match(page, /serviceUnavailable && <div className="administration-unavailable-notice"/);
  const stateInitialization = Math.max(
    page.indexOf("const [snapshot, setSnapshot]"),
    page.indexOf("const [loading, setLoading]"),
    page.indexOf("const [error, setError]"),
  );
  assert.ok(stateInitialization >= 0);
  assert.ok(page.indexOf("const serviceUnavailable =") > stateInitialization,
    'serviceUnavailable must be computed after its React state dependencies to avoid a temporal-dead-zone render error');

  assert.match(page, /disabled=\{readOnly \|\| selectedRequest\.status !== 'pending'\}/);
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
