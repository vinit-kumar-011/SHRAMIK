import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const host = '127.0.0.1';
const port = Number(process.env.SHRAMIK_PREVIEW_PORT || 4179);
const origin = `http://${host}:${port}`;
const baseSegments = (process.env.VITE_BASE_PATH ?? '').split('/').filter(Boolean);
const basePath = baseSegments.length ? `/${baseSegments.join('/')}` : '';
const server = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', 'preview',
  '--host', host, '--port', String(port), '--strictPort',
], { stdio: 'ignore', env: process.env });

async function request(url, accept = '*/*') {
  const response = await fetch(url, { headers: { Accept: accept } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response;
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error(`Vite preview exited early (code ${server.exitCode}).`);
    try {
      const response = await fetch(`${origin}${basePath}/`, { headers: { Accept: 'text/html' } });
      if (response.ok && (await response.text()).includes('id="root"')) { ready = true; break; }
    } catch {
      // The server is still starting; retry briefly.
    }
    await delay(150);
  }
  if (!ready) throw new Error('Vite preview did not become ready within 12 seconds.');

  const routes = [
    '/', '/demand', '/supply', '/skill-gaps', '/forecasts',
    '/emerging-skills', '/scenario-simulator', '/reports',
    '/data-sources', '/data-quality', '/administration',
    '/supply/', '/data-quality/', '/administration/',
    '/skill-gap-analysis.html', '/forecasts.html', '/reports.html',
  ];

  for (const route of routes) {
    const response = await request(`${origin}${basePath}${route}`, 'text/html');
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('text/html')) throw new Error(`Expected HTML for ${route}; received ${type || 'unknown content type'}.`);
    const html = await response.text();
    if (!html.includes('id="root"')) throw new Error(`Route ${route} did not return the canonical React shell.`);

    const scriptPath = html.match(/<script[^>]+src=["']([^"']+\.js)["']/i)?.[1];
    if (!scriptPath) throw new Error(`No bundled application script was referenced by ${route}.`);
    const scriptUrl = new URL(scriptPath, response.url);
    const script = await request(scriptUrl.href);
    const scriptType = script.headers.get('content-type') ?? '';
    if (!scriptType.includes('javascript') && !scriptType.includes('ecmascript')) {
      throw new Error(`The application script for ${route} did not resolve to JavaScript (${scriptType}).`);
    }
  }

  const geometryResponse = await request(`${origin}${basePath}/assets/india-states.geojson`, 'application/geo+json, application/json');
  const geometryType = geometryResponse.headers.get('content-type') ?? '';
  if (!geometryType.includes('json')) throw new Error(`Bundled state/UT geometry did not return JSON (${geometryType}).`);
  const geometry = await geometryResponse.json();
  if (geometry?.type !== 'FeatureCollection' || !Array.isArray(geometry.features) || geometry.features.length !== 36) {
    throw new Error('Bundled state/UT geometry must be a 36-feature GeoJSON FeatureCollection.');
  }
  for (const code of ['IN-OD', 'IN-WB', 'IN-AN']) {
    if (!geometry.features.some(feature => feature?.properties?.code === code)) {
      throw new Error(`Bundled GeoJSON is missing canonical feature ${code}.`);
    }
  }

  const attributionResponse = await request(`${origin}${basePath}/assets/INDIA_STATES_ATTRIBUTION.md`, 'text/plain, text/markdown');
  const attribution = await attributionResponse.text();
  if (!/OpenStreetMap contributors/i.test(attribution) || !/ODbL 1\\.0/i.test(attribution) ||
      !/not a Survey of India product/i.test(attribution)) {
    throw new Error('Bundled boundary attribution must contain OSM credit, the ODbL licence and the non-official-boundary disclaimer.');
  }

  console.log(`Passed: ${routes.length} direct-route, bundled geometry and asset smoke checks against Vite preview.`);
} finally {
  server.kill('SIGTERM');
}
