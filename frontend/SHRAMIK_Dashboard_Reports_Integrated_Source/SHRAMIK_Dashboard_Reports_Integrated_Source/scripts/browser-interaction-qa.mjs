import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
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

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not allocate a local Chrome DevTools port.'));
        return;
      }
      const port = address.port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
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
  const expectedPath = new URL(url).pathname;
  await cdp.send('Page.navigate', { url });
  // Require the destination URL as well as the React mount. The root may still
  // exist on the previous route while Chromium is processing a full navigation.
  await waitFor(() => cdp.evaluate(
    `location.pathname === ${JSON.stringify(expectedPath)} && document.readyState === 'complete' && !!document.querySelector('#root')?.children.length`,
  ), `React app at ${expectedPath}`);
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
  const debugPort = await findFreePort();
  let chromeStderr = '';
  chrome = spawn(chromeBinary(), [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--remote-allow-origins=*',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.stderr?.on('data', chunk => {
    chromeStderr = (chromeStderr + chunk.toString()).slice(-5000);
  });

  const devtools = `http://127.0.0.1:${debugPort}`;
  await waitFor(async () => {
    if (chrome.exitCode !== null) {
      throw new Error(`Chrome exited with code ${chrome.exitCode}. ${chromeStderr.slice(-1800)}`);
    }
    try { return (await fetch(devtools + '/json/version')).ok; } catch { return false; }
  }, 'Chrome DevTools endpoint', 20000);

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
  const landingShowcaseState = await cdp.evaluate(`(() => {
    const text = document.body?.innerText || '';
    return {
      showcaseLabel: text.includes('OFFICIAL SHOWCASE · SOURCE-BACKED ONLY'),
      noDataNote: text.includes('No validated demand/supply trend published'),
      noIllustrativeMetrics: text.includes('Not published') && text.includes('Not calculated'),
      syntheticTrendPaths: document.querySelectorAll('path[class*="sl-chart-demand"], path[class*="sl-chart-supply"], path[class*="sl-chart-forecast"]').length,
      illustrativeTabs: !!document.querySelector('[aria-label="Platform preview views"]'),
    };
  })()`);
  record(
    'Official landing preview suppresses illustrative trend lines and tabbed mock data',
    landingShowcaseState.showcaseLabel && landingShowcaseState.noDataNote &&
      landingShowcaseState.noIllustrativeMetrics && landingShowcaseState.syntheticTrendPaths === 0 &&
      !landingShowcaseState.illustrativeTabs,
    JSON.stringify(landingShowcaseState),
  );
  await screenshot(cdp, 'landing-desktop.png');

  const loginNav = await clickByText(cdp, 'sign in');
  await waitFor(() => cdp.evaluate(`location.pathname === '/login' && !!document.querySelector('input[type="password"]')`), 'interactive navigation to sign-in');
  pageInfo = await cdp.evaluate(`({path:location.pathname,text:(document.body?.innerText||'').slice(0,350)})`);
  record('Landing sign-in navigation opens the standalone login page', Boolean(loginNav) && pageInfo.path === '/login' && /Sign in to continue to SHRAMIK/i.test(pageInfo.text), JSON.stringify({clicked:loginNav,page:pageInfo}));
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
  await waitFor(() => cdp.evaluate(
    `!document.querySelector('.load-strip') && document.querySelectorAll('.kpi-skeleton').length === 0`,
  ), 'Dashboard source-backed read completes or reports an error', 20000);
  pageInfo = await cdp.evaluate(`({path:location.pathname,text:(document.body?.innerText||'').slice(0,700),hasMain:!!document.querySelector('#shramik-main')})`);
  record('Protected workspace shell renders with an isolated test-only session', pageInfo.path === '/dashboard' && pageInfo.hasMain && /Dashboard/i.test(pageInfo.text), JSON.stringify(pageInfo));
  const dashboardState = await cdp.evaluate(`(() => {
    const app = document.querySelector('.app-root');
    const footer = document.querySelector('.data-status-footer');
    const bodyText = document.body?.innerText || '';
    const footerText = (document.querySelector('.method-note')?.innerText || '');
    const loading = !!document.querySelector('.load-strip') || document.querySelectorAll('.kpi-skeleton').length > 0;
    const provenanceClass = Array.from(footer?.classList || []).find(name => ['source-backed','mixed','derived','mock','loading','unavailable','unknown'].includes(name)) || '';
    const honestState = ['source-backed','mixed','derived','loading','unavailable','unknown'].includes(provenanceClass);
    return {
      adapterMode: Array.from(app?.classList || []).find(name => name.startsWith('data-mode-')) || '',
      loading,
      provenanceClass,
      footerText: footerText.slice(0, 340),
      hasDashboardError: bodyText.includes('Dashboard data unavailable.'),
      hasSourceBackedEmptyState: bodyText.includes('No source-backed KPI cards are available'),
      honestStatus: footerText.includes('Data notes:') || footerText.includes('Loading source-backed data:') ||
        footerText.includes('Source-backed data unavailable:') || footerText.includes('No validated snapshot is available') ||
        footerText.includes('Mixed data:') || footerText.includes('Derived data:'),
      misleadingIllustrativeStatus: footerText.includes('Prototype preview:') || footerText.includes('Illustrative data'),
    };
  })()`);
  const dashboardHonest = !dashboardState.loading && dashboardState.honestStatus &&
    (dashboardState.adapterMode !== 'data-mode-supabase' || !dashboardState.misleadingIllustrativeStatus) &&
    (dashboardState.provenanceClass === 'source-backed' || dashboardState.provenanceClass === 'mixed' ||
      dashboardState.provenanceClass === 'derived' || dashboardState.hasDashboardError ||
      dashboardState.hasSourceBackedEmptyState || dashboardState.provenanceClass === 'unknown' ||
      dashboardState.provenanceClass === 'unavailable');
  record('Dashboard waits for a settled source-backed or explicit unavailable state without illustrative fallback',
    dashboardHonest, JSON.stringify(dashboardState));
  await screenshot(cdp, 'workspace-desktop.png');

  const navControls = await cdp.evaluate(`Array.from(document.querySelectorAll('button,a')).map(e=>({text:(e.innerText||'').trim(),aria:e.getAttribute('aria-label'),className:typeof e.className==='string'?e.className:''})).filter(x=>/nav-item/.test(x.className)).map(x=>x.text).filter(Boolean)`);
  record('Workspace navigation exposes core modules', ['Demand','Supply','Reports','Administration'].every((needle) => navControls.some((label) => label.toLowerCase().includes(needle.toLowerCase()))), JSON.stringify(navControls));

  const demandNav = await cdp.evaluate(`(() => {const elements=Array.from(document.querySelectorAll('button.nav-item, a.nav-item'));const e=elements.find(x=>(x.innerText||'').trim().toLowerCase().includes('demand'));if(!e)return null;e.click();return (e.innerText||'').trim();})()`);
  await waitFor(() => cdp.evaluate(`location.pathname === '/demand'`), 'Demand navigation');
  pageInfo = await cdp.evaluate(`({path:location.pathname,title:document.querySelector('.dbi-hero h1')?.innerText||'',text:(document.body?.innerText||'').slice(0,500)})`);
  record('Workspace navigation opens Demand', Boolean(demandNav) && pageInfo.path === '/demand' && /Demand/i.test(pageInfo.title), JSON.stringify({clicked:demandNav,page:pageInfo}));

  const reportsNav = await cdp.evaluate(`(() => {const elements=Array.from(document.querySelectorAll('button.nav-item, a.nav-item'));const e=elements.find(x=>(x.innerText||'').trim().toLowerCase().includes('reports'));if(!e)return null;e.click();return (e.innerText||'').trim();})()`);
  await waitFor(() => cdp.evaluate(`location.pathname === '/reports'`), 'Reports navigation');
  await waitFor(() => cdp.evaluate(`/Report Builder/i.test(document.body?.innerText||'')`), 'Reports page content', 10000);
  pageInfo = await cdp.evaluate(`({path:location.pathname,hasReportBuilder:/Report Builder/i.test(document.body?.innerText||''),text:(document.body?.innerText||'').slice(0,500)})`);
  record('Workspace navigation opens the live-mode Reports builder', Boolean(reportsNav) && pageInfo.path === '/reports' && pageInfo.hasReportBuilder, JSON.stringify({clicked:reportsNav,page:pageInfo}));
  await screenshot(cdp, 'reports-desktop.png');

  // Production builds are official-only: the public UI must not offer synthetic preview entry points.
  const officialOnlyModules = [
    { path: '/demand', label: 'Demand' },
    { path: '/supply', label: 'Supply' },
    { path: '/skill-gaps', label: 'Skill Gaps' },
    { path: '/forecasts', label: 'Forecasts' },
    { path: '/emerging-skills', label: 'Emerging Skills' },
    { path: '/data-quality', label: 'Data Quality' },
  ];
  for (const module of officialOnlyModules) {
    await navigate(cdp, origin + module.path);
    if (['/forecasts', '/emerging-skills'].includes(module.path)) {
      await waitFor(() => cdp.evaluate(`!!document.querySelector('.pai-mode-label select')`), `${module.label} official analysis controls`);
    } else {
      await waitFor(() => cdp.evaluate(`!!document.querySelector('.dbi-shell') && !document.querySelector('.dbi-loading')`), `${module.label} official/source-backed view`);
    }
    const state = await cdp.evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const options = Array.from(document.querySelectorAll('select option'));
      const occupation = Array.from(document.querySelectorAll('select')).find(select => select.closest('label')?.innerText.includes('Occupation (NCO)'));
      const demandCards = Array.from(document.querySelectorAll('.dbi-demand-kpi'));
      const demandCard = label => demandCards.find(card => (card.querySelector('small')?.innerText || '').trim() === label);
      const cardValue = label => (demandCard(label)?.querySelector('strong')?.innerText || '').trim();
      const cardPeriod = label => Array.from(demandCard(label)?.querySelectorAll('span') || [])
        .map(span => (span.innerText || '').trim())
        .find(value => /monthly CWS|PLFS CY2025/i.test(value)) || '';
      return {
        path: location.pathname,
        liveShell: !!document.querySelector('.dbi-shell'),
        previewButton: buttons.some(button => ['Open synthetic demo preview', 'Open illustrative demo'].includes((button.innerText || '').trim())),
        previewBanner: !!document.querySelector('.module-preview-banner'),
        demoModeOption: options.some(option => option.value === 'DEMO' || /demo · synthetic/i.test(option.innerText)),
        illustrativeOccupationOptions: !!occupation && Array.from(occupation.options).some(option => ['EXAMPLES', 'DEMO'].includes(option.value)),
        syntheticNotice: !!document.querySelector('.pai-notice-demo'),
        analyticsApiConfigurationNotice: (document.body?.innerText || '').includes('No approved FastAPI origin is configured for this production build'),
        analyticsHttp500Notice: (document.body?.innerText || '').includes('Analytics API returned HTTP 500'),
        monthlyPlfsContext: location.pathname === '/demand' ? {
          unemployment: cardValue('Unemployment Rate'),
          labourForceParticipation: cardValue('Labour Force Participation'),
          workerPopulationRatio: cardValue('Worker Population Ratio'),
          unemploymentPeriod: cardPeriod('Unemployment Rate'),
          jobDemandUnavailableNotice: /Job-demand series is not published/i.test(document.body?.innerText || ''),
          dataSourceHeading: (document.querySelector('.dbi-demand-panel')?.innerText || '').slice(0, 140),
        } : null,
      };
    })()`);
    const officialOnly = state.path === module.path && state.liveShell && !state.previewButton &&
      !state.previewBanner && !state.demoModeOption && !state.illustrativeOccupationOptions && !state.syntheticNotice;
    record(`${module.label} production view exposes only source-backed/showcase controls`, officialOnly, JSON.stringify(state));
    if (['/forecasts', '/emerging-skills'].includes(module.path)) {
      const apiStateIsHonest = state.analyticsApiConfigurationNotice && !state.analyticsHttp500Notice;
      record(`${module.label} explains missing production API configuration without calling a nonexistent route`, apiStateIsHonest, JSON.stringify({
        configuredNotice: state.analyticsApiConfigurationNotice,
        misleadingHttp500: state.analyticsHttp500Notice,
      }));
    }
    if (module.path === '/demand') {
      const plfs = state.monthlyPlfsContext || {};
      const asPercent = value => Number(String(value).replace('%', '').replace(/,/g, '').trim());
      const monthlyCardsCorrect =
        Math.abs(asPercent(plfs.unemployment) - 5.0) < 0.001 &&
        Math.abs(asPercent(plfs.labourForceParticipation) - 55.5) < 0.001 &&
        Math.abs(asPercent(plfs.workerPopulationRatio) - 52.7) < 0.001 &&
        /September 2026 · monthly CWS · persons aged 15\+/i.test(plfs.unemploymentPeriod || '');
      record(
        'Demand page displays the verified September 2026 national PLFS CWS context without relabelling it as demand',
        monthlyCardsCorrect && plfs.jobDemandUnavailableNotice === true,
        JSON.stringify(plfs),
      );
      await screenshot(cdp, 'showcase-demand.png');

      // Open the source evidence accordion and verify the official NCS portal snapshot
      // is rendered from the database with its bound wording/date/source—not from mock text.
      await cdp.evaluate(`(() => {
        const details = document.querySelector('.dbi-demand-evidence');
        const summary = details?.querySelector('summary');
        if (!details || !summary) return false;
        if (!details.open) summary.click();
        return true;
      })()`);
      await waitFor(() => cdp.evaluate(`(() => {
        const details = document.querySelector('.dbi-demand-evidence');
        const text = details?.innerText || '';
        return !!details?.open
          && text.includes('NCS portal active-vacancy snapshot')
          && text.includes('Over 17.68 lakh')
          && text.includes('15 Jul 2026')
          && text.includes('NCS portal only');
      })()`), 'source-backed NCS portal snapshot in Demand evidence');
      const ncsEvidence = await cdp.evaluate(`(() => {
        const details = document.querySelector('.dbi-demand-evidence');
        const text = details?.innerText || '';
        const ncsSource = Array.from(details?.querySelectorAll('a') || [])
          .map(anchor => anchor.href)
          .find(href => href.includes('PRID=2147927'));
        return {
          open: !!details?.open,
          lowerBoundLabel: text.includes('Over 17.68 lakh'),
          asOfDate: text.includes('15 Jul 2026'),
          portalOnlyScope: text.includes('NCS portal only'),
          notExact: text.includes('not an exact count'),
          sourceUrl: ncsSource || '',
          totalDemandExcluded: text.includes('not used to calculate the “Total Estimated Demand” KPI'),
        };
      })()`);
      record(
        'Demand source evidence shows the dated NCS portal lower bound and its source limitations',
        ncsEvidence.open && ncsEvidence.lowerBoundLabel && ncsEvidence.asOfDate
          && ncsEvidence.portalOnlyScope && ncsEvidence.notExact
          && ncsEvidence.sourceUrl.includes('PRID=2147927') && ncsEvidence.totalDemandExcluded,
        JSON.stringify(ncsEvidence),
      );
      await screenshot(cdp, 'showcase-demand-evidence-expanded.png');
      continue;
    }
    await screenshot(cdp, `showcase-${module.path.slice(1)}.png`);
  }

  // Data Sources must expose only the registry response and its actual status metadata.
  await navigate(cdp, origin + '/data-sources');
  await waitFor(() => cdp.evaluate(`(() => {
    const root = document.querySelector('.data-sources-page');
    const text = document.body?.innerText || '';
    return !!root && (
      !!root.querySelector('.connection-note') ||
      !!root.querySelector('.error-state') ||
      text.includes('No sources registered')
    );
  })()`), 'Data Sources registry response or explicit unavailable state');
  const dataSourcesState = await cdp.evaluate(`(() => {
    const root = document.querySelector('.data-sources-page');
    const text = root?.innerText || '';
    const rows = Array.from(root?.querySelectorAll('.source-table tbody tr') || []);
    const lifecycleUnknown = rows.filter(row => row.querySelector('.status-stack')?.innerText.includes('Unknown')).length;
    return {
      mounted: !!root,
      registryResponse: !!root?.querySelector('.connection-note'),
      explicitError: !!root?.querySelector('.error-state'),
      syntheticNotice: !!root?.querySelector('.demo-notice'),
      provenanceTags: Array.from(root?.querySelectorAll('.provenance') || []).map(el => (el.innerText || '').trim()),
      rowCount: rows.length,
      unknownLifecycleOrFreshnessRows: lifecycleUnknown,
      overstatesFreshness: /All sources are up to date|Every source is healthy|Live feed connected/i.test(text),
      hasSourceRegisterTitle: /Registered sources/i.test(text),
    };
  })()`);
  const dataSourcesSafe = dataSourcesState.mounted && !dataSourcesState.syntheticNotice &&
    !dataSourcesState.overstatesFreshness && dataSourcesState.hasSourceRegisterTitle &&
    (dataSourcesState.registryResponse || dataSourcesState.explicitError);
  record('Data Sources shows registry state without synthetic runs or unsupported freshness claims',
    dataSourcesSafe, JSON.stringify(dataSourcesState));
  await screenshot(cdp, 'showcase-data-sources.png');

  // Administration has no production API yet. It must show an explicit unavailable
  // state, not fictional applicants/users/audit rows or local approval controls.
  await navigate(cdp, origin + '/administration');
  await waitFor(() => cdp.evaluate(`!!document.querySelector('.administration-page') && !!document.querySelector('.administration-unavailable-notice')`),
    'Administration unavailable-state notice');
  const administrationState = await cdp.evaluate(`(() => {
    const root = document.querySelector('.administration-page');
    const text = root?.innerText || '';
    const requestRows = root?.querySelectorAll('.administration-table tbody tr')?.length || 0;
    const visibleButtons = Array.from(root?.querySelectorAll('button') || []);
    return {
      mounted: !!root,
      unavailableNotice: !!root?.querySelector('.administration-unavailable-notice'),
      demoNotice: !!root?.querySelector('.administration-demo-notice'),
      sourceUnavailableExplained: text.includes('No real access requests, user records or audit events are shown'),
      noRequestOrUserRows: requestRows === 0,
      noReviewControls: !root?.querySelector('.administration-review-button'),
      noLocalApproveControls: !visibleButtons.some(button => /Approve locally|Deny locally/.test(button.innerText || '')),
      pendingRequestsNotConnected: text.includes('no live queue connected'),
      auditLedgerNotFabricated: text.includes('No server audit endpoint is configured. No audit events are fabricated.'),
    };
  })()`);
  const administrationSafe = administrationState.mounted && administrationState.unavailableNotice &&
    !administrationState.demoNotice && administrationState.sourceUnavailableExplained &&
    administrationState.noRequestOrUserRows && administrationState.noReviewControls &&
    administrationState.noLocalApproveControls && administrationState.pendingRequestsNotConnected &&
    administrationState.auditLedgerNotFabricated;
  record('Administration reports unavailable service and exposes no fictional access records or decisions',
    administrationSafe, JSON.stringify(administrationState));
  await screenshot(cdp, 'showcase-administration.png');

  // Production showcase mode has no local assumptions-only baseline. Wait for the guarded
  // official state instead of expecting demo defaults or a selectable placeholder skill.
  await navigate(cdp, origin + '/scenario-simulator');
  await waitFor(() => cdp.evaluate(`(() => {
    const body = document.body?.innerText || '';
    return !!document.querySelector('.ss-page') &&
      body.includes('Official showcase mode — approved source-backed baseline required.');
  })()`), 'official showcase simulator guard and unavailable baseline');
  const plannerShowcase = await cdp.evaluate(`(() => {
    const body = document.body?.innerText || '';
    const run = Array.from(document.querySelectorAll('button')).find(button => (button.innerText||'').trim() === 'Approved source-backed baseline required');
    return {
      noFallbackScope: !body.includes('User-defined skill group') && !body.includes('LOCAL-PLANNING-NO-VALIDATED-BASELINE'),
      noAssumptionInputs: !document.querySelector('#ss-seats') && !document.querySelector('#ss-lag') && !document.querySelector('.ss-advanced'),
      officialGuard: body.includes('Official showcase mode — approved source-backed baseline required.'),
      runDisabled: !!run && run.disabled,
      runLabel: (run?.innerText || '').trim(),
      syntheticOutput: !!document.querySelector('.ss-card.ss-outcomes .ss-badge')
        && /SYNTHETIC_DEMO/.test(document.querySelector('.ss-card.ss-outcomes .ss-badge')?.innerText || ''),
    };
  })()`);
  record('Scenario Simulator hides placeholder scopes and default assumptions in official showcase mode',
    plannerShowcase.noFallbackScope && plannerShowcase.noAssumptionInputs && plannerShowcase.officialGuard &&
    plannerShowcase.runDisabled && /Approved source-backed baseline required/.test(plannerShowcase.runLabel) &&
    !plannerShowcase.syntheticOutput, JSON.stringify(plannerShowcase));
  await screenshot(cdp, 'scenario-planner-showcase.png');

  await setViewport(cdp, 390, 844);
  await navigate(cdp, origin + '/dashboard');
  const mobileClick = await cdp.evaluate(`(() => { const e=document.querySelector('button[aria-label="Open navigation"]'); if (!e) return null; e.click(); return true; })()`);
  await waitFor(() => cdp.evaluate(`document.querySelector('button[aria-label="Close navigation"]')?.getAttribute('aria-expanded') === 'true' && !!document.querySelector('#shramik-sidebar') && !document.querySelector('#shramik-sidebar').hasAttribute('inert')`), 'mobile sidebar open state');
  const mobileMenu = await cdp.evaluate(`(() => { const e=document.querySelector('button[aria-label="Close navigation"]'); const sidebar=document.querySelector('#shramik-sidebar'); return e && sidebar ? {label:e.getAttribute('aria-label'),expanded:e.getAttribute('aria-expanded'),sidebar:true,inert:sidebar.hasAttribute('inert')} : null; })()`);
  record('Mobile navigation opens the controlled sidebar without inert state', Boolean(mobileClick) && Boolean(mobileMenu) && mobileMenu.expanded === 'true' && mobileMenu.sidebar && mobileMenu.inert === false, JSON.stringify(mobileMenu));
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
