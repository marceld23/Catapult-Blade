// Headless smoke test: serves the project, loads index.html in headless Chrome
// via the DevTools protocol, captures console output / exceptions, verifies the
// menu rendered and that switching language updates the UI.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PORT = 8123;
const CDP = 9333;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const data = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cdp(ws, method, params = {}, id) {
  ws.send(JSON.stringify({ id, method, params }));
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const userDir = await mkdtemp(join(tmpdir(), 'cb-smoke-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader',
    '--no-first-run', '--no-default-browser-check', `--user-data-dir=${userDir}`,
    `--remote-debugging-port=${CDP}`, `http://localhost:${PORT}/index.html`
  ], { stdio: 'ignore' });

  const logs = [];
  let cleanup = async () => {
    try { chrome.kill(); } catch {}
    server.close();
    try { await rm(userDir, { recursive: true, force: true }); } catch {}
  };

  try {
    // Wait for the page target.
    let target;
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      try {
        const list = await (await fetch(`http://localhost:${CDP}/json`)).json();
        target = list.find(t => t.type === 'page' && t.url.includes('index.html'));
        if (target?.webSocketDebuggerUrl) break;
      } catch {}
    }
    if (!target) throw new Error('Chrome target not found');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let nextId = 1;
    const pending = new Map();
    const call = (method, params) => new Promise(res => {
      const id = nextId++; pending.set(id, res); cdp(ws, method, params, id);
    });

    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); return; }
      if (msg.method === 'Runtime.consoleAPICalled') {
        logs.push(`[console.${msg.params.type}] ` + msg.params.args.map(a => a.value ?? a.description ?? JSON.stringify(a.preview?.properties || '')).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const e = msg.params.exceptionDetails;
        logs.push('[EXCEPTION] ' + (e.exception?.description || e.text));
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        logs.push('[log.error] ' + msg.params.entry.text);
      }
    };

    await call('Runtime.enable');
    await call('Log.enable');
    await call('Page.enable');
    await call('Runtime.runIfWaitingForDebugger');
    // Reload to capture everything from the start.
    await call('Page.reload', { ignoreCache: true });

    // Give modules + CDN + init() time to run.
    await sleep(7000);

    const evalJs = async expr => {
      const r = await call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) return { error: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
      return { value: r.result.value };
    };

    const menuTitleDe = await evalJs("document.querySelector('#menu h1')?.textContent");
    const lang0 = await evalJs("document.documentElement.lang");
    const startBtn0 = await evalJs("document.getElementById('startButton')?.textContent");
    // Switch to English.
    await evalJs("document.querySelector('[data-lang=\\\"en\\\"]')?.click()");
    await sleep(400);
    const startBtn1 = await evalJs("document.getElementById('startButton')?.textContent");
    const intro1 = await evalJs("document.querySelector('[data-i18n=\\\"menu.intro\\\"]')?.textContent?.slice(0,40)");
    const lang1 = await evalJs("document.documentElement.lang");
    const hasRenderer = await evalJs("!!document.querySelector('canvas')");

    console.log('\n===== SMOKE TEST RESULTS =====');
    console.log('initial <html lang>:', JSON.stringify(lang0.value));
    console.log('menu h1:', JSON.stringify(menuTitleDe.value));
    console.log('start button (initial):', JSON.stringify(startBtn0.value));
    console.log('canvas (WebGL renderer) present:', hasRenderer.value);
    console.log('--- after clicking EN ---');
    console.log('<html lang>:', JSON.stringify(lang1.value));
    console.log('start button:', JSON.stringify(startBtn1.value));
    console.log('intro (first 40 chars):', JSON.stringify(intro1.value));

    const errors = logs.filter(l => l.includes('[EXCEPTION]') || l.includes('log.error') || l.includes('console.error'));
    console.log('\n--- console / errors captured (' + logs.length + ' lines) ---');
    for (const l of logs) console.log('  ' + l);
    console.log('\nERROR LINES:', errors.length);
    process.exitCode = errors.length ? 2 : 0;
  } catch (e) {
    console.error('Smoke test harness error:', e.message);
    process.exitCode = 3;
  } finally {
    await cleanup();
  }
})();
