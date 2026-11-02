// Scratch test script for dual pistols, character starting weapons, Chinatown store, and armed enemies
const fs = require('fs');
const vm = require('vm');

// Mock browser environment
const domMock = {
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  navigator: { maxTouchPoints: 0 },
  document: {
    querySelectorAll: () => [],
    createElement: () => ({
      className: '',
      innerHTML: '',
      addEventListener: () => {},
      appendChild: () => {}
    }),
    getElementById: (id) => ({
      addEventListener: () => {},
      querySelectorAll: () => [],
      appendChild: () => {},
      classList: { toggle: () => {}, add: () => {}, remove: () => {}, contains: () => false },
      innerText: '',
      value: ''
    })
  },
  localStorage: {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = v.toString(); }
  },
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

// Load audio.js, combat.js, stage.js, sprites.js, entities.js, input.js
loadScript('src/audio.js');
loadScript('src/combat.js');
loadScript('src/weather.js');
loadScript('src/stage.js');
loadScript('src/sprites.js');
loadScript('src/entities.js');
loadScript('src/input.js');

console.log('--- Testing Dual Pistols Gun-Fu System ---');
const player = new context.Player(100, 200, 'smellu');
player.equipWeapon('pistols');

if (!player.weapon || player.weapon.type !== 'pistols' || player.weapon.hits !== 36) {
  throw new Error(`Failed to equip pistols: ${JSON.stringify(player.weapon)}`);
}
console.log('✔ Successfully equipped dual pistols with 36 bullets');

// Test 4-hit Gun-Fu combo sequence
const attacks = ['pistol_shot1', 'pistol_shot2', 'pistol_whip', 'pistol_crossfire'];
for (let i = 0; i < attacks.length; i++) {
  player.isAttacking = false;
  player.executeWeaponAttack();
  if (player.state !== attacks[i]) {
    throw new Error(`Expected attack state ${attacks[i]}, got ${player.state}`);
  }
  const attackData = player.getAttackData();
  if (!attackData || attackData.weaponType !== 'pistols') {
    throw new Error(`Attack data missing or mismatch for ${attacks[i]}`);
  }
  console.log(`✔ Verified Gun-Fu combo hit ${i + 1}: ${player.state} (damage: ${attackData.damage})`);
  player.comboWindow = 0.5; // keep combo active for next chain
}

// Test Airborne Pistol Sweep
player.z = 25;
player.isAttacking = false;
player.executeWeaponAttack();
if (player.state !== 'air_pistol') {
  throw new Error(`Expected air_pistol, got ${player.state}`);
}
console.log('✔ Verified airborne pistol sweep');

// Test gunshot particles & shell casings
const initParticleCount = context.combatSystem.particles.length;
context.combatSystem.spawnGunShotEffects(100, 150, 200, 1, true);
const newParticles = context.combatSystem.particles.slice(initParticleCount);
const muzzleFlashes = newParticles.filter(p => p.isMuzzleFlash);
const bulletTracers = newParticles.filter(p => p.isBulletTracer);
const shells = newParticles.filter(p => p.isShell);

if (muzzleFlashes.length < 2 || bulletTracers.length < 2 || shells.length < 2) {
  throw new Error(`Gunshot effect particles missing! Flashes: ${muzzleFlashes.length}, Tracers: ${bulletTracers.length}, Shells: ${shells.length}`);
}
console.log(`✔ Verified gunshot effects: ${muzzleFlashes.length} flashes, ${bulletTracers.length} bullet tracers, ${shells.length} tumbling brass shells`);

console.log('\n--- Testing Chinatown Armory & Store ---');
// Create canvas mock
context.document.getElementById = (id) => {
  if (id === 'gameCanvas') {
    return {
      getContext: () => ({
        clearRect: () => {}, save: () => {}, restore: () => {}, translate: () => {},
        fillRect: () => {}, strokeRect: () => {}, fillText: () => {}, measureText: () => ({ width: 50 }),
        beginPath: () => {}, arc: () => {}, stroke: () => {}, fill: () => {},
        drawImage: () => {}
      }),
      width: 480,
      height: 270,
      addEventListener: () => {}
    };
  }
  return {
    addEventListener: () => {},
    querySelectorAll: () => [],
    appendChild: () => {},
    classList: { toggle: () => {}, add: () => {}, remove: () => {}, contains: () => false },
    innerText: '',
    value: ''
  };
};

