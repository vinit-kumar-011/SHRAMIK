import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const host = '127.0.0.1';
const previewPort = Number(process.env.SHRAMIK_BROWSER_QA_PORT || 4181);
const origin = `http://${host}:${previewPort}`;
const appDir = process.cwd();
const artifactsDir = path.resolve(appDir, 'browser-qa-artifacts');
const results = [];
const pageExceptions = [];
const consoleErrors = [];
const nonReadRequests = [];

function record(name, passed, details = '') {
  results.push({ name, passed: Boolean(passed), details });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${details ? ` — ${details}` : ''}`);
}

function chromeBinary() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for (const binary of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [binary], { encoding: 'utf8' }).trim(); } catch { /* try next */ }
  }
  const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (existsSync(cache)) {
    // This workflow's fallback installs Playwright Chromium if the runner has no system Chrome.
    const candidate = execFileSync('find', [cache, '-type', 'f', '-name', 'chrome'], { encoding: 'utf8' })
      .split('\n').find((item) => /chrome-linux/.test(item));
    if (candidate) return candidate;
  }
  throw new Error('Chromium/Chrome executable not found. Set CHROME_BIN in the workflow.');
}

class CDP {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (!message.id) {
        if (message.method === 'Runtime.exceptionThrown') {
          const detail = message.params?.exceptionDetails;
          pageExceptions.push(detail?.exception?.description || detail?.text || 'Unknown page exception');
        }
        if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
          consoleErrors.push((message.params.args || []).map((arg) => arg.value || arg.description || '').join(' ').slice(0, 400));
        }
        if (message.method === 'Network.requestWillBeSent') {
          const request = message.params?.request;
          const method = request?.method;
          if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
            nonReadRequests.push({ method, url: request.url });
          }
        }
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
      else pending.resolve(message.result || {});
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out opening Chrome DevTools WebSocket')), 10000);
      socket.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
      socket.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Could not connect to Chrome DevTools WebSocket')); }, { once: true });
    });
    return new CDP(socket);
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Chrome DevTools command timed out: ${method}`));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Page evaluation failed');
    }
    return result.result?.value;
  }

  close() { try { this.socket.close(); } catch { /* ignore cleanup errors */ } }
}

async function waitFor(check, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) { lastError = error; }
    await delay(120);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

async function setViewport(cdp, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width <= 480,
  });
}

async function navigate(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await waitFor(() => cdp.evaluate(
    `document.readyState === 'complete' && !!document.querySelector('#root')?.children.length`,
  ), `React app at ${url}`);
  await delay(250);
}

async function clickByText(cdp, needle, exact = false) {
  const safeNeedle = JSON.stringify(needle.toLowerCase());
  const exactFlag = exact ? 'true' : 'false';
  return cdp.evaluate(`(() => {
    const needle = ${safeNeedle};
    const exact = ${exactFlag};
    const candidates = Array.from(document.querySelectorAll('a,button'));
    const found = candidates.find((element) => {
      const text = (element.innerText || element.getAttribute('aria-label') || '').trim().toLowerCase();
      return exact ? text === needle : text.includes(needle);
    });
    if (!found) return null;
    found.click();
    return {tag: found.tagName, text: (found.innerText || '').trim(), href: found.getAttribute('href'), aria: found.getAttribute('aria-label')};
  })()`);
}

async function screenshot(cdp, fileName) {
  const response = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true });
  await writeFile(path.join(artifactsDir, fileName), Buffer.from(response.data, 'base64'));
}

