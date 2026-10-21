const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const project = path.resolve(__dirname, '..');
const sourcePath = path.join(project, 'src/scenario-simulator/adapters/PlanningScenarioSimulatorAdapter.ts');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shramik-planning-fallback-'));
const outputPath = path.join(tmp, 'PlanningScenarioSimulatorAdapter.cjs');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    esModuleInterop: true,
  },
  fileName: sourcePath,
  reportDiagnostics: true,
});
const diagnostics = (compiled.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error);
assert.equal(diagnostics.length, 0, diagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
fs.writeFileSync(outputPath, compiled.outputText);
const loaded = new Module(outputPath, module);
loaded.filename = outputPath;
loaded.paths = Module._nodeModulePaths(tmp);
loaded._compile(compiled.outputText, outputPath);
const { PlanningScenarioSimulatorAdapter } = loaded.exports;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
async function readyRun(adapter, patch = {}) {
  const options = await adapter.getOptions();
  const entity = (await adapter.searchEntities({ entityType: 'skill', query: '', geographyId: 'INDIA' }))[0];
  const baselines = await adapter.getCompatibleBaselines({ entityType: 'skill', entityId: entity.id, geographyId: 'INDIA' });
  const params = Object.fromEntries(options.supportedAdvancedParameters.map(item => [item.key, item.defaultValue]));
  const request = {
    scenarioName: 'Local planning illustration',
    baselineForecastRunId: baselines[0].baselineForecastRunId,
    scope: { entityType: 'skill', entityId: entity.id, codeSystem: entity.codeSystem, geographyId: 'INDIA' },
    intervention: {
      additionalAnnualSeats: 50000,
      interventionStartYear: 2027,
      trainingLagMonths: 24,
      advancedParameters: params,
    },
    evaluationYear: 2030,
    ...patch,
  };
  const run = await adapter.runSimulation(request);
  const results = await adapter.getResults({ simulationRunId: run.simulationRunId, view: 'overview', evaluationYear: 2030 });
  return { options, entity, baselines, request, run, results, adapter };
}

test('local planning options disclose placeholders, unvalidated baseline and editable assumptions', async () => {
  const adapter = new PlanningScenarioSimulatorAdapter();
  const options = await adapter.getOptions();
  assert.equal(options.provenance, 'SYNTHETIC_DEMO');
  assert.deepEqual(options.geographies.map(item => item.id), ['INDIA']);
  assert.equal(options.sectors.length, 0);
  assert.match(options.baselines[0].label, /No validated baseline/);
  assert.equal(options.baselines[0].qualityStatus, 'UNSUPPORTED');
  assert.equal(options.supportedAdvancedParameters.find(item => item.key === 'completionRatePct').defaultValue, 75);
  assert.equal(options.supportedAdvancedParameters.find(item => item.key === 'placementRatePct').defaultValue, 60);
  const entities = await adapter.searchEntities({ entityType: 'skill', query: '' });
  assert.equal(entities.length, 1);
  assert.match(entities[0].label, /not NCO\/NSQF mapped/);
  assert.equal((await adapter.searchEntities({ entityType: 'skill', query: 'cybersecurity' })).length, 0);
});

test('local planning run calculates explicit seat/completion/transition arithmetic but no official demand or supply', async () => {
  const { options, entity, run, results, adapter } = await readyRun(new PlanningScenarioSimulatorAdapter());
  assert.equal(run.runStatus, 'SUCCEEDED_WITH_WARNINGS');
  assert.equal(run.provenance, 'SYNTHETIC_DEMO');
  assert.equal(run.qualityStatus, 'UNSUPPORTED');
  assert.match(run.statusMessage, /not a calibrated forecast/);
  assert.equal(results.outcomes.find(item => item.metricCode === 'PLANNED_TRAINING_SEATS').scenarioValue, 100000);
  assert.equal(results.outcomes.find(item => item.metricCode === 'INTERVENTION_COMPLETIONS').scenarioValue, 75000);
  assert.equal(results.outcomes.find(item => item.metricCode === 'POTENTIAL_TRANSITIONS_NOT_JOBS').scenarioValue, 45000);
  for (const code of ['DEMAND_ESTIMATE', 'SUPPLY_ESTIMATE', 'SKILL_GAP', 'GAP_TO_DEMAND_RATIO']) {
    const metric = results.outcomes.find(item => item.metricCode === code);
    assert.equal(metric.scenarioValue, null, code + ' must remain unavailable');
    assert.equal(metric.qualityStatus, 'UNSUPPORTED');
    assert.match(metric.notAvailableReason, /not available/i);
  }
  assert.deepEqual(results.series.baselineDemand, []);
  assert.deepEqual(results.series.scenarioDemand, []);
  assert.deepEqual(results.series.baselineSupply, []);
  assert.deepEqual(results.series.scenarioSupply, []);
  assert.deepEqual(results.regionalImpact, []);
  assert.deepEqual(results.sectorBreakdown, []);
  assert.deepEqual(results.occupationImpact, []);
  assert.ok(results.limitations.some(item => /not jobs/i.test(item)));
  const stored = await adapter.getRunStatus(run.simulationRunId);
  assert.equal(stored.simulationRunId, run.simulationRunId);
  assert.ok(options.supportedAdvancedParameters.length > 0);
  assert.ok(entity.id.startsWith('LOCAL-PLANNING-'));
});

test('sensitivity analyses vary only explicit assumptions and are not uncertainty bands', async () => {
  const { run, adapter } = await readyRun(new PlanningScenarioSimulatorAdapter());
  const data = await adapter.runSensitivity({
    simulationRunId: run.simulationRunId,
    parameterKey: 'additionalAnnualSeats',
    values: [0, 50000, 100000],
    evaluationYear: 2030,
  });
  assert.deepEqual(data.points.map(point => point.outputValue), [0, 45000, 90000]);
  assert.ok(data.points.every(point => point.qualityStatus === 'UNSUPPORTED'));
  assert.match(data.fixedAssumptions.join(' '), /not a forecast or uncertainty interval/i);
});

test('local planning adapter rejects unbounded assumptions and respects cancellation', async () => {
  const adapter = new PlanningScenarioSimulatorAdapter();
  await assert.rejects(adapter.getOptions(AbortSignal.abort()), /operation was aborted/i);
  const { request } = await readyRun(adapter);
  const invalid = clone(request);
  invalid.intervention.advancedParameters.completionRatePct = 120;
  await assert.rejects(adapter.runSimulation(invalid), /from 0 to 100/);
  const noBaseline = clone(request);
  noBaseline.baselineForecastRunId = 'FAKE-LIVE-FORECAST';
  await assert.rejects(adapter.runSimulation(noBaseline), /cannot use an unrecognized or purported live forecast baseline/i);
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
