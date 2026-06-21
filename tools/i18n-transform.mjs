// Build step: turns the extracted prototype body (_body.tmp) into the i18n-aware
// ES module src/game/main.js.
//   - removes constants now living in config.js / data/textures.js
//   - replaces every hardcoded German string with a t('key', {params}) call
//   - prepends the module imports
// Deterministic exact-string replacement; reports any mapping that did not match.
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = new URL('./migration/prototype-body.txt', import.meta.url);
const OUT = new URL('../src/game/main.js', import.meta.url);

let code = readFileSync(SRC, 'utf8');

// --- 1. Remove declarations that moved to config.js / textures.js ----------
const removals = [
  /^ {4}const textureSources = \{[\s\S]*?\n {4}\};\n/m,
  /^ {4}const campSpawnPoints = \[[\s\S]*?\n {4}\];\n/m,
  /^ {4}const enemyColorPalette = \[[\s\S]*?\n {4}\];\n/m,
  '    const maxArrows = 6;\n',
  '    const healPotionCooldownDuration = 60;\n',
  '    const healPotionAmount = 100;\n',
  '    const playerShieldRechargeDuration = 15;\n',
  '    const npcShieldRechargeMin = 10;\n',
  '    const npcShieldRechargeMax = 20;\n',
  "    const campBounds = { xMin: -38, xMax: 38, zMin: -48, zMax: -8 };\n",
  "    const heraldrySymbols = ['cross', 'diamond', 'star', 'moon', 'shield'];\n",
];
for (const r of removals) {
  if (typeof r === 'string') {
    if (!code.includes(r)) console.warn('REMOVE MISS:', JSON.stringify(r.slice(0, 40)));
    code = code.split(r).join('');
  } else {
    if (!r.test(code)) console.warn('REMOVE MISS (regex):', r);
    code = code.replace(r, '');
  }
}

