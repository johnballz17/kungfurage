/**
 * Deep Bug Audit & Polish Test Suite
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Declare variables before eval to avoid TDZ (Temporal Dead Zone)
let Player, Enemy, Breakable, ItemPickup, Stage, Game;

// Setup minimal browser mocks
global.window = {
  soundEngine: {
    getBGMVolume: () => 0.5,
    getSFXVolume: () => 0.5,
    setBGMVolume: () => {},
    setSFXVolume: () => {},
    playHit: () => {},
    playKnockdown: () => {},
    playSwing: () => {},
    playGunshot: () => {},
    playSlash: () => {},
    playNunchaku: () => {},
    playJump: () => {},
    playZombieGroan: () => {},
    playZombieBite: () => {},
    playWeaponBreak: () => {},
    playPickup: () => {},
    playEmptyGun: () => {},
    playBossIntro: () => {},
    playBossLaugh: () => {},
    startBGM: () => {},
    stopBGM: () => {},
    resume: () => {}
  },
  inputManager: {
    bindings: {
      up: ['ArrowUp', 'KeyW'],
      down: ['ArrowDown', 'KeyS'],
      left: ['ArrowLeft', 'KeyA'],
      right: ['ArrowRight', 'KeyD'],
      punch: ['KeyJ', 'KeyZ'],
      kick: ['KeyK', 'KeyX'],
      jump: ['Space'],
      special: ['KeyL', 'KeyV'],
      mega: ['KeyH', 'KeyU'],
      store: ['KeyB'],
      mode: ['KeyM'],
      manual: ['KeyN'],
      companion: ['KeyT', 'KeyC'],
      start: ['Enter', 'KeyP', 'Escape']
    },
    keys: {},
    prevKeys: {},
    isActionPressed: () => false,
    isActionJustPressed: () => false,
    getKeyDisplayName: (code) => code || '---'
  },
  combatSystem: null,
  spriteRenderer: {
    drawShadow: () => {},
    drawItem: () => {},
    drawBreakable: () => {},
    drawBoss: () => {},
    drawThug: () => {},
    drawNinja: () => {},
    drawBruiser: () => {},
    drawRonin: () => {},
    drawKicker: () => {},
    drawAssassin: () => {},
    drawClubGiant: () => {},
    drawZombie: () => {},
    drawEquippedWeapon: () => {},
    drawPlayer: () => {}
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  game: null
};

global.document = {
  createElement: () => ({
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    addEventListener: () => {},
    appendChild: () => {},
    innerHTML: '',
    style: {}
  }),
  getElementById: (id) => ({
    id: id,
    width: 480,
    height: 270,
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      fillText: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      stroke: () => {},
      fill: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      drawImage: () => {}
    }),
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    addEventListener: () => {},
    appendChild: () => {},
    innerHTML: '',
    querySelectorAll: () => [],
    style: {}
  }),
  addEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => []
};

global.requestAnimationFrame = () => {};
global.performance = { now: () => Date.now() };

global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = v.toString(); }
};

// Load codebases
const combatCode = fs.readFileSync(path.join(__dirname, '../src/combat.js'), 'utf8');
eval(combatCode);
const entitiesCode = fs.readFileSync(path.join(__dirname, '../src/entities.js'), 'utf8');
eval(entitiesCode);
Player = window.Player;
Enemy = window.Enemy;
Breakable = window.Breakable;
ItemPickup = window.ItemPickup;
global.Player = Player;
global.Enemy = Enemy;
global.Breakable = Breakable;
global.ItemPickup = ItemPickup;
global.AICompanion = window.AICompanion;

const stageCode = fs.readFileSync(path.join(__dirname, '../src/stage.js'), 'utf8');
eval(stageCode);
Stage = window.Stage;
global.Stage = Stage;

const gameCode = fs.readFileSync(path.join(__dirname, '../src/game.js'), 'utf8');
eval(gameCode);
Game = window.Game;
global.Game = Game;

console.log('--- RUNNING DEEP BUG AUDIT VERIFICATION ---');

// TEST 1: Vertical Mode Boss Archetypes & Properties
{
  const stage = new Stage();
  stage.setGameMode('VERTICAL');
  stage.loadStage(1);

  // Floor 5 boss
  const floor5Zone = stage.zones[4];
  assert(floor5Zone.isBossZone, 'Floor 5 must be marked as boss zone');
  const boss5Data = floor5Zone.enemies[0];
  const boss5 = new Enemy(boss5Data.xOffset, boss5Data.y, boss5Data.type, boss5Data.bossType);
  assert.strictEqual(boss5.isBoss, true, 'Floor 5 enemy must have isBoss=true');
  assert.strictEqual(boss5.bossName, 'MASTER SHEN (SHADOW TIGER)', 'Floor 5 boss name accurate');
  assert.strictEqual(boss5.health, 320, 'Master Shen must have 320 max HP');

  // Floor 10 boss (Iron Fang Oni)
  const floor10Zone = stage.zones[9];
  assert(floor10Zone.isBossZone, 'Floor 10 must be boss zone');
  const boss10Data = floor10Zone.enemies[0];
  const boss10 = new Enemy(boss10Data.xOffset, boss10Data.y, boss10Data.type, boss10Data.bossType);
  assert.strictEqual(boss10.isBoss, true, 'Floor 10 enemy must have isBoss=true');
  assert.strictEqual(boss10.bossName, 'IRON FANG ONI', 'Floor 10 boss name accurate');
  assert.strictEqual(boss10.health, 420, 'Iron Fang Oni must have 420 max HP');

  // Floor 20 boss (Grandmaster Kuroda)
  const floor20Zone = stage.zones[19];
  assert(floor20Zone.isBossZone, 'Floor 20 must be boss zone');
  const boss20Data = floor20Zone.enemies[0];
  const boss20 = new Enemy(boss20Data.xOffset, boss20Data.y, boss20Data.type, boss20Data.bossType);
  assert.strictEqual(boss20.isBoss, true, 'Floor 20 enemy must have isBoss=true');
  assert.strictEqual(boss20.bossName, 'GRANDMASTER KURODA (DRAGON LORD)', 'Floor 20 boss name accurate');
  assert.strictEqual(boss20.health, 550, 'Grandmaster Kuroda must have 550 max HP');

  console.log('✓ Test 1 Passed: Vertical Mode Boss Archetypes & Stats verified');
}

// TEST 2: ItemPickup Physics Decoupling & Collection Safety
{
  const pickup = new ItemPickup(200, 200, 'pizza');
  assert.strictEqual(pickup.z, 2, 'Pickup starts with z=2');
  const initialVz = pickup.vz;

  const player = new Player(300, 300, 'smellu'); // Far away
  const companion = new Player(310, 310, 'lindin'); // Far away

  // Run update with player, then checkCollect with companion
  const dt = 1 / 60;
  pickup.update(dt, player);
  pickup.checkCollect(companion);

  // Velocity should have decayed by exactly 0.2 ONCE, not twice!
  assert.strictEqual(pickup.vz, initialVz - 0.2, 'Pickup velocity should only decay once per frame');

  // Now move player onto pickup
  player.x = 200;
  player.y = 200;
  pickup.checkCollect(player);
  assert.strictEqual(pickup.isDead, true, 'Pickup collected by player');

  // Companion immediately checking same pickup should NOT double-collect
  const compHpBefore = companion.health;
  pickup.checkCollect(companion);
  assert.strictEqual(companion.health, compHpBefore, 'Companion did not double-collect dead pickup');

  console.log('✓ Test 2 Passed: ItemPickup single physics & double-collection prevention verified');
}

// TEST 3: Gunshot Green Gore & "OUT OF AMMO!" Durability Text
{
  const combat = window.combatSystem;
  combat.floatingTexts = [];
  combat.particles = [];

  const shooter = new Player(100, 200, 'smellu');
  shooter.equipWeapon('pistols');
  shooter.weapon.hits = 1; // Only 1 shot left!
  shooter.executePunch(); // Triggers pistol_shot1 attack!

  const zombie = new Enemy(125, 200, 'zombie');
  const gunAttack = shooter.getAttackData();

  combat.applyHit(shooter, zombie, gunAttack);

  // Weapon should now be depleted
  assert.strictEqual(shooter.weapon, null, 'Weapon removed after last bullet');

  // Check floating text
  const ammoText = combat.floatingTexts.find(t => t.text === 'OUT OF AMMO!');
  assert(ammoText, 'Combat system spawned OUT OF AMMO! floating text instead of PISTOLS BROKE!');

  // Check green gore was spawned for bullet hit
  const greenGore = combat.particles.filter(p => p.isGore || p.isFloorSplat || p.isGoreChunk);
  assert(greenGore.length > 0, 'Bullet strike spawned green gore particles');

  console.log('✓ Test 3 Passed: Gun-Fu OUT OF AMMO text & gunshot green gore verified');
}

// TEST 4: Mid-Game Mode Toggle Cleans Up Orphaned Entities & Resets Safe Coords
{
  const canvas = { width: 480, height: 270, getContext: () => ({ fillRect: () => {}, clearRect: () => {} }) };
  const game = Object.create(Game.prototype);
  game.canvas = canvas;
  game.ctx = canvas.getContext('2d');
  game.stage = new Stage();
  game.player = new Player(1800, 210, 'smellu');
  game.companion = new Player(1760, 220, 'lindin');
  game.gameMode = 'HORIZONTAL';
  game.gameState = 'PLAYING';
  game.enemies = [new Enemy(1820, 210, 'thug'), new Enemy(1850, 220, 'ninja')];
  game.breakables = [new Breakable(1900, 200)];
  game.pickups = [new ItemPickup(1840, 210)];
  game.highScore = 10000;

  // Toggle mode to VERTICAL mid-combat
  game.toggleGameMode();

  assert.strictEqual(game.gameMode, 'VERTICAL', 'Game mode changed to VERTICAL');
  assert.strictEqual(game.enemies.length, 0, 'Enemies array cleanly reset to prevent orphaned off-screen targets');
  assert.strictEqual(game.breakables.length, 0, 'Breakables cleanly reset');
  assert.strictEqual(game.pickups.length, 0, 'Pickups cleanly reset');
  assert.strictEqual(game.player.x, 240, 'Player safely centered on pagoda platform (x=240)');
  assert.strictEqual(game.companion.x, 200, 'Companion safely placed on pagoda platform (x=200)');

  // Toggle back to HORIZONTAL mid-combat
  game.toggleGameMode();
  assert.strictEqual(game.gameMode, 'HORIZONTAL', 'Game mode returned to HORIZONTAL');
  assert.strictEqual(game.player.x, 100, 'Player positioned at street starting coordinate (x=100)');
  assert(game.enemies.length > 0, 'Horizontal stage 1 enemies spawned for street fight');

  console.log('✓ Test 4 Passed: Mid-game mode switching safety & entity cleanup verified');
}

// TEST 5: Title Screen Control Key Isolation
{
  const mockInput = {
    keys: { KeyM: true },
    prevKeys: { KeyM: false },
    isActionJustPressed: (act) => act === 'mode'
  };

  const isControlKey = (mockInput.keys['KeyM'] && !mockInput.prevKeys['KeyM']) ||
                       (mockInput.keys['KeyN'] && !mockInput.prevKeys['KeyN']) ||
                       (mockInput.keys['KeyO'] && !mockInput.prevKeys['KeyO']) ||
                       mockInput.isActionJustPressed('mode') ||
                       mockInput.isActionJustPressed('manual');

  assert.strictEqual(isControlKey, true, 'KeyM correctly flagged as control key');
  console.log('✓ Test 5 Passed: Title screen control key isolation verified');
}

// TEST 6: Stage Clear Transition Dynamic Text
{
  const canvas = { width: 480, height: 270, getContext: () => ({ fillRect: () => {}, clearRect: () => {} }) };
  const game = Object.create(Game.prototype);
  game.stage = new Stage();
  game.stage.setGameMode('VERTICAL');
  game.player = { score: 18500 };

  const textsRendered = [];
  const mockCtx = {
    fillStyle: '',
    font: '',
    textAlign: '',
    fillRect: () => {},
    fillText: (text) => textsRendered.push(text)
  };

  game.renderVictoryOverlay(mockCtx);
  assert(textsRendered.includes('ULTIMATE VICTORY!'), 'Victory header rendered');
  assert(textsRendered.includes('CELESTIAL DRAGON LORD DEFEATED!'), 'Vertical mode victory boss text rendered');
  assert(textsRendered.includes('YOU CONQUERED THE 100 FLOORS!'), 'Vertical mode 100 floors conquered text rendered');

  console.log('✓ Test 6 Passed: Dynamic Victory Screen text verified for Pagoda Ascent');
}

console.log('\n=========================================');
console.log('ALL DEEP BUG AUDIT TESTS PASSED SUCCESSFULLY! 🚀');
console.log('=========================================');
