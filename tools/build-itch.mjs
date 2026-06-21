// Build an itch.io-ready zip of the game.
//
// itch.io serves HTML5 games as static files over HTTPS (no Node, no server of
// your own). It expects a zip whose ROOT contains index.html. This script stages
// only the files the game needs and zips them so index.html sits at the zip root.
//
//   node tools/build-itch.mjs      ->  dist/catapult-blade-v<version>-itch.zip
//
// Cross-platform: uses the `zip` CLI when present, otherwise PowerShell
// Compress-Archive on Windows.
import { rmSync, mkdirSync, cpSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const STAGE = join(DIST, 'itch');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const ZIP = join(DIST, `catapult-blade-v${VERSION}-itch.zip`);

// Files / folders the running game actually needs.
const INCLUDE = ['index.html', 'src'];

console.log('Cleaning dist/ ...');
rmSync(DIST, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });

for (const item of INCLUDE) {
  const from = join(ROOT, item);
  if (!existsSync(from)) { console.error('Missing:', item); process.exit(1); }
  cpSync(from, join(STAGE, item), { recursive: true });
  console.log('  staged', item);
}

console.log('Zipping ...');
try {
  // Prefer the zip CLI (Linux/macOS/Git-Bash). Run from STAGE so paths are at root.
  execFileSync('zip', ['-r', '-q', ZIP, '.'], { cwd: STAGE, stdio: 'inherit' });
} catch {
  // Fallback: PowerShell on Windows. Compress-Archive of STAGE/* puts files at root.
  console.log('  zip CLI not available, using PowerShell Compress-Archive ...');
  execFileSync('powershell', ['-NoProfile', '-Command',
    `Compress-Archive -Path '${join(STAGE, '*')}' -DestinationPath '${ZIP}' -Force`
  ], { stdio: 'inherit' });
}

console.log('\nDone -> ' + ZIP);
console.log('Upload this zip on itch.io as an HTML game (Kind of project: HTML).');
console.log('Tick "This file will be played in the browser".');
