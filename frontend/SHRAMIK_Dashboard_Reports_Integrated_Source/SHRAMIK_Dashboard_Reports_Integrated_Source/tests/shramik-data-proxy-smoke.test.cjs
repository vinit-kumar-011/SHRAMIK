const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const sourcePath = path.resolve(__dirname, '../api/shramik-data.ts');
const rootDeployHandlerPath = path.resolve(__dirname, '../../../../api/shramik-data.ts');
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

test('public proxy exposes inactive canonical skills for review without activating them', async () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;
  let request;
  global.fetch = async (input, init) => {
    request = { url: String(input), init };
    return new Response(JSON.stringify([{
      id: 'nco2015_7112_0200', code: 'nco2015_7112_0200', name: 'Bricklayerer, Construction',
      description: null, is_active: false,
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  process.env.VITE_SUPABASE_URL = 'https://unit-test.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_unit_test';
  try {
    const res = responseCapture();
    await handler({
      method: 'GET',
      query: { table: 'skills', select: 'id,code,name,description,is_active', order: 'name.asc', limit: '5' },
    }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].is_active, false);
    const url = new URL(request.url);
    assert.equal(url.searchParams.get('select'), 'id,code,name,description,is_active');
    assert.equal(url.searchParams.has('is_active'), false, 'the public reader must not hide review-only skill references by default');

    const rootHandlerSource = fs.readFileSync(rootDeployHandlerPath, 'utf8');
    assert.match(rootHandlerSource, /'sector_mapping_confidence', 'description', 'is_active'/, 'the deployed root handler must expose the same approved review-status field');
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

    const wildcard = responseCapture();
    await handler({ method: 'GET', query: { table: 'states', select: '*' } }, wildcard);
    assert.equal(wildcard.code, 400);
    assert.match(wildcard.body.error, /explicit allow-listed column set/);
    assert.equal(fetchCount, 0);

    const invalidOrder = responseCapture();
    await handler({ method: 'GET', query: { table: 'states', select: 'id,name', order: 'id.desc,secret.asc' } }, invalidOrder);
    assert.equal(invalidOrder.code, 400);
    assert.match(invalidOrder.body.error, /non-allow-listed column/);
    assert.equal(fetchCount, 0);

    const internalNotes = responseCapture();
    await handler({
      method: 'GET',
      query: { table: 'data_sources', select: 'id,name,notes' },
    }, internalNotes);
    assert.equal(internalNotes.code, 400, 'internal source notes must not be exposed through the public reader');
    assert.match(internalNotes.body.error, /allow-listed/);
    assert.equal(fetchCount, 0, 'rejected internal columns must not query Supabase');

    const upstream = responseCapture();
    await handler({ method: 'GET', query: { table: 'states', select: 'id,name,code' } }, upstream);
    assert.equal(upstream.code, 403);
    assert.match(upstream.body.error, /permission denied/);
    assert.equal(upstream.body.upstreamStatus, 403);
  } finally {
    global.fetch = originalFetch;
  }
});

test('repository-root Vercel API handler boots standalone and serves an allow-listed request', async () => {
  assert.equal(fs.existsSync(rootDeployHandlerPath), true, 'root handler must exist when the Vercel project root is the repository');
  const entry = fs.readFileSync(rootDeployHandlerPath, 'utf8');
  assert.match(entry, /const TABLES: Record<string, TableRule>/);
  assert.match(entry, /export default createPublicSupabaseDataHandler\(\);/);
  assert.doesNotMatch(entry, /export\s+\{\s*default\s*\}\s+from/, 'the root runtime must not load a nested package across the ESM boundary');

  const rootCompiled = ts.transpileModule(entry, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      strict: true,
    },
    fileName: rootDeployHandlerPath,
  });
  const rootOutputPath = path.join(tempDir, 'root-shramik-data.cjs');
  fs.writeFileSync(rootOutputPath, rootCompiled.outputText);
  const rootModule = new Module(rootOutputPath, module);
  rootModule.filename = rootOutputPath;
  rootModule.paths = Module._nodeModulePaths(tempDir);
  rootModule._compile(rootCompiled.outputText, rootOutputPath);
  const rootHandler = rootModule.exports.default;

  const originalFetch = global.fetch;
  const originalUrl = process.env.VITE_SUPABASE_URL;
  const originalKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  let request;
  global.fetch = async (input, init) => {
    request = { url: String(input), init };
    return new Response(JSON.stringify([{ id: 'IN-OD', name: 'Odisha', code: 'OD' }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  process.env.VITE_SUPABASE_URL = 'https://unit-test.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_unit_test';
  try {
    const missingTable = responseCapture();
    await rootHandler({ method: 'GET', query: {} }, missingTable);
    assert.equal(missingTable.code, 400, 'a cold function invocation should execute the handler, not fail at module load');

    const internalNotes = responseCapture();
    await rootHandler({
      method: 'GET',
      query: { table: 'data_sources', select: 'id,name,notes' },
    }, internalNotes);
    assert.equal(internalNotes.code, 400, 'the repository-root Vercel handler must apply the same restricted source-note allow-list');

    const res = responseCapture();
    await rootHandler({ method: 'GET', query: { table: 'states', select: 'id,name,code', limit: '3' } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body, [{ id: 'IN-OD', name: 'Odisha', code: 'OD' }]);
    assert.equal(new URL(request.url).pathname, '/rest/v1/states');
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});

test.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
