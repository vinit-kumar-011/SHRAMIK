const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const src = path.resolve(__dirname, '../src/administration');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-admin-adapter-'));
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
const { MockAdministrationDataAdapter } = compileAndLoad('mockAdapter.ts');
const { RestAdministrationDataAdapter, AdministrationApiError } = compileAndLoad('restAdapter.ts');

const snapshot = (provenance = 'SOURCE_BACKED') => ({
  accessRequests: [{ id: 'REQ-1', name: 'Analyst', email: 'analyst@example.invalid', organisation: 'Agency', requestedRole: 'Viewer', submitted: '2026-10-19', purpose: 'Review published data', status: 'pending', document: 'Evidence reference' }],
  users: [{ id: 'USR-1', name: 'Analyst', email: 'analyst@example.invalid', organisation: 'Agency', role: 'Viewer', status: 'active', lastSeen: '2026-10-18' }],
  roles: [{ name: 'Viewer', summary: 'Read approved outputs', permissions: ['View'] }],
  audit: [{ id: 'AUD-1', timestamp: '2026-10-19T00:00:00Z', actor: 'System', action: 'Request submitted', target: 'REQ-1', outcome: 'Pending' }],
  meta: { provenance, note: 'Contract fixture', sourceLabel: 'Admin API', updatedAt: '2026-10-19T00:00:00Z' },
});

test('mock Administration adapter labels fictional identities and session audit data', async () => {
  const adapter = new MockAdministrationDataAdapter();
  assert.equal(adapter.mode, 'mock');
  const result = await adapter.getSnapshot();
  assert.equal(result.meta.provenance, 'SYNTHETIC_DEMO');
  assert.ok(result.accessRequests.every(item => item.email.endsWith('.invalid')));
});

test('Administration REST adapter uses a read-only versioned endpoint', async () => {
  const calls = [];
  const adapter = new RestAdministrationDataAdapter('https://api.example.test/', async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ data: snapshot() }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const result = await adapter.getSnapshot();
  assert.equal(result.meta.provenance, 'SOURCE_BACKED');
  assert.equal(calls[0].url, 'https://api.example.test/api/v1/admin/overview');
  assert.equal(calls[0].init.method, undefined);
  assert.equal(calls[0].init.credentials, 'include');
  const source = fs.readFileSync(path.join(src, 'restAdapter.ts'), 'utf8');
  assert.doesNotMatch(source, /method:\s*['"](?:POST|PUT|PATCH|DELETE)/i, 'admin REST adapter must not issue permission mutations');
});

test('Administration REST adapter rejects invalid status enums and surfaces access denial', async () => {
  const invalid = snapshot();
  invalid.users[0].status = 'owner';
  const malformed = new RestAdministrationDataAdapter('https://api.example.test', async () => new Response(JSON.stringify(invalid), { status: 200, headers: { 'content-type': 'application/json' } }));
  await assert.rejects(malformed.getSnapshot(), error => error instanceof AdministrationApiError && /invalid request, user, role, or audit fields/.test(error.message));

  const forbidden = new RestAdministrationDataAdapter('https://api.example.test', async () => new Response(JSON.stringify({ error: { message: 'Access denied' } }), { status: 403, headers: { 'content-type': 'application/json' } }));
  await assert.rejects(forbidden.getSnapshot(), error => error instanceof AdministrationApiError && error.status === 403 && error.message === 'Access denied');
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
