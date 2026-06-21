# AGENTS.md

Guidance for AI coding agents (and humans) working on **Catapult & Blade**.

## What this project is

A single-page 3D browser game built with **Three.js** (loaded from a CDN as an ES
module). It started as one large prototype HTML file created by Justus Dütscher (age
10) and was refactored into a structured, multilingual project. The gameplay must be
preserved — refactors should not change how the game plays.

## Tech stack & constraints

- **Vanilla JavaScript ES modules** — no framework, no bundler, no TypeScript.
- **Three.js r160** is bundled locally in `src/vendor/three.module.js` and re-exported
  from `src/three.js`. No CDN — the game runs offline and inside sandboxed embeds.
  To upgrade, replace the vendored file and keep `src/three.js` unchanged.
- **No build step for the game.** It is served as static files; anything you add must
  work by just serving the folder over HTTP. (`tools/build-itch.mjs` only zips those
  static files for upload — it is not a compile step.)
- **Version** lives in `src/version.js` (`VERSION`) and `package.json`; keep them in
  sync. It is shown in the menu via the i18n bootstrap.
- A `?lang=de|en` URL parameter forces the language (used for deep links/screenshots).
- **Combat feel** is tuned centrally via the `combat` object in `src/config.js`;
  override numeric keys live with `?tuning=swordCooldown:0.6,enemySpeedMult:1.3`.
  Prefer adjusting these values over scattering magic numbers in `main.js`.
- Browser target: modern evergreen browsers with WebGL and Web Audio.

## How to run / test

```bash
npm start            # serves the folder over HTTP (open the printed URL)
# or: python -m http.server 8000
```

There is no automated test suite. Verify changes manually:

1. The **menu** appears after the splash screen.
2. Switching **language** (DE/EN buttons) updates all visible text.
3. Starting a game (each mode) works and the HUD updates.

A WebGL-capable browser is required; headless environments may not render the 3D scene.

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html` | HTML shell: splash, menu, HUD, overlays, touch controls |
| `src/css/styles.css` | All CSS |
| `src/i18n/` | `index.js` (loader + `t()`), `de.js`, `en.js` |
| `src/data/textures.js` | Embedded base64 PNG textures |
| `src/three.js` | Single pinned re-export of Three.js (the CDN URL lives here) |
| `src/config.js` | Tunable constants, color palettes, spawn points |
| `src/splash.js` | Intro splash screen logic |
| `src/game/main.js` | The game engine (simulation, rendering, audio, HUD). **This is a source file — edit it directly.** |
| `prototype/` | The original single-file prototype, kept as an archive |
| `tools/` | One-off migration script + verification tests (see below) |

### `tools/`

- `i18n-transform.mjs` — the one-time migration that turned the prototype body
  (`tools/migration/prototype-body.txt`) into `src/game/main.js`: it extracted
  constants to `config.js` / `data/textures.js` and routed every German string
  through `t()`. It is **not** part of an ongoing build — `main.js` is now the
  source. The script is kept only so the derivation is reproducible/auditable.
- `serve.mjs` — `npm start`, a dependency-free static server on port 8000.
- `build-itch.mjs` — `npm run build`, stages `index.html` + `src/` and zips them so
  `index.html` is at the zip root (`dist/catapult-blade-v<version>-itch.zip`) for itch.io.
- `screenshots.mjs` — `npm run shots`, uses Playwright's bundled Chromium (has WebGL,
  not bound by managed system-Chrome policies) to capture menu + in-game shots in
  DE/EN into `screenshots/`.
- `i18n-runtime-test.mjs` — `npm test`, checks the i18n runtime (detection,
  interpolation, fallback, `applyTranslations`, `setLocale`).
- `smoke-test.mjs` — optional system-Chrome load test via the DevTools protocol
  (needs remote debugging; blocked in some managed environments — prefer Playwright).

### Engine boundaries / next steps

`src/game/main.js` is one cohesive module because the real-time simulation shares a
lot of mutable state. The cleanly separable concerns were already pulled out
(i18n, textures, config, Three.js pin, styles, splash). A good **next** extraction
is the procedural audio block (`ensureAudioStarted` … `stopBackgroundMusic`): it is
almost self-contained, the only game dependency is `gameMode` (music varies per
mode), so thread that in as a parameter to `startBackgroundMusic`. Do this only with
a real browser available to verify, since the game can't be fully run headless.

## Conventions

- **No hardcoded user-facing strings.** Every visible string goes through the i18n
  layer. In HTML use `data-i18n="key"` (and `data-i18n-html` where markup is needed);
  in JS use `t('key', { vars })`. Add the key to **both** `de.js` and `en.js`.
- Keep translation keys grouped by area (`menu.*`, `hud.*`, `msg.*`, `upgrade.*`, ...).
- Keep gameplay tuning values in `config.js`, not scattered as magic numbers.
- Match the existing code style (4-space indent inside modules, descriptive names).
- Don't introduce dependencies or a build tool without a strong reason — the
  "just serve static files" property is intentional.

## When adding a language

1. Copy `src/i18n/en.js` to e.g. `fr.js` and translate every value.
2. Register it in `src/i18n/index.js` (`LOCALES` map + the language buttons).
3. Make sure every key exists in the new file (missing keys fall back to the key name).

## Things to be careful about

- The game uses a lot of shared runtime state. When splitting or moving code between
  modules, route reassigned globals through the shared state module rather than
  duplicating them.
- Procedural audio and the render loop are performance-sensitive; avoid per-frame
  allocations in hot paths (`updateEnemies`, `updateProjectiles`, the main `loop`).
