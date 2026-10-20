const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../src/live-data/DatabaseInsightsPage.tsx'), 'utf8');

test('Supply KPIs use unavailable instead of a false zero when a regional value is missing', () => {
  assert.match(source, /value=\{visibleStateSeats\.length \? numberFormat\(seatTotal, true\) : '—'\}/);
  assert.match(source, /value=\{itiRows\.length \? numberFormat\(itiTotal, true\) : '—'\}/);
  assert.match(source, /value=\{apprenticeRows\.length \? numberFormat\(apprenticeTotal, true\) : '—'\}/);
  assert.match(source, /No published apprenticeship value for this region/);
});

test('Supply table omits PMKVY when no source-backed observation exists', () => {
  assert.match(source, /pmkvyTrainedRows\.length \? <tr>/);
  assert.match(source, /empty="No published training or apprenticeship indicators are available for this region and period\."/);
});

test('Supply table identifies geography and avoids adding a national aggregate to regional totals', () => {
  assert.match(source, /columns=\{\['Indicator', 'Value', 'Reference period', 'Coverage', 'Source'\]\}/);
  assert.match(source, /India \(national fallback\)/);
  assert.match(source, /No published regional value/);
  assert.match(source, /<td>\{item\.coverage\}<\/td>/);
  assert.match(source, /function preferRowsForScope\(rows: MetricRow\[\], regionCode: string\)/);
  assert.match(source, /const national = rows\.filter\(row => !row\.state_id \|\| row\.observation_grain === 'NATIONAL'\)/);
});
