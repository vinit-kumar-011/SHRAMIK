const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/SHRAMIKDashboard.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/shramik-dashboard.css'), 'utf8');

test('workspace provides a skip link before the shared header and a focusable main target', () => {
  const skipIndex = source.indexOf('className="skip-link"');
  const headerIndex = source.indexOf('<Header regions={regions}');
  assert.ok(skipIndex >= 0 && skipIndex < headerIndex);
  assert.match(source, /<a className="skip-link" href="#shramik-main">Skip to main content<\/a>/);
  assert.match(source, /<main id="shramik-main" tabIndex=\{-1\}/);
});

test('skip link stays visually hidden until keyboard focus and respects reduced motion', () => {
  assert.match(styles, /\.skip-link\{position:fixed;top:10px;left:10px;z-index:120;transform:translateY\(-160%\)/);
  assert.match(styles, /\.skip-link:focus-visible\{transform:translateY\(0\)\}/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{\.skip-link\{transition:none\}\}/);
});
