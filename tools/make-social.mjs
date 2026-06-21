// Generates a GitHub social-preview image (1280x640, 2:1) from the in-game EN
// screenshot. GitHub has no API for this — upload the result manually under
// Settings -> General -> Social preview.
//
//   node tools/make-social.mjs   ->  screenshots/social-preview.png
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'screenshots', 'game-en.png');
const OUT = join(ROOT, 'screenshots', 'social-preview.png');
const W = 1280, H = 640;

const b64 = readFileSync(SRC).toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .card{width:${W}px;height:${H}px;position:relative;overflow:hidden;
    font-family:Arial,Helvetica,sans-serif;background:#11160f;}
  .shot{position:absolute;inset:0;width:100%;height:100%;
    object-fit:cover;object-position:center 44%;}
  .scrim{position:absolute;inset:0;background:
    linear-gradient(180deg, rgba(10,8,20,.15) 0%, rgba(10,8,20,0) 32%, rgba(7,5,14,.82) 100%);}
  .title{position:absolute;left:64px;bottom:124px;color:#fff6ff;
    font-weight:900;font-size:92px;line-height:.95;letter-spacing:.01em;
    text-shadow:0 4px 20px rgba(0,0,0,.75), 0 0 30px rgba(150,90,255,.45);}
  .tag{position:absolute;left:68px;bottom:70px;color:#e9ddff;
    font-size:31px;font-weight:700;text-shadow:0 2px 12px rgba(0,0,0,.85);}
  .pill{position:absolute;top:34px;display:flex;align-items:center;gap:8px;
    font-weight:800;letter-spacing:.04em;border-radius:999px;
    padding:8px 16px;font-size:20px;backdrop-filter:blur(2px);}
  .play{right:34px;color:#fff;background:rgba(47,115,255,.32);
    border:1px solid rgba(158,193,255,.6);}
  .ver{right:208px;color:#dfe6ff;background:rgba(20,30,45,.5);
    border:1px solid rgba(160,190,255,.5);}
</style></head><body>
  <div class="card">
    <img class="shot" src="data:image/png;base64,${b64}">
    <div class="scrim"></div>
    <div class="pill ver">v0.58</div>
    <div class="pill play">▶ itch.io</div>
    <div class="title">CATAPULT &amp; BLADE</div>
    <div class="tag">A 3D knight battlefield &nbsp;·&nbsp; made by Justus (10)</div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(html, { waitUntil: 'load' });
await page.locator('.card').screenshot({ path: OUT });
await browser.close();
console.log('social preview written ->', OUT, `(${W}x${H})`);
