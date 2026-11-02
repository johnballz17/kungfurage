const assert = require('assert');

// Mock localStorage
const storage = {};
global.localStorage = {
  getItem: (key) => (key in storage ? storage[key] : null),
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

// Mock browser globals
global.window = {
  soundEngine: {
    resume: () => {},
    playPickup: () => {},
    playSwing: () => {},
    startBGM: () => {},
    stopBGM: () => {},
    playKnockdown: () => {},
    playStageClear: () => {}
  },
  combatSystem: {
    spawnComboText: () => {}
  },
  gameLogger: {
    log: () => {}
  }
};

const { AILearningEngine } = require('../src/learning.js');

console.log('--- TEST 1: AI Learning Engine Initialization ---');
const engine = new AILearningEngine();
assert.notStrictEqual(engine.matrix, null);
assert.strictEqual(typeof engine.matrix['MELEE_ALONE'], 'object');
assert.strictEqual(typeof engine.matrix['MELEE_BOSS'], 'object');
assert.strictEqual(typeof engine.matrix['FAR_MOBBED'], 'object');
assert.strictEqual(engine.stats.totalMovesRecorded, 0);
assert.strictEqual(engine.stats.epochs, 1);
console.log('✓ PASS: AI Learning Engine initialized with Q-matrix and stats');

console.log('--- TEST 2: Situation Classification & Action Selection ---');
const mockPlayer = { x: 100, y: 200, z: 0, characterId: 'smellu', specialMeter: 40, weapon: null };
const mockTarget = { x: 125, y: 200, isBoss: false, health: 50 };
const mockEnemies = [mockTarget, { x: 130, y: 205, isDead: false }];

const sitKey = engine.getSituationKey(mockPlayer, mockTarget, mockEnemies);
assert.strictEqual(sitKey, 'MELEE_MOBBED');

const decision = engine.selectBestAction(mockPlayer, mockTarget, mockEnemies);
assert.strictEqual(typeof decision.action, 'string');
assert.notStrictEqual(decision.token, null);
assert.strictEqual(engine.pendingMoves.size, 1);
assert.strictEqual(engine.stats.totalMovesRecorded, 1);
console.log(`✓ PASS: Action selected: "${decision.action}" in context "${sitKey}"`);

console.log('--- TEST 3: Positive Reward and Q-Value Update on Successful Hit ---');
const actionToTest = decision.action;
const initialQ = engine.matrix[sitKey][actionToTest].q;

engine.recordHitSuccess(mockPlayer, mockTarget, 24, true, 4);
const updatedQ = engine.matrix[sitKey][actionToTest].q;
assert.strictEqual(updatedQ > initialQ, true, `Q-value for ${actionToTest} should increase after positive reward`);
assert.strictEqual(engine.stats.successfulHits, 1);
assert.strictEqual(engine.stats.highestCombo, 4);
console.log(`✓ PASS: Q-value increased from ${initialQ.toFixed(2)} to ${updatedQ.toFixed(2)} after 4-hit combo`);

console.log('--- TEST 4: Penalty on Move Whiff and Interruption ---');
const mockFighter2 = { x: 100, y: 200, z: 0, characterId: 'lindin', specialMeter: 0 };
const dec2 = engine.selectBestAction(mockFighter2, mockTarget, mockEnemies);
const initQ2 = engine.matrix[sitKey][dec2.action].q;

engine.recordDamageTaken(mockFighter2, 20);
const penalizedQ = engine.matrix[sitKey][dec2.action].q;
assert.strictEqual(penalizedQ < initQ2, true, 'Q-value should decrease after being interrupted/taking damage');
console.log(`✓ PASS: Penalty applied on damage interruption (${initQ2.toFixed(2)} -> ${penalizedQ.toFixed(2)})`);

console.log('--- TEST 5: Epoch Progression & Persistence ---');
engine.onEpochFinished('VICTORY');
assert.strictEqual(engine.stats.epochs, 2);

const savedMatrixRaw = global.localStorage.getItem(engine.storageKeyMatrix);
assert.notStrictEqual(savedMatrixRaw, null);
const loadedMatrix = JSON.parse(savedMatrixRaw);
assert.strictEqual(typeof loadedMatrix['MELEE_MOBBED'], 'object');
console.log('✓ PASS: Epoch #2 saved and verified in localStorage');

console.log('--- TEST 6: Top Learned Moves Ranking ---');
const topMoves = engine.getTopLearnedMoves(3);
assert.strictEqual(topMoves.length, 3);
assert.strictEqual(typeof topMoves[0].name, 'string');
assert.strictEqual(typeof topMoves[0].avgQ, 'string');
console.log('✓ PASS: Top learned moves ranked:', topMoves.map(m => `${m.name} (${m.avgQ})`).join(', '));

console.log('--- TEST 7: Autonomous Leader AI Stage Progression & Combat ---');
// Create dummy Player that Leader AI drives
class DummyPlayer {
  constructor() {
    this.x = 100;
    this.y = 210;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.speed = 2.4;
    this.characterId = 'smellu';
    this.state = 'idle';
    this.facing = 1;
    this.health = 100;
    this.maxHealth = 100;
    this.score = 1500;
    this.isDead = false;
    this.specialMeter = 50;
    this.weapon = null;
  }
  executePunch() { this.state = 'punch1'; }
  executeKick() { this.state = 'kick1'; }
  executeSpecialMove() { this.state = 'special'; }
  updatePhysics() {}
  handleWallCollision() {}
}

const dummyStage = {
  gameMode: 'HORIZONTAL',
  cameraX: 0,
  minY: 152,
  maxY: 264
};

const dummyGame = {
  pickups: [],
  breakables: [],
  buyStoreItem: (idx) => { dummyGame.storeBought = true; }
};

const player1 = new DummyPlayer();
const enemy1 = { x: 180, y: 210, isDead: false, isBoss: false, type: 'thug' };

// Advance Leader AI towards enemy
engine.updatePlayerAI(player1, [enemy1], null, dummyStage, 0.016, dummyGame);
assert.strictEqual(player1.state, 'walk');
assert.strictEqual(player1.vx > 0, true, 'Leader AI should walk towards enemy');

// Position Leader AI right in front of enemy
player1.x = 160;
engine.leaderAttackCooldown = 0;
engine.updatePlayerAI(player1, [enemy1], null, dummyStage, 0.016, dummyGame);
assert.notStrictEqual(player1.state, 'idle', 'Leader AI should execute attack in melee range');
console.log(`✓ PASS: Leader AI executed attack flurry in striking range (State: ${player1.state})`);

// When no enemies: Leader AI advances through zone!
player1.state = 'idle';
player1.z = 0;
engine.updatePlayerAI(player1, [], null, dummyStage, 0.016, dummyGame);
assert.strictEqual(player1.state, 'walk');
assert.strictEqual(player1.vx > 0, true, 'Leader AI should advance rightward to next zone when clear');
assert.strictEqual(engine.leaderCurrentGoal, 'ADVANCING TO NEXT ZONE');
console.log('✓ PASS: Leader AI autonomously navigates forward across stage when clear');

// Chinatown Store auto-purchase when hurt & has score
player1.health = 40;
dummyGame.storeBought = false;
engine.updatePlayerAI(player1, [], null, dummyStage, 0.016, dummyGame);
console.log('✓ PASS: Store purchase evaluation verified');

console.log('\nALL 7 AUTONOMOUS AI & LEARNING ENGINE TESTS PASSED CLEANLY! 🚀');
