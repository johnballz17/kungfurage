// Comprehensive Test Suite: Weapons, Green Gore & Zombie Enemies
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser environment
global.window = {
  combatSystem: null,
  soundEngine: {
    playSwing: () => {},
    playHit: () => {},
    playKnockdown: () => {},
    playPickup: () => {},
    playNunchaku: () => {},
    playSlash: () => {},
    playGunshot: () => {},
    playZombieGroan: () => {},
    playZombieBite: () => {},
    playWeaponBreak: () => {},
    playBossIntro: () => {},
    playBossLaugh: () => {}
  },
  spriteRenderer: null,
  game: {
    difficulty: 'NORMAL',
    getDifficultyModifiers: () => ({
      playerDamageTakenMult: 1.0,
      playerDamageDealtMult: 1.0,
      enemyHealthMult: 1.0,
      enemyAttackCooldownMult: 1.0
    }),
    player: {
      score: 0
    }
  }
};

global.document = {
  getElementById: () => null,
  addEventListener: () => {}
};

// Load combat system
const combatCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'combat.js'), 'utf8');
eval(combatCode);
assert(window.combatSystem, 'combatSystem should be initialized');

// Load entities
const entitiesCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'entities.js'), 'utf8');
eval(entitiesCode);

// Load sprites
const spritesCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'sprites.js'), 'utf8');
eval(spritesCode);

const Player = window.Player;
const Enemy = window.Enemy;
const ItemPickup = window.ItemPickup;
const CombatSystem = window.CombatSystem;

console.log('--- TEST SUITE: WEAPONS, GREEN GORE & ZOMBIES ---');

// Test 1: Weapon Equipping & Attacks
{
  const player = new Player(100, 180, 'smellu');
  assert.strictEqual(player.weapon, null, 'Player should start bare-handed');

  // Equip Nunchaku
  player.equipWeapon('nunchaku');
  assert(player.weapon, 'Weapon should be equipped');
  assert.strictEqual(player.weapon.type, 'nunchaku');
  assert.strictEqual(player.weapon.hits, 24);

  // Attack with Nunchaku
  player.executePunch();
  assert.strictEqual(player.state, 'nunchaku_attack');
  const attackData = player.getAttackData();
  assert(attackData, 'Should return attack data');
  assert.strictEqual(attackData.weaponType, 'nunchaku');
  assert.strictEqual(attackData.damage, 20);

  // Equip Daggers
  player.equipWeapon('daggers');
  assert.strictEqual(player.weapon.type, 'daggers');
  assert.strictEqual(player.weapon.hits, 20);
  player.executePunch();
  assert.strictEqual(player.state, 'dagger_attack');
  const daggerAttack = player.getAttackData();
  assert.strictEqual(daggerAttack.weaponType, 'daggers');
  assert.strictEqual(daggerAttack.damage, 18);

  // Equip Lead Pipe
  player.equipWeapon('pipe');
  assert.strictEqual(player.weapon.type, 'pipe');
  assert.strictEqual(player.weapon.hits, 14);
  player.executePunch();
  assert.strictEqual(player.state, 'pipe_attack');
  const pipeAttack = player.getAttackData();
  assert.strictEqual(pipeAttack.weaponType, 'pipe');
  assert.strictEqual(pipeAttack.damage, 30);
  assert.strictEqual(pipeAttack.knockdown, true);

  console.log('✓ Test 1 Passed: Weapons (Nunchaku, Daggers, Lead Pipe) equip and execute custom attacks with correct stats');
}

// Test 2: Weapon Durability & Shatter
{
  const player = new Player(100, 180, 'smellu');
  player.equipWeapon('daggers');
  player.weapon.hits = 1; // 1 hit remaining

  const targetEnemy = new Enemy(120, 180, 'thug');
  const attackData = { damage: 18, weaponType: 'daggers' };

  let shatterDetected = false;
  window.combatSystem.particles = [];
  window.combatSystem.applyHit(player, targetEnemy, attackData);

  assert.strictEqual(player.weapon, null, 'Weapon should break when hits reach 0');
  const shatterParticles = window.combatSystem.particles.filter(p => p.isShatter);
  assert(shatterParticles.length > 0, 'Shatter particles should be spawned on weapon break');
  console.log(`✓ Test 2 Passed: Weapon durability decrements and triggers break & shatter effects (Spawned ${shatterParticles.length} shatter particles)`);
}

// Test 3: Green Gore Particle System on Enemy Strikes
{
  window.combatSystem.particles = [];
  const player = new Player(100, 180, 'smellu');
  const enemy = new Enemy(125, 180, 'thug');

  window.combatSystem.applyHit(player, enemy, { damage: 12, knockdown: false });

  const goreParticles = window.combatSystem.particles.filter(p => p.isGore);
  const floorSplats = window.combatSystem.particles.filter(p => p.isFloorSplat);

  assert(goreParticles.length > 0, 'Green gore arterial droplets should spawn on enemy hit');
  assert(floorSplats.length > 0, 'Green floor splat puddles should spawn on pavement');

  // Verify green color palette
  const greenColors = ['#00ff44', '#39ff14', '#1b7a2b', '#76ff03', '#00e676', '#14521e', '#22c55e'];
  assert(greenColors.includes(goreParticles[0].color), `Gore color ${goreParticles[0].color} should be a vivid green`);

  // Verify physics update: droplets fall and stick to floor
  const testGore = goreParticles[0];
  const initialY = testGore.y;
  window.combatSystem.update(0.1);
  assert(testGore.y !== initialY, 'Gore droplets should move with physics');

  console.log(`✓ Test 3 Passed: Green gore particles & floor splatter spawn accurately on enemy strikes (Spawned ${goreParticles.length} gore droplets & ${floorSplats.length} floor splats)`);
}

