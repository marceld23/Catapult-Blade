// Generates screenshots of the start menu and of in-game play, in German and
// English, using Playwright's bundled Chromium (which has WebGL and is not subject
// to the system Chrome's managed policies).
//
//   npm run shots        ->  screenshots/{menu,game}-{de,en}.png
//
// It serves the project over HTTP (ES modules need that), drives the UI like a
// player (dismiss splash, switch language, start a game) and captures each state.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'screenshots');
const PORT = 8137;
const VIEWPORT = { width: 1280, height: 720 };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.txt': 'text/plain' };

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  try {
    const data = await readFile(join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, '')));
    res.writeHead(200, { 'Content-Type': MIME[extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
});

const wait = ms => new Promise(r => setTimeout(r, ms));

async function capture(browser, lang) {
  const context = await browser.newContext({ viewport: VIEWPORT, locale: lang === 'de' ? 'de-DE' : 'en-US' });
  const page = await context.newPage();
  const url = `http://localhost:${PORT}/?lang=${lang}`;
  console.log(`[${lang}] open ${url}`);
  await page.goto(url, { waitUntil: 'load' });

  // The splash needs a minimum visible time before it can be dismissed.
  await wait(5400);
  try { await page.locator('#splashScreen').click({ timeout: 1500 }); } catch {}
  try { await page.keyboard.press('Enter'); } catch {}
  await page.waitForSelector('#splashScreen', { state: 'detached', timeout: 4000 }).catch(() => {});

  // Make sure the requested language is active, then let texts settle.
  try { await page.locator(`[data-lang="${lang}"]`).click({ timeout: 1500 }); } catch {}
  await page.waitForSelector('#menu', { state: 'visible', timeout: 4000 }).catch(() => {});
  await wait(400);

  await mkdir(OUT, { recursive: true });
  const menuPath = join(OUT, `menu-${lang}.png`);
  await page.screenshot({ path: menuPath });
  console.log(`[${lang}] saved ${menuPath}`);

  // Start a game (Classic Easy is selected by default).
  await page.locator('#startButton').click({ timeout: 3000 }).catch(() => {});
  // Dismiss the "Here we go!" flow overlay (it guards against an instant re-click).
  await page.waitForSelector('#flowOverlay.visible', { timeout: 4000 }).catch(() => {});
  await wait(500);
  await page.locator('#flowButton').click({ timeout: 3000 }).catch(() => {});
  // Let the wave begin and a few frames of the 3D scene render.
  await wait(3200);

  const gamePath = join(OUT, `game-${lang}.png`);
  await page.screenshot({ path: gamePath });
  console.log(`[${lang}] saved ${gamePath}`);

  await context.close();
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  try {
    for (const lang of ['de', 'en']) await capture(browser, lang);
    console.log('\nAll screenshots written to: screenshots/');
  } catch (e) {
    console.error('Screenshot run failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
