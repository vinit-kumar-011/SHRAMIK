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
  'CWS_LFPR',
  'CWS_WPR',
  'CWS_UR',
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

const monthlyCwsCodes = ['CWS_LFPR', 'CWS_WPR', 'CWS_UR'];
const monthlyCwsRows = monthlyCwsCodes.map(code => rows.find(row => row.metric_code === code));
for (const row of monthlyCwsRows) {
  assert.equal(row.unit, '%', row.metric_code + ' must be exposed as a published percentage.');
  assert.match(row.reference_period, /monthly CWS, age 15\+/i, row.metric_code + ' must retain its monthly age-15+ CWS definition.');
  assert.match(row.source_url || '', /mospi\.gov\.in/i, row.metric_code + ' must link to the official MoSPI source.');
  assert.match(row.interpretation_note || '', /not job demand|not a forecast/i, row.metric_code + ' must warn against interpreting the context rate as a demand/forecast output.');
}
assert.equal(
  new Set(monthlyCwsRows.map(row => row.reference_period)).size,
  1,
  'All three monthly CWS cards must refer to the same complete release.',
);

const annualUnemployment = rows.find(row => row.metric_code === 'UR');
assert.equal(annualUnemployment.reference_period, 'CY2025', 'Annual PLFS benchmark must retain its CY2025 reference period.');
assert.match(annualUnemployment.title, /annual benchmark/i, 'Annual PLFS result must remain labelled separately from monthly CWS.');
assert.notEqual(
  annualUnemployment.reference_period,
  monthlyCwsRows[2].reference_period,
  'Annual CY2025 unemployment must not be conflated with monthly age-15+ CWS unemployment.',
);
console.log('Live Supabase published-data smoke passed: ' + rows.length + ' KPI rows, including monthly CWS LFPR/WPR/UR and the separate CY2025 annual benchmark. No keys were printed.');
