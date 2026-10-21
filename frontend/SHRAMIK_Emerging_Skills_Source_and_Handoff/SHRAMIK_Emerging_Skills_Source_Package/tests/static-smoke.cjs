const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'shramik_emerging_skills.tsx'), 'utf8');
const js = fs.readFileSync(path.join(root, 'preview/assets/EmergingSkillsPage.js'), 'utf8');
const checks = [
  ['Reusable adapter contract is exported', /export interface EmergingSkillsDataAdapter/.test(source) && /dataAdapter\?: EmergingSkillsDataAdapter/.test(source)],
  ['Five required views exist', ['OverviewView','MomentumView','ConnectionsView','RegionalSignalsView','ProfileEvidenceView'].every(x => source.includes(x))],
  ['Synthetic fixtures are explicitly labelled', source.includes('SYNTHETIC_DEMO') && source.includes('Illustrative demo data')],
  ['Applied filters reload via adapter', source.includes('setAppliedFilters({ ...filters })') && source.includes('adapter.getSummary(appliedFilters, controller.signal)')],
  ['Reads use AbortController cleanup', source.includes('const controller = new AbortController()') && source.includes('return () => controller.abort()')],
  ['Retry and error surfaces exist', source.includes('loadError') && source.includes('setRetryKey(k => k + 1)')],
  ['Watchlist mutations are adapter-backed', source.includes('adapter.addWatchlistItem(id)') && source.includes('adapter.removeWatchlistItem(id)')],
  ['Comparison is capped at four selections', source.includes('if (curr.length >= 4) return curr')],
  ['Evidence panel uses adapter source detail', source.includes('dataAdapter.getEvidence(skill.skillId, filters, controller.signal)')],
  ['Browser bundle is precompiled ES module', js.includes('export default EmergingSkillsPage') && !js.includes('interface EmergingSkill')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`${checks.length-failed}/${checks.length} static smoke checks passed`);
if (failed) process.exit(1);
