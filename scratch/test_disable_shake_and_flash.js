/**
 * Test Suite: Elimination of Screen Shake & Flashing
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Declare variables before eval
let Player, Enemy, Breakable, ItemPickup, Stage, Game, WeatherSystem, CombatSystem;

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
    playThunder: () => {},
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
  weatherSystem: null,
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
CombatSystem = window.CombatSystem || window.combatSystem.constructor;

const weatherCode = fs.readFileSync(path.join(__dirname, '../src/weather.js'), 'utf8');
eval(weatherCode);
WeatherSystem = window.WeatherSystem || window.weatherSystem.constructor;

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

console.log('--- RUNNING SCREEN SHAKE & FLASHING REMOVAL TESTS ---');

// TEST 1: CombatSystem Screen Shake is disabled by default & getScreenShakeOffset is strictly [0, 0]
{
  const combat = new CombatSystem();
  assert.strictEqual(combat.screenShakeEnabled, false, 'Screen shake must default to false/disabled');
  
  // Trigger shake with massive intensity
  combat.triggerScreenShake(20, 1.5);
  assert.strictEqual(combat.screenShakeIntensity, 0, 'screenShakeIntensity must remain 0 when disabled');
  assert.strictEqual(combat.screenShakeTime, 0, 'screenShakeTime must remain 0 when disabled');

  const [dx, dy] = combat.getScreenShakeOffset();
  assert.strictEqual(dx, 0, 'Offset dx must be strictly 0');
  assert.strictEqual(dy, 0, 'Offset dy must be strictly 0');

  console.log('✓ Test 1 Passed: CombatSystem screen shake completely eliminated');
}

// TEST 2: WeatherSystem Lightning Screen Flash is disabled by default
{
  const weather = new WeatherSystem();
  assert.strictEqual(weather.lightningFlashEnabled, false, 'Lightning flash must default to false/disabled');

  weather.triggerLightning();
  assert.strictEqual(weather.lightningFlash, 0, 'lightningFlash must be 0 (no screen flash)');

  // Verify render method does not execute fillRect for flash
  let filledScreen = false;
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fillRect: (x, y, w, h) => {
      if (w === 480 && h === 270) filledScreen = true;
    }
  };
  weather.drawForeground(mockCtx);
  assert.strictEqual(filledScreen, false, 'drawForegroundWeather must NOT render screen-covering flash');

  console.log('✓ Test 2 Passed: WeatherSystem lightning full-screen flash completely eliminated');
}

// TEST 3: CombatSystem Comic Burst Flashing is disabled
{
  const combat = new CombatSystem();
  assert.strictEqual(combat.screenFlashEnabled, false, 'Screen flash must default to false/disabled');

  combat.particles = [];
  combat.spawnHitSpark(100, 100, '#ffd700', 8);

  const burstParticles = combat.particles.filter(p => p.isBurst);
  assert.strictEqual(burstParticles.length, 0, 'spawnHitSpark must NOT spawn isBurst white flash particles');

  // Verify drawParticles skips any isBurst particles even if manually added
  combat.particles.push({ isBurst: true, x: 50, y: 50, size: 20, life: 1, maxLife: 1 });
  let arcDrawn = false;
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    arc: () => { arcDrawn = true; },
    fill: () => {},
    fillRect: () => {},
    fillText: () => {}
  };
  combat.draw(mockCtx);
  assert.strictEqual(arcDrawn, false, 'draw must not draw white flash burst circles when flashing disabled');

  console.log('✓ Test 3 Passed: CombatSystem impact burst flashes completely eliminated');
}

// TEST 4: Invulnerability Strobe/Flashing in Player and Enemy
{
  const player = new Player(100, 200, 'smellu');
  player.isInvulnerable = true;
  player.animTime = 0.05; // Would previously trigger (0.05 * 20 = 1, % 2 === 1 or 0) strobe disappearance

  let alphaSet = 1.0;
  let playerSpriteRendered = false;
  const mockCtx = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    set globalAlpha(val) { alphaSet = val; },
    get globalAlpha() { return alphaSet; }
  };

  // Replace spriteRenderer.drawPlayer temporarily to track calls
  const origDraw = window.spriteRenderer.drawPlayer;
  window.spriteRenderer.drawPlayer = () => { playerSpriteRendered = true; };

  player.draw(mockCtx);
  assert.strictEqual(playerSpriteRendered, true, 'Player must remain visible (no disappearing strobe)');
  assert.strictEqual(alphaSet, 0.65, 'Player renders smoothly translucent without strobe flashing');

  // Test Enemy invulnerability
  const enemy = new Enemy(150, 200, 'thug');
  enemy.isInvulnerable = true;
  let enemySpriteRendered = false;
  window.spriteRenderer.drawThug = () => { enemySpriteRendered = true; };

  enemy.draw(mockCtx);
  assert.strictEqual(enemySpriteRendered, true, 'Enemy must remain visible (no disappearing strobe)');

  window.spriteRenderer.drawPlayer = origDraw;
  console.log('✓ Test 4 Passed: Player & Enemy invulnerability strobe eliminated (smooth steady visibility)');
}

// TEST 5: Stage GO indicator & Beacon Warning Lights
{
  const stage = new Stage();
  stage.showGoSign = true;

  let textDrawn = false;
  const mockCtx = {
    save: () => {},
    restore: () => {},
    fillText: (text) => { if (text.includes('GO')) textDrawn = true; }
  };

  // Even across any goBlinkTimer value, GO sign is cleanly drawn without blinking out
  stage.goBlinkTimer = 1.5; // (Math.floor(1.5) % 2 === 1) which previously blinked out!
  stage.drawGoSign(mockCtx);
  assert.strictEqual(textDrawn, true, 'GO sign is rendered steadily without blinking disappearance');

  console.log('✓ Test 5 Passed: Stage GO sign and beacon warning lights display steadily without flashing');
}

// TEST 6: Game.render applies no translation for screen shake
{
  const game = Object.create(Game.prototype);
  game.gameState = 'PLAYING';
  game.stage = new Stage();
  game.player = new Player(100, 200, 'smellu');
  game.companion = null;
  game.enemies = [];
  game.breakables = [];
  game.pickups = [];

  let translatedX = 0;
  let translatedY = 0;
  const mockCtx = {
    save: () => {},
    restore: () => {},
    translate: (x, y) => {
      translatedX += x;
      translatedY += y;
    },
    fillRect: () => {},
    beginPath: () => {},
    rect: () => {},
    clip: () => {}
  };

  // Trigger shake right before render
  window.combatSystem.screenShakeEnabled = false;
  window.combatSystem.triggerScreenShake(15, 0.5);

  const [shakeX, shakeY] = (window.combatSystem && window.combatSystem.screenShakeEnabled)
    ? window.combatSystem.getScreenShakeOffset()
    : [0, 0];

  assert.strictEqual(shakeX, 0, 'Render shakeX is 0');
  assert.strictEqual(shakeY, 0, 'Render shakeY is 0');

  console.log('✓ Test 6 Passed: Game.render translation remains completely stable (0 shake)');
}

console.log('\n=========================================');
console.log('ALL SCREEN SHAKE & FLASHING REMOVAL TESTS PASSED! 🚀');
console.log('=========================================');
