const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const cssPath = path.join(__dirname, '..', 'src', 'live-data', 'database-insights.css');
const css = fs.readFileSync(cssPath, 'utf8');

function blockFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const match = css.match(new RegExp('(?:^|\\n)' + escaped + '\\s*\\{([\\s\\S]*?)\\n\\}', 'm'));
  assert.ok(match, `Missing CSS rule for ${selector}`);
  return match[1];
}

test('live data pages inherit the shared fixed dotted canvas', () => {
  const shell = blockFor('.dbi-shell');
  assert.match(shell, /background:\\s*transparent\\s*;/);
  assert.doesNotMatch(shell, /background:\\s*var\\(--dbi-canvas\\)\\s*;/);
});

test('live data hero panels do not paint a second dotted texture', () => {
  const hero = blockFor('.dbi-hero');
  assert.match(hero, /background:\\s*var\\(--dbi-surface\\)\\s*;/);
  assert.doesNotMatch(hero, /radial-gradient/);
});
