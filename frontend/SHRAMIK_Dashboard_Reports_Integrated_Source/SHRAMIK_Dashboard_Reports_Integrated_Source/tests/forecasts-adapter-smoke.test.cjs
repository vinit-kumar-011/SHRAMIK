const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const src = path.resolve(__dirname, '../src/forecasts');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-forecasts-adapter-'));
function compileAndLoad(fileName) {
  const input = fs.readFileSync(path.join(src, fileName), 'utf8');
  const result = ts.transpileModule(input, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, esModuleInterop: true },
    fileName, reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
  const outPath = path.join(tmp, fileName.replace(/\.ts$/, '.cjs'));
  fs.writeFileSync(outPath, result.outputText);
  const loadedModule = new Module(outPath, module);
  loadedModule.filename = outPath;
  loadedModule.paths = Module._nodeModulePaths(tmp);
  loadedModule._compile(result.outputText, outPath);
  return loadedModule.exports;
}
const { MockForecastsAdapter } = compileAndLoad('mockAdapter.ts');
const { RestForecastsAdapter, ForecastsApiError } = compileAndLoad('restAdapter.ts');
let filters;
async function defaults(adapter = new MockForecastsAdapter()) {
  const opts = await adapter.getFilterOptions();
  filters = opts.defaults;
  return { adapter, opts, filters };
}

test('filter options expose explicit mock provenance and supported filters/defaults', async () => {
  const { opts, filters: f } = await defaults();
  assert.equal(opts.meta.provenance, 'mock');
  assert.ok(opts.horizons.includes(3));
  assert.ok(opts.states.some((item) => item.code === 'IN-OD' && item.label === 'Odisha'));
  assert.equal(f.geographyCode, 'IN');
  assert.ok(opts.meta.notes.some((note) => /not verified/i.test(note)));
});

test('overview uses one compatible applied filter snapshot and computes projected gap as demand minus supply', async () => {
  const { adapter, filters: f } = await defaults();
  const overview = await adapter.getOverview(f);
  const byKey = Object.fromEntries(overview.kpis.map((metric) => [metric.key, metric]));
  assert.deepEqual(Object.keys(byKey).sort(), ['highRiskOccupations', 'projectedDemand', 'projectedGap', 'projectedSupply'].sort());
  assert.equal(byKey.projectedGap.value, byKey.projectedDemand.value - byKey.projectedSupply.value);
  assert.equal(overview.meta.provenance, 'mock');
  assert.match(byKey.projectedGap.note, /demand − supply/i);
});

test('forecast series separates observed history from dashed projection and only supplies explicit intervals for forecast points', async () => {
  const { adapter, filters: f } = await defaults();
  const series = await adapter.getSeries({ ...f, horizonYears: 3 }, 'total');
  assert.equal(series.meta.provenance, 'mock');
  assert.ok(series.points.some((point) => point.actualDemand != null && point.forecastDemand == null));
  const future = series.points.filter((point) => point.forecastDemand != null);
  assert.equal(future.at(-1).year, 2027);
  assert.ok(future.every((point) => point.actualDemand == null && point.demandInterval && point.demandInterval.lower <= point.forecastDemand && point.demandInterval.upper >= point.forecastDemand));
  assert.equal(series.intervalLevel, 80);
});

test('warning list is ordered, filters correctly, and counts match distinct records', async () => {
  const { adapter, filters: f } = await defaults();
  const all = await adapter.getAlerts(f, { page: 0, pageSize: 20 });
  assert.ok(all.total >= 5);
  assert.equal(all.meta.provenance, 'mock');
  assert.equal(all.counts.total, all.total);
  const byStatus = ['new', 'under-review', 'acknowledged', 'resolved'].reduce((sum, key) => sum + all.counts[key], 0);
  assert.equal(byStatus, all.total);
  const priority = await adapter.getWarnings(f, { limit: 20 });
  const filtered = await adapter.getAlerts(f, { severity: 'critical', page: 0, pageSize: 20 });
  assert.ok(filtered.items.every((item) => item.severity === 'critical'));
  const criticalWeight = { critical: 0, high: 1, moderate: 2, low: 3, information: 4 };
  for (let i = 1; i < priority.items.length; i += 1) assert.ok(criticalWeight[priority.items[i - 1].severity] <= criticalWeight[priority.items[i].severity]);
});

test('risk matrix and map explicitly mark unavailable geometry instead of raster-mapping values', async () => {
  const { adapter, filters: f } = await defaults();
  const matrix = await adapter.getRiskMatrix(f, 'occupation');
  const map = await adapter.getStateRiskMap(f, 'occupation');
  assert.ok(matrix.cells.length > 0);
  assert.ok(matrix.cells.every((cell) => cell.demand - cell.supply === cell.gap));
  assert.equal(map.geometryAvailable, false);
  assert.match(map.geometryUnavailableReason, /verified, licensed State\/UT GeoJSON/i);
  assert.equal(map.meta.provenance, 'mock');
});

