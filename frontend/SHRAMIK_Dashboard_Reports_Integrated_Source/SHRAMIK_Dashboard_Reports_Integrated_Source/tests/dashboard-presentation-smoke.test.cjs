const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(appRoot, 'src/SHRAMIKDashboard.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(appRoot, 'src/shramik-dashboard.css'), 'utf8');

test('source-backed KPI cards do not render a fabricated flat sparkline when history is absent', () => {
  assert.match(dashboard, /item\.trend\.length\s*>=\s*2/);
  assert.match(dashboard, /History unavailable/);
  assert.match(styles, /\.kpi-spark-empty\s*\{/);
});

test('live KPI categories use semantic icons and stable tones rather than card position', () => {
  assert.match(dashboard, /ESHRAM_REGISTRATION_COUNT:\s*Users/);
  assert.match(dashboard, /CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE:\s*Factory/);
  assert.match(dashboard, /CTS_ITI_COUNT:\s*Building2/);
  assert.match(dashboard, /function toneForKpi\(item: MetricCardData, _index: number\)/);
  assert.match(dashboard, /return tones\[item\.key\]\s*\?\?\s*'navy'/);
});

test('regional ranking loading is distinguished from a completed empty result', () => {
  assert.match(dashboard, /busy && !rankings \? <div className="panel-empty" role="status">Loading regional ranking…<\/div>/);
});

test('empty time-series messaging does not incorrectly claim every source-backed view is missing programme history', () => {
  assert.match(dashboard, /No comparable time-series is available for this geography yet/);
  assert.doesNotMatch(dashboard, /No overlapping source-backed training-programme history is available for this geography/);
});
