// Test suite verifying AI Companion autonomy and anti-mirroring system
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const createMockElement = (id = '') => ({
  id,
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  dataset: {},
  innerText: '',
  textContent: '',
  value: '',
  style: {},
  appendChild: () => {},
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {}
});

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

console.log('--- TEST SUITE: AI COMPANION AUTONOMY & ANTI-MIRRORING ---');
const game = ctx.game;
game.startNewGame('smellu'); // Companion is Lindin
const companion = game.companion;
assert(companion !== null);

// TEST 1: Rear Perimeter Lookout (Independent Facing when idle)
game.enemies = [];
game.player.facing = 1;
// Position companion near formation
companion.x = game.player.x - 44;
companion.y = game.player.y + 8;
companion.updateAI(0.016, [], game.player, game.stage);
assert.strictEqual(companion.facing, -1, 'Companion should face rearward (-1) to watch the perimeter, not mirror player facing (1)');
console.log('✓ Test 1 Passed: AI Companion watches rear perimeter instead of mirroring player facing');

// TEST 2: True Co-Op Pincer Attack Positioning (Opposite Flanks)
// Place enemy at x: 200
const enemy = new ctx.Enemy(200, 210, 'thug');
game.player.x = 170; // Player is to the left of enemy (x: 170 <= 200)
companion.x = 100; // Companion is at distance (x: 100), approaching enemy
companion.y = 210;
companion.state = 'idle';
companion.updateAI(0.016, [enemy], game.player, game.stage);
console.log('Test 2: companion.vx =', companion.vx, 'companion.state =', companion.state, 'targetEnemy =', companion.targetEnemy?.type);
assert(companion.vx > 0, 'Companion should move right towards the opposite flank of the enemy');
console.log('✓ Test 2 Passed: AI Companion flanks from the opposite side of the enemy (Pincer Formation)');

// TEST 3: Anti-Mirror Attack Cadence & Decision (When player is punching, Lindin prioritizes kicks)
// Position companion directly on right flank in strike range
companion.z = 0;
companion.vz = 0;
companion.state = 'idle';
companion.x = 228;
companion.y = 210;
companion.attackCooldown = 0;
game.player.state = 'punch1'; // Player is punching!

// Run companion AI update
companion.updateAI(0.016, [enemy], game.player, game.stage);
assert(companion.state !== 'idle' && companion.state !== 'walk', 'Companion should initiate an attack');
assert(!companion.state.startsWith('punch'), `Companion (Lindin) should NOT mirror punch, chose ${companion.state}`);
assert(companion.attackCooldown > 0, 'Companion should establish attackCooldown to prevent synchronized spamming');
console.log(`✓ Test 3 Passed: AI Companion avoided mirroring punch, executed distinct move (${companion.state}) with attackCooldown`);

// TEST 4: Mega Punch Anti-Mirroring
companion.attackCooldown = 0;
companion.state = 'idle';
game.player.state = 'mega_punch_windup'; // Player is charging Mega Punch!
companion.updateAI(0.016, [enemy], game.player, game.stage);
assert(companion.state !== 'mega_punch_windup', 'Companion should NEVER charge Mega Punch simultaneously with player');
console.log('✓ Test 4 Passed: AI Companion never double-casts Mega Punch at the same time as player');

// TEST 5: Input Isolation
companion.z = 0;
companion.vz = 0;
companion.state = 'idle';
ctx.inputManager.keys['Space'] = true; // Player jumps
game.player.update(0.016, ctx.inputManager, game.stage);
companion.update(0.016, game.stage);
assert.strictEqual(companion.z, 0, 'Companion should not jump when player presses jump key');
console.log('✓ Test 5 Passed: AI Companion has 0 coupling with player keyboard/gamepad inputs');

console.log('\n=========================================');
console.log('ALL AI COMPANION AUTONOMY TESTS PASSED! 🚀');
console.log('=========================================');
process.exit(0);
