const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const filePath = path.resolve(__dirname, '../src/data-sources/supabase-adapter.ts');
const source = fs.readFileSync(filePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10 },
  fileName: filePath,
});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-source-registry-'));
const outPath = path.join(tmp, 'supabase-adapter.cjs');
fs.writeFileSync(outPath, compiled.outputText);
const originalLoad = Module._load;
class DataSourcesAdapterError extends Error {
  constructor(detail) { super(detail.message); this.detail = detail; }
}
Module._load = function(request, parent, isMain) {
  if (request === '../supabase/config') return {
    SUPABASE_URL: 'https://test.supabase.co',
    supabaseHeaders: (_token, extras) => {
      const headers = new Headers(extras);
      headers.set('apikey', 'test-publishable-key');
      headers.set('Authorization', 'Bearer test-publishable-key');
      headers.set('Accept', 'application/json');
      return headers;
    },
  };
  if (request === './DataSourcesDataAdapter') return { DataSourcesAdapterError };
  return originalLoad.call(this, request, parent, isMain);
};
let SupabaseDataSourcesAdapter;
try {
  const loaded = new Module(outPath, module);
  loaded.filename = outPath;
  loaded.paths = Module._nodeModulePaths(tmp);
  loaded._compile(compiled.outputText, outPath);
  SupabaseDataSourcesAdapter = loaded.exports.SupabaseDataSourcesAdapter;
} finally { Module._load = originalLoad; }

const registryRows = [
  {
    id: 'source-1', name: 'PLFS Annual Report', source_type: 'REPORT', publisher: 'MoSPI',
    url: 'https://example.gov.in/plfs.pdf', publication_date: '2026-05-29', accessed_at: '2026-10-12T00:00:00Z',
    coverage_start: 2025, coverage_end: 2025,
  },
  {
    id: 'source-2', name: 'Unconfigured source', source_type: 'OTHER', publisher: 'SHRAMIK',
    url: null, publication_date: null, accessed_at: null, coverage_start: null, coverage_end: null,
  },
];

test('source registry reads live metadata and never promotes a registered URL to healthy/fresh status', async () => {
  const calls = [];
  const adapter = new SupabaseDataSourcesAdapter('https://test.supabase.co', async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify(registryRows), { status: 200, headers: { 'content-type': 'application/json' } });
  }, () => new Headers({ apikey: 'test-publishable-key', Authorization: 'Bearer test-publishable-key' }));
  const page = await adapter.listSources({ query: '', status: 'ALL', type: 'ALL', agency: 'ALL', page: 1, pageSize: 8 });
  assert.equal(page.provenance, 'SOURCE_BACKED');
  assert.equal(page.total, 2);
  assert.equal(page.items[0].name, 'PLFS Annual Report');
  assert.equal(page.items[0].provenance, 'SOURCE_BACKED');
  assert.equal(page.items[0].lifecycleStatus, 'UNKNOWN');
  assert.equal(page.items[0].freshnessStatus, 'UNKNOWN');
  assert.equal(page.items[0].capabilities.edit, false);
  assert.equal(page.items[1].lifecycleStatus, 'NOT_CONFIGURED');
  assert.equal(adapter.capabilities.createSource, false);
  assert.equal(adapter.createSource, undefined);
  const requested = new URL(calls[0].url);
  assert.equal(requested.pathname, '/rest/v1/data_sources');
  assert.ok(requested.searchParams.get('select').includes('publication_date'));
  assert.ok(!requested.searchParams.get('select').includes('notes'), 'only columns granted to browser roles are requested');
});

test('missing retrieval and field-map grants produce explicit empty results, not mock activity', async () => {
  const adapter = new SupabaseDataSourcesAdapter('https://test.supabase.co', async () =>
    new Response(JSON.stringify(registryRows), { status: 200, headers: { 'content-type': 'application/json' } }),
    () => new Headers({ apikey: 'test-publishable-key' }));
  const runs = await adapter.listIngestionRuns('source-1');
  const fields = await adapter.getFieldMappings('source-1');
  const coverage = await adapter.getCoverage('source-1');
  assert.equal(runs.total, 0);
  assert.equal(runs.provenance, 'UNKNOWN');
  assert.equal(fields.total, 0);
  assert.equal(fields.provenance, 'UNKNOWN');
  assert.equal(coverage.state, 'UNKNOWN');
  assert.ok(coverage.limitations.length >= 2);
});

test('registry network failures are visible', async () => {
  const adapter = new SupabaseDataSourcesAdapter('https://test.supabase.co', async () => {
    throw new Error('offline');
  }, () => new Headers({ apikey: 'test-publishable-key' }));
  await assert.rejects(
    adapter.listSources({ query: '', status: 'ALL', type: 'ALL', agency: 'ALL', page: 1, pageSize: 8 }),
    (error) => error instanceof DataSourcesAdapterError && error.detail.retryable === true,
  );
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
