const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/live-data/DatabaseInsightsPage.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/live-data/database-insights.css'), 'utf8');

test('Data Quality shows public visibility status for each analytical output table', () => {
  assert.match(source, /Analytical output visibility/);
  for (const table of ['demand_observations', 'supply_observations', 'forecast_results', 'model_versions', 'emerging_skill_signals', 'early_warnings']) {
    assert.ok(source.includes("'" + table + "'"), 'should report visibility for ' + table);
  }
  assert.match(source, /intentionally excluded from the browser-facing/);
  assert.match(source, /function publicOutputVisibility\(\)/);
  assert.doesNotMatch(source, /checkPublicTable\(/, 'must not probe output tables excluded from the public proxy');
  assert.doesNotMatch(source, /getRows<{ id: string }>/, 'must not attempt to inspect restricted output tables through public reads');
  assert.match(source, /“Restricted” means the public reader cannot inspect a table; it does not mean the table is empty/);
  assert.match(source, /status === 'Restricted' \? 'restricted' : 'pending'/);
});

test('Data Quality surfaces LOW-confidence and manual sector mappings without implying a labour-market signal', () => {
  assert.match(source, /Skill-to-sector mapping review/);
  assert.match(source, /LOW-confidence sector mappings/);
  assert.match(source, /Manually mapped, LOW-confidence/);
  assert.match(source, /Mapping quality is reference-data quality\. It is not evidence that a skill is in shortage or emerging/);
  assert.match(source, /it does not publish automated mapping validation/);
  assert.match(styles, /\.dbi-readiness-list/);
});
