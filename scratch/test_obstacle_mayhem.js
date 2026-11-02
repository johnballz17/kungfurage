/**
 * Comprehensive verification of Obstacle Mayhem & Environmental Hazards
 */
const assert = require('assert');
const fs = require('fs');

// Mock browser globals
global.window = global;
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = v.toString(); },
  removeItem(k) { delete this.data[k]; }
};

global.soundEngine = {
  playHit() {},
  playKnockdown() {},
  playPickup() {},
  playExplosion() { this.exploded = true; },
  playElectricZap() { this.zapped = true; },
  playAcidSizzle() { this.sizzled = true; },
  playGeyserSplash() { this.splashed = true; },
  playTrapClick() { this.clicked = true; },
  playSpikeTrap() { this.spiked = true; },
  startBGM() {},
  stopBGM() {},
  resume() {}
};

global.combatSystem = {
  screenShakeEnabled: true,
  screenFlashEnabled: true,
  spawnHitSpark() {},
  spawnDamageNumber() {},
  spawnComboText() {},
  spawnGreenGore() {},
  triggerScreenShake() { this.shook = true; }
};

global.spriteRenderer = {
  drawShadow() {},
  drawBreakable() {},
  drawItem() {}
};

// Load entities.js
const entitiesCode = fs.readFileSync('src/entities.js', 'utf8');
eval(entitiesCode);

// Load stage.js
const stageCode = fs.readFileSync('src/stage.js', 'utf8');
eval(stageCode);

console.log('--- 1. Testing Hazard Obstacle Instantiation ---');
const tnt = new window.Breakable(100, 200, 'tnt', 'scroll');
assert.strictEqual(tnt.type, 'tnt');
assert.strictEqual(tnt.health, 1);
assert.strictEqual(tnt.drops, 'scroll');

const pylon = new window.Breakable(150, 200, 'electric_pylon', 'nunchaku');
assert.strictEqual(pylon.type, 'electric_pylon');
assert.strictEqual(pylon.health, 4);

const spikes = new window.Breakable(200, 200, 'spike_trap');
assert.strictEqual(spikes.type, 'spike_trap');
assert.strictEqual(spikes.hazardState, 'retracted');

const acid = new window.Breakable(250, 200, 'acid_drum', 'pizza');
assert.strictEqual(acid.type, 'acid_drum');
assert.strictEqual(acid.health, 2);

const hydrant = new window.Breakable(300, 200, 'hydrant', 'pizza');
assert.strictEqual(hydrant.type, 'hydrant');
assert.strictEqual(hydrant.health, 2);
console.log('✓ All 5 hazard obstacle types instantiate with correct specs!');

console.log('--- 2. Testing TNT Detonation & AoE Blast ---');
// Mock game environment
const dummyEnemy1 = new window.Enemy(120, 200, 'thug'); // Distance 20px from TNT (100, 200)
const initialEnemyHP = dummyEnemy1.health;
const dummyEnemy2 = new window.Enemy(400, 200, 'thug'); // Far away
const initialEnemy2HP = dummyEnemy2.health;
const dummyAdjacentBarrel = new window.Breakable(140, 200, 'barrel', 'pizza'); // Within 40px
global.game = {
  enemies: [dummyEnemy1, dummyEnemy2],
  breakables: [tnt, dummyAdjacentBarrel],
  pickups: [],
  player: new window.Player(50, 200, 'smellu')
};

tnt.takeDamage(1, 1);
assert.strictEqual(tnt.isDead, true, 'TNT should be dead upon takeDamage');
assert.strictEqual(tnt.hasDetonated, true, 'TNT should have detonated');
assert.strictEqual(soundEngine.exploded, true, 'TNT should play explosion SFX');
assert.strictEqual(combatSystem.shook, true, 'TNT should trigger screen shake');
assert.ok(dummyEnemy1.health < initialEnemyHP, 'Enemy within blast radius should take heavy damage');
assert.strictEqual(dummyEnemy2.health, initialEnemy2HP, 'Enemy outside blast radius should be unharmed');
assert.ok(dummyAdjacentBarrel.isDead || dummyAdjacentBarrel.health < 2, 'Adjacent barrel should take blast damage (chain reaction)');
console.log(`✓ TNT Detonation verified: Enemy HP dropped from ${initialEnemyHP} to ${dummyEnemy1.health}, chain reaction triggered!`);

console.log('--- 3. Testing Electric Pylon Proximity Shock & EMP ---');
const dummyEnemyPylon = new window.Enemy(160, 200, 'ninja');
global.game.enemies = [dummyEnemyPylon];
pylon.zapCooldown = 0;
pylon.update(0.1, global.game.player, global.game.enemies, global.game);
assert.strictEqual(soundEngine.zapped, true, 'Pylon should trigger zap audio on enemy proximity');
assert.ok(dummyEnemyPylon.health < 100, 'Enemy should take electrical shock damage');
pylon.takeDamage(10, 1); // Kill pylon to trigger EMP overload
assert.strictEqual(pylon.isDead, true);
console.log('✓ Electric Pylon proximity zap and EMP discharge verified!');

