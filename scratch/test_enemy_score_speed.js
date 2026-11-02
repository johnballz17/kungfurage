// Test suite for Enemy fighting speed scaling based on score (+0.5% per 100 score)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Setup mock browser globals
global.window = {
  combatSystem: {
    spawnComboText: () => {},
    triggerScreenShake: () => {},
    spawnGunShotEffects: () => {},
    checkHit: () => false,
    applyHit: () => {}
  },
  soundEngine: {
    playSwing: () => {},
    playHit: () => {},
    playSlash: () => {},
    playGunshot: () => {},
    playBossIntro: () => {},
    playBossLaugh: () => {}
  },
  spriteRenderer: {
    drawShadow: () => {},
    drawPlayer: () => {},
    drawThug: () => {},
    drawNinja: () => {},
    drawBruiser: () => {},
    drawRonin: () => {},
    drawKicker: () => {},
    drawAssassin: () => {},
    drawClubGiant: () => {},
    drawBoss: () => {}
  },
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

// Load code
const entitiesPath = path.join(__dirname, '..', 'src', 'entities.js');
const entitiesCode = fs.readFileSync(entitiesPath, 'utf8');

// Evaluate in context
eval(entitiesCode);

const EnemyClass = window.Enemy;
const PlayerClass = window.Player;

console.log('--- TEST SUITE: ENEMY SCORE FIGHTING SPEED SCALING ---');

// Test 1: Formula calculations
{
  const enemy = new EnemyClass(100, 100, 'thug');
  const mockPlayer = { score: 0 };
  assert.strictEqual(enemy.getScoreSpeedMultiplier(mockPlayer), 1.0, 'Score 0 should give 1.0x speed');

  mockPlayer.score = 100;
  assert.strictEqual(Math.round(enemy.getScoreSpeedMultiplier(mockPlayer) * 1000) / 1000, 1.005, 'Score 100 should give 1.005x (+0.5%)');

  mockPlayer.score = 1000;
  assert.strictEqual(Math.round(enemy.getScoreSpeedMultiplier(mockPlayer) * 1000) / 1000, 1.050, 'Score 1,000 should give 1.05x (+5.0%)');

  mockPlayer.score = 5000;
  assert.strictEqual(Math.round(enemy.getScoreSpeedMultiplier(mockPlayer) * 1000) / 1000, 1.250, 'Score 5,000 should give 1.25x (+25.0%)');

  mockPlayer.score = 10000;
  assert.strictEqual(Math.round(enemy.getScoreSpeedMultiplier(mockPlayer) * 1000) / 1000, 1.500, 'Score 10,000 should give 1.50x (+50.0%)');

  mockPlayer.score = 20000;
  assert.strictEqual(Math.round(enemy.getScoreSpeedMultiplier(mockPlayer) * 1000) / 1000, 2.000, 'Score 20,000 should give 2.00x (+100.0%)');

  console.log('✓ Test 1 Passed: Speed multiplier formula scales by exactly +0.5% per 100 points');
}

// Test 2: Movement speed scaling in updateAI
{
  const stageMock = { minY: 150, maxY: 230 };
  const player = new PlayerClass(200, 180, 'smellu');
  player.score = 0;
  window.game.player = player;

  const enemyBase = new EnemyClass(100, 180, 'thug');
  enemyBase.update(0.016, player, stageMock);
  const baseVx = enemyBase.vx;
  assert(baseVx > 0, 'Enemy should move toward player');

  // Now set player score to 10,000 (+50% speed => 1.5x)
  player.score = 10000;
  const enemyScaled = new EnemyClass(100, 180, 'thug');
  enemyScaled.update(0.016, player, stageMock);
  const scaledVx = enemyScaled.vx;

  const ratio = scaledVx / baseVx;
  assert(Math.abs(ratio - 1.5) < 0.001, `Movement speed ratio should be 1.5, got ${ratio}`);
  console.log(`✓ Test 2 Passed: Movement speed scaled accurately (Base vx: ${baseVx}, Scaled vx: ${scaledVx}, Ratio: ${ratio.toFixed(2)}x)`);
}

// Test 3: Attack Cooldown reduction with score
{
  const enemy = new EnemyClass(100, 180, 'ninja');
  const mockPlayerLow = { score: 0 };
  const mockPlayerHigh = { score: 20000 }; // 2.0x multiplier

  // Sample cooldowns over multiple attacks
  let avgCooldownLow = 0;
  let avgCooldownHigh = 0;
  const samples = 100;

  for (let i = 0; i < samples; i++) {
    enemy.executeAttack(mockPlayerLow);
    avgCooldownLow += enemy.attackCooldown;

    enemy.executeAttack(mockPlayerHigh);
    avgCooldownHigh += enemy.attackCooldown;
  }

  avgCooldownLow /= samples;
  avgCooldownHigh /= samples;

  const cooldownRatio = avgCooldownLow / avgCooldownHigh;
  assert(cooldownRatio > 1.8 && cooldownRatio < 2.2, `Attack cooldown should scale inversely by ~2.0x, got ${cooldownRatio}`);
  console.log(`✓ Test 3 Passed: Attack cooldown scaled inversely with score (Avg low score: ${avgCooldownLow.toFixed(2)}s, Avg high score: ${avgCooldownHigh.toFixed(2)}s, Ratio: ${cooldownRatio.toFixed(2)}x)`);
}

// Test 4: Attack animation / strike speed scales with score
{
  const enemyLow = new EnemyClass(100, 180, 'ronin');
  enemyLow.weapon = null;
  enemyLow.executeAttack({ score: 0 });
  const timerLow = enemyLow.stateTimer;

  const enemyHigh = new EnemyClass(100, 180, 'ronin');
  enemyHigh.weapon = null;
  enemyHigh.executeAttack({ score: 10000 }); // 1.5x speed multiplier
  const timerHigh = enemyHigh.stateTimer;

  assert(timerHigh < timerLow, `High score stateTimer (${timerHigh}) should be shorter than low score (${timerLow})`);
  console.log(`✓ Test 4 Passed: Attack strike execution speed is faster at higher scores (Low: ${timerLow.toFixed(3)}s vs High: ${timerHigh.toFixed(3)}s)`);
}

// Test 5: Boss Enrage stacks multiplicatively with score speed
{
  const stageMock = { minY: 150, maxY: 230 };
  const player = { x: 300, y: 180, score: 10000 }; // 1.5x score speed
  const boss = new EnemyClass(100, 180, 'boss', 'master_shen');
  const initialBaseSpeed = boss.speed;

  // Simulate enrage trigger
  boss.health = boss.maxHealth * 0.3; // below 45%
  boss.updateAI(0.016, player, stageMock);

  assert(boss.isEnraged, 'Boss should be enraged');
  assert(boss.speed > initialBaseSpeed, 'Boss base speed should have increased from enrage');
  const expectedVx = boss.speed * 1.5; // (initialBaseSpeed * 1.35) * 1.5
  assert(Math.abs(boss.vx - expectedVx) < 0.001, `Enraged boss vx should be ${expectedVx}, got ${boss.vx}`);
  console.log(`✓ Test 5 Passed: Boss Enrage (1.35x) and score speed (1.5x) stacked multiplicatively to ${(boss.vx / initialBaseSpeed).toFixed(2)}x total speed`);
}

// Test 6: Safe lower bounds at extreme scores (e.g. 100,000 score)
{
  const enemy = new EnemyClass(100, 180, 'ninja');
  enemy.executeAttack({ score: 100000 });
  assert(enemy.attackCooldown >= 0.20, `Cooldown should respect safe minimum of 0.20s, got ${enemy.attackCooldown}`);
  assert(enemy.stateTimer >= 0.10, `State timer should not degenerate to 0, got ${enemy.stateTimer}`);
  console.log('✓ Test 6 Passed: Extreme scores respect safe lower bounds preventing physics glitches');
}

console.log('\n=========================================');
console.log('ALL ENEMY SCORE SPEED TESTS PASSED SUCCESSFULLY!');
console.log('=========================================');
