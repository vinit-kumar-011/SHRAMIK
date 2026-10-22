const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.resolve(__dirname, '../src/live-data/DatabaseInsightsPage.tsx'), 'utf8');
const styles = fs.readFileSync(path.resolve(__dirname, '../src/live-data/database-insights.css'), 'utf8');

test('the normal live Demand route renders the reference-style page, not only the synthetic preview component', () => {
  assert.match(page, /if \(module === 'demand'\) \{/);
  assert.match(page, /className="dbi-shell dbi-demand-reference"/);
  assert.match(page, /dbi-demand-hero/);
  assert.match(page, /dbi-demand-filters/);
  assert.match(page, /dbi-demand-kpis/);
  assert.match(page, /dbi-demand-middle/);
  assert.match(page, /dbi-demand-bottom/);
});

test('the live demand screen explains missing analytical data instead of fabricating trend or demand values', () => {
  assert.match(page, /No source-backed demand-observation rows are currently published/);
  assert.match(page, /No published demand time series/);
  assert.match(page, /No occupation-demand records/);
  assert.match(page, /No skill-demand records/);
  assert.match(page, /No demand values are mapped to this artwork/);
  assert.doesNotMatch(page, /28\.4 Million/);
});

test('the demand reference layout has responsive breakpoints for filters, chart, and ranking panels', () => {
  assert.match(styles, /\.dbi-demand-reference \.dbi-demand-filters/);
  assert.match(styles, /@media \(max-width: 1280px\)/);
  assert.match(styles, /@media \(max-width: 900px\)/);
  assert.match(styles, /@media \(max-width: 640px\)/);
});

test('legacy disabled Demand branch does not shadow the interactive page', () => {
  assert.doesNotMatch(page, /if \(module === 'demand'\) \{\s*const rateValue/);
  assert.match(page, /if \(module === 'demand'\) \{\s*const showPlfs/);
  assert.match(page, /value=\{periodFilter\} onChange=/);
  assert.match(page, /value=\{regionSort\} onChange=/);
});
