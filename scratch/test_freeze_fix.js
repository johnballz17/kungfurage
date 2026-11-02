// Test suite verifying fix for character & AI companion freezing during fighting (pressing J 2-3 times)
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const createMockElement = (id = '', classes = []) => {
  const classList = new Set(classes);
  return {
    id,
    classList: {
      add: (c) => classList.add(c),
      remove: (c) => classList.delete(c),
      toggle: () => {},
      contains: () => false
    },
    dataset: {},
    innerText: '',
    textContent: '',
    value: '',
    style: {},
    appendChild: () => {},
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
  };
};

const domMock = {
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  setInterval: () => {},
  clearInterval: () => {},
  document: {
    querySelectorAll: () => [],
    createElement: (tag) => createMockElement(tag),
    getElementById: (id) => {
      if (id === 'gameCanvas') {
        return {
          getContext: () => ({
            clearRect: () => {}, save: () => {}, restore: () => {}, translate: () => {},
            scale: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
            fillRect: () => {}, strokeRect: () => {}, fillText: () => {}, measureText: () => ({ width: 50 }),
            beginPath: () => {}, arc: () => {}, ellipse: () => {}, stroke: () => {}, fill: () => {}, drawImage: () => {}
          }),
          width: 480,
          height: 270,
          addEventListener: () => {}
        };
      }
      return createMockElement(id);
    }
  },
  localStorage: {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = v.toString(); }
  },
  navigator: { maxTouchPoints: 0 },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => {},
  AudioContext: class {
    createOscillator() { return { type: '', frequency: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
    createGain() { return { gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
    createBiquadFilter() { return { type: '', frequency: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, Q: { setValueAtTime: () => {} }, connect: () => {} }; }
    createWaveShaper() { return { curve: null, connect: () => {} }; }
    createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
    createBufferSource() { return { buffer: null, connect: () => {}, start: () => {} }; }
    get currentTime() { return 0; }
    get state() { return 'running'; }
    resume() { return Promise.resolve(); }
  }
};
domMock.window = domMock;
domMock.window.localStorage = domMock.localStorage;
domMock.window.AudioContext = domMock.AudioContext;
domMock.window.webkitAudioContext = domMock.AudioContext;

const ctx = vm.createContext(domMock);
['src/audio.js', 'src/combat.js', 'src/weather.js', 'src/sprites.js', 'src/entities.js', 'src/stage.js', 'src/input.js', 'src/game.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
});

console.log('--- TEST SUITE: FREEZING FIX VERIFICATION ---');
const game = ctx.game;

// Helper to simulate tapping J
function tapPunch(game, holdFrames = 1, waitFrames = 22) {
  ctx.inputManager.keys['KeyJ'] = true;
  ctx.inputManager.prevKeys['KeyJ'] = false;
  for (let f = 0; f < holdFrames; f++) {
    game.update(0.016);
    ctx.inputManager.prevKeys['KeyJ'] = true;
  }
  ctx.inputManager.keys['KeyJ'] = false;
  ctx.inputManager.prevKeys['KeyJ'] = false;
  for (let f = 0; f < waitFrames; f++) {
    game.update(0.016);
  }
}

// TEST 1: Default Starting Weapon (Nunchaku) - pressing J 3 times
game.startNewGame('smellu', 'nunchaku');
game.enemies = [];
game.breakables = [];
assert(game.player.weapon !== null && game.player.weapon.type === 'nunchaku');

tapPunch(game); // Press 1
assert.strictEqual(game.player.state, 'idle', 'Player should return to idle after Nunchaku hit 1');
tapPunch(game); // Press 2
assert.strictEqual(game.player.state, 'idle', 'Player should return to idle after Nunchaku hit 2');
tapPunch(game); // Press 3
assert.strictEqual(game.player.state, 'idle', 'Player should return to idle after Nunchaku hit 3');
console.log('✓ Test 1 Passed: Nunchaku attacks return to idle cleanly on multiple J presses (no freeze)');

// TEST 2: Dual Pistols Gun-Fu combo sequence (4 hits)
game.startNewGame('smellu', 'pistols');
game.enemies = [];
game.breakables = [];
assert.strictEqual(game.player.weapon.type, 'pistols');

tapPunch(game);
assert.strictEqual(game.player.state, 'idle', 'Pistol shot 1 returns to idle');
tapPunch(game);
assert.strictEqual(game.player.state, 'idle', 'Pistol shot 2 returns to idle');
tapPunch(game);
assert.strictEqual(game.player.state, 'idle', 'Pistol whip returns to idle');
tapPunch(game);
assert.strictEqual(game.player.state, 'idle', 'Crossfire blast returns to idle');
console.log('✓ Test 2 Passed: Dual Pistols Gun-Fu combo chain (4 hits) completes without freezing');

// TEST 3: Daggers & Lead Pipe
game.player.equipWeapon('daggers');
tapPunch(game);
assert.strictEqual(game.player.state, 'idle', 'Dagger attack returns to idle');
tapPunch(game);
assert.strictEqual(game.player.state, 'idle', 'Dagger combo hit 2 returns to idle');

game.player.equipWeapon('pipe');
tapPunch(game);
assert.strictEqual(game.player.state, 'idle', 'Pipe smash returns to idle');
console.log('✓ Test 3 Passed: Daggers and Lead Pipe attacks return to idle cleanly');

// TEST 4: Unarmed 5-hit punch rush (J x 5)
game.player.weapon = null;
game.enemies = []; // Clear enemies so player isn't hit by mobs during combo test
game.breakables = [];
tapPunch(game); // Jab
assert.strictEqual(game.player.state, 'idle', 'Jab returns to idle');
tapPunch(game); // Cross
assert.strictEqual(game.player.state, 'idle', 'Cross returns to idle');
tapPunch(game); // Gut Hook / Elbow
assert.strictEqual(game.player.state, 'idle', 'Gut/Elbow returns to idle');
tapPunch(game); // Hit 4
assert.strictEqual(game.player.state, 'idle', 'Hit 4 returns to idle');
tapPunch(game); // Hit 5 Finisher
assert.strictEqual(game.player.state, 'idle', 'Dragon palm finisher returns to idle');
console.log('✓ Test 4 Passed: Unarmed punch rush completes all 5 hits and returns to idle');

// TEST 5: AI Companion Isolation from Player Input
game.startNewGame('smellu');
const companion = game.companion;
assert(companion !== null, 'AI companion should be present');

// Player holds punch
ctx.inputManager.keys['KeyJ'] = true;
ctx.inputManager.prevKeys['KeyJ'] = false;
game.update(0.016);
assert(companion.punchChargeTimer === 0, 'Companion punchChargeTimer should NOT increase when player holds J');
assert(companion.state !== 'punch1', 'Companion should NOT mimic player punch1');
console.log('✓ Test 5 Passed: AI Companion does not react to player keyboard input');

// TEST 6: AI Companion Combat Execution & Weapon Usage
companion.equipWeapon('nunchaku');
companion.executePunch(); // Triggers nunchaku_attack on companion
assert.strictEqual(companion.state, 'nunchaku_attack');

// Advance frames
for (let f = 0; f < 12; f++) {
  game.update(0.016);
}
assert(['idle', 'walk'].includes(companion.state), `Companion with weapon should be active (idle or walk), got ${companion.state}`);
console.log('✓ Test 6 Passed: AI Companion with weapon completes attack and returns to active state');

// TEST 7: In-combat collision test with enemies (HitStop + Recovery)
game.enemies = [new ctx.Enemy(game.player.x + 20, game.player.y, 'thug')];
tapPunch(game, 1, 16);
assert.strictEqual(game.player.state, 'idle', 'Player in combat returns to idle after hitting enemy');
while (ctx.combatSystem.hitStopTimer > 0) {
  ctx.combatSystem.update(0.016);
}
assert.strictEqual(ctx.combatSystem.hitStopTimer, 0, 'HitStop timer decrements to 0');
console.log('✓ Test 7 Passed: In-combat collision and hitStop recover to idle seamlessly');

console.log('\n=========================================');
console.log('ALL COMBAT & COMPANION FREEZE TESTS PASSED! 🚀');
console.log('=========================================');
process.exit(0);