test('scenario comparison is adapter-owned, conditional, and bounded editable assumptions are exposed', async () => {
  const { adapter, filters: f } = await defaults();
  const options = await adapter.getScenarioOptions(f);
  const adjustable = options.assumptions.find((item) => item.key === 'growthRatePct');
  assert.ok(adjustable && adjustable.editable);
  assert.ok(adjustable.min <= 0 && adjustable.max >= 0);
  const result = await adapter.compareScenarios(f, ['baseline', 'higher-growth', 'lower-growth'], { growthRatePct: 1 });
  assert.equal(result.meta.provenance, 'mock');
  assert.equal(result.scenarios.length, 3);
  assert.notDeepEqual(result.scenarios[0].points.map((point) => point.forecastDemand), result.scenarios[1].points.map((point) => point.forecastDemand));
  assert.ok(result.scenarios.every((scenario) => scenario.points.every((point) => point.forecastDemand != null && point.forecastSupply != null)));
});

test('model performance includes evaluation window and coverage limits, not invented confidence percentage', async () => {
  const { adapter, filters: f } = await defaults();
  const result = await adapter.getModelPerformance(f);
  assert.equal(result.meta.provenance, 'mock');
  assert.ok(result.evaluation.startPeriod && result.evaluation.endPeriod && result.evaluation.horizon);
  assert.ok(result.coverage.usablePeriods < result.coverage.expectedPeriods);
  assert.ok(result.metrics.some((metric) => metric.key === 'mae'));
  assert.ok(!result.metrics.some((metric) => /confidence/i.test(metric.label)));
  assert.ok(result.limitations.some((item) => /synthetic/i.test(item)));
});

test('alert detail and workflow actions mutate only the adapter response and preserve a timeline', async () => {
  const { adapter, filters: f } = await defaults();
  const initial = await adapter.getAlerts(f, { page: 0, pageSize: 20 });
  const target = initial.items.find((item) => item.status === 'new');
  assert.ok(target);
  const detail = await adapter.getAlertDetail(target.id);
  assert.ok(detail.evidence.length > 0);
  await assert.rejects(adapter.addAlertNote(target.id, '   '), /Enter a note/i);
  const acknowledged = await adapter.acknowledgeAlert(target.id);
  assert.equal(acknowledged.status, 'acknowledged');
  await adapter.updateAlert(target.id, { status: 'under-review', assigneeId: 'team-test', assigneeLabel: 'Test review team' });
  await adapter.addAlertNote(target.id, 'Review source coverage');
  const updated = await adapter.getAlertDetail(target.id);
  assert.equal(updated.alert.status, 'under-review');
  assert.equal(updated.alert.assigneeLabel, 'Test review team');
  assert.ok(updated.timeline.some((event) => /Review source coverage/.test(event.event)));
});

test('REST adapter uses documented forecast namespace and mutating workflow routes', async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/alerts/fw-1/acknowledge')) return new Response(JSON.stringify({ data: { id: 'fw-1', status: 'acknowledged' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (String(url).includes('/alerts/fw-1/notes')) return new Response(JSON.stringify({ data: { id: 'note-1', createdAt: '2026-10-18T10:00:00Z' } }), { status: 201, headers: { 'content-type': 'application/json' } });
    if (String(url).includes('/alerts/fw-1')) return new Response(JSON.stringify({ data: { id: 'fw-1', status: 'under-review' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ data: { kpis: [], meta: { provenance: 'source-backed', sourceLabels: ['test'] } } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const adapter = new RestForecastsAdapter({ baseUrl: 'http://localhost:8000/', fetchImpl });
  await adapter.getOverview({ horizonYears: 3, geographyCode: 'IN', stateCode: 'IN-OD' });
  await adapter.acknowledgeAlert('fw-1');
  await adapter.updateAlert('fw-1', { status: 'under-review', assigneeId: 'team' });
  await adapter.addAlertNote('fw-1', 'Review evidence');
  assert.match(calls[0].url, /^http:\/\/localhost:8000\/api\/v1\/forecasts\/overview\?/);
  assert.match(calls[0].url, /stateCode=IN-OD/);
  assert.equal(calls[1].init.method, 'POST');
  assert.equal(calls[2].init.method, 'PATCH');
  assert.equal(calls[3].init.method, 'POST');
  assert.ok(calls.every((call) => call.init.credentials === 'include'));
});

test('REST adapter surfaces endpoint failures and never silently switches to fixtures', async () => {
  const adapter = new RestForecastsAdapter({
    baseUrl: 'https://api.example.test',
    fetchImpl: async () => new Response(JSON.stringify({ code: 'INSUFFICIENT_HISTORY', message: 'Three usable observations are required.' }), { status: 422, headers: { 'content-type': 'application/json' } }),
  });
  await assert.rejects(adapter.getSeries({ horizonYears: 3, geographyCode: 'IN' }, 'total'), (error) => error instanceof ForecastsApiError && error.status === 422 && error.code === 'INSUFFICIENT_HISTORY');
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
