const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const project = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-reports-adapter-'));
fs.mkdirSync(path.join(tmp, 'src', 'reports'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'examples'), { recursive: true });
fs.copyFileSync(path.join(project, 'examples', 'mock-state-report.json'), path.join(tmp, 'examples', 'mock-state-report.json'));

function compileAndLoad(fileName) {
  const inputPath = path.join(project, 'src', 'reports', fileName);
  const input = fs.readFileSync(inputPath, 'utf8');
  const result = ts.transpileModule(input, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      esModuleInterop: true,
    },
    fileName: inputPath,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
  const outPath = path.join(tmp, 'src', 'reports', fileName.replace(/\.ts$/, '.cjs'));
  fs.writeFileSync(outPath, result.outputText);
  const loadedModule = new Module(outPath, module);
  loadedModule.filename = outPath;
  loadedModule.paths = Module._nodeModulePaths(path.dirname(outPath));
  loadedModule._compile(result.outputText, outPath);
  return loadedModule.exports;
}

const { DemoReportsAdapter } = compileAndLoad('demoAdapter.ts');
const { RestReportsAdapter, ReportsApiError } = compileAndLoad('restAdapter.ts');

async function configFrom(adapter) {
  const options = await adapter.getOptions();
  const geo = options.geographies.find((item) => item.id === 'IN-KA') || options.geographies[0];
  return {
    options,
    config: {
      reportType: 'STATE',
      title: `Labour Market Intelligence — ${geo.label}`,
      geographyIds: [geo.id],
      period: structuredClone(options.periods[0]),
      referenceYear: options.referenceYears.at(-1),
      sectionKeys: options.sections.filter((section) => section.required || ['DEMAND', 'SUPPLY', 'SKILL_GAPS'].includes(section.key)).map((section) => section.key),
      sourcePolicy: { mode: 'LATEST_VALIDATED' },
      options: { includeUncertainty: true, includeDataAppendix: false },
      templateVersion: 'shramik-report-v1',
    },
  };
}

test('demo options identify synthetic provenance and support browser print/CSV but not server PDF', async () => {
  const adapter = new DemoReportsAdapter();
  const { options } = await configFrom(adapter);
  assert.equal(adapter.mode, 'demo');
  assert.equal(options.provenance, 'SYNTHETIC_DEMO');
  assert.ok(options.sections.some((item) => item.key === 'EXECUTIVE_SUMMARY' && item.required));
  assert.ok(options.sections.some((item) => item.key === 'SOURCES_METHOD' && item.required));
  assert.equal(options.exportCapabilities.serverPdf, false);
  assert.equal(options.exportCapabilities.browserPrint, true);
  assert.equal(options.exportCapabilities.csv, true);
});

test('demo report creation validates required fields and generates a clearly labelled immutable document', async () => {
  const adapter = new DemoReportsAdapter();
  const { config } = await configFrom(adapter);
  await assert.rejects(adapter.createReport({ ...config, title: '  ' }), /report title/i);
  await assert.rejects(adapter.createReport({ ...config, geographyIds: [] }), /geography/i);
  await assert.rejects(adapter.createReport({ ...config, sectionKeys: [] }), /section/i);
  const created = await adapter.createReport(config);
  assert.equal(created.status, 'COMPLETED');
  assert.ok(created.document);
  assert.equal(created.document.id, created.reportId);
  assert.equal(created.document.provenance, 'SYNTHETIC_DEMO');
  assert.match(created.document.metadata.generatedByLabel, /not for publication/i);
  assert.ok(created.document.sections.some((section) => section.key === 'SOURCES_METHOD'));
  const reopened = await adapter.getReport(created.reportId);
  assert.equal(reopened.id, created.document.id);
  assert.equal(reopened.title, created.document.title);
  assert.deepEqual(reopened.sections, created.document.sections);
  reopened.sections[0].title = 'Mutated by caller';
  assert.notEqual((await adapter.getReport(created.reportId)).sections[0].title, 'Mutated by caller', 'a returned report must not mutate the saved snapshot');
});

