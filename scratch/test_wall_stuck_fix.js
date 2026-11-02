/**
 * Automated Test Suite: Wall Collision, Hitstun Recovery, and Anti-Stuck Mechanics
 */

const fs = require('fs');
const path = require('path');

// Setup minimal DOM and audio mocks
global.window = {
  soundEngine: {
    playHit: () => {},
    playKnockdown: () => {},
    playSwing: () => {},
    playGunshot: () => {},
    playSlash: () => {},
    playNunchaku: () => {},
    playJump: () => {},
    playZombieGroan: () => {},
    playBossIntro: () => {},
    playBossLaugh: () => {},
    startBGM: () => {},
    stopBGM: () => {}
  },
  combatSystem: {
    spawnDamageNumber: () => {},
    spawnComboText: () => {},
    spawnHitSpark: () => {},
    triggerScreenShake: () => {},
    spawnGunShotEffects: () => {},
    spawnGreenGore: () => {}
  },
  game: null
};

// Mock AudioContext and localStorage
global.AudioContext = class {
  createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

// Evaluate scripts in order
const combatCode = fs.readFileSync(path.join(__dirname, '../src/combat.js'), 'utf8');
eval(combatCode);
const entitiesCode = fs.readFileSync(path.join(__dirname, '../src/entities.js'), 'utf8');
eval(entitiesCode);

const Player = window.Player;
const Enemy = window.Enemy;
const AICompanion = window.AICompanion;

const mockStage = {
  cameraX: 100,
  minY: 152,
  maxY: 264
};

window.game = {
  stage: mockStage,
  getDifficultyModifiers: () => ({ playerDamageTakenMult: 1, playerDamageDealtMult: 1, enemyAttackCooldownMult: 1, enemyHealthMult: 1 })
};

function runTests() {
  console.log('--- RUNNING WALL STUCK FIX TESTS ---');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`PASS: ${message}`);
      passed++;
    } else {
      console.error(`FAIL: ${message}`);
    }
  }

  // TEST 1: Wall Knockdown Breaker on Wall Punch
  // When player is punched near the right wall (cameraX + 460 = 560),
  // they should cleanly knock down with invulnerability rather than infinite flinch lock
  {
    const player = new Player(mockStage.cameraX + 458, 200, 'smellu');
    assert(player.x === 558, 'Player starts near right wall boundary (x=558)');

    // Enemy punches player towards the wall (facing 1 = punches right)
    player.takeDamage(10, 1, false);

    assert(player.state === 'knockdown', 'Wall punch automatically converted to knockdown to prevent infinite wall trap');
    assert(player.vz > 0, 'Player launched with upward arc for clean wall bounce');
  }

  // TEST 2: Wall Rebound Bounce
  // When player or enemy flies into the wall in knockdown/airborne, penetrating velocity is reversed inward
  {
    const player = new Player(mockStage.cameraX + 450, 200, 'smellu');
    player.knockdown(1, 6.0, 3.5); // Moving right at vx = 6.0 towards right wall (cameraX + 460 = 560)
    assert(player.vx === 6.0, 'Player initial launch vx = 6.0 towards right wall');

    // Simulate 3 frames of physics and wall collision
    const dt = 1 / 60;
    for (let i = 0; i < 3; i++) {
      player.updatePhysics(dt);
      player.handleWallCollision(mockStage);
    }

    assert(player.x <= mockStage.cameraX + 460, 'Player x does not exceed right wall (560)');
    assert(player.vx < 0, `Player vx rebounded inward off the right wall (vx = ${player.vx.toFixed(2)})`);
  }

  // TEST 3: Left Wall Rebound Bounce
  {
    const enemy = new Enemy(mockStage.cameraX + 30, 200, 'ninja');
    enemy.knockdown(-1, 5.0, 3.0); // Moving left towards left wall (cameraX + 20 = 120)
    assert(enemy.vx === -5.0, 'Enemy initial launch vx = -5.0 towards left wall');

    const dt = 1 / 60;
    for (let i = 0; i < 3; i++) {
      enemy.updatePhysics(dt);
      enemy.handleWallCollision(mockStage);
    }

    assert(enemy.x >= mockStage.cameraX + 20, 'Enemy x does not clip behind left wall (120)');
    assert(enemy.vx > 0, `Enemy vx rebounded inward off the left wall (vx = ${enemy.vx.toFixed(2)})`);
  }

  // TEST 4: Wall Recovery Invulnerability & Inward Nudge
  // When player stands up at the wall, they get 1.2s invulnerability and are nudged inward so they can move freely
  {
    const player = new Player(mockStage.cameraX + 20, 200, 'lindin');
    player.state = 'knockdown';
    player.stateTimer = 0.01;
    player.z = 0;

    const mockInput = {
      isActionPressed: () => false,
      isActionJustPressed: () => false,
      getHorizontal: () => 0,
      getVertical: () => 0
    };

    player.update(0.02, mockInput, mockStage);

    assert(player.state === 'idle', 'Player stands up into idle state');
    assert(player.isInvulnerable === true, 'Player gains invulnerability on stand up');
    assert(player.invulnTimer >= 1.0, `Player has recovery invulnerability timer (${player.invulnTimer.toFixed(2)}s)`);
    assert(player.x > mockStage.cameraX + 20, `Player nudged inward away from left wall (x = ${player.x})`);
  }

  // TEST 5: Free Movement & Attacks After Wall Standup
  // Verify player can immediately walk, dash, and jump away from wall after standup
  {
    const player = new Player(mockStage.cameraX + 450, 200, 'smellu');
    player.state = 'idle';
    player.z = 0;

    // Player inputs LEFT to walk away from right wall
    const walkLeftInput = {
      isActionPressed: (act) => act === 'left',
      isActionJustPressed: () => false,
      getHorizontal: () => -1,
      getVertical: () => 0
    };

    player.update(1 / 60, walkLeftInput, mockStage);
    assert(player.state === 'walk', 'Player cleanly transitions from idle to walk');
    assert(player.vx < 0, `Player vx moves away from right wall (vx = ${player.vx})`);
    assert(player.facing === -1, 'Player faces left away from right wall');
  }

  // TEST 6: Single-Hit Wall Recovery Buffer
  // If player recovers from a light hit at the wall, they get a 0.45s invulnerability buffer to react
  {
    const player = new Player(mockStage.cameraX + 455, 200, 'smoro');
    player.state = 'hurt';
    player.stateTimer = 0.01;

    const mockInput = {
      isActionPressed: () => false,
      isActionJustPressed: () => false,
      getHorizontal: () => 0,
      getVertical: () => 0
    };

    player.update(0.02, mockInput, mockStage);
    assert(player.state === 'idle', 'Player recovers from hurt to idle');
    assert(player.isInvulnerable === true, 'Player gains wall recovery invulnerability');
    assert(player.invulnTimer >= 0.40, `Player has 450ms safety window (invulnTimer = ${player.invulnTimer.toFixed(2)}s)`);
  }

  console.log(`\nTEST RESULTS: ${passed}/${total} assertions passed`);
  if (passed === total) {
    console.log('ALL WALL STUCK FIX TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runTests();
