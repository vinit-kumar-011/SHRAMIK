const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const login = fs.readFileSync(path.resolve(__dirname, '../src/auth/LoginPage.tsx'), 'utf8');

test('login page keeps the public-home link and access request path clear', () => {
  assert.match(login, /Return to public home/);
  assert.doesNotMatch(login, /Return to public dashboard/);
  assert.match(login, /onNavigate\('request-access'\)/);
  assert.match(login, /autoComplete="username"/);
  assert.match(login, /autoComplete="current-password"/);
});

test('login page prevents repeat submissions and reports actual failures', () => {
  assert.match(login, /disabled=\{pending\}/);
  assert.match(login, /aria-busy=\{pending\}/);
  assert.match(login, /type="email" value=\{email\} disabled=\{pending\}/);
  assert.match(login, /type="password" value=\{password\} disabled=\{pending\}/);
  assert.match(login, /setError\(reason instanceof Error \? reason\.message/);
  assert.match(login, /role="alert"/);
});