test('non-default geography is labelled as generic fixture rather than a geographic estimate', async () => {
  const adapter = new DemoReportsAdapter();
  const { config, options } = await configFrom(adapter);
  const india = options.geographies.find((item) => item.id === 'IN');
  const created = await adapter.createReport({ ...config, geographyIds: [india.id] });
  const summary = created.document.sections.find((section) => section.key === 'EXECUTIVE_SUMMARY');
  assert.ok(summary.blocks.some((block) => block.kind === 'callout' && /Scope limitation/i.test(block.title)));
  assert.ok(created.document.metadata.limitations.some((item) => /not geographically estimated/i.test(item)));
});

test('library search, type/geography filters, pagination and deletion use adapter state', async () => {
  const adapter = new DemoReportsAdapter();
  const { config } = await configFrom(adapter);
  const first = await adapter.createReport(config);
  const second = await adapter.createReport({ ...config, title: 'Construction Skills Review', reportType: 'SKILL' });
  const all = await adapter.listReports({ page: 1, pageSize: 1 });
  assert.equal(all.total, 3); // seeded reference report + two generated reports
  assert.equal(all.items.length, 1);
  assert.equal(all.provenance, 'SYNTHETIC_DEMO');
  const match = await adapter.listReports({ query: 'Construction Skills', reportType: 'SKILL', geographyId: 'IN-KA', page: 1, pageSize: 10 });
  assert.deepEqual(match.items.map((item) => item.id), [second.reportId]);
  const deleted = await adapter.deleteReport(second.reportId);
  assert.equal(deleted.deleted, true);
  assert.equal((await adapter.listReports({ query: 'Construction Skills', page: 1, pageSize: 10 })).total, 0);
  assert.ok((await adapter.getReport(first.reportId)).id);
});

