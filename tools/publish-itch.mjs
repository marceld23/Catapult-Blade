// Publish the game to itch.io with butler. Works even when the itch.io project is
// still a draft / unpublished — the project page just has to exist once.
//
//   1) Create the game page once on itch.io (may stay a draft).
//   2) Get an API key:  https://itch.io/user/settings/api-keys
//   3) Set it as an env var (do NOT hardcode it):
//        PowerShell:  $env:BUTLER_API_KEY = "xxxxx"
//        bash:        export BUTLER_API_KEY=xxxxx
//   4) Tell the script the target (user/game) once, then run it:
//        ITCH_TARGET=yourname/catapult-blade   (env)   or
//        node tools/publish-itch.mjs yourname/catapult-blade
//
//   npm run publish -- yourname/catapult-blade
//
// butler reads BUTLER_API_KEY itself; this script never prints or stores the key.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHANNEL = process.env.ITCH_CHANNEL || 'html5';   // browser-playable channel
const STAGE = join(ROOT, 'dist', 'itch');

const target = process.argv[2] || process.env.ITCH_TARGET;
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;

function fail(msg) { console.error('\n[publish] ' + msg + '\n'); process.exit(1); }

if (!target || !/^[^/]+\/[^/:]+$/.test(target)) {
  fail("Missing/invalid itch target. Use  user/game , e.g.\n" +
       "  npm run publish -- yourname/catapult-blade\n" +
       "or set ITCH_TARGET. (Channel '" + CHANNEL + "' is appended automatically.)");
}
if (!process.env.BUTLER_API_KEY) {
  fail("BUTLER_API_KEY is not set. Get one at https://itch.io/user/settings/api-keys\n" +
       "and set it as an environment variable (never paste it into code or chat).");
}

// Make sure butler is available.
try { execFileSync('butler', ['version'], { stdio: 'ignore' }); }
catch {
  fail("butler not found on PATH. Install it from https://itchio.itch.io/butler\n" +
       "(download, unzip, add butler.exe to PATH), then re-run.");
}

// 1) Build the static bundle into dist/itch (index.html at its root).
console.log('[publish] building itch bundle ...');
execFileSync(process.execPath, [join(ROOT, 'tools', 'build-itch.mjs')], { stdio: 'inherit' });

// 2) Push the folder to the draft/published project (butler accepts both).
const dest = `${target}:${CHANNEL}`;
console.log(`[publish] pushing ${STAGE} -> ${dest} (v${version})`);
execFileSync('butler', ['push', STAGE, dest, '--userversion', version], { stdio: 'inherit' });

console.log('\n[publish] Done. The build is live on the channel even if the page is still a draft.');
console.log('[publish] In the itch dashboard set this build to "play in browser" and a viewport size.');
