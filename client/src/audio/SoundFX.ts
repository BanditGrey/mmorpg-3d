class SoundFXManager {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playTone(freq: number, duration = 0.08, type: OscillatorType = 'triangle', vol = 0.06) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  public hit(isCrit = false) {
    this.playTone(isCrit ? 520 : 220, 0.09, isCrit ? 'sawtooth' : 'triangle', isCrit ? 0.08 : 0.05);
  }

  public click() {
    this.playTone(440, 0.04, 'sine', 0.03);
  }

  public levelUp() {
    this.playTone(523, 0.12, 'triangle', 0.07);
    setTimeout(() => this.playTone(659, 0.12, 'triangle', 0.07), 90);
    setTimeout(() => this.playTone(784, 0.2, 'triangle', 0.08), 180);
  }
}

export const sfx = new SoundFXManager();