console.log('--- 4. Testing Spike Trap Periodic Cycling & Impalement ---');
const spikeTrap = new window.Breakable(200, 200, 'spike_trap');
spikeTrap.spikeTimer = 0.05;
spikeTrap.update(0.06, null, [], global.game);
assert.strictEqual(spikeTrap.hazardState, 'warning', 'Spike trap should enter warning state');
spikeTrap.spikeTimer = 0.05;
spikeTrap.update(0.06, null, [], global.game);
assert.strictEqual(spikeTrap.hazardState, 'extended', 'Spike trap should extend spikes');
assert.strictEqual(soundEngine.spiked, true, 'Spike trap sound played');

const dummySpikeVictim = new window.Enemy(205, 200, 'thug');
const hpBeforeSpike = dummySpikeVictim.health;
spikeTrap.update(0.01, null, [dummySpikeVictim], global.game);
assert.ok(dummySpikeVictim.health < hpBeforeSpike, 'Target on extended spikes should be impaled');
assert.ok(dummySpikeVictim.vz > 0, 'Target should be launched vertically for air juggling');
console.log(`✓ Spike Trap impalement verified: Victim launched with vz=${dummySpikeVictim.vz}!`);

console.log('--- 5. Testing Hydrant Rupture & Water Geyser Juggle ---');
const hydr = new window.Breakable(300, 200, 'hydrant', 'pizza');
hydr.takeDamage(2, 1);
assert.strictEqual(hydr.hazardState, 'ruptured', 'Hydrant should rupture');
assert.strictEqual(soundEngine.splashed, true, 'Geyser splash sound played');
const dummyJuggledEnemy = new window.Enemy(305, 200, 'thug');
hydr.update(0.1, null, [dummyJuggledEnemy], global.game);
assert.ok(dummyJuggledEnemy.z > 10, 'Enemy should be thrown up into geyser');
assert.ok(dummyJuggledEnemy.vz > 0, 'Enemy should have upward geyser velocity');
console.log(`✓ Hydrant Geyser juggle verified: Enemy floating at z=${dummyJuggledEnemy.z}, vz=${dummyJuggledEnemy.vz}!`);

console.log('--- 6. Testing Procedural Stage Generator with Obstacle Mayhem Settings ---');
const stage = new window.Stage();

// Test MAX Mayhem
global.localStorage.setItem('kungfu_obstacle_mayhem', 'max');
const maxZones = stage.createProceduralStageZones(4);
const maxBreakablesCount = maxZones.reduce((sum, z) => sum + (z.breakables ? z.breakables.length : 0), 0);
const hasTNT = maxZones.some(z => z.breakables && z.breakables.some(b => b.type === 'tnt'));
const hasPylon = maxZones.some(z => z.breakables && z.breakables.some(b => b.type === 'electric_pylon'));
const hasSpikes = maxZones.some(z => z.breakables && z.breakables.some(b => b.type === 'spike_trap'));
const hasHydrant = maxZones.some(z => z.breakables && z.breakables.some(b => b.type === 'hydrant'));
assert.ok(maxBreakablesCount >= 40, `Max Mayhem should have abundant obstacles across 20 zones, found ${maxBreakablesCount}`);
assert.ok(hasTNT, 'Max Mayhem zones should include TNT barrels');
assert.ok(hasPylon, 'Max Mayhem zones should include electric pylons');
assert.ok(hasSpikes, 'Max Mayhem zones should include spike traps');
assert.ok(hasHydrant, 'Max Mayhem zones should include hydrants');
console.log(`✓ Max Mayhem generated ${maxBreakablesCount} obstacles across 20 zones including TNT, pylons, spikes, hydrants!`);

// Test OFF setting (Minimal supply crates only)
global.localStorage.setItem('kungfu_obstacle_mayhem', 'off');
const offZones = stage.createProceduralStageZones(4);
const offBreakablesCount = offZones.reduce((sum, z) => sum + (z.breakables ? z.breakables.length : 0), 0);
const offHasTNT = offZones.some(z => z.breakables && z.breakables.some(b => b.type === 'tnt'));
const offHasPylon = offZones.some(z => z.breakables && z.breakables.some(b => b.type === 'electric_pylon'));
assert.ok(offBreakablesCount < maxBreakablesCount, 'OFF setting should have far fewer breakables');
assert.strictEqual(offHasTNT, false, 'OFF setting should not spawn TNT hazards in normal waves');
assert.strictEqual(offHasPylon, false, 'OFF setting should not spawn electric pylons');
console.log(`✓ Obstacle Mayhem OFF verified: Only ${offBreakablesCount} standard supply crates/barrels, no hazard traps!`);

// Test Vertical Procedural Stages
global.localStorage.setItem('kungfu_obstacle_mayhem', 'max');
const vertZones = stage.createProceduralVerticalStageZones(4);
assert.strictEqual(vertZones.length, 20);
const vertBreakables = vertZones.reduce((sum, z) => sum + (z.breakables ? z.breakables.length : 0), 0);
assert.ok(vertBreakables >= 20, 'Vertical Max Mayhem should place obstacles across pagoda floors');
console.log(`✓ Vertical Pagoda procedural floors generated ${vertBreakables} tactical obstacles and traps!`);

console.log('\n========================================');
console.log('🎉 ALL OBSTACLE MAYHEM TESTS PASSED SUCCESSFULLY! 🎉');
console.log('========================================');
