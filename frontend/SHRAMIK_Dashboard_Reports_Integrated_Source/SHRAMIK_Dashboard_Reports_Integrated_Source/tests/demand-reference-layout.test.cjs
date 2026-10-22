const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.resolve(__dirname, '../src/live-data/DatabaseInsightsPage.tsx'), 'utf8');
const shell = fs.readFileSync(path.resolve(__dirname, '../src/SHRAMIKDashboard.tsx'), 'utf8');
const styles = fs.readFileSync(path.resolve(__dirname, '../src/live-data/database-insights.css'), 'utf8');

test('the normal live Demand route renders the reference-style page, not only the illustrative preview', () => {
  assert.match(page, /if \(module === 'demand'\) \{/);
  assert.match(page, /className="dbi-shell dbi-demand-reference"/);
  for (const section of ['dbi-demand-hero', 'dbi-demand-filters', 'dbi-demand-kpis', 'dbi-demand-middle', 'dbi-demand-bottom']) {
    assert.match(page, new RegExp(section));
  }
});

test('demand metrics are not fabricated when the canonical demand table has no records', () => {
  assert.match(page, /Total Estimated Demand/);
  assert.match(page, /Not published/);
  assert.match(page, /no validated demand-observation rows/i);
  assert.match(page, /Apprentices engaged \(NAPS\)/);
  assert.match(page, /not job demand/);
  assert.match(page, /Illustrative role examples only/);
  assert.doesNotMatch(page, /28\.4 Million/);
});

test('Latest PLFS cards prefer the newest national monthly CWS release without relabelling the annual benchmark', () => {
  assert.match(page, /function latestMonthlyCwsRate/);
  assert.match(page, /UR: 'CWS_UR'/);
  assert.match(page, /LFPR: 'CWS_LFPR'/);
  assert.match(page, /WPR: 'CWS_WPR'/);
  assert.match(page, /row\.provenance_state === 'SOURCE_BACKED'/);
  assert.match(page, /row\.is_synthetic === false/);
  assert.match(page, /d\.age_domain === '15_years_and_above'/);
  assert.match(page, /d\.survey_basis === 'current_weekly_status'/);
  assert.match(page, /canonicalRate\(snapshot, code, regionCode, periodFilter === 'LATEST'\)/);
  assert.match(page, /monthly CWS · persons aged 15\+/);
  assert.match(page, /Persons aged 15\+ · PLFS CY2025/);
  assert.match(page, /if \(regionCode !== 'IN'\) return undefined/);
});

test('monthly PLFS CWS is selectable separately from the annual CY2025 benchmark', () => {
  assert.match(page, /value="MONTHLY_CWS"/);
  assert.match(page, /Monthly PLFS CWS/);
  assert.match(page, /periodFilter === 'MONTHLY_CWS'\s*\?\s*latestMonthlyCwsRate/);
  assert.match(page, /Monthly CWS published at All India level only/);
  assert.match(page, /PLFS monthly CWS · age 15\+/);
  assert.match(page, /PLFS annual benchmark · CY2025/);
  assert.match(page, /Calendar year 2025 · PLFS \(annual\)/);
});

test('period, geography, state, sector, occupation and skill controls are interactive and the region selector syncs to the shared shell', () => {
  assert.match(page, /value=\{periodFilter\} onChange=\{event => setPeriodFilter/);
  assert.match(page, /onRegionChange\?\.\('IN'\)/);
  assert.match(page, /value=\{regionCode\} onChange=\{event => onRegionChange\?\./);
  assert.match(page, /value=\{sectorFilter\} onChange=/);
  assert.match(page, /value=\{showcaseMode \? 'LIVE' : occupationScope\} onChange=/);
  assert.match(page, /value=\{skillFilter\} onChange=/);
  assert.match(page, /value=\{regionSort\} onChange=/);
  assert.match(shell, /module="demand" regionCode=\{region\} onRegionChange=\{handleRegionChange\}/);
  const filters = page.slice(page.indexOf('<section className="dbi-demand-filters"'), page.indexOf('</section>', page.indexOf('<section className="dbi-demand-filters"')));
  assert.doesNotMatch(filters, /<select[^>]*\\sdisabled(?:=|\\s|>)/);
});

test('regional context uses the real GeoJSON boundaries and published state registration observations', () => {
  assert.match(page, /fetch\('\/assets\/india-states\.geojson'/);
  assert.match(page, /indiaMap\.features\.map/);
  assert.match(page, /ESHRAM_REGISTRATION_COUNT/);
  assert.match(page, /onClick=\{\(\) => state && onRegionChange\?\./);
  assert.match(page, /Colours show published e-Shram registrations, not job demand/);
});

test('the demand reference layout has responsive breakpoints for filters, chart, map and ranking panels', () => {
  assert.match(styles, /\.dbi-demand-reference \.dbi-demand-filters/);
  assert.match(styles, /\.dbi-demand-india-map/);
  assert.match(styles, /@media \(max-width: 1280px\)/);
  assert.match(styles, /@media \(max-width: 900px\)/);
  assert.match(styles, /@media \(max-width: 640px\)/);
});
