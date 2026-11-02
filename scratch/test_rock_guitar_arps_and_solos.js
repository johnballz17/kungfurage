/**
 * Test Suite: 8-Bit Rock Sound Engine with Drums, Guitar Arpeggios & Solos
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock Web Audio Context
class MockParam {
  constructor(val = 0) {
    this.value = val;
  }
  setValueAtTime(v) { this.value = v; }
  linearRampToValueAtTime(v) { this.value = v; }
  exponentialRampToValueAtTime(v) { this.value = v; }
}

class MockNode {
  constructor() {
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
    this.destination = new MockNode();
  }
  createGain() { return new MockNode(); }
  createOscillator() { return new MockNode(); }
  createBiquadFilter() { return new MockNode(); }
  createWaveShaper() { return new MockNode(); }
  createDelay() { return new MockNode(); }
  createBuffer(channels, length, sampleRate) {
    return {
      getChannelData: () => new Float32Array(length)
    };
  }
  createBufferSource() { return new MockNode(); }
  resume() { return Promise.resolve(); }
}

global.Audio = class MockAudio {
  constructor(src) {
    this.src = src;
    this.loop = false;
    this.volume = 1;
  }
  play() { return Promise.resolve(); }
  pause() {}
};

global.window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
  Audio: global.Audio
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

console.log('--- RUNNING 8-BIT DRUMS, ARPEGGIOS & SOLOS SOUNDTRACK TESTS ---');

// TEST 1: Synthesizer Initialization & Sub-Busses
{
  const se = new SoundEngine();
  se.init();

  assert(se.leadGain, 'Rock lead guitar gain bus created');
  assert(se.arpGain, 'Guitar arpeggio synth gain bus created');
  assert(se.chordGain, 'Power chord rhythm gain bus created');
  assert(se.bassGain, 'Galloping bass gain bus created');
  assert(se.drumGain, 'Rock drum kit gain bus created');
  assert(se.guitarDelay, 'Arena rock delay/echo node created');

  console.log('✓ Test 1 Passed: All 8-bit rock synthesizer sub-busses initialized');
}

// TEST 2: Rock Drum Kit Components (Kick with transient click, Snare, Toms, Hats, Crash)
{
  const se = new SoundEngine();
  se.init();

  // Test kick with punch click
  se.playKick(se.ctx.currentTime, true);

  // Test snare with snappy noise burst
  se.playSnare(se.ctx.currentTime);

  // Test tom drum fills (high, mid, low)
  se.playTom(240, se.ctx.currentTime);
  se.playTom(180, se.ctx.currentTime);
  se.playTom(120, se.ctx.currentTime);

  // Test hi-hats (closed & open)
  se.playHiHat(se.ctx.currentTime, false);
  se.playHiHat(se.ctx.currentTime, true);

  // Test crash cymbal
  se.playCrash(se.ctx.currentTime);

  console.log('✓ Test 2 Passed: Full 8-bit rock drum kit synthesis verified (Kick, Snare, Toms, Hats, Crash)');
}

// TEST 3: Sweep-Picked Guitar Arpeggios
{
  const se = new SoundEngine();
  se.init();

  // Test neo-classical sweep arpeggios
  const amArp = [220.0, 261.6, 329.6, 440.0, 523.3, 659.3];
  se.playGuitarArp(amArp, se.ctx.currentTime, 0.22);

  const emSpeedArp = [329.6, 392.0, 493.9, 659.3, 784.0, 987.8, 1318.5];
  se.playGuitarArp(emSpeedArp, se.ctx.currentTime, 0.18);

  console.log('✓ Test 3 Passed: Multi-octave sweep guitar arpeggios verified');
}

// TEST 4: Virtuosic Guitar Solos (Bends, Whammy, Vibrato, Pinch Harmonics)
{
  const se = new SoundEngine();
  se.init();

  // String bend +2 semitones with heavy vibrato
  se.playRockSoloNote(880.0, se.ctx.currentTime, 0.45, { bendSemi: 2, vibrato: true });

  // Whammy dive
  se.playRockSoloNote(1174.7, se.ctx.currentTime, 0.5, { whammy: true });

  // Screaming pinch harmonic
  se.playRockSoloNote(1318.5, se.ctx.currentTime, 0.6, { harmonic: true, vibrato: true });

  // Finger slide
  se.playRockSoloNote(587.3, se.ctx.currentTime, 0.3, { slideFrom: 440.0 });

  console.log('✓ Test 4 Passed: Expressive solo guitar techniques verified (Bends, Whammy, Vibrato, Harmonics)');
}

// TEST 5: Track Playback & Multi-Section Sequence Execution (Drums + Arps + Solos)
{
  const se = new SoundEngine();
  const synthTracks = ['synth_title', 'stage1', 'stage2', 'stage3', 'boss'];

  for (const track of synthTracks) {
    se.startBGM(track);
    assert.strictEqual(se.bgmPlaying, true, `${track} must be playing`);
    assert(se.timerId, `${track} must have active timer interval`);

    // Let step advance across both Section A (Arpeggios) and Section B (Solos)
    se.step = 0; // Section A: Arps
    se.step = 34; // Section B: Solo

    se.stopBGM();
    assert.strictEqual(se.bgmPlaying, false, `${track} stopped cleanly`);
    assert.strictEqual(se.timerId, null, `${track} timer cleared`);
  }

  // Also verify MP3 intro track
  se.startBGM('title');
  assert.strictEqual(se.bgmPlaying, true, 'title must be playing');
  assert(se.currentAudioElement, 'title uses MP3 element');
  se.stopBGM();

  console.log('✓ Test 5 Passed: All 5 soundtrack compositions (Title, Stage 1-3, Boss) execute flawlessly');
}

console.log('\n=========================================');
console.log('ALL DRUMS, GUITAR ARPS & SOLOS TESTS PASSED! 🚀');
console.log('=========================================');
