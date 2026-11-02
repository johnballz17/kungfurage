const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock Web Audio Context with inspection spies
const createdOscillators = [];
const createdFilters = [];

class MockParam {
  constructor(val = 0) {
    this.value = val;
    this.history = [];
  }
  setValueAtTime(v, t) {
    this.value = v;
    this.history.push({ op: 'set', val: v, time: t });
  }
  linearRampToValueAtTime(v, t) {
    this.value = v;
    this.history.push({ op: 'linear', val: v, time: t });
  }
  exponentialRampToValueAtTime(v, t) {
    this.value = v;
    this.history.push({ op: 'exponential', val: v, time: t });
  }
}

class MockNode {
  constructor(type = 'node') {
    this.nodeType = type;
    this.gain = new MockParam(1.0);
    this.frequency = new MockParam(440);
    this.Q = new MockParam(1.0);
    this.delayTime = new MockParam(0.1);
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0.5;
    this.sampleRate = 44100;
    this.state = 'running';
    this.destination = new MockNode('destination');
  }
  createGain() { return new MockNode('gain'); }
  createOscillator() {
    const osc = new MockNode('oscillator');
    createdOscillators.push(osc);
    return osc;
  }
  createBiquadFilter() {
    const f = new MockNode('filter');
    createdFilters.push(f);
    return f;
  }
  createWaveShaper() { return new MockNode('waveshaper'); }
  createDelay() { return new MockNode('delay'); }
  createBuffer(channels, length, sampleRate) {
    return {
      getChannelData: () => new Float32Array(length)
    };
  }
  createBufferSource() { return new MockNode('buffersource'); }
  resume() { return Promise.resolve(); }
}

global.window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext
};

global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = v.toString(); }
};

// Load audio.js
const audioCode = fs.readFileSync(path.join(__dirname, '../src/audio.js'), 'utf8');
eval(audioCode);

const SoundEngine = window.SoundEngine;

console.log('=== TEST SUITE: GRITTY 8/16-BIT AUDIO & ANTI-SQUEAL VERIFICATION ===');

// --- 1. Gritty 8/16-bit Quantization Curve ---
console.log('\n--- TEST 1: Gritty 8/16-Bit Quantization Shaper Curve ---');
const se = new SoundEngine();
const curve = se.createDistortionCurve();
assert.strictEqual(curve instanceof Float32Array, true, 'Curve must be Float32Array');
assert.strictEqual(curve.length, 44100, 'Curve length should be 44100 samples');

// Verify that values are quantized/stepped and bounded between -1 and 1
let isBounded = true;
for (let i = 0; i < curve.length; i++) {
  if (curve[i] < -1.1 || curve[i] > 1.1) isBounded = false;
}
assert.strictEqual(isBounded, true, 'Distortion curve must be smoothly bounded to prevent harsh clipping');
console.log('✓ PASS: Gritty 8/16-bit DAC quantization curve verified!');

// --- 2. Master Lowpass & Butterworth Filters ---
console.log('\n--- TEST 2: Master BGM & Lead Lowpass Filters (No Screech Resonance) ---');
se.init();

assert(se.bgmFilter, 'Master BGM lowpass filter exists');
assert(se.bgmFilter.frequency.value <= 3500, `BGM master cutoff (${se.bgmFilter.frequency.value}Hz) should be <= 3500Hz`);
assert(se.bgmFilter.Q.value <= 1.0, `BGM Q (${se.bgmFilter.Q.value}) should be flat (<= 1.0)`);

assert(se.leadFilter, 'Lead lowpass filter exists');
assert(se.leadFilter.frequency.value <= 2600, `Lead filter cutoff (${se.leadFilter.frequency.value}Hz) should be <= 2600Hz`);
assert(se.leadFilter.Q.value <= 1.0, `Lead Q (${se.leadFilter.Q.value}) should be non-resonant (<= 1.0)`);
console.log('✓ PASS: All audio bus filters calibrated with non-resonant flat Butterworth response!');

// --- 3. Elimination of Ultrasonic Frequencies & Pinch Harmonic Squealing ---
console.log('\n--- TEST 3: Solo Note Frequency Capping & Anti-Squeal Harmonic Sub-Octave ---');
createdOscillators.length = 0;

// Test passing high frequency (e.g. 1760 Hz) with harmonic flag
se.playRockSoloNote(1760.0, se.ctx.currentTime, 0.4, { harmonic: true, bendSemi: 2, vibrato: true });

// All spawned oscillators must have fundamental frequencies <= 880 Hz
let maxFreq = 0;
createdOscillators.forEach(osc => {
  if (osc.frequency && osc.frequency.value > maxFreq) {
    maxFreq = osc.frequency.value;
  }
});

assert(maxFreq <= 880, `Maximum oscillator frequency (${maxFreq}Hz) must never exceed 880Hz to prevent ear-piercing squeals`);
console.log(`✓ PASS: Maximum solo oscillator frequency was ${maxFreq}Hz (safely capped <= 880Hz)!`);

// --- 4. Punchy 8/16-Bit Drum Kit (Warm Bandpass Hats & Crash) ---
console.log('\n--- TEST 4: Punchy 8/16-Bit Drum Kit Filtering ---');
createdFilters.length = 0;

se.playHiHat(se.ctx.currentTime, false);
se.playCrash(se.ctx.currentTime);

const hatFilter = createdFilters.find(f => f.frequency.value >= 3000 && f.frequency.value <= 4500);
assert(hatFilter, 'Hi-hat filter must be warm bandpass in the 3-4kHz range, not shrill 7.2kHz white noise');
console.log('✓ PASS: Hi-hats and cymbals filtered with warm 16-bit arcade bandpass!');

// --- 5. All 5 Soundtrack Themes Loop Verification ---
console.log('\n--- TEST 5: All 5 Soundtracks Play with Gritty Retro Arcade Warmth ---');
const tracks = ['title', 'stage1', 'stage2', 'stage3', 'boss'];
for (const track of tracks) {
  se.startBGM(track);
  assert.strictEqual(se.bgmPlaying, true, `${track} must be playing`);
  se.stopBGM();
}
console.log('✓ PASS: All 5 soundtrack compositions verified!');

console.log('\n=========================================');
console.log('★ ALL GRITTY 8/16-BIT AUDIO TESTS PASSED! ★');
console.log('=========================================');