// --- 2. String replacements (old -> new) -----------------------------------
const pairs = [
  // Upgrade pool cards
  ["'Schärfere Klinge'", "t('upgrade.swordDamage.title')"],
  ["'Dein Schwert verursacht mehr Schaden. Gut, wenn du aktiv im Nahkampf kämpfen willst.'", "t('upgrade.swordDamage.text')"],
  ["'Leichte Klinge'", "t('upgrade.swordSpeed.title')"],
  ["'Dein Schwert ist schneller wieder bereit. Das macht Nahkampf flüssiger und weniger träge.'", "t('upgrade.swordSpeed.text')"],
  ["'Robuste Rüstung'", "t('upgrade.health.title')"],
  ["'Du bekommst dauerhaft mehr maximale Lebenspunkte und wirst direkt um denselben Wert geheilt.'", "t('upgrade.health.text')"],
  ["'Verstärkter Schild'", "t('upgrade.shield.title')"],
  ["'Dein Schild hält mehr Druck aus, bevor die Schildbarrikade bricht.'", "t('upgrade.shield.text')"],
  ["'Schildmeister'", "t('upgrade.shieldRecharge.title')"],
  ["'Der Schild kommt schneller zurück und lädt auch nach normalem Blocken schneller wieder auf.'", "t('upgrade.shieldRecharge.text')"],
  ["'Langer Atem'", "t('upgrade.stamina.title')"],
  ["'Du kannst länger sprinten oder galoppieren und erholst Ausdauer schneller.'", "t('upgrade.stamina.text')"],
  ["'Flinke Stiefel'", "t('upgrade.speed.title')"],
  ["'Du bewegst dich zu Fuß schneller. Auch dein Pferd wird beim Galopp etwas schneller.'", "t('upgrade.speed.text')"],
  ["'Mehr Gefolge'", "t('upgrade.allyCount.title')"],
  ["'Zusätzliche verbündete Ritter erscheinen im Lager und helfen sofort in den nächsten Kämpfen.'", "t('upgrade.allyCount.text')"],
  ["'Rittertraining'", "t('upgrade.allyTraining.title')"],
  ["'Deine verbündeten Ritter erhalten mehr Leben, bessere Schilde und etwas stärkere Angriffe.'", "t('upgrade.allyTraining.text')"],
  ["'Heilkräuter'", "t('upgrade.potion.title')"],
  ["'Der Heiltrank wird schneller wieder bereit. Das ist besonders gut für lange Wellen.'", "t('upgrade.potion.text')"],
  ["'Bessere Pfeile'", "t('upgrade.bowPower.title')"],
  ["'Du bekommst mehr Pfeile pro Ladung und jeder Pfeil verursacht etwas mehr Schaden.'", "t('upgrade.bowPower.text')"],
  ["'Schneller Schütze'", "t('upgrade.bowSpeed.title')"],
  ["'Der Bogen kann schneller feuern und leere Pfeilvorräte laden schneller nach.'", "t('upgrade.bowSpeed.text')"],
  ["'Schwerere Steine'", "t('upgrade.catapultPower.title')"],
  ["'Dein Katapult verursacht mehr Flächenschaden, trifft in einem größeren Radius und lädt etwas schneller.'", "t('upgrade.catapultPower.text')"],
  ["'Volle Steinlager'", "t('upgrade.siegeSupply.title')"],
  ["'Automatische Katapult-Truppen erhalten mehr Munition. Bestehende Trupps werden direkt aufgefüllt.'", "t('upgrade.siegeSupply.text')"],

  // upgradeEffectText returns
  ["`+${(1.2 * m).toFixed(1)} Schwertschaden`", "t('upgrade.effect.swordDamage', { value: (1.2 * m).toFixed(1) })"],
  ["`Schwert-Cooldown ${Math.round(6 * m)}% kürzer`", "t('upgrade.effect.swordSpeed', { value: Math.round(6 * m) })"],
  ["`+${Math.round(18 * m)} maximale Lebenspunkte`", "t('upgrade.effect.health', { value: Math.round(18 * m) })"],
  ["`+${Math.round(18 * m)} Schildhaltung`", "t('upgrade.effect.shield', { value: Math.round(18 * m) })"],
  ["`Schild regeneriert schneller`", "t('upgrade.effect.shieldRecharge')"],
  ["`+${Math.round(18 * m)} Ausdauer und bessere Erholung`", "t('upgrade.effect.stamina', { value: Math.round(18 * m) })"],
  ["`+${(0.45 * m).toFixed(1)} Laufgeschwindigkeit`", "t('upgrade.effect.speed', { value: (0.45 * m).toFixed(1) })"],
  ["`+${Math.max(1, Math.round(m))} verbündete Ritter`", "t('upgrade.effect.allyCount', { value: Math.max(1, Math.round(m)) })"],
  ["`Verbündete kämpfen spürbar besser`", "t('upgrade.effect.allyTraining')"],
  ["`+${Math.max(1, Math.round(m))} Pfeile und mehr Bogenschaden`", "t('upgrade.effect.bowPower', { value: Math.max(1, Math.round(m)) })"],
  ["`Bogen lädt und schießt schneller`", "t('upgrade.effect.bowSpeed')"],
  ["`Katapult trifft größere Fläche stärker`", "t('upgrade.effect.catapultPower')"],
  ["`+${Math.max(1, Math.round(m))} Steine pro Katapult-Trupp`", "t('upgrade.effect.siegeSupply', { value: Math.max(1, Math.round(m)) })"],
  ["`Heiltrank ${Math.round(7 * m)}s schneller bereit`", "t('upgrade.effect.potion', { value: Math.round(7 * m) })"],
  ["return 'Verbesserung';", "return t('upgrade.fallback');"],

  // Wave grades
  ["'Legendär'", "t('upgrade.grade.legendary')"],
  ["'Stark'", "t('upgrade.grade.strong')"],
  ["'Solide'", "t('upgrade.grade.solid')"],

  // Upgrade panel + flow
  ["`Welle ${wave} geschafft: ${grade.label}`", "t('upgrade.waveCleared', { wave, grade: grade.label })"],
  ["`Leistung: ${Math.round(grade.score * 100)}% · Zeit: ${Math.ceil(grade.elapsed)}s · Verbündete aktiv: ${grade.activeAllies}/${grade.totalAllies}. Wähle ein Upgrade. Gute Wellen geben stärkere Werte.`", "t('upgrade.summary', { percent: Math.round(grade.score * 100), time: Math.ceil(grade.elapsed), active: grade.activeAllies, total: grade.totalAllies })"],
  ["`Welle ${completedWave} beendet`", "t('upgrade.flow.endedEyebrow', { wave: completedWave })"],
  ["'Welle geschafft!'", "t('upgrade.flow.endedTitle')"],
  ["`Du hast Welle ${completedWave} überstanden.\nLeistung: ${Math.round(grade.score * 100)}% · Zeit: ${Math.ceil(grade.elapsed)}s · Verbündete aktiv: ${grade.activeAllies}/${grade.totalAllies}.`", "t('upgrade.flow.endedText', { wave: completedWave, percent: Math.round(grade.score * 100), time: Math.ceil(grade.elapsed), active: grade.activeAllies, total: grade.totalAllies })"],
  ["'Belohnung auswählen'", "t('upgrade.flow.chooseReward')"],
  ["'Wähle ein Upgrade.'", "t('upgrade.msg.choose')"],
  ["'Upgrade-Fehler. Spiel läuft weiter.'", "t('upgrade.msg.error')"],
  ["'Nächste Welle'", "t('upgrade.flow.nextEyebrow')"],
  ["`Welle ${nextWave} startet`", "t('upgrade.flow.nextTitle', { wave: nextWave })"],
  ["`${upgrade.title} gewählt.\nMach dich bereit: Die nächste Angriffswelle rückt an.`", "t('upgrade.flow.nextText', { title: upgrade.title })"],
  ["`Welle ${nextWave} starten`", "t('upgrade.flow.nextButton', { wave: nextWave })"],
  ["`Welle ${wave}: Mehr rote Ritter!`", "t('msg.moreRedKnights', { wave })"],

  // Collision labels (also surface in shield messages)
  ["label: 'Spieler'", "label: t('label.player')"],
  ["label: 'Gegner'", "label: t('label.enemy')"],
  ["label: 'Verbündeter'", "label: t('label.ally')"],
  ["label: 'zu rettender Ritter'", "label: t('label.caravanKnight')"],

  // Touch / special action labels
  ["return 'Spezial';", "return t('special.special');"],
  ["return 'Katapult';", "return t('special.catapult');"],
  ["return 'Absteigen';", "return t('special.dismount');"],
  ["return 'Pferd';", "return t('special.horse');"],
  ["return 'Laden';", "return t('special.load');"],
  ["hud.touchActionBtn.textContent = 'Aktion';", "hud.touchActionBtn.textContent = t('touchBtn.action');"],
  ["hud.touchActionBtn.textContent = 'Stein';", "hud.touchActionBtn.textContent = t('touchBtn.stone');"],
  ["hud.touchActionBtn.textContent = 'Laden';", "hud.touchActionBtn.textContent = t('touchBtn.load');"],
  ["'Hier reicht Angriff, Schild, Aktion und Trank.'", "t('msg.touchHint')"],
  ["'Keine Spezialaktion in Reichweite.'", "t('msg.noSpecial')"],

  // Control detection badges / info
  ["'Auto erkannt: Tablet / Touch'", "t('control.badge.autoTablet')"],
  ["'Auto erkannt: PC / Maus & Tastatur'", "t('control.badge.autoPc')"],
  ["'Manuell gewählt: Tablet/Test'", "t('control.badge.manualTablet')"],
  ["'Manuell gewählt: PC'", "t('control.badge.manualPc')"],
  ["'Tablet erkannt: Das Spiel zeigt Touch-Joystick und Bildschirm-Buttons. Die Tastatur-Erklärung wird ausgeblendet.'", "t('control.info.tabletAuto')"],
  ["'Tablet/Test: Touch-Joystick und Bildschirm-Buttons werden verwendet.'", "t('control.info.tabletManual')"],
  ["'PC erkannt: Tastatur und Maus bleiben aktiv. Tablet-Steuerung wird nicht eingeblendet.'", "t('control.info.pcAuto')"],
  ["'PC: Tastatur und Maus aktiv. Touch-Overlay wird versteckt.'", "t('control.info.pcManual')"],

  // Mode info
  ["'Classic Easy: normale Wellen ohne Lagergrenze und ohne Pflicht-König.'", "t('mode.info.easy')"],
  ["'Hardcore: Jede Welle besteht nur aus einem feindlichen König. Er darf den roten Lagerrahmen nicht betreten, sonst wird nur diese Welle wiederholt.'", "t('mode.info.hardcore')"],
  ["'Stadtkarawane: Folge den Pfeilen vom Dorftor zur Burg, sammle eigene Ritter ein und wehre feindliche Ritter ab. Kein Wellen-System.'", "t('mode.info.caravan')"],

  // Caravan
  ["'Hinterhalt! Feindliche Ritter greifen die Karawane an.'", "t('msg.caravanAmbush')"],
  ["'Stadtkarawane: Folge den Pfeilen, sammle Ritter ein und erreiche die Burg.'", "t('msg.caravanStart')"],
  ["`Ritter eingesammelt: ${caravanCollected}/${caravanTotal}`", "t('msg.knightCollected', { collected: caravanCollected, total: caravanTotal })"],
  ["`Noch ${caravanTotal - caravanCollected} eigene Ritter einsammeln!`", "t('msg.collectMore', { count: caravanTotal - caravanCollected })"],
  ["'Erst die letzten Gegner abwehren!'", "t('msg.defeatEnemiesFirst')"],
  ["'Karawane hat die Burg erreicht!'", "t('msg.caravanReached')"],
  ["'Karawane geschafft!'", "t('end.caravanFlowTitle')"],
  ["`Du hast die Burg erreicht.\\nRitter gerettet: ${caravanCollected}/${caravanTotal} · Punkte: ${Math.floor(score)} · Highscore: ${highscore}`", "t('end.caravanFlowText', { collected: caravanCollected, total: caravanTotal, score: Math.floor(score), highscore })"],
  ["'STADTKARAWANE GESCHAFFT'", "t('end.caravanWonHeading')"],
  ["`Ritter gerettet: ${caravanCollected}/${caravanTotal} · Punkte: ${Math.floor(score)}`", "t('end.caravanWonSubtitle', { collected: caravanCollected, total: caravanTotal, score: Math.floor(score) })"],
  ["'Nochmal spielen'", "t('end.playAgain')"],

  // Start game / menu reset
  ["`Hardcore: Feindwappen ${enemyHeraldrySymbol}, klickbare Wellen-Einblendungen`", "t('start.subtitle.hardcore', { crest: enemyHeraldrySymbol })"],
  ["`Stadtkarawane: Feindwappen ${enemyHeraldrySymbol}, klickbare Start-Einblendung`", "t('start.subtitle.caravan', { crest: enemyHeraldrySymbol })"],
  ["`Classic Easy: Feindwappen ${enemyHeraldrySymbol}, klickbare Wellen-Einblendungen`", "t('start.subtitle.easy', { crest: enemyHeraldrySymbol })"],
  ["'KATAPULT & KLINGE'", "t('end.menuTitle')"],
  ["'Spiel starten'", "t('start.relabel')"],
  ["'Karawane bereit!'", "t('start.caravanTitle')"],
  ["'Die Stadtkarawane macht sich auf den Weg. Sammle deine Ritter ein und bringe sie sicher zur Burg.'", "t('start.caravanText')"],
  ["'Karawane starten'", "t('start.caravanButton')"],
  ["'Stadtkarawane gestartet: Sammle deine Ritter ein!'", "t('start.caravanMsg')"],
  ["'Es geht los!'", "t('start.title')"],
  ["'Welle 1 beginnt gleich. Stoppe den feindlichen König, bevor er dein Lager erreicht.'", "t('start.text.hardcore')"],
  ["'Welle 1 beginnt gleich. Halte das Feld, sammle Steine und überlebe den ersten Angriff.'", "t('start.text.default')"],
  ["'Welle 1 starten'", "t('start.button')"],
  ["'Welle 1: Du startest zu Fuß und ohne Spezialausrüstung.'", "t('start.wave1Msg')"],
  ["'Spielstart'", "t('start.eyebrow')"],

  // Reward unlocks
  ["'Belohnung Welle 2: Du bekommst ein Pferd!'", "t('reward.horse')"],
  ["'Belohnung Welle 4: Du bekommst einen Bogen! Q wechselt zwischen Schwert und Bogen.'", "t('reward.bow')"],
  ["'Belohnung Welle 6: Dein Katapult ist einsatzbereit!'", "t('reward.catapult')"],
  ["'Belohnung Welle 8: Katapult-Truppen mit eigenem Steinlager erscheinen!'", "t('reward.siege')"],

  // Misc messages
  ["'Dein Schild'", "t('label.playerShield')"],
  ["eyebrow: 'Spielende'", "eyebrow: t('end.eyebrow')"],
  ["'Heiltrank bereit! Drücke H zum Heilen.'", "t('msg.potionReady')"],
  ["'Pfeile wieder aufgeladen!'", "t('msg.arrowsReloaded')"],
  ["`${label}: Schildbarrikade zerbrochen! Schild lädt ${Math.ceil(unit.shieldRechargeTimer)}s.`", "t('msg.shieldBroken', { label, seconds: Math.ceil(unit.shieldRechargeTimer) })"],
  ["`${label}: Schild wieder aufgeladen.`", "t('msg.shieldRecharged', { label })"],
  ["'Den Bogen bekommst du erst in Welle 4.'", "t('msg.bowFromWave4')"],
  ["'Wechsle mit Q zum Bogen.'", "t('msg.switchToBow')"],
  ["'Bogen aktiv. Schwert liegt auf dem Rücken.'", "t('msg.switchedWeaponBow')"],
  ["'Schwert aktiv. Bogen liegt auf dem Rücken.'", "t('msg.switchedWeaponSword')"],
  ["'Hardcore: Nur der feindliche König nähert sich deinem Lager!'", "t('msg.hardcoreKingApproaches')"],
  ["`Hardcore: König im Lager! Welle ${wave} wird wiederholt.`", "t('msg.hardcoreKingInCamp', { wave })"],
  ["'Ein verbündeter Ritter kehrt zurück!'", "t('msg.allyReturns')"],
  ["`Heiltrank lädt noch ${Math.ceil(Math.max(0, healPotionCooldown))}s.`", "t('msg.potionCharging', { seconds: Math.ceil(Math.max(0, healPotionCooldown)) })"],
  ["'Du bist schon vollständig geheilt.'", "t('msg.alreadyHealed')"],
  ["'Heiltrank benutzt: Lebensbalken vollständig gefüllt.'", "t('msg.potionUsed')"],
  ["`Keine Pfeile! Neue Pfeile in ${Math.ceil(arrowReloadTimer)}s.`", "t('msg.noArrows', { seconds: Math.ceil(arrowReloadTimer) })"],
  ["`Pfeil geschossen (${arrows}/${getMaxArrows()})`", "t('msg.arrowShot', { arrows, maxArrows: getMaxArrows() })"],
  ["`Letzter Pfeil! Pfeile laden ${Math.ceil(getArrowReloadDuration())} Sekunden auf.`", "t('msg.lastArrow', { seconds: Math.ceil(getArrowReloadDuration()) })"],
  ["'Ein Steinlager ist leer: Katapult-Trupp greift jetzt zu Fuß an!'", "t('msg.stoneDepotEmpty')"],
  ["'Stein aufgenommen'", "t('msg.stonePickedUp')"],
  ["'Katapult geladen'", "t('msg.catapultLoaded')"],
  ["'Katapult feuert!'", "t('msg.catapultFires')"],
  ["'Das Pferd bekommst du erst in Welle 2.'", "t('msg.horseFromWave2')"],
  ["'Abgestiegen'", "t('msg.dismounted')"],
  ["'Pferd bestiegen'", "t('msg.mounted')"],
  ["paused ? 'Pause' : 'Weiter'", "paused ? t('msg.paused') : t('msg.resumed')"],

  // Interaction hints
  ["'Eigener Ritter: nahe herangehen zum Einsammeln'", "t('hint.caravanCollect')"],
  ["'Burg erreicht: Erst alle eigenen Ritter einsammeln'", "t('hint.caravanCastleCollect')"],
  ["'Burg erreicht: Erst Gegner abwehren'", "t('hint.caravanCastleEnemies')"],
  ["'Burg erreicht!'", "t('hint.caravanCastleDone')"],
  ["'Folge den gelben Pfeilen durch das Dorf'", "t('hint.caravanFollow')"],
  ["'R drücken: Pferd besteigen'", "t('hint.mount')"],
  ["'R drücken: absteigen'", "t('hint.dismount')"],
  ["'E drücken: Stein aufheben'", "t('hint.pickStone')"],
  ["'E drücken: Katapult laden'", "t('hint.loadCatapult')"],
  ["'F drücken: Katapult abfeuern'", "t('hint.fireCatapult')"],
  ["'Katapult lädt nach ...'", "t('hint.catapultReloading')"],

  // HUD (updateHud)
  ["`Punkte: ${Math.floor(score)}`", "t('hud.score', { score: Math.floor(score) })"],
  ["'Modus: Stadtkarawane'", "t('hud.modeCaravan')"],
  ["`Gegner: ${enemies.length}`", "t('hud.enemies', { count: enemies.length })"],
  ["`Welle: ${wave}`", "t('hud.wave', { wave })"],
  ["`Gegner: ${enemies.length + enemiesToSpawn}`", "t('hud.enemies', { count: enemies.length + enemiesToSpawn })"],
  ["`Highscore: ${highscore}`", "t('hud.highscore', { highscore })"],
  ["` · Schild lädt ${Math.ceil(player.shieldRechargeTimer)}s`", "t('hud.shield.recharging', { seconds: Math.ceil(player.shieldRechargeTimer) })"],
  ["' · Schild leer'", "t('hud.shield.empty')"],
  ["` · Schild ${Math.ceil(player.guard)}%`", "t('hud.shield.percent', { percent: Math.ceil(player.guard) })"],
  ["`Status: ${player.mounted ? 'auf dem Pferd' : 'zu Fuß'} · Steuerung: ${touchEnabled ? 'Tablet' : 'PC'} · Waffe: ${player.weapon === 'bow' ? 'Bogen' : 'Schwert'}${shieldStatus}${unlockedHorse ? '' : (gameMode === 'caravan' ? '' : ' · Pferd ab Welle 2')}`", "t('hud.status', { mount: player.mounted ? t('hud.status.mounted') : t('hud.status.onFoot'), control: touchEnabled ? t('hud.status.controlTablet') : t('hud.status.controlPc'), weapon: player.weapon === 'bow' ? t('hud.status.weaponBow') : t('hud.status.weaponSword'), shield: shieldStatus, horseHint: unlockedHorse ? '' : (gameMode === 'caravan' ? '' : t('hud.status.horseHint')) })"],
  ["gameMode === 'caravan' ? `Gerettete Ritter: ${caravanCollected}/${caravanTotal}` : `Stein: ${player.carryingStone ? 'getragen' : 'keiner'}`", "gameMode === 'caravan' ? t('hud.savedKnights', { collected: caravanCollected, total: caravanTotal }) : (player.carryingStone ? t('hud.stone.carried') : t('hud.stone.none'))"],
  ["'Karawane: Folge den gelben Pfeilen zur Burg'", "t('hud.catapult.caravan')"],
  ["'Stadtkarawane: Schwert und Schild bereit'", "t('hud.bow.caravan')"],
  ["'Katapult: gesperrt bis Welle 6'", "t('hud.catapult.locked')"],
  ["'Bogen: gesperrt bis Welle 4'", "t('hud.bow.locked')"],
  ["`Bogen: ${arrows}/${getMaxArrows()} Pfeile · Q Wechsel`", "t('hud.bow.ready', { arrows, maxArrows: getMaxArrows() })"],
  ["`Bogen: lädt Pfeile auf (${Math.ceil(Math.max(0, arrowReloadTimer))}s) · Q Wechsel`", "t('hud.bow.reloading', { seconds: Math.ceil(Math.max(0, arrowReloadTimer)) })"],
  ["`Katapult: ${catapultLoaded ? 'geladen' : 'leer'}${catapultCooldown > 0 ? ' · lädt nach' : ''}`", "t('hud.catapult.state', { state: catapultLoaded ? t('hud.catapult.loaded') : t('hud.catapult.empty'), reload: catapultCooldown > 0 ? t('hud.catapult.reloading') : '' })"],
  ["'Heiltrank: bereit · H = volle Heilung'", "t('hud.potion.ready')"],
  ["`Heiltrank: lädt auf (${Math.ceil(Math.max(0, healPotionCooldown))}s)`", "t('hud.potion.charging', { seconds: Math.ceil(Math.max(0, healPotionCooldown)) })"],
  ["`Stadtkarawane: ${caravanCollected}/${caravanTotal} Ritter sammeln. Sie folgen dir in Karawanen-Schlange zur Burg.`", "t('hud.objective.caravan', { collected: caravanCollected, total: caravanTotal })"],
  ["'Hinterhalt: Gegner abwehren!'", "t('hud.reward.caravanAmbush')"],
  ["'Wegziel: Den gelben Pfeilen folgen.'", "t('hud.reward.caravanFollow')"],
  ["`Hardcore-Ziel: Stoppe den alleinigen König vor dem roten Lagerrahmen. Welle ${wave}`", "t('hud.objective.hardcore', { wave })"],
  ["'Ziel: Halte das Feld und überstehe die Wellen.'", "t('hud.objective.default')"],

  // nextRewardText
  ["'Nächste Belohnung: Welle 2 Pferd'", "t('nextReward.horse')"],
  ["'Nächste Belohnung: Welle 4 Bogen'", "t('nextReward.bow')"],
  ["'Nächste Belohnung: Welle 6 Katapult'", "t('nextReward.catapult')"],
  ["'Nächste Belohnung: Welle 8 Katapult-Truppen'", "t('nextReward.siege')"],
  ["`Upgrades: ${upgradeLog.length} · Katapult-Truppen: ${siegeTeams.length} aktiv · Steinlager: ${siegeTeams.reduce((sum, team) => sum + Math.max(0, team.stones || 0), 0)}`", "t('nextReward.summary', { upgrades: upgradeLog.length, teams: siegeTeams.length, stones: siegeTeams.reduce((sum, team) => sum + Math.max(0, team.stones || 0), 0) })"],

  // End game
  ["`Stadtkarawane verloren.\\nRitter gerettet: ${caravanCollected}/${caravanTotal} · Punkte: ${Math.floor(score)} · Highscore: ${highscore}`", "t('end.caravanLostText', { collected: caravanCollected, total: caravanTotal, score: Math.floor(score), highscore })"],
  ["`Du bist bis Welle ${wave} gekommen und hast ${completedWaves} Welle${completedWaves === 1 ? '' : 'n'} vollständig geschafft.\\nPunkte: ${Math.floor(score)} · Gewählte Upgrades: ${upgradeLog.length} · Highscore: ${highscore}`", "t('end.fieldLostText', { wave, completed: completedWaves, waveWord: completedWaves === 1 ? t('end.waveSingular') : t('end.wavePlural'), score: Math.floor(score), upgrades: upgradeLog.length, highscore })"],
  ["'Zurück zum Menü'", "t('end.backToMenu')"],
  ["'Karawane verloren'", "t('end.caravanLostTitle')"],
  ["'Das Feld ist verloren'", "t('end.fieldLostTitle')"],
  ["'STADTKARAWANE VERLOREN'", "t('end.caravanLostHeading')"],
  ["'DAS FELD IST VERLOREN'", "t('end.fieldLostHeading')"],
  ["`Punkte: ${Math.floor(score)} · Erreichte Welle: ${wave} · Highscore: ${highscore}`", "t('end.fieldLostSubtitle', { score: Math.floor(score), wave, highscore })"],
  ["'Neu starten'", "t('end.restart')"],
];

let totalReplacements = 0;
const misses = [];
for (const [oldStr, newStr] of pairs) {
  const count = code.split(oldStr).length - 1;
  if (count === 0) { misses.push(oldStr); continue; }
  totalReplacements += count;
  code = code.split(oldStr).join(newStr);
}

// --- 3. Prepend module header ----------------------------------------------
const header = `// Catapult & Blade - game engine.
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

`;

const footer = `

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
`;

writeFileSync(OUT, header + code + footer, 'utf8');

console.log('Replacements applied:', totalReplacements);
console.log('Output lines:', (header + code).split('\n').length);
if (misses.length) {
  console.log('\n!!! UNMATCHED MAPPINGS (' + misses.length + '):');
  for (const m of misses) console.log('  MISS:', m);
} else {
  console.log('All mappings matched.');
}
