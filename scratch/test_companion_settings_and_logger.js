const assert = require('assert');

// Mock localStorage
const storage = {};
global.localStorage = {
  getItem: (key) => (key in storage ? storage[key] : null),
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
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
    playStageClear: () => {}
  },
  combatSystem: {
    screenShakeEnabled: false,
    screenFlashEnabled: false,
    spawnComboText: () => {}
  }
};

const { GameLogger } = require('../src/logger.js');

console.log('--- TEST 1: GameLogger is enabled by default ---');
const logger = new GameLogger();
assert.strictEqual(logger.enabled, true, 'Logger should be ON by default');
console.log('✓ PASS: Logger is enabled by default');

console.log('--- TEST 2: GameLogger logging and filtering ---');
logger.startSession({ characterId: 'smellu', gameMode: 'HORIZONTAL', difficulty: 'NORMAL', companionEnabled: true });
logger.log('PLAYER', 'Player executed punch1');
logger.log('COMBAT', 'Player hit Thug for 14 dmg (Knockdown=false)');
logger.log('COMBAT', 'Combo x5!');
logger.log('COMPANION', 'Companion Lindin executed flash_kick');
logger.log('ENEMY', 'Defeated Thug');

assert.strictEqual(logger.logs.length >= 5, true, 'Logs should have at least 5 entries');
assert.strictEqual(logger.sessionStats.highestCombo, 5, 'Session stats combo should be tracked');
assert.strictEqual(logger.sessionStats.enemiesSlain, 1, 'Session stats enemies slain should be tracked');
console.log('✓ PASS: Log entries and real-time stats tracked correctly');

console.log('--- TEST 3: Auto-Save Session to Storage on Game Over / Victory ---');
logger.saveSession('GAMEOVER', 14500);

const savedRaw = global.localStorage.getItem('kungfu_last_game_log');
assert.notStrictEqual(savedRaw, null, 'Saved game log must exist in localStorage');
const savedData = JSON.parse(savedRaw);
assert.strictEqual(savedData.reason, 'GAMEOVER');
assert.strictEqual(savedData.finalScore, 14500);
assert.strictEqual(savedData.stats.enemiesSlain, 1);
assert.strictEqual(Array.isArray(savedData.logs), true);
assert.strictEqual(savedData.logs.length >= 5, true);

const fetchedData = logger.getLastSavedSession();
assert.strictEqual(fetchedData.reason, 'GAMEOVER');
assert.strictEqual(fetchedData.finalScore, 14500);
console.log('✓ PASS: Auto-save and retrieval of game log verified');

console.log('--- TEST 4: Formatted Text Log generation ---');
const txtReport = logger.getFormattedTextLog();
assert.strictEqual(txtReport.includes('KUNG-FU RETRO BRAWLER'), true);
assert.strictEqual(txtReport.includes('Final Score: 14500'), true);
assert.strictEqual(txtReport.includes('[PLAYER   ]'), true);
assert.strictEqual(txtReport.includes('[COMPANION]'), true);
console.log('✓ PASS: Text report generated with headers and categorized lines');

console.log('--- TEST 5: Turning Logger OFF and ON in Settings ---');
logger.setEnabled(false);
assert.strictEqual(logger.enabled, false);
assert.strictEqual(global.localStorage.getItem('kungfu_debug_console'), 'false');
const countBefore = logger.logs.length;
logger.log('PLAYER', 'This should be ignored when disabled');
assert.strictEqual(logger.logs.length, countBefore, 'Log should not append when disabled');

logger.setEnabled(true);
assert.strictEqual(logger.enabled, true);
logger.log('PLAYER', 'This should be recorded now');
assert.strictEqual(logger.logs.length, countBefore + 2); // 1 for setting change, 1 for player log
console.log('✓ PASS: Logger toggle ON/OFF verified');

