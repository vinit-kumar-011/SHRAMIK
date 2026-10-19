const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const src = path.resolve(__dirname, '../src/emerging-skills');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-emerging-adapter-'));
const inputPath = path.join(src, 'restAdapter.ts');
const outputPath = path.join(tmp, 'restAdapter.cjs');
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
fs.writeFileSync(outputPath, compiled.outputText);
const loaded = new Module(outputPath, module);
loaded.filename = outputPath;
loaded.paths = Module._nodeModulePaths(tmp);
loaded._compile(compiled.outputText, outputPath);
const { RestEmergingSkillsDataAdapter, EmergingSkillsApiError } = loaded.exports;

test('Emerging Skills REST adapter uses the shared API base and filter query', async () => {
  const calls = [];
  const adapter = new RestEmergingSkillsDataAdapter('https://api.example.test/', async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ data: {
      totalEmerging: 2, totalAccelerating: 1, totalEstablished: 0, totalDeclining: 0,
      topSkills: [], meta: { provenance: 'SOURCE_BACKED', updatedAt: '2026-10-19T00:00:00Z', note: 'contract fixture' },
    }}), { status: 200, headers: { 'content-type': 'application/json' } });
  });

  const summary = await adapter.getSummary({ period: '90d', geography: 'IN', sector: 'Manufacturing', category: 'EMERGING' });
  assert.equal(summary.meta.provenance, 'SOURCE_BACKED');
  assert.equal(calls[0].url, 'https://api.example.test/api/v1/emerging-skills/summary?period=90d&geography=IN&sector=Manufacturing&category=EMERGING');
  assert.equal(calls[0].init.credentials, 'include');
});

test('Emerging Skills REST adapter validates collection payloads and encodes skill IDs', async () => {
  const calls = [];
  const adapter = new RestEmergingSkillsDataAdapter('https://api.example.test/api/v1', async (url) => {
    calls.push(String(url));
    if (String(url).endsWith('/emerging-skills/skills')) {
      return new Response(JSON.stringify({ items: [{ skillId: 'skill/one', canonicalName: 'Skill One' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (String(url).endsWith('/relationships')) {
      return new Response(JSON.stringify({ nodes: [], edges: [], meta: { provenanceState: 'SOURCE_BACKED' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: { message: 'Not found' } }), { status: 404, headers: { 'content-type': 'application/json' } });
  });

  const skills = await adapter.getSkills();
  assert.equal(skills.length, 1);
  assert.equal(await adapter.getSkillDetail('missing'), null);
  const relationships = await adapter.getRelationships('skill/one');
  assert.deepEqual(relationships.nodes, []);
  assert.ok(calls.includes('https://api.example.test/api/v1/emerging-skills/skills/skill%2Fone/relationships'));
});

test('Emerging Skills REST mutations use server endpoints and failures do not fall back to demo', async () => {
  const calls = [];
  const adapter = new RestEmergingSkillsDataAdapter('https://api.example.test', async (url, init) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET' });
    if ((init?.method ?? 'GET') === 'PUT') {
      return new Response(JSON.stringify({ data: { ok: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'maintenance' } }), { status: 503, headers: { 'content-type': 'application/json' } });
  });
  assert.equal(await adapter.addWatchlistItem('skill-1'), true);
  assert.equal(calls[0].method, 'PUT');
  await assert.rejects(adapter.getSkills(), error => error instanceof EmergingSkillsApiError && error.status === 503 && /maintenance/.test(error.message));
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
