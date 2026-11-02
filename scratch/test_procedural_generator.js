// Procedural Level Generator Test Suite
const assert = require('assert');
const fs = require('fs');

// Mock localStorage
const store = {};
global.localStorage = {
  getItem: (k) => store[k] !== undefined ? store[k] : null,
  setItem: (k, v) => { store[k] = v.toString(); },
  removeItem: (k) => { delete store[k]; }
};

// Mock Audio & Weather
global.window = {
  gameLogger: { log: () => {} },
  weatherSystem: { setStage: () => {} },
  soundEngine: {
    resume: () => {},
    startBGM: () => {},
    playStageClear: () => {},
    playPickup: () => {},
    playSwing: () => {},
    playBossIntro: () => {},
    playBossLaugh: () => {}
  },
  combatSystem: {
    spawnComboText: () => {},
    triggerScreenShake: () => {}
  }
};

// Load stage.js and entities.js
eval(fs.readFileSync('src/entities.js', 'utf8'));
eval(fs.readFileSync('src/stage.js', 'utf8'));

const stage = new window.Stage();

console.log('--- TEST 1: Procedural Stage Names Generation ---');
for (let s = 4; s <= 12; s++) {
  const nameInfo = stage.getProceduralStageName(s);
  assert(nameInfo.title && nameInfo.title.length > 5, `Stage ${s} title should be valid`);
  assert(nameInfo.subtitle && nameInfo.subtitle.length > 5, `Stage ${s} subtitle should be valid`);
  console.log(`  Stage ${s}: "${nameInfo.title}" ${nameInfo.subtitle}`);
}
console.log('✓ PASS: Procedural stage names generated dynamically');

console.log('--- TEST 2: Procedural Themes & Cycling ---');
const seenThemes = new Set();
for (let s = 1; s <= 16; s++) {
  const theme = stage.getProceduralTheme(s);
  assert(theme.id && theme.groundColor && theme.curbColor && theme.skyTop, `Theme for stage ${s} is valid`);
  seenThemes.add(theme.id);
}
assert(seenThemes.size >= 8, 'All 8 environmental themes should be visited');
console.log(`✓ PASS: All ${seenThemes.size} distinct themes successfully loaded and verified`);

console.log('--- TEST 3: Procedural Horizontal Zones Generation (Stage 4 & 10) ---');
for (const s of [4, 10, 25]) {
  const zones = stage.createProceduralStageZones(s);
  assert.strictEqual(zones.length, 20, 'Should generate 20 zones per procedural marathon stage');
  
  // Zone 10 is mid-boss
  const midZone = zones[9];
  assert(midZone.enemies.some(e => e.isBoss), `Zone 10 of Stage ${s} must contain a mid-boss`);
  
  // Zone 20 is final boss
  const bossZone = zones[19];
  assert(bossZone.isBossZone, `Zone 20 of Stage ${s} must be a boss zone`);
  assert(bossZone.enemies.some(e => e.isBoss), `Zone 20 must have a boss enemy`);
  assert(bossZone.enemies[0].bossName, `Boss must have an empowered title: ${bossZone.enemies[0].bossName}`);
  
  // Check breakables and enemy types
  let totalEnemies = 0;
  zones.forEach(z => { totalEnemies += z.enemies.length; });
  assert(totalEnemies >= 60, `Stage ${s} should have a substantial enemy count (${totalEnemies})`);
  console.log(`  Stage ${s}: 20 zones, ${totalEnemies} enemies, Boss: "${bossZone.enemies[0].bossName}"`);
}
console.log('✓ PASS: Procedural zones, scaling waves, and bosses verified');

console.log('--- TEST 4: Procedural Vertical Zones (Pagoda Ascent) ---');
stage.setGameMode('VERTICAL');
for (const s of [4, 8]) {
  const vZones = stage.createProceduralVerticalStageZones(s);
  assert.strictEqual(vZones.length, 20, 'Vertical stage should have 20 ascending floors');
  assert(vZones[9].enemies.some(e => e.isBoss), 'Floor 10 should be a mid-boss');
  assert(vZones[19].isBossZone, 'Floor 20 should be a pinnacle tower boss');
  console.log(`  Vertical Sector ${s}: Floors ${(s - 1) * 20 + 1}-${s * 20}, Boss: "${vZones[19].enemies[0].bossName}"`);
}
console.log('✓ PASS: Procedural vertical stages and 20-floor sectors verified');

console.log('--- TEST 5: Stage.loadStage() Across Endless Progression ---');
stage.setGameMode('HORIZONTAL');
stage.loadStage(1);
assert.strictEqual(stage.currentStageNum, 1);
stage.loadStage(4);
assert.strictEqual(stage.currentStageNum, 4);
assert.strictEqual(stage.zones.length, 20);
assert(stage.getStageName(4).length > 3);

stage.loadStage(100);
assert.strictEqual(stage.currentStageNum, 100);
assert.strictEqual(stage.zones.length, 20);
console.log(`  Stage 100 Title: "${stage.getStageName(100)}"`);
console.log('✓ PASS: Endless stage loading works seamlessly up to Stage 100+');

console.log('--- TEST 6: Mock Canvas Procedural Background Render ---');
const mockCtx = {
  createLinearGradient: () => ({ addColorStop: () => {} }),
  fillRect: () => {},
  strokeRect: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  moveTo: () => {},
  lineTo: () => {},
  save: () => {},
  restore: () => {},
  fillText: () => {}
};

assert.doesNotThrow(() => {
  stage.drawProceduralBackground(mockCtx, 1200, 4);
  stage.drawProceduralBackground(mockCtx, 3400, 7);
  stage.drawProceduralVerticalBackground(mockCtx, 450, 5);
}, 'Procedural background draw routines must execute without throwing');
console.log('✓ PASS: Procedural background rendering verified without error');

console.log('\nALL 6 PROCEDURAL LEVEL GENERATOR TESTS PASSED CLEANLY! 🚀');
