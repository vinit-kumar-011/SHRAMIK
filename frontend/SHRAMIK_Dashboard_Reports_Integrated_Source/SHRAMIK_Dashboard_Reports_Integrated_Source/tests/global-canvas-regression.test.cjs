const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const cssPath = path.join(__dirname, '..', 'src', 'live-data', 'database-insights.css');
const css = fs.readFileSync(cssPath, 'utf8');

function blockFor(selector) {
  const start = css.indexOf(selector + ' {');
  assert.notEqual(start, -1, 'Missing CSS rule for ' + selector);
  const bodyStart = css.indexOf('{', start) + 1;
  const bodyEnd = css.indexOf('\n}', bodyStart);
  assert.ok(bodyEnd > bodyStart, 'Malformed CSS rule for ' + selector);
  return css.slice(bodyStart, bodyEnd);
}

test('live data pages inherit the shared fixed dotted canvas', () => {
  const shell = blockFor('.dbi-shell');
  assert.match(shell, /background:\s*transparent\s*;/);
  assert.doesNotMatch(shell, /background:\s*var\(--dbi-canvas\)\s*;/);
});

test('live data hero panels do not paint a second dotted texture', () => {
  const hero = blockFor('.dbi-hero');
  assert.match(hero, /background:\s*var\(--dbi-surface\)\s*;/);
  assert.doesNotMatch(hero, /radial-gradient/);
});
