const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const shell = fs.readFileSync(path.join(appRoot, 'src/SHRAMIKDashboard.tsx'), 'utf8');
const boundary = fs.readFileSync(path.join(appRoot, 'src/ModuleErrorBoundary.tsx'), 'utf8');

test('all canonical route content is isolated behind a module error boundary', () => {
  assert.match(shell, /<ModuleErrorBoundary key=\{activePage\} moduleName=\{getRouteLabel\(activePage\)\}/);
  assert.match(shell, /<\/ModuleErrorBoundary>\s*<\/main>/);
  assert.match(boundary, /static getDerivedStateFromError/);
  assert.match(boundary, /onClick=\{this\.retry\}/);
  assert.match(boundary, /onClick=\{this\.props\.onReturnDashboard\}/);
  assert.match(boundary, /role="alert"/);
});

test('the selected sidebar module is exposed as the current page', () => {
  assert.match(shell, /aria-current=\{active === item\.label \? 'page' : undefined\}/);
});
