const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(
  path.resolve(__dirname, '../src/shramik-dashboard.css'),
  'utf8',
);

test('shared shell gives links, textareas, and controls a visible keyboard focus ring', () => {
  assert.match(styles, /button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible\{outline:3px solid var\(--navy\);outline-offset:3px\}/);
});

test('global search replaces the suppressed input outline with a visible container ring', () => {
  assert.match(styles, /\.global-search input:focus-visible\{outline:none\}/);
  assert.match(styles, /\.global-search:focus-within\{outline:3px solid var\(--navy\);outline-offset:3px\}/);
});
