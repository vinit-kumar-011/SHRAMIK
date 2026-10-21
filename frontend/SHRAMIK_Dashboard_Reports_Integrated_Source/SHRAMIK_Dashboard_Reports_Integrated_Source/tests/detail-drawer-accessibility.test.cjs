const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../src/SHRAMIKDashboard.tsx'),
  'utf8',
);
const start = source.indexOf('function DetailDrawer(');
const end = source.indexOf('function ModuleRouteFallback(', start);
assert.ok(start > 0 && end > start, 'detail drawer component should be available');
const drawer = source.slice(start, end);

test('metric detail dialog moves focus in and restores focus on close', () => {
  assert.match(drawer, /returnFocusRef = useRef<HTMLElement \| null>\(null\)/);
  assert.match(drawer, /returnFocusRef\.current = active instanceof HTMLElement \? active : null/);
  assert.match(drawer, /closeButtonRef\.current\?\.focus\(\)/);
  assert.match(drawer, /if \(target\?\.isConnected\) target\.focus\(\)/);
  assert.match(drawer, /<button ref=\{closeButtonRef\}[^>]*aria-label="Close details"/);
});

test('metric detail dialog cycles keyboard focus instead of tabbing behind the modal', () => {
  assert.match(drawer, /role="dialog" aria-modal="true"/);
  assert.match(drawer, /onKeyDown=\{handleDialogKeyDown\}/);
  assert.match(drawer, /event\.key !== 'Tab'/);
  assert.match(drawer, /event\.shiftKey && document\.activeElement === first/);
  assert.match(drawer, /!event\.shiftKey && document\.activeElement === last/);
});