let preview;
let chrome;
let cdp;
let profile;
try {
  await mkdir(artifactsDir, { recursive: true });
  preview = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js', 'preview', '--host', host,
    '--port', String(previewPort), '--strictPort',
  ], { cwd: appDir, stdio: 'ignore', env: process.env });

  await waitFor(async () => {
    try {
      const response = await fetch(origin + '/', { signal: AbortSignal.timeout(1000) });
      return response.ok;
    } catch { return false; }
  }, 'Vite production preview');

  profile = await mkdtemp(path.join(os.tmpdir(), 'shramik-chromium-'));
  chrome = spawn(chromeBinary(), [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--remote-allow-origins=*',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });

  const portFile = path.join(profile, 'DevToolsActivePort');
  const debugPort = await waitFor(async () => {
    try {
      const value = (await readFile(portFile, 'utf8')).split('\n')[0].trim();
      return /^\d+$/.test(value) ? Number(value) : null;
    } catch { return null; }
  }, 'Chrome DevTools port');
  const devtools = `http://127.0.0.1:${debugPort}`;
  await waitFor(async () => {
    try { return (await fetch(devtools + '/json/version')).ok; } catch { return false; }
  }, 'Chrome DevTools endpoint');

  const targetResponse = await fetch(devtools + '/json/new?' + origin + '/', { method: 'PUT' });
  if (!targetResponse.ok) throw new Error(`Could not create browser target: HTTP ${targetResponse.status}`);
  const target = await targetResponse.json();
  cdp = await CDP.connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Log.enable');
  await setViewport(cdp, 1365, 900);
  await navigate(cdp, origin + '/');

  let pageInfo = await cdp.evaluate(`({title:document.title,text:(document.body?.innerText||'').slice(0,500),path:location.pathname})`);
  record('Public landing page mounts from the production build', pageInfo.path === '/' && /SHRAMIK/i.test(pageInfo.title) && /SHRAMIK/i.test(pageInfo.text), JSON.stringify(pageInfo));
  await screenshot(cdp, 'landing-desktop.png');

  const loginNav = await clickByText(cdp, 'sign in');
  await waitFor(() => cdp.evaluate(`location.pathname === '/login' && !!document.querySelector('input[type="password"]')`), 'interactive navigation to sign-in');
  pageInfo = await cdp.evaluate(`({path:location.pathname,text:(document.body?.innerText||'').slice(0,350)})`);
  record('Landing sign-in navigation opens the standalone login page', Boolean(loginNav) && pageInfo.path === '/login' && /Sign in to SHRAMIK/i.test(pageInfo.text), JSON.stringify({clicked:loginNav,page:pageInfo}));
  record('Login fields enforce required validation and mask passwords', await cdp.evaluate(`(() => { const email=document.querySelector('input[type="email"]'); const password=document.querySelector('input[type="password"]'); const form=document.querySelector('form'); return !!email && !!password && !!form && email.required && password.required && password.type === 'password' && !form.checkValidity(); })()`), 'No sign-in was submitted; this is a local UI validation check.');
  await screenshot(cdp, 'login-desktop.png');

  const requestNav = await clickByText(cdp, 'request access');
  await waitFor(() => cdp.evaluate(`location.pathname === '/request-access' && !!document.querySelector('form')`), 'interactive navigation to request access');
  pageInfo = await cdp.evaluate(`({path:location.pathname,text:(document.body?.innerText||'').slice(0,350),required:document.querySelectorAll('form [required]').length,roles:document.querySelectorAll('select option').length + document.querySelectorAll('input[type="radio"]').length})`);
  record('Login-to-access-request navigation remains outside the workspace shell', Boolean(requestNav) && pageInfo.path === '/request-access' && pageInfo.required >= 4 && pageInfo.roles >= 3, JSON.stringify(pageInfo));
  record('Access request form remains incomplete until required fields are filled', await cdp.evaluate(`(() => { const form=document.querySelector('form'); return !!form && !form.checkValidity(); })()`), 'The form was not submitted, so no access request was written.');
  await screenshot(cdp, 'request-access-desktop.png');

  // Public auth pages at common breakpoints.
  for (const [width, height, name] of [[360,800,'mobile-360'],[390,844,'mobile-390'],[768,1024,'tablet-768'],[1365,900,'desktop-1365']]) {
    await setViewport(cdp, width, height);
    await navigate(cdp, origin + '/login');
    const metrics = await cdp.evaluate(`({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,main:!!document.querySelector('main'),heading:!!document.querySelector('h1')})`);
    record(`Login layout has no horizontal overflow at ${width}px`, Math.max(metrics.document, metrics.body) <= width + 2 && metrics.main && metrics.heading, JSON.stringify(metrics));
    await screenshot(cdp, `login-${name}.png`);
  }

  // Frontend-only session fixture: never call the auth endpoint and never submit a write form.
  await cdp.evaluate(`sessionStorage.setItem('shramik.auth.session.v1', JSON.stringify({access_token:'qa-only-invalid-token',refresh_token:'qa-only-refresh-token',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'qa-only-user',email:'qa-only@example.invalid'}}))`);
  await setViewport(cdp, 1365, 900);
  await navigate(cdp, origin + '/dashboard');
  pageInfo = await cdp.evaluate(`({path:location.pathname,text:(document.body?.innerText||'').slice(0,700),hasMain:!!document.querySelector('#shramik-main')})`);
  record('Protected workspace shell renders with an isolated test-only session', pageInfo.path === '/dashboard' && pageInfo.hasMain && /Dashboard/i.test(pageInfo.text), JSON.stringify(pageInfo));
  await screenshot(cdp, 'workspace-desktop.png');

  const navControls = await cdp.evaluate(`Array.from(document.querySelectorAll('button,a')).map(e=>({text:(e.innerText||'').trim(),aria:e.getAttribute('aria-label'),className:typeof e.className==='string'?e.className:''})).filter(x=>/nav-item/.test(x.className)).map(x=>x.text).filter(Boolean)`);
  record('Workspace navigation exposes core modules', ['Demand','Supply','Reports','Administration'].every((needle) => navControls.some((label) => label.toLowerCase().includes(needle.toLowerCase())), JSON.stringify(navControls));

  const demandNav = await cdp.evaluate(`(() => {const elements=Array.from(document.querySelectorAll('button.nav-item, a.nav-item'));const e=elements.find(x=>(x.innerText||'').trim().toLowerCase().includes('demand'));if(!e)return null;e.click();return (e.innerText||'').trim();})()`);
  await waitFor(() => cdp.evaluate(`location.pathname === '/demand'`), 'Demand navigation');
  pageInfo = await cdp.evaluate(`({path:location.pathname,text:(document.body?.innerText||'').slice(0,500)})`);
  record('Workspace navigation opens Demand', Boolean(demandNav) && pageInfo.path === '/demand' && /Demand/i.test(pageInfo.text), JSON.stringify({clicked:demandNav,page:pageInfo}));

  const reportsNav = await cdp.evaluate(`(() => {const elements=Array.from(document.querySelectorAll('button.nav-item, a.nav-item'));const e=elements.find(x=>(x.innerText||'').trim().toLowerCase().includes('reports'));if(!e)return null;e.click();return (e.innerText||'').trim();})()`);
  await waitFor(() => cdp.evaluate(`location.pathname === '/reports'`), 'Reports navigation');
  await waitFor(() => cdp.evaluate(`/Report Builder/i.test(document.body?.innerText||'')`), 'Reports page content', 10000);
  pageInfo = await cdp.evaluate(`({path:location.pathname,text:(document.body?.innerText||'').slice(0,500)})`);
  record('Workspace navigation opens the live-mode Reports builder', Boolean(reportsNav) && pageInfo.path === '/reports' && /Report Builder/i.test(pageInfo.text), JSON.stringify({clicked:reportsNav,page:pageInfo}));
  await screenshot(cdp, 'reports-desktop.png');

  await setViewport(cdp, 390, 844);
  await navigate(cdp, origin + '/dashboard');
  const mobileMenu = await cdp.evaluate(`(() => { const e=document.querySelector('button[aria-label="Open navigation"]'); if (!e) return null; e.click(); return {label:e.getAttribute('aria-label'),expanded:e.getAttribute('aria-expanded'),sidebar:!!document.querySelector('#shramik-sidebar'),inert:document.querySelector('#shramik-sidebar')?.hasAttribute('inert')}; })()`);
  record('Mobile navigation opens the controlled sidebar without inert state', Boolean(mobileMenu) && mobileMenu.expanded === 'true' && mobileMenu.sidebar && mobileMenu.inert === false, JSON.stringify(mobileMenu));
  const mobileMetrics = await cdp.evaluate(`({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth})`);
  record('Workspace shell has no horizontal overflow at 390px', Math.max(mobileMetrics.document,mobileMetrics.body) <= 392, JSON.stringify(mobileMetrics));
  await screenshot(cdp, 'workspace-mobile.png');

  record('No non-read-only network requests were initiated by QA', nonReadRequests.length === 0, JSON.stringify(nonReadRequests));
  record('No uncaught JavaScript exceptions were observed', pageExceptions.length === 0, JSON.stringify(pageExceptions.slice(0,10)));
  console.log(JSON.stringify({summary:{passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,total:results.length},results,consoleErrors:consoleErrors.slice(0,15)}, null, 2));
  if (results.some((item) => !item.passed)) process.exitCode = 1;
} catch (error) {
  console.error('Browser interaction QA infrastructure error:', error?.stack || String(error));
  process.exitCode = 1;
} finally {
  try { cdp?.close(); } catch { /* cleanup */ }
  try { chrome?.kill('SIGTERM'); } catch { /* cleanup */ }
  try { preview?.kill('SIGTERM'); } catch { /* cleanup */ }
  if (profile) await rm(profile, { recursive: true, force: true }).catch(() => {});
}
