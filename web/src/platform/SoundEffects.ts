import {
  audioManager,
  getMasterVolume,
  isSfxEnabled,
  onMasterVolumeChange,
  setMasterVolume,
  setSfxEnabled,
} from "./AudioManager";

export {
  isSfxEnabled,
  setSfxEnabled,
  getMasterVolume,
  setMasterVolume,
  onMasterVolumeChange,
};

class SoundEffects {
  private lastPlayed = new Map<string, number>();

  private context(): AudioContext | null {
    if (!isSfxEnabled()) return null;
    return audioManager.getContext();
  }

  private destination(ctx: AudioContext): AudioNode {
    return audioManager.getSfxBus() ?? ctx.destination;
  }

  private throttle(key: string, minGapMs: number): boolean {
    const now = performance.now();
    const prev = this.lastPlayed.get(key) ?? -Infinity;
    if (now - prev < minGapMs) return false;
    this.lastPlayed.set(key, now);
    return true;
  }

  /** Crisp wooden/stone button click. */
  click(): void {
    if (!this.throttle("click", 45)) return;
    const ctx = this.context();
    if (!ctx) return;
    const vol = getMasterVolume() * 0.22;
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.045);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    osc.connect(gain).connect(this.destination(ctx));
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** Warm marimba/flute double-chirp when selecting a villager or building. */
  select(): void {
    if (!this.throttle("select", 90)) return;
    const ctx = this.context();
    if (!ctx) return;
    const vol = getMasterVolume() * 0.2;
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    [392, 523.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const t = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(gain).connect(this.destination(ctx));
      osc.start(t);
      osc.stop(t + 0.085);
    });
  }

  /** Tribal drum thud when issuing a move/work/attack command. */
  order(): void {
    if (!this.throttle("order", 90)) return;
    const ctx = this.context();
    if (!ctx) return;
    const vol = getMasterVolume() * 0.28;
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.11);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain).connect(this.destination(ctx));
    osc.start(now);
    osc.stop(now + 0.125);
  }

  /** Stone/wood construction knock when placing or upgrading a building. */
  build(): void {
    if (!this.throttle("build", 120)) return;
    const ctx = this.context();
    if (!ctx) return;
    const vol = getMasterVolume() * 0.25;
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    [220, 330, 440].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + idx * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.07);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      osc.connect(gain).connect(this.destination(ctx));
      osc.start(t);
      osc.stop(t + 0.08);
    });
  }

  /** Urgent tribal war-horn when the tribe is under attack. */
  alert(): void {
    if (!this.throttle("alert", 1500)) return;
    const ctx = this.context();
    if (!ctx) return;
    const vol = getMasterVolume() * 0.3;
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    [293.66, 277.18].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, now);
      const t = now + idx * 0.22;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(filter).connect(gain).connect(this.destination(ctx));
      osc.start(t);
      osc.stop(t + 0.21);
    });
  }

  /** Gentle chime for tribe notices (births, completed buildings, etc.). */
  message(): void {
    if (!this.throttle("message", 400)) return;
    const ctx = this.context();
    if (!ctx) return;
    const vol = getMasterVolume() * 0.18;
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    [587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const t = now + idx * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(gain).connect(this.destination(ctx));
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  /** Victory fanfare or defeat low chord. */
  outcome(won: boolean): void {
    if (!this.throttle("outcome", 1000)) return;
    const ctx = this.context();
    if (!ctx) return;
    const vol = getMasterVolume() * 0.28;
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    const notes = won ? [261.63, 329.63, 392.0, 523.25] : [220, 196, 174.61, 146.83];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + idx * 0.11;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(this.destination(ctx));
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  /** Radiant tribal fanfare when an achievement is unlocked. */
  achievement(): void {
    if (!this.throttle("achievement", 800)) return;
    const ctx = this.context();
    if (!ctx) return;
    const vol = getMasterVolume() * 0.32;
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === notes.length - 1 ? "sine" : "triangle";
      const t = now + idx * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (idx === notes.length - 1 ? 0.6 : 0.28));
      osc.connect(gain).connect(this.destination(ctx));
      osc.start(t);
      osc.stop(t + (idx === notes.length - 1 ? 0.65 : 0.3));
    });
  }
}

export const sfx = new SoundEffects();
