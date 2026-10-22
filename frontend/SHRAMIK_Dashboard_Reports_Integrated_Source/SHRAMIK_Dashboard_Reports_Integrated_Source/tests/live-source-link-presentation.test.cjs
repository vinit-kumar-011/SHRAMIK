const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../src/live-data');
const page = fs.readFileSync(path.join(root, 'DatabaseInsightsPage.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'database-insights.css'), 'utf8');

test('source links shorten long publisher labels but preserve the official title and URL', () => {
  assert.match(page, /function sourceDisplayName\(source: SourceRow\)/);
  assert.match(page, /MSDE \/ PIB training metrics/);
  assert.match(page, /Rajya Sabha · Q\.2674/);
  assert.match(page, /DGT · CTS-2026 seat matrix/);
  assert.match(page, /title=\{fullName\}/);
  assert.match(page, /aria-label=/);
  assert.match(page, /href=\{source\.url\}/);
});

test('long source labels truncate within the table instead of forcing narrow columns into excessive wrapping', () => {
  assert.match(styles, /\.dbi-source-link\s*\{[^}]*max-width:\s*180px/s);
  assert.match(styles, /\.dbi-source-link\s*>\s*span\s*\{[^}]*text-overflow:\s*ellipsis/s);
  assert.match(styles, /\.dbi-source-link\s*>\s*span\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(styles, /\.dbi-source-link\s*>\s*svg\s*\{[^}]*flex:\s*0\s+0\s+auto/s);
});
