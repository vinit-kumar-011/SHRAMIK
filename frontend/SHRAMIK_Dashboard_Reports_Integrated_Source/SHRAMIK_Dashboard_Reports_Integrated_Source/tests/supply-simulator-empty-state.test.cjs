const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = path.resolve(__dirname, '../src/live-data');
const source = fs.readFileSync(path.join(base, 'DatabaseInsightsPage.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(base, 'database-insights.css'), 'utf8');

test('Supply capacity ranking renders an actionable no-data state when the chosen geography has no published rows', () => {
  assert.match(source, /visibleStateSeats\.length \? <div className="dbi-ranking-list"/);
  assert.match(source, /No published training-capacity rows for this geography/);
  assert.match(source, /This is unavailable data, not zero capacity/);
  assert.match(source, /onClick=\{\(\) => void refresh\(\)\} disabled=\{refreshing\}/);
  assert.match(styles, /\.dbi-ranking-empty\{/);
});

test('Scenario Simulator does not format a missing training-capacity baseline as a zero value', () => {
  assert.match(source, /label="Provisional training seats" value=\{visibleStateSeats\.length \? numberFormat\(seatTotal, true\) : '—'\}/);
  assert.match(source, /No published capacity value; a scenario baseline is unavailable/);
  assert.match(source, /No source-backed capacity rows are readable/);
  assert.match(source, /No sample values are substituted/);
});
