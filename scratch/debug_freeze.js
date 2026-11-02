const fs = require('fs');
const vm = require('vm');

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
            scale: () => {},
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

console.log('--- Debugging Freeze Issue With Combat Collisions ---');
const game = ctx.game;
game.startNewGame('smellu');
game.player.weapon = null; // Unarmed punch test
// Put an enemy right in front of player
game.enemies = [new ctx.Enemy(game.player.x + 20, game.player.y, 'thug')];
console.log('Enemy spawned at x:', game.enemies[0].x, 'y:', game.enemies[0].y);

// Press J 1st time
console.log('\n--- J1 Attack & Hit ---');
ctx.inputManager.keys['KeyJ'] = true;
ctx.inputManager.prevKeys['KeyJ'] = false;
game.update(0.016);
console.log('HitStop timer:', ctx.combatSystem.hitStopTimer);
console.log('Player state:', game.player.state, 'timer:', game.player.stateTimer);
console.log('Enemy health:', game.enemies[0].health);

for (let f = 0; f < 15; f++) {
  game.update(0.016);
}
console.log('After attack 1: Player state:', game.player.state, 'HitStop timer:', ctx.combatSystem.hitStopTimer);
console.log('Can player act?', game.player.state === 'idle' || game.player.state === 'walk');

// Press J 2nd time
console.log('\n--- J2 Attack & Hit ---');
ctx.inputManager.keys['KeyJ'] = true;
ctx.inputManager.prevKeys['KeyJ'] = false;
game.update(0.016);
console.log('HitStop timer:', ctx.combatSystem.hitStopTimer);
console.log('Player state:', game.player.state, 'timer:', game.player.stateTimer);

for (let f = 0; f < 15; f++) {
  game.update(0.016);
}
console.log('After attack 2: Player state:', game.player.state, 'HitStop timer:', ctx.combatSystem.hitStopTimer);
console.log('Can player act?', game.player.state === 'idle' || game.player.state === 'walk');

// Press J 3rd time
console.log('\n--- J3 Attack & Hit ---');
ctx.inputManager.keys['KeyJ'] = true;
ctx.inputManager.prevKeys['KeyJ'] = false;
game.update(0.016);
console.log('HitStop timer:', ctx.combatSystem.hitStopTimer);
console.log('Player state:', game.player.state, 'timer:', game.player.stateTimer);

for (let f = 0; f < 20; f++) {
  game.update(0.016);
}
console.log('After attack 3: Player state:', game.player.state, 'timer:', game.player.stateTimer, 'HitStop timer:', ctx.combatSystem.hitStopTimer);
console.log('Can player act?', game.player.state === 'idle' || game.player.state === 'walk');
console.log('Enemy state:', game.enemies[0].state, 'health:', game.enemies[0].health);

for (let f = 0; f < 30; f++) {
  game.update(0.016);
}
console.log('After 30 more frames: Player state:', game.player.state, 'timer:', game.player.stateTimer);
console.log('Can player act now?', game.player.state === 'idle' || game.player.state === 'walk');

// Check rendering
try {
  game.render();
  console.log('Render passed without error');
} catch (e) {
  console.error('RENDER ERROR:', e);
}
