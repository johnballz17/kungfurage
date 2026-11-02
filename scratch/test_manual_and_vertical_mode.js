// Test suite for In-Game Manual Booklet and Vertical Scrolling Mode (Pagoda Ascent)
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Setup mock DOM environment
const createMockElement = (id = '', classes = []) => {
  const classList = new Set(classes);
  const listeners = {};
  const children = [];
  return {
    id,
    classList: {
      add: (c) => classList.add(c),
      remove: (c) => classList.delete(c),
      toggle: (c, val) => {
        if (val !== undefined) {
          if (val) classList.add(c); else classList.delete(c);
        } else {
          if (classList.has(c)) classList.delete(c); else classList.add(c);
        }
      },
      contains: (c) => classList.has(c)
    },
    dataset: {},
    innerText: '',
    textContent: '',
    value: '',
    disabled: false,
    addEventListener: (type, fn) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    removeEventListener: () => {},
    appendChild: (child) => children.push(child),
    querySelectorAll: (sel) => [],
    querySelector: (sel) => null,
    trigger: (type, ev = {}) => {
      if (listeners[type]) listeners[type].forEach(fn => fn(ev));
    }
  };
};

const domMock = {
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  document: {
    querySelectorAll: () => [],
    createElement: (tag) => createMockElement(tag),
    getElementById: (id) => createMockElement(id)
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
    createBiquadFilter() { return { type: '', frequency: { setValueAtTime: () => {} }, connect: () => {} }; }
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

const context = vm.createContext(domMock);

function loadScript(path) {
  const code = fs.readFileSync(path, 'utf8');
  vm.runInContext(code, context);
}

// Load scripts
loadScript('src/audio.js');
loadScript('src/combat.js');
loadScript('src/weather.js');
loadScript('src/sprites.js');
loadScript('src/entities.js');
loadScript('src/stage.js');
loadScript('src/input.js');

console.log('--- TEST SUITE: VERTICAL MODE (PAGODA ASCENT) ---');

// Test 1: Stage Horizontal vs Vertical initialization
const stage = new context.Stage();
assert.strictEqual(stage.gameMode, 'HORIZONTAL', 'Default mode should be HORIZONTAL');
assert.strictEqual(stage.width, 16000, 'Horizontal mode width should be 16,000px');
assert.strictEqual(stage.stageNames[1], 'CHINATOWN NEON ALLEYWAY');

console.log('✓ Test 1 Passed: Default Horizontal Mode initialized with 16,000px marathon width');

// Test 2: Switch to Vertical Mode (Pagoda Ascent)
stage.setGameMode('VERTICAL');
assert.strictEqual(stage.gameMode, 'VERTICAL');
assert.strictEqual(stage.width, 480, 'Vertical mode width should be screen-centered 480px');
assert.strictEqual(stage.stageNames[1], 'DRAGON PAGODA - 100 FLOORS');
assert.strictEqual(stage.stageNames[2], 'CYBER SKY ELEVATOR');
assert.strictEqual(stage.stageNames[3], "HEAVEN'S PEAK CRANE SUMMIT");

console.log('✓ Test 2 Passed: Successfully switched to Vertical Mode with 3 new climbing stages');

// Test 3: 20-floor zone generation for Vertical Stages 1, 2, 3
for (let s = 1; s <= 3; s++) {
  stage.loadStage(s);
  assert.strictEqual(stage.zones.length, 20, `Vertical Stage ${s} should have 20 ascending floors`);
  
  // Floor 5, 10, 20 should be Boss/Mid-Boss floors
  const floor5 = stage.zones[4];
  const floor10 = stage.zones[9];
  const floor20 = stage.zones[19];
  assert(floor5.isBossZone, `Floor 5 in Stage ${s} should be a Boss Zone`);
  assert(floor10.isBossZone, `Floor 10 in Stage ${s} should be a Boss Zone`);
  assert(floor20.isBossZone, `Floor 20 in Stage ${s} should be a Boss Zone`);
  console.log(`✓ Test 3.${s} Passed: Vertical Stage ${s} (${stage.stageNames[s]}) contains 20 distinct ascending floors with mid-bosses and pinnacle boss`);
}

// Test 4: Floor Combat & Elevator Ascent Mechanics
stage.loadStage(1);
const mockPlayer = new context.Player(240, 210, 'smellu');
const activeEnemies = [];

// Step 1: Initial Floor 1 update spawns enemies
stage.update(0.016, mockPlayer, activeEnemies);
assert(stage.locked, 'Stage should lock arena when floor encounter begins');
assert(stage.spawnQueue.length > 0, 'Spawn queue should contain floor 1 enemies');

while (stage.spawnQueue.length > 0) {
  const item = stage.spawnQueue.shift();
  if (!item.isBreakable) {
    activeEnemies.push(new context.Enemy(item.x, item.y, item.type, item.bossType));
  }
}
assert(activeEnemies.length >= 2, 'Floor 1 should spawn at least 2 guardians');
console.log(`✓ Test 4.1 Passed: Floor 1 locked arena and spawned ${activeEnemies.length} floor guardians`);

// Step 2: Defeat all Floor 1 enemies
activeEnemies.forEach(e => { e.isDead = true; });
stage.update(0.016, mockPlayer, activeEnemies);

assert(stage.isAscending, 'Defeating floor enemies should trigger elevator/lift ascent');
assert(stage.ascentTimer > 0, 'Ascent timer should be active');
const initAltitude = stage.altitude;

// Step 3: Simulate ascent duration (1.8 seconds)
for (let t = 0; t < 120; t++) {
  stage.update(0.016, mockPlayer, []);
}

assert.strictEqual(stage.isAscending, false, 'Ascent should complete after timer expires');
assert.strictEqual(stage.currentZoneIndex, 1, 'Current floor should advance to Floor 2 (index 1)');
assert(stage.altitude > initAltitude, `Altitude should increase during ascent (got ${stage.altitude}m vs init ${initAltitude}m)`);
console.log(`✓ Test 4.2 Passed: Elevator ascent completed smoothly, gained altitude (+${Math.round(stage.altitude - initAltitude)}m), advanced to Floor 2`);

console.log('\n--- TEST SUITE: INSTRUCTION MANUAL BOOKLET ---');

// Mock manual modal in DOM
const mockPages = [];
for (let i = 1; i <= 11; i++) {
  mockPages.push(createMockElement(`manual-page-${i}`, i === 1 ? ['manual-page'] : ['manual-page', 'hidden']));
}

const mockManualModal = createMockElement('manual-modal', ['modal-overlay', 'hidden']);
mockManualModal.querySelectorAll = (sel) => {
  if (sel === '.manual-page') return mockPages;
  return [];
};

const mockElements = {
  'manual-modal': mockManualModal,
  'manual-page-select': createMockElement('manual-page-select'),
  'manual-page-number': createMockElement('manual-page-number'),
  'close-manual-btn': createMockElement('close-manual-btn'),
  'manual-close-bottom': createMockElement('manual-close-bottom'),
  'manual-prev-btn': createMockElement('manual-prev-btn'),
  'manual-next-btn': createMockElement('manual-next-btn'),
  'open-manual-btn': createMockElement('open-manual-btn'),
  'open-manual-tab-btn': createMockElement('open-manual-tab-btn'),
  'settings-modal': createMockElement('settings-modal', ['hidden']),
  'gameCanvas': {
    getContext: () => ({
      clearRect: () => {}, save: () => {}, restore: () => {}, translate: () => {},
      fillRect: () => {}, strokeRect: () => {}, fillText: () => {}, measureText: () => ({ width: 50 }),
      beginPath: () => {}, arc: () => {}, stroke: () => {}, fill: () => {}, drawImage: () => {}
    }),
    width: 480,
    height: 270,
    addEventListener: () => {}
  }
};

context.document.getElementById = (id) => mockElements[id] || createMockElement(id);

loadScript('src/game.js');
const game = context.game || new context.Game();

// Test 5: Open and Close Manual Modal
assert(mockManualModal.classList.contains('hidden'), 'Manual should start hidden');
game.openManualModal();
assert(!mockManualModal.classList.contains('hidden'), 'openManualModal should show modal');
assert.strictEqual(game.manualOpen, true);

game.closeManualModal();
assert(mockManualModal.classList.contains('hidden'), 'closeManualModal should hide modal');
assert.strictEqual(game.manualOpen, false);
console.log('✓ Test 5 Passed: Game.openManualModal() and Game.closeManualModal() functional');

// Test 6: Manual Page Flipping across all 11 chapters
game.openManualModal();
const nextBtn = mockElements['manual-next-btn'];
const prevBtn = mockElements['manual-prev-btn'];

for (let p = 2; p <= 11; p++) {
  nextBtn.trigger('click');
  assert.strictEqual(game.currentManualPage, p, `Manual should advance to page ${p}`);
}
console.log('✓ Test 6.1 Passed: Successfully flipped forward through all 11 manual pages');

for (let p = 10; p >= 1; p--) {
  prevBtn.trigger('click');
  assert.strictEqual(game.currentManualPage, p, `Manual should flip backward to page ${p}`);
}
console.log('✓ Test 6.2 Passed: Successfully flipped backward through manual pages');

// Test 7: Game Mode Toggle in Game
game.gameMode = 'HORIZONTAL';
game.stage.setGameMode('HORIZONTAL');
assert.strictEqual(game.gameMode, 'HORIZONTAL');
game.toggleGameMode();
assert.strictEqual(game.gameMode, 'VERTICAL');
assert.strictEqual(game.stage.gameMode, 'VERTICAL');
game.toggleGameMode();
assert.strictEqual(game.gameMode, 'HORIZONTAL');
assert.strictEqual(game.stage.gameMode, 'HORIZONTAL');
console.log('✓ Test 7 Passed: Game.toggleGameMode() switches seamlessly between HORIZONTAL and VERTICAL');

// Test 8: Keybindings verification for M (mode) and N (manual)
const inputManager = context.inputManager;
assert(inputManager.bindings.mode.includes('KeyM'), 'Mode action should be bound to KeyM');
assert(inputManager.bindings.manual.includes('KeyN'), 'Manual action should be bound to KeyN');
console.log('✓ Test 8 Passed: Keybindings configured (KeyM: Mode Toggle, KeyN: Manual Booklet)');

console.log('\n=========================================');
console.log('ALL MANUAL & VERTICAL MODE TESTS PASSED! 🚀');
console.log('=========================================');
process.exit(0);
