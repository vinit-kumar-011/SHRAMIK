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