// Test 4: Zombie Enemy Archetype
{
  const zombie = new Enemy(200, 180, 'zombie');
  assert.strictEqual(zombie.type, 'zombie');
  assert.strictEqual(zombie.isZombie, true);
  assert.strictEqual(zombie.health, 75);
  assert.strictEqual(zombie.maxHealth, 75);
  assert.strictEqual(zombie.scoreValue, 450);

  // Test Zombie AI Update
  const mockStage = { minY: 150, maxY: 240 };
  const mockPlayer = { x: 100, y: 180, score: 0 };
  zombie.update(0.016, mockPlayer, mockStage);
  assert(zombie.vx !== 0, 'Zombie should move toward target');

  // Test Zombie Attacks (Claw and Bite)
  zombie.executeAttack(mockPlayer);
  assert.strictEqual(zombie.state, 'attack');
  assert(zombie.attackSubtype === 'bite' || zombie.attackSubtype === 'claw', 'Zombie attack subtype should be bite or claw');

  const zombieAttack = zombie.getAttackData();
  assert(zombieAttack, 'Zombie should generate attack data');
  assert(zombieAttack.damage >= 14, `Zombie damage should be >= 14, got ${zombieAttack.damage}`);

  console.log(`✓ Test 4 Passed: Zombie enemy archetype fully functional (Subtype: ${zombie.attackSubtype}, Dmg: ${zombieAttack.damage}, Knockdown: ${zombieAttack.knockdown})`);
}

// Test 5: Extra Undead Rotten Gore on Zombie Strikes & Kill
{
  window.combatSystem.particles = [];
  const player = new Player(100, 180, 'smellu');
  const zombie = new Enemy(125, 180, 'zombie');
  zombie.health = 10; // low health

  // Kill zombie with heavy hit
  window.combatSystem.applyHit(player, zombie, { damage: 25, knockdown: true });
  assert.strictEqual(zombie.health, 0, 'Zombie should be dead');

  const zombieGore = window.combatSystem.particles.filter(p => p.isGore);
  const zombieChunks = window.combatSystem.particles.filter(p => p.isGoreChunk);

  assert(zombieGore.length >= 30, `Zombie death should unleash massive green gore shower (Got ${zombieGore.length})`);
  assert(zombieChunks.length > 0, `Zombie death should unleash flying rotten giblet chunks (Got ${zombieChunks.length})`);

  console.log(`✓ Test 5 Passed: Zombie kill triggers massive rotting green gore shower (${zombieGore.length} droplets, ${zombieChunks.length} giblet chunks)`);
}

// Test 6: ItemPickup Weapon Collection
{
  const player = new Player(100, 180, 'smellu');
  const pickup = new ItemPickup(100, 180, 'daggers');
  pickup.update(0.016, player);

  assert(pickup.isDead, 'Pickup should be marked collected');
  assert(player.weapon, 'Player should receive weapon from ItemPickup');
  assert.strictEqual(player.weapon.type, 'daggers');
  assert.strictEqual(player.weapon.hits, 20);

  console.log('✓ Test 6 Passed: ItemPickup correctly drops and equips weapons to player');
}

// Test 7: Sprite Renderer Verification
{
  const mockCtx = {
    save: () => {},
    restore: () => {},
    scale: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    closePath: () => {},
    arc: () => {},
    ellipse: () => {},
    fill: () => {},
    stroke: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {}
  };

  const renderer = window.spriteRenderer;
  assert(renderer, 'spriteRenderer should exist');

  // Verify drawZombie
  renderer.drawZombie(mockCtx, 'idle', 0.5, 1);
  renderer.drawZombie(mockCtx, 'walk', 1.0, -1);
  renderer.drawZombie(mockCtx, 'attack', 0.2, 1);
  renderer.drawZombie(mockCtx, 'hurt', 0.1, -1);
  renderer.drawZombie(mockCtx, 'knockdown', 0.5, 1);

  // Verify drawItem with all weapons
  ['pizza', 'scroll', 'nunchaku', 'daggers', 'pipe'].forEach(type => {
    renderer.drawItem(mockCtx, type, 0.5);
  });

  // Verify drawEquippedWeapon
  const mockWeapon = { type: 'nunchaku', hits: 20 };
  renderer.drawEquippedWeapon(mockCtx, 'idle', 0.5, 1, 'smellu', mockWeapon);
  mockWeapon.type = 'daggers';
  renderer.drawEquippedWeapon(mockCtx, 'dagger_attack', 0.2, 1, 'lindin', mockWeapon);
  mockWeapon.type = 'pipe';
  renderer.drawEquippedWeapon(mockCtx, 'pipe_attack', 0.3, 1, 'smoro', mockWeapon);

  console.log('✓ Test 7 Passed: SpriteRenderer renders Zombie animations, all weapon items, and equipped weapon overlays without errors');
}

console.log('\n=========================================');
console.log('ALL WEAPONS, GREEN GORE & ZOMBIE TESTS PASSED!');
console.log('=========================================');
