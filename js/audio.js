/* ==========================================================================
   STRIKE OF DESTINY — Web Audio API Retro SFX Synthesizer
   9 Core Categories + Playable Demo Sound Effects
   ========================================================================== */

(function (global) {
  'use strict';

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.masterVolume = 0.24;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    setEnabled(val) {
      this.enabled = Boolean(val);
    }

    playTone({
      type = 'square',
      freqStart = 440,
      freqEnd = 440,
      duration = 0.12,
      delay = 0,
      volume = 1,
      exponential = true
    }) {
      if (!this.enabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freqStart), now);
      if (freqEnd !== freqStart) {
        if (exponential && freqEnd > 0 && freqStart > 0) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
        } else {
          osc.frequency.linearRampToValueAtTime(Math.max(20, freqEnd), now + duration);
        }
      }

      const peak = Math.max(0.001, this.masterVolume * volume);
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    playNoise({ duration = 0.1, delay = 0, volume = 0.5, filterFreq = 1200, filterType = 'bandpass' }) {
      if (!this.enabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime + delay;
      const sampleCount = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, now);

      const gain = ctx.createGain();
      const peak = Math.max(0.001, this.masterVolume * volume);
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration + 0.02);
    }

    // 1. Bullet SFX
    playBullet() {
      this.playTone({ type: 'square', freqStart: 520, freqEnd: 140, duration: 0.09, volume: 0.65 });
      this.playNoise({ duration: 0.05, volume: 0.35, filterFreq: 1800, filterType: 'highpass' });
    }

    // 2. Kunai SFX
    playKunai() {
      this.playTone({ type: 'triangle', freqStart: 1350, freqEnd: 420, duration: 0.075, volume: 0.7 });
      this.playNoise({ duration: 0.06, volume: 0.4, filterFreq: 3200, filterType: 'bandpass' });
    }

    // 3. Shadow Ability SFX (Dash / Shadow / Lightning)
    playShadow() {
      this.playTone({ type: 'sawtooth', freqStart: 220, freqEnd: 680, duration: 0.14, volume: 0.55 });
      this.playTone({ type: 'sine', freqStart: 480, freqEnd: 110, duration: 0.18, delay: 0.04, volume: 0.5 });
      this.playNoise({ duration: 0.15, volume: 0.4, filterFreq: 900, filterType: 'bandpass' });
    }

    // 4. Player SFX (Slash / Hurt / Effort)
    playPlayer() {
      this.playTone({ type: 'sawtooth', freqStart: 320, freqEnd: 95, duration: 0.13, volume: 0.7 });
      this.playNoise({ duration: 0.09, volume: 0.45, filterFreq: 1100, filterType: 'lowpass' });
    }

    // 5. Enemy SFX (Hit / Undead Growl)
    playEnemy() {
      this.playTone({ type: 'sawtooth', freqStart: 165, freqEnd: 62, duration: 0.11, volume: 0.65 });
      this.playTone({ type: 'square', freqStart: 110, freqEnd: 48, duration: 0.09, delay: 0.02, volume: 0.4 });
    }

    // 6. XP Pickup
    playXP() {
      this.playTone({ type: 'sine', freqStart: 784, freqEnd: 1046, duration: 0.07, volume: 0.55 });
      this.playTone({ type: 'triangle', freqStart: 1174, freqEnd: 1568, duration: 0.08, delay: 0.045, volume: 0.5 });
    }

    // 7. Level-Up Fanfare
    playLevelUp() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, idx) => {
        this.playTone({
          type: 'square',
          freqStart: n,
          freqEnd: n * 1.01,
          duration: idx === 3 ? 0.28 : 0.11,
          delay: idx * 0.085,
          volume: 0.65
        });
      });
    }

    // 8. Upgrade Selection / Blacksmith Forge
    playUpgrade() {
      this.playTone({ type: 'triangle', freqStart: 440, freqEnd: 880, duration: 0.09, volume: 0.65 });
      this.playTone({ type: 'square', freqStart: 659.25, freqEnd: 1318.5, duration: 0.18, delay: 0.07, volume: 0.6 });
    }

    // 9. Victory Fanfare
    playVictory() {
      const seq = [
        { f: 523.25, d: 0.11, t: 0.0 },
        { f: 659.25, d: 0.11, t: 0.11 },
        { f: 783.99, d: 0.11, t: 0.22 },
        { f: 1046.5, d: 0.2, t: 0.34 },
        { f: 783.99, d: 0.1, t: 0.56 },
        { f: 1046.5, d: 0.42, t: 0.68 }
      ];
      seq.forEach((s) => {
        this.playTone({ type: 'square', freqStart: s.f, freqEnd: s.f, duration: s.d, delay: s.t, volume: 0.65 });
        this.playTone({ type: 'triangle', freqStart: s.f / 2, freqEnd: s.f / 2, duration: s.d, delay: s.t, volume: 0.45 });
      });
    }

    // Extra Hero / Game SFX
    playSword() {
      this.playNoise({ duration: 0.11, volume: 0.55, filterFreq: 1600, filterType: 'bandpass' });
      this.playTone({ type: 'sawtooth', freqStart: 380, freqEnd: 110, duration: 0.12, volume: 0.6 });
    }

    playPoison() {
      this.playNoise({ duration: 0.12, volume: 0.45, filterFreq: 2600, filterType: 'highpass' });
      this.playTone({ type: 'sine', freqStart: 620, freqEnd: 240, duration: 0.14, delay: 0.03, volume: 0.5 });
    }

    playLightning() {
      this.playNoise({ duration: 0.14, volume: 0.55, filterFreq: 3600, filterType: 'bandpass' });
      this.playTone({ type: 'sawtooth', freqStart: 1480, freqEnd: 260, duration: 0.12, volume: 0.55 });
    }

    playCoin() {
      this.playTone({ type: 'square', freqStart: 987.77, freqEnd: 987.77, duration: 0.055, volume: 0.48 });
      this.playTone({ type: 'square', freqStart: 1318.5, freqEnd: 1318.5, duration: 0.11, delay: 0.055, volume: 0.5 });
    }

    playHurt() {
      this.playTone({ type: 'sawtooth', freqStart: 210, freqEnd: 55, duration: 0.18, volume: 0.75 });
    }

    playBossSpawn() {
      const notes = [146.83, 138.59, 130.81, 98.0];
      notes.forEach((f, i) => {
        this.playTone({ type: 'sawtooth', freqStart: f, freqEnd: f * 0.92, duration: 0.24, delay: i * 0.18, volume: 0.7 });
      });
    }

    playGameOver() {
      const notes = [392.0, 349.23, 311.13, 261.63];
      notes.forEach((f, i) => {
        this.playTone({ type: 'sawtooth', freqStart: f, freqEnd: f * 0.95, duration: 0.22, delay: i * 0.17, volume: 0.6 });
      });
    }

    playByCategory(category) {
      switch (category) {
        case 'bullet': return this.playBullet();
        case 'kunai': return this.playKunai();
        case 'shadow': return this.playShadow();
        case 'player': return this.playPlayer();
        case 'enemy': return this.playEnemy();
        case 'xp': return this.playXP();
        case 'levelup': return this.playLevelUp();
        case 'upgrade': return this.playUpgrade();
        case 'victory': return this.playVictory();
        default: return this.playUpgrade();
      }
    }
  }

  global.SODAudio = new SoundEngine();
})(window);
