const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../src/SHRAMIKDashboard.tsx'),
  'utf8',
);
const start = source.indexOf('function SearchResults(');
const end = source.indexOf('function Header(', start);
assert.ok(start > 0 && end > start, 'search result component and header should be available');
const results = source.slice(start, end);
const headerEnd = source.indexOf('function DetailDrawer(', end);
const header = source.slice(end, headerEnd);
assert.ok(headerEnd > end, 'header should precede the detail drawer');

test('search exposes an accessible combobox and announces the active result', () => {
  assert.match(header, /role="combobox"/);
  assert.match(header, /aria-autocomplete="list"/);
  assert.match(header, /aria-controls="shramik-search-results"/);
  assert.match(header, /aria-activedescendant=\{searchOpen && activeSearchIndex >= 0/);
  assert.match(results, /role="option" aria-selected=\{index === activeIndex\}/);
  assert.match(results, /id=\{'shramik-search-option-' \+ index\}/);
});

test('search results can be navigated with arrow keys and activated with Enter', () => {
  assert.match(header, /event\.key === 'ArrowDown'/);
  assert.match(header, /event\.key === 'ArrowUp'/);
  assert.match(header, /event\.key === 'Enter' && searchOpen && activeSearchIndex >= 0/);
  assert.match(header, /onSearchSelect\(searchResults\[activeSearchIndex\]\)/);
});

test('result selection is reset when the available list changes', () => {
  assert.match(header, /setActiveSearchIndex\(-1\)/);
  assert.match(header, /\}, \[searchResults\]\)/);
  assert.match(results, /role="status" aria-live="polite"/);
});
