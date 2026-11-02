// Automated verification of AI state locks, Auto-Play progression, and level completion
const fs = require('fs');
const assert = require('assert');

// Mock browser environment
global.requestAnimationFrame = () => {};
global.window = {
  addEventListener: () => {}
};
const dummyEl = {
  getContext: () => ({}),
  addEventListener: () => {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  querySelectorAll: () => [],
  querySelector: () => null,
  appendChild: () => {},
  style: {}
};
global.document = {
  readyState: 'complete',
  getElementById: () => dummyEl,
  querySelector: () => dummyEl,
  querySelectorAll: () => [],
  createElement: () => dummyEl,
  body: dummyEl,
  addEventListener: () => {}
};
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = v; }
};

// Mock audio and combat
window.soundEngine = new Proxy({
  getBGMVolume: () => 1,
  getSFXVolume: () => 1
}, {
  get: (target, prop) => target[prop] || (() => {})
});

window.weatherSystem = {
  update: () => {},
  draw: () => {},
  setStage: () => {}
};

window.spriteRenderer = {
  drawShadow: () => {},
  drawBreakable: () => {}
};

window.gameLogger = {
  log: () => {},
  startSession: () => {},
  saveSession: () => {}
};

// Load code files
eval(fs.readFileSync('src/combat.js', 'utf8'));
eval(fs.readFileSync('src/input.js', 'utf8'));
eval(fs.readFileSync('src/entities.js', 'utf8'));
global.Player = window.Player;
global.AICompanion = window.AICompanion;
global.Enemy = window.Enemy;
global.Breakable = window.Breakable;
global.ItemPickup = window.ItemPickup;
eval(fs.readFileSync('src/stage.js', 'utf8'));
global.Stage = window.Stage;
eval(fs.readFileSync('src/learning.js', 'utf8'));
global.AILearningEngine = window.AILearningEngine;
global.aiLearningEngine = window.aiLearningEngine;
eval(fs.readFileSync('src/game.js', 'utf8'));
global.Game = window.Game;

console.log('--- TEST 1: AIRBORNE STATE RESET ON LANDING ---');
const player = new window.Player(200, 200, 'smellu');
const companion = new window.AICompanion(180, 200, 'lindin');

const aerialStates = ['air_hammer', 'air_split', 'air_pistol', 'flying_kick', 'jump_kick', 'air_spin', 'front_flip', 'backflip'];

aerialStates.forEach(state => {
  player.state = state;
  player.z = 15;
  player.vz = -2;
  // Step physics to ground
  for (let i = 0; i < 20; i++) {
    player.updatePhysics(0.016);
  }
  assert.strictEqual(player.z, 0, `Player z should be 0 for ${state}`);
  assert.strictEqual(player.state, 'idle', `Player state should reset to idle from ${state}, got: ${player.state}`);

  companion.state = state;
  companion.z = 15;
  companion.vz = -2;
  for (let i = 0; i < 20; i++) {
    companion.updatePhysics(0.016);
  }
  assert.strictEqual(companion.z, 0, `Companion z should be 0 for ${state}`);
  assert.strictEqual(companion.state, 'idle', `Companion state should reset to idle from ${state}, got: ${companion.state}`);
});
console.log('✓ PASS: All aerial states reset to idle on landing for both Player and AI Companion!');

console.log('\n--- TEST 2: AUTO-PLAY ZONE NAVIGATION (HORIZONTAL) ---');
const game = new window.Game();
game.startNewGame('smellu');
game.autoPlay = true;
game.stage.loadStage(1);

// Verify that when no enemies exist, player advances towards next zone trigger
// Clear initial enemies to test pure zone advancement
game.enemies = [];
game.breakables = [];
assert.strictEqual(game.stage.currentZoneIndex, 0);
const initialZoneX = game.stage.zones[0].triggerX; // 450
console.log(`Zone 0 TriggerX: ${initialZoneX}`);