test('CSV export includes report metadata, provenance and real structured rows with CSV escaping', async () => {
  const adapter = new DemoReportsAdapter();
  const { config } = await configFrom(adapter);
  const created = await adapter.createReport(config);
  const sectionWithTable = created.document.sections.find((section) => section.blocks.some((block) => block.kind === 'table'));
  assert.ok(sectionWithTable, 'fixture should include at least one tabular section');
  const exported = await adapter.exportCsv(created.reportId, sectionWithTable.key);
  assert.equal(exported.status, 'READY');
  assert.match(exported.csvText, /Report ID/);
  assert.match(exported.csvText, /SYNTHETIC_DEMO/);
  assert.match(exported.csvText, /\r\n/);
  assert.match(exported.csvText, /,|"/);
  assert.match(exported.csvText, /Report/);
  assert.equal((await adapter.exportCsv(created.reportId, 'POLICY_RECOMMENDATIONS')).status, 'NOT_CONFIGURED');
  assert.equal((await adapter.exportCsv('missing-id', sectionWithTable.key)).status, 'FAILED');
});

test('REST options, report creation, list query and CSV/PDF export use documented routes', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const u = String(url);
    const headers = { 'content-type': 'application/json' };
    if (u.endsWith('/api/v1/reports/options')) return new Response(JSON.stringify({
      reportTypes: ['STATE', 'CUSTOM'], geographies: [{ id: 'IN', label: 'India', level: 'COUNTRY' }],
      periods: [{ start: '2025-01-01', end: '2025-12-31', label: '2025' }], referenceYears: [2025],
      sections: ['EXECUTIVE_SUMMARY', 'SOURCES_METHOD'], exports: { pdf: 'PRINT_FALLBACK', csv: true }, meta: { provenance: 'SYNTHETIC_DEMO' },
    }), { status: 200, headers });
    if (u.endsWith('/api/v1/reports')) return new Response(JSON.stringify({ reportId: 'r-1', status: 'QUEUED' }), { status: 202, headers });
    if (u.includes('/exports')) {
      const body = JSON.parse(init.body);
      if (body.format === 'CSV') return new Response(JSON.stringify({ csvText: 'Report ID,r-1\r\n' }), { status: 200, headers });
      return new Response(JSON.stringify({ status: 'COMPLETED', downloadUrl: 'https://example.test/r-1.pdf' }), { status: 200, headers });
    }
    if (u.includes('/api/v1/reports?')) return new Response(JSON.stringify({ items: [], total: 0, page: 2, pageSize: 8, provenance: 'SYNTHETIC_DEMO' }), { status: 200, headers });
    return new Response(JSON.stringify({ message: 'unhandled' }), { status: 404, headers });
  };
  try {
    const adapter = new RestReportsAdapter('https://api.example.test/');
    const opts = await adapter.getOptions();
    assert.equal(opts.provenance, 'SYNTHETIC_DEMO');
    assert.equal(opts.exportCapabilities.browserPrint, true);
    const created = await adapter.createReport({ reportType: 'STATE', title: 'Test', geographyIds: ['IN'], period: opts.periods[0], sectionKeys: ['EXECUTIVE_SUMMARY'], sourcePolicy: { mode: 'LATEST_VALIDATED' }, options: { includeUncertainty: true, includeDataAppendix: false }, templateVersion: 'v1' });
    assert.equal(created.reportId, 'r-1');
    await adapter.listReports({ query: 'Odisha report', geographyId: 'IN', page: 2, pageSize: 8 });
    const csv = await adapter.exportCsv('r-1', 'EXECUTIVE_SUMMARY');
    const pdf = await adapter.exportPdf('r-1');
    assert.equal(csv.status, 'READY');
    assert.match(csv.csvText, /Report ID/);
    assert.equal(pdf.status, 'READY');
    assert.match(calls[0].url, /\/api\/v1\/reports\/options$/);
    assert.equal(calls[1].init.method, 'POST');
    assert.match(calls[2].url, /query=Odisha\+report/);
    assert.match(calls[2].url, /page=2/);
    assert.equal(JSON.parse(calls[3].init.body).format, 'CSV');
    assert.equal(JSON.parse(calls[4].init.body).format, 'PDF');
    assert.ok(calls.every((call) => call.init.credentials === 'include'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('REST errors remain explicit and do not trigger demo fallback', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }), { status: 403, headers: { 'content-type': 'application/json' } });
  try {
    const adapter = new RestReportsAdapter('https://api.example.test');
    await assert.rejects(adapter.getOptions(), (error) => error instanceof ReportsApiError && error.status === 403 && error.code === 'FORBIDDEN');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('Reports page is content-only and the canonical app owns its shared route/shell', () => {
  const page = fs.readFileSync(path.join(project, 'src', 'reports', 'ReportsPage.tsx'), 'utf8');
  const shell = fs.readFileSync(path.join(project, 'src', 'SHRAMIKDashboard.tsx'), 'utf8');
  assert.match(page, /Report Builder/);
  assert.match(page, /Report Library/);
  assert.match(page, /Report Preview/);
  assert.doesNotMatch(page, /<Sidebar\b|<Header\b/, 'Reports must not render a duplicate application shell');
  assert.match(shell, /import ReportsPage from '\.\/reports\/ReportsPage'/);
  assert.match(shell, /section: 'reports'/);
  assert.match(shell, /activePage === 'reports' \\? \\(!demoMode[\\s\\S]*?<ReportsPage \\/>/, 'live mode gates report fixtures and explicit demo mode can render the Reports page');
  assert.match(shell, /reports\.html|#reports/);
});

test('structured preview provides print styles and keeps limitation/provenance content available', () => {
  const documentSource = fs.readFileSync(path.join(project, 'src', 'reports', 'ReportDocument.tsx'), 'utf8');
  const css = fs.readFileSync(path.join(project, 'src', 'reports', 'reports.css'), 'utf8');
  assert.match(documentSource, /Sources, coverage & limitations/);
  assert.match(documentSource, /SYNTHETIC_DEMO/);
  assert.match(documentSource, /A missing value is not zero/i);
  assert.match(css, /@media print/);
  assert.match(css, /@page\s*\{/);
  assert.match(css, /\.no-print/);
});
