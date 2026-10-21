const fs = require('fs');
const vm = require('vm');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const path = '/mnt/data/SHRAMIK_Demand_Insights_Source_Package/src/DemandInsightsApp.jsx';
let source = fs.readFileSync(path, 'utf8');
const renderLine = "ReactDOM.createRoot(document.getElementById('root')).render(<DemandInsightsPage dataAdapter={window.SHRAMIK_DATA_ADAPTER}/>);";
if (!source.includes(renderLine)) throw new Error('Could not find final app render to instrument tests.');
source = source.replace(renderLine, `window.__TEST_EXPORTS = { MockDemandAdapter, DEMO_STATES, DEMO_FILTER_OPTIONS, makeRestAdapter, INDIA_STATE_CROSSWALK, indiaStateByAny, normalizeGeoKey, loadIndiaStateGeometry: String(loadIndiaStateGeometry), mapComponentSource: String(IndiaChoropleth) };`);
const result = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.None,
    jsx: ts.JsxEmit.React,
    jsxFactory: 'React.createElement',
    jsxFragmentFactory: 'React.Fragment'
  },
  reportDiagnostics: true
});
if ((result.diagnostics || []).length) {
  throw new Error('TypeScript/JSX diagnostics: ' + result.diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
}
const ReactStub = {
  Fragment: Symbol('Fragment'),
  createElement: () => null,
  useState: () => [null, () => {}],
  useEffect: () => {},
  useRef: () => ({ current: null }),
  useCallback: (fn) => fn,
  useId: () => 'test-id',
  useMemo: (fn) => fn()
};
let fetches = [];
const context = {
  React: ReactStub,
  ReactDOM: { createRoot: () => ({ render: () => {} }) },
  window: { lucide: { icons: {} }, SHRAMIK_CONFIG: {} },
  document: { getElementById: () => ({}) },
  console,
  setTimeout,
  clearTimeout,
  URLSearchParams,
  URL,
  DOMException,
  Date,
  Math,
  Number,
  String,
  Object,
  Array,
  Map,
  Set,
  Promise,
  AbortController,
  fetch: async (url, options) => {
    fetches.push({ url: String(url), options });
    const path = String(url).split('?')[0];
    if (path.endsWith('/demand/filter-options')) {
      return { ok: true, status: 200, json: async () => ({ options: { geographies: [{ value: 'IN', label: 'All India' }, { value: 'STATE', label: 'State / UT' }] } }) };
    }
    if (path.endsWith('/demand/regions')) return { ok: true, status: 200, json: async () => ({ metric: 'estimated-demand', items: [] }) };
    return { ok: true, status: 200, json: async () => ({}) };
  }
};
vm.createContext(context);
vm.runInContext(result.outputText, context);
const X = context.window.__TEST_EXPORTS;
const checks = [];
const check = (name, condition, detail = '') => {
  checks.push({ name, pass: !!condition, detail });
  if (!condition) console.error('FAIL', name, detail);
};
(async () => {
  check('crosswalk has 36 canonical regions', X.INDIA_STATE_CROSSWALK.length === 36);
  check('crosswalk IDs are unique', new Set(X.INDIA_STATE_CROSSWALK.map(x => x.id)).size === 36);
  check('all canonical names and IDs resolve', X.INDIA_STATE_CROSSWALK.every(x => X.indiaStateByAny(x.name)?.id === x.id && X.indiaStateByAny(x.id)?.id === x.id));
  check('legacy Odisha alias resolves', X.indiaStateByAny('Orissa')?.id === 'IN-OD');
  check('Telangana legacy code resolves', X.indiaStateByAny('TG')?.id === 'IN-TS');
  check('map registration and 36-feature fail-closed guard exist', X.loadIndiaStateGeometry.includes('features.length !== 36') && X.loadIndiaStateGeometry.includes('new Set(ids).size !== 36'));
  check('map binds the metric rows to ECharts map polygons', X.mapComponentSource.includes("type: 'map'") && X.mapComponentSource.includes('echarts.registerMap'));
  check('map treats missing values as null, not zero', X.mapComponentSource.includes('value: available ? row.value : null') && X.mapComponentSource.includes('No data available'));
  check('regional table normalizes legacy codes through filter options', source.includes('indiaStateOption(entry, stateOptions)') && source.includes('onState(option?.value || r.stateCode)'));
  check('boundary attribution calls out the 2011 source vintage', source.includes('source vintage stated as 2011') && source.includes('CC BY 2.5 India'));

  const filters = { period: '2024', geography: 'STATE', stateCode: '', sectorId: 'manufacturing', occupationCode: '', skillId: '' };
  const nationalRows = await X.MockDemandAdapter.getDemandRegions(filters, 'estimated-demand');
  const selectedRows = await X.MockDemandAdapter.getDemandRegions({ ...filters, stateCode: 'MH' }, 'estimated-demand');
  check('demo regional comparison returns all 36 regions', nationalRows.items.length === 36, `found ${nationalRows.items.length}`);
  check('selecting a state preserves all 36 map comparison rows', selectedRows.items.length === 36, `found ${selectedRows.items.length}`);
  const valuesSame = nationalRows.items.every((row, i) => row.stateCode === selectedRows.items[i].stateCode && row.value === selectedRows.items[i].value);
  check('state selection highlights context without changing regional values', valuesSame);

  const rest = X.makeRestAdapter('https://api.example.test');
  await rest.getDemandFilterOptions();
  await rest.getDemandRegions({ period: '2024', geography: 'STATE', stateCode: 'MH', sectorId: 'manufacturing', occupationCode: 'OCC-1', skillId: 'SK-1' }, 'estimated-demand');
  const url = new URL(fetches.at(-1).url);
  check('REST map request explicitly asks for all-state comparison', url.searchParams.get('comparisonScope') === 'all-states');
  check('REST map request uses the state-level geography', url.searchParams.get('geography') === 'STATE');
  check('REST map request omits selected state filter', !url.searchParams.has('stateCode'));
  check('REST map request preserves period and segmentation filters', url.searchParams.get('period') === '2024' && url.searchParams.get('sectorId') === 'manufacturing' && url.searchParams.get('occupationCode') === 'OCC-1' && url.searchParams.get('skillId') === 'SK-1');

  const failed = checks.filter(c => !c.pass);
  console.log(JSON.stringify({ passed: checks.length - failed.length, total: checks.length, failed, checks }, null, 2));
  if (failed.length) process.exit(1);
})();
