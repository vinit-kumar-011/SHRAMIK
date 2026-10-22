const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../src/live-data/DatabaseInsightsPage.tsx'), 'utf8');

test('Emerging Skills explains the impact of low-confidence sector mappings', () => {
  assert.match(source, /module === 'emerging-skills'/);
  assert.match(source, /Signal candidates need mapping review/);
  assert.match(source, /Review occupation\/sector mappings before interpreting future growth or momentum signals/);
  assert.match(source, /{lowConfidenceSkillCount} of {canonicalSkillCount} canonical skills have LOW-confidence sector mappings/);
});

test('Emerging Skills confidence badges safely handle missing mapping metadata', () => {
  assert.match(source, /dbi-confidence-' \+ \(skill\.sector_mapping_confidence \|\| 'unmapped'\)\.toLowerCase\(\)/);
  assert.match(source, /{skill\.sector_mapping_confidence \|\| 'Unmapped'}/);
});

test('Emerging Skills never invents signal history without published observations', () => {
  assert.match(source, //Signals require validated historical coverage//);
  assert.match(source, //authenticated results panel above shows persisted signals for the selected mode//);
  assert.match(source, //Awaiting historical series//);
});
