const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../src/live-data/DatabaseInsightsPage.tsx'), 'utf8');

test('Demand page names the PLFS age universe and the national fallback', () => {
  assert.match(source, /PLFS 2025 benchmarks · age 15\+/);
  assert.match(source, /Published annual rates for persons aged 15\+, combined rural\/urban/);
  assert.match(source, /otherwise the row is explicitly labelled India \(national\)/);
  assert.match(source, /Persons aged 15\+ · /);
});

test('canonical PLFS person rates use only the published 15+ person, combined-area slice', () => {
  assert.match(source, /d\.sex === 'person' && d\.area === 'combined' && d\.age_domain === '15_plus'/);
  assert.match(source, /row\.reference_period === 'CY2025' && isCanonicalPersonRate\(row\)/);
});

test('regional benchmark selection falls back to a clearly labelled national benchmark only when regional slice is absent', () => {
  assert.match(source, /const regional = rows\.find\(row => row\.state_id === selectedStateId\(snapshot, regionCode\)\)/);
  assert.match(source, /return rows\.find\(row => !row\.state_id \|\| row\.observation_grain === 'NATIONAL'\)/);
  assert.match(source, /row\.state_id \? stateLabel\(snapshot, row\) : 'India \(national\)'/);
});

test('latest national PLFS cards prefer only source-backed monthly CWS values when available', () => {
  assert.match(source, /function latestMonthlyCwsRate\(snapshot: Snapshot, code: string, regionCode: string\)/);
  assert.match(source, /if \(regionCode !== 'IN'\) return undefined/);
  assert.match(source, /UR: 'CWS_UR',[\s\S]*LFPR: 'CWS_LFPR',[\s\S]*WPR: 'CWS_WPR'/);
  assert.match(source, /row\.provenance_state === 'SOURCE_BACKED'/);
  assert.match(source, /row\.is_synthetic === false/);
  assert.match(source, /d\.age_domain === '15_years_and_above'/);
  assert.match(source, /d\.survey_basis === 'current_weekly_status'/);
  assert.match(source, /d\.frequency === 'monthly'/);
  assert.match(source, /periodFilter === 'MONTHLY_CWS'\s*\?\s*latestMonthlyCwsRate/);
  assert.match(source, /canonicalRate\(snapshot, code, regionCode, periodFilter === 'LATEST'\)/);
});

test('monthly PLFS display period remains distinct from annual CY2025', () => {
  assert.match(source, /function plfsCardPeriodLabel\(row: MetricRow \| undefined\)/);
  assert.match(source, /monthly CWS · persons aged 15\+/);
  assert.match(source, /return 'Persons aged 15\+ · PLFS CY2025'/);
  assert.match(source, /Calendar year 2025 · PLFS \(annual\)/);
});
