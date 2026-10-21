const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(appRoot, 'src/SHRAMIKDashboard.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(appRoot, 'src/shramik-dashboard.css'), 'utf8');

test('mobile view provides a keyboard-accessible search toggle', () => {
  assert.match(source, /className="mobile-search-toggle icon-button"/);
  assert.match(source, /aria-label=\{mobileSearchOpen \? 'Close search' : 'Open search'\}/);
  assert.match(source, /aria-expanded=\{mobileSearchOpen\}/);
  assert.match(source, /aria-controls="shramik-mobile-search"/);
  assert.match(source, /id="shramik-mobile-search"/);
});

test('mobile search panel opens in the header and focuses the existing search input', () => {
  assert.match(source, /if \(mobileSearchOpen\) mobileSearchInputRef\.current\?\.focus\(\)/);
  assert.match(source, /setMobileSearchOpen\(false\);\s*setSearchOpen\(false\);/);
  assert.match(source, /setSearchOpen\(false\); setMobileSearchOpen\(false\);/);
  assert.match(styles, /\.topbar \.global-search\.mobile-search-open\{display:flex;position:absolute/);
  assert.match(styles, /\.mobile-search-toggle\{display:grid;width:32px/);
});

test('Escape returns focus from the hidden mobile search input to its trigger', () => {
  assert.match(source, /mobileSearchWasOpen = Boolean\(document\.querySelector\('\.global-search\.mobile-search-open'\)\)/);
  assert.match(source, /if \(mobileSearchWasOpen\) document\.querySelector<HTMLButtonElement>\('\.mobile-search-toggle'\)\?\.focus\(\)/);
  assert.match(source, /setSearchOpen\(false\);\s*setMobileSearchOpen\(false\);/);
});

test('header controls remain compact on very narrow phones', () => {
  assert.match(styles, /@media\(max-width:360px\)\{\.topbar\{padding:0 6px;gap:4px\}/);
  assert.match(styles, /\.region-select\{width:28px\}/);
  assert.match(styles, /\.notification-button\{width:28px;flex-basis:28px\}/);
});
