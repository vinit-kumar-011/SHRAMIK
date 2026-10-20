const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const sourcePath = path.resolve(__dirname, '../src/auth/session.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10 },
  fileName: sourcePath,
});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-auth-flow-'));
const outPath = path.join(tmp, 'session.cjs');
fs.writeFileSync(outPath, compiled.outputText);
const originalLoad = Module._load;
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
  return originalLoad.call(this, request, parent, isMain);
};
let sessionApi;
try {
  const loaded = new Module(outPath, module);
  loaded.filename = outPath;
  loaded.paths = Module._nodeModulePaths(tmp);
  loaded._compile(compiled.outputText, outPath);
  sessionApi = loaded.exports;
} finally { Module._load = originalLoad; }

function makeStorage() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
  };
}

test('password sign-in calls Supabase Auth and stores a tab-scoped session', async () => {
  const oldWindow = global.window;
  const oldFetch = global.fetch;
  const sessionStorage = makeStorage();
  global.window = { sessionStorage };
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({
      access_token: 'access-test', refresh_token: 'refresh-test', expires_in: 3600,
      user: { id: 'user-123', email: 'analyst@example.org', user_metadata: { full_name: 'Analyst One' } },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const session = await sessionApi.signInWithPassword('analyst@example.org', 'password-for-test');
    assert.equal(calls[0].url, 'https://test.supabase.co/auth/v1/token?grant_type=password');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(JSON.parse(calls[0].init.body).email, 'analyst@example.org');
    assert.equal(session.access_token, 'access-test');
    assert.equal(session.user.id, 'user-123');
    assert.equal(sessionApi.getStoredAuthSession().refresh_token, 'refresh-test');
  } finally {
    global.fetch = oldFetch;
    if (oldWindow === undefined) delete global.window; else global.window = oldWindow;
  }
});

test('access request writes only the validated request fields through PostgREST', async () => {
  const oldFetch = global.fetch;
  let call;
  global.fetch = async (url, init) => {
    call = { url: String(url), init };
    return new Response(null, { status: 201 });
  };
  try {
    await sessionApi.submitAccessRequest({
      fullName: 'A Person',
      email: 'PERSON@EXAMPLE.ORG',
      organization: 'Research Organisation',
      requestedRole: 'Research Analyst',
      purpose: 'Review workforce training coverage for a policy project.',
    });
    assert.equal(call.url, 'https://test.supabase.co/rest/v1/access_requests');
    assert.equal(call.init.method, 'POST');
    assert.equal(call.init.headers.get('Prefer'), 'return=minimal');
    const body = JSON.parse(call.init.body);
    assert.equal(body.email, 'person@example.org');
    assert.equal(body.requested_role, 'Research Analyst');
    assert.equal(body.status, undefined, 'client cannot choose request status');
    assert.equal(body.id, undefined, 'client cannot choose request ID');
  } finally { global.fetch = oldFetch; }
});

test('auth and request errors are surfaced instead of showing fake success', async () => {
  const oldFetch = global.fetch;
  const oldWindow = global.window;
  global.window = { sessionStorage: makeStorage() };
  global.fetch = async () => new Response(JSON.stringify({ msg: 'Invalid login credentials' }), {
    status: 400, headers: { 'content-type': 'application/json' },
  });
  try {
    await assert.rejects(sessionApi.signInWithPassword('a@example.org', 'bad'), /Invalid login credentials/);
    await assert.rejects(sessionApi.submitAccessRequest({
      fullName: 'A Person', email: 'a@example.org', organization: 'Example Org',
      requestedRole: 'Read-only Viewer', purpose: 'This test request is long enough to satisfy the client-side validation.',
    }), /Invalid login credentials/);
  } finally {
    global.fetch = oldFetch;
    if (oldWindow === undefined) delete global.window; else global.window = oldWindow;
  }
});


test('password sign-in reports network failures in clear user-facing language', async () => {
  const oldFetch = global.fetch;
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };
  try {
    await assert.rejects(
      sessionApi.signInWithPassword('analyst@example.org', 'test-password'),
      /Could not reach SHRAMIK authentication/,
    );
  } finally { global.fetch = oldFetch; }
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
