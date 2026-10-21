const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../src/SHRAMIKDashboard.tsx'),
  'utf8',
);
const sidebarStart = source.indexOf('function Sidebar(');
const headerStart = source.indexOf('function Header(');
const workspaceStart = source.indexOf('function SHRAMIKWorkspace(');
assert.ok(sidebarStart > 0 && headerStart > sidebarStart && workspaceStart > headerStart);

const sidebar = source.slice(sidebarStart, headerStart);
const header = source.slice(headerStart, workspaceStart);
const workspace = source.slice(workspaceStart);

test('mobile navigation toggle exposes expanded state and its controlled sidebar', () => {
  assert.match(header, /aria-label=\{mobileOpen \? 'Close navigation' : 'Open navigation'\}/);
  assert.match(header, /aria-expanded=\{mobileOpen\}/);
  assert.match(header, /aria-controls="shramik-sidebar"/);
  assert.match(sidebar, /id="shramik-sidebar"/);
});

test('closed mobile navigation cannot receive keyboard focus', () => {
  assert.match(sidebar, /matchMedia\('\(max-width: 980px\)'\)/);
  assert.match(sidebar, /toggleAttribute\('inert', mobileLayout && !mobileOpen\)/);
  assert.match(sidebar, /querySelector<HTMLButtonElement>\('\.nav-item'\)\?\.focus\(\)/);
  assert.match(sidebar, /querySelector<HTMLButtonElement>\('\.mobile-menu'\)\?\.focus\(\)/);
});

test('Ctrl+K does not focus the global search when it is hidden', () => {
  assert.match(workspace, /const searchInput = document\.querySelector<HTMLInputElement>\('\.global-search input'\)/);
  assert.match(workspace, /searchInput && searchInput\.getClientRects\(\)\.length > 0/);
  assert.match(workspace, /searchInput\.focus\(\)/);
});
