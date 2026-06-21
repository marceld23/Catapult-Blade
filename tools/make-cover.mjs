// Generates an itch.io cover image (630x500) from the in-game EN screenshot.
// The 16:9 shot is fit by width and the top/bottom letterbox is filled with a
// colour that matches the game's sky/ground, so it sits nicely in 630x500.
//
//   node tools/make-cover.mjs   ->  screenshots/cover.png
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'screenshots', 'game-en.png');
const OUT = join(ROOT, 'screenshots', 'cover.png');
const W = 630, H = 500;

const b64 = readFileSync(SRC).toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .cover{
    width:${W}px;height:${H}px;position:relative;overflow:hidden;
    background:linear-gradient(180deg,#6f8899 0%,#56707f 38%,#2f3d33 100%);
    display:flex;align-items:center;justify-content:center;
    font-family:Arial,Helvetica,sans-serif;
  }
  .shot{width:${W}px;height:auto;display:block;
    box-shadow:0 10px 30px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.08);}
  /* soft vignette so the bars frame the shot */
  .cover::after{content:"";position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,.28) 100%);}
  .title{position:absolute;left:0;right:0;bottom:14px;text-align:center;z-index:2;
    color:#fff6ff;font-weight:900;letter-spacing:.06em;font-size:30px;
    text-shadow:0 2px 6px rgba(0,0,0,.8), 0 0 18px rgba(150,90,255,.5);}
  .ver{position:absolute;top:12px;right:14px;z-index:2;color:#dfe6ff;
    font-weight:800;font-size:14px;letter-spacing:.08em;
    background:rgba(20,30,45,.45);border:1px solid rgba(160,190,255,.45);
    padding:2px 9px;border-radius:999px;}
</style></head><body>
  <div class="cover">
    <img class="shot" src="data:image/png;base64,${b64}">
    <div class="ver">v0.58</div>
    <div class="title">CATAPULT &amp; BLADE</div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(html, { waitUntil: 'load' });
await page.locator('.cover').screenshot({ path: OUT });
await browser.close();
console.log('cover written ->', OUT, `(${W}x${H})`);
