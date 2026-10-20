import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(here, '../src/supabase/config.ts');
const source = fs.readFileSync(configPath, 'utf8');
const urlFallback = source.match(/SUPABASE_URL\s*=\s*\(env\?\.VITE_SUPABASE_URL\?\.trim\(\)\s*\|\|\s*'([^']+)'/);
const keyFallback = source.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*env\?\.VITE_SUPABASE_PUBLISHABLE_KEY\?\.trim\(\)\s*\|\|\s*'([^']+)'/);

const baseUrl = (process.env.VITE_SUPABASE_URL || urlFallback?.[1] || '').trim().replace(/\/+$/, '');
const publishableKey = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || keyFallback?.[1] || '').trim();
assert.ok(baseUrl.startsWith('https://'), 'Supabase project URL must be available to the live-data smoke test.');
assert.ok(publishableKey.startsWith('sb_publishable_') || publishableKey.startsWith('eyJ'), 'A Supabase publishable/anon key must be available; secret/service-role keys are not accepted.');

const params = new URLSearchParams({
  select: 'metric_code,title,value_numeric,unit,reference_period,source_label,source_url,as_of_date,interpretation_note,sort_order',
  order: 'sort_order.asc',
});
const endpoint = baseUrl + '/rest/v1/sh_public_dashboard_kpis?' + params.toString();
const response = await fetch(endpoint, {
  headers: {
    apikey: publishableKey,
    Authorization: 'Bearer ' + publishableKey,
    Accept: 'application/json',
  },
  signal: AbortSignal.timeout(15000),
});
const responseText = await response.text();
assert.equal(
  response.ok,
  true,
  'Live published KPI request failed with HTTP ' + response.status + ': ' + responseText.slice(0, 300),
);
let rows;
try {
  rows = JSON.parse(responseText);
} catch {
  throw new Error('Live Supabase published KPI endpoint returned non-JSON content.');
}
assert.ok(Array.isArray(rows), 'Live published KPI endpoint must return an array.');
assert.ok(rows.length > 0, 'Live published KPI view returned zero rows.');

const requiredCodes = [
  'ESHRAM_REGISTRATION_COUNT',
  'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE',
  'CTS_ITI_COUNT',
  'UR',
];
const returnedCodes = new Set(rows.map(row => row.metric_code));
for (const code of requiredCodes) {
  assert.ok(returnedCodes.has(code), 'Live published KPI view is missing expected code ' + code + '.');
}
for (const row of rows) {
  assert.ok(row.title && row.unit && row.reference_period, 'Published KPI rows need title, unit and reference period.');
  assert.ok(Number.isFinite(Number(row.value_numeric)), 'Published KPI ' + row.metric_code + ' must have a numeric value.');
}
console.log('Live Supabase published-data smoke passed: ' + rows.length + ' KPI rows, including all four expected national indicators. No keys were printed.');
