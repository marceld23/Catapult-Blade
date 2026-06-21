# Changelog

All notable changes to **Catapult & Blade** are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- The "wave complete" screen could be skipped accidentally while spamming attacks
  (Space / left click double as confirm). The confirm now has a 650 ms guard, the
  "Continue" button is visibly disabled until then, key auto-repeat is ignored, and
  the following upgrade pick has its own short guard — so stray attack inputs at the
  end of a wave no longer skip the screen or auto-select an upgrade.

### Changed — combat feel
The fight felt sluggish; this round makes strikes faster and punchier. All values
live in `src/config.js` (`combat`) and can be tried live via `?tuning=key:value,…`.
- **Faster melee:** sword cooldown 1.35s → 0.75s on foot (1.55 → 0.9 mounted).
- **Fairer blocking:** enemies no longer double-roll a block; base block chances
  lowered ~15 %, and a blocked hit now deals 25 % chip damage (never fully wasted).
- **Hit juice:** landed hits apply knockback, a scale "pop", a brief stagger and a
  short hitstop; bigger hit sparks.
- **Enemy health bars:** a billboarded bar appears above damaged enemies.
- **Faster onset:** enemies spawn closer (z 28–46 instead of 42–70) and move ~15 %
  faster, so waves engage sooner; enemies favour the player over allies.
- **Balance:** enemy health +15 % and a slightly quicker enemy attack cadence to
  offset the stronger player.

## [0.58.0] - 2026-06-21

First versioned release. The game itself is the prototype by Justus Dütscher
(internally "Version 56"); this release turns it into a clean, structured,
multilingual project without changing how it plays.

### Added
- **Multilingual UI (German 🇩🇪 / English 🇬🇧)** with automatic browser-language
  detection, an in-menu DE/EN switch, and a `?lang=de|en` deep link.
- **Project structure & docs**: `README.md`, `AGENTS.md`, `LICENSE` (MIT),
  `CHANGELOG.md`, `.gitignore`, `package.json`.
- **Version display** in the menu (single source: `src/version.js`).
- **itch.io build** (`npm run build`) producing a ready-to-upload zip.
- **Screenshot tool** (`npm run shots`) generating menu + in-game shots in DE/EN.
- **Local dev server** (`npm start`) and an i18n runtime test (`npm test`).

### Changed
- Split the single ~6100-line prototype into ES modules: `index.html`,
  `src/css/styles.css`, `src/i18n/`, `src/data/textures.js`, `src/config.js`,
  `src/three.js`, `src/splash.js`, `src/game/main.js`.
- **Three.js is now bundled locally** (`src/vendor/three.module.js`) instead of
  loaded from a CDN — the game runs offline and inside sandboxed embeds (itch.io).
- All user-facing strings moved out of the code into the i18n layer.

### Fixed
- Splash screen could trap the player when opened via `file://`; it is now a
  classic script that always runs and stays dismissable.
