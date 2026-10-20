const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const access = fs.readFileSync(path.resolve(__dirname, '../src/auth/RequestAccessPage.tsx'), 'utf8');

test('request-access labels accurately describe the return destination', () => {
  assert.match(access, /Return to public home/);
  assert.doesNotMatch(access, /Return to public dashboard/);
  assert.match(access, /onNavigate\('login'\)/);
});

test('request submission shows progress and locks fields to prevent accidental duplicate changes', () => {
  assert.match(access, /<form onSubmit=\{submit\} aria-busy=\{pending\}>/);
  assert.match(access, /disabled=\{pending\}/);
  assert.match(access, /setError\(reason instanceof Error \? reason\.message/);
  assert.match(access, /role="alert"/);
});

test('request page is explicit that submission is not an account or permission grant', () => {
  assert.match(access, /do not create accounts or grant permissions automatically/);
  assert.match(access, /A reviewer must approve it before an account or permissions are provisioned/);
});
