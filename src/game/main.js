// Catapult & Blade - game engine.
// Built from the original prototype by tools/i18n-transform.mjs:
// constants extracted to config.js / data/textures.js, every user-facing string
// routed through the i18n layer (t). Do not edit generated artefacts by hand
// without updating the source prototype or this build step.
import * as THREE from '../three.js';
import { textureSources } from '../data/textures.js';
import {
  maxArrows, healPotionCooldownDuration, healPotionAmount,
  playerShieldRechargeDuration, npcShieldRechargeMin, npcShieldRechargeMax,
  campBounds, heraldrySymbols, enemyColorPalette, campSpawnPoints, combat
} from '../config.js';
import { t, applyTranslations, setLocale, getLocale, availableLocales, onLocaleChange } from '../i18n/index.js';
import { VERSION } from '../version.js';

    let scene, camera, renderer, clock;
    let running = false;
    let paused = false;
    let gameOver = false;

    const keys = {};
    const enemies = [];
    const allies = [];
    const stones = [];
    const effects = [];
    const projectiles = [];
    const staticObstacles = [];
    const enemyDecorations = [];

    let audioCtx = null;
    let masterGain = null;
    let musicGain = null;
    let sfxGain = null;
    let musicTimer = null;
    let musicStep = 0;
    let lastSfxTime = 0;

    let controlMode = 'auto';
    let activeControlMode = 'pc';
    const touchMove = { active: false, id: null, x: 0, y: 0, strength: 0 };
    const touchLook = { active: false, id: null, x: 0, y: 0 };
    const touchButtons = {
      attack: false,
      block: false,
      sprint: false
    };
    let keyboardEnabled = true;
    let touchEnabled = false;    const caravanPickups = [];
    const caravanAmbushes = [];
    let caravanGroup = null;
    let caravanFinished = false;
    let caravanCollected = 0;
    let caravanTotal = 0;
    const caravanGoal = new THREE.Vector3(0, 0, 50);
    const caravanTrail = [];
    let lastTrailRecord = new THREE.Vector3(9999, 0, 9999);    const siegeTeams = [];

    let horse;
    let catapult;
    let catapultLoaded = false;
    let catapultStoneMesh = null;
    let catapultCooldown = 0;
    let catapultAnim = 0;

    let unlockedHorse = false;
    let unlockedBow = false;
    let unlockedCatapult = false;
    let unlockedSiegeTeams = false;

    let arrows = maxArrows;
    let arrowReloadTimer = 0;
    let bowCooldown = 0;

    let healPotionReady = false;
    let healPotionCooldown = healPotionCooldownDuration;


    let score = 0;
    let wave = 1;
    let enemiesToSpawn = 0;
    let spawnTimer = 0;
    let nextWaveTimer = 0;
    let highscore = (() => { try { return Number(localStorage.getItem('katapultKlingeHighscore_v32') || 0); } catch (e) { return 0; } })();
    let gameMode = 'easy';
    let currentRoundRetry = false;
    let upgradeChoosing = false;
    let flowOverlayActive = false;
    let flowOverlayCallback = null;
    let flowOverlayShownAt = 0;
    let upgradePanelShownAt = 0;
    // Minimum time an overlay must be visible before it accepts a confirm. Long
    // enough to swallow a burst of attack clicks/taps so the wave-complete screen
    // (and the upgrade pick right after it) can't be skipped "in the heat of clicking".
    const FLOW_GUARD_MS = 650;
    const UPGRADE_GUARD_MS = 450;
    let pendingUpgradeChoices = [];
    const upgradeLog = [];
    let waveStats = null;
    const upgradeStats = createDefaultUpgradeStats();
    let campBoundaryGroup = null;
    let heraldryColor = '#2f73ff';
    let heraldrySymbol = 'cross';
    let enemyHeraldryColor = '#c9302c';
    let enemyHeraldrySymbol = 'cross';



    let messageTimer = 0;
    let damageTimer = 0;

    let mouseLeft = false;
    let mouseRight = false;
    let viewYaw = 0;

    const player = {
      group: null,
      pos: new THREE.Vector3(0, 0, -18),
      yaw: 0,
      health: 100,
      maxHealth: 100,
      guard: 100,
      maxGuard: 100,
      shieldRechargeTimer: 0,
      shieldBroken: false,
      stamina: 100,
      maxStamina: 100,
      mounted: false,
      carryingStone: false,
      attackCooldown: 0,
      attackTimer: 0,
      invul: 0,
      weapon: 'sword',
      isMoving: false,
      movePhase: 0
    };

    const hud = {
      menu: document.getElementById('menu'),
      startButton: document.getElementById('startButton'),
      modeEasy: document.getElementById('modeEasy'),
      modeHardcore: document.getElementById('modeHardcore'),
      modeCaravan: document.getElementById('modeCaravan'),
      modeInfo: document.getElementById('modeInfo'),
      controlAuto: document.getElementById('controlAuto'),
      controlPC: document.getElementById('controlPC'),
      controlTablet: document.getElementById('controlTablet'),
      controlInfo: document.getElementById('controlInfo'),
      detectedControlBadge: document.getElementById('detectedControlBadge'),
      pcControlsHelp: document.getElementById('pcControlsHelp'),
      tabletControlsHelp: document.getElementById('tabletControlsHelp'),
      touchControls: document.getElementById('touchControls'),
      movePad: document.getElementById('movePad'),
      moveStick: document.getElementById('moveStick'),
      lookArea: document.getElementById('lookArea'),
      touchActionBtn: document.getElementById('touchActionBtn'),
      touchSpecialBtn: document.getElementById('touchSpecialBtn'),
      touchWeaponBtn: document.getElementById('touchWeaponBtn'),
      crestColor: document.getElementById('crestColor'),
      crestSymbol: document.getElementById('crestSymbol'),
      crestPreview: document.getElementById('crestPreview'),
      healthFill: document.getElementById('healthFill'),
      guardFill: document.getElementById('guardFill'),
      staminaFill: document.getElementById('staminaFill'),
      scoreText: document.getElementById('scoreText'),
      waveText: document.getElementById('waveText'),
      enemyText: document.getElementById('enemyText'),
      highText: document.getElementById('highText'),
      statusText: document.getElementById('statusText'),
      stoneText: document.getElementById('stoneText'),
      catapultText: document.getElementById('catapultText'),
      bowText: document.getElementById('bowText'),
      potionText: document.getElementById('potionText'),
      rewardText: document.getElementById('rewardText'),
      objectiveText: document.getElementById('objectiveText'),
      hint: document.getElementById('hint'),
      message: document.getElementById('message'),
      damageFlash: document.getElementById('damageFlash'),
      flowOverlay: document.getElementById('flowOverlay'),
      flowEyebrow: document.getElementById('flowEyebrow'),
      flowTitle: document.getElementById('flowTitle'),
      flowText: document.getElementById('flowText'),
      flowButton: document.getElementById('flowButton'),
      upgradeOverlay: document.getElementById('upgradeOverlay'),
      upgradeTitle: document.getElementById('upgradeTitle'),
      upgradeSummary: document.getElementById('upgradeSummary'),
      upgradeChoiceA: document.getElementById('upgradeChoiceA'),
      upgradeChoiceB: document.getElementById('upgradeChoiceB')
    };


    let textureLoader;
    const textureCache = {};

    function loadGameTextures() {
      textureLoader = new THREE.TextureLoader();
      for (const [key, src] of Object.entries(textureSources)) {
        const tex = textureLoader.load(src);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;
        if (key === 'grass') tex.repeat.set(18, 18);
        if (key === 'dirt') tex.repeat.set(9, 24);
        if (key === 'stone') tex.repeat.set(4, 4);
        if (key === 'wood') tex.repeat.set(1, 2);
        if (key === 'metal') tex.repeat.set(2, 2);
        if (key === 'clothBlue' || key === 'clothRed') tex.repeat.set(2, 3);
        if (key === 'leather') tex.repeat.set(2, 2);
        if (key === 'furBrown') tex.repeat.set(2, 2);
        textureCache[key] = tex;
      }
    }

    function makeMaterial(kind, color, extra = {}) {
      const mapDict = {
        grass: textureCache.grass,
        dirt: textureCache.dirt,
        stone: textureCache.stone,
        wood: textureCache.wood,
        metal: textureCache.metal,
        clothBlue: textureCache.clothBlue,
        clothRed: textureCache.clothRed,
        leather: textureCache.leather,
        furBrown: textureCache.furBrown
      };
      const params = Object.assign({
        color,
        map: mapDict[kind] || null,
        roughness: 0.72,
        metalness: 0.0
      }, extra);
      return new THREE.MeshStandardMaterial(params);
    }


    init();

    function init() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x5f7f96);
      scene.fog = new THREE.Fog(0x6f8899, 55, 215);

      camera = new THREE.PerspectiveCamera(67, window.innerWidth / window.innerHeight, 0.1, 700);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ReinhardToneMapping;
      renderer.toneMappingExposure = 0.82;
      document.body.appendChild(renderer.domElement);

      clock = new THREE.Clock();
      loadGameTextures();

      setupLights();
      setupWorld();
      createCampBoundary();

      player.group = createKnight(0x2f73ff, true, 'ally');
      scene.add(player.group);

      horse = createHorse();
      horse.position.set(-14, 0, -18);
      horse.visible = false;
      scene.add(horse);

      catapult = createCatapult();
      catapult.group.position.set(24, 0, -10);
      catapult.group.visible = false;
      scene.add(catapult.group);

      spawnStones();
      spawnAllies();

      window.addEventListener('resize', () => { onResize(); updateControlProfile(); });
      window.addEventListener('orientationchange', () => setTimeout(updateControlProfile, 250));
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', e => keys[e.code] = false);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mousedown', e => {
        // UI-Overlays dürfen niemals von der Spielsteuerung abgefangen werden.
        // Vor allem beim Upgrade-Fenster hat der alte Handler direkt wieder Pointer-Lock
        // angefordert und dadurch die Auswahlkarten geschluckt.
        if (isUiClickTarget(e.target)) return;
        if (e.button === 0) {
          mouseLeft = true;
          if (running && !upgradeChoosing && !flowOverlayActive) tryPointerLock();
        }
        if (e.button === 2) mouseRight = true;
      });
      document.addEventListener('mouseup', e => {
        if (e.button === 0) mouseLeft = false;
        if (e.button === 2) mouseRight = false;
      });
      document.addEventListener('contextmenu', e => e.preventDefault());

      hud.startButton.addEventListener('click', startGame);
      hud.flowButton.addEventListener('click', continueFlowOverlay);
      hud.flowOverlay.addEventListener('click', e => { if (e.target === hud.flowOverlay) continueFlowOverlay(e); });
      hud.upgradeChoiceA.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); chooseUpgrade(0); });
      hud.upgradeChoiceB.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); chooseUpgrade(1); });
      setupUpgradeChoiceInputGuards();
      hud.modeEasy.addEventListener('click', () => setGameMode('easy'));
      hud.modeHardcore.addEventListener('click', () => setGameMode('hardcore'));
      hud.modeCaravan.addEventListener('click', () => setGameMode('caravan'));
      hud.controlAuto.addEventListener('click', () => setControlMode('auto'));
      hud.controlPC.addEventListener('click', () => setControlMode('pc'));
      hud.controlTablet.addEventListener('click', () => setControlMode('tablet'));
      setupTouchControls();
      setControlMode('auto');
      hud.crestColor.addEventListener('input', () => {
        heraldryColor = hud.crestColor.value;
        updateHeraldryPreview();
      });
      hud.crestSymbol.addEventListener('change', () => {
        heraldrySymbol = hud.crestSymbol.value;
        updateHeraldryPreview();
      });
      updateHeraldryPreview();

      updateHud();
      renderer.setAnimationLoop(loop);
    }





    function createDefaultUpgradeStats() {
      return {
        swordDamageBonus: 0,
        swordRangeBonus: 0,
        swordCooldownMultiplier: 1,
        maxHealthBonus: 0,
        maxStaminaBonus: 0,
        staminaRegenBonus: 0,
        staminaCostMultiplier: 1,
        moveSpeedBonus: 0,
        horseSpeedBonus: 0,
        guardBonus: 0,
        shieldRechargeBonus: 0,
        shieldBreakRecoveryBonus: 0,
        extraAllies: 0,
        allyDamageBonus: 0,
        allyHealthBonus: 0,
        allyGuardBonus: 0,
        allySpeedBonus: 0,
        allyCooldownMultiplier: 1,
        extraArrows: 0,
        bowDamageBonus: 0,
        bowCooldownMultiplier: 1,
        arrowReloadBonus: 0,
        catapultDamageBonus: 0,
        catapultRadiusBonus: 0,
        catapultCooldownMultiplier: 1,
        siegeStonesBonus: 0,
        potionCooldownReduction: 0
      };
    }

    function resetUpgradeStats() {
      Object.assign(upgradeStats, createDefaultUpgradeStats());
      upgradeLog.length = 0;
      pendingUpgradeChoices = [];
      waveStats = null;
      upgradeChoosing = false;
      if (hud.upgradeOverlay) hud.upgradeOverlay.classList.remove('visible');
      flowOverlayActive = false;
      flowOverlayCallback = null;
      if (hud.flowOverlay) hud.flowOverlay.classList.remove('visible');
    }

    function isUiClickTarget(target) {
      if (!target || typeof target.closest !== 'function') return false;
      return Boolean(target.closest('#flowOverlay, #upgradeOverlay, #menu, #splashScreen'));
    }

    function showFlowOverlay({ eyebrow = 'Hinweis', title = 'Weiter?', text = '', button = 'Weiter', onContinue = null } = {}) {
      flowOverlayActive = true;
      flowOverlayCallback = typeof onContinue === 'function' ? onContinue : null;
      flowOverlayShownAt = performance.now();
      mouseLeft = false;
      mouseRight = false;
      resetTouchState();
      if (document.pointerLockElement) document.exitPointerLock?.();
      if (hud.touchControls) hud.touchControls.classList.remove('visible');

      hud.flowEyebrow.textContent = eyebrow;
      hud.flowTitle.textContent = title;
      hud.flowText.textContent = text;
      hud.flowButton.textContent = button;
      hud.flowOverlay.classList.add('visible');

      // Arm the button only after the guard window, so stray attack clicks during
      // the wave-end moment can't dismiss it. Disabled buttons ignore clicks; the
      // keyboard path is time-guarded in continueFlowOverlay.
      hud.flowButton.disabled = true;
      hud.flowButton.classList.add('arming');
      const shownToken = flowOverlayShownAt;
      setTimeout(() => {
        if (flowOverlayActive && flowOverlayShownAt === shownToken) {
          hud.flowButton.disabled = false;
          hud.flowButton.classList.remove('arming');
          hud.flowButton.focus?.();
        }
      }, FLOW_GUARD_MS);
    }

    function continueFlowOverlay(e) {
      if (e) {
        e.preventDefault?.();
        e.stopPropagation?.();
      }

      // Guard window: ignore confirms that arrive during the wave-end click burst.
      if (!flowOverlayActive || performance.now() - flowOverlayShownAt < FLOW_GUARD_MS) return;

      const callback = flowOverlayCallback;
      flowOverlayCallback = null;
      flowOverlayActive = false;
      hud.flowOverlay.classList.remove('visible');
      hud.flowButton.disabled = false;
      hud.flowButton.classList.remove('arming');

      if (callback) callback();

      if (running && !paused && !upgradeChoosing && !flowOverlayActive) {
        if (touchEnabled) {
          if (hud.touchControls) hud.touchControls.classList.add('visible');
        } else {
          setTimeout(() => { if (running && !paused && !upgradeChoosing && !flowOverlayActive) tryPointerLock(); }, 50);
        }
      }
    }

    function setupUpgradeChoiceInputGuards() {
      if (!hud.upgradeOverlay) return;

      const handleUpgradeInput = e => {
        const button = e.target?.closest?.('.upgradeChoice');
        if (!button || !hud.upgradeOverlay.classList.contains('visible')) return;

        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

        if (button === hud.upgradeChoiceA) chooseUpgrade(0);
        else if (button === hud.upgradeChoiceB) chooseUpgrade(1);
      };

      // Capture-Phase: Die Upgrade-Karten gewinnen immer gegen globale Spiel-Maussteuerung.
      hud.upgradeOverlay.addEventListener('pointerdown', handleUpgradeInput, { capture: true });
      hud.upgradeOverlay.addEventListener('mousedown', handleUpgradeInput, { capture: true });
      hud.upgradeOverlay.addEventListener('touchstart', handleUpgradeInput, { capture: true, passive: false });
      hud.upgradeOverlay.addEventListener('click', handleUpgradeInput, { capture: true });
    }

    function getMaxArrows() {
      return maxArrows + upgradeStats.extraArrows;
    }

    function getArrowReloadDuration() {
      return Math.max(2.4, 5.0 - upgradeStats.arrowReloadBonus);
    }

    function getHealPotionCooldownDuration() {
      return Math.max(25, healPotionCooldownDuration - upgradeStats.potionCooldownReduction);
    }

    function getWaveEnemyTargetCount() {
      if (gameMode === 'hardcore') return 1;
      return Math.min(5 + wave * 3, 32) + (wave % 4 === 0 ? 1 : 0);
    }

    function startWaveStats() {
      waveStats = {
        wave,
        startedAt: performance.now() / 1000,
        startHealth: player.health,
        damageTaken: 0,
        kills: 0,
        alliesDown: 0,
        expectedEnemies: getWaveEnemyTargetCount()
      };
    }

    function evaluateWavePerformance() {
      if (!waveStats) {
        return { label: t('upgrade.grade.solid'), multiplier: 1.0, score: 0.55, elapsed: 0, activeAllies: allies.length, totalAllies: allies.length };
      }

      const elapsed = Math.max(0, performance.now() / 1000 - waveStats.startedAt);
      const maxHealth = player.maxHealth || 100;
      const healthRatio = THREE.MathUtils.clamp(player.health / maxHealth, 0, 1);
      const damageRatio = THREE.MathUtils.clamp(1 - (waveStats.damageTaken / Math.max(1, maxHealth)), 0, 1);
      const totalAllies = Math.max(1, allies.length);
      const activeAllies = allies.filter(a => a.active).length;
      const allyRatio = THREE.MathUtils.clamp(activeAllies / totalAllies, 0, 1);
      const expectedTime = 12 + waveStats.expectedEnemies * (gameMode === 'hardcore' ? 8.5 : 2.4);
      const speedRatio = THREE.MathUtils.clamp(1 - Math.max(0, elapsed - expectedTime) / Math.max(16, expectedTime * 0.8), 0, 1);
      const killRatio = THREE.MathUtils.clamp(waveStats.kills / Math.max(1, waveStats.expectedEnemies), 0, 1);

      const score = healthRatio * 0.34 + damageRatio * 0.24 + allyRatio * 0.18 + speedRatio * 0.14 + killRatio * 0.10;

      if (score >= 0.86) return { label: t('upgrade.grade.legendary'), multiplier: 1.75, score, elapsed, activeAllies, totalAllies };
      if (score >= 0.68) return { label: t('upgrade.grade.strong'), multiplier: 1.35, score, elapsed, activeAllies, totalAllies };
      return { label: t('upgrade.grade.solid'), multiplier: 1.0, score, elapsed, activeAllies, totalAllies };
    }

    function upgradeEffectText(type, m) {
      if (type === 'swordDamage') return t('upgrade.effect.swordDamage', { value: (1.2 * m).toFixed(1) });
      if (type === 'swordSpeed') return t('upgrade.effect.swordSpeed', { value: Math.round(6 * m) });
      if (type === 'health') return t('upgrade.effect.health', { value: Math.round(18 * m) });
      if (type === 'shield') return t('upgrade.effect.shield', { value: Math.round(18 * m) });
      if (type === 'shieldRecharge') return t('upgrade.effect.shieldRecharge');
      if (type === 'stamina') return t('upgrade.effect.stamina', { value: Math.round(18 * m) });
      if (type === 'speed') return t('upgrade.effect.speed', { value: (0.45 * m).toFixed(1) });
      if (type === 'allyCount') return t('upgrade.effect.allyCount', { value: Math.max(1, Math.round(m)) });
      if (type === 'allyTraining') return t('upgrade.effect.allyTraining');
      if (type === 'bowPower') return t('upgrade.effect.bowPower', { value: Math.max(1, Math.round(m)) });
      if (type === 'bowSpeed') return t('upgrade.effect.bowSpeed');
      if (type === 'catapultPower') return t('upgrade.effect.catapultPower');
      if (type === 'siegeSupply') return t('upgrade.effect.siegeSupply', { value: Math.max(1, Math.round(m)) });
      if (type === 'potion') return t('upgrade.effect.potion', { value: Math.round(7 * m) });
      return t('upgrade.fallback');
    }

    function createUpgradePool() {
      const pool = [
        {
          type: 'swordDamage', title: t('upgrade.swordDamage.title'),
          text: t('upgrade.swordDamage.text'),
          apply: m => { upgradeStats.swordDamageBonus += 1.2 * m; }
        },
        {
          type: 'swordSpeed', title: t('upgrade.swordSpeed.title'),
          text: t('upgrade.swordSpeed.text'),
          apply: m => { upgradeStats.swordCooldownMultiplier = Math.max(0.55, upgradeStats.swordCooldownMultiplier - 0.06 * m); }
        },
        {
          type: 'health', title: t('upgrade.health.title'),
          text: t('upgrade.health.text'),
          apply: m => {
            const amount = Math.round(18 * m);
            upgradeStats.maxHealthBonus += amount;
            player.maxHealth += amount;
            player.health = Math.min(player.maxHealth, player.health + amount);
          }
        },
        {
          type: 'shield', title: t('upgrade.shield.title'),
          text: t('upgrade.shield.text'),
          apply: m => {
            const amount = Math.round(18 * m);
            upgradeStats.guardBonus += amount;
            player.maxGuard += amount;
            player.guard = Math.min(player.maxGuard, player.guard + amount);
          }
        },
        {
          type: 'shieldRecharge', title: t('upgrade.shieldRecharge.title'),
          text: t('upgrade.shieldRecharge.text'),
          apply: m => {
            upgradeStats.shieldRechargeBonus += 3.0 * m;
            upgradeStats.shieldBreakRecoveryBonus += 1.4 * m;
          }
        },
        {
          type: 'stamina', title: t('upgrade.stamina.title'),
          text: t('upgrade.stamina.text'),
          apply: m => {
            const amount = Math.round(18 * m);
            upgradeStats.maxStaminaBonus += amount;
            upgradeStats.staminaRegenBonus += 2.2 * m;
            upgradeStats.staminaCostMultiplier = Math.max(0.62, upgradeStats.staminaCostMultiplier - 0.035 * m);
            player.maxStamina += amount;
            player.stamina = Math.min(player.maxStamina, player.stamina + amount);
          }
        },
        {
          type: 'speed', title: t('upgrade.speed.title'),
          text: t('upgrade.speed.text'),
          apply: m => {
            upgradeStats.moveSpeedBonus += 0.45 * m;
            upgradeStats.horseSpeedBonus += 0.65 * m;
          }
        },
        {
          type: 'allyCount', title: t('upgrade.allyCount.title'),
          text: t('upgrade.allyCount.text'),
          apply: m => {
            const count = Math.max(1, Math.round(m));
            upgradeStats.extraAllies += count;
            spawnBonusAllies(count);
          }
        },
        {
          type: 'allyTraining', title: t('upgrade.allyTraining.title'),
          text: t('upgrade.allyTraining.text'),
          apply: m => {
            upgradeStats.allyDamageBonus += 0.24 * m;
            upgradeStats.allyHealthBonus += Math.round(8 * m);
            upgradeStats.allyGuardBonus += Math.round(7 * m);
            upgradeStats.allySpeedBonus += 0.12 * m;
            upgradeStats.allyCooldownMultiplier = Math.max(0.70, upgradeStats.allyCooldownMultiplier - 0.025 * m);
            for (const ally of allies) {
              ally.maxHealth += Math.round(8 * m);
              ally.health = Math.min(ally.maxHealth, ally.health + Math.round(8 * m));
              ally.maxGuard += Math.round(7 * m);
              ally.guard = Math.min(ally.maxGuard, ally.guard + Math.round(7 * m));
              ally.speed += 0.12 * m;
            }
          }
        },
        {
          type: 'potion', title: t('upgrade.potion.title'),
          text: t('upgrade.potion.text'),
          apply: m => {
            upgradeStats.potionCooldownReduction += 7 * m;
            if (!healPotionReady) healPotionCooldown = Math.min(healPotionCooldown, getHealPotionCooldownDuration());
          }
        }
      ];

      if (unlockedBow) {
        pool.push(
          {
            type: 'bowPower', title: t('upgrade.bowPower.title'),
            text: t('upgrade.bowPower.text'),
            apply: m => {
              const add = Math.max(1, Math.round(m));
              upgradeStats.extraArrows += add;
              upgradeStats.bowDamageBonus += 0.45 * m;
              arrows = Math.min(getMaxArrows(), arrows + add);
            }
          },
          {
            type: 'bowSpeed', title: t('upgrade.bowSpeed.title'),
            text: t('upgrade.bowSpeed.text'),
            apply: m => {
              upgradeStats.bowCooldownMultiplier = Math.max(0.55, upgradeStats.bowCooldownMultiplier - 0.045 * m);
              upgradeStats.arrowReloadBonus += 0.55 * m;
            }
          }
        );
      }

      if (unlockedCatapult) {
        pool.push({
          type: 'catapultPower', title: t('upgrade.catapultPower.title'),
          text: t('upgrade.catapultPower.text'),
          apply: m => {
            upgradeStats.catapultDamageBonus += 3.0 * m;
            upgradeStats.catapultRadiusBonus += 0.65 * m;
            upgradeStats.catapultCooldownMultiplier = Math.max(0.58, upgradeStats.catapultCooldownMultiplier - 0.045 * m);
          }
        });
      }

      if (unlockedSiegeTeams) {
        pool.push({
          type: 'siegeSupply', title: t('upgrade.siegeSupply.title'),
          text: t('upgrade.siegeSupply.text'),
          apply: m => {
            const add = Math.max(1, Math.round(m));
            upgradeStats.siegeStonesBonus += add;
            for (const team of siegeTeams) team.stones += add;
          }
        });
      }

      return pool;
    }

    function pickUpgradeChoices(grade) {
      const pool = createUpgradePool();
      const choices = [];
      const startIndex = (wave * 3 + Math.floor(score)) % Math.max(1, pool.length);
      for (let i = 0; i < pool.length && choices.length < 2; i++) {
        const candidate = pool[(startIndex + i * 5) % pool.length];
        if (!choices.some(c => c.type === candidate.type)) choices.push(candidate);
      }
      while (choices.length < 2 && pool.length > choices.length) {
        const candidate = pool[Math.floor(Math.random() * pool.length)];
        if (!choices.some(c => c.type === candidate.type)) choices.push(candidate);
      }
      return choices.map(choice => ({ ...choice, multiplier: grade.multiplier, effect: upgradeEffectText(choice.type, grade.multiplier) }));
    }

    function showUpgradePanel(grade, choices) {
      pendingUpgradeChoices = choices;
      upgradeChoosing = true;
      upgradePanelShownAt = performance.now();
      mouseLeft = false;
      mouseRight = false;
      resetTouchState();
      if (document.pointerLockElement) document.exitPointerLock?.();
      if (hud.touchControls) hud.touchControls.classList.remove('visible');

      hud.upgradeTitle.textContent = t('upgrade.waveCleared', { wave, grade: grade.label });
      hud.upgradeSummary.textContent = t('upgrade.summary', { percent: Math.round(grade.score * 100), time: Math.ceil(grade.elapsed), active: grade.activeAllies, total: grade.totalAllies });
      renderUpgradeChoice(hud.upgradeChoiceA, choices[0]);
      renderUpgradeChoice(hud.upgradeChoiceB, choices[1]);
      hud.upgradeOverlay.classList.add('visible');
    }

    function renderUpgradeChoice(button, upgrade) {
      button.innerHTML = `
        <div class="upgradeChoiceTitle">${upgrade.title}</div>
        <div class="upgradeChoiceEffect">${upgrade.effect}</div>
        <div class="upgradeChoiceText">${upgrade.text}</div>
      `;
    }

    function finishWaveAndOfferUpgrade() {
      score += 250 + wave * 80;
      const grade = evaluateWavePerformance();
      const choices = pickUpgradeChoices(grade);
      if (stones.length < 8) spawnStones();

      const completedWave = wave;
      showFlowOverlay({
        eyebrow: t('upgrade.flow.endedEyebrow', { wave: completedWave }),
        title: t('upgrade.flow.endedTitle'),
        text: t('upgrade.flow.endedText', { wave: completedWave, percent: Math.round(grade.score * 100), time: Math.ceil(grade.elapsed), active: grade.activeAllies, total: grade.totalAllies }),
        button: t('upgrade.flow.chooseReward'),
        onContinue: () => {
          showMessage(t('upgrade.msg.choose'));
          showUpgradePanel(grade, choices);
        }
      });
    }

    function chooseUpgrade(index) {
      if (!upgradeChoosing || !pendingUpgradeChoices[index]) return;
      // Short guard so a click left over from attacking can't auto-pick instantly.
      if (performance.now() - upgradePanelShownAt < UPGRADE_GUARD_MS) return;
      const upgrade = pendingUpgradeChoices[index];

      try {
        upgrade.apply(upgrade.multiplier);
      } catch (err) {
        console.error('Upgrade konnte nicht angewendet werden:', err);
        showMessage(t('upgrade.msg.error'));
      }

      upgradeLog.push(upgrade.title);
      upgradeChoosing = false;
      pendingUpgradeChoices = [];
      hud.upgradeOverlay.classList.remove('visible');
      mouseLeft = false;
      mouseRight = false;
      resetTouchState();
      const nextWave = wave + 1;
      showFlowOverlay({
        eyebrow: t('upgrade.flow.nextEyebrow'),
        title: t('upgrade.flow.nextTitle', { wave: nextWave }),
        text: t('upgrade.flow.nextText', { title: upgrade.title }),
        button: t('upgrade.flow.nextButton', { wave: nextWave }),
        onContinue: () => {
          wave = nextWave;
          beginWave();
          if (![2, 4, 6, 8].includes(wave)) {
            showMessage(t('msg.moreRedKnights', { wave }));
          }
        }
      });
    }

    function spawnBonusAllies(count) {
      if (gameMode === 'caravan') return;
      for (let i = 0; i < count; i++) {
        const group = createKnight(heraldryColor, false, 'ally');
        group.position.copy(freeCampSpawnPosition());
        scene.add(group);
        const allyHealth = (gameMode === 'hardcore' ? 100 : 80) + upgradeStats.allyHealthBonus;
        const allyGuard = (gameMode === 'hardcore' ? 100 : 65) + upgradeStats.allyGuardBonus;
        allies.push({
          group,
          pos: group.position,
          health: allyHealth,
          maxHealth: allyHealth,
          attackCooldown: (2.2 + Math.random() * 1.4) * upgradeStats.allyCooldownMultiplier,
          blockTimer: 0,
          blockCooldown: Math.random() * 1.2,
          guard: allyGuard,
          maxGuard: allyGuard,
          shieldRechargeTimer: 0,
          shieldBroken: false,
          speed: 3.8 + upgradeStats.allySpeedBonus,
          movePhase: Math.random() * 10,
          active: true,
          reviveTimer: 0
        });
      }
    }

    function addStaticObstacle(x, z, radius, label = 'Hindernis', mode = 'all') {
      staticObstacles.push({ x, z, radius, label, mode });
    }

    function distance2D(a, b) {
      const dx = a.x - b.x;
      const dz = a.z - b.z;
      return Math.sqrt(dx * dx + dz * dz);
    }

    function getDynamicCollisionObjects(ignore = null) {
      const objects = [];

      if (ignore !== player) {
        objects.push({ pos: player.pos, radius: player.mounted ? 1.55 : 1.05, label: t('label.player') });
      }

      for (const enemy of enemies) {
        if (enemy !== ignore) objects.push({ pos: enemy.pos, radius: enemy.radius || 1.1, label: t('label.enemy') });
      }

      for (const ally of allies) {
        if (ally !== ignore && ally.active) objects.push({ pos: ally.pos, radius: 1.05, label: t('label.ally') });
      }

      for (const pickup of caravanPickups) {
        if (pickup && !pickup.collected && pickup.group) {
          objects.push({ pos: pickup.group.position, radius: 1.05, label: t('label.caravanKnight') });
        }
      }

      if (!player.mounted && horse && horse.visible && ignore !== horse) {
        objects.push({ pos: horse.position, radius: 2.25, label: 'Pferd' });
      }

      if (catapult && catapult.group && catapult.group.visible && ignore !== catapult) {
        objects.push({ pos: catapult.group.position, radius: 3.8, label: 'Katapult' });
      }

      // Fix Version 15:
      // Die automatischen Katapult-Truppen heißen im Code siegeTeams.
      // Dadurch bleibt die Kollisionsprüfung beim Bewegen stabil.
      if (typeof siegeTeams !== 'undefined') {
        for (const team of siegeTeams) {
          if (!team || team.converted) continue;

          if (team.catapult?.group) {
            objects.push({ pos: team.catapult.group.position, radius: 3.4, label: 'Katapulttrupp' });
          }

          for (const crewMember of team.crew || []) {
            objects.push({ pos: crewMember.position, radius: 1.0, label: 'Katapult-Besatzung' });
          }
        }
      }

      return objects;
    }

    function collidesAt(pos, radius, ignore = null) {
      for (const o of staticObstacles) {
        if (o.mode && o.mode !== 'all' && o.mode !== gameMode) continue;
        const dx = pos.x - o.x;
        const dz = pos.z - o.z;
        const min = radius + o.radius;
        if (dx * dx + dz * dz < min * min) return true;
      }

      for (const o of getDynamicCollisionObjects(ignore)) {
        const dx = pos.x - o.pos.x;
        const dz = pos.z - o.pos.z;
        const min = radius + o.radius;
        if (dx * dx + dz * dz < min * min) return true;
      }

      return false;
    }

    function moveWithCollision(pos, movement, radius, ignore = null) {
      const original = pos.clone();

      const tryFull = original.clone().add(movement);
      if (!collidesAt(tryFull, radius, ignore)) {
        pos.copy(tryFull);
        return true;
      }

      const tryX = original.clone().add(new THREE.Vector3(movement.x, 0, 0));
      if (!collidesAt(tryX, radius, ignore)) {
        pos.copy(tryX);
        return true;
      }

      const tryZ = original.clone().add(new THREE.Vector3(0, 0, movement.z));
      if (!collidesAt(tryZ, radius, ignore)) {
        pos.copy(tryZ);
        return true;
      }

      return false;
    }

    function pushOutOfOverlaps(pos, radius, ignore = null) {
      const objects = [
        ...staticObstacles.map(o => ({ pos: new THREE.Vector3(o.x, 0, o.z), radius: o.radius })),
        ...getDynamicCollisionObjects(ignore)
      ];

      for (const o of objects) {
        const dx = pos.x - o.pos.x;
        const dz = pos.z - o.pos.z;
        const distSq = dx * dx + dz * dz;
        const min = radius + o.radius;
        if (distSq > 0.0001 && distSq < min * min) {
          const dist = Math.sqrt(distSq);
          const push = (min - dist) + 0.02;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        }
      }
    }


    function updateHeraldryPreview() {
      if (!hud.crestPreview) return;
      const symbolMap = {
        cross: '✚',
        diamond: '◆',
        star: '★',
        moon: '☾',
        shield: '♜'
      };
      hud.crestPreview.textContent = symbolMap[heraldrySymbol] || '✚';
      hud.crestPreview.style.background = heraldryColor;
    }


    function hexToRgb(hex) {
      const clean = hex.replace('#', '');
      return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16)
      };
    }

    function colorDistance(hexA, hexB) {
      const a = hexToRgb(hexA);
      const b = hexToRgb(hexB);
      const dr = a.r - b.r;
      const dg = a.g - b.g;
      const db = a.b - b.b;
      return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    function chooseEnemyHeraldry() {
      const playerColor = heraldryColor || '#2f73ff';
      const candidates = enemyColorPalette
        .map(color => ({ color, distance: colorDistance(color, playerColor) }))
        .filter(entry => entry.distance > 145)
        .sort((a, b) => b.distance - a.distance);

      const goodChoices = candidates.length > 0 ? candidates.slice(0, 5) : enemyColorPalette.map(color => ({ color }));
      const chosen = goodChoices[Math.floor(Math.random() * goodChoices.length)];

      enemyHeraldryColor = chosen.color;
      enemyHeraldrySymbol = heraldrySymbols[Math.floor(Math.random() * heraldrySymbols.length)];

      // Falls zufällig dasselbe Symbol wie beim Spieler gewählt wird, nimm das nächste.
      if (enemyHeraldrySymbol === heraldrySymbol && heraldrySymbols.length > 1) {
        const idx = (heraldrySymbols.indexOf(enemyHeraldrySymbol) + 1 + Math.floor(Math.random() * (heraldrySymbols.length - 1))) % heraldrySymbols.length;
        enemyHeraldrySymbol = heraldrySymbols[idx];
      }
    }

    function teamColorForSide(side) {
      if (side === 'enemy') return enemyHeraldryColor;
      return heraldryColor;
    }

    function teamSymbolForSide(side) {
      if (side === 'enemy') return enemyHeraldrySymbol;
      return heraldrySymbol;
    }

    function freeCampSpawnPosition(ignore = null) {
      for (const base of campSpawnPoints) {
        const jittered = base.clone().add(new THREE.Vector3(
          THREE.MathUtils.randFloat(-1.4, 1.4),
          0,
          THREE.MathUtils.randFloat(-1.4, 1.4)
        ));
        if (!collidesAt(jittered, 1.15, ignore)) return jittered;
      }

      for (let i = 0; i < 80; i++) {
        const p = new THREE.Vector3(
          THREE.MathUtils.randFloat(campBounds.xMin + 5, campBounds.xMax - 5),
          0,
          THREE.MathUtils.randFloat(campBounds.zMin + 5, campBounds.zMax - 5)
        );
        if (!collidesAt(p, 1.15, ignore)) return p;
      }

      return new THREE.Vector3(0, 0, campBounds.zMin + 6);
    }

    function addHeraldrySymbol(group, side, target = 'front') {
      const symbol = teamSymbolForSide(side);
      const mat = new THREE.MeshStandardMaterial({
        color: side === 'enemy' ? 0xffe08a : 0xf8d46f,
        roughness: 0.48,
        metalness: 0.12
      });

      const pieces = [];

      function addBox(x, y, z, sx, sy, sz, rotZ = 0) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
        mesh.position.set(x, y, z);
        mesh.rotation.z = rotZ;
        pieces.push(mesh);
        group.add(mesh);
        return mesh;
      }

      if (target === 'front') {
        const z = 0.47;
        if (symbol === 'cross') {
          addBox(0, 1.71, z, 0.14, 0.96, 0.09);
          addBox(0, 1.88, z + 0.01, 0.58, 0.13, 0.09);
        } else if (symbol === 'diamond') {
          addBox(0, 1.78, z, 0.48, 0.48, 0.09, Math.PI / 4);
        } else if (symbol === 'star') {
          addBox(0, 1.78, z, 0.16, 0.76, 0.09);
          addBox(0, 1.78, z + 0.01, 0.54, 0.14, 0.09);
          addBox(0, 1.78, z + 0.02, 0.44, 0.12, 0.09, Math.PI / 4);
          addBox(0, 1.78, z + 0.03, 0.44, 0.12, 0.09, -Math.PI / 4);
        } else if (symbol === 'moon') {
          const moon = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.055, 8, 24), mat);
          moon.position.set(0, 1.8, z);
          moon.rotation.y = Math.PI / 2;
          group.add(moon);
        } else if (symbol === 'shield') {
          addBox(0, 1.85, z, 0.50, 0.34, 0.09);
          addBox(0, 1.58, z + 0.01, 0.30, 0.34, 0.09, Math.PI / 4);
          addBox(0, 1.58, z + 0.02, 0.30, 0.34, 0.09, -Math.PI / 4);
        }
      } else if (target === 'shield') {
        const x = -1.02;
        if (symbol === 'cross') {
          addBox(x, 1.78, 0.14, 0.18, 0.56, 0.10);
          addBox(x - 0.01, 1.88, 0.14, 0.19, 0.12, 0.48);
        } else if (symbol === 'diamond') {
          addBox(x, 1.80, 0.14, 0.18, 0.34, 0.34, Math.PI / 4);
        } else if (symbol === 'star') {
          addBox(x, 1.80, 0.14, 0.18, 0.48, 0.10);
          addBox(x - 0.01, 1.80, 0.14, 0.19, 0.10, 0.42);
          addBox(x - 0.02, 1.80, 0.14, 0.19, 0.09, 0.34, Math.PI / 4);
          addBox(x - 0.03, 1.80, 0.14, 0.19, 0.09, 0.34, -Math.PI / 4);
        } else if (symbol === 'moon') {
          const moon = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 8, 24), mat);
          moon.position.set(x, 1.80, 0.14);
          moon.rotation.y = Math.PI / 2;
          group.add(moon);
        } else if (symbol === 'shield') {
          addBox(x, 1.91, 0.14, 0.18, 0.26, 0.36);
          addBox(x - 0.01, 1.66, 0.14, 0.18, 0.26, 0.24, Math.PI / 4);
          addBox(x - 0.02, 1.66, 0.14, 0.18, 0.26, 0.24, -Math.PI / 4);
        }
      }
    }


    function clearEnemyDecorations() {
      for (const obj of enemyDecorations) scene.remove(obj);
      enemyDecorations.length = 0;
    }

    function createEnemyHeraldryDecorations() {
      clearEnemyDecorations();

      // Sichtbares feindliches Wappen an der Burg, damit man sofort sieht,
      // welche Farbe und welches Symbol der Gegner in diesem Spiel hat.
      for (const x of [-7, 0, 7]) {
        const banner = createBanner(new THREE.Color(enemyHeraldryColor).getHex());
        banner.position.set(x, 0, 74.3);
        banner.scale.setScalar(0.9);
        scene.add(banner);
        enemyDecorations.push(banner);

        const emblemGroup = new THREE.Group();
        emblemGroup.position.set(x + 1.1, 5.1, 74.35);
        emblemGroup.rotation.y = Math.PI;
        addHeraldrySymbol(emblemGroup, 'enemy', 'front');
        emblemGroup.scale.setScalar(1.45);
        scene.add(emblemGroup);
        enemyDecorations.push(emblemGroup);
      }
    }


    function ensureAudioStarted() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;

      if (!audioCtx) {
        audioCtx = new AudioContextClass();

        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.72;
        masterGain.connect(audioCtx.destination);

        musicGain = audioCtx.createGain();
        musicGain.gain.value = 0.36;
        musicGain.connect(masterGain);

        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = 0.72;
        sfxGain.connect(masterGain);
      }

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      return true;
    }

    function playTone(freq, duration = 0.18, type = 'sine', volume = 0.12, out = sfxGain, delay = 0, bendTo = null) {
      if (!ensureAudioStarted() || !out) return;

      const now = audioCtx.currentTime + delay;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (bendTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, bendTo), now + duration);
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + duration + 0.03);
    }

    function playNoise(duration = 0.16, volume = 0.15, filterFreq = 1200, delay = 0) {
      if (!ensureAudioStarted() || !sfxGain) return;

      const now = audioCtx.currentTime + delay;
      const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const src = audioCtx.createBufferSource();
      src.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(filterFreq, now);
      filter.Q.setValueAtTime(0.8, now);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain);
      src.start(now);
      src.stop(now + duration + 0.02);
    }

    function playSfx(name) {
      if (!ensureAudioStarted()) return;

      const now = audioCtx.currentTime;
      // Schutz gegen komplett überladene Soundwolken bei vielen Treffern gleichzeitig.
      const veryShortCooldown = 0.018;
      if (now - lastSfxTime < veryShortCooldown && (name === 'hit' || name === 'shield')) return;
      lastSfxTime = now;

      if (name === 'sword') {
        playNoise(0.12, 0.12, 2600);
        playTone(540, 0.08, 'triangle', 0.045, sfxGain, 0.0, 760);
      } else if (name === 'hit') {
        playNoise(0.13, 0.16, 750);
        playTone(150, 0.09, 'square', 0.045, sfxGain, 0.0, 95);
      } else if (name === 'shield') {
        playNoise(0.11, 0.12, 1850);
        playTone(330, 0.13, 'triangle', 0.06, sfxGain, 0.0, 260);
      } else if (name === 'shieldBreak') {
        playNoise(0.26, 0.22, 900);
        playTone(240, 0.18, 'sawtooth', 0.07, sfxGain, 0.0, 80);
        playTone(420, 0.08, 'square', 0.04, sfxGain, 0.04, 190);
      } else if (name === 'bow') {
        playTone(190, 0.07, 'triangle', 0.07, sfxGain, 0.0, 90);
        playNoise(0.055, 0.06, 3200, 0.03);
      } else if (name === 'arrowHit') {
        playTone(620, 0.05, 'triangle', 0.045, sfxGain, 0.0, 480);
        playNoise(0.07, 0.07, 2100);
      } else if (name === 'catapult') {
        playTone(92, 0.34, 'sawtooth', 0.12, sfxGain, 0.0, 55);
        playNoise(0.24, 0.20, 480, 0.02);
      } else if (name === 'boom') {
        playTone(70, 0.42, 'sawtooth', 0.15, sfxGain, 0.0, 35);
        playNoise(0.36, 0.25, 380, 0.03);
      } else if (name === 'potion') {
        playTone(523.25, 0.12, 'sine', 0.06, sfxGain, 0.0);
        playTone(659.25, 0.12, 'sine', 0.055, sfxGain, 0.09);
        playTone(783.99, 0.18, 'sine', 0.05, sfxGain, 0.18);
      } else if (name === 'pickup') {
        playTone(440, 0.10, 'triangle', 0.06, sfxGain, 0.0);
        playTone(660, 0.12, 'triangle', 0.05, sfxGain, 0.10);
      } else if (name === 'equip') {
        playTone(330, 0.08, 'triangle', 0.04, sfxGain, 0.0);
        playTone(440, 0.09, 'triangle', 0.035, sfxGain, 0.06);
      } else if (name === 'horn') {
        playTone(146.83, 0.32, 'sawtooth', 0.08, sfxGain, 0.0);
        playTone(220.00, 0.36, 'sawtooth', 0.07, sfxGain, 0.08);
        playTone(293.66, 0.42, 'sawtooth', 0.06, sfxGain, 0.16);
      } else if (name === 'victory') {
        playTone(293.66, 0.16, 'triangle', 0.07, sfxGain, 0.00);
        playTone(349.23, 0.16, 'triangle', 0.07, sfxGain, 0.15);
        playTone(440.00, 0.22, 'triangle', 0.07, sfxGain, 0.30);
        playTone(587.33, 0.32, 'triangle', 0.06, sfxGain, 0.48);
      } else if (name === 'defeat') {
        playTone(220.00, 0.22, 'sawtooth', 0.07, sfxGain, 0.0, 160);
        playTone(146.83, 0.28, 'sawtooth', 0.06, sfxGain, 0.18, 98);
      }
    }


    function musicMidi(note) {
      return 440 * Math.pow(2, (note - 69) / 12);
    }

    function connectMusicSource(source, gain, filter = null) {
      if (filter) {
        source.connect(filter);
        filter.connect(gain);
      } else {
        source.connect(gain);
      }
      gain.connect(musicGain);
    }

    function playMusicPluck(freq, delay = 0, volume = 0.042, duration = 0.24, brightness = 1450) {
      if (!ensureAudioStarted() || !musicGain || !freq) return;
      const now = audioCtx.currentTime + delay;

      const osc = audioCtx.createOscillator();
      const overtone = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      // Triangle + leiser Oberton klingt gezupfter und weniger nach simplem Pieps.
      osc.type = 'triangle';
      overtone.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      overtone.frequency.setValueAtTime(freq * 2.005, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.992, now + duration);
      overtone.frequency.exponentialRampToValueAtTime(freq * 1.985, now + duration);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(brightness, now);
      filter.frequency.exponentialRampToValueAtTime(520, now + duration);
      filter.Q.setValueAtTime(0.55, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      overtone.connect(filter);
      filter.connect(gain);
      gain.connect(musicGain);
      osc.start(now);
      overtone.start(now);
      osc.stop(now + duration + 0.04);
      overtone.stop(now + duration + 0.04);
    }

    function playMusicChord(rootFreq, intervals = [0, 7, 12], delay = 0, volume = 0.018, duration = 0.38) {
      if (!rootFreq) return;
      intervals.forEach((semi, index) => {
        const freq = rootFreq * Math.pow(2, semi / 12);
        playMusicPluck(freq, delay + index * 0.055, volume * (index === 0 ? 1.15 : 0.9), duration - index * 0.035, 1200);
      });
    }

    function playMusicFlute(freq, delay = 0, volume = 0.020, duration = 0.44) {
      if (!ensureAudioStarted() || !musicGain || !freq) return;
      const now = audioCtx.currentTime + delay;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Leichtes Vibrato macht die Flöte lebendiger.
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(5.2, now);
      lfoGain.gain.setValueAtTime(Math.max(0.6, freq * 0.004), now);
      lfo.connect(lfoGain).connect(osc.frequency);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2100, now);
      filter.Q.setValueAtTime(0.7, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      connectMusicSource(osc, gain, filter);
      osc.start(now);
      lfo.start(now);
      osc.stop(now + duration + 0.05);
      lfo.stop(now + duration + 0.05);
    }

    function playMusicShawm(freq, delay = 0, volume = 0.014, duration = 0.34) {
      if (!ensureAudioStarted() || !musicGain || !freq) return;
      const now = audioCtx.currentTime + delay;

      const reed = audioCtx.createOscillator();
      const body = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      reed.type = 'sawtooth';
      body.type = 'triangle';
      reed.frequency.setValueAtTime(freq, now);
      body.frequency.setValueAtTime(freq * 0.5, now);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1150, now);
      filter.Q.setValueAtTime(1.05, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.030);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      reed.connect(filter);
      body.connect(filter);
      filter.connect(gain);
      gain.connect(musicGain);
      reed.start(now);
      body.start(now);
      reed.stop(now + duration + 0.05);
      body.stop(now + duration + 0.05);
    }

    function playMusicDrone(freq, delay = 0, volume = 0.020, duration = 1.20) {
      if (!ensureAudioStarted() || !musicGain || !freq) return;
      const now = audioCtx.currentTime + delay;

      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      // Ein tiefer Bordun wie Sackpfeife/Drehleier, aber weich gefiltert.
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 1.004, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);
      filter.Q.setValueAtTime(0.45, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.080);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(musicGain);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.06);
      osc2.stop(now + duration + 0.06);
    }

    function playMusicFrameDrum(delay = 0, volume = 0.036, low = 118, duration = 0.19) {
      if (!ensureAudioStarted() || !musicGain) return;
      const now = audioCtx.currentTime + delay;

      const osc = audioCtx.createOscillator();
      const thumpGain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(low, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + duration * 0.82);

      thumpGain.gain.setValueAtTime(0.0001, now);
      thumpGain.gain.exponentialRampToValueAtTime(volume, now + 0.006);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(thumpGain);
      thumpGain.connect(musicGain);
      osc.start(now);
      osc.stop(now + duration + 0.03);

      // Sehr kurzer Rauschanteil wie Fell/Handtrommel.
      const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * 0.055));
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const fade = 1 - i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * fade * fade;
      }

      const noise = audioCtx.createBufferSource();
      const noiseFilter = audioCtx.createBiquadFilter();
      const noiseGain = audioCtx.createGain();

      noise.buffer = buffer;
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(620, now);
      noiseFilter.Q.setValueAtTime(0.9, now);
      noiseGain.gain.setValueAtTime(volume * 0.42, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.060);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(musicGain);
      noise.start(now);
      noise.stop(now + 0.065);
    }

    function playMusicBell(freq, delay = 0, volume = 0.016, duration = 0.75) {
      if (!ensureAudioStarted() || !musicGain || !freq) return;
      const now = audioCtx.currentTime + delay;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      connectMusicSource(osc, gain, filter);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    }


    function startBackgroundMusic() {
      if (!ensureAudioStarted() || musicTimer) return;

      musicStep = 0;
      if (musicGain) {
        // Etwas lauter als vorher, aber weiterhin unter den Spieleffekten.
        musicGain.gain.setTargetAtTime(0.42, audioCtx.currentTime, 0.18);
      }

      // Modal statt poppig: D-Dorisch für Classic, G-Dorisch für Karawane,
      // A-Äolisch/Dunkel für Hardcore. Das wirkt deutlich mittelalterlicher.
      const classicMelody = [
        62, 65, 67, 69, 67, 65, 64, 62,
        60, 62, 65, 67, 69, 72, 69, 67,
        65, 67, 69, 74, 72, 69, 67, 65,
        64, 62, 60, 62, 65, 67, 62, 0
      ];

      const caravanMelody = [
        67, 69, 70, 74, 72, 70, 69, 67,
        65, 67, 69, 70, 72, 74, 72, 70,
        69, 67, 65, 67, 70, 72, 69, 67,
        62, 65, 67, 69, 70, 69, 67, 0
      ];

      const hardcoreMelody = [
        57, 60, 62, 65, 64, 62, 60, 57,
        55, 57, 60, 62, 65, 64, 62, 57,
        57, 62, 64, 65, 69, 67, 65, 64,
        62, 60, 57, 55, 57, 60, 57, 0
      ];

      const classicChordRoots = [50, 50, 55, 50, 53, 50, 48, 50];
      const caravanChordRoots = [55, 55, 58, 55, 60, 58, 55, 53];
      const hardcoreChordRoots = [45, 45, 50, 45, 43, 45, 48, 45];

      const classicDrone = [38, 38, 43, 38];
      const caravanDrone = [43, 43, 46, 43];
      const hardcoreDrone = [33, 33, 38, 31];

      function tickMusic() {
        if (!running || paused) return;

        const step = musicStep++;
        const phraseStep = step % 32;
        const bar = Math.floor(step / 8);
        const isCaravan = gameMode === 'caravan';
        const isHardcore = gameMode === 'hardcore';

        const melody = isCaravan ? caravanMelody : isHardcore ? hardcoreMelody : classicMelody;
        const chordRoots = isCaravan ? caravanChordRoots : isHardcore ? hardcoreChordRoots : classicChordRoots;
        const drones = isCaravan ? caravanDrone : isHardcore ? hardcoreDrone : classicDrone;

        const noteMidi = melody[phraseStep];
        const note = noteMidi ? musicMidi(noteMidi) : 0;
        const chordRoot = musicMidi(chordRoots[Math.floor(phraseStep / 4) % chordRoots.length]);
        const drone = musicMidi(drones[Math.floor(step / 8) % drones.length]);

        // Durchgehender Bordun trägt die Szene wie eine Burg-/Marktplatzmusik.
        if (phraseStep % 8 === 0) {
          playMusicDrone(drone, 0.00, isHardcore ? 0.026 : 0.020, 1.85);
          playMusicDrone(drone * 2, 0.03, isHardcore ? 0.010 : 0.008, 1.20);
        }

        // Laute: kleine Akkordbrecher statt nur Einzelton.
        if (phraseStep % 4 === 0) {
          const intervals = isHardcore ? [0, 7, 10, 12] : [0, 7, 12, 14];
          playMusicChord(chordRoot, intervals, 0.00, isHardcore ? 0.014 : 0.016, 0.44);
        } else if (phraseStep % 2 === 0) {
          playMusicChord(chordRoot, [0, 7, 12], 0.02, 0.010, 0.30);
        }

        // Hauptmelodie: Zupfinstrument + Antwort durch Flöte/Schalmei.
        if (note) {
          playMusicPluck(note, 0.00, isHardcore ? 0.030 : 0.034, 0.26, isHardcore ? 1150 : 1500);

          if (isHardcore) {
            if (phraseStep % 4 === 0 || phraseStep % 8 === 6) {
              playMusicShawm(note * 2, 0.08, 0.013, 0.36);
            }
          } else if (isCaravan) {
            if (phraseStep % 3 === 0) {
              playMusicFlute(note * 2, 0.06, 0.019, 0.46);
            }
            if (phraseStep % 8 === 5) {
              playMusicBell(note * 3, 0.16, 0.010, 0.62);
            }
          } else {
            if (phraseStep % 4 === 0 || phraseStep % 16 === 10) {
              playMusicFlute(note * 2, 0.07, 0.017, 0.42);
            }
          }
        }

        // Rahmentrommel: klarer mittelalterlicher Puls.
        if (isHardcore) {
          if (phraseStep % 2 === 0) playMusicFrameDrum(0.00, 0.040, 104, 0.20);
          if (phraseStep % 8 === 6) playMusicFrameDrum(0.18, 0.030, 142, 0.16);
        } else if (isCaravan) {
          if (phraseStep % 2 === 0) playMusicFrameDrum(0.02, 0.028, 126, 0.18);
          if (phraseStep % 8 === 3 || phraseStep % 8 === 7) playMusicFrameDrum(0.19, 0.017, 170, 0.12);
        } else {
          if (phraseStep % 4 === 0) playMusicFrameDrum(0.02, 0.030, 118, 0.19);
          if (phraseStep % 8 === 6) playMusicFrameDrum(0.18, 0.018, 155, 0.13);
        }

        // Kleine Variation am Phrasenende, damit die Schleife weniger eintönig wirkt.
        if (phraseStep === 30 && !isHardcore) {
          playMusicBell(musicMidi(isCaravan ? 79 : 74), 0.10, 0.013, 0.85);
          playMusicBell(musicMidi(isCaravan ? 82 : 77), 0.22, 0.010, 0.70);
        }
        if (phraseStep === 30 && isHardcore) {
          playMusicShawm(musicMidi(57), 0.08, 0.018, 0.52);
        }

        // Alle vier Takte minimal andere Ziernote.
        if (bar % 4 === 3 && phraseStep === 14 && note) {
          playMusicPluck(note * 1.5, 0.14, 0.014, 0.20, 1350);
        }
      }

      tickMusic();
      musicTimer = setInterval(tickMusic, 430);
    }

    function stopBackgroundMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    }



    function deviceLooksLikeTablet() {
      const ua = navigator.userAgent || '';
      const platform = navigator.platform || '';
      const maxTouch = navigator.maxTouchPoints || 0;
      const hasTouch = maxTouch > 0 || 'ontouchstart' in window;
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      const noFinePointer = window.matchMedia?.('(pointer: fine)').matches === false;
      const minSide = Math.min(window.innerWidth, window.innerHeight);
      const maxSide = Math.max(window.innerWidth, window.innerHeight);

      const isIPad = /iPad/.test(ua) || (platform === 'MacIntel' && maxTouch > 1);
      const isAndroidTablet = /Android/.test(ua) && !/Mobile/.test(ua);
      const isLargeTouch = hasTouch && minSide >= 600 && maxSide >= 900;
      const isCoarseTouch = hasTouch && coarse && maxSide >= 700;

      // Nicht absolut perfekt, aber in Chrome auf Tablets normalerweise zuverlässig.
      // Falls ein Touch-Laptop falsch erkannt wird, bleibt die manuelle PC/Tablet-Auswahl sichtbar.
      return !!(isIPad || isAndroidTablet || isLargeTouch || isCoarseTouch || (hasTouch && noFinePointer));
    }

    function setControlMode(mode) {
      controlMode = mode;
      hud.controlAuto.classList.toggle('selected', mode === 'auto');
      hud.controlPC.classList.toggle('selected', mode === 'pc');
      hud.controlTablet.classList.toggle('selected', mode === 'tablet');

      updateControlProfile();
    }

    function updateControlProfile() {
      const autoDetectedTablet = deviceLooksLikeTablet();
      activeControlMode = controlMode === 'auto'
        ? (autoDetectedTablet ? 'tablet' : 'pc')
        : controlMode;

      touchEnabled = activeControlMode === 'tablet';
      keyboardEnabled = activeControlMode === 'pc' || controlMode === 'auto';

      if (hud.touchControls) {
        hud.touchControls.classList.toggle('visible', running && touchEnabled);
      }

      if (hud.pcControlsHelp && hud.tabletControlsHelp) {
        hud.pcControlsHelp.classList.toggle('visible', activeControlMode === 'pc');
        hud.tabletControlsHelp.classList.toggle('visible', activeControlMode === 'tablet');
      }

      if (hud.detectedControlBadge) {
        if (controlMode === 'auto') {
          hud.detectedControlBadge.textContent = autoDetectedTablet
            ? t('control.badge.autoTablet')
            : t('control.badge.autoPc');
        } else if (controlMode === 'tablet') {
          hud.detectedControlBadge.textContent = t('control.badge.manualTablet');
        } else {
          hud.detectedControlBadge.textContent = t('control.badge.manualPc');
        }
      }

      if (hud.controlInfo) {
        if (activeControlMode === 'tablet') {
          hud.controlInfo.textContent = controlMode === 'auto'
            ? t('control.info.tabletAuto')
            : t('control.info.tabletManual');
        } else {
          hud.controlInfo.textContent = controlMode === 'auto'
            ? t('control.info.pcAuto')
            : t('control.info.pcManual');
        }
      }

      if (!touchEnabled) {
        resetTouchState();
      }
    }

    function resetTouchState() {
      touchMove.active = false;
      touchMove.id = null;
      touchMove.x = 0;
      touchMove.y = 0;
      touchMove.strength = 0;

      touchLook.active = false;
      touchLook.id = null;

      touchButtons.attack = false;
      touchButtons.block = false;
      touchButtons.sprint = false;

      if (hud.moveStick) {
        hud.moveStick.style.transform = 'translate(0px, 0px)';
      }

      document.querySelectorAll('.touchBtn.active').forEach(btn => btn.classList.remove('active'));
    }

    function touchPointFromEvent(e, identifier) {
      for (const t of e.changedTouches || []) {
        if (t.identifier === identifier) return t;
      }
      for (const t of e.touches || []) {
        if (t.identifier === identifier) return t;
      }
      return null;
    }

    function updateMovePadFromTouch(touch) {
      const rect = hud.movePad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const max = rect.width * 0.36;

      let dx = touch.clientX - cx;
      let dy = touch.clientY - cy;
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(max, len);

      if (len > 0.001) {
        dx = dx / len * clamped;
        dy = dy / len * clamped;
      }

      touchMove.x = dx / max;
      touchMove.y = dy / max;
      touchMove.strength = Math.min(1, len / max);

      if (hud.moveStick) {
        hud.moveStick.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    }


    function getSpecialActionLabel() {
      if (gameMode === 'caravan') return t('special.special');

      const nearHorse = unlockedHorse && horse.visible && player.pos.distanceTo(horse.position) < 4.2;
      const nearCatapult = unlockedCatapult && catapult.group.visible && player.pos.distanceTo(catapult.group.position) <= 7.5;

      if (nearCatapult && catapultLoaded && catapultCooldown <= 0) return t('special.catapult');
      if (player.mounted) return t('special.dismount');
      if (nearHorse) return t('special.horse');
      if (nearCatapult && player.carryingStone && !catapultLoaded) return t('special.load');
      return t('special.special');
    }

    function useSpecialAction() {
      if (gameMode === 'caravan') {
        showMessage(t('msg.touchHint'));
        return;
      }

      const nearCatapult = unlockedCatapult && catapult.group.visible && player.pos.distanceTo(catapult.group.position) <= 7.5;
      if (nearCatapult && catapultLoaded && catapultCooldown <= 0) {
        fireCatapult();
        return;
      }

      if (player.mounted || (unlockedHorse && horse.visible && player.pos.distanceTo(horse.position) < 4.2)) {
        toggleMount();
        return;
      }

      if (nearCatapult && player.carryingStone && !catapultLoaded) {
        interact();
        return;
      }

      if (unlockedCatapult && catapult.group.visible && player.pos.distanceTo(catapult.group.position) <= 7.5) {
        fireCatapult();
        return;
      }

      showMessage(t('msg.noSpecial'));
    }

    function updateTouchButtonLabels() {
      if (!hud.touchControls) return;

      if (hud.touchSpecialBtn) {
        hud.touchSpecialBtn.textContent = getSpecialActionLabel();
      }

      if (hud.touchActionBtn) {
        if (gameMode === 'caravan') {
          hud.touchActionBtn.textContent = t('touchBtn.action');
        } else {
          const nearStone = nearestStone();
          const nearCatapult = unlockedCatapult && catapult.group.visible && player.pos.distanceTo(catapult.group.position) < 5.8;
          if (!player.carryingStone && nearStone && player.pos.distanceTo(nearStone.mesh.position) < 2.4) {
            hud.touchActionBtn.textContent = t('touchBtn.stone');
          } else if (nearCatapult && player.carryingStone && !catapultLoaded) {
            hud.touchActionBtn.textContent = t('touchBtn.load');
          } else {
            hud.touchActionBtn.textContent = t('touchBtn.action');
          }
        }
      }

      if (hud.touchWeaponBtn) {
        const showWeapon = gameMode !== 'caravan' && unlockedBow;
        hud.touchWeaponBtn.classList.toggle('hidden', !showWeapon);
      }
    }


    function setupTouchControls() {
      if (!hud.movePad || !hud.lookArea) return;

      hud.movePad.addEventListener('touchstart', e => {
        if (!touchEnabled) return;
        e.preventDefault();
        const t = e.changedTouches[0];
        touchMove.active = true;
        touchMove.id = t.identifier;
        updateMovePadFromTouch(t);
      }, { passive: false });

      hud.movePad.addEventListener('touchmove', e => {
        if (!touchEnabled || touchMove.id === null) return;
        e.preventDefault();
        const t = touchPointFromEvent(e, touchMove.id);
        if (t) updateMovePadFromTouch(t);
      }, { passive: false });

      function endMove(e) {
        if (touchMove.id === null) return;
        const t = touchPointFromEvent(e, touchMove.id);
        if (!t && e.changedTouches?.length) {
          for (const changed of e.changedTouches) {
            if (changed.identifier === touchMove.id) {
              touchMove.active = false;
              touchMove.id = null;
              touchMove.x = 0;
              touchMove.y = 0;
              touchMove.strength = 0;
              if (hud.moveStick) hud.moveStick.style.transform = 'translate(0px, 0px)';
              break;
            }
          }
        }
      }

      hud.movePad.addEventListener('touchend', endMove, { passive: false });
      hud.movePad.addEventListener('touchcancel', endMove, { passive: false });

      hud.lookArea.addEventListener('touchstart', e => {
        if (!touchEnabled) return;
        e.preventDefault();
        const t = e.changedTouches[0];
        touchLook.active = true;
        touchLook.id = t.identifier;
        touchLook.x = t.clientX;
        touchLook.y = t.clientY;
      }, { passive: false });

      hud.lookArea.addEventListener('touchmove', e => {
        if (!touchEnabled || touchLook.id === null) return;
        e.preventDefault();
        const t = touchPointFromEvent(e, touchLook.id);
        if (!t) return;

        const dx = t.clientX - touchLook.x;
        const dy = t.clientY - touchLook.y;
        touchLook.x = t.clientX;
        touchLook.y = t.clientY;

        viewYaw -= dx * 0.0065;
        cameraPitch = THREE.MathUtils.clamp(cameraPitch - dy * 0.0038, -0.75, 0.55);
      }, { passive: false });

      function endLook(e) {
        if (touchLook.id === null) return;
        for (const changed of e.changedTouches || []) {
          if (changed.identifier === touchLook.id) {
            touchLook.active = false;
            touchLook.id = null;
            break;
          }
        }
      }

      hud.lookArea.addEventListener('touchend', endLook, { passive: false });
      hud.lookArea.addEventListener('touchcancel', endLook, { passive: false });

      document.querySelectorAll('.touchBtn').forEach(btn => {
        const action = btn.dataset.touch;

        btn.addEventListener('touchstart', e => {
          if (!touchEnabled) return;
          e.preventDefault();
          btn.classList.add('active');

          if (action === 'attack') touchButtons.attack = true;
          else if (action === 'block') touchButtons.block = true;
          else if (action === 'interact') interact();
          else if (action === 'special') useSpecialAction();
          else if (action === 'weapon') toggleWeapon();
          else if (action === 'potion') useHealingPotion();
          else if (action === 'pause') togglePause();
        }, { passive: false });

        const endButton = e => {
          if (!touchEnabled) return;
          e.preventDefault();
          btn.classList.remove('active');

          if (action === 'attack') touchButtons.attack = false;
          else if (action === 'block') touchButtons.block = false;
        };

        btn.addEventListener('touchend', endButton, { passive: false });
        btn.addEventListener('touchcancel', endButton, { passive: false });
      });
    }


    function setGameMode(mode) {
      gameMode = mode;
      hud.modeEasy.classList.toggle('selected', mode === 'easy');
      hud.modeHardcore.classList.toggle('selected', mode === 'hardcore');
      hud.modeCaravan.classList.toggle('selected', mode === 'caravan');

      if (mode === 'easy') {
        hud.modeInfo.textContent = t('mode.info.easy');
      } else if (mode === 'hardcore') {
        hud.modeInfo.textContent = t('mode.info.hardcore');
      } else {
        hud.modeInfo.textContent = t('mode.info.caravan');
      }
    }

    function createCampBoundary() {
      if (campBoundaryGroup) scene.remove(campBoundaryGroup);

      campBoundaryGroup = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.86 });

      const width = campBounds.xMax - campBounds.xMin;
      const depth = campBounds.zMax - campBounds.zMin;
      const cx = (campBounds.xMin + campBounds.xMax) / 2;
      const cz = (campBounds.zMin + campBounds.zMax) / 2;

      function addLine(x, z, sx, sz) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.08, sz), mat);
        line.position.set(x, 0.08, z);
        campBoundaryGroup.add(line);
      }

      addLine(cx, campBounds.zMin, width, 0.42);
      addLine(cx, campBounds.zMax, width, 0.42);
      addLine(campBounds.xMin, cz, 0.42, depth);
      addLine(campBounds.xMax, cz, 0.42, depth);

      const warningMat = new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.10 });
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), warningMat);
      fill.rotation.x = -Math.PI / 2;
      fill.position.set(cx, 0.035, cz);
      campBoundaryGroup.add(fill);

      campBoundaryGroup.visible = false;
      scene.add(campBoundaryGroup);
    }

    function updateCampBoundaryVisibility() {
      if (campBoundaryGroup) campBoundaryGroup.visible = running && gameMode === 'hardcore';
    }

    function isInsideCampBounds(pos) {
      return pos.x >= campBounds.xMin && pos.x <= campBounds.xMax &&
             pos.z >= campBounds.zMin && pos.z <= campBounds.zMax;
    }

    function setupLights() {
      const hemi = new THREE.HemisphereLight(0xc7dbea, 0x4c3a24, 1.02);
      scene.add(hemi);

      const sun = new THREE.DirectionalLight(0xffe4b0, 1.42);
      sun.position.set(50, 78, -32);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -95;
      sun.shadow.camera.right = 95;
      sun.shadow.camera.top = 95;
      sun.shadow.camera.bottom = -95;
      scene.add(sun);
    }

    function setupWorld() {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(190, 190),
        makeMaterial('grass', 0xffffff, { roughness: 0.96 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      const path = new THREE.Mesh(
        new THREE.PlaneGeometry(42, 175),
        makeMaterial('dirt', 0xffffff, { roughness: 1 })
      );
      path.rotation.x = -Math.PI / 2;
      path.position.y = 0.012;
      path.position.z = 4;
      path.receiveShadow = true;
      scene.add(path);

      for (let i = 0; i < 42; i++) {
        const scale = THREE.MathUtils.randFloat(0.8, 1.8);
        const bush = new THREE.Mesh(
          new THREE.DodecahedronGeometry(scale, 0),
          new THREE.MeshStandardMaterial({ color: 0x31552a, roughness: 0.8 })
        );
        bush.position.set(
          THREE.MathUtils.randFloatSpread(170),
          0.5,
          THREE.MathUtils.randFloatSpread(170)
        );
        if (Math.abs(bush.position.x) < 26 && Math.abs(bush.position.z) < 76) {
          bush.position.x += Math.sign(bush.position.x || 1) * 30;
        }
        bush.castShadow = true;
        bush.receiveShadow = true;
        scene.add(bush);
      }

      for (let i = 0; i < 18; i++) {
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(THREE.MathUtils.randFloat(0.45, 1.25), 0),
          makeMaterial('stone', 0xffffff, { roughness: 0.95 })
        );
        rock.position.set(
          THREE.MathUtils.randFloatSpread(150),
          THREE.MathUtils.randFloat(0.25, 0.65),
          THREE.MathUtils.randFloatSpread(150)
        );
        if (Math.abs(rock.position.x) < 18 && Math.abs(rock.position.z) < 65) rock.position.x += 20;
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
      }

      // Kisten/Barrikaden auf deiner Seite sind jetzt blau markiert.
      for (let i = 0; i < 8; i++) {
        const barricade = new THREE.Group();

        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 1.55, 1.8),
          makeMaterial('wood', 0xffffff, { roughness: 0.84 })
        );
        crate.position.y = 0.78;
        crate.castShadow = true;
        crate.receiveShadow = true;
        barricade.add(crate);

        const blueCloth = new THREE.Mesh(
          new THREE.BoxGeometry(1.95, 0.22, 1.95),
          makeMaterial('clothBlue', 0xffffff, { roughness: 0.74 })
        );
        blueCloth.position.y = 1.62;
        blueCloth.castShadow = true;
        barricade.add(blueCloth);

        barricade.position.set(i < 4 ? -26 + i * 3.2 : 26 - (i-4) * 3.2, 0, -20 + (i % 4) * 5.2);
        scene.add(barricade);
        addStaticObstacle(barricade.position.x, barricade.position.z, 1.85, 'blaue Barrikade');
      }

      // Alle Zelte im Lager sind blau.
      for (let side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const tent = new THREE.Group();
          const roof = new THREE.Mesh(
            new THREE.ConeGeometry(2.6, 2.8, 4),
            makeMaterial('clothBlue', 0xffffff, { roughness: 0.84 })
          );
          roof.rotation.y = Math.PI * 0.25;
          roof.position.y = 2.1;
          roof.castShadow = true;
          tent.add(roof);

          const base = new THREE.Mesh(
            new THREE.BoxGeometry(3.8, 0.25, 3.8),
            makeMaterial('wood', 0xffffff, { roughness: 0.9 })
          );
          base.position.y = 0.15;
          tent.add(base);

          const smallFlag = createBanner(0x2f73ff);
          smallFlag.scale.setScalar(0.45);
          smallFlag.position.set(1.6, 0, 1.35);
          tent.add(smallFlag);

          tent.position.set(side * 18, 0, -34 + i * 9.5);
          scene.add(tent);
          addStaticObstacle(tent.position.x, tent.position.z, 2.65, 'blaues Zelt');
        }
      }

      // Rechts/links auf dem Feld stehen nur blaue Flaggen.
      for (let i = 0; i < 12; i++) {
        const banner = createBanner(0x2f73ff);
        banner.position.set(i % 2 ? -34 : 34, 0, -56 + i * 13);
        scene.add(banner);
        addStaticObstacle(banner.position.x, banner.position.z, 0.85, 'blaue Flagge');
      }

      // Nur die Burg ist rot markiert.
      const keep = new THREE.Mesh(
        new THREE.BoxGeometry(24, 15, 10),
        makeMaterial('stone', 0xffffff, { roughness: 0.9 })
      );
      keep.position.set(0, 7.5, 82);
      keep.castShadow = true;
      keep.receiveShadow = true;
      scene.add(keep);

      const redCastleFront = new THREE.Mesh(
        new THREE.BoxGeometry(24.3, 15.2, 0.22),
        makeMaterial('clothRed', 0xffffff, { roughness: 0.86 })
      );
      redCastleFront.position.set(0, 7.6, 76.62);
      redCastleFront.castShadow = true;
      scene.add(redCastleFront);

      const gate = new THREE.Mesh(
        new THREE.BoxGeometry(9, 8, 1),
        makeMaterial('wood', 0xffffff, { roughness: 0.8 })
      );
      gate.position.set(0, 4, 76.48);
      gate.castShadow = true;
      scene.add(gate);

      for (let x of [-9.2, 9.2]) {
        const redTowerBanner = createBanner(0xc9302c);
        redTowerBanner.position.set(x, 0, 75.5);
        redTowerBanner.scale.setScalar(0.85);
        scene.add(redTowerBanner);
        addStaticObstacle(redTowerBanner.position.x, redTowerBanner.position.z, 0.85, 'rote Burgflagge');
      }

      addStaticObstacle(0, 82, 13.5, 'rote Burg');
      addStaticObstacle(0, 76.5, 5.0, 'Burgtor');
    }

    function createBanner(color, side = null) {
      const group = new THREE.Group();

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 7, 10),
        makeMaterial('wood', 0xffffff, { roughness: 0.76 })
      );
      pole.position.y = 3.5;
      pole.castShadow = true;
      group.add(pole);

      const bannerColor = color instanceof THREE.Color ? color.getHex() : color;
      const cloth = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 1.6, 0.08),
        makeMaterial('clothBlue', bannerColor, { roughness: 0.72 })
      );
      cloth.position.set(1.25, 5.4, 0);
      cloth.castShadow = true;
      group.add(cloth);

      if (side) {
        // Richtiges Wappen auf der Flagge: Spieler = gewähltes Wappen, Feind = Feindwappen.
        const symbolGroup = new THREE.Group();
        symbolGroup.position.set(1.25, 3.62, 0.105);
        symbolGroup.scale.set(0.82, 0.82, 0.82);
        addHeraldrySymbol(symbolGroup, side, 'front');
        group.add(symbolGroup);
      } else {
        const emblem = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.55, 0.09),
          new THREE.MeshStandardMaterial({ color: 0xf4df9d, roughness: 0.6 })
        );
        emblem.position.set(1.25, 5.4, 0.06);
        group.add(emblem);
      }

      return group;
    }

    function createKnight(color, isPlayer = false, side = 'enemy') {
      const group = new THREE.Group();

      const clothKind = side === 'enemy' ? 'clothRed' : 'clothBlue';
      const metal = makeMaterial('metal', 0xffffff, { metalness: 0.55, roughness: 0.34 });
      const darkMetal = makeMaterial('metal', 0x70757a, { metalness: 0.62, roughness: 0.46 });
      const cloth = makeMaterial(clothKind, side === 'enemy' ? new THREE.Color(enemyHeraldryColor) : new THREE.Color(heraldryColor), { roughness: 0.72 });
      const trim = new THREE.MeshStandardMaterial({ color: side === 'enemy' ? 0x7b1515 : 0xf5d37b, roughness: 0.55 });
      const leather = makeMaterial('leather', 0xffffff, { roughness: 0.82 });
      const gold = new THREE.MeshStandardMaterial({ color: 0xd0a84b, metalness: 0.45, roughness: 0.35 });

      function makeAnimatedLeg(x) {
        const legGroup = new THREE.Group();
        legGroup.position.set(x, 1.18, 0);

        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 8), darkMetal);
        upper.position.y = -0.26;
        upper.castShadow = true;
        legGroup.add(upper);

        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), metal);
        knee.position.y = -0.56;
        knee.scale.set(1.0, 0.74, 1.0);
        knee.castShadow = true;
        legGroup.add(knee);

        const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.34, 4, 8), darkMetal);
        shin.position.y = -0.88;
        shin.castShadow = true;
        legGroup.add(shin);

        const ankle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.15, 0.28), metal);
        ankle.position.y = -1.16;
        ankle.castShadow = true;
        legGroup.add(ankle);

        const foot = new THREE.Group();
        foot.position.set(0, -1.1, 0.2);
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.58), leather);
        boot.castShadow = true;
        foot.add(boot);
        const toe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.15, 0.26), leather);
        toe.position.set(0, 0, 0.38);
        foot.add(toe);
        legGroup.add(foot);

        group.add(legGroup);
        return { group: legGroup, foot };
      }

      const leftLegData = makeAnimatedLeg(-0.32);
      const rightLegData = makeAnimatedLeg(0.32);
      const leftLeg = leftLegData.group;
      const rightLeg = rightLegData.group;
      const leftBoot = leftLegData.foot;
      const rightBoot = rightLegData.foot;

      const hipPlate = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.28, 0.72), darkMetal);
      hipPlate.position.y = 1.12;
      hipPlate.castShadow = true;
      group.add(hipPlate);

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 0.82, 6, 12), metal);
      body.position.y = 1.95;
      body.scale.z = 0.88;
      body.castShadow = true;
      group.add(body);

      const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.15, 0.5), metal);
      chestPlate.position.set(0, 1.92, 0.13);
      chestPlate.castShadow = true;
      group.add(chestPlate);

      const frontTabard = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.55, 0.08), cloth);
      frontTabard.position.set(0, 1.58, 0.39);
      frontTabard.castShadow = true;
      group.add(frontTabard);

      const backTabard = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.18, 0.08), cloth);
      backTabard.position.set(0, 1.63, -0.38);
      backTabard.castShadow = true;
      group.add(backTabard);

      const belt = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.15, 0.85), leather);
      belt.position.y = 1.52;
      belt.castShadow = true;
      group.add(belt);

      addHeraldrySymbol(group, side, 'front');

      function makeArm(sideMul) {
        const armGroup = new THREE.Group();
        armGroup.position.set(0.78 * sideMul, 2.05, 0);

        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.32, 4, 8), metal);
        upper.rotation.z = sideMul * 0.08;
        upper.position.y = -0.18;
        armGroup.add(upper);

        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), darkMetal);
        elbow.position.y = -0.45;
        armGroup.add(elbow);

        const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.34, 4, 8), darkMetal);
        lower.position.y = -0.72;
        armGroup.add(lower);

        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), leather);
        hand.position.set(0, -1.02, 0.06);
        hand.scale.set(1.15, 0.9, 0.9);
        armGroup.add(hand);

        const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 12), metal);
        pauldron.position.set(0, 0.05, 0);
        pauldron.scale.set(1.22, 0.7, 1.0);
        armGroup.add(pauldron);

        group.add(armGroup);
        return armGroup;
      }

      const leftArm = makeArm(-1);
      const rightArm = makeArm(1);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 18), metal);
      head.position.y = 2.83;
      head.scale.z = 0.94;
      head.castShadow = true;
      group.add(head);

      const helmetCrest = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.55), metal);
      helmetCrest.position.set(0, 3.23, 0);
      group.add(helmetCrest);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.13, 0.08), darkMetal);
      visor.position.set(0, 2.9, 0.39);
      group.add(visor);

      const noseGuard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.06), darkMetal);
      noseGuard.position.set(0, 2.75, 0.43);
      group.add(noseGuard);

      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 1.25, 0.85),
        makeMaterial(clothKind, side === 'enemy' ? new THREE.Color(enemyHeraldryColor) : new THREE.Color(heraldryColor), { roughness: 0.62 })
      );
      shield.position.set(-0.9, 1.72, 0.14);
      shield.castShadow = true;
      group.add(shield);

      const shieldBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.24, 16), metal);
      shieldBoss.rotation.z = Math.PI / 2;
      shieldBoss.position.set(-0.98, 1.8, 0.14);
      group.add(shieldBoss);

      addHeraldrySymbol(group, side, 'shield');

      const swordGroup = new THREE.Group();
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 10), leather);
      hilt.position.y = -0.32;
      swordGroup.add(hilt);

      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), gold);
      pommel.position.y = -0.52;
      swordGroup.add(pommel);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1.45, 0.08),
        makeMaterial('metal', 0xffffff, { metalness: 0.78, roughness: 0.2 })
      );
      blade.position.y = 0.42;
      blade.castShadow = true;
      swordGroup.add(blade);

      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.1, 0.11), gold);
      guard.position.y = -0.05;
      swordGroup.add(guard);

      swordGroup.position.set(0.9, 1.52, 0.18);
      swordGroup.rotation.z = -0.4;
      swordGroup.rotation.x = -0.05;
      group.add(swordGroup);

      group.userData.sword = swordGroup;
      group.userData.shield = shield;
      group.userData.leftLeg = leftLeg;
      group.userData.rightLeg = rightLeg;
      group.userData.leftBoot = leftBoot;
      group.userData.rightBoot = rightBoot;
      group.userData.leftArm = leftArm;
      group.userData.rightArm = rightArm;

      if (isPlayer) {
        const plume = new THREE.Mesh(
          new THREE.ConeGeometry(0.13, 0.55, 8),
          new THREE.MeshStandardMaterial({ color: 0xffd760, roughness: 0.55 })
        );
        plume.position.set(0, 3.42, 0);
        group.add(plume);

        const bow = new THREE.Group();
        const bowMat = makeMaterial('wood', 0xffffff, { roughness: 0.72 });
        const stringMat = new THREE.MeshBasicMaterial({ color: 0xf8e6b0 });

        const upperBow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.10), bowMat);
        upperBow.position.y = 0.42;
        upperBow.rotation.z = -0.18;
        bow.add(upperBow);

        const lowerBow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.10), bowMat);
        lowerBow.position.y = -0.42;
        lowerBow.rotation.z = 0.18;
        bow.add(lowerBow);

        const string = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.72, 0.035), stringMat);
        string.position.x = 0.28;
        bow.add(string);

        bow.position.set(0.86, 1.85, -0.46);
        bow.rotation.z = 0.25;
        bow.rotation.y = 0.25;
        bow.visible = false;
        group.add(bow);
        group.userData.bow = bow;
      }

      group.traverse(o => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      return group;
    }

    function createHorse() {
      const group = new THREE.Group();
      const fur = makeMaterial('furBrown', 0xffffff, { roughness: 0.84 });
      const dark = makeMaterial('furBrown', 0x4c301b, { roughness: 0.9 });
      const saddleMat = makeMaterial('leather', 0x2b426e, { roughness: 0.76 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.26, 2.82), fur);
      body.position.y = 1.26;
      body.castShadow = true;
      group.add(body);

      const chest = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.02, 0.58), fur);
      chest.position.set(0, 1.32, 1.22);
      chest.castShadow = true;
      group.add(chest);

      const hind = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.96, 0.52), fur);
      hind.position.set(0, 1.22, -1.08);
      hind.castShadow = true;
      group.add(hind);

      const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.72, 4, 8), fur);
      neck.position.set(0, 1.86, 1.55);
      neck.rotation.x = -0.38;
      neck.castShadow = true;
      group.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.58, 0.88), fur);
      head.position.set(0, 2.24, 2.05);
      head.castShadow = true;
      group.add(head);

      const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.34, 0.48), fur);
      muzzle.position.set(0, 2.1, 2.58);
      muzzle.castShadow = true;
      group.add(muzzle);

      const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), dark);
      leftEar.position.set(-0.15, 2.62, 2.08);
      leftEar.rotation.x = -0.12;
      group.add(leftEar);

      const rightEar = leftEar.clone();
      rightEar.position.x = 0.15;
      group.add(rightEar);

      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.02, 0.28), dark);
      mane.position.set(0, 2.04, 1.3);
      mane.castShadow = true;
      group.add(mane);

      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.05, 0.22), dark);
      tail.position.set(0, 1.28, -1.74);
      tail.rotation.x = 0.65;
      tail.castShadow = true;
      group.add(tail);

      const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.24, 1.22), saddleMat);
      saddle.position.set(0, 1.92, -0.04);
      saddle.castShadow = true;
      group.add(saddle);

      const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 1.32), makeMaterial('clothBlue', 0xffffff, { roughness: 0.78 }));
      blanket.position.set(0, 1.79, -0.04);
      blanket.castShadow = true;
      group.add(blanket);

      const horseLegs = [];
      for (let x of [-0.34, 0.34]) {
        for (let z of [-0.88, 0.84]) {
          const legGroup = new THREE.Group();

          const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.38, 4, 8), dark);
          upper.position.y = -0.28;
          legGroup.add(upper);

          const knee = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8), fur);
          knee.position.y = -0.54;
          legGroup.add(knee);

          const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 4, 8), dark);
          lower.position.y = -0.86;
          legGroup.add(lower);

          const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.22), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
          hoof.position.y = -1.16;
          legGroup.add(hoof);

          legGroup.position.set(x, 1.02, z);
          group.add(legGroup);
          horseLegs.push(legGroup);
        }
      }

      group.userData.mountable = true;
      group.userData.legs = horseLegs;
      group.userData.movePhase = 0;
      return group;
    }

    function createCatapult() {
      const group = new THREE.Group();
      const wood = makeMaterial('wood', 0xffffff, { roughness: 0.82 });
      const rope = new THREE.MeshStandardMaterial({ color: 0xc4a66b, roughness: 0.9 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(5, 0.55, 4), wood);
      base.position.y = 0.3;
      base.castShadow = true;
      group.add(base);

      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.9, 12), rope);
      axle.rotation.z = Math.PI / 2;
      axle.position.y = 1.7;
      axle.castShadow = true;
      group.add(axle);

      const arm = new THREE.Group();
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 6.5), wood);
      beam.position.z = 0.7;
      beam.castShadow = true;
      arm.add(beam);

      const bucket = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.2), wood);
      bucket.position.z = 4.0;
      bucket.position.y = 0.15;
      bucket.castShadow = true;
      arm.add(bucket);

      const weight = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.2), makeMaterial('stone', 0xffffff, { roughness: 0.95 }));
      weight.position.z = -2.7;
      weight.position.y = -0.5;
      weight.castShadow = true;
      arm.add(weight);

      arm.position.y = 1.7;
      arm.rotation.x = 0.42;
      group.add(arm);

      for (const x of [-2.0, 2.0]) {
        for (const z of [-1.55, 1.55]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.32, 16), wood);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(x, 0.38, z);
          wheel.castShadow = true;
          group.add(wheel);
        }
      }

      group.traverse(o => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      return { group, arm };
    }

    function spawnStones() {
      for (const s of stones) scene.remove(s.mesh);
      stones.length = 0;

      for (let i = 0; i < 15; i++) {
        addStone(
          THREE.MathUtils.randFloat(-38, 38),
          THREE.MathUtils.randFloat(-40, 18)
        );
      }
    }

    function addStone(x, z) {
      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55 + Math.random() * 0.18, 0),
        makeMaterial('stone', 0xffffff, { roughness: 0.96 })
      );
      mesh.position.set(x, 0.45, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      stones.push({ mesh });
    }

    function spawnAllies() {
      for (const ally of allies) scene.remove(ally.group);
      allies.length = 0;

      for (let i = 0; i < 4 + upgradeStats.extraAllies; i++) {
        const group = createKnight(heraldryColor, false, 'ally');
        group.position.copy(freeCampSpawnPosition());
        scene.add(group);

        const allyHealth = (gameMode === 'hardcore' ? 100 : 80) + upgradeStats.allyHealthBonus;
        const allyGuard = (gameMode === 'hardcore' ? 100 : 65) + upgradeStats.allyGuardBonus;

        allies.push({
          group,
          pos: group.position,
          health: allyHealth,
          maxHealth: allyHealth,
          attackCooldown: (2.2 + Math.random() * 1.4) * upgradeStats.allyCooldownMultiplier,
          blockTimer: 0,
          blockCooldown: Math.random() * 1.2,
          guard: allyGuard,
          maxGuard: allyGuard,
          shieldRechargeTimer: 0,
          shieldBroken: false,
          speed: 3.8 + upgradeStats.allySpeedBonus,
          movePhase: Math.random() * 10,
          active: true,
          reviveTimer: 0
        });
      }
    }


    function clearCaravanModeObjects() {
      if (caravanGroup) {
        scene.remove(caravanGroup);
        caravanGroup = null;
      }

      caravanPickups.length = 0;
      caravanAmbushes.length = 0;
      caravanFinished = false;
      caravanCollected = 0;
      caravanTotal = 0;
      caravanTrail.length = 0;

      for (let i = staticObstacles.length - 1; i >= 0; i--) {
        if (staticObstacles[i].mode === 'caravan') staticObstacles.splice(i, 1);
      }
    }

    function createVillageHouse(x, z, w = 4, d = 4, roofColor = 0x8b3e2f) {
      const group = new THREE.Group();

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(w, 3.2, d),
        makeMaterial('stone', 0xffffff, { roughness: 0.92 })
      );
      base.position.y = 1.6;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.2, 4),
        new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.82 })
      );
      roof.position.y = 4.15;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 1.55, 0.08),
        makeMaterial('wood', 0xffffff, { roughness: 0.84 })
      );
      door.position.set(0, 0.82, d / 2 + 0.045);
      group.add(door);

      group.position.set(x, 0, z);
      caravanGroup.add(group);
      addStaticObstacle(x, z, Math.max(w, d) * 0.62, 'Dorfhaus', 'caravan');
      return group;
    }

    function createRouteArrow(x, z, yaw = 0) {
      const arrow = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xffdf64, transparent: true, opacity: 0.9 });

      const head = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.7, 3), mat);
      head.rotation.x = Math.PI / 2;
      head.rotation.z = yaw;
      head.position.set(0, 0.08, 0.55);
      arrow.add(head);

      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 1.6), mat);
      tail.position.set(0, 0.08, -0.45);
      tail.rotation.y = yaw;
      arrow.add(tail);

      arrow.position.set(x, 0.03, z);
      caravanGroup.add(arrow);
      return arrow;
    }

    function createVillageGate() {
      const gate = new THREE.Group();
      const wood = makeMaterial('wood', 0xffffff, { roughness: 0.84 });

      for (const x of [-4.8, 4.8]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(1.0, 5.2, 1.0), wood);
        post.position.set(x, 2.6, -58);
        post.castShadow = true;
        gate.add(post);
        addStaticObstacle(x, -58, 0.9, 'Dorftor-Pfosten', 'caravan');
      }

      const beam = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.7, 1.0), wood);
      beam.position.set(0, 5.1, -58);
      beam.castShadow = true;
      gate.add(beam);

      const sign = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.0, 0.25), makeMaterial('clothBlue', 0xffffff, { roughness: 0.7 }));
      sign.position.set(0, 3.7, -58.62);
      gate.add(sign);

      caravanGroup.add(gate);
    }

    function createCaravanGoalCastle() {
      const castle = new THREE.Group();

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(18, 10, 9),
        makeMaterial('stone', 0xffffff, { roughness: 0.9 })
      );
      base.position.set(0, 5, 54);
      base.castShadow = true;
      base.receiveShadow = true;
      castle.add(base);

      const gate = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 5.8, 0.4),
        makeMaterial('wood', 0xffffff, { roughness: 0.82 })
      );
      gate.position.set(0, 2.9, 49.3);
      castle.add(gate);

      for (const x of [-7, 7]) {
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(2.1, 2.3, 12, 12),
          makeMaterial('stone', 0xffffff, { roughness: 0.9 })
        );
        tower.position.set(x, 6, 51);
        tower.castShadow = true;
        castle.add(tower);
      }

      const banner = createBanner(new THREE.Color(heraldryColor).getHex(), 'ally');
      banner.position.set(-2.2, 0, 48.8);
      banner.scale.setScalar(0.75);
      castle.add(banner);

      caravanGroup.add(castle);
      addStaticObstacle(-7, 51, 2.3, 'Burg-Turm', 'caravan');
      addStaticObstacle(7, 51, 2.3, 'Burg-Turm', 'caravan');
      addStaticObstacle(0, 56, 9.2, 'Burgmauer', 'caravan');
    }

    function createCaravanPickup(x, z) {
      const group = createKnight(heraldryColor, false, 'ally');
      group.position.set(x, 0, z);
      group.rotation.y = Math.PI;
      scene.add(group);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.3, 0.04, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x69e0ff, transparent: true, opacity: 0.75 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.08;
      group.add(ring);

      caravanPickups.push({ group, collected: false, ring });
      caravanTotal = caravanPickups.length;
    }

    function spawnCaravanEnemy(type, x, z) {
      const data = enemyData(type);
      const group = createKnight(enemyHeraldryColor, false, 'enemy');
      group.scale.setScalar(data.scale);
      group.position.set(x, 0, z);
      scene.add(group);

      enemies.push({
        group,
        pos: group.position,
        type,
        health: data.health,
        maxHealth: data.health,
        speed: data.speed,
        attackRange: data.range,
        attackDamage: data.damage,
        attackCooldown: THREE.MathUtils.randFloat(1.0, 2.0),
        blockTimer: 0,
        blockCooldown: THREE.MathUtils.randFloat(0.6, 1.8),
        guard: data.guard,
        maxGuard: data.guard,
        shieldRechargeTimer: 0,
        shieldBroken: false,
        movePhase: Math.random() * 10,
        moving: false,
        score: data.score,
        radius: data.radius
      });
    }

    function triggerCaravanAmbush(ambush) {
      ambush.triggered = true;
      showMessage(t('msg.caravanAmbush'));

      for (let i = 0; i < ambush.count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const x = side * THREE.MathUtils.randFloat(8, 15);
        const z = ambush.z + THREE.MathUtils.randFloat(-4, 5);
        const type = i === 0 && ambush.strong ? 'shield' : (Math.random() < 0.35 ? 'spear' : 'simple');
        spawnCaravanEnemy(type, x, z);
      }
    }


    function resetCaravanTrail() {
      caravanTrail.length = 0;
      lastTrailRecord.copy(player.pos);
      for (let i = 0; i < 160; i++) {
        caravanTrail.push(player.pos.clone());
      }
    }

    function recordCaravanTrail() {
      if (player.pos.distanceTo(lastTrailRecord) < 0.45) return;

      caravanTrail.unshift(player.pos.clone());
      lastTrailRecord.copy(player.pos);

      if (caravanTrail.length > 260) {
        caravanTrail.length = 260;
      }
    }

    function getCaravanTrailPoint(index) {
      if (caravanTrail.length === 0) return player.pos.clone();
      const i = THREE.MathUtils.clamp(index, 0, caravanTrail.length - 1);
      return caravanTrail[i].clone();
    }

    function nearestEnemyToPosition(pos, maxDistance = 4.2) {
      let best = null;
      let bestDist = maxDistance * maxDistance;
      for (const enemy of enemies) {
        const d = enemy.pos.distanceToSquared(pos);
        if (d < bestDist) {
          bestDist = d;
          best = enemy;
        }
      }
      return best;
    }

    function findNearbySafeFormationSpot(target, unit, radius = 1.05) {
      // Erst exakt versuchen. Falls da ein Haus/Zelt/Flagge/Hindernis steht,
      // wird eine kleine freie Nebenposition gesucht, damit niemand im Haus festklebt.
      if (!collidesAt(target, radius, unit)) return target.clone();

      const tries = [
        [1.4, 0], [-1.4, 0], [0, 1.4], [0, -1.4],
        [2.2, 0], [-2.2, 0], [0, 2.2], [0, -2.2],
        [1.6, 1.6], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]
      ];

      for (const [x, z] of tries) {
        const p = target.clone().add(new THREE.Vector3(x, 0, z));
        if (!collidesAt(p, radius, unit)) return p;
      }

      return unit.pos.clone();
    }

    function updateCaravanFollowers(dt) {
      if (gameMode !== 'caravan') return;

      recordCaravanTrail();

      const caravanAllies = allies.filter(a => a.active && a.caravanFollower);
      for (let i = 0; i < caravanAllies.length; i++) {
        const ally = caravanAllies[i];

        // Abstand entlang der echten Laufspur, nicht nach aktueller Blickrichtung.
        // Dadurch werden sie beim schnellen Drehen nicht herumgeschleudert.
        const trailIndex = 9 + i * 9;
        const target = getCaravanTrailPoint(trailIndex);
        const safeTarget = findNearbySafeFormationSpot(target, ally, 1.05);

        const enemy = nearestEnemyToPosition(ally.pos, 4.0);
        if (enemy) {
          // In der Schlange kämpfen: Sie bleiben ungefähr auf ihrem Platz,
          // drehen sich aber zum nahen Gegner und schlagen von dort aus.
          const toEnemy = enemy.pos.clone().sub(ally.pos);
          if (toEnemy.lengthSq() > 0.0001) {
            toEnemy.normalize();
            ally.group.rotation.y = yawFromDirection(toEnemy);
          }

          ally.attackCooldown = Math.max(0, ally.attackCooldown - dt);
          if (ally.attackCooldown <= 0) {
            ally.attackCooldown = 2.4 + Math.random() * 0.8;
            if (enemyShieldFacing(enemy, ally.pos)) {
              blockPressure(enemy, enemy.group, 10, enemy.pos);
            } else {
              enemy.health -= 1.0;
              makeSpark(enemy.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xbfd8ff, 0.65);
              if (enemy.health <= 0) defeatEnemy(enemy, 20);
            }
          }
        }

        const toTarget = safeTarget.clone().sub(ally.pos);
        const dist = toTarget.length();

        ally.moving = false;
        if (dist > 0.45) {
          const dir = toTarget.normalize();
          const move = dir.clone().multiplyScalar(Math.min(ally.speed * 1.25 * dt, dist));
          moveWithCollision(ally.pos, move, 1.05, ally);
          pushOutOfOverlaps(ally.pos, 1.05, ally);
          ally.group.rotation.y = yawFromDirection(dir);
          ally.moving = true;
          ally.movePhase = (ally.movePhase || 0) + dt * 5.8;
        }

        ally.blockCooldown = Math.max(0, (ally.blockCooldown || 0) - dt);
        ally.blockTimer = Math.max(0, (ally.blockTimer || 0) - dt);
        updateShieldRecharge(ally, dt, ally.group, 11);
        setShieldPose(ally.group, ally.blockTimer > 0 && isShieldReady(ally));
        animateKnightLegs(ally.group, ally.moving, ally.movePhase || 0, 0.65);
      }
    }

    function setupCaravanMode() {
      clearCaravanModeObjects();

      caravanGroup = new THREE.Group();
      scene.add(caravanGroup);

      wave = 0;
      enemiesToSpawn = 0;
      spawnTimer = 0;
      nextWaveTimer = 0;

      unlockedHorse = false;
      unlockedBow = false;
      unlockedCatapult = false;
      unlockedSiegeTeams = false;
      horse.visible = false;
      catapult.group.visible = false;

      player.pos.set(0, 0, -58);
      player.yaw = 0;
      viewYaw = 0;
      player.weapon = 'sword';
      resetCaravanTrail();

      createVillageGate();
      createCaravanGoalCastle();

      // Dorfhäuser links und rechts des markierten Weges. Die Texturen kommen aus Version 11+.
      const roofColors = [0x8b3e2f, 0x6d4b2f, 0x5e365a, 0x3f5c6b];
      const housePositions = [
        [-15, -44], [14, -40], [-17, -28], [16, -22],
        [-14, -8], [14, -2], [-16, 14], [16, 20],
        [-13, 34], [13, 38]
      ];
      for (let i = 0; i < housePositions.length; i++) {
        const [x, z] = housePositions[i];
        createVillageHouse(x, z, THREE.MathUtils.randFloat(3.5, 5.2), THREE.MathUtils.randFloat(3.5, 5.0), roofColors[i % roofColors.length]);
      }

      // Wegpfeile vom Dorftor bis zur Burg.
      for (const z of [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 48]) {
        createRouteArrow(0, z, 0);
      }

      // Eigene Ritter einsammeln.
      createCaravanPickup(-8, -36);
      createCaravanPickup(9, -18);
      createCaravanPickup(-9, 4);
      createCaravanPickup(8, 24);
      createCaravanPickup(-6, 40);

      caravanAmbushes.push(
        { z: -34, count: 2, strong: false, triggered: false },
        { z: -14, count: 3, strong: true, triggered: false },
        { z: 10, count: 3, strong: false, triggered: false },
        { z: 31, count: 4, strong: true, triggered: false }
      );

      showMessage(t('msg.caravanStart'));
    }

    function collectCaravanKnight(pickup) {
      pickup.collected = true;
      playSfx('pickup');
      caravanCollected++;

      if (pickup.ring) pickup.group.remove(pickup.ring);

      allies.push({
        group: pickup.group,
        pos: pickup.group.position,
        health: 80,
        maxHealth: 80,
        attackCooldown: 1.2,
        blockTimer: 0,
        blockCooldown: 0.4,
        guard: 65,
        maxGuard: 65,
        shieldRechargeTimer: 0,
        shieldBroken: false,
        speed: 4.2,
        movePhase: Math.random() * 10,
        active: true,
        reviveTimer: 0,
        caravanFollower: true
      });

      showMessage(t('msg.knightCollected', { collected: caravanCollected, total: caravanTotal }));
    }

    function updateCaravanMode(dt) {
      if (caravanFinished) return;

      for (const pickup of caravanPickups) {
        if (!pickup.collected) {
          pickup.group.rotation.y += dt * 0.6;
          if (pickup.ring) pickup.ring.rotation.z += dt * 1.5;

          if (player.pos.distanceTo(pickup.group.position) < 3.0) {
            collectCaravanKnight(pickup);
          }
        }
      }

      for (const ambush of caravanAmbushes) {
        if (!ambush.triggered && player.pos.z >= ambush.z) {
          triggerCaravanAmbush(ambush);
        }
      }

      if (player.pos.distanceTo(caravanGoal) < 6.0) {
        if (caravanCollected < caravanTotal) {
          if (messageTimer <= 0) showMessage(t('msg.collectMore', { count: caravanTotal - caravanCollected }));
          return;
        }

        if (enemies.length > 0) {
          if (messageTimer <= 0) showMessage(t('msg.defeatEnemiesFirst'));
          return;
        }

        finishCaravanMode();
      }
    }

    function finishCaravanMode() {
      caravanFinished = true;
      running = false;
      gameOver = false;
      score += 2000 + caravanCollected * 300;

      if (score > highscore) {
        highscore = Math.floor(score);
        try { localStorage.setItem('katapultKlingeHighscore_v32', String(highscore)); } catch (e) {}
      }

      document.exitPointerLock?.();
      playSfx('victory');
      stopBackgroundMusic();
      if (hud.touchControls) hud.touchControls.classList.remove('visible');
      resetTouchState();
      showMessage(t('msg.caravanReached'));

      showFlowOverlay({
        eyebrow: t('end.eyebrow'),
        title: t('end.caravanFlowTitle'),
        text: t('end.caravanFlowText', { collected: caravanCollected, total: caravanTotal, score: Math.floor(score), highscore }),
        button: t('end.backToMenu'),
        onContinue: () => {
          hud.menu.style.display = 'flex';
          hud.menu.scrollTop = 0;
          document.querySelector('#menuBox h1').textContent = t('end.caravanWonHeading');
          document.getElementById('subtitle').textContent = t('end.caravanWonSubtitle', { collected: caravanCollected, total: caravanTotal, score: Math.floor(score) });
          hud.startButton.textContent = t('end.playAgain');
        }
      });
    }

    function startGame() {
      updateControlProfile();
      clearDynamicObjects();
      ensureAudioStarted();
      startBackgroundMusic();
      playSfx('horn');

      running = true;
      paused = false;
      gameOver = false;
      currentRoundRetry = false;
      updateCampBoundaryVisibility();

      score = 0;
      wave = 1;
      enemiesToSpawn = 0;
      spawnTimer = 0;
      nextWaveTimer = 0;
      viewYaw = 0;
      resetUpgradeStats();

      unlockedHorse = false;
      unlockedBow = false;
      unlockedCatapult = false;
      unlockedSiegeTeams = false;
      arrows = getMaxArrows();
      arrowReloadTimer = 0;
      bowCooldown = 0;
      healPotionReady = false;
      healPotionCooldown = getHealPotionCooldownDuration();

      chooseEnemyHeraldry();
      createEnemyHeraldryDecorations();

      if (player.group) scene.remove(player.group);
      player.group = createKnight(heraldryColor, true, 'ally');
      scene.add(player.group);

      player.pos.set(0, 0, -18);
      player.yaw = 0;
      player.maxHealth = 100;
      player.health = player.maxHealth;
      player.guard = 100;
      player.maxGuard = 100;
      player.shieldRechargeTimer = 0;
      player.shieldBroken = false;
      player.maxStamina = 100;
      player.stamina = player.maxStamina;
      player.mounted = false;
      player.carryingStone = false;
      player.attackCooldown = 0;
      player.attackTimer = 0;
      player.invul = 0;
      player.weapon = 'sword';
      player.isMoving = false;
      player.movePhase = 0;

      horse.visible = false;
      horse.position.set(-14, 0, -18);
      catapult.group.visible = false;
      catapultLoaded = false;
      if (catapultStoneMesh) {
        catapult.arm.remove(catapultStoneMesh);
        catapultStoneMesh = null;
      }

      hud.menu.style.display = 'none';
      document.querySelector('#menuBox h1').textContent = t('end.menuTitle');
      document.getElementById('subtitle').textContent = gameMode === 'hardcore'
        ? t('start.subtitle.hardcore', { crest: enemyHeraldrySymbol })
        : gameMode === 'caravan'
          ? t('start.subtitle.caravan', { crest: enemyHeraldrySymbol })
          : t('start.subtitle.easy', { crest: enemyHeraldrySymbol });
      hud.startButton.textContent = t('start.relabel');

      if (gameMode === 'caravan') {
        setupCaravanMode();
        showFlowOverlay({
          eyebrow: t('start.eyebrow'),
          title: t('start.caravanTitle'),
          text: t('start.caravanText'),
          button: t('start.caravanButton'),
          onContinue: () => showMessage(t('start.caravanMsg'))
        });
        return;
      }

      spawnStones();
      spawnAllies();
      updateHud();

      showFlowOverlay({
        eyebrow: t('start.eyebrow'),
        title: t('start.title'),
        text: gameMode === 'hardcore'
          ? t('start.text.hardcore')
          : t('start.text.default'),
        button: t('start.button'),
        onContinue: () => {
          beginWave();
          showMessage(t('start.wave1Msg'));
        }
      });
    }

    function clearDynamicObjects() {
      for (const enemy of enemies) scene.remove(enemy.group);
      enemies.length = 0;

      for (const p of projectiles) scene.remove(p.mesh);
      projectiles.length = 0;

      for (const effect of effects) scene.remove(effect.mesh);
      effects.length = 0;

      for (const team of siegeTeams) {
        if (team.catapult?.group) scene.remove(team.catapult.group);
        for (const crew of team.crew || []) scene.remove(crew);
      }
      siegeTeams.length = 0;

      for (const s of stones) scene.remove(s.mesh);
      stones.length = 0;

      clearCaravanModeObjects();
    }

    function beginWave() {
      currentRoundRetry = false;

      applyWaveUnlocks();

      if (gameMode === 'hardcore') {
        // In Hardcore ist jede Welle eine reine Königswelle:
        // Es kommt nur der feindliche König, keine normalen Truppen.
        enemiesToSpawn = 1;
      } else {
        enemiesToSpawn = Math.min(5 + wave * 3, 32);
        if (wave % 4 === 0) enemiesToSpawn += 1;
      }

      startWaveStats();
      spawnTimer = 1.0;
      if (wave > 1) playSfx('horn');
      updateCampBoundaryVisibility();
    }

    function applyWaveUnlocks() {
      if (wave >= 2 && !unlockedHorse) {
        unlockedHorse = true;
        horse.visible = true;
        horse.position.set(-14, 0, -18);
        showMessage(t('reward.horse'));
      }

      if (wave >= 4 && !unlockedBow) {
        unlockedBow = true;
        arrows = getMaxArrows();
        arrowReloadTimer = 0;
        showMessage(t('reward.bow'));
      }

      if (wave >= 6 && !unlockedCatapult) {
        unlockedCatapult = true;
        catapult.group.visible = true;
        showMessage(t('reward.catapult'));
        if (stones.length < 10) spawnStones();
      }

      if (wave >= 8 && !unlockedSiegeTeams) {
        unlockedSiegeTeams = true;
        spawnSiegeTeams();
        showMessage(t('reward.siege'));
      }
    }

    let hitStop = 0;

    function loop() {
      let dt = Math.min(clock.getDelta(), 0.05);

      // Brief time-freeze on a landed hit makes strikes feel weighty ("juice").
      if (hitStop > 0) {
        hitStop = Math.max(0, hitStop - dt);
        dt *= combat.hitstopScale;
      }

      if (running && !paused && !upgradeChoosing && !flowOverlayActive) {
        updateTimers(dt);
        updateInput(dt);
        updatePlayerModel(dt);
        updateCamera(dt);
        if (gameMode === 'caravan') {
          updateCaravanMode(dt);
          updateCaravanFollowers(dt);
        } else {
          updateSpawning(dt);
          updateSiegeTeams(dt);
          updateCatapult(dt);
        }

        updateEnemies(dt);
        updateAllies(dt);
        updateProjectiles(dt);
        updateEffects(dt);
        updateHint();
        updateHud();
      }

      renderer.render(scene, camera);
    }

    function updateTimers(dt) {
      player.attackCooldown = Math.max(0, player.attackCooldown - dt);
      player.attackTimer = Math.max(0, player.attackTimer - dt);
      player.invul = Math.max(0, player.invul - dt);
      catapultCooldown = Math.max(0, catapultCooldown - dt);
      bowCooldown = Math.max(0, bowCooldown - dt);

      if (!healPotionReady && healPotionCooldown > 0) {
        healPotionCooldown -= dt;
        if (healPotionCooldown <= 0) {
          healPotionCooldown = 0;
          healPotionReady = true;
          showMessage(t('msg.potionReady'));
        }
      }

      if (unlockedBow && arrows <= 0 && arrowReloadTimer > 0) {
        arrowReloadTimer -= dt;
        if (arrowReloadTimer <= 0) {
          arrows = getMaxArrows();
          arrowReloadTimer = 0;
          showMessage(t('msg.arrowsReloaded'));
        }
      }

      if (messageTimer > 0) {
        messageTimer -= dt;
        if (messageTimer <= 0) hud.message.style.opacity = 0;
      }

      if (damageTimer > 0) {
        damageTimer -= dt;
        hud.damageFlash.style.background = `rgba(255, 45, 35, ${Math.max(0, damageTimer * 0.75)})`;
      } else {
        hud.damageFlash.style.background = 'rgba(255, 45, 35, 0)';
      }

      if (gameMode !== 'caravan' && nextWaveTimer > 0) {
        nextWaveTimer -= dt;
        if (nextWaveTimer <= 0) {
          wave++;
          beginWave();
          if (![2, 4, 6, 8].includes(wave)) {
            showMessage(t('msg.moreRedKnights', { wave }));
          }
        }
      }
    }

    function forwardFromYaw(yaw) {
      return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    }

    function rightFromYaw(yaw) {
      return new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    }

    function yawFromDirection(dir) {
      return Math.atan2(dir.x, dir.z);
    }



    function shieldSpark(position, size = 1.2) {
      makeSpark(position.clone().add(new THREE.Vector3(0, 1.55, 0)), 0xa9d7ff, size);
    }

    function isShieldReady(unit) {
      return (unit.guard || 0) > 0 && (unit.shieldRechargeTimer || 0) <= 0 && !unit.shieldBroken;
    }

    function startShieldRecharge(unit, group, label = '') {
      unit.guard = 0;
      unit.blockTimer = 0;
      unit.shieldBroken = true;
      unit.shieldRechargeTimer = unit === player
        ? Math.max(5, playerShieldRechargeDuration - upgradeStats.shieldBreakRecoveryBonus)
        : THREE.MathUtils.randFloat(npcShieldRechargeMin, npcShieldRechargeMax);

      if (group) setShieldPose(group, false);

      if (label) {
        showMessage(t('msg.shieldBroken', { label, seconds: Math.ceil(unit.shieldRechargeTimer) }));
      }
    }

    function updateShieldRecharge(unit, dt, group, passiveRate = 10, label = '') {
      if ((unit.shieldRechargeTimer || 0) > 0) {
        unit.shieldRechargeTimer = Math.max(0, unit.shieldRechargeTimer - dt);
        unit.guard = 0;
        unit.blockTimer = 0;
        if (group) setShieldPose(group, false);

        if (unit.shieldRechargeTimer <= 0) {
          unit.shieldRechargeTimer = 0;
          unit.shieldBroken = false;
          unit.guard = unit.maxGuard || 100;
          if (label) showMessage(t('msg.shieldRecharged', { label }));
        }
        return;
      }

      if (unit.shieldBroken && (unit.guard || 0) <= 0) {
        startShieldRecharge(unit, group, label);
        return;
      }

      if ((unit.guard || 0) > 0 && unit.guard < (unit.maxGuard || 100) && (unit.blockTimer || 0) <= 0) {
        unit.guard = Math.min(unit.maxGuard || 100, unit.guard + passiveRate * dt);
      }
    }

    function blockPressure(unit, group, pressure, position, label = '') {
      if (!isShieldReady(unit)) return false;

      unit.guard = Math.max(0, (unit.guard || 0) - pressure);
      shieldSpark(position, 1.25);
      playSfx(unit.guard <= 0 ? 'shieldBreak' : 'shield');

      if (unit.guard <= 0) {
        startShieldRecharge(unit, group, label);
        return true;
      }

      return false;
    }

    function enemyShieldFacing(enemy, sourcePosition) {
      if (!enemy || enemy.blockTimer <= 0 || !isShieldReady(enemy)) return false;
      const enemyForward = forwardFromYaw(enemy.group.rotation.y);
      const toSource = sourcePosition.clone().sub(enemy.pos);
      if (toSource.lengthSq() < 0.0001) return true;
      toSource.normalize();
      return enemyForward.dot(toSource) > 0.16;
    }

    function allyShieldFacing(ally, sourcePosition) {
      if (!ally || ally.blockTimer <= 0 || !isShieldReady(ally)) return false;
      const allyForward = forwardFromYaw(ally.group.rotation.y);
      const toSource = sourcePosition.clone().sub(ally.pos);
      if (toSource.lengthSq() < 0.0001) return true;
      toSource.normalize();
      return allyForward.dot(toSource) > 0.08;
    }

    function damageAlly(ally, amount, sourcePosition) {
      if (!ally || !ally.active) return;

      const toSource = sourcePosition.clone().sub(ally.pos);
      if (toSource.lengthSq() > 0.0001) {
        const dir = toSource.clone().normalize();
        ally.group.rotation.y = yawFromDirection(dir);
      }

      const canRaiseShield = isShieldReady(ally) && ally.blockCooldown <= 0;
      if (canRaiseShield || allyShieldFacing(ally, sourcePosition)) {
        ally.blockTimer = 0.65;
        ally.blockCooldown = 1.2 + Math.random() * 0.9;
        setShieldPose(ally.group, true);
        blockPressure(ally, ally.group, amount * 2.3 + 10, ally.pos);
        return;
      }

      ally.health -= amount;
      if (ally.health <= 0) {
        ally.active = false;
        if (waveStats && waveStats.wave === wave) waveStats.alliesDown++;
        ally.reviveTimer = gameMode === 'hardcore' ? 4 : 9;
        ally.group.visible = false;
        makeSpark(ally.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x99bbff, 1.8);
      }
    }

    function setShieldPose(group, blocking) {
      const shield = group.userData.shield;
      if (!shield) return;

      if (blocking) {
        shield.rotation.y = 0.85;
        shield.position.z = 0.62;
        shield.position.y = 1.76;
      } else {
        shield.rotation.y = 0;
        shield.position.z = 0.12;
        shield.position.y = 1.72;
      }
    }

    function animateKnightLegs(group, moving, phase, intensity = 1.0) {
      const left = group.userData.leftLeg;
      const right = group.userData.rightLeg;
      const leftFoot = group.userData.leftBoot;
      const rightFoot = group.userData.rightBoot;
      if (!left || !right) return;

      const step = moving ? Math.sin(phase) : 0;
      const oppositeStep = moving ? Math.sin(phase + Math.PI) : 0;
      const swing = step * 0.58 * intensity;

      // Das ganze Bein schwingt aus der Hüfte.
      left.rotation.x = swing;
      right.rotation.x = -swing;

      // Leichtes Anheben verhindert, dass die Füße über den Boden schleifen.
      left.position.y = 1.18 + (moving ? Math.max(0, -step) * 0.10 * intensity : 0);
      right.position.y = 1.18 + (moving ? Math.max(0, -oppositeStep) * 0.10 * intensity : 0);

      // Die Füße sind jetzt Teil der Beine und rollen zusätzlich leicht ab.
      // Dadurch wirken Stiefel, Fußspitze und Bein verbunden.
      if (leftFoot) {
        leftFoot.rotation.x = moving ? -swing * 0.35 + Math.max(0, step) * 0.22 * intensity : 0;
        leftFoot.position.z = 0.18 + (moving ? step * 0.04 * intensity : 0);
      }
      if (rightFoot) {
        rightFoot.rotation.x = moving ? swing * 0.35 + Math.max(0, oppositeStep) * 0.22 * intensity : 0;
        rightFoot.position.z = 0.18 + (moving ? oppositeStep * 0.04 * intensity : 0);
      }
    }

    function animateHorseLegs(horseGroup, moving, phase) {
      const legs = horseGroup.userData.legs || [];
      if (!legs.length) return;
      horseGroup.userData.movePhase = phase;
      for (let i = 0; i < legs.length; i++) {
        const offset = i % 2 === 0 ? 0 : Math.PI;
        legs[i].rotation.x = moving ? Math.sin(phase * 1.25 + offset) * 0.42 : 0;
      }
    }

    function updateInput(dt) {
      const forward = forwardFromYaw(viewYaw);
      const right = rightFromYaw(viewYaw);

      let dir = new THREE.Vector3();

      if (keyboardEnabled) {
        if (keys.KeyW) dir.add(forward);
        if (keys.KeyS) dir.sub(forward);
        // PC-Fix: Links/Rechts war invertiert.
        // A soll nach links, D nach rechts relativ zur Blickrichtung steuern.
        if (keys.KeyD) dir.sub(right);
        if (keys.KeyA) dir.add(right);
      }

      if (touchEnabled && touchMove.active && touchMove.strength > 0.08) {
        // Tablet-Fix: Links/Rechts war verkehrt herum. Deshalb wird X hier invertiert.
        dir.addScaledVector(right, -touchMove.x);
        dir.addScaledVector(forward, -touchMove.y);
      }

      const touchAutoSprint = touchEnabled && touchMove.active && touchMove.strength > 0.82;
      const wantsSprint = (keyboardEnabled && (keys.ShiftLeft || keys.ShiftRight)) || touchAutoSprint;
      const blocking = ((keyboardEnabled && mouseRight) || (touchEnabled && touchButtons.block)) && !player.mounted && isShieldReady(player);
      const canSprint = wantsSprint && player.stamina > 3 && !blocking;

      let speed = player.mounted ? 11.5 + upgradeStats.horseSpeedBonus : 6.5 + upgradeStats.moveSpeedBonus;
      if (canSprint) speed = player.mounted ? 18.5 + upgradeStats.horseSpeedBonus : 10.5 + upgradeStats.moveSpeedBonus;

      if (dir.lengthSq() > 0.001) {
        dir.normalize();
        moveWithCollision(player.pos, dir.clone().multiplyScalar(speed * dt), player.mounted ? 1.55 : 1.05, player);

        player.yaw = yawFromDirection(dir);
        player.isMoving = true;
        player.movePhase += dt * (player.mounted ? 10.5 : 8.5) * (canSprint ? 1.35 : 1.0);
      } else {
        player.yaw = viewYaw;
        player.isMoving = false;
      }

      player.pos.x = THREE.MathUtils.clamp(player.pos.x, -55, 55);
      player.pos.z = THREE.MathUtils.clamp(player.pos.z, -62, 58);

      if (canSprint) player.stamina = Math.max(0, player.stamina - 24 * upgradeStats.staminaCostMultiplier * dt);
      else player.stamina = Math.min(player.maxStamina || 100, player.stamina + (18 + upgradeStats.staminaRegenBonus) * dt);

      if (blocking) {
        player.guard = Math.max(0, player.guard - 10 * dt);
        if (player.guard <= 0) {
          startShieldRecharge(player, player.group, t('label.playerShield'));
        }
      } else {
        updateShieldRecharge(player, dt, player.group, 18 + upgradeStats.shieldRechargeBonus, t('label.playerShield'));
      }

      if ((keyboardEnabled && (mouseLeft || keys.Space)) || (touchEnabled && touchButtons.attack)) {
        useActiveWeapon();
      }
    }

    function updatePlayerModel(dt) {
      const group = player.group;
      group.position.copy(player.pos);
      group.rotation.y = player.yaw;

      if (player.mounted) {
        group.position.y = 1.55;
        group.scale.setScalar(0.92);
        horse.position.copy(player.pos);
        horse.rotation.y = player.yaw;
      } else {
        group.position.y = 0;
        group.scale.setScalar(1);
      }

      const shield = group.userData.shield;
      updatePlayerWeaponVisuals(group);

      setShieldPose(group, ((keyboardEnabled && mouseRight) || (touchEnabled && touchButtons.block)) && !player.mounted && isShieldReady(player));
      animateKnightLegs(group, player.isMoving && !player.mounted, player.movePhase, 1.0);
      animateHorseLegs(horse, player.mounted && player.isMoving, player.movePhase);

      if (player.carryingStone) {
        let stone = group.userData.carriedStone;
        if (!stone) {
          stone = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.45, 0),
            new THREE.MeshStandardMaterial({ color: 0xb5b2a2, roughness: 0.9 })
          );
          stone.position.set(0, 3.35, 0);
          group.add(stone);
          group.userData.carriedStone = stone;
        }
      } else if (group.userData.carriedStone) {
        group.remove(group.userData.carriedStone);
        group.userData.carriedStone = null;
      }
    }

    function updatePlayerWeaponVisuals(group) {
      const sword = group.userData.sword;
      const bow = group.userData.bow;

      if (player.weapon === 'bow' && !unlockedBow) {
        player.weapon = 'sword';
      }

      const bowIsActive = unlockedBow && player.weapon === 'bow';

      if (sword) {
        if (bowIsActive) {
          // Bogen aktiv: Schwert sichtbar auf dem Rücken tragen.
          sword.position.set(0.40, 2.05, -0.52);
          sword.rotation.set(0.28, 0.10, 0.82);
          sword.visible = true;
        } else {
          // Schwert aktiv: Schwert in der rechten Hand führen.
          sword.position.set(0.86, 1.62, 0.12);
          sword.visible = true;

          if (player.attackTimer > 0) {
            const k = player.attackTimer / combat.swordSwingTime;
            sword.rotation.z = -1.5 + Math.sin((1 - k) * Math.PI) * 2.3;
            sword.rotation.x = -0.45;
            sword.rotation.y = 0;
          } else {
            sword.rotation.z = -0.5;
            sword.rotation.x = -0.15;
            sword.rotation.y = 0;
          }
        }
      }

      if (bow) {
        bow.visible = unlockedBow;
        if (!unlockedBow) return;

        if (bowIsActive) {
          // Schwert auf dem Rücken, Bogen in der Hand.
          bow.position.set(0.86, 1.84, 0.20);
          bow.rotation.set(0.02, 0.12, 0.20);
        } else {
          // Schwert aktiv: Bogen sichtbar auf dem Rücken tragen.
          bow.position.set(-0.46, 2.05, -0.54);
          bow.rotation.set(0.20, -0.20, -0.82);
        }
      }
    }

    function useActiveWeapon() {
      if (player.weapon === 'bow') {
        fireBow();
      } else if (player.attackCooldown <= 0) {
        playerAttack();
      }
    }

    function toggleWeapon() {
      if (!unlockedBow) {
        showMessage(t('msg.bowFromWave4'));
        return;
      }

      player.weapon = player.weapon === 'bow' ? 'sword' : 'bow';
      playSfx('equip');
      player.attackTimer = 0;
      showMessage(player.weapon === 'bow'
        ? t('msg.switchedWeaponBow')
        : t('msg.switchedWeaponSword'));
    }

    function updateCamera(dt) {
      const lookDir = forwardFromYaw(viewYaw);
      const distance = player.mounted ? 13.5 : 10.5;
      const height = player.mounted ? 7.2 : 6.0;

      const desired = player.pos.clone()
        .addScaledVector(lookDir, -distance)
        .add(new THREE.Vector3(0, height, 0));

      camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
      camera.lookAt(player.pos.x, player.mounted ? 2.8 : 2.1, player.pos.z);
    }

    function updateSpawning(dt) {
      if (gameMode === 'caravan') return;

      if (enemiesToSpawn > 0) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnEnemy();
          enemiesToSpawn--;
          spawnTimer = Math.max(0.45, 1.25 - wave * 0.035);
        }
      } else if (enemies.length === 0 && nextWaveTimer <= 0 && !upgradeChoosing) {
        finishWaveAndOfferUpgrade();
      }
    }


    function addEnemyKingCrown(group) {
      const gold = new THREE.MeshStandardMaterial({ color: 0xffd760, metalness: 0.65, roughness: 0.32 });

      const crownBase = new THREE.Mesh(
        new THREE.TorusGeometry(0.43, 0.045, 8, 24),
        gold
      );
      crownBase.position.y = 3.25;
      crownBase.rotation.x = Math.PI / 2;
      crownBase.castShadow = true;
      group.add(crownBase);

      const spikePositions = [
        [-0.28, 0.0],
        [0.0, 0.0],
        [0.28, 0.0],
        [-0.14, 0.24],
        [0.14, 0.24]
      ];

      for (const [x, z] of spikePositions) {
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.32, 8),
          gold
        );
        spike.position.set(x, 3.45, z);
        spike.castShadow = true;
        group.add(spike);
      }

      const frontGem = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xff3030, roughness: 0.25 })
      );
      frontGem.position.set(0, 3.29, 0.45);
      group.add(frontGem);

      // Auffällige Königsaura / Glitzer-Effekt.
      const aura = new THREE.Group();

      const auraRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.55, 0.045, 8, 48),
        new THREE.MeshBasicMaterial({ color: 0xffd760, transparent: true, opacity: 0.72 })
      );
      auraRing.position.y = 0.08;
      auraRing.rotation.x = Math.PI / 2;
      aura.add(auraRing);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.035, 8, 36),
        new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.65 })
      );
      halo.position.y = 3.58;
      halo.rotation.x = Math.PI / 2;
      aura.add(halo);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(1.35, 20, 20),
        new THREE.MeshBasicMaterial({ color: 0xffd760, transparent: true, opacity: 0.12, wireframe: true })
      );
      glow.position.y = 1.85;
      aura.add(glow);

      const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.88 });
      const sparks = [];
      for (let i = 0; i < 10; i++) {
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), sparkMaterial.clone());
        spark.position.set(
          Math.cos(i / 10 * Math.PI * 2) * 1.05,
          1.4 + (i % 5) * 0.33,
          Math.sin(i / 10 * Math.PI * 2) * 1.05
        );
        aura.add(spark);
        sparks.push(spark);
      }

      group.add(aura);
      group.userData.kingAura = aura;
      group.userData.kingSparks = sparks;
    }

    function createEnemyHpBar() {
      const bar = new THREE.Group();
      const width = 1.3;
      const bg = new THREE.Mesh(
        new THREE.PlaneGeometry(width, 0.16),
        new THREE.MeshBasicMaterial({ color: 0x14110d, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide })
      );
      const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(width, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x53d769, depthTest: false, side: THREE.DoubleSide })
      );
      fill.position.z = 0.01;
      bar.add(bg);
      bar.add(fill);
      bar.position.set(0, 3.95, 0);
      bar.renderOrder = 999;
      bar.visible = false;
      bar.userData.fill = fill;
      return bar;
    }

    function spawnEnemy() {
      let type = 'simple';

      if (gameMode === 'hardcore') {
        type = 'king';
      } else {
        if (wave >= 2 && Math.random() < 0.4) type = 'spear';
        if (wave >= 3 && Math.random() < 0.32) type = 'shield';
        if (wave >= 5 && Math.random() < 0.25) type = 'heavy';

        if (wave % 4 === 0 && enemiesToSpawn === 1) {
          type = 'captain';
        }
      }

      const data = enemyData(type);
      const group = createKnight(enemyHeraldryColor, false, 'enemy');

      if (type === 'king') {
        addEnemyKingCrown(group);
      }

      group.scale.setScalar(data.scale);
      group.position.set(
        THREE.MathUtils.randFloat(-38, 38),
        0,
        THREE.MathUtils.randFloat(combat.spawnMinZ, combat.spawnMaxZ)
      );

      const hpBar = createEnemyHpBar();
      group.add(hpBar);
      scene.add(group);

      const enemyHp = Math.round(data.health * combat.enemyHealthMult);

      enemies.push({
        group,
        pos: group.position,
        type,
        health: enemyHp,
        maxHealth: enemyHp,
        speed: data.speed * combat.enemySpeedMult,
        attackRange: data.range,
        attackDamage: data.damage,
        attackCooldown: THREE.MathUtils.randFloat(1.0, 2.0),
        blockTimer: 0,
        blockCooldown: THREE.MathUtils.randFloat(0.6, 1.8),
        guard: data.guard,
        maxGuard: data.guard,
        shieldRechargeTimer: 0,
        shieldBroken: false,
        movePhase: Math.random() * 10,
        moving: false,
        score: data.score,
        radius: data.radius,
        aggroTimer: 0,
        baseScale: data.scale,
        hitPop: 0,
        hpBar
      });

      if (type === 'king') {
        showMessage(t('msg.hardcoreKingApproaches'));
      }
    }

    function enemyData(type) {
      if (type === 'king') return {
        health: 60 + wave * 3, speed: 3.3, range: 3.0, damage: 8, score: 1500, scale: 1.58, radius: 1.55, guard: 125
      };
      if (type === 'captain') return {
        health: 38 + wave * 2, speed: 3.8, range: 2.8, damage: 7, score: 850, scale: 1.42, radius: 1.4, guard: 95
      };
      if (type === 'heavy') return {
        health: 26 + wave * 2, speed: 3.2, range: 2.4, damage: 7, score: 420, scale: 1.25, radius: 1.25, guard: 78
      };
      if (type === 'shield') return {
        health: 20 + Math.floor(wave * 1.0), speed: 4.2, range: 2.3, damage: 6, score: 230, scale: 1.1, radius: 1.1, guard: 88
      };
      if (type === 'spear') return {
        health: 16 + Math.floor(wave * 0.9), speed: 5.1, range: 3.4, damage: 5, score: 180, scale: 1.0, radius: 1.0, guard: 48
      };
      return {
        health: 14 + Math.floor(wave * 0.7), speed: 4.8, range: 2.2, damage: 5, score: 120, scale: 1.0, radius: 1.0, guard: 42
      };
    }


    function loseHardcoreWave() {
      if (gameMode !== 'hardcore' || currentRoundRetry) return;
      currentRoundRetry = true;

      showMessage(t('msg.hardcoreKingInCamp', { wave }));

      for (const enemy of enemies) scene.remove(enemy.group);
      enemies.length = 0;

      for (const p of projectiles) scene.remove(p.mesh);
      projectiles.length = 0;

      enemiesToSpawn = 0;
      nextWaveTimer = 0;

      player.pos.set(0, 0, -18);
      player.health = player.maxHealth || 100;
      player.guard = player.maxGuard || 100;
      player.shieldRechargeTimer = 0;
      player.shieldBroken = false;
      player.stamina = player.maxStamina || 100;
      player.mounted = false;
      player.carryingStone = false;
      player.invul = 1.0;
      mouseLeft = false;
      mouseRight = false;

      horse.visible = unlockedHorse;
      horse.position.set(-14, 0, -18);

      spawnAllies();
      spawnTimer = 1.0;

      setTimeout(() => {
        if (running && gameMode === 'hardcore') beginWave();
      }, 1200);
    }

    function updateEnemies(dt) {
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        let target = { pos: player.pos, isPlayer: true };

        if (gameMode === 'hardcore' && enemy.type === 'king') {
          // Der König ist kein normaler Kämpfer: Sein Hauptziel ist das Lager.
          // Wenn der Spieler ihn angreift, jagt er kurz den Spieler.
          enemy.aggroTimer = Math.max(0, (enemy.aggroTimer || 0) - dt);
          if (enemy.aggroTimer > 0 && enemy.pos.distanceTo(player.pos) < 22) {
            target = { pos: player.pos, isPlayer: true, kingChase: true };
          } else {
            const campTarget = new THREE.Vector3(
              THREE.MathUtils.clamp(enemy.pos.x * 0.85, campBounds.xMin + 3, campBounds.xMax - 3),
              0,
              campBounds.zMax - 2
            );
            target = { pos: campTarget, isCamp: true };
          }
        } else {
          // Bias < 1 makes the player the preferred target over allies, so the
          // fight feels less passive (allies no longer soak all the aggro).
          let best = enemy.pos.distanceToSquared(player.pos) * combat.playerAggroBias;

          for (const ally of allies) {
            if (!ally.active) continue;
            const d = enemy.pos.distanceToSquared(ally.pos);
            if (d < best) {
              best = d;
              target = { pos: ally.pos, ally, isPlayer: false };
            }
          }
        }

        const toTarget = target.pos.clone().sub(enemy.pos);
        const dist = toTarget.length();

        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
        enemy.blockCooldown = Math.max(0, enemy.blockCooldown - dt);
        enemy.blockTimer = Math.max(0, enemy.blockTimer - dt);

        updateShieldRecharge(enemy, dt, enemy.group, 9);

        // Blocking is now decided once, at the moment the player's hit lands
        // (see playerAttack), so enemies no longer double-roll a block here.

        enemy.moving = false;
        const wantsAttack = !target.isCamp && dist <= enemy.attackRange;
        const wantsMove = target.isCamp || dist > enemy.attackRange;

        if (wantsMove && dist > 0.05) {
          toTarget.normalize();
          const move = toTarget.clone().multiplyScalar(enemy.speed * dt);
          const didMove = moveWithCollision(enemy.pos, move, enemy.radius || 1.1, enemy);

          if (!didMove && enemy.type === 'king') {
            // Der König versucht, um blockierende Ritter/Hindernisse herumzutrotten.
            const side = new THREE.Vector3(toTarget.z, 0, -toTarget.x).multiplyScalar(enemy.speed * dt * 0.85);
            if (!moveWithCollision(enemy.pos, side, enemy.radius || 1.1, enemy)) {
              moveWithCollision(enemy.pos, side.multiplyScalar(-1), enemy.radius || 1.1, enemy);
            }
          }

          pushOutOfOverlaps(enemy.pos, enemy.radius || 1.1, enemy);
          enemy.group.rotation.y = yawFromDirection(toTarget);
          enemy.moving = true;
          enemy.movePhase += dt * 7.2;
        } else if (wantsAttack && enemy.attackCooldown <= 0 && enemy.blockTimer <= 0.1) {
          enemy.attackCooldown = combat.enemyAttackCooldownBase + Math.random() * combat.enemyAttackCooldownRand;
          enemyAttack(enemy, target);
        }

        setShieldPose(enemy.group, enemy.blockTimer > 0 && isShieldReady(enemy));
        animateKnightLegs(enemy.group, enemy.moving, enemy.movePhase, 0.9);

        // Hit-pop: a quick scale punch when the enemy was just struck.
        const baseScale = enemy.baseScale || 1;
        if (enemy.hitPop > 0) {
          enemy.hitPop = Math.max(0, enemy.hitPop - dt);
          enemy.group.scale.setScalar(baseScale * (1 + (enemy.hitPop / combat.hitPop) * 0.22));
        }

        // Floating health bar, shown once damaged and billboarded to the camera.
        if (enemy.hpBar) {
          const ratio = THREE.MathUtils.clamp(enemy.health / enemy.maxHealth, 0, 1);
          if (ratio < 0.999) {
            enemy.hpBar.visible = true;
            const fill = enemy.hpBar.userData.fill;
            fill.scale.x = Math.max(0.001, ratio);
            fill.position.x = -(1 - ratio) * 0.65;
            fill.material.color.setHSL(0.33 * ratio, 0.85, 0.5);
            enemy.hpBar.rotation.y = viewYaw + Math.PI - enemy.group.rotation.y;
          } else {
            enemy.hpBar.visible = false;
          }
        }

        if (gameMode === 'hardcore' && enemy.type === 'king' && isInsideCampBounds(enemy.pos)) {
          loseHardcoreWave();
          return;
        }

        if (enemy.type === 'king' && enemy.group.userData.kingAura) {
          enemy.group.userData.kingAura.rotation.y += dt * 1.4;
          const sparks = enemy.group.userData.kingSparks || [];
          for (let s = 0; s < sparks.length; s++) {
            const spark = sparks[s];
            spark.position.x = Math.cos(enemy.movePhase * 1.6 + s) * (0.9 + (s % 3) * 0.18);
            spark.position.z = Math.sin(enemy.movePhase * 1.6 + s) * (0.9 + (s % 3) * 0.18);
            spark.material.opacity = 0.45 + 0.45 * Math.abs(Math.sin(enemy.movePhase * 2.0 + s));
          }
        }

        const sword = enemy.group.userData.sword;
        if (enemy.attackCooldown > 0.82 && enemy.blockTimer <= 0) {
          sword.rotation.z = -1.5 + Math.sin(enemy.attackCooldown * 12) * 1.0;
        } else {
          sword.rotation.z = -0.5;
        }
      }
    }

    function enemyAttack(enemy, target) {
      makeSpark(enemy.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0xffe09a, 1.2);

      if (target.isPlayer) {
        damagePlayer(enemy.attackDamage);
      } else if (target.ally) {
        damageAlly(target.ally, enemy.attackDamage, enemy.pos);
      }
    }

    function updateAllies(dt) {
      for (const ally of allies) {
        if (gameMode === 'caravan' && ally.caravanFollower && ally.active) {
          // Karawanen-Ritter werden zentral in updateCaravanFollowers geführt,
          // damit sie als geordnete Schlange hinter dem Spieler bleiben.
          continue;
        }

        if (!ally.active) {
          ally.reviveTimer -= dt;
          if (ally.reviveTimer <= 0) {
            ally.active = true;
            ally.health = ally.maxHealth;
            ally.guard = ally.maxGuard;
            ally.shieldRechargeTimer = 0;
            ally.shieldBroken = false;
            ally.group.visible = true;
            ally.pos.copy(freeCampSpawnPosition(ally));
            showMessage(t('msg.allyReturns'));
          }
          continue;
        }

        ally.blockCooldown = Math.max(0, (ally.blockCooldown || 0) - dt);
        ally.blockTimer = Math.max(0, (ally.blockTimer || 0) - dt);

        updateShieldRecharge(ally, dt, ally.group, 11);

        const enemy = nearestEnemy(ally.pos);
        if (!enemy) {
          setShieldPose(ally.group, ally.blockTimer > 0 && isShieldReady(ally));
          animateKnightLegs(ally.group, false, ally.movePhase || 0, 0.6);
          continue;
        }

        const toEnemy = enemy.pos.clone().sub(ally.pos);
        const dist = toEnemy.length();

        ally.attackCooldown = Math.max(0, ally.attackCooldown - dt);
        ally.moving = false;

        if (dist > 2.7) {
          toEnemy.normalize();
          moveWithCollision(ally.pos, toEnemy.clone().multiplyScalar(ally.speed * dt), 1.05, ally);
          ally.group.rotation.y = yawFromDirection(toEnemy);
          ally.moving = true;
          ally.movePhase = (ally.movePhase || 0) + dt * 5.4;
        } else if (ally.attackCooldown <= 0 && ally.blockTimer <= 0.1) {
          ally.attackCooldown = (2.7 + Math.random() * 0.9) * upgradeStats.allyCooldownMultiplier;
          const allyDamage = 1.1 + upgradeStats.allyDamageBonus;

          if (enemyShieldFacing(enemy, ally.pos)) {
            blockPressure(enemy, enemy.group, 10, enemy.pos);
          } else {
            enemy.health -= allyDamage;
            makeSpark(enemy.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xbfd8ff, 0.65);
            if (enemy.health <= 0) defeatEnemy(enemy, 20);
          }
        }

        setShieldPose(ally.group, ally.blockTimer > 0 && isShieldReady(ally));
        animateKnightLegs(ally.group, ally.moving, ally.movePhase || 0, 0.65);
      }
    }

    // Shared "this hit landed" feedback: knockback, scale-pop, a brief stagger
    // and a short hitstop. Makes strikes feel weighty instead of sluggish.
    function applyHitReaction(enemy, strength = 1) {
      const away = enemy.pos.clone().sub(player.pos);
      away.y = 0;
      if (away.lengthSq() > 0.0001) {
        away.normalize();
        moveWithCollision(enemy.pos, away.multiplyScalar(combat.enemyKnockback * strength), enemy.radius || 1.1, enemy);
      }
      enemy.hitPop = combat.hitPop;
      enemy.attackCooldown = Math.max(enemy.attackCooldown, combat.enemyFlinch * strength);
      hitStop = Math.max(hitStop, combat.hitstop * strength);
    }

    function playerAttack() {
      if (player.weapon !== 'sword') return;
      player.attackCooldown = (player.mounted ? combat.swordCooldownMounted : combat.swordCooldown) * upgradeStats.swordCooldownMultiplier;
      player.attackTimer = combat.swordSwingTime;
      playSfx('sword');

      const forward = forwardFromYaw(player.yaw);
      const range = (player.mounted ? 4.4 : 3.15) + upgradeStats.swordRangeBonus;
      const damage = (player.mounted ? 8.0 : 7.0) + upgradeStats.swordDamageBonus;

      let hitSomething = false;

      for (const enemy of [...enemies]) {
        const toEnemy = enemy.pos.clone().sub(player.pos);
        const dist = toEnemy.length();
        if (dist > range) continue;

        toEnemy.normalize();
        const facing = forward.dot(toEnemy);

        if (facing > 0.36) {
          let finalDamage = damage;

          const enemyForward = forwardFromYaw(enemy.group.rotation.y);
          const enemyToPlayer = player.pos.clone().sub(enemy.pos).normalize();
          const playerHitsShieldSide = enemyForward.dot(enemyToPlayer) > 0.22;

          // Single block roll (no more double-dipping with updateEnemies).
          const blockChance = enemy.type === 'shield' ? combat.blockChanceShield
            : enemy.type === 'heavy' ? combat.blockChanceHeavy
            : enemy.type === 'captain' ? combat.blockChanceCaptain
            : enemy.type === 'king' ? combat.blockChanceKing
            : combat.blockChanceDefault;
          const blocks = playerHitsShieldSide && isShieldReady(enemy)
            && enemy.blockCooldown <= 0 && Math.random() < blockChance;

          if (blocks) {
            enemy.blockTimer = 0.65;
            enemy.blockCooldown = 1.4 + Math.random() * 1.3;
            setShieldPose(enemy.group, true);
            blockPressure(enemy, enemy.group, player.mounted ? 24 : 18, enemy.pos);
            // A blocked hit still deals chip damage, so swinging is never wasted.
            enemy.health -= finalDamage * combat.blockChipFactor;
            shieldSpark(enemy.pos, 1.0);
            playSfx('hit');
            applyHitReaction(enemy, 0.4);
            hitSomething = true;
            if (enemy.health <= 0) defeatEnemy(enemy, enemy.score);
            continue;
          }

          if (enemy.type === 'shield' && facing < 0.72) finalDamage *= 0.55;
          if (enemy.type === 'heavy') finalDamage *= 0.75;
          makeSpark(enemy.pos.clone().add(new THREE.Vector3(0, 1.45, 0)), 0xffe7a8, 1.5);
          playSfx('hit');

          if (enemy.type === 'king') enemy.aggroTimer = 3.0;
          enemy.health -= finalDamage;
          applyHitReaction(enemy, 1);
          hitSomething = true;

          if (enemy.health <= 0) defeatEnemy(enemy, enemy.score);
        }
      }

      if (!hitSomething) {
        makeSpark(player.pos.clone().add(forward.multiplyScalar(2.1)).add(new THREE.Vector3(0, 1.2, 0)), 0xffffff, 0.45);
      }
    }

    function useHealingPotion() {
      if (!healPotionReady) {
        showMessage(t('msg.potionCharging', { seconds: Math.ceil(Math.max(0, healPotionCooldown)) }));
        return;
      }

      if (player.health >= 100) {
        showMessage(t('msg.alreadyHealed'));
        return;
      }

      player.health = player.maxHealth || 100;
      playSfx('potion');
      healPotionReady = false;
      healPotionCooldown = getHealPotionCooldownDuration();
      makeSpark(player.pos.clone().add(new THREE.Vector3(0, 1.6, 0)), 0x77ff9a, 1.9);
      showMessage(t('msg.potionUsed'));
    }

    function damagePlayer(amount) {
      if (player.invul > 0 || gameOver) return;

      const blocking = mouseRight && !player.mounted && isShieldReady(player);
      if (blocking) {
        blockPressure(player, player.group, amount * 2.4 + 8, player.pos, t('label.playerShield'));
        player.invul = 0.16;
        return;
      }

      damageTimer = 0.35;
      player.health -= amount;
      if (waveStats && waveStats.wave === wave) waveStats.damageTaken += amount;
      player.invul = 0.25;

      if (player.health <= 0) {
        endGame();
      }
    }

    function defeatEnemy(enemy, addScore) {
      const idx = enemies.indexOf(enemy);
      if (idx >= 0) enemies.splice(idx, 1);

      makeSpark(enemy.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0xffd87a, 2.0);
      scene.remove(enemy.group);
      playSfx('hit');
      score += addScore;
      if (waveStats && waveStats.wave === wave) waveStats.kills++;
    }


    function fireBow() {
      if (!unlockedBow) {
        showMessage(t('msg.bowFromWave4'));
        return;
      }

      if (player.weapon !== 'bow') {
        showMessage(t('msg.switchToBow'));
        return;
      }

      if (bowCooldown > 0) return;

      if (arrows <= 0) {
        if (arrowReloadTimer <= 0) arrowReloadTimer = getArrowReloadDuration();
        showMessage(t('msg.noArrows', { seconds: Math.ceil(arrowReloadTimer) }));
        return;
      }

      arrows--;
      playSfx('bow');
      bowCooldown = 0.75 * upgradeStats.bowCooldownMultiplier;
      player.attackTimer = 0.18;

      if (arrows <= 0) {
        arrowReloadTimer = getArrowReloadDuration();
      }

      const forward = forwardFromYaw(player.yaw);
      const start = player.pos.clone().add(new THREE.Vector3(0, player.mounted ? 3.2 : 2.25, 0)).addScaledVector(forward, 1.7);

      const arrow = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 1.25, 8),
        new THREE.MeshStandardMaterial({ color: 0x6b421f, roughness: 0.75 })
      );
      shaft.rotation.x = Math.PI / 2;
      arrow.add(shaft);

      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.10, 0.25, 8),
        new THREE.MeshStandardMaterial({ color: 0xdde3e5, metalness: 0.55, roughness: 0.3 })
      );
      tip.position.z = 0.72;
      tip.rotation.x = Math.PI / 2;
      arrow.add(tip);

      arrow.position.copy(start);
      arrow.rotation.y = player.yaw;
      scene.add(arrow);

      projectiles.push({
        kind: 'arrow',
        mesh: arrow,
        velocity: forward.multiplyScalar(48),
        life: 2.2,
        damage: (player.mounted ? 6.8 : 6.2) + upgradeStats.bowDamageBonus
      });

      showMessage(arrows > 0 ? t('msg.arrowShot', { arrows, maxArrows: getMaxArrows() }) : t('msg.lastArrow', { seconds: Math.ceil(getArrowReloadDuration()) }));
    }

    function spawnSiegeTeams() {
      const positions = [
        new THREE.Vector3(-32, 0, -6),
        new THREE.Vector3(32, 0, -6)
      ];

      for (let i = 0; i < positions.length; i++) {
        const siegeCatapult = createCatapult();
        siegeCatapult.group.position.copy(positions[i]);
        siegeCatapult.group.rotation.y = 0;
        scene.add(siegeCatapult.group);

        const crew = [];
        const offsets = [new THREE.Vector3(-2.8, 0, -1.8), new THREE.Vector3(2.8, 0, -1.8)];
        for (const offset of offsets) {
          const soldier = createKnight(0x2f73ff, false, 'ally');
          soldier.position.copy(positions[i]).add(offset);
          soldier.scale.setScalar(0.92);
          scene.add(soldier);
          crew.push(soldier);
        }

        siegeTeams.push({
          catapult: siegeCatapult,
          crew,
          stones: 4 + upgradeStats.siegeStonesBonus,
          cooldown: 1.0 + Math.random() * 1.2,
          anim: 0,
          converted: false
        });
      }
    }

    function updateSiegeTeams(dt) {
      for (let i = siegeTeams.length - 1; i >= 0; i--) {
        const team = siegeTeams[i];
        if (team.converted) {
          siegeTeams.splice(i, 1);
          continue;
        }

        if (team.anim > 0) {
          team.anim -= dt;
          const k = team.anim / 0.65;
          team.catapult.arm.rotation.x = 0.42 - Math.sin((1 - k) * Math.PI) * 1.35;
        } else {
          team.catapult.arm.rotation.x += (0.42 - team.catapult.arm.rotation.x) * 0.1;
        }

        for (let c = 0; c < team.crew.length; c++) {
          const crew = team.crew[c];
          crew.rotation.y = 0;
          animateKnightLegs(crew, false, 0, 1.0);
        }

        team.cooldown -= dt;
        if (team.cooldown <= 0) {
          if (team.stones > 0 && enemies.length > 0) {
            fireSiegeTeamCatapult(team);
            team.cooldown = 3.2 + Math.random() * 1.2;
          } else if (team.stones <= 0) {
            convertSiegeTeamToTroops(team);
            siegeTeams.splice(i, 1);
          } else {
            team.cooldown = 1.0;
          }
        }
      }
    }

    function fireSiegeTeamCatapult(team) {
      const targetEnemy = nearestEnemy(team.catapult.group.position);
      if (!targetEnemy) return;

      team.stones--;
      team.anim = 0.65;

      const start = team.catapult.group.position.clone().add(new THREE.Vector3(0, 3.2, 3.8));
      const target = targetEnemy.pos.clone();
      target.x += THREE.MathUtils.randFloat(-3.0, 3.0);
      target.z += THREE.MathUtils.randFloat(-3.0, 3.0);
      target.y = 0;

      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.68, 0),
        new THREE.MeshStandardMaterial({ color: 0xb0aa96, roughness: 0.9 })
      );
      mesh.position.copy(start);
      mesh.castShadow = true;
      scene.add(mesh);

      projectiles.push({
        kind: 'catapult',
        mesh,
        start,
        target,
        t: 0,
        duration: 1.2,
        arc: 20,
        auto: true
      });

      makeSpark(team.catapult.group.position.clone().add(new THREE.Vector3(0, 2.2, 0)), 0xffe0a0, 0.9);
    }

    function convertSiegeTeamToTroops(team) {
      makeDust(team.catapult.group.position, 4.8);
      scene.remove(team.catapult.group);

      for (const crew of team.crew) {
        crew.scale.setScalar(1.0);
        allies.push({
          group: crew,
          pos: crew.position,
          health: 55 + upgradeStats.allyHealthBonus,
          maxHealth: 55 + upgradeStats.allyHealthBonus,
          blockTimer: 0,
          blockCooldown: Math.random() * 1.2,
          guard: 55 + upgradeStats.allyGuardBonus,
          maxGuard: 55 + upgradeStats.allyGuardBonus,
          shieldRechargeTimer: 0,
          shieldBroken: false,
          attackCooldown: (2.2 + Math.random() * 1.4) * upgradeStats.allyCooldownMultiplier,
          speed: 4.2 + upgradeStats.allySpeedBonus,
          active: true,
          reviveTimer: 0
        });
      }

      team.converted = true;
      showMessage(t('msg.stoneDepotEmpty'));
    }



    function closestPointOnSegment(point, start, end) {
      const seg = end.clone().sub(start);
      const lenSq = seg.lengthSq();
      if (lenSq <= 0.000001) return start.clone();
      const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(seg) / lenSq, 0, 1);
      return start.clone().addScaledVector(seg, t);
    }

    function updateProjectiles(dt) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];

        if (p.kind === 'arrow') {
          const previousPos = p.mesh.position.clone();
          p.mesh.position.addScaledVector(p.velocity, dt);
          p.life -= dt;

          let hit = false;
          for (const enemy of [...enemies]) {
            // Die Trefferprüfung nimmt jetzt die ganze Strecke des Pfeils zwischen zwei Frames.
            // Dadurch fliegt ein schneller Pfeil nicht mehr einfach durch den Gegner.
            const hitRadius = Math.max(enemy.radius + 1.15, 2.05);
            const hitPoint = closestPointOnSegment(enemy.pos, previousPos, p.mesh.position);
            const d = enemy.pos.distanceTo(hitPoint);

            if (d < hitRadius) {
              const incomingFrom = previousPos;
              const enemyForward = forwardFromYaw(enemy.group.rotation.y);
              const enemyToArrow = incomingFrom.clone().sub(enemy.pos).normalize();
              const shieldSide = enemyForward.dot(enemyToArrow) > 0.12;

              const blockChance = enemy.type === 'shield' ? 0.48 : enemy.type === 'heavy' ? 0.32 : enemy.type === 'captain' ? 0.42 : enemy.type === 'king' ? 0.52 : 0.15;

              if (shieldSide && isShieldReady(enemy) && enemy.blockCooldown <= 0 && Math.random() < blockChance) {
                enemy.blockTimer = 0.65;
                enemy.blockCooldown = 1.0;
                setShieldPose(enemy.group, true);
              }

              if (shieldSide && enemy.blockTimer > 0 && isShieldReady(enemy)) {
                blockPressure(enemy, enemy.group, 30, enemy.pos);
              } else {
                if (enemy.type === 'king') enemy.aggroTimer = 2.5;
                enemy.health -= p.damage;
                playSfx('arrowHit');
                makeSpark(hitPoint, 0xfff0b8, 1.05);
                if (enemy.health <= 0) defeatEnemy(enemy, enemy.score + 35);
              }

              hit = true;
              break;
            }
          }

          if (hit || p.life <= 0) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
          }

          continue;
        }

        const tNext = (p.t || 0) + dt / p.duration;
        p.t = tNext;

        const t = Math.min(p.t, 1);
        const pos = p.start.clone().lerp(p.target, t);
        pos.y += Math.sin(t * Math.PI) * p.arc;
        p.mesh.position.copy(pos);
        p.mesh.rotation.x += dt * 6;
        p.mesh.rotation.z += dt * 4;

        if (t >= 1) {
          impactCatapultStone(p.target);
          scene.remove(p.mesh);
          projectiles.splice(i, 1);
        }
      }
    }

    function impactCatapultStone(position) {
      makeDust(position, 6.0);
      playSfx('boom');

      for (const enemy of [...enemies]) {
        const d = enemy.pos.distanceTo(position);
        if (d < 9.0 + upgradeStats.catapultRadiusBonus) {
          if (enemy.blockTimer > 0 && isShieldReady(enemy)) {
            blockPressure(enemy, enemy.group, 70 + upgradeStats.catapultDamageBonus, enemy.pos);
            continue;
          }

          if (enemy.type === 'king') enemy.aggroTimer = 2.0;
          enemy.health -= (enemy.type === 'captain' ? 10 : enemy.type === 'king' ? 12 : 20) + upgradeStats.catapultDamageBonus;
          makeSpark(enemy.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0xffefbf, 1.8);
          if (enemy.health <= 0) defeatEnemy(enemy, enemy.score + 80);
        }
      }
    }

    function updateEffects(dt) {
      for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        e.life -= dt;
        const k = 1 + (1 - e.life / e.maxLife) * e.grow;
        e.mesh.scale.setScalar(k);

        if (e.mesh.material) {
          e.mesh.material.opacity = Math.max(0, (e.life / e.maxLife) * e.startOpacity);
        }

        if (e.life <= 0) {
          scene.remove(e.mesh);
          effects.splice(i, 1);
        }
      }
    }

    function updateCatapult(dt) {
      if (catapultAnim > 0) {
        catapultAnim -= dt;
        const k = catapultAnim / 0.65;
        catapult.arm.rotation.x = 0.42 - Math.sin((1 - k) * Math.PI) * 1.35;
      } else {
        catapult.arm.rotation.x += (0.42 - catapult.arm.rotation.x) * 0.1;
      }
    }

    function makeSpark(position, color, size) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 12, 12),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.55,
          wireframe: true
        })
      );
      mesh.position.copy(position);
      scene.add(mesh);
      effects.push({ mesh, life: 0.35, maxLife: 0.35, grow: 1.8, startOpacity: 0.55 });
    }

    function makeDust(position, size) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 18, 18),
        new THREE.MeshBasicMaterial({
          color: 0xc7b084,
          transparent: true,
          opacity: 0.36,
          wireframe: true
        })
      );
      mesh.position.copy(position);
      mesh.position.y = 0.7;
      scene.add(mesh);
      effects.push({ mesh, life: 0.55, maxLife: 0.55, grow: 1.5, startOpacity: 0.36 });
    }

    function updateHint() {
      const hint = getInteractionHint();
      if (hint) {
        hud.hint.textContent = hint;
        hud.hint.style.opacity = 1;
      } else {
        hud.hint.style.opacity = 0;
      }
    }

    function getInteractionHint() {
      if (gameMode === 'caravan') {
        for (const pickup of caravanPickups) {
          if (!pickup.collected && player.pos.distanceTo(pickup.group.position) < 4.2) {
            return t('hint.caravanCollect');
          }
        }

        if (player.pos.distanceTo(caravanGoal) < 7.5) {
          if (caravanCollected < caravanTotal) return t('hint.caravanCastleCollect');
          if (enemies.length > 0) return t('hint.caravanCastleEnemies');
          return t('hint.caravanCastleDone');
        }

        return t('hint.caravanFollow');
      }

      if (unlockedHorse && !player.mounted && horse.visible && player.pos.distanceTo(horse.position) < 4.2) {
        return t('hint.mount');
      }

      if (player.mounted) {
        return t('hint.dismount');
      }

      const nearStone = nearestStone();
      if (!player.carryingStone && nearStone && player.pos.distanceTo(nearStone.mesh.position) < 2.4) {
        return t('hint.pickStone');
      }

      const nearCatapult = unlockedCatapult && catapult.group.visible && player.pos.distanceTo(catapult.group.position) < 5.8;
      if (nearCatapult && player.carryingStone && !catapultLoaded) {
        return t('hint.loadCatapult');
      }

      if (nearCatapult && catapultLoaded && catapultCooldown <= 0) {
        return t('hint.fireCatapult');
      }

      if (nearCatapult && catapultCooldown > 0) {
        return t('hint.catapultReloading');
      }

      return '';
    }

    function interact() {
      if (gameMode === 'caravan') return;
      if (player.mounted) return;

      const nearStone = nearestStone();
      if (!player.carryingStone && nearStone && player.pos.distanceTo(nearStone.mesh.position) < 2.4) {
        player.carryingStone = true;
        scene.remove(nearStone.mesh);
        stones.splice(stones.indexOf(nearStone), 1);
        showMessage(t('msg.stonePickedUp'));
        return;
      }

      const nearCatapult = unlockedCatapult && catapult.group.visible && player.pos.distanceTo(catapult.group.position) < 5.8;
      if (nearCatapult && player.carryingStone && !catapultLoaded) {
        player.carryingStone = false;
        catapultLoaded = true;

        catapultStoneMesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.5, 0),
          new THREE.MeshStandardMaterial({ color: 0xb5b2a2, roughness: 0.9 })
        );
        catapultStoneMesh.position.set(0, 0.38, 4.0);
        catapult.arm.add(catapultStoneMesh);

        showMessage(t('msg.catapultLoaded'));
      }
    }

    function fireCatapult() {
      if (!unlockedCatapult || !catapult.group.visible) return;
      if (!catapultLoaded || catapultCooldown > 0) return;
      if (player.pos.distanceTo(catapult.group.position) > 7.5) return;

      catapultLoaded = false;
      playSfx('catapult');
      catapultCooldown = 2.2 * upgradeStats.catapultCooldownMultiplier;
      catapultAnim = 0.65;

      if (catapultStoneMesh) {
        catapult.arm.remove(catapultStoneMesh);
        catapultStoneMesh = null;
      }

      const start = catapult.group.position.clone().add(new THREE.Vector3(0, 3.2, 3.8));
      const targetEnemy = nearestEnemy(catapult.group.position);
      let target;

      if (targetEnemy) {
        target = targetEnemy.pos.clone();
        target.x += THREE.MathUtils.randFloat(-2.5, 2.5);
        target.z += THREE.MathUtils.randFloat(-2.5, 2.5);
      } else {
        target = catapult.group.position.clone().add(new THREE.Vector3(0, 0, 45));
      }
      target.y = 0;

      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.72, 0),
        new THREE.MeshStandardMaterial({ color: 0xaaa693, roughness: 0.9 })
      );
      mesh.position.copy(start);
      mesh.castShadow = true;
      scene.add(mesh);

      projectiles.push({
        kind: 'catapult',
        mesh,
        start,
        target,
        t: 0,
        duration: 1.2,
        arc: 20
      });

      showMessage(t('msg.catapultFires'));
    }

    function toggleMount() {
      if (!unlockedHorse) {
        showMessage(t('msg.horseFromWave2'));
        return;
      }

      if (player.mounted) {
        player.mounted = false;
        horse.visible = true;
        horse.position.copy(player.pos).add(new THREE.Vector3(2.1, 0, 1.8));
        horse.rotation.y = player.yaw;
        showMessage(t('msg.dismounted'));
        return;
      }

      if (horse.visible && player.pos.distanceTo(horse.position) < 4.2) {
        player.mounted = true;
        player.carryingStone = false;
        showMessage(t('msg.mounted'));
      }
    }

    function nearestStone() {
      let best = null;
      let bestD = Infinity;
      for (const s of stones) {
        const d = player.pos.distanceToSquared(s.mesh.position);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      return best;
    }

    function nearestEnemy(pos) {
      let best = null;
      let bestD = Infinity;
      for (const e of enemies) {
        const d = pos.distanceToSquared(e.pos);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      return best;
    }

    function showMessage(text) {
      hud.message.textContent = text;
      hud.message.style.opacity = 1;
      messageTimer = 2.2;
    }

    function updateHud() {
      hud.healthFill.style.width = `${Math.max(0, Math.min(100, (player.health / (player.maxHealth || 100)) * 100))}%`;
      hud.guardFill.style.width = `${Math.max(0, Math.min(100, (player.guard / (player.maxGuard || 100)) * 100))}%`;
      hud.staminaFill.style.width = `${Math.max(0, Math.min(100, (player.stamina / (player.maxStamina || 100)) * 100))}%`;

      hud.scoreText.textContent = t('hud.score', { score: Math.floor(score) });

      if (gameMode === 'caravan') {
        hud.waveText.textContent = t('hud.modeCaravan');
        hud.enemyText.textContent = t('hud.enemies', { count: enemies.length });
      } else {
        hud.waveText.textContent = t('hud.wave', { wave });
        hud.enemyText.textContent = t('hud.enemies', { count: enemies.length + enemiesToSpawn });
      }

      hud.highText.textContent = t('hud.highscore', { highscore });

      let shieldStatus = '';
      if ((player.shieldRechargeTimer || 0) > 0) {
        shieldStatus = t('hud.shield.recharging', { seconds: Math.ceil(player.shieldRechargeTimer) });
      } else if (player.guard <= 0) {
        shieldStatus = t('hud.shield.empty');
      } else {
        shieldStatus = t('hud.shield.percent', { percent: Math.ceil(player.guard) });
      }

      hud.statusText.textContent = t('hud.status', { mount: player.mounted ? t('hud.status.mounted') : t('hud.status.onFoot'), control: touchEnabled ? t('hud.status.controlTablet') : t('hud.status.controlPc'), weapon: player.weapon === 'bow' ? t('hud.status.weaponBow') : t('hud.status.weaponSword'), shield: shieldStatus, horseHint: unlockedHorse ? '' : (gameMode === 'caravan' ? '' : t('hud.status.horseHint')) });
      hud.stoneText.textContent = gameMode === 'caravan' ? t('hud.savedKnights', { collected: caravanCollected, total: caravanTotal }) : (player.carryingStone ? t('hud.stone.carried') : t('hud.stone.none'));

      if (gameMode === 'caravan') {
        hud.catapultText.textContent = t('hud.catapult.caravan');
        hud.bowText.textContent = t('hud.bow.caravan');
      } else if (!unlockedCatapult) {
        hud.catapultText.textContent = t('hud.catapult.locked');
        if (!unlockedBow) {
          hud.bowText.textContent = t('hud.bow.locked');
        } else if (arrows > 0) {
          hud.bowText.textContent = t('hud.bow.ready', { arrows, maxArrows: getMaxArrows() });
        } else {
          hud.bowText.textContent = t('hud.bow.reloading', { seconds: Math.ceil(Math.max(0, arrowReloadTimer)) });
        }
      } else {
        hud.catapultText.textContent = t('hud.catapult.state', { state: catapultLoaded ? t('hud.catapult.loaded') : t('hud.catapult.empty'), reload: catapultCooldown > 0 ? t('hud.catapult.reloading') : '' });
        if (!unlockedBow) {
          hud.bowText.textContent = t('hud.bow.locked');
        } else if (arrows > 0) {
          hud.bowText.textContent = t('hud.bow.ready', { arrows, maxArrows: getMaxArrows() });
        } else {
          hud.bowText.textContent = t('hud.bow.reloading', { seconds: Math.ceil(Math.max(0, arrowReloadTimer)) });
        }
      }

      if (healPotionReady) {
        hud.potionText.textContent = t('hud.potion.ready');
      } else {
        hud.potionText.textContent = t('hud.potion.charging', { seconds: Math.ceil(Math.max(0, healPotionCooldown)) });
      }

      if (gameMode === 'caravan') {
        hud.objectiveText.textContent = t('hud.objective.caravan', { collected: caravanCollected, total: caravanTotal });
        hud.rewardText.textContent = enemies.length > 0 ? t('hud.reward.caravanAmbush') : t('hud.reward.caravanFollow');
      } else if (gameMode === 'hardcore') {
        hud.objectiveText.textContent = t('hud.objective.hardcore', { wave });
        hud.rewardText.textContent = nextRewardText();
      } else {
        hud.objectiveText.textContent = t('hud.objective.default');
        hud.rewardText.textContent = nextRewardText();
      }

      updateTouchButtonLabels();
    }

    function nextRewardText() {
      if (wave < 2 && !unlockedHorse) return t('nextReward.horse');
      if (wave < 4 && !unlockedBow) return t('nextReward.bow');
      if (wave < 6 && !unlockedCatapult) return t('nextReward.catapult');
      if (wave < 8 && !unlockedSiegeTeams) return t('nextReward.siege');
      if (!unlockedSiegeTeams) return t('nextReward.siege');
      return t('nextReward.summary', { upgrades: upgradeLog.length, teams: siegeTeams.length, stones: siegeTeams.reduce((sum, team) => sum + Math.max(0, team.stones || 0), 0) });
    }

    function endGame() {
      running = false;
      gameOver = true;
      updateCampBoundaryVisibility();
      playSfx('defeat');
      stopBackgroundMusic();
      if (hud.touchControls) hud.touchControls.classList.remove('visible');
      resetTouchState();

      if (score > highscore) {
        highscore = Math.floor(score);
        try { localStorage.setItem('katapultKlingeHighscore_v32', String(highscore)); } catch (e) {}
      }

      document.exitPointerLock?.();
      const completedWaves = gameMode === 'caravan' ? 0 : Math.max(0, wave - 1);
      const endText = gameMode === 'caravan'
        ? t('end.caravanLostText', { collected: caravanCollected, total: caravanTotal, score: Math.floor(score), highscore })
        : t('end.fieldLostText', { wave, completed: completedWaves, waveWord: completedWaves === 1 ? t('end.waveSingular') : t('end.wavePlural'), score: Math.floor(score), upgrades: upgradeLog.length, highscore });

      showFlowOverlay({
        eyebrow: t('end.eyebrow'),
        title: gameMode === 'caravan' ? t('end.caravanLostTitle') : t('end.fieldLostTitle'),
        text: endText,
        button: t('end.backToMenu'),
        onContinue: () => {
          hud.menu.style.display = 'flex';
          hud.menu.scrollTop = 0;
          document.querySelector('#menuBox h1').textContent = gameMode === 'caravan' ? t('end.caravanLostHeading') : t('end.fieldLostHeading');
          document.getElementById('subtitle').textContent = gameMode === 'caravan'
            ? t('end.caravanWonSubtitle', { collected: caravanCollected, total: caravanTotal, score: Math.floor(score) })
            : t('end.fieldLostSubtitle', { score: Math.floor(score), wave, highscore });
          hud.startButton.textContent = t('end.restart');
        }
      });
    }

    function onKeyDown(e) {
      if (flowOverlayActive) {
        // Ignore key auto-repeat so a held attack/Space key can't confirm.
        if (!e.repeat && (e.code === 'Enter' || e.code === 'Space')) continueFlowOverlay(e);
        return;
      }

      keys[e.code] = true;

      if (upgradeChoosing) {
        if (e.code === 'Digit1' || e.code === 'Numpad1' || e.code === 'ArrowLeft') {
          e.preventDefault();
          chooseUpgrade(0);
          return;
        }
        if (e.code === 'Digit2' || e.code === 'Numpad2' || e.code === 'ArrowRight') {
          e.preventDefault();
          chooseUpgrade(1);
          return;
        }
      }

      if (e.code === 'KeyE' && running && !paused) interact();
      if (e.code === 'KeyF' && running && !paused) fireCatapult();
      if (e.code === 'KeyQ' && running && !paused) toggleWeapon();
      if (e.code === 'KeyR' && running && !paused) toggleMount();
      if (e.code === 'KeyH' && running && !paused) useHealingPotion();

      if (e.code === 'KeyP' && running) {
        paused = !paused;
        showMessage(paused ? t('msg.paused') : t('msg.resumed'));
        if (paused) document.exitPointerLock?.();
        else tryPointerLock();
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    }

    function onMouseMove(e) {
      if (!running || paused) return;
      if (document.pointerLockElement !== document.body) return;
      viewYaw -= e.movementX * 0.0023;
    }

    function tryPointerLock() {
      updateControlProfile();

      if (touchEnabled) {
        if (hud.touchControls) hud.touchControls.classList.add('visible');
        return;
      }

      renderer.domElement.requestPointerLock?.();
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }


// --- i18n bootstrap --------------------------------------------------------
// Fills the static [data-i18n] markup, wires the language buttons and refreshes
// menu texts that are otherwise only set on a one-off event when the language
// changes. The HUD already calls t() every frame, so it updates on its own.
function refreshLocalisedMenuTexts() {
  applyTranslations();
  setGameMode(gameMode);
  updateControlProfile();
  updateHeraldryPreview();
  updateTouchButtonLabels();
  updateHud();
}

function markActiveLangButtons(code) {
  document.querySelectorAll('[data-lang]').forEach(btn =>
    btn.classList.toggle('selected', btn.getAttribute('data-lang') === code));
}

document.querySelectorAll('[data-lang]').forEach(btn => {
  btn.addEventListener('click', () => setLocale(btn.getAttribute('data-lang')));
});
onLocaleChange(code => { refreshLocalisedMenuTexts(); markActiveLangButtons(code); });

applyTranslations();
markActiveLangButtons(getLocale());
refreshLocalisedMenuTexts();

// Show the game version in the menu.
const versionTagEl = document.getElementById('versionTag');
if (versionTagEl) versionTagEl.textContent = VERSION;
