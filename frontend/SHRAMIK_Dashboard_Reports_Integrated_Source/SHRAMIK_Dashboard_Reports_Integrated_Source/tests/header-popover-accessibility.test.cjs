const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../src/SHRAMIKDashboard.tsx'),
  'utf8',
);
const start = source.indexOf('const closeOverlays');
const end = source.indexOf('const onKeyDown', start);
assert.ok(start > 0 && end > start, 'shared overlay keyboard handler should be available');
const closeOverlays = source.slice(start, end);

test('Escape returns keyboard focus to the control that opened the header popover', () => {
  assert.match(closeOverlays, /notificationsWereOpen = Boolean\(document\.querySelector\('\.notifications-popover'\)\)/);
  assert.match(closeOverlays, /profileWasOpen = Boolean\(document\.querySelector\('\.profile-popover'\)\)/);
  assert.match(closeOverlays, /else if \(profileWasOpen\) document\.querySelector<HTMLButtonElement>\('\.profile-button'\)\?\.focus\(\)/);
  assert.match(closeOverlays, /else if \(notificationsWereOpen\) document\.querySelector<HTMLButtonElement>\('\.notification-button'\)\?\.focus\(\)/);
  assert.match(closeOverlays, /if \(mobileSearchWasOpen\) document\.querySelector<HTMLButtonElement>\('\.mobile-search-toggle'\)\?\.focus\(\)/);
});

test('collapsed account trigger has a descriptive accessible name', () => {
  const profileIndex = source.indexOf('className="profile-button"');
  const profileButton = source.slice(profileIndex - 40, profileIndex + 310);
  assert.match(profileButton, /aria-label=/);
  assert.match(profileButton, /Open account menu for/);
  assert.match(profileButton, /aria-expanded=\{profileOpen\}/);
});
