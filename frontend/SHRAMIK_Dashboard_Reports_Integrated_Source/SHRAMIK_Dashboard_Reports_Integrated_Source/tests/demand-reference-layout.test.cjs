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
