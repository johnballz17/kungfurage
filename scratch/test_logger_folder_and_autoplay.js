const assert = require('assert');

// Mock localStorage
const storage = {};
global.localStorage = {
  getItem: (key) => (key in storage ? storage[key] : null),
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

// Mock Blob
global.Blob = class {
  constructor(parts, opts) {
    this.parts = parts;
    this.opts = opts;
  }
};

// Mock document and window
global.window = {
  soundEngine: {
    resume: () => {},
    playPickup: () => {},
    playSwing: () => {},
    startBGM: () => {},
    stopBGM: () => {},
    playKnockdown: () => {},
    playSpecial: () => {},
    playStageClear: () => {}
  },
  combatSystem: {
    screenShakeEnabled: false,
    screenFlashEnabled: false,
    spawnComboText: () => {}
  }
};

const { GameLogger } = require('../src/logger.js');
const { AILearningEngine } = require('../src/learning.js');

console.log('=== TEST SUITE: LOG FOLDER & AUTONOMOUS AI PROGRESSION ===');

// --- 1. Real-time stats logging & damage tracking ---
console.log('\n--- TEST 1: Logger Hit & Damage Tracking ---');
const logger = new GameLogger();
logger.startSession({ characterId: 'smellu', gameMode: 'HORIZONTAL', difficulty: 'NORMAL', companionEnabled: true });

logger.log('PLAYER', 'Player hit punk_knife for 14 dmg (Knockdown=false)');
logger.log('COMPANION', 'AI Companion hit club_giant for 22 dmg (Knockdown=true)');
logger.log('ENEMY', 'club_giant hit Player for 32 dmg (Knockdown=true)');
logger.log('COMBAT', 'Combo x8!');
logger.log('ENEMY', 'club_giant Defeated! (+500 pts)');
logger.log('STAGE', 'Entering Stage 2: Pagoda Sky Blitz');

assert.strictEqual(logger.sessionStats.playerHitsLanded, 1, 'Player hits landed should be 1');
assert.strictEqual(logger.sessionStats.companionHitsLanded, 1, 'Companion hits landed should be 1');
assert.strictEqual(logger.sessionStats.enemiesSlain, 1, 'Enemies slain should be 1');
assert.strictEqual(logger.sessionStats.damageDealt, 36, 'Damage dealt should be 14 + 22 = 36');
assert.strictEqual(logger.sessionStats.damageTaken, 32, 'Damage taken should be 32');
assert.strictEqual(logger.sessionStats.highestCombo, 8, 'Highest combo should be 8');
assert.strictEqual(logger.sessionStats.stageReached, 2, 'Stage reached should be 2');
console.log('✓ PASS: All combat stats, damage values, and stage progression tracked accurately!');

// --- 2. Multi-Session Log Folder Persistence ---
console.log('\n--- TEST 2: Multi-Session Folder Archive Persistence ---');
// Session 1: Victory
logger.saveSession('VICTORY', 8500);

// Session 2: Another match
const logger2 = new GameLogger();
logger2.startSession({ characterId: 'lindin', gameMode: 'VERTICAL', difficulty: 'HARD', companionEnabled: true });
logger2.log('PLAYER', 'Player hit ninja for 18 dmg (Knockdown=false)');
logger2.log('ENEMY', 'ninja Defeated! (+200 pts)');
logger2.saveSession('GAMEOVER', 3400);

const folderIndex = logger2.getLogFolderIndex();
assert.strictEqual(folderIndex.length, 2, 'Should have 2 individual sessions in the folder archive');
assert.strictEqual(folderIndex[0].reason, 'GAMEOVER', 'Newest session should be first in index');
assert.strictEqual(folderIndex[1].reason, 'VICTORY', 'Previous session should be preserved in index');

// Inspect session retrieval
const session1Id = folderIndex[1].id;
const session1 = logger2.getSessionById(session1Id);
assert.notStrictEqual(session1, null, 'Should be able to retrieve Session 1 by its individual ID');
assert.strictEqual(session1.reason, 'VICTORY', 'Session 1 reason should be VICTORY');
assert.strictEqual(session1.finalScore, 8500, 'Session 1 score should match 8500');

// Test text formatting of archived session
const txtReport = logger2.getFormattedTextLog(session1);
assert.strictEqual(txtReport.includes('Final Score: 8500'), true, 'Formatted TXT should contain session score');
assert.strictEqual(txtReport.includes('SAVED GAME LOG'), true, 'Formatted TXT should indicate saved log');

console.log('✓ PASS: Multi-session folder archive stores, indexes, and retrieves individual games correctly!');

// --- 3. Individual Session Deletion ---
console.log('\n--- TEST 3: Individual Session Deletion from Archive ---');
const toDeleteId = folderIndex[0].id;
logger2.deleteSessionById(toDeleteId);

const updatedIndex = logger2.getLogFolderIndex();
assert.strictEqual(updatedIndex.length, 1, 'Index length should be reduced to 1 after deleting one session');
assert.strictEqual(updatedIndex[0].id, session1Id, 'Remaining session should be Session 1');
assert.strictEqual(logger2.getSessionById(toDeleteId), null, 'Deleted session key should be purged from storage');

console.log('✓ PASS: Individual session deleted cleanly without affecting other saved logs!');

// --- 4. AI Chinatown Store Purchasing & Healing ---
console.log('\n--- TEST 4: Smart Chinatown Store Purchasing & Emergency Pizza Heals ---');
const aiEngine = new AILearningEngine();

// Mock game with store items
const mockGame = {
  storeItems: [
    { name: 'Dual Pistols', type: 'weapon', cost: 1500 },
    { name: 'Nunchaku', type: 'weapon', cost: 1200 },
    { name: 'Dragon Daggers', type: 'weapon', cost: 1000 },
    { name: 'Lead Pipe', type: 'weapon', cost: 600 },
    { name: 'Pizza Slice (+50 HP)', type: 'heal', cost: 800 },
    { name: 'Dragon Scroll (Full Ki)', type: 'scroll', cost: 2000 }
  ],
  purchasedItems: [],
  buyStoreItem(idx) {
    this.purchasedItems.push(this.storeItems[idx]);
  }
};

// Player with 40 HP and 1600 score (can afford Pizza)
const mockPlayer = {
  health: 40,
  maxHealth: 100,
  score: 1600,
  x: 100,
  y: 210,
  z: 0,
  speed: 3.5,
  state: 'idle',
  facing: 1,
  specialMeter: 10,
  dodgeCooldown: 0,
  weapon: null,
  weaponDurability: 0,
  executePunch: () => {},
  executeKick: () => {},
  executeSpecialMove: () => {}
};

const mockStage = {
  gameMode: 'HORIZONTAL',
  currentZoneIndex: 0,
  zones: [{ triggerX: 600 }],
  width: 16000
};

// Empty enemies list -> AI performs peaceful progression / supply pickup / store shopping
aiEngine.updatePlayerAI(mockPlayer, [], null, mockStage, 0.016, mockGame);

assert.strictEqual(mockGame.purchasedItems.length, 1, 'AI should have purchased 1 item from store');
assert.strictEqual(mockGame.purchasedItems[0].type, 'heal', 'AI must purchase HEAL (Pizza) when low on HP instead of pistols');
assert.strictEqual(mockGame.purchasedItems[0].name, 'Pizza Slice (+50 HP)', 'Purchased item should be Pizza');
assert.strictEqual(aiEngine.storeBuyCooldown > 0, true, 'Store buy cooldown should be set to prevent spam depletion');

console.log('✓ PASS: AI smart Chinatown store purchasing heals low HP with Pizza and honors cooldown!');

// --- 5. Emergency In-Combat Healing when Enemies Present ---
console.log('\n--- TEST 5: Emergency In-Combat Healing ---');
mockGame.purchasedItems = [];
aiEngine.storeBuyCooldown = 0; // reset cooldown
mockPlayer.health = 35; // critically low (< 45)
mockPlayer.score = 2500;

const mockEnemy = {
  x: 180,
  y: 210,
  z: 0,
  health: 50,
  isDead: false,
  type: 'club_giant'
};

aiEngine.updatePlayerAI(mockPlayer, [mockEnemy], null, mockStage, 0.016, mockGame);

assert.strictEqual(mockGame.purchasedItems.length, 1, 'AI should execute emergency heal during combat');
assert.strictEqual(mockGame.purchasedItems[0].type, 'heal', 'Emergency purchase should be Pizza');
console.log('✓ PASS: AI triggers emergency Pizza heals during intense combat when HP < 45!');

console.log('\n=========================================');
console.log('★ ALL LOGGER & AUTO-PLAY AI PROGRESSION TESTS PASSED! ★');
console.log('=========================================');
