import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const sourceUrl = 'https://www.mospi.gov.in/themes/product/69--';
const host = '127.0.0.1';
const outputDir = path.resolve(process.argv[2] || '../artifacts/source-refresh');
const requiredLabels = [
  'Labour Force Participation Rate (LFPR)',
  'Worker Population Ratio (WPR)',
  'Unemployment Rate (UR)',
];
let chrome;
let cdp;
let profile;
let stderr = '';

function chromeBinary() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for (const binary of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      return execFileSync('which', [binary], { encoding: 'utf8' }).trim();
    } catch { /* try next binary */ }
  }
  const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (existsSync(cache)) {
    const candidate = execFileSync('find', [cache, '-type', 'f', '-name', 'chrome'], { encoding: 'utf8' })
      .split('\n').find((item) => /chrome-linux/.test(item));
    if (candidate) return candidate;
  }
  throw new Error('Chromium/Chrome executable not found. Set CHROME_BIN in the workflow.');
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not allocate a Chromium DevTools port.'));
        return;
      }
      const port = address.port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

class CDP {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (!message.id) return;
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
      const timer = setTimeout(() => reject(new Error('Timed out opening DevTools WebSocket')), 10000);
      socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Could not connect to DevTools WebSocket')); }, { once: true });
    });
    return new CDP(socket);
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`DevTools command timed out: ${method}`));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Browser evaluation failed');
    }
    return response.result?.value;
  }

  close() { try { this.socket.close(); } catch { /* cleanup */ } }
}

async function waitFor(check, label, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) { lastError = error; }
    await delay(400);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  profile = await mkdtemp(path.join(os.tmpdir(), 'shramik-plfs-chromium-'));
  const debugPort = await findFreePort();
  chrome = spawn(chromeBinary(), [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--remote-allow-origins=*',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.stderr?.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-4000); });

  const devtools = `http://${host}:${debugPort}`;
  await waitFor(async () => {
    if (chrome.exitCode !== null) throw new Error(`Chromium exited ${chrome.exitCode}: ${stderr.slice(-1200)}`);
    try { return (await fetch(devtools + '/json/version')).ok; } catch { return false; }
  }, 'Chromium DevTools endpoint', 25000);

  const targetResponse = await fetch(devtools + '/json/new?' + sourceUrl, { method: 'PUT' });
  if (!targetResponse.ok) throw new Error(`Could not create source page target: HTTP ${targetResponse.status}`);
  const target = await targetResponse.json();
  cdp = await CDP.connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Page.navigate', { url: sourceUrl });

  const page = await waitFor(async () => {
    const state = await cdp.evaluate(`(() => {
      const text = document.body?.innerText || '';
      return {
        title: document.title || '',
        text,
        html: document.documentElement?.outerHTML || '',
        readyState: document.readyState,
        url: location.href
      };
    })()`);
    const hasLabels = requiredLabels.every(label => state.text.includes(label));
    const hasMonth = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+20\\d{2}/i.test(state.text);
    const hasMonthlyValues = /\\d{1,3}(?:\\.\\d+)?\\s*%/.test(state.text) && hasMonth;
    if (state.readyState === 'complete' && state.text.length > 1200 && hasLabels && hasMonthlyValues) {
      return state;
    }
    return false;
  }, 'rendered LFPR/WPR/UR cards on official MoSPI page');

  const htmlPath = path.join(outputDir, 'plfs-page-rendered.html');
  const textPath = path.join(outputDir, 'plfs-page-visible-text.txt');
  const metadataPath = path.join(outputDir, 'plfs-browser-capture.json');
  await writeFile(htmlPath, page.html, 'utf8');
  await writeFile(textPath, page.text, 'utf8');
  await writeFile(metadataPath, JSON.stringify({
    sourceUrl,
    pageUrl: page.url,
    title: page.title,
    renderedAtUtc: new Date().toISOString(),
    readyState: page.readyState,
    htmlBytes: Buffer.byteLength(page.html, 'utf8'),
    visibleTextCharacters: page.text.length,
    captureMethod: 'Chromium-rendered DOM; raw HTTP response is JavaScript shell',
  }, null, 2) + '\n', 'utf8');

  console.log(JSON.stringify({
    status: 'CAPTURED',
    sourceUrl,
    title: page.title,
    htmlBytes: Buffer.byteLength(page.html, 'utf8'),
    visibleTextCharacters: page.text.length,
    output: htmlPath,
  }, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(`MoSPI browser capture failed closed: ${error?.name || 'Error'}: ${error?.message || error}`);
  if (stderr) console.error(stderr.slice(-2000));
  process.exitCode = 1;
} finally {
  cdp?.close();
  if (chrome && chrome.exitCode === null) chrome.kill('SIGTERM');
  if (profile) await rm(profile, { recursive: true, force: true });
}
