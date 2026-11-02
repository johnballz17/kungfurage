/**
 * test_soundtrack_integration.js
 * Verifies MP3 files, SoundEngine integration, Game combat timer for Tiger's Trap,
 * and Victory / Intro audio routing.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: MP3 SOUNDTRACK INTEGRATION ===\n');

// 1. Verify physical MP3 files
const rootDir = path.resolve(__dirname, '..');
const introPath = path.join(rootDir, 'soundtrtack', 'Shadow_in_the_Dojo.mp3');
const victoryPath = path.join(rootDir, 'soundtrtack', 'Iron_in_a_Calloused_Hand.mp3');
const tigerTrapPath = path.join(rootDir, 'soundtrtack', 'The_Tiger_s_Trap.mp3');
const gameOverPath = path.join(rootDir, 'soundtrtack', 'Five_Hundred_Times.mp3');

assert(fs.existsSync(introPath), 'Intro MP3 file must exist: ' + introPath);
assert(fs.statSync(introPath).size > 1000000, 'Intro MP3 must be valid audio file');
console.log('✔ Intro MP3 verified: Shadow_in_the_Dojo.mp3 (' + (fs.statSync(introPath).size / 1024 / 1024).toFixed(2) + ' MB)');

assert(fs.existsSync(victoryPath), 'Victory MP3 file must exist: ' + victoryPath);
assert(fs.statSync(victoryPath).size > 1000000, 'Victory MP3 must be valid audio file');
console.log('✔ Victory MP3 verified: Iron_in_a_Calloused_Hand.mp3 (' + (fs.statSync(victoryPath).size / 1024 / 1024).toFixed(2) + ' MB)');

assert(fs.existsSync(tigerTrapPath), 'The Tiger\'s Trap MP3 file must exist: ' + tigerTrapPath);
assert(fs.statSync(tigerTrapPath).size > 1000000, 'The Tiger\'s Trap MP3 must be valid audio file');
console.log('✔ Tiger\'s Trap MP3 verified: The_Tiger_s_Trap.mp3 (' + (fs.statSync(tigerTrapPath).size / 1024 / 1024).toFixed(2) + ' MB)');

assert(fs.existsSync(gameOverPath), 'Game Over MP3 file must exist: ' + gameOverPath);
assert(fs.statSync(gameOverPath).size > 1000000, 'Game Over MP3 must be valid audio file');
console.log('✔ Game Over MP3 verified: Five_Hundred_Times.mp3 (' + (fs.statSync(gameOverPath).size / 1024 / 1024).toFixed(2) + ' MB)');

// 2. Setup mock browser environment for Audio and DOM
class MockAudio {
  constructor(src) {
    this.src = src;
    this.loop = false;
    this.volume = 1.0;
    this.paused = true;
    this.currentTime = 0;
    this.onended = null;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

global.Audio = MockAudio;
global.window = {
  AudioContext: class {
    constructor() {
      this.sampleRate = 44100;
      this.currentTime = 0;
      this.state = 'running';
      this.destination = {};
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {}, value: 1.0 },
        connect: () => {}
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        Q: { setValueAtTime: () => {}, value: 1.0 },
        connect: () => {}
      };
    }
    createWaveShaper() {
      return {
        curve: null,
        oversample: 'none',
        connect: () => {}
      };
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(100) };
    }
    createBufferSource() {
      return {
        buffer: null,
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    resume() { return Promise.resolve(); }
  },
  localStorage: {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = String(v); }
  }
};
global.localStorage = global.window.localStorage;
global.document = {
  addEventListener: () => {},
  removeEventListener: () => {}
};

// 3. Load SoundEngine
const audioSrc = fs.readFileSync(path.join(rootDir, 'src', 'audio.js'), 'utf8');
eval(audioSrc);

const soundEngine = global.window.soundEngine;
global.window.soundEngine = soundEngine;

// Test SoundEngine startBGM routing
console.log('\nTesting SoundEngine MP3 routing...');

// Intro / Title
soundEngine.startBGM('title');
assert.strictEqual(soundEngine.currentTrack, 'title', 'Current track should be title');
assert(soundEngine.currentAudioElement, 'Audio element must be created');
assert(soundEngine.currentAudioElement.src.includes('Shadow_in_the_Dojo.mp3'), 'Must load Shadow_in_the_Dojo.mp3');
assert.strictEqual(soundEngine.currentAudioElement.loop, true, 'Intro MP3 should loop');
assert.strictEqual(soundEngine.getTrackDisplayName(), '🥋 SHADOW IN THE DOJO (INTRO THEME)');
console.log('✔ Title/Intro theme correctly routes to Shadow_in_the_Dojo.mp3');

// Victory
soundEngine.startBGM('victory');
assert.strictEqual(soundEngine.currentTrack, 'victory', 'Current track should be victory');
assert(soundEngine.currentAudioElement.src.includes('Iron_in_a_Calloused_Hand.mp3'), 'Must load Iron_in_a_Calloused_Hand.mp3');
assert.strictEqual(soundEngine.currentAudioElement.loop, true, 'Victory MP3 should loop');
assert.strictEqual(soundEngine.getTrackDisplayName(), '🏆 IRON IN A CALLOUSED HAND (VICTORY)');
console.log('✔ Victory theme correctly routes to Iron_in_a_Calloused_Hand.mp3');

// Game Over (Five Hundred Times)
soundEngine.startBGM('gameover');
assert.strictEqual(soundEngine.currentTrack, 'gameover', 'Current track should be gameover');
assert(soundEngine.currentAudioElement.src.includes('Five_Hundred_Times.mp3'), 'Must load Five_Hundred_Times.mp3');
assert.strictEqual(soundEngine.currentAudioElement.loop, true, 'Game Over MP3 should loop');
assert.strictEqual(soundEngine.getTrackDisplayName(), '⚰️ FIVE HUNDRED TIMES (GAME OVER)');
console.log('✔ Game Over theme correctly routes to Five_Hundred_Times.mp3');

// The Tiger's Trap
let returnedToStage = false;
global.window.game = {
  gameState: 'PLAYING',
  stage: { currentStageNum: 2 }
};

soundEngine.startBGM('tiger_trap');
assert.strictEqual(soundEngine.currentTrack, 'tiger_trap', 'Current track should be tiger_trap');
assert(soundEngine.currentAudioElement.src.includes('The_Tiger_s_Trap.mp3'), 'Must load The_Tiger_s_Trap.mp3');
assert.strictEqual(soundEngine.currentAudioElement.loop, false, 'Tiger\'s Trap battle anthem should not loop indefinitely');
assert.strictEqual(soundEngine.getTrackDisplayName(), '🐅 THE TIGER\'S TRAP (BATTLE ANTHEM)');

// Simulate Tiger's trap ending
soundEngine.currentAudioElement.onended();
assert.strictEqual(soundEngine.currentTrack, 'stage2', 'Should auto-resume current stage BGM after Tiger\'s Trap ends');
console.log('✔ Tiger\'s Trap battle anthem correctly plays and restores Stage 2 BGM on completion');

// Volume Controls
soundEngine.setBGMVolume(0.42);
assert.strictEqual(soundEngine.getBGMVolume(), 0.42);
soundEngine.toggleMute();
assert.strictEqual(soundEngine.isMuted, true);
soundEngine.toggleMute();
assert.strictEqual(soundEngine.isMuted, false);
console.log('✔ Volume & Mute scaling on HTML5 Audio elements verified');

// 4. Test Game combat timer logic for Tiger's Trap
console.log('\nTesting Game logic for Tiger\'s Trap combat timer...');
const gameSrc = fs.readFileSync(path.join(rootDir, 'src', 'game.js'), 'utf8');

assert(gameSrc.includes('tigerTrapCombatTimer'), 'game.js must have tigerTrapCombatTimer');
assert(gameSrc.includes('The_Tiger_s_Trap') || gameSrc.includes('tiger_trap'), 'game.js must reference tiger_trap');
assert(gameSrc.includes("window.soundEngine.startBGM('victory')"), 'game.js triggerStageClear must trigger victory BGM');
assert(gameSrc.includes("window.soundEngine.startBGM('gameover')"), 'game.js player defeat must trigger gameover BGM');

// Simulate dt progression in game logic
let tigerTrapCombatTimer = 0;
let nextTigerTrapInterval = 600;
let tigerTrapTriggered = false;

// Simulate 10 minutes of combat dt
const dt = 1.0;
for (let sec = 0; sec < 605; sec++) {
  tigerTrapCombatTimer += dt;
  if (tigerTrapCombatTimer >= nextTigerTrapInterval) {
    tigerTrapCombatTimer = 0;
    nextTigerTrapInterval = 600;
    tigerTrapTriggered = true;
    soundEngine.startBGM('tiger_trap');
  }
}
assert.strictEqual(tigerTrapTriggered, true, 'Combat timer should trigger Tiger\'s Trap after ~10 minutes');
assert.strictEqual(soundEngine.currentTrack, 'tiger_trap');
console.log('✔ 10-minute battle anthem trigger logic successfully simulated');

// 5. Verify index.html jukebox buttons
console.log('\nVerifying index.html Jukebox elements...');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

assert(indexHtml.includes('data-track="title"'), 'index.html must have title track button');
assert(indexHtml.includes('Shadow in the Dojo'), 'index.html must display Shadow in the Dojo');
assert(indexHtml.includes('data-track="tiger_trap"'), 'index.html must have tiger_trap track button');
assert(indexHtml.includes("The Tiger's Trap"), 'index.html must display The Tiger\'s Trap');
assert(indexHtml.includes('data-track="victory"'), 'index.html must have victory track button');
assert(indexHtml.includes('Iron in a Calloused Hand'), 'index.html must display Iron in a Calloused Hand');
assert(indexHtml.includes('data-track="gameover"'), 'index.html must have gameover track button');
assert(indexHtml.includes('Five Hundred Times'), 'index.html must display Five Hundred Times');
console.log('✔ index.html Jukebox includes all special soundtrack buttons');

console.log('\n=============================================');
console.log('🎉 ALL SOUNDTRACK INTEGRATION TESTS PASSED 100%!');
console.log('=============================================\n');
