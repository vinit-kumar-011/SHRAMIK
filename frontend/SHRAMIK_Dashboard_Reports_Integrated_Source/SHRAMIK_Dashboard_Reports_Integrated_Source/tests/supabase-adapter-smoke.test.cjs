const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const filePath = path.resolve(__dirname, '../src/api/supabase-adapter.ts');
const source = fs.readFileSync(filePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10 },
  fileName: filePath,
});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-supabase-adapter-'));
const outPath = path.join(tmp, 'supabase-adapter.cjs');
fs.writeFileSync(outPath, compiled.outputText);
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '../auth/session') return { getStoredAuthSession: () => null };
  if (request === '../supabase/config') return {
    SUPABASE_URL: 'https://test.supabase.co',
    supabaseHeaders: () => new Headers({ apikey: 'test-public-key', Authorization: 'Bearer test-public-key', Accept: 'application/json' }),
  };
  return originalLoad.call(this, request, parent, isMain);
};
let SupabaseLabourMarketDataAdapter;
try {
  const loaded = new Module(outPath, module);
  loaded.filename = outPath;
  loaded.paths = Module._nodeModulePaths(tmp);
  loaded._compile(compiled.outputText, outPath);
  SupabaseLabourMarketDataAdapter = loaded.exports.SupabaseLabourMarketDataAdapter;
} finally {
  Module._load = originalLoad;
}

function response(rows, status = 200) {
  return new Response(JSON.stringify(rows), { status, headers: { 'content-type': 'application/json' } });
}

test('Supabase dashboard adapter uses live published views and does not synthesize demand or supply trends', async () => {
  const calls = [];
  const fetcher = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes('/states?')) return response([{ id: 'IN-OD', name: 'Odisha', code: 'OD' }]);
    if (url.includes('/sh_public_dashboard_kpis?')) return response([
      { metric_code: 'ESHRAM_REGISTRATION_COUNT', title: 'e-Shram registrations', value_numeric: 317831749, unit: 'registrations', reference_period: 'AS_OF_2026-07-14', source_label: 'PIB source', source_url: 'https://example.gov.in/source', as_of_date: '2026-07-14', interpretation_note: 'Cumulative registrations, not active labour supply.' },
      { metric_code: 'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE', title: 'Provisional CTS seat capacity', value_numeric: 973058, unit: 'seats', reference_period: 'Academic session 2026', source_label: 'DGT source', source_url: null, as_of_date: '2026-07-08', interpretation_note: 'Provisional capacity, not labour supply.' },
      { metric_code: 'CTS_ITI_COUNT', title: 'Industrial Training Institutes', value_numeric: 15012, unit: 'ITIs', reference_period: 'Snapshot', source_label: 'Parliament source', source_url: null, as_of_date: null, interpretation_note: null },
      { metric_code: 'UR', title: 'Unemployment rate (PLFS 2025)', value_numeric: 3.1, unit: '%', reference_period: 'CY2025', source_label: 'PLFS source', source_url: null, as_of_date: '2026-10-14', interpretation_note: 'Published benchmark.' },
    ]);
    if (url.includes('/source_metric_observations?')) return response([
      { metric_code: 'LFPR', value_numeric: 44.9, unit: 'percent', reference_period: 'CY2025', dimension_values: { sex: 'person', area: 'combined', age_domain: 'all_ages', source_url: 'https://example.gov.in/plfs' }, provenance_state: 'SOURCE_BACKED', is_synthetic: false },
      { metric_code: 'WPR', value_numeric: 43.5, unit: 'percent', reference_period: 'CY2025', dimension_values: { sex: 'person', area: 'combined', age_domain: 'all_ages' }, provenance_state: 'SOURCE_BACKED', is_synthetic: false },
      { metric_code: 'LFPR', value_numeric: 79.1, unit: 'percent', reference_period: 'CY2025', dimension_values: { sex: 'male', area: 'combined', age_domain: 'all_ages' }, provenance_state: 'SOURCE_BACKED', is_synthetic: false },
      { metric_code: 'LFPR', value_numeric: 99, unit: 'percent', reference_period: 'CY2024', dimension_values: { sex: 'person', area: 'combined', age_domain: 'all_ages' }, provenance_state: 'SOURCE_BACKED', is_synthetic: false },
    ]);
    if (url.includes('/sh_public_dashboard_regions?')) return response([
      { metric_key: 'REGISTRATIONS', metric_label: 'e-Shram registrations', state_id: 'IN-OD', state_name: 'Odisha', value_numeric: 123456, unit: 'registrations', reference_period: 'AS_OF_2026-07-14', source_label: 'PIB source', source_url: null, as_of_date: '2026-07-14', interpretation_note: 'Cumulative registrations.' },
    ]);
    if (url.includes('/sectors?')) return response([]);
    if (url.includes('/skills?')) return response([]);
    return response([]);
  };
  const headerBuilder = () => new Headers({ apikey: 'test-public-key', Authorization: 'Bearer test-public-key', Accept: 'application/json' });
  const adapter = new SupabaseLabourMarketDataAdapter('https://test.supabase.co', fetcher, headerBuilder);
  const data = await adapter.getDashboard({ regionCode: 'IN', periodYears: 5 });
  assert.equal(data.meta.provenance, 'source-backed');
  assert.equal(data.trend.length, 0);
  assert.ok(data.kpis.some(item => item.id === 'eshram-registration-count' && item.value === 317831749));
  assert.ok(data.kpis.some(item => item.id === 'ur' && item.value === 3.1));
  assert.ok(data.kpis.some(item => item.id === 'lfpr' && item.value === 44.9));
  assert.ok(data.kpis.some(item => item.id === 'wpr' && item.value === 43.5));
  assert.ok(data.kpis.every(item => item.deltaPct === null));
  assert.ok(calls.some(call => call.url.includes('/rest/v1/sh_public_dashboard_kpis')));
  assert.ok(calls.every(call => call.init.headers.get('apikey') === 'test-public-key'));

  const ranking = await adapter.getRegionRankings({ regionCode: 'IN', metric: 'demand' });
  assert.equal(ranking.items[0].code, 'OD');
  assert.equal(ranking.meta.provenance, 'source-backed');
});


