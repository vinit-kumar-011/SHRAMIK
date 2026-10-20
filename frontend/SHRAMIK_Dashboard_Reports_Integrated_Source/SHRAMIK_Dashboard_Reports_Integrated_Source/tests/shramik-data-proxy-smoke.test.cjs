const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const sourcePath = path.resolve(__dirname, '../api/shramik-data.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  },
  fileName: sourcePath,
});
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-public-proxy-'));
const outputPath = path.join(tempDir, 'shramik-data.cjs');
fs.writeFileSync(outputPath, compiled.outputText);
const moduleInstance = new Module(outputPath, module);
moduleInstance.filename = outputPath;
moduleInstance.paths = Module._nodeModulePaths(tempDir);
moduleInstance._compile(compiled.outputText, outputPath);
const handler = moduleInstance.exports.default;

function responseCapture() {
  return {
    code: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; },
  };
}

test('public proxy exposes allowed source-backed reads and forces non-synthetic filters', async () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;
  let request;
  global.fetch = async (input, init) => {
    request = { url: String(input), init };
    return new Response(JSON.stringify([{ id: 'row-1', metric_code: 'UR', value_numeric: 3.1 }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  process.env.VITE_SUPABASE_URL = 'https://unit-test.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_unit_test';
  try {
    const res = responseCapture();
    await handler({
      method: 'GET',
      query: {
        table: 'source_metric_observations',
        select: 'id,metric_code,value_numeric',
        metric_code: 'in.(UR,LFPR,WPR)',
        provenance_state: 'eq.SYNTHETIC_DEMO',
        is_synthetic: 'eq.true',
        limit: '3',
      },
    }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.headers['x-shramik-data-source'], 'supabase-public-read');
    assert.match(request.url, /^https:\/\/unit-test\.supabase\.co\/rest\/v1\/source_metric_observations\?/);
    const url = new URL(request.url);
    assert.equal(url.searchParams.get('provenance_state'), 'eq.SOURCE_BACKED');
    assert.equal(url.searchParams.get('is_synthetic'), 'eq.false');
    assert.equal(request.init.headers.apikey, 'sb_publishable_unit_test');
    assert.equal(request.init.headers.Authorization, 'Bearer sb_publishable_unit_test');
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('public proxy rejects non-allowlisted tables and methods without querying Supabase', async () => {
  const originalFetch = global.fetch;
  let fetchCount = 0;
  global.fetch = async () => { fetchCount += 1; throw new Error('should not run'); };
  try {
    const protectedTable = responseCapture();
    await handler({ method: 'GET', query: { table: 'access_requests', select: '*' } }, protectedTable);
    assert.equal(protectedTable.code, 400);
    assert.match(protectedTable.body.error, /not available/);

    const method = responseCapture();
    await handler({ method: 'POST', query: { table: 'states' } }, method);
    assert.equal(method.code, 405);
    assert.equal(method.headers.allow, 'GET');
    assert.equal(fetchCount, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test('public proxy rejects ungranted columns and returns useful upstream errors', async () => {
  const originalFetch = global.fetch;
  let fetchCount = 0;
  global.fetch = async () => {
    fetchCount += 1;
    return new Response(JSON.stringify({ message: 'permission denied for relation states' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const invalidColumn = responseCapture();
    await handler({ method: 'GET', query: { table: 'states', select: 'id,secret_field' } }, invalidColumn);
    assert.equal(invalidColumn.code, 400);
    assert.equal(fetchCount, 0);

    const upstream = responseCapture();
    await handler({ method: 'GET', query: { table: 'states', select: 'id,name,code' } }, upstream);
    assert.equal(upstream.code, 403);
    assert.match(upstream.body.error, /permission denied/);
    assert.equal(upstream.body.upstreamStatus, 403);
  } finally {
    global.fetch = originalFetch;
  }
});

test.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
