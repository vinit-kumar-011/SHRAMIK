const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(appRoot, 'src/SHRAMIKDashboard.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(appRoot, 'src/shramik-dashboard.css'), 'utf8');

test('source-backed KPI cards do not render a fabricated flat sparkline when history is absent', () => {
  assert.match(dashboard, /item\.trend\.length\s*>=\s*2/);
  assert.match(dashboard, /No trend series/);
  assert.match(dashboard, /kpi-spark-empty sr-only/);
  assert.match(dashboard, /item\.title\.length > 20 \? ' kpi-title-multiline' : ''/);
  assert.match(dashboard, /title=\{item\.title\}/);
  assert.match(styles, /\.kpi-spark-empty\s*\{/);
});


test('Dashboard overview suppresses duplicate annual PLFS measures when monthly CWS unemployment is available', () => {
  const adapter = fs.readFileSync(path.join(appRoot, 'src/api/supabase-adapter.ts'), 'utf8');
  assert.match(adapter, /const preferredCodes = \[/);
  assert.match(adapter, /rows\.some\(row => row\.metric_code === 'CWS_UR'\) \? 'CWS_UR' : 'UR'/);
  assert.match(adapter, /metric_code: 'eq\.UR'/);
  assert.match(adapter, /if \(query\.regionCode === 'IN' && cards\.some\(card => card\.id === 'cws-ur'\)\) continue/);
  assert.match(adapter, /'CWS_UR'/);
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


test('dashboard shows an actionable empty state instead of four blank KPI slots', () => {
  assert.match(dashboard, /dashboard && dashboard\.kpis\.length === 0/);
  assert.match(dashboard, /No source-backed KPI cards are available for this selection yet/);
  assert.match(dashboard, /Retry/);
  assert.match(styles, /\.kpi-empty-state\{/);
});

