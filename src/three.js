// Single place that provides Three.js to every module:
//   import * as THREE from '<relative>/three.js';
//
// Three.js is vendored locally in ./vendor/three.module.js (three r160) so the
// game runs with no external CDN dependency - works offline and inside sandboxed
// embeds like itch.io. To update Three.js, replace that file and keep this export.
export * from './vendor/three.module.js';
