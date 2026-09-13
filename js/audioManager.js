// ============================================================================
// audioManager.js — Client-side Web Audio API manager for zero-latency,
// impulse-scaled physics sound synthesis and audio buffer playback.
// ============================================================================

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.isInitialized = false;

    // Standard audio asset paths
    this.assetPaths = {
      ball: 'assets/audio/ball_hit.wav',
      cushion: 'assets/audio/cushion_hit.wav',
      cue: 'assets/audio/cue_strike.wav',
      pocket: 'assets/audio/pocket_drop.wav',
    };
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.isInitialized = true;
      this._loadAssets();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  async _loadAssets() {
    for (const [key, url] of Object.entries(this.assetPaths)) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          this.buffers.set(key, audioBuffer);
        }
      } catch (e) {
        // Asset missing or failed decode - fallback to oscillator synthesis
      }
    }
  }

  // Calculate volume using logarithmic scaling based on impulse speed
  _calculateVolume(impulse, minImpulse = 1.0, maxImpulse = 40.0) {
    if (impulse <= 0) return 0;
    // Math.log10 scaling
    const normalized = Math.min(Math.max((impulse - minImpulse) / (maxImpulse - minImpulse), 0), 1);
    const logVol = Math.log10(1 + 9 * normalized); // 0.0 to 1.0
    return Math.min(Math.max(logVol, 0.05), 1.0);
  }

  playBallHit(impulse = 10.0) {
    if (!this.ctx) return;
    this.resume();

    const volume = this._calculateVolume(impulse, 0.5, 30.0);
    if (this.buffers.has('ball')) {
      this._playBuffer('ball', volume);
    } else {
      this._synthBallHit(volume);
    }
  }

  playCushionHit(impulse = 10.0) {
    if (!this.ctx) return;
    this.resume();

    const volume = this._calculateVolume(impulse, 1.0, 35.0);
    if (this.buffers.has('cushion')) {
      this._playBuffer('cushion', volume);
    } else {
      this._synthCushionHit(volume);
    }
  }

  playCueStrike(speed = 15.0) {
    if (!this.ctx) return;
    this.resume();

    const volume = this._calculateVolume(speed, 2.0, 40.0);
    if (this.buffers.has('cue')) {
      this._playBuffer('cue', volume);
    } else {
      this._synthCueStrike(volume);
    }
  }

  playPocketDrop() {
    if (!this.ctx) return;
    this.resume();

    if (this.buffers.has('pocket')) {
      this._playBuffer('pocket', 0.8);
    } else {
      this._synthPocketDrop(0.8);
    }
  }

  _playBuffer(key, volume) {
    const buffer = this.buffers.get(key);
    if (!buffer || !this.ctx) return;

    const source = this.ctx.createBufferSource();
    const gainNode = this.ctx.createGain();
    source.buffer = buffer;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    source.start(0);
  }

  // Fallback Synthesizer: High-frequency click for Ball-vs-Ball
  _synthBallHit(volume) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);

    gain.gain.setValueAtTime(volume * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Fallback Synthesizer: Low-frequency thud for Ball-vs-Cushion
  _synthCushionHit(volume) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    gain.gain.setValueAtTime(volume * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Fallback Synthesizer: Leather transient strike for Cue-vs-Ball
  _synthCueStrike(volume) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

    gain.gain.setValueAtTime(volume * 0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Fallback Synthesizer: Hollow pocket drop sound
  _synthPocketDrop(volume) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.15);

    gain.gain.setValueAtTime(volume * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }
}

export const audioManager = new AudioManager();
