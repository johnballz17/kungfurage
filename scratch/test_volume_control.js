// Volume Control Unit & Integration Test
const assert = require('assert');

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: (key) => store[key] !== undefined ? store[key] : null,
    setItem: (key, val) => { store[key] = val.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
global.localStorage = localStorageMock;

// Mock Web Audio API
class AudioNodeMock {
  constructor() {
    this.gain = {
      value: 1,
      setValueAtTime: (val) => { this.gain.value = val; },
      linearRampToValueAtTime: () => {}
    };
    this.frequency = { setValueAtTime: () => {} };
    this.Q = { setValueAtTime: () => {} };
  }
  connect() {}
  disconnect() {}
}

class AudioContextMock {
  constructor() {
    this.currentTime = 0;
    this.destination = new AudioNodeMock();
    this.state = 'running';
  }
  createGain() { return new AudioNodeMock(); }
  createBiquadFilter() { return new AudioNodeMock(); }
  createWaveShaper() { return { curve: null, oversample: 'none', connect: () => {} }; }
  createDelay() { return Object.assign(new AudioNodeMock(), { delayTime: { setValueAtTime: () => {} } }); }
  resume() { this.state = 'running'; return Promise.resolve(); }
}
global.AudioContext = AudioContextMock;
global.window = { AudioContext: AudioContextMock };

// Mock HTML5 Audio
class HTMLAudioMock {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.loop = false;
  }
  play() { return Promise.resolve(); }
  pause() {}
}
global.Audio = HTMLAudioMock;

// Load SoundEngine
const fs = require('fs');
eval(fs.readFileSync('src/audio.js', 'utf8'));

const sound = window.soundEngine;
sound.init();

console.log('--- TEST 1: Default Master Volume & Init ---');
assert.strictEqual(sound.getMasterVolume(), 0.70, 'Default master volume should be 0.70');
assert.strictEqual(sound.isMuted, false, 'Default mute should be false');
console.log('✓ PASS: Master volume defaults to 70% and unmuted');

console.log('--- TEST 2: Set Master Volume Clamping & Storage ---');
sound.setMasterVolume(0.85);
assert.strictEqual(sound.getMasterVolume(), 0.85, 'Master volume should be 0.85');
assert.strictEqual(localStorage.getItem('kungfu_master_vol'), '0.85', 'Stored in localStorage');

sound.setMasterVolume(1.5);
assert.strictEqual(sound.getMasterVolume(), 1.0, 'Should clamp upper bound to 1.0');

sound.setMasterVolume(-0.2);
assert.strictEqual(sound.getMasterVolume(), 0.0, 'Should clamp lower bound to 0.0');
console.log('✓ PASS: Volume clamps cleanly [0.0, 1.0] and persists in localStorage');

console.log('--- TEST 3: Adjust Master Volume Delta (+/-) ---');
sound.setMasterVolume(0.60);
sound.adjustMasterVolume(0.05);
assert.strictEqual(sound.getMasterVolume(), 0.65, 'Should increment to 0.65');

sound.adjustMasterVolume(-0.10);
assert.strictEqual(sound.getMasterVolume(), 0.55, 'Should decrement to 0.55');
console.log('✓ PASS: Hotkey deltas increment and decrement correctly');

console.log('--- TEST 4: Mute / Unmute Behavior & Gain Scaling ---');
sound.setMasterVolume(0.80);
const muted = sound.toggleMute();
assert.strictEqual(muted, true, 'isMuted should be true');
assert.strictEqual(sound.masterGain.gain.value, 0, 'Master gain should be 0 when muted');

const unmuted = sound.toggleMute();
assert.strictEqual(unmuted, false, 'isMuted should be false');
assert.strictEqual(Math.round(sound.masterGain.gain.value * 100), Math.round(0.80 * 0.45 * 100), 'Master gain restored');
console.log('✓ PASS: Mute zeroes master gain and unmute restores active volume');

console.log('--- TEST 5: MP3 Soundtrack Volume Scaling ---');
sound.setMasterVolume(0.50);
sound.setBGMVolume(0.80);
sound.playMP3('intro');
assert(sound.currentAudioElement, 'Audio element exists');
assert.strictEqual(Math.round(sound.currentAudioElement.volume * 100), Math.round(0.50 * 0.80 * 100), 'MP3 volume scales proportionally with master * BGM');
console.log('✓ PASS: MP3 soundtrack volume correctly scales by (master * BGM)');

console.log('\nALL 5 VOLUME CONTROL TESTS PASSED CLEANLY! 🚀');