test('published dashboard KPIs survive optional region-list and PLFS-enrichment failures', async () => {
  const calls = [];
  const publishedKpis = [
    ['ESHRAM_REGISTRATION_COUNT', 'e-Shram registrations', 123456, 'registrations'],
    ['CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE', 'Provisional CTS seat capacity', 3210, 'seats'],
    ['CTS_ITI_COUNT', 'Industrial Training Institutes', 45, 'ITIs'],
    ['UR', 'Unemployment rate (PLFS 2025)', 3.2, '%'],
  ].map(([metric_code, title, value_numeric, unit], sortIndex) => ({
    metric_code, title, value_numeric, unit, reference_period: 'Published snapshot',
    source_label: 'Official publisher', source_url: null, as_of_date: '2026-10-14',
    interpretation_note: 'Published context indicator.', sort_order: sortIndex + 1,
  }));

  const fetcher = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('/states?')) return response({ message: 'temporarily unavailable' }, 503);
    if (url.includes('/sh_public_dashboard_kpis?')) return response(publishedKpis);
    if (url.includes('/source_metric_observations?')) return response({ message: 'optional benchmark query unavailable' }, 503);
    return response([]);
  };
  const adapter = new SupabaseLabourMarketDataAdapter('https://test.supabase.co', fetcher, headerBuilder);
  const data = await adapter.getDashboard({ regionCode: 'IN', periodYears: 5 });

  assert.equal(data.kpis.length, 4, 'core source-backed KPIs should not disappear');
  assert.ok(data.kpis.some(item => item.id === 'eshram-registration-count'));
  assert.ok(data.kpis.some(item => item.id === 'ur'));
  assert.ok(data.meta.notes.some(note => note.includes('region selector could not be refreshed')));
  assert.ok(data.meta.notes.some(note => note.includes('optional PLFS published benchmarks')));
  assert.ok(calls.some(url => url.includes('/sh_public_dashboard_kpis?')));
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
