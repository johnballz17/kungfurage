/**
 * CARPE'S KUNG FU RAGE - RETRO CHIPTUNE SOUND ENGINE
 * Built using the Web Audio API (NES/Arcade 2A03 / YM2612 inspired synthesis).
 * Generates punchy sound effects and dynamic background music on the fly!
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.leadGain = null;
    this.chordGain = null;
    this.bassGain = null;
    this.drumGain = null;
    this.distortionNode = null;
    this.leadFilter = null;
    this.bgmPlaying = false;
    this.currentTrack = null;
    this.timerId = null;
    this.step = 0;
    this.tempo = 132; // BPM
    
    // Master, BGM and SFX volume levels (0.0 to 1.0)
    const savedMaster = localStorage.getItem('kungfu_master_vol');
    const savedBgm = localStorage.getItem('kungfu_bgm_vol');
    const savedSfx = localStorage.getItem('kungfu_sfx_vol');
    this.masterVolume = savedMaster !== null ? parseFloat(savedMaster) : 0.70;
    this.bgmVolume = savedBgm !== null ? parseFloat(savedBgm) : 0.65;
    this.sfxVolume = savedSfx !== null ? parseFloat(savedSfx) : 0.75;

    // MP3 Soundtrack Files
    this.mp3Tracks = {
      intro: 'soundtrtack/Shadow_in_the_Dojo.mp3',
      title: 'soundtrtack/Shadow_in_the_Dojo.mp3',
      character_select: 'soundtrtack/Shadow_in_the_Dojo.mp3',
      victory: 'soundtrtack/Iron_in_a_Calloused_Hand.mp3',
      tiger_trap: 'soundtrtack/The_Tiger_s_Trap.mp3',
      gameover: 'soundtrtack/Five_Hundred_Times.mp3'
    };
    this.currentAudioElement = null;
    this.currentMP3Key = null;
  }

  // Gritty 8-Bit / 16-Bit Arcade Saturation & DAC Quantization Shaper
  // Replaces harsh piercing distortion with warm analog drive + stepped 8-bit quantization
  createDistortionCurve(amount = 12) {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const steps = 28; // Authentic 8-bit stepped quantization
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // 1. Warm soft-saturation curve (warm transistor/tape clipping, no shrill harmonics)
      const sat = Math.tanh(x * 1.45);
      // 2. Gritty stepped quantization (simulates 8/16-bit arcade DAC conversion)
      const stepped = Math.round(sat * steps) / steps;
      // 3. 75% gritty stepped + 25% warm analog saturation
      curve[i] = stepped * 0.75 + sat * 0.25;
    }
    return curve;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    const initMasterGain = this.isMuted ? 0 : (this.masterVolume * 0.45);
    this.masterGain.gain.setValueAtTime(initMasterGain, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // SFX Bus
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // BGM Master Bus with warm arcade lowpass cutoff to eliminate high-frequency digital squeal
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(this.bgmVolume * 0.5, this.ctx.currentTime);
    this.bgmFilter = this.ctx.createBiquadFilter();
    this.bgmFilter.type = 'lowpass';
    this.bgmFilter.frequency.setValueAtTime(3200, this.ctx.currentTime); // Eliminates all harsh squealing frequencies > 3.2kHz
    this.bgmFilter.Q.setValueAtTime(0.707, this.ctx.currentTime); // Flat Butterworth, zero resonance spike
    this.bgmGain.connect(this.bgmFilter);
    this.bgmFilter.connect(this.masterGain);

    // GRITTY 8/16-BIT RETRO ARCADE SUB-BUSSES
    // 1. Gritty Rock Lead (Warm Bit-Crushed Saturation + Warm Lowpass Filter + Warm Analog Echo)
    this.distortionNode = this.ctx.createWaveShaper();
    this.distortionNode.curve = this.createDistortionCurve(12);
    this.distortionNode.oversample = '4x';

    this.leadFilter = this.ctx.createBiquadFilter();
    this.leadFilter.type = 'lowpass';
    this.leadFilter.frequency.setValueAtTime(2400, this.ctx.currentTime); // Warm 2.4kHz cutoff for fat lead tones
    if (this.leadFilter.Q && this.leadFilter.Q.setValueAtTime) {
      this.leadFilter.Q.setValueAtTime(0.707, this.ctx.currentTime); // Pure non-resonant Butterworth curve
    }

    this.leadGain = this.ctx.createGain();
    this.leadGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
    this.leadGain.connect(this.distortionNode);
    this.distortionNode.connect(this.leadFilter);
    this.leadFilter.connect(this.bgmGain);

    // Warm Vintage BBD / Tape Delay with filtered repeats (prevents metallic build-up)
    if (this.ctx.createDelay) {
      this.guitarDelay = this.ctx.createDelay();
      this.guitarDelay.delayTime.setValueAtTime(0.14, this.ctx.currentTime);
      this.guitarDelayFeedback = this.ctx.createGain();
      this.guitarDelayFeedback.gain.setValueAtTime(0.20, this.ctx.currentTime);
      this.delayFilter = this.ctx.createBiquadFilter();
      this.delayFilter.type = 'lowpass';
      this.delayFilter.frequency.setValueAtTime(1900, this.ctx.currentTime);

      this.leadFilter.connect(this.guitarDelay);
      this.guitarDelay.connect(this.delayFilter);
      this.delayFilter.connect(this.guitarDelayFeedback);
      this.guitarDelayFeedback.connect(this.guitarDelay);
      this.guitarDelay.connect(this.bgmGain);
    }

    // 2. Gritty Chiptune Arpeggio Bus (Warm 2.6kHz lowpass, punchy pulse attack)
    this.arpGain = this.ctx.createGain();
    this.arpGain.gain.setValueAtTime(0.40, this.ctx.currentTime);
    this.arpFilter = this.ctx.createBiquadFilter();
    this.arpFilter.type = 'lowpass';
    this.arpFilter.frequency.setValueAtTime(2600, this.ctx.currentTime);
    this.arpFilter.Q.setValueAtTime(0.707, this.ctx.currentTime);
    this.arpGain.connect(this.arpFilter);
    this.arpFilter.connect(this.bgmGain);

    // 3. Chugging Heavy Power Chords (Gritty Dual Pulse Waves)
    this.chordGain = this.ctx.createGain();
    this.chordGain.gain.setValueAtTime(0.40, this.ctx.currentTime);
    this.chordFilter = this.ctx.createBiquadFilter();
    this.chordFilter.type = 'lowpass';
    this.chordFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);
    this.chordGain.connect(this.chordFilter);
    this.chordFilter.connect(this.bgmGain);

    // 4. Punchy 16-Bit Bass (Deep Triangle/Saw with analog lowpass punch)
    this.bassGain = this.ctx.createGain();
    this.bassGain.gain.setValueAtTime(0.58, this.ctx.currentTime);
    this.bassGain.connect(this.bgmGain);

    // 5. Punchy 8/16-Bit Retro Drums (Kick, Snare, Toms, Hats, Crash)
    this.drumGain = this.ctx.createGain();
    this.drumGain.gain.setValueAtTime(0.68, this.ctx.currentTime);
    this.drumGain.connect(this.bgmGain);
  }

  resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const effectiveGain = this.isMuted ? 0 : (this.masterVolume * 0.45);
      this.masterGain.gain.setValueAtTime(effectiveGain, this.ctx.currentTime);
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, this.bgmVolume * this.masterVolume));
    }
    return this.isMuted;
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    localStorage.setItem('kungfu_master_vol', this.masterVolume.toString());
    if (this.masterVolume > 0 && this.isMuted) {
      this.isMuted = false;
    }
    if (this.masterGain && this.ctx) {
      const effectiveGain = this.isMuted ? 0 : (this.masterVolume * 0.45);
      this.masterGain.gain.setValueAtTime(effectiveGain, this.ctx.currentTime);
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, this.bgmVolume * this.masterVolume));
    }
    return this.masterVolume;
  }

  getMasterVolume() {
    return this.masterVolume;
  }

  adjustMasterVolume(delta) {
    this.resume();
    const newVol = Math.round((this.masterVolume + delta) * 100) / 100;
    this.setMasterVolume(newVol);
    return this.masterVolume;
  }

  setBGMVolume(val) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    localStorage.setItem('kungfu_bgm_vol', this.bgmVolume.toString());
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume * 0.5, this.ctx.currentTime);
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, this.bgmVolume * this.masterVolume));
    }
  }

  getBGMVolume() {
    return this.bgmVolume;
  }

  setSFXVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    localStorage.setItem('kungfu_sfx_vol', this.sfxVolume.toString());
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  getSFXVolume() {
    return this.sfxVolume;
  }

  getTrackDisplayName(theme = this.currentTrack) {
    switch (theme) {
      case 'intro':
      case 'title':
      case 'character_select': return '🥋 SHADOW IN THE DOJO (INTRO THEME)';
      case 'victory': return '🏆 IRON IN A CALLOUSED HAND (VICTORY)';
      case 'gameover': return '⚰️ FIVE HUNDRED TIMES (GAME OVER)';
      case 'tiger_trap': return '🐅 THE TIGER\'S TRAP (BATTLE ANTHEM)';
      case 'stage1':
      case 'stage': return '🎸 CHINATOWN BEATDOWN';
      case 'stage2': return '🎸 PAGODA SKY BLITZ';
      case 'stage3': return '🎸 SHADOW CLAN FURY';
      case 'boss': return '🎸 GRANDMASTER CLASH';
      default: return '🎸 8/16-BIT SOUNDTRACK';
    }
  }

  // Play MP3 Track with Loop / Volume Controls & Autoplay Resilience
  playMP3(key, loop = false, onEnded = null, trackName = key) {
    // 1. Stop any Web Audio oscillator synthesis loop
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.bgmPlaying = true;
    this.currentTrack = trackName;

    // 2. Stop any previous MP3
    this.stopMP3();

    const src = this.mp3Tracks[key] || key;
    if (typeof Audio === 'undefined') return;

    try {
      const audio = new Audio(src);
      audio.loop = !!loop;
      audio.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, this.bgmVolume * this.masterVolume));
      audio.onended = () => {
        if (onEnded) onEnded();
      };

      const playPromise = audio.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => {
          // In case of browser autoplay blocking before user gesture:
          const resumeAudio = () => {
            audio.play().catch(() => {});
            if (typeof document !== 'undefined') {
              document.removeEventListener('click', resumeAudio);
              document.removeEventListener('keydown', resumeAudio);
            }
          };
          if (typeof document !== 'undefined') {
            document.addEventListener('click', resumeAudio, { once: true });
            document.addEventListener('keydown', resumeAudio, { once: true });
          }
        });
      }
      this.currentAudioElement = audio;
      this.currentMP3Key = key;
    } catch (e) {
      console.warn('SoundEngine: Unable to play MP3:', src, e);
    }
  }

  stopMP3() {
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch (e) {}
      this.currentAudioElement = null;
    }
    this.currentMP3Key = null;
  }

  // --- SFX SYNTHESIS ---

  // Fast swoosh for punches & kicks
  playSwing(pitch = 300) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Heavy hit impact (NES "crack" + low thud)
  playHit(isHeavy = false) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Noise burst for crunch
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = isHeavy ? 'lowpass' : 'bandpass';
    noiseFilter.frequency.setValueAtTime(isHeavy ? 600 : 1200, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isHeavy ? 0.8 : 0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(t);

    // 2. Punch tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(isHeavy ? 180 : 260, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.15);

    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Knockdown smack (fighter hitting the asphalt/ground)
  playKnockdown() {
    if (!this.ctx || this.isMuted) return;
    this.playHit(true);
    setTimeout(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.26);
    }, 180);
  }

  // Jump leap sound
  playJump() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(380, t + 0.15);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Dragon Special Attack (Ki explosion!)
  playSpecial() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Rising sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.3);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);

    // Boom explosion
    setTimeout(() => {
      if (!this.ctx) return;
      const t2 = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, t2);
      filter.frequency.exponentialRampToValueAtTime(60, t2 + 0.45);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.8, t2);
      nGain.gain.exponentialRampToValueAtTime(0.01, t2 + 0.45);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(t2);
    }, 150);
  }

  // Item pickup chime (Pizza / Nunchucks / Daggers / Scroll)
  playPickup() {
    if (!this.ctx || this.isMuted) return;
    const notes = [330, 440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.11);
      }, idx * 45);
    });
  }

  // Nunchaku rapid whipping swoosh and wooden snap
  playNunchaku() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Fast high swoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(460, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.09);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);

    // Wooden clack pop
    const pop = this.ctx.createOscillator();
    const pGain = this.ctx.createGain();
    pop.type = 'square';
    pop.frequency.setValueAtTime(320, t + 0.04);
    pop.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    pGain.gain.setValueAtTime(0.25, t + 0.04);
    pGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    pop.connect(pGain);
    pGain.connect(this.sfxGain);
    pop.start(t + 0.04);
    pop.stop(t + 0.09);
  }

  // Dagger metallic razor slash
  playSlash() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Razor noise bandpass burst (warm retro bite, no shrill whistle)
    const bLen = Math.floor(this.ctx.sampleRate * 0.07);
    const buf = this.ctx.createBuffer(1, bLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bLen * 0.3));
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1800, t);
    bp.frequency.exponentialRampToValueAtTime(900, t + 0.07);
    bp.Q.setValueAtTime(1.4, t);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.38, t);
    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t);

    // Warm metallic ring tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(820, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.07);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Zombie low eerie undead groan / moan
  playZombieGroan() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(74, t);
    osc.frequency.linearRampToValueAtTime(88, t + 0.22);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.65);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.linearRampToValueAtTime(450, t + 0.22);
    filter.frequency.linearRampToValueAtTime(260, t + 0.65);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.66);
  }

  // Zombie wet flesh bite / chomp
  playZombieBite() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Sharp jaw snap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.13);

    // Wet visceral noise crunch
    const bLen = Math.floor(this.ctx.sampleRate * 0.1);
    const buf = this.ctx.createBuffer(1, bLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bLen * 0.25));
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.35, t);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t);
  }

  // Weapon break shatter sound
  playWeaponBreak() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Noise shatter burst
    const bLen = Math.floor(this.ctx.sampleRate * 0.14);
    const buf = this.ctx.createBuffer(1, bLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bLen * 0.2));
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.45, t);
    noise.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t);

    // Descending metallic snap frequencies
    [880, 620, 390].forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const st = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, st);
        g.gain.setValueAtTime(0.25, st);
        g.gain.exponentialRampToValueAtTime(0.01, st + 0.08);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(st);
        osc.stop(st + 0.09);
      }, idx * 25);
    });
  }

  // Dual pistols gunshot crack & slide snap
  playGunshot() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. High-impact gun blast noise crack
    const bLen = Math.floor(this.ctx.sampleRate * 0.1);
    const buf = this.ctx.createBuffer(1, bLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bLen * 0.18));
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(800, t);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.65, t);
    nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    noise.connect(hp);
    hp.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t);

    // 2. Punchy low-end thump
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);

    // 3. Brass shell ping
    setTimeout(() => {
      if (!this.ctx) return;
      const st = this.ctx.currentTime;
      const ping = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();
      ping.type = 'sine';
      ping.frequency.setValueAtTime(1600 + Math.random() * 400, st);
      pGain.gain.setValueAtTime(0.12, st);
      pGain.gain.exponentialRampToValueAtTime(0.005, st + 0.06);
      ping.connect(pGain);
      pGain.connect(this.sfxGain);
      ping.start(st);
      ping.stop(st + 0.07);
    }, 70);
  }

  // Gun empty click
  playEmptyGun() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.03);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  // Shop purchase cash register / coins jingle
  playShopBuy() {
    if (!this.ctx || this.isMuted) return;
    const freqs = [523, 659, 784, 1046];
    freqs.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.35, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.13);
      }, idx * 50);
    });
  }

  // Boss roar or intro horn
  playBossIntro() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.linearRampToValueAtTime(82, t + 0.3);
    osc.frequency.linearRampToValueAtTime(55, t + 0.7);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.75);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.76);
  }

  // RETRO 8-BIT ARCADE BOSS LAUGH ("MWAHAHAHA!")
  playBossLaugh(bossType = 'master_shen') {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Pitch patterns for different villains
    let baseNotes = [330, 280, 245, 210, 185, 155]; // Master Shen (cackling martial grandmaster)
    let speed = 0.088;
    let waveType = 'square';
    let vol = 0.38;

    if (bossType === 'iron_fang') {
      baseNotes = [175, 148, 128, 110, 96, 80]; // Iron Fang Oni (deep guttural demonic laughter)
      speed = 0.115;
      waveType = 'sawtooth';
      vol = 0.45;
    } else if (bossType === 'kuroda') {
      baseNotes = [410, 340, 285, 235, 190, 150, 120]; // Grandmaster Kuroda (Imperial Shadow Dragon Lord)
      speed = 0.076;
      waveType = 'square';
      vol = 0.42;
    }

    baseNotes.forEach((baseFreq, i) => {
      const startTime = t + (i * speed);
      const noteDur = speed * 0.82;

      // Primary 8-bit square/sawtooth pulse
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = waveType;
      // Staccato pitch drop for each "HA"
      osc.frequency.setValueAtTime(baseFreq * 1.18, startTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, startTime + noteDur);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + noteDur);

      // Sub-harmonic oscillator for punchy 8-bit NES robotic timbre
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(baseFreq * 0.5, startTime);
      subOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.35, startTime + noteDur);

      subGain.gain.setValueAtTime(0.001, startTime);
      subGain.gain.linearRampToValueAtTime(vol * 0.5, startTime + 0.012);
      subGain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDur);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);

      subOsc.start(startTime);
      subOsc.stop(startTime + noteDur);
    });
  }

  // Thunder Crack & Low Rumbling Echo
  playThunder() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.exponentialRampToValueAtTime(45, t + 1.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
  }

  // Stage Clear Fanfare (NES Victory Jingle)
  playStageClear() {
    if (!this.ctx || this.isMuted) return;
    this.stopBGM();
    const notes = [261.6, 329.6, 392.0, 523.2, 392.0, 523.2, 659.2, 784.0];
    const times = [0, 0.12, 0.24, 0.36, 0.52, 0.64, 0.80, 1.05];
    const durations = [0.1, 0.1, 0.1, 0.14, 0.1, 0.14, 0.2, 0.5];

    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + durations[i]);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + durations[i] + 0.02);
      }, times[i] * 1000);
    });
  }

  // ==========================================
  // ROCKIN' 8-BIT MULTI-CHANNEL SYNTHESIZER
  // ==========================================

  // 1. Gritty 8/16-Bit Rock Guitar Lead (Warm Overdrive + Stepped DAC Grit)
  playRockLead(freq, time, duration, vibrato = true) {
    if (!this.ctx || this.isMuted || !this.leadGain || freq <= 0) return;

    let safeFreq = freq;
    while (safeFreq > 880) safeFreq /= 2;

    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // Subtle pick transient attack (+3% dropping rapidly)
    osc.frequency.setValueAtTime(safeFreq * 1.03, time);
    osc.frequency.exponentialRampToValueAtTime(safeFreq, time + 0.018);

    // Warm, smooth 5.4 Hz vibrato for sustained notes (subtle, non-squealing depth)
    if (vibrato && duration > 0.18) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(5.4, time);
      lfoGain.gain.setValueAtTime(safeFreq * 0.016, time);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(time + 0.06);
      lfo.stop(time + duration);
    }

    // Punchy 16-bit arcade attack & warm decay
    noteGain.gain.setValueAtTime(0.001, time);
    noteGain.gain.linearRampToValueAtTime(0.36, time + 0.006);
    noteGain.gain.exponentialRampToValueAtTime(0.24, time + duration * 0.7);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(noteGain);
    noteGain.connect(this.leadGain);

    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  // 2. Gritty 8/16-Bit Solo Notes with Bends, Whammy, Vibrato (Zero Piercing Squeals!)
  playRockSoloNote(freq, time, duration, options = {}) {
    if (!this.ctx || this.isMuted || !this.leadGain || freq <= 0) return;

    // Musically fold any ultrasonic frequencies (> 880 Hz) into the rich, singing mid register
    let safeFreq = freq;
    while (safeFreq > 880) safeFreq /= 2;

    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = options.type || 'sawtooth';

    // Smooth musical string bends without screeching
    if (options.bendSemi) {
      const targetFreq = Math.min(880, safeFreq * Math.pow(2, options.bendSemi / 12));
      osc.frequency.setValueAtTime(safeFreq, time);
      osc.frequency.exponentialRampToValueAtTime(targetFreq, time + duration * 0.65);
    } else if (options.whammy) {
      osc.frequency.setValueAtTime(safeFreq, time);
      osc.frequency.exponentialRampToValueAtTime(safeFreq * 0.85, time + duration * 0.3);
      osc.frequency.exponentialRampToValueAtTime(safeFreq, time + duration * 0.8);
    } else if (options.slideFrom) {
      let slideFreq = options.slideFrom;
      while (slideFreq > 880) slideFreq /= 2;
      osc.frequency.setValueAtTime(slideFreq, time);
      osc.frequency.exponentialRampToValueAtTime(safeFreq, time + Math.min(0.06, duration * 0.4));
    } else {
      osc.frequency.setValueAtTime(safeFreq * 1.02, time);
      osc.frequency.exponentialRampToValueAtTime(safeFreq, time + 0.015);
    }

    // Smooth retro vibrato (5.6 Hz)
    if (options.vibrato !== false && duration > 0.14) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(options.vibratoSpeed || 5.6, time);
      lfoGain.gain.setValueAtTime(safeFreq * (options.vibratoDepth || 0.018), time);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(time + 0.05);
      lfo.stop(time + duration);
    }

    // Fat 16-Bit Sub-Octave Layer for heavy grit (replaces ear-piercing pinch harmonics!)
    if (options.harmonic) {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'square';
      subOsc.frequency.setValueAtTime(safeFreq * 0.5, time); // Heavy sub-octave body
      subGain.gain.setValueAtTime(0.001, time);
      subGain.gain.linearRampToValueAtTime(0.20, time + 0.006);
      subGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.85);
      subOsc.connect(subGain);
      subGain.connect(this.leadGain);
      subOsc.start(time);
      subOsc.stop(time + duration + 0.01);
    }

    // Warm, gritty amplitude envelope
    noteGain.gain.setValueAtTime(0.001, time);
    noteGain.gain.linearRampToValueAtTime(0.40, time + 0.006);
    noteGain.gain.exponentialRampToValueAtTime(0.28, time + duration * 0.72);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(noteGain);
    noteGain.connect(this.leadGain);

    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  // 3. Gritty 8/16-Bit Sweep Arpeggios (Crisp Chiptune Pulse Shred)
  playGuitarArp(freqs, time, totalDuration = 0.22, options = {}) {
    if (!this.ctx || this.isMuted || !Array.isArray(freqs) || freqs.length === 0) return;
    const bus = this.arpGain || this.leadGain;
    if (!bus) return;

    const noteCount = freqs.length;
    const noteDur = totalDuration / noteCount;

    freqs.forEach((freq, idx) => {
      if (!freq || freq <= 0) return;
      let safeFreq = freq;
      while (safeFreq > 880) safeFreq /= 2;

      const noteTime = time + idx * noteDur;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Classic 8/16-bit chiptune wave alternations (sawtooth + square)
      osc.type = (idx % 2 === 0) ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(safeFreq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.30, noteTime + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + noteDur * 0.90);

      osc.connect(gain);
      gain.connect(bus);

      osc.start(noteTime);
      osc.stop(noteTime + noteDur + 0.01);
    });
  }

  // 4. Chugging Power Chords (Root + 5th Interval)
  playRockChord(rootFreq, fifthFreq, time, duration) {
    if (!this.ctx || this.isMuted || !this.chordGain || rootFreq <= 0) return;

    [rootFreq, fifthFreq].forEach(freq => {
      if (!freq) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.22, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(this.chordGain);

      osc.start(time);
      osc.stop(time + duration + 0.01);
    });
  }

  // 5. Galloping Heavy Rock Bass (16th-note slap/pick bass)
  playRockBass(freq, time, duration) {
    if (!this.ctx || this.isMuted || !this.bassGain || freq <= 0) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    // Filter snap for percussive bass attack
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, time);
    filter.frequency.exponentialRampToValueAtTime(160, time + duration);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.48, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bassGain);

    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  // 6. Punchy Rock Kick Drum (with Double-Bass Trigger Click)
  playKick(time, heavy = false) {
    if (!this.ctx || this.isMuted || !this.drumGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(heavy ? 175 : 160, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.095);

    gain.gain.setValueAtTime(0.75, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.095);

    osc.connect(gain);
    gain.connect(this.drumGain);
    osc.start(time);
    osc.stop(time + 0.10);

    // Punchy beater transient click
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(1100, time);
    click.frequency.exponentialRampToValueAtTime(90, time + 0.016);
    clickGain.gain.setValueAtTime(0.22, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.016);
    click.connect(clickGain);
    clickGain.connect(this.drumGain);
    click.start(time);
    click.stop(time + 0.018);
  }

  // 7. Snappy Rock Snare Drum (White Noise + Body Punch)
  playSnare(time) {
    if (!this.ctx || this.isMuted || !this.drumGain) return;

    // Noise snap
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, time);
    filter.Q.setValueAtTime(1.8, time);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.55, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.drumGain);
    noise.start(time);

    // Body tone
    const osc = this.ctx.createOscillator();
    const oGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, time);
    osc.frequency.exponentialRampToValueAtTime(75, time + 0.08);

    oGain.gain.setValueAtTime(0.35, time);
    oGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(oGain);
    oGain.connect(this.drumGain);
    osc.start(time);
    osc.stop(time + 0.085);
  }

  // 8. Resonant Drum Tom (For energetic rock drum fills)
  playTom(freq = 160, time) {
    if (!this.ctx || this.isMuted || !this.drumGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.45, time + 0.11);

    gain.gain.setValueAtTime(0.60, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

    osc.connect(gain);
    gain.connect(this.drumGain);
    osc.start(time);
    osc.stop(time + 0.115);
  }

  // 9. Crisp 8/16-Bit Arcade Hi-Hats (No Shrill White Noise Hiss)
  playHiHat(time, open = false) {
    if (!this.ctx || this.isMuted || !this.drumGain) return;
    const duration = open ? 0.11 : 0.035;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const raw = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      data[i] = Math.round(raw * 8) / 8; // Gritty 8-bit stepped noise
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3600, time);
    filter.Q.setValueAtTime(1.1, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(open ? 0.20 : 0.13, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumGain);
    noise.start(time);
  }

  // 10. Punchy 16-Bit Crash Cymbal (Warm Bandpass Decay)
  playCrash(time) {
    if (!this.ctx || this.isMuted || !this.drumGain) return;
    const duration = 0.45;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const raw = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.30));
      data[i] = Math.round(raw * 16) / 16;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, time);
    filter.frequency.exponentialRampToValueAtTime(1500, time + duration);
    filter.Q.setValueAtTime(0.85, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumGain);
    noise.start(time);
  }

  // ==========================================
  // ROCKIN' 8-BIT SOUNDTRACK COMPOSITIONS
  // ==========================================

  startBGM(theme = 'stage1') {
    this.resume();
    if (this.currentTrack === theme && this.bgmPlaying) return;
    this.stopBGM();

    this.currentTrack = theme;
    this.bgmPlaying = true;
    this.step = 0;

    // 1. Intro Song (Title Screen & Character Select before game starts) -> Shadow_in_the_Dojo.mp3
    if (theme === 'title' || theme === 'character_select' || theme === 'intro') {
      this.playMP3('intro', true, null, theme);
      return;
    }

    // 2. Victory Song (When you win the game) -> Iron_in_a_Calloused_Hand.mp3
    if (theme === 'victory') {
      this.playMP3('victory', true, null, theme);
      return;
    }

    // 3. Game Over Song (When character game ends / Game Over) -> Five_Hundred_Times.mp3
    if (theme === 'gameover') {
      this.playMP3('gameover', true, null, theme);
      return;
    }

    // 4. Special In-Game Combat Anthem (Randomly every ~10 minutes) -> The_Tiger_s_Trap.mp3
    if (theme === 'tiger_trap') {
      this.playMP3('tiger_trap', false, () => {
        // Automatically return to current stage background music when song finishes
        if (typeof window !== 'undefined' && window.game && window.game.gameState === 'PLAYING') {
          const currentStage = (window.game.stage && window.game.stage.currentStageNum) ? window.game.stage.currentStageNum : 1;
          this.startBGM(`stage${currentStage}`);
        }
      }, theme);
      return;
    }

    // 4. Fallback Synthetic Title theme (if user explicitly chooses in jukebox)
    if (theme === 'synth_title') {
      this.tempo = 134;
      this.playTitleRockLoop();
      return;
    }

    // 5. Stage Gameplay Soundtrack Loops (supports infinite procedural stages)
    let resolvedTheme = theme;
    if (typeof theme === 'string' && theme.startsWith('stage') && theme !== 'stage1' && theme !== 'stage2' && theme !== 'stage3') {
      const stageNum = parseInt(theme.replace('stage', ''), 10) || 1;
      const themeRotation = ['stage1', 'stage2', 'stage3'];
      resolvedTheme = themeRotation[(stageNum - 1) % 3];
    }

    if (resolvedTheme === 'stage1' || resolvedTheme === 'stage') {
      this.tempo = 130;
      this.playStage1RockLoop();
    } else if (resolvedTheme === 'stage2') {
      this.tempo = 146;
      this.playStage2RockLoop();
    } else if (resolvedTheme === 'stage3') {
      this.tempo = 136;
      this.playStage3RockLoop();
    } else if (resolvedTheme === 'boss') {
      this.tempo = 152;
      this.playBossRockLoop();
    }
  }

  stopBGM() {
    this.stopMP3();
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.bgmPlaying = false;
    this.currentTrack = null;
  }

  // TRACK 1: "NEON DRAGON ANTHEM" (Title & Character Select Arena Rock with Arpeggios & Solos)
  playTitleRockLoop() {
    // 64-Step A-Minor Arena Rock (Steps 0-31: Arpeggio Riff Drive | Steps 32-63: Blistering Guitar Solo)
    const stepDur = (60 / this.tempo) / 4;

    // Galloping A-minor bass
    const bass = [
      // Bars 1-4 (0-31)
      110.0, 110.0, 130.8, 146.8, 164.8, 110.0, 130.8, 110.0,
      87.3,  87.3,  110.0, 87.3,  130.8, 87.3,  110.0, 87.3,
      98.0,  98.0,  123.5, 98.0,  146.8, 98.0,  123.5, 98.0,
      82.4,  82.4,  110.0, 82.4,  123.5, 146.8, 164.8, 196.0,
      // Bars 5-8 Solo (32-63)
      110.0, 110.0, 110.0, 130.8, 110.0, 146.8, 110.0, 164.8,
      87.3,  87.3,  87.3,  110.0, 87.3,  130.8, 87.3,  110.0,
      130.8, 130.8, 146.8, 130.8, 164.8, 130.8, 146.8, 130.8,
      98.0,  98.0,  110.0, 123.5, 130.8, 146.8, 164.8, 196.0
    ];

    // Power Chords (Root + 5th)
    const chords = [
      // 0-31
      [220.0, 329.6], 0, [220.0, 329.6], 0, [220.0, 329.6], 0, [261.6, 392.0], 0,
      [174.6, 261.6], 0, [174.6, 261.6], 0, [174.6, 261.6], 0, [196.0, 293.7], 0,
      [196.0, 293.7], 0, [196.0, 293.7], 0, [196.0, 293.7], 0, [246.9, 370.0], 0,
      [164.8, 246.9], 0, [164.8, 246.9], 0, [196.0, 293.7], 0, [220.0, 329.6], 0,
      // 32-63 Chugging backing for solo
      [220.0, 329.6], [220.0, 329.6], 0, [220.0, 329.6], [220.0, 329.6], 0, [261.6, 392.0], 0,
      [174.6, 261.6], [174.6, 261.6], 0, [174.6, 261.6], [174.6, 261.6], 0, [196.0, 293.7], 0,
      [261.6, 392.0], [261.6, 392.0], 0, [261.6, 392.0], [261.6, 392.0], 0, [293.7, 440.0], 0,
      [196.0, 293.7], [196.0, 293.7], 0, [196.0, 293.7], 0, 0, 0, 0
    ];

    // Theme Lead Melody (Steps 0-31)
    const leadRiff = [
      440.0, 0, 523.3, 587.3, 659.3, 0, 587.3, 523.3,
      698.5, 0, 659.3, 0,     587.3, 523.3, 440.0, 0,
      784.0, 0, 880.0, 0,     784.0, 659.3, 587.3, 0,
      659.3, 0, 587.3, 659.3, 784.0, 880.0, 987.8, 880.0
    ];

    // Neo-Classical Guitar Arpeggio Sweep Bank
    const arpBank = {
      0:  [220.0, 261.6, 329.6, 440.0, 523.3, 659.3],       // Am sweep up
      4:  [659.3, 523.3, 440.0, 329.6],                     // Am sweep down
      8:  [174.6, 220.0, 261.6, 349.2, 440.0, 523.3],       // F sweep up
      12: [523.3, 440.0, 349.2, 261.6],                     // F sweep down
      16: [261.6, 329.6, 392.0, 523.3, 659.3, 784.0],       // C sweep up
      20: [784.0, 659.3, 523.3, 392.0],                     // C sweep down
      24: [196.0, 246.9, 293.7, 392.0, 493.9, 587.3],       // G sweep up
      28: [164.8, 207.65, 246.9, 329.6, 415.3, 493.9]       // E7 turnaround
    };

    this.timerId = setInterval(() => {
      if (!this.bgmPlaying || !this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const s = this.step % 64;

      // 1. Bassline
      if (bass[s] > 0) this.playRockBass(bass[s], t, stepDur * 1.3);

      // 2. Power Chords
      if (chords[s]) this.playRockChord(chords[s][0], chords[s][1], t, stepDur * 1.4);

      // 3. Arpeggios (Section A: Steps 0-31)
      if (s < 32 && arpBank[s]) {
        this.playGuitarArp(arpBank[s], t, stepDur * 3.6);
      }

      // 4. Lead Guitar (Section A Melody)
      if (s < 32 && leadRiff[s] > 0) {
        this.playRockLead(leadRiff[s], t, stepDur * 1.8, true);
      }

      // 5. GRITTY 8/16-BIT GUITAR SOLO (Section B: Steps 32-63)
      if (s >= 32) {
        if (s === 32) this.playRockSoloNote(440.0, t, stepDur * 3.6, { bendSemi: 2, vibrato: true }); // A4 bend to B4
        else if (s === 36) this.playRockSoloNote(392.0, t, stepDur * 1.8, { vibrato: true }); // G4
        else if (s === 38) this.playRockSoloNote(329.6, t, stepDur * 1.8, { vibrato: true }); // E4
        else if (s === 40) this.playRockSoloNote(523.3, t, stepDur * 3.4, { harmonic: true, vibrato: true }); // C5 with fat sub-octave grit!
        // Fast descending shred run
        else if (s === 44) this.playRockSoloNote(523.3, t, stepDur * 0.9);
        else if (s === 45) this.playRockSoloNote(440.0, t, stepDur * 0.9);
        else if (s === 46) this.playRockSoloNote(392.0, t, stepDur * 0.9);
        else if (s === 47) this.playRockSoloNote(329.6, t, stepDur * 0.9);
        else if (s === 48) this.playRockSoloNote(293.7, t, stepDur * 0.9);
        else if (s === 49) this.playRockSoloNote(261.6, t, stepDur * 0.9);
        else if (s === 50) this.playRockSoloNote(293.7, t, stepDur * 2.2, { bendSemi: 2 }); // D4 bend to E4
        else if (s === 53) this.playRockSoloNote(587.3, t, stepDur * 3.0, { bendSemi: 2, vibrato: true }); // D5 bend to E5!
        else if (s === 56) this.playRockSoloNote(880.0, t, stepDur * 3.5, { harmonic: true, vibrato: true }); // Powerful A5 climax!
      }

      // 6. ROCK DRUMS
      if (s === 0 || s === 32) this.playCrash(t);

      // Section A Drums
      if (s < 32) {
        if (s % 8 === 0 || s % 8 === 6) this.playKick(t);
        if (s % 8 === 4) this.playSnare(t);
        if (s % 2 === 0) this.playHiHat(t, s % 8 === 2);
        // Fill at turnaround
        if (s === 28) this.playTom(220, t);
        if (s === 29) this.playTom(170, t);
        if (s === 30) this.playTom(120, t);
        if (s === 31) this.playSnare(t);
      } else {
        // Section B Solo Drums (Aggressive Double-Kick Groove)
        if (s % 4 === 0 || s % 8 === 2) this.playKick(t, true);
        if (s % 8 === 4) this.playSnare(t);
        if (s % 2 === 0) this.playHiHat(t, true); // Open sizzling hats
        // Solo Climax Tom Fill
        if (s === 60) this.playTom(240, t);
        if (s === 61) this.playTom(180, t);
        if (s === 62) this.playTom(130, t);
        if (s === 63) { this.playSnare(t); this.playKick(t, true); }
      }

      this.step++;
    }, stepDur * 1000);
  }

  // TRACK 2: "CHINATOWN BEATDOWN" (Stage 1 Cyber Rock with Sweep Arpeggios & Whammy Solo)
  playStage1RockLoop() {
    // 64-Step D-Minor Street Brawl Rock (Steps 0-31: Dm Sweep Arps | Steps 32-63: Screaming Solo)
    const stepDur = (60 / this.tempo) / 4;

    const bass = [
      // 0-31
      146.8, 146.8, 174.6, 146.8, 196.0, 146.8, 174.6, 130.8,
      116.5, 116.5, 146.8, 116.5, 174.6, 116.5, 146.8, 116.5,
      130.8, 130.8, 164.8, 130.8, 196.0, 130.8, 164.8, 130.8,
      110.0, 110.0, 130.8, 110.0, 146.8, 164.8, 174.6, 196.0,
      // 32-63
      146.8, 146.8, 146.8, 174.6, 146.8, 196.0, 146.8, 174.6,
      116.5, 116.5, 116.5, 146.8, 116.5, 174.6, 116.5, 146.8,
      130.8, 130.8, 130.8, 164.8, 130.8, 196.0, 130.8, 164.8,
      110.0, 110.0, 123.5, 130.8, 146.8, 164.8, 174.6, 220.0
    ];

    const chords = [
      // 0-31
      [293.7, 440.0], 0, [293.7, 440.0], 0, 0, [293.7, 440.0], 0, [349.2, 523.3],
      [233.1, 349.2], 0, [233.1, 349.2], 0, 0, [233.1, 349.2], 0, [261.6, 392.0],
      [261.6, 392.0], 0, [261.6, 392.0], 0, 0, [261.6, 392.0], 0, [293.7, 440.0],
      [220.0, 329.6], 0, [220.0, 329.6], 0, [261.6, 392.0], 0, [293.7, 440.0], 0,
      // 32-63
      [293.7, 440.0], [293.7, 440.0], 0, [293.7, 440.0], 0, [293.7, 440.0], 0, [349.2, 523.3],
      [233.1, 349.2], [233.1, 349.2], 0, [233.1, 349.2], 0, [233.1, 349.2], 0, [261.6, 392.0],
      [261.6, 392.0], [261.6, 392.0], 0, [261.6, 392.0], 0, [261.6, 392.0], 0, [293.7, 440.0],
      [220.0, 329.6], [220.0, 329.6], 0, [220.0, 329.6], 0, 0, 0, 0
    ];

    const leadRiff = [
      587.3, 0, 523.3, 587.3, 0, 698.5, 659.3, 0,
      466.2, 0, 523.3, 0,     587.3, 0, 0, 0,
      523.3, 0, 587.3, 659.3, 0, 784.0, 698.5, 0,
      880.0, 0, 784.0, 698.5, 659.3, 587.3, 659.3, 587.3
    ];

    const arpBank = {
      0:  [293.7, 349.2, 440.0, 587.3, 698.5, 880.0],       // Dm sweep up
      4:  [880.0, 698.5, 587.3, 440.0],                     // Dm sweep down
      8:  [233.1, 293.7, 349.2, 466.2, 587.3, 698.5],       // Bb sweep up
      12: [698.5, 587.3, 466.2, 349.2],                     // Bb sweep down
      16: [261.6, 329.6, 392.0, 523.3, 659.3, 784.0],       // C sweep up
      20: [784.0, 659.3, 523.3, 392.0],                     // C sweep down
      24: [220.0, 277.2, 329.6, 440.0, 554.4, 659.3],       // A7 sweep up
      28: [659.3, 554.4, 440.0, 329.6, 277.2, 220.0]        // A7 turnaround
    };

    this.timerId = setInterval(() => {
      if (!this.bgmPlaying || !this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const s = this.step % 64;

      // 1. Bassline & Chords
      if (bass[s] > 0) this.playRockBass(bass[s], t, stepDur * 1.3);
      if (chords[s]) this.playRockChord(chords[s][0], chords[s][1], t, stepDur * 1.4);

      // 2. Section A: Arpeggios & Riff
      if (s < 32 && arpBank[s]) {
        this.playGuitarArp(arpBank[s], t, stepDur * 3.5);
      }
      if (s < 32 && leadRiff[s] > 0) {
        this.playRockLead(leadRiff[s], t, stepDur * 1.9, true);
      }

      // 3. Section B: GRITTY 16-BIT GUITAR SOLO (Zero Piercing Squeals)
      if (s >= 32) {
        if (s === 32) this.playRockSoloNote(293.7, t, stepDur * 1.8, { slideFrom: 220.0 });
        else if (s === 34) this.playRockSoloNote(440.0, t, stepDur * 3.4, { bendSemi: 2, vibrato: true }); // A4 bend to B4
        // Rapid Dorian shred flurry
        else if (s === 38) this.playRockSoloNote(440.0, t, stepDur * 0.9);
        else if (s === 39) this.playRockSoloNote(392.0, t, stepDur * 0.9);
        else if (s === 40) this.playRockSoloNote(349.2, t, stepDur * 0.9);
        else if (s === 41) this.playRockSoloNote(329.6, t, stepDur * 0.9);
        else if (s === 42) this.playRockSoloNote(293.7, t, stepDur * 0.9);
        else if (s === 43) this.playRockSoloNote(261.6, t, stepDur * 0.9);
        else if (s === 44) this.playRockSoloNote(587.3, t, stepDur * 3.2, { whammy: true, harmonic: true }); // D5 with sub-octave grit!
        else if (s === 48) this.playGuitarArp([293.7, 349.2, 440.0, 587.3, 698.5], t, stepDur * 3.2); // Solo sweep lick
        else if (s === 52) this.playRockSoloNote(698.5, t, stepDur * 3.5, { bendSemi: 2, vibrato: true }); // F5 bend to G5!
        else if (s === 56) this.playRockSoloNote(587.3, t, stepDur * 3.5, { vibrato: true, harmonic: true }); // Gritty D5 anchor
      }

      // 4. Drums
      if (s === 0 || s === 32) this.playCrash(t);

      if (s < 32) {
        if (s % 8 === 0 || s % 8 === 3) this.playKick(t);
        if (s % 8 === 4) this.playSnare(t);
        if (s % 2 === 0) this.playHiHat(t, s % 4 === 2);
        if (s === 28) this.playTom(200, t);
        if (s === 29) this.playTom(150, t);
        if (s === 30) this.playTom(110, t);
        if (s === 31) this.playSnare(t);
      } else {
        // Double-kick groove during solo
        if (s % 4 === 0 || s % 8 === 2) this.playKick(t, true);
        if (s % 8 === 4) this.playSnare(t);
        if (s % 2 === 0) this.playHiHat(t, true);
        // Climax tom fill
        if (s === 60) this.playTom(220, t);
        if (s === 61) this.playTom(170, t);
        if (s === 62) this.playTom(120, t);
        if (s === 63) { this.playSnare(t); this.playKick(t, true); }
      }

      this.step++;
    }, stepDur * 1000);
  }

  // TRACK 3: "PAGODA SKY BLITZ" (Stage 2 Speed Metal Thrash with Blistering Shred Arps & Solos)
  playStage2RockLoop() {
    // 64-Step E-Minor Thrash Metal (Steps 0-31: Speed Arpeggios | Steps 32-63: Blistering 32nd-Note Solo)
    const stepDur = (60 / this.tempo) / 4;

    const bass = [
      // 0-31
      82.4, 82.4, 98.0, 82.4, 110.0, 82.4, 98.0, 73.4,
      65.4, 65.4, 82.4, 65.4, 98.0,  65.4, 82.4, 65.4,
      73.4, 73.4, 87.3, 73.4, 110.0, 73.4, 98.0, 73.4,
      61.7, 61.7, 73.4, 61.7, 82.4,  98.0, 110.0, 123.5,
      // 32-63
      82.4, 82.4, 82.4, 82.4, 82.4, 98.0, 82.4, 110.0,
      65.4, 65.4, 65.4, 65.4, 65.4, 82.4, 65.4, 98.0,
      73.4, 73.4, 73.4, 73.4, 73.4, 87.3, 73.4, 110.0,
      61.7, 61.7, 73.4, 82.4, 98.0, 110.0, 123.5, 146.8
    ];

    const chords = [
      // 0-31
      [164.8, 246.9], [164.8, 246.9], 0, [164.8, 246.9], [196.0, 293.7], 0, [164.8, 246.9], 0,
      [130.8, 196.0], [130.8, 196.0], 0, [130.8, 196.0], [164.8, 246.9], 0, [130.8, 196.0], 0,
      [146.8, 220.0], [146.8, 220.0], 0, [146.8, 220.0], [174.6, 261.6], 0, [146.8, 220.0], 0,
      [123.5, 185.0], [123.5, 185.0], 0, [146.8, 220.0], 0, [164.8, 246.9], 0, [196.0, 293.7],
      // 32-63
      [164.8, 246.9], [164.8, 246.9], [164.8, 246.9], 0, [164.8, 246.9], [196.0, 293.7], 0, [164.8, 246.9],
      [130.8, 196.0], [130.8, 196.0], [130.8, 196.0], 0, [130.8, 196.0], [164.8, 246.9], 0, [130.8, 196.0],
      [146.8, 220.0], [146.8, 220.0], [146.8, 220.0], 0, [146.8, 220.0], [174.6, 261.6], 0, [146.8, 220.0],
      [123.5, 185.0], [123.5, 185.0], 0, [123.5, 185.0], 0, 0, 0, 0
    ];

    const leadRiff = [
      329.6, 0, 392.0, 440.0, 493.9, 0, 440.0, 392.0,
      523.3, 0, 493.9, 0,     440.0, 392.0, 329.6, 0,
      293.7, 0, 329.6, 392.0, 440.0, 0, 392.0, 329.6,
      493.9, 0, 440.0, 493.9, 587.3, 659.3, 587.3, 493.9
    ];

    const arpBank = {
      0:  [164.8, 196.0, 246.9, 329.6, 392.0, 493.9, 659.3],  // Em sweep up
      4:  [659.3, 493.9, 392.0, 329.6, 246.9],
      8:  [130.8, 164.8, 196.0, 261.6, 329.6, 392.0, 523.3],  // C sweep
      12: [523.3, 392.0, 329.6, 261.6, 196.0],
      16: [146.8, 185.0, 220.0, 293.7, 370.0, 440.0, 587.3],  // D sweep
      20: [587.3, 440.0, 370.0, 293.7, 220.0],
      24: [123.5, 155.6, 185.0, 246.9, 311.1, 370.0, 493.9],   // B7 dominant sweep
      28: [493.9, 370.0, 311.1, 246.9, 185.0, 155.6]
    };

    this.timerId = setInterval(() => {
      if (!this.bgmPlaying || !this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const s = this.step % 64;

      if (bass[s] > 0) this.playRockBass(bass[s], t, stepDur * 1.2);
      if (chords[s]) this.playRockChord(chords[s][0], chords[s][1], t, stepDur * 1.3);

      if (s < 32 && arpBank[s]) {
        this.playGuitarArp(arpBank[s], t, stepDur * 3.4);
      }
      if (s < 32 && leadRiff[s] > 0) {
        this.playRockLead(leadRiff[s], t, stepDur * 1.7, true);
      }

      // GRITTY 16-BIT SPEED METAL GUITAR SOLO (Zero Piercing Squeals)
      if (s >= 32) {
        if (s === 32) this.playRockSoloNote(659.3, t, stepDur * 3.6, { harmonic: true, vibrato: true }); // E5 with sub-octave grit
        else if (s === 36) this.playGuitarArp([659.3, 493.9, 392.0, 329.6], t, stepDur * 2.5); // Two-handed tap lick
        else if (s === 40) this.playRockSoloNote(587.3, t, stepDur * 3.2, { bendSemi: 2 }); // D5 bend to E5
        // Fast E Harmonic Minor shred scale
        else if (s === 44) this.playRockSoloNote(329.6, t, stepDur * 0.8);
        else if (s === 45) this.playRockSoloNote(370.0, t, stepDur * 0.8);
        else if (s === 46) this.playRockSoloNote(392.0, t, stepDur * 0.8);
        else if (s === 47) this.playRockSoloNote(440.0, t, stepDur * 0.8);
        else if (s === 48) this.playRockSoloNote(493.9, t, stepDur * 0.8);
        else if (s === 49) this.playRockSoloNote(523.3, t, stepDur * 0.8);
        else if (s === 50) this.playRockSoloNote(622.3, t, stepDur * 0.8);
        else if (s === 51) this.playRockSoloNote(659.3, t, stepDur * 0.8);
        else if (s === 52) this.playRockSoloNote(784.0, t, stepDur * 3.8, { bendSemi: 2, harmonic: true, vibrato: true }); // G5 bend to A5!
        else if (s === 56) this.playGuitarArp([659.3, 523.3, 392.0, 329.6, 246.9], t, stepDur * 3.0);
      }

      // Relentless Double-Kick Gallop Drums
      if (s === 0 || s === 16 || s === 32 || s === 48) this.playCrash(t);
      if (s % 4 === 0 || s % 8 === 2) this.playKick(t, true);
      if (s % 8 === 4) this.playSnare(t);
      if (s % 2 === 0) this.playHiHat(t, s % 4 === 2);

      if (s === 28 || s === 60) this.playTom(240, t);
      if (s === 29 || s === 61) this.playTom(190, t);
      if (s === 30 || s === 62) this.playTom(140, t);
      if (s === 31 || s === 63) { this.playSnare(t); this.playKick(t, true); }

      this.step++;
    }, stepDur * 1000);
  }

  // TRACK 4: "SHADOW CLAN FURY" (Stage 3 Martial Rock with Insen Scale Arps & Solos)
  playStage3RockLoop() {
    // 64-Step B-Minor Martial Hard Rock (Steps 0-31: Insen Arps | Steps 32-63: Ninja Guitar Solo)
    const stepDur = (60 / this.tempo) / 4;

    const bass = [
      // 0-31
      123.5, 123.5, 146.8, 123.5, 164.8, 123.5, 146.8, 110.0,
      98.0,  98.0,  123.5, 98.0,  146.8, 98.0,  123.5, 98.0,
      110.0, 110.0, 130.8, 110.0, 146.8, 110.0, 130.8, 110.0,
      92.5,  92.5,  110.0, 92.5,  123.5, 138.6, 146.8, 164.8,
      // 32-63
      123.5, 123.5, 123.5, 146.8, 123.5, 164.8, 123.5, 146.8,
      98.0,  98.0,  98.0,  123.5, 98.0,  146.8, 98.0,  123.5,
      110.0, 110.0, 110.0, 130.8, 110.0, 146.8, 110.0, 130.8,
      92.5,  92.5,  110.0, 123.5, 138.6, 146.8, 164.8, 185.0
    ];

    const chords = [
      // 0-31
      [246.9, 370.0], 0, [246.9, 370.0], 0, [293.7, 440.0], 0, [246.9, 370.0], 0,
      [196.0, 293.7], 0, [196.0, 293.7], 0, [246.9, 370.0], 0, [196.0, 293.7], 0,
      [220.0, 329.6], 0, [220.0, 329.6], 0, [261.6, 392.0], 0, [220.0, 329.6], 0,
      [185.0, 277.2], 0, [185.0, 277.2], 0, [220.0, 329.6], 0, [246.9, 370.0], 0,
      // 32-63
      [246.9, 370.0], [246.9, 370.0], 0, [246.9, 370.0], 0, [293.7, 440.0], 0, [246.9, 370.0],
      [196.0, 293.7], [196.0, 293.7], 0, [196.0, 293.7], 0, [246.9, 370.0], 0, [196.0, 293.7],
      [220.0, 329.6], [220.0, 329.6], 0, [220.0, 329.6], 0, [261.6, 392.0], 0, [220.0, 329.6],
      [185.0, 277.2], [185.0, 277.2], 0, [185.0, 277.2], 0, 0, 0, 0
    ];

    const leadRiff = [
      246.9, 0, 293.7, 329.6, 370.0, 0, 329.6, 293.7,
      392.0, 0, 370.0, 0,     329.6, 293.7, 246.9, 0,
      440.0, 0, 392.0, 0,     370.0, 329.6, 293.7, 0,
      370.0, 0, 329.6, 370.0, 440.0, 493.9, 554.4, 493.9
    ];

    const arpBank = {
      0:  [123.5, 130.8, 164.8, 185.0, 220.0, 246.9, 261.6], // Bm Insen sweep
      4:  [261.6, 246.9, 220.0, 185.0, 164.8],
      8:  [98.0,  123.5, 146.8, 196.0, 246.9, 293.7],       // G sweep
      12: [293.7, 246.9, 196.0, 146.8],
      16: [110.0, 138.6, 164.8, 220.0, 277.2, 329.6],       // A sweep
      20: [329.6, 277.2, 220.0, 164.8],
      24: [92.5,  116.5, 138.6, 185.0, 233.1, 277.2],       // F# sweep
      28: [277.2, 233.1, 185.0, 138.6, 116.5, 92.5]
    };

    this.timerId = setInterval(() => {
      if (!this.bgmPlaying || !this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const s = this.step % 64;

      if (bass[s] > 0) this.playRockBass(bass[s], t, stepDur * 1.3);
      if (chords[s]) this.playRockChord(chords[s][0], chords[s][1], t, stepDur * 1.4);

      if (s < 32 && arpBank[s]) {
        this.playGuitarArp(arpBank[s], t, stepDur * 3.5);
      }
      if (s < 32 && leadRiff[s] > 0) {
        this.playRockLead(leadRiff[s], t, stepDur * 1.9, true);
      }

      // GRITTY 16-BIT NINJA GUITAR SOLO (Zero Piercing Squeals)
      if (s >= 32) {
        if (s === 32) this.playRockSoloNote(493.9, t, stepDur * 3.4, { bendSemi: 2, vibrato: true }); // B4 bend to C#5
        // Insen shred run
        else if (s === 36) this.playRockSoloNote(493.9, t, stepDur * 0.9);
        else if (s === 37) this.playRockSoloNote(440.0, t, stepDur * 0.9);
        else if (s === 38) this.playRockSoloNote(370.0, t, stepDur * 0.9);
        else if (s === 39) this.playRockSoloNote(329.6, t, stepDur * 0.9);
        else if (s === 40) this.playRockSoloNote(293.7, t, stepDur * 0.9);
        else if (s === 41) this.playRockSoloNote(261.6, t, stepDur * 0.9);
        else if (s === 42) this.playRockSoloNote(740.0, t, stepDur * 3.2, { harmonic: true, vibrato: true }); // F#5 with fat sub-octave grit!
        else if (s === 46) this.playRockSoloNote(554.4, t, stepDur * 2.5, { whammy: true }); // Whammy dip
        else if (s === 50) this.playGuitarArp([246.9, 293.7, 370.0, 493.9, 740.0], t, stepDur * 3.2); // Martial sweep
        else if (s === 54) this.playRockSoloNote(880.0, t, stepDur * 3.5, { harmonic: true, vibrato: true }); // Heavy A5 climax!
      }

      // Drums
      if (s === 0 || s === 32) this.playCrash(t);

      if (s < 32) {
        if (s % 8 === 0 || s % 8 === 5) this.playKick(t);
        if (s % 8 === 4) this.playSnare(t);
        if (s % 2 === 0) this.playHiHat(t, s % 8 === 2);
        if (s === 28) this.playTom(210, t);
        if (s === 29) this.playTom(160, t);
        if (s === 30) this.playTom(110, t);
        if (s === 31) this.playSnare(t);
      } else {
        if (s % 4 === 0 || s % 8 === 2) this.playKick(t, true);
        if (s % 8 === 4) this.playSnare(t);
        if (s % 2 === 0) this.playHiHat(t, true);
        if (s === 60) this.playTom(220, t);
        if (s === 61) this.playTom(170, t);
        if (s === 62) this.playTom(120, t);
        if (s === 63) { this.playSnare(t); this.playKick(t, true); }
      }

      this.step++;
    }, stepDur * 1000);
  }

  // TRACK 5: "GRANDMASTER CLASH" (Boss Battle Furious Dark Metal with Diminished Sweeps & Solo)
  playBossRockLoop() {
    // 64-Step Intense C-Minor Dark Metal (Steps 0-31: Diminished Sweeps | Steps 32-63: Boss Climax Solo)
    const stepDur = (60 / this.tempo) / 4;

    const bass = [
      // 0-31
      130.8, 130.8, 155.6, 130.8, 174.6, 185.0, 196.0, 155.6,
      103.8, 103.8, 130.8, 103.8, 155.6, 103.8, 130.8, 103.8,
      116.5, 116.5, 146.8, 116.5, 174.6, 116.5, 146.8, 116.5,
      98.0,  98.0,  123.5, 98.0,  146.8, 164.8, 185.0, 196.0,
      // 32-63
      130.8, 130.8, 130.8, 155.6, 130.8, 174.6, 130.8, 196.0,
      103.8, 103.8, 103.8, 130.8, 103.8, 155.6, 103.8, 130.8,
      116.5, 116.5, 116.5, 146.8, 116.5, 174.6, 116.5, 146.8,
      98.0,  98.0,  116.5, 130.8, 146.8, 164.8, 196.0, 261.6
    ];

    const chords = [
      // 0-31
      [261.6, 392.0], [261.6, 392.0], 0, [261.6, 392.0], [311.1, 466.2], 0, [261.6, 392.0], 0,
      [207.6, 311.1], [207.6, 311.1], 0, [207.6, 311.1], [261.6, 392.0], 0, [207.6, 311.1], 0,
      [233.1, 349.2], [233.1, 349.2], 0, [233.1, 349.2], [293.7, 440.0], 0, [233.1, 349.2], 0,
      [196.0, 293.7], [196.0, 293.7], 0, [246.9, 370.0], 0, [261.6, 392.0], 0, [293.7, 440.0],
      // 32-63
      [261.6, 392.0], [261.6, 392.0], [261.6, 392.0], 0, [261.6, 392.0], [311.1, 466.2], 0, [261.6, 392.0],
      [207.6, 311.1], [207.6, 311.1], [207.6, 311.1], 0, [207.6, 311.1], [261.6, 392.0], 0, [207.6, 311.1],
      [233.1, 349.2], [233.1, 349.2], [233.1, 349.2], 0, [233.1, 349.2], [293.7, 440.0], 0, [233.1, 349.2],
      [196.0, 293.7], [196.0, 293.7], 0, [196.0, 293.7], 0, 0, 0, 0
    ];

    const leadRiff = [
      261.6, 0, 311.1, 349.2, 370.0, 392.0, 349.2, 311.1,
      415.3, 0, 392.0, 0,     349.2, 311.1, 261.6, 0,
      466.2, 0, 415.3, 0,     392.0, 349.2, 311.1, 0,
      392.0, 0, 370.0, 392.0, 466.2, 523.3, 587.3, 523.3
    ];

    const arpBank = {
      0:  [130.8, 155.6, 196.0, 261.6, 311.1, 392.0, 523.3], // Cm sweep
      4:  [523.3, 392.0, 311.1, 261.6, 196.0],
      8:  [103.8, 130.8, 155.6, 207.6, 261.6, 311.1],       // Ab sweep
      12: [311.1, 261.6, 207.6, 155.6, 130.8],
      16: [87.3,  103.8, 130.8, 174.6, 207.6, 261.6],       // Fm sweep
      20: [261.6, 207.6, 174.6, 130.8, 103.8],
      24: [98.0,  116.5, 138.6, 164.8, 196.0, 233.1, 277.2], // Gdim sweep
      28: [277.2, 233.1, 196.0, 164.8, 138.6, 116.5]
    };

    this.timerId = setInterval(() => {
      if (!this.bgmPlaying || !this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const s = this.step % 64;

      if (bass[s] > 0) this.playRockBass(bass[s], t, stepDur * 1.2);
      if (chords[s]) this.playRockChord(chords[s][0], chords[s][1], t, stepDur * 1.3);

      if (s < 32 && arpBank[s]) {
        this.playGuitarArp(arpBank[s], t, stepDur * 3.4);
      }
      if (s < 32 && leadRiff[s] > 0) {
        this.playRockLead(leadRiff[s], t, stepDur * 1.8, true);
      }

      // GRITTY 16-BIT BOSS CLIMAX GUITAR SOLO (Zero Piercing Squeals)
      if (s >= 32) {
        if (s === 32) this.playRockSoloNote(523.3, t, stepDur * 3.4, { bendSemi: 2, harmonic: true, vibrato: true }); // C5 bend to D5 with sub-octave grit!
        // Diminished shred cascade
        else if (s === 36) this.playRockSoloNote(523.3, t, stepDur * 0.9);
        else if (s === 37) this.playRockSoloNote(466.2, t, stepDur * 0.9);
        else if (s === 38) this.playRockSoloNote(392.0, t, stepDur * 0.9);
        else if (s === 39) this.playRockSoloNote(349.2, t, stepDur * 0.9);
        else if (s === 40) this.playRockSoloNote(311.1, t, stepDur * 0.9);
        else if (s === 41) this.playRockSoloNote(261.6, t, stepDur * 0.9);
        else if (s === 42) this.playRockSoloNote(622.3, t, stepDur * 3.0, { bendSemi: 2, vibrato: true }); // Eb5 bend to F5!
        // Chromatic climb
        else if (s === 46) this.playRockSoloNote(293.7, t, stepDur * 0.8);
        else if (s === 47) this.playRockSoloNote(311.1, t, stepDur * 0.8);
        else if (s === 48) this.playRockSoloNote(329.6, t, stepDur * 0.8);
        else if (s === 49) this.playRockSoloNote(349.2, t, stepDur * 0.8);
        else if (s === 50) this.playRockSoloNote(370.0, t, stepDur * 0.8);
        else if (s === 51) this.playRockSoloNote(392.0, t, stepDur * 0.8);
        else if (s === 52) this.playRockSoloNote(784.0, t, stepDur * 3.5, { harmonic: true, vibrato: true }); // G5 heavy climax!
        else if (s === 56) this.playGuitarArp([523.3, 622.3, 784.0, 880.0], t, stepDur * 2.8);
      }

      // Blast Beats & Double-Kick Assault Drums
      if (s === 0 || s === 16 || s === 32 || s === 48) this.playCrash(t);
      if (s % 4 === 0 || s % 8 === 2) this.playKick(t, true);
      if (s % 8 === 4) this.playSnare(t);
      if (s % 2 === 0) this.playHiHat(t, s % 4 === 2);

      // Climax Blast Roll
      if (s === 28 || s === 60) this.playTom(260, t);
      if (s === 29 || s === 61) this.playTom(200, t);
      if (s === 30 || s === 62) this.playTom(150, t);
      if (s === 31 || s === 63) { this.playSnare(t); this.playKick(t, true); }

      this.step++;
    }, stepDur * 1000);
  }

  // ==========================================
  // CAPTAIN FALCON MEGA PUNCH HOMAGE: "DRAGON KNUCKLE"
  // ==========================================

  // 1. Windup Charging Crescendo ("DRAAAAGOOON...")
  playMegaPunchWindup() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Resonant rising charging sweep (110Hz -> 580Hz)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(580, t + 0.48);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.48);
    if (filter.Q && filter.Q.setValueAtTime) {
      filter.Q.setValueAtTime(1.2, t);
    } else if (filter.Q) {
      filter.Q.value = 1.2;
    }

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0.42, t + 0.44);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.50);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.50);

    // Harmonic chime sparkle during charge
    [220, 330, 440, 554, 659].forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const t2 = this.ctx.currentTime;
        const o2 = this.ctx.createOscillator();
        const g2 = this.ctx.createGain();
        o2.type = 'square';
        o2.frequency.setValueAtTime(freq, t2);
        g2.gain.setValueAtTime(0.14, t2);
        g2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.08);
        o2.connect(g2);
        g2.connect(this.sfxGain);
        o2.start(t2);
        o2.stop(t2 + 0.09);
      }, idx * 75);
    });
  }

  // 2. Explosive Strike Blast ("...KNUCKLE!!!!")
  playMegaPunchRelease() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Earth-shattering Sub-bass boom drop (180Hz -> 36Hz)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(180, t);
    subOsc.frequency.exponentialRampToValueAtTime(36, t + 0.42);

    subGain.gain.setValueAtTime(0.85, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(t);
    subOsc.stop(t + 0.46);

    // 2. High-impact crunchy explosion noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.28);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'lowpass';
    nFilter.frequency.setValueAtTime(900, t);
    nFilter.frequency.exponentialRampToValueAtTime(90, t + 0.28);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.9, t);
    nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t);

    // 3. Screaming Dragon Ki blast wave (square wave drop 620Hz -> 130Hz)
    const blastOsc = this.ctx.createOscillator();
    const blastGain = this.ctx.createGain();
    blastOsc.type = 'square';
    blastOsc.frequency.setValueAtTime(620, t);
    blastOsc.frequency.exponentialRampToValueAtTime(130, t + 0.32);

    blastGain.gain.setValueAtTime(0.55, t);
    blastGain.gain.exponentialRampToValueAtTime(0.01, t + 0.34);

    blastOsc.connect(blastGain);
    blastGain.connect(this.sfxGain);
    blastOsc.start(t);
    blastOsc.stop(t + 0.35);
  }
}

window.SoundEngine = SoundEngine;
window.soundEngine = new SoundEngine();