// Run Auto-Play update frames until zone 0 is triggered
let frames = 0;
while (game.player.x < initialZoneX && frames < 500) {
  game.update(0.016);
  frames++;
}
assert(game.player.x >= initialZoneX, `Player should advance past triggerX: player.x=${game.player.x}, triggerX=${initialZoneX}`);
// Step one more frame so stage.update processes player.x >= triggerX
game.update(0.016);
console.log(`Player.x after loop: ${game.player.x.toFixed(1)}, currentZoneIndex: ${game.stage.currentZoneIndex}, zone 0 cleared: ${game.stage.zones[0].cleared}, stage.locked: ${game.stage.locked}`);
assert(game.stage.zones[0].cleared || game.stage.locked, 'Stage zone 0 should be either locked in combat or already cleared');
assert(game.enemies.length > 0, 'Enemies should spawn in encounter zone');
console.log(`✓ PASS: Auto-Play smoothly advanced to Zone 1 and engaged encounter in ${frames} frames!`);

console.log('\n--- TEST 3: VERTICAL MODE MID-BOSS DOES NOT PREMATURELY ADVANCE STAGE ---');
const vertGame = new window.Game();
vertGame.stage.gameMode = 'VERTICAL';
vertGame.startNewGame('smellu');
vertGame.stage.loadStage(1);
vertGame.stage.currentZoneIndex = 4; // Floor 5 (Mid-boss Master Shen)
vertGame.stage.locked = true;
vertGame.enemies = [new window.Enemy(240, 195, 'boss', 'master_shen')];
assert(vertGame.enemies[0].isBoss, 'Master Shen is boss');

// Kill Master Shen on Floor 5
vertGame.enemies[0].isDead = true;
vertGame.update(0.016);

// Verify stage transition was NOT triggered
assert.strictEqual(vertGame.stageTransition, null, 'Stage transition should NOT trigger on mid-boss Floor 5');
assert.strictEqual(vertGame.gameState, 'PLAYING', 'Game state should remain PLAYING on Floor 5 mid-boss defeat');
console.log('✓ PASS: Floor 5 Mid-boss defeat keeps game on Stage 1 and allows elevator to ascend!');

console.log('\n--- TEST 4: FINAL FLOOR 20 DEFEAT TRIGGERS STAGE TRANSITION ---');
vertGame.stage.currentZoneIndex = 19; // Floor 20 (Final Floor)
vertGame.stage.locked = true;
const kurodaBoss = new window.Enemy(240, 195, 'boss', 'kuroda');
kurodaBoss.isDead = true;
kurodaBoss.z = 0;
kurodaBoss.stateTimer = -0.7;
vertGame.enemies = [kurodaBoss];
vertGame.stage.spawnQueue = [];
console.log('Test 4 before update - currentZoneIndex:', vertGame.stage.currentZoneIndex, 'zones.length:', vertGame.stage.zones.length, 'enemies:', vertGame.enemies.length, 'isBoss:', kurodaBoss.isBoss);
vertGame.update(0.016);
console.log('Test 4 after update - stageTransition:', vertGame.stageTransition, 'enemies:', vertGame.enemies.length);

assert(vertGame.stageTransition !== null, 'Stage transition MUST trigger when Floor 20 boss is defeated');
assert.strictEqual(vertGame.stageTransition.toStage, 2, 'Should transition from Stage 1 to Stage 2');
console.log('✓ PASS: Floor 20 Final Boss cleanly triggers stage transition to Stage 2!');

console.log('\n--- TEST 5: STAGE 3 VICTORY PROGRESSION ---');
vertGame.stage.currentStageNum = 3;
vertGame.stageTransition = null;
vertGame.stage.currentZoneIndex = 19;
vertGame.stage.locked = true;
const finalBoss = new window.Enemy(240, 195, 'boss', 'kuroda');
finalBoss.isDead = true;
finalBoss.z = 0;
finalBoss.stateTimer = -0.7;
vertGame.enemies = [finalBoss];
vertGame.stage.spawnQueue = [];
vertGame.update(0.016);

assert.strictEqual(vertGame.gameState, 'VICTORY', 'Defeating Grandmaster Kuroda on Stage 3 should achieve VICTORY');
console.log('✓ PASS: Stage 3 Final Boss victory completes the game with VICTORY state!');

console.log('\n=======================================');
console.log('ALL AI PROGRESSION & STAGE TESTS PASSED!');
console.log('=======================================');
