const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../src/live-data/DatabaseInsightsPage.tsx'), 'utf8');

test('Skill Gaps prominently surfaces LOW-confidence skill-to-sector mappings', () => {
  assert.match(source, /const lowConfidenceSkillCount = snapshot\.skills\.filter/);
  assert.match(source, /\(skill\.sector_mapping_confidence \|\| ''\)\.toUpperCase\(\) === 'LOW'/);
  assert.match(source, /const lowConfidenceManualMappingCount = snapshot\.skills\.filter/);
  assert.match(source, /Review sector mappings before decisions/);
  assert.match(source, /Treat these mappings as provisional reference metadata—not validated evidence of a labour-market shortage/);
  assert.match(source, /{lowConfidenceSkillCount} of {canonicalSkillCount} canonical skills have LOW-confidence sector mappings/);
});

test('Skill Gaps keeps numeric output unavailable until demand and supply observations support a validated comparison', () => {
  assert.match(source, /Gap output is not yet publishable/);
  assert.match(source, /does not calculate or display a numerical skill gap/);
  assert.match(source, /A numerically populated chart here would overstate what the data supports/);
});
