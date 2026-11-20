// Lightweight Web Audio API sound synthesizer for KeySprint Arcade SFX

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getCtx(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.06) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore audio autoplay blocks
    }
  }

  playKey() {
    this.beep(680, 0.035, 'triangle', 0.035);
  }

  playError() {
    this.beep(175, 0.09, 'sawtooth', 0.055);
  }

  playCountdown(go = false) {
    this.beep(go ? 880 : 440, go ? 0.24 : 0.12, 'sine', 0.08);
  }

  playFinish() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.beep(n, 0.18, 'triangle', 0.07), idx * 85);
    });
  }
}

export const soundEngine = new SoundEngine();
