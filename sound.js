/* ============================================================
   WEB AUDIO SOUND ENGINE — Procedural Foley & Music Box
   Zero external audio files, 100% reliable, zero latency.
   ============================================================ */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.activeNodes = [];
    this.masterGain = null;
    this.isMusicPlaying = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.8, now + 0.08);
    }
    if (muted && this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
      this.isMusicPlaying = false;
    }
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  /* --- 1. Bow String Tension / Creak --- */
  playDraw(intensity = 0.5) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      const baseFreq = 95 + intensity * 110;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq + 25, now + 0.12);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450 + intensity * 350, now);
      filter.Q.setValueAtTime(3.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07 * intensity, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (_) {}
  }

  /* --- 2. String Release Twang & Wind Whoosh --- */
  playRelease() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;

      // Twang: fast downward pitch sine
      const twangOsc = this.ctx.createOscillator();
      const twangGain = this.ctx.createGain();
      twangOsc.type = 'sine';
      twangOsc.frequency.setValueAtTime(380, now);
      twangOsc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

      twangGain.gain.setValueAtTime(0.35, now);
      twangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      twangOsc.connect(twangGain);
      twangGain.connect(this.masterGain);
      twangOsc.start(now);
      twangOsc.stop(now + 0.24);

      // Wind Whoosh: filtered white noise buffer
      const bufferSize = this.ctx.sampleRate * 0.32;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + 0.12);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.3);
      filter.Q.setValueAtTime(2.2, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.24, now + 0.08);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      whiteNoise.start(now);
    } catch (_) {}
  }

  /* --- 3. Arrow Hits Heart (Crystal Chime Chord) --- */
  playHit() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Shimmering chord: E5, G#5, B5, E6, G#6
      const freqs = [659.25, 830.61, 987.77, 1318.51, 1661.22];

      freqs.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.018);

        const startTime = now + i * 0.018;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.18 / (i * 0.5 + 1), startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2 + i * 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + 1.4);
      });
    } catch (_) {}
  }

  /* --- 4. Rose Flood Swell --- */
  playFlood() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;

      // Deep resonant sub-harmonic swell
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.8);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 1.2);
    } catch (_) {}
  }

  /* --- 5. Kinetic Letters Wish (Harp / Glockenspiel Notes) --- */
  playWishNote(noteIndex = 0) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Warm pentatonic scale: F4, G4, Bb4, C5, D5, F5, G5, Bb5, C6
      const scale = [349.23, 392.0, 466.16, 523.25, 587.33, 698.46, 783.99, 932.33, 1046.5];
      const freq = scale[noteIndex % scale.length];

      const osc = this.ctx.createOscillator();
      const overtone = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2.76, now); // Metallic chime bell ratio

      const overtoneGain = this.ctx.createGain();
      overtoneGain.gain.setValueAtTime(0.08, now);
      overtone.connect(overtoneGain);
      overtoneGain.connect(gain);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      overtone.start(now);
      osc.stop(now + 0.7);
      overtone.stop(now + 0.7);
    } catch (_) {}
  }

  /* --- 6. Golden Light Bloom --- */
  playBloom() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]; // C major 7 shimmer

      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const delay = idx * 0.045;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.linearRampToValueAtTime(0.14 / (idx * 0.3 + 1), now + delay + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + delay);
        osc.stop(now + delay + 1.5);
      });
    } catch (_) {}
  }

  /* --- 7. Music Box: Gentle "Happy Birthday" Melody --- */
  playNote(freq, startTime, duration = 0.45, volume = 0.16) {
    if (!this.ctx || this.muted) return;
    try {
      const osc = this.ctx.createOscillator();
      const overtone = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Sweet music-box harmonic overtone
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, startTime);

      const otGain = this.ctx.createGain();
      otGain.gain.setValueAtTime(volume * 0.35, startTime);
      overtone.connect(otGain);
      otGain.connect(gain);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      overtone.start(startTime);
      osc.stop(startTime + duration + 0.05);
      overtone.stop(startTime + duration + 0.05);
    } catch (_) {}
  }

  playBirthdaySong() {
    if (this.muted || !this.ctx || this.isMusicPlaying) return;
    this.isMusicPlaying = true;

    const NOTE_FREQS = {
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
      G4: 392.00, A4: 440.00, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
      G5: 783.99, A5: 880.00, B5: 987.77, C6: 1046.50
    };

    // "Happy Birthday to you" notes with timing
    const song = [
      // Verse 1: Happy birthday to you
      { n: 'G4', d: 0.32, t: 0.0 },
      { n: 'G4', d: 0.32, t: 0.38 },
      { n: 'A4', d: 0.65, t: 0.75 },
      { n: 'G4', d: 0.65, t: 1.45 },
      { n: 'C5', d: 0.65, t: 2.15 },
      { n: 'B4', d: 1.20, t: 2.85 },

      // Verse 2: Happy birthday to you
      { n: 'G4', d: 0.32, t: 4.30 },
      { n: 'G4', d: 0.32, t: 4.68 },
      { n: 'A4', d: 0.65, t: 5.05 },
      { n: 'G4', d: 0.65, t: 5.75 },
      { n: 'D5', d: 0.65, t: 6.45 },
      { n: 'C5', d: 1.20, t: 7.15 },

      // Verse 3: Happy birthday dear ...
      { n: 'G4', d: 0.32, t: 8.60 },
      { n: 'G4', d: 0.32, t: 8.98 },
      { n: 'G5', d: 0.70, t: 9.35 },
      { n: 'E5', d: 0.70, t: 10.10 },
      { n: 'C5', d: 0.70, t: 10.85 },
      { n: 'B4', d: 0.70, t: 11.60 },
      { n: 'A4', d: 1.10, t: 12.35 },

      // Verse 4: Happy birthday to you!
      { n: 'F5', d: 0.32, t: 13.70 },
      { n: 'F5', d: 0.32, t: 14.08 },
      { n: 'E5', d: 0.70, t: 14.45 },
      { n: 'C5', d: 0.70, t: 15.20 },
      { n: 'D5', d: 0.70, t: 15.95 },
      { n: 'C5', d: 1.80, t: 16.70 },
    ];

    const t0 = this.ctx.currentTime + 0.15;
    song.forEach((item) => {
      const f = NOTE_FREQS[item.n];
      if (f) {
        this.playNote(f, t0 + item.t, item.d + 0.3, 0.15);
      }
    });

    const totalDuration = 18.5 * 1000;
    this.musicTimer = setTimeout(() => {
      this.isMusicPlaying = false;
    }, totalDuration);
  }

  stopBirthdaySong() {
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.isMusicPlaying = false;
  }

  /* --- 8. Sparkle Chime on Tree Petal Burst --- */
  playSparkle() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const pitches = [1046.5, 1318.5, 1567.98, 2093.0];
      const p = pitches[Math.floor(Math.random() * pitches.length)];
      this.playNote(p, now, 0.35, 0.08);
    } catch (_) {}
  }
}

export const soundEngine = new SoundEngine();
