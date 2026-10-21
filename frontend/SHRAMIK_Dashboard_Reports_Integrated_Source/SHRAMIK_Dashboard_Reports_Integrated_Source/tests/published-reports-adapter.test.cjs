const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const project = path.resolve(__dirname, '..');
const src = path.join(project, 'src', 'reports');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-published-reports-'));
fs.mkdirSync(tmp, { recursive: true });

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

const { PublishedReportsAdapter } = compileAndLoad('publishedAdapter.ts');
const regionOptions = [
  { code: 'OD', label: 'Odisha', level: 'state' },
  { code: 'MH', label: 'Maharashtra', level: 'state' },
];
const fakeCard = {
  id: 'unemployment-rate', key: 'unemployment-rate', title: 'Unemployment rate',
  subtitle: 'Published annual benchmark · persons, all ages', value: 3.2, formattedValue: '3.2%',
  unit: '%', deltaPct: null, context: 'Published source value', trend: [],
  meta: { provenance: 'source-backed', sourceLabel: 'PLFS 2025 Annual Report', updatedAt: '2026-04-30',
    notes: ['Annual benchmark; not a forecast.', 'Source: https://example.gov.in/report'] },
};
function fakeAdapter() {
  return {
    mode: 'supabase',
    async getRegions() { return regionOptions; },
    async getDashboard(query) {
      return {
        regionCode: query.regionCode, regionName: query.regionCode === 'OD' ? 'Odisha' : 'India',
        periodYears: query.periodYears, kpis: [structuredClone(fakeCard)], trend: [], trendKind: undefined,
        emergingSkills: [], sectorGaps: [], occupationForecasts: [],
        meta: { provenance: 'source-backed', sourceLabel: 'SHRAMIK Supabase source observations', updatedAt: '2026-04-30',
          notes: ['Demand and supply outputs are not validated.'] },
      };
    },
    async getRegionRankings() { throw new Error('Not used by published report adapter'); },
    async getProfile() { return { id: 'x', displayName: 'X', role: 'Viewer', initials: 'X' }; },
    async search() { return []; }, async getNotifications() { return []; }, async markNotificationRead() {},
    async getIndicatorDetail() { throw new Error('Not used'); }, async getSectionDetail() { throw new Error('Not used'); },
  };
}
async function prepared(adapter) {
  const options = await adapter.getOptions();
  const geography = options.geographies.find((item) => item.id === 'OD');
  const config = {
    reportType: 'STATE', title: 'Odisha Published Indicators', geographyIds: [geography.id],
    period: structuredClone(options.periods[0]), sectionKeys: options.sections.map((item) => item.key),
    sourcePolicy: { mode: 'LATEST_VALIDATED' }, options: { includeUncertainty: true, includeDataAppendix: false },
    templateVersion: 'test-v1',
  };
  return { options, config };
}

test('published Reports options use actual geography catalogues and native browser exports', async () => {
  const adapter = new PublishedReportsAdapter(fakeAdapter());
  const { options } = await prepared(adapter);
  assert.equal(adapter.mode, 'published');
  assert.equal(options.provenance, 'SOURCE_BACKED');
  assert.ok(options.geographies.some((item) => item.id === 'IN' && item.label.includes('India')));
  assert.ok(options.geographies.some((item) => item.id === 'OD' && item.label === 'Odisha'));
  assert.equal(options.exportCapabilities.serverPdf, false);
  assert.equal(options.exportCapabilities.browserPrint, true);
  assert.equal(options.exportCapabilities.csv, true);
});

test('generated reports carry published indicators and never fabricate unavailable analytics', async () => {
  const adapter = new PublishedReportsAdapter(fakeAdapter());
  const { config } = await prepared(adapter);
  const created = await adapter.createReport(config);
  assert.equal(created.status, 'COMPLETED');
  assert.equal(created.document.provenance, 'SOURCE_BACKED');
  assert.equal(created.document.geographyLabels[0], 'Odisha');
  const executive = created.document.sections.find((item) => item.key === 'EXECUTIVE_SUMMARY');
  assert.equal(executive.status, 'READY');
  assert.equal(executive.blocks.find((block) => block.kind === 'metric_grid').metrics[0].formattedValue, '3.2%');
  const regional = created.document.sections.find((item) => item.key === 'REGIONAL');
  assert.equal(regional.status, 'READY');
  assert.equal(regional.blocks[0].kind, 'table');
  for (const key of ['DEMAND', 'SUPPLY', 'SKILL_GAPS', 'EMERGING_SKILLS', 'FORECASTS', 'SCENARIO', 'SECTOR', 'OCCUPATION', 'POLICY_RECOMMENDATIONS']) {
    const section = created.document.sections.find((item) => item.key === key);
    assert.equal(section.status, 'UNAVAILABLE', key + ' must not be synthesized from catalogue context');
    assert.equal(section.blocks[0].kind, 'unavailable');
  }
  assert.match(created.document.metadata.limitations.join(' '), /not filter/i);
  assert.match(created.message, /not persisted to a server/i);
});

test('published-indicator CSV has real values and correctly escapes cells', async () => {
  const adapter = new PublishedReportsAdapter(fakeAdapter());
  const { config } = await prepared(adapter);
  const created = await adapter.createReport(config);
  const csv = await adapter.exportCsv(created.reportId, 'EXECUTIVE_SUMMARY');
  assert.equal(csv.status, 'READY');
  assert.match(csv.csvText, /Unemployment rate/);
  assert.match(csv.csvText, /3\.2%/);
  assert.match(csv.csvText, /PLFS 2025 Annual Report/);
  assert.match(csv.csvText, /"Annual benchmark; not a forecast\. Source: https:\/\/example\.gov\.in\/report"/);
  assert.equal((await adapter.exportCsv(created.reportId, 'FORECASTS')).status, 'NOT_CONFIGURED');
});

test('session library search, duplicate, deletion and unavailable region scopes are explicit', async () => {
  const adapter = new PublishedReportsAdapter(fakeAdapter());
  const { config } = await prepared(adapter);
  const created = await adapter.createReport(config);
  const duplicate = await adapter.duplicateReport(created.reportId);
  assert.equal(duplicate.config.title, config.title);
  assert.equal((await adapter.listReports({ query: 'Odisha', page: 1, pageSize: 10 })).total, 1);
  assert.equal((await adapter.listReports({ page: 1, pageSize: 10 })).items[0].capabilities.delete, true);
  await assert.rejects(adapter.createReport({ ...config, geographyIds: ['OD', 'MH'] }), /exactly one geography/i);
  const deleted = await adapter.deleteReport(created.reportId);
  assert.equal(deleted.deleted, true);
  assert.equal((await adapter.listReports({ page: 1, pageSize: 10 })).total, 0);
  await assert.rejects(adapter.getReport(created.reportId), /not in this browser session/i);
});

test('default Reports adapter chooses explicit demo, configured REST, or published data instead of implicit fixtures', () => {
  const factory = fs.readFileSync(path.join(src, 'adapter.ts'), 'utf8');
  assert.match(factory, /VITE_SHRAMIK_USE_DEMO_DATA === 'true'/);
  assert.match(factory, /new PublishedReportsAdapter\(createLabourMarketDataAdapter\(\)\)/);
  assert.match(factory, /if \(baseUrl\) return new RestReportsAdapter\(baseUrl\)/);
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