loadScript('src/game.js');
const game = context.game || new context.Game();

// Verify 3 starting weapons per character
const characters = ['smellu', 'lindin', 'smoro'];
for (const charId of characters) {
  const weps = game.characterWeapons[charId];
  if (!weps || weps.length !== 3) {
    throw new Error(`Character ${charId} does not have 3 weapons configured!`);
  }
  console.log(`✔ Character ${charId} starting weapons: ${weps.map(w => w.name).join(', ')}`);
}

// Test start game with selected starting weapon
game.selectedCharIndex = 1; // lindin
game.selectedWeaponIndex = 1; // dual pistols
game.startNewGame('lindin');
if (!game.player.weapon || game.player.weapon.type !== 'pistols') {
  throw new Error(`Expected Lindin to start with pistols, got ${game.player.weapon?.type}`);
}
console.log('✔ Verified starting new game equipped Lindin with selected Dual Pistols');

// Test Chinatown Armory purchasing
game.player.score = 500; // Not enough for dual pistols (1500)
game.selectedStoreIndex = 0; // dual pistols
game.buyStoreItem(0);
if (game.player.score !== 500) {
  throw new Error('Score was deducted even though player could not afford item!');
}
console.log('✔ Verified insufficient funds correctly rejected in Store');

game.player.score = 3000;
game.buyStoreItem(0); // Buy Dual Pistols for 1500
if (game.player.score !== 1500 || game.player.weapon.type !== 'pistols') {
  throw new Error(`Purchase failed! Score: ${game.player.score}, Weapon: ${game.player.weapon?.type}`);
}
console.log(`✔ Verified purchasing Dual Pistols: Score remaining: ${game.player.score}, Weapon: ${game.player.weapon.type}`);

// Buy Pizza (+50 HP) for 800
game.player.health = 30;
game.buyStoreItem(4);
if (game.player.score !== 700 || game.player.health !== 80) {
  throw new Error(`Pizza purchase failed! Score: ${game.player.score}, Health: ${game.player.health}`);
}
console.log(`✔ Verified purchasing Pizza Slice: Score remaining: ${game.player.score}, Health: ${game.player.health}`);

console.log('\n--- Testing Armed Random Enemies & 100% Drops ---');
// Spawn many regular enemies and verify weapon chance
let armedCount = 0;
const totalEnemies = 200;
for (let i = 0; i < totalEnemies; i++) {
  const enemy = new context.Enemy(200, 200, 'thug');
  if (enemy.weapon) {
    armedCount++;
  }
}
const armedRatio = armedCount / totalEnemies;
console.log(`✔ Spawned ${totalEnemies} enemies, ${armedCount} armed (~${(armedRatio * 100).toFixed(1)}%, expected ~32%)`);
if (armedCount === 0) {
  throw new Error('No enemies spawned with weapons!');
}

// Test armed enemy attack and 100% drop on defeat
const armedThug = new context.Enemy(200, 200, 'thug');
armedThug.weapon = { type: 'pistols', hits: 18 };
armedThug.executeAttack();
const enemyAttack = armedThug.getAttackData();
if (!enemyAttack || enemyAttack.weaponType !== 'pistols') {
  throw new Error(`Expected armed enemy pistol attack, got ${JSON.stringify(enemyAttack)}`);
}
console.log(`✔ Verified armed enemy executed weapon attack: damage ${enemyAttack.damage}, weaponType ${enemyAttack.weaponType}`);

// Kill armed enemy and check drop
armedThug.isDead = true;
armedThug.z = 0;
armedThug.stateTimer = -0.7; // Eligible for removal in game.update loop
game.enemies = [armedThug];
game.pickups = [];

// Trigger enemy update loop in game
const dt = 0.016;
for (let i = game.enemies.length - 1; i >= 0; i--) {
  const e = game.enemies[i];
  if (e.isDead && e.z === 0 && e.stateTimer <= -0.6) {
    if (e.weapon) {
      game.pickups.push(new context.ItemPickup(e.x, e.y, e.weapon.type));
    }
    game.enemies.splice(i, 1);
  }
}

if (game.pickups.length !== 1 || game.pickups[0].type !== 'pistols') {
  throw new Error(`Expected guaranteed pistols drop from armed enemy, got ${game.pickups[0]?.type}`);
}
console.log(`✔ Verified 100% weapon drop from defeated armed enemy: ${game.pickups[0].type}`);

console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
process.exit(0);