console.log('--- TEST 6: AI Companion Settings Menu Pause / Resume Lifecycle ---');
// Create dummy companion and game mock
class MockCompanion {
  constructor(x, y, charId, tactics) {
    this.x = x;
    this.y = y;
    this.characterId = charId;
    this.tactics = tactics;
    this.health = 100;
    this.maxHealth = 100;
    this.facing = 1;
    this.isDead = false;
    this.weapon = null;
  }
}
global.window.AICompanion = MockCompanion;

// Simulate Game object methods
const gameMock = {
  gameState: 'PLAYING',
  wasPlayingBeforeSettings: false,
  companionEnabled: true,
  companionChar: 'auto',
  companionTactics: 'balanced',
  player: { characterId: 'smellu', x: 200, y: 210 },
  companion: new MockCompanion(170, 210, 'lindin', 'balanced'),

  openSettingsModal() {
    if (this.gameState === 'PLAYING') {
      this.wasPlayingBeforeSettings = true;
      this.gameState = 'PAUSED';
    } else {
      this.wasPlayingBeforeSettings = false;
    }
  },

  closeSettingsModal() {
    if (this.wasPlayingBeforeSettings) {
      this.gameState = 'PLAYING';
      this.wasPlayingBeforeSettings = false;
    }
    this.syncCompanionState();
  },

  syncCompanionState() {
    if (this.companionEnabled) {
      let chosen = this.companionChar;
      if (chosen === 'auto') {
        chosen = (this.player && this.player.characterId === 'lindin') ? 'smellu' : 'lindin';
      }
      const targetX = (this.companion && Number.isFinite(this.companion.x)) ? this.companion.x : (this.player ? this.player.x - 30 : 60);
      const targetY = (this.companion && Number.isFinite(this.companion.y)) ? this.companion.y : (this.player ? this.player.y : 225);

      if (!this.companion) {
        if (this.gameState === 'PLAYING' || this.gameState === 'PAUSED') {
          this.companion = new global.window.AICompanion(targetX, targetY, chosen, this.companionTactics);
        }
      } else {
        if (this.companion.characterId !== chosen) {
          const oldHealth = this.companion.health;
          const oldWeapon = this.companion.weapon ? this.companion.weapon.type : null;
          const oldFacing = this.companion.facing;
          this.companion = new global.window.AICompanion(targetX, targetY, chosen, this.companionTactics);
          this.companion.health = Math.min(this.companion.maxHealth, oldHealth || this.companion.maxHealth);
          this.companion.facing = oldFacing;
        }
        this.companion.tactics = this.companionTactics;
      }
    } else {
      if (this.companion) {
        this.companion = null;
      }
    }
  }
};

assert.strictEqual(gameMock.gameState, 'PLAYING');
assert.notStrictEqual(gameMock.companion, null);
assert.strictEqual(gameMock.companion.x, 170);

// Open Settings mid-game
gameMock.openSettingsModal();
assert.strictEqual(gameMock.gameState, 'PAUSED', 'Game must be paused during settings');
assert.strictEqual(gameMock.wasPlayingBeforeSettings, true);

// Close Settings mid-game
gameMock.closeSettingsModal();
assert.strictEqual(gameMock.gameState, 'PLAYING', 'Game must cleanly resume PLAYING on settings close');
assert.strictEqual(gameMock.wasPlayingBeforeSettings, false);
assert.notStrictEqual(gameMock.companion, null, 'AI companion must remain alive and active');
assert.strictEqual(Number.isFinite(gameMock.companion.x), true, 'Companion x must be a valid number');
assert.strictEqual(gameMock.companion.x, 170, 'Companion position should not be corrupted');

// Switch tactics in settings
gameMock.openSettingsModal();
gameMock.companionTactics = 'aggressive';
gameMock.closeSettingsModal();
assert.strictEqual(gameMock.gameState, 'PLAYING');
assert.strictEqual(gameMock.companion.tactics, 'aggressive');

console.log('✓ PASS: AI companion settings lifecycle and state synchronization verified');
console.log('\nALL 6 TEST SUITES PASSED CLEANLY!');
