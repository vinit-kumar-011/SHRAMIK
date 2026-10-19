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

async function request(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response;
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error(`Vite preview exited early (code ${server.exitCode}).`);
    try {
      const response = await fetch(`${origin}${basePath}/`);
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
    const response = await request(`${origin}${basePath}${route}`);
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

  console.log(`Passed: ${routes.length} direct-route and asset smoke checks against Vite preview.`);
} finally {
  server.kill('SIGTERM');
}
