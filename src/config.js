// Tunable gameplay constants, color palettes and fixed spawn positions.
// Centralised so balancing values are easy to find and adjust.
import * as THREE from './three.js';

// Combat / equipment
export const maxArrows = 6;
export const healPotionCooldownDuration = 60;
export const healPotionAmount = 100;
export const playerShieldRechargeDuration = 15;
export const npcShieldRechargeMin = 10;
export const npcShieldRechargeMax = 20;

// Camp / arena bounds
export const campBounds = { xMin: -38, xMax: 38, zMin: -48, zMax: -8 };

// Heraldry
export const heraldrySymbols = ['cross', 'diamond', 'star', 'moon', 'shield'];
export const enemyColorPalette = [
  '#c9302c', '#7b2cff', '#d28a17', '#158d4f', '#8b1e63',
  '#b64a16', '#2b6f8f', '#6b7d1f', '#b8244a', '#3b3bb8'
];

// Enemy camp spawn positions
export const campSpawnPoints = [
  new THREE.Vector3(0, 0, -42),
  new THREE.Vector3(-7, 0, -42),
  new THREE.Vector3(7, 0, -42),
  new THREE.Vector3(-14, 0, -38),
  new THREE.Vector3(14, 0, -38),
  new THREE.Vector3(-22, 0, -31),
  new THREE.Vector3(22, 0, -31),
  new THREE.Vector3(-10, 0, -24),
  new THREE.Vector3(10, 0, -24),
  new THREE.Vector3(0, 0, -16)
];

// --- Combat feel / tuning -------------------------------------------------
// Central place for the values that decide how "punchy" the fight feels.
// You can experiment live without editing files via a URL query, e.g.:
//   ?tuning=swordCooldown:0.6,enemySpeedMult:1.3,enemyKnockback:1.0
// (only the numeric top-level keys below can be overridden this way).
export const combat = {
  // Player melee
  swordCooldown: 0.75,          // seconds between sword swings on foot
  swordCooldownMounted: 0.9,    // ... while mounted
  swordSwingTime: 0.28,         // visual swing duration

  // Enemy blocking
  blockChipFactor: 0.25,        // fraction of damage a blocked hit still deals
  blockChanceShield: 0.55,
  blockChanceHeavy: 0.35,
  blockChanceCaptain: 0.48,
  blockChanceKing: 0.60,
  blockChanceDefault: 0.18,

  // Hit feedback (juice)
  hitstop: 0.06,                // seconds of brief time-freeze on a landed hit
  hitstopScale: 0.12,           // how much time slows during hitstop
  enemyKnockback: 0.6,          // units an enemy is pushed back on hit
  enemyFlinch: 0.18,            // min attack-cooldown bump on hit (stagger)
  hitPop: 0.12,                 // scale-pop duration on a hit enemy

  // Enemy tuning (compensate for the faster, punchier player)
  enemySpeedMult: 1.15,
  enemyHealthMult: 1.15,
  enemyAttackCooldownBase: 1.45,
  enemyAttackCooldownRand: 0.5,

  // Spawning: closer + so the fight starts sooner
  spawnMinZ: 28,
  spawnMaxZ: 46,

  // Targeting: < 1 makes enemies favour the player over allies
  playerAggroBias: 0.7,
};

// Optional live overrides via ?tuning=key:value,key:value
try {
  const raw = new URLSearchParams(location.search).get('tuning');
  if (raw) {
    for (const pair of raw.split(',')) {
      const [k, v] = pair.split(':');
      const num = Number(v);
      if (k && k in combat && typeof combat[k] === 'number' && !Number.isNaN(num)) {
        combat[k] = num;
      }
    }
  }
} catch (e) { /* no URL context (e.g. tests) */ }
