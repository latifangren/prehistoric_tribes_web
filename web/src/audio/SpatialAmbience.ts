import { audioManager } from "../platform/AudioManager";
import { getMasterVolume, isSfxEnabled } from "../platform/SoundEffects";
import { isAmbienceEnabled } from "./AtmosphereAudio";
import { dayNightCycle } from "../render/DayNightCycle";
import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { BLD_HP, BLD_KIND, BLD_X, BLD_Y } from "../core/DenseLayout";

export class SpatialAmbienceManager {
  private ctx: AudioContext | null = null;
  private running = false;
  private villageGain: GainNode | null = null;
  private cricketsGain: GainNode | null = null;
  private cricketsOsc: OscillatorNode | null = null;
  private lastUpdate = 0;

  start(): void {
    if (this.running || typeof window === "undefined" || !isAmbienceEnabled() || !isSfxEnabled()) return;
    this.ctx = audioManager.getContext();
    if (!this.ctx) return;

    try {
      this.villageGain = this.ctx.createGain();
      this.villageGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.villageGain.connect(this.ctx.destination);

      // Night Crickets oscillator with subtle rhythmic tremolo
      this.cricketsGain = this.ctx.createGain();
      this.cricketsGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.cricketsGain.connect(this.ctx.destination);

      this.cricketsOsc = this.ctx.createOscillator();
      this.cricketsOsc.type = "sine";
      this.cricketsOsc.frequency.setValueAtTime(4800, this.ctx.currentTime);
      this.cricketsOsc.connect(this.cricketsGain);
      this.cricketsOsc.start();

      this.running = true;
    } catch {
      // AudioContext policy
    }
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    try {
      this.cricketsOsc?.stop();
      this.cricketsOsc?.disconnect();
      this.villageGain?.disconnect();
      this.cricketsGain?.disconnect();
    } catch {
      // ignore
    }
    this.cricketsOsc = null;
    this.villageGain = null;
    this.cricketsGain = null;
  }

  tick(runtime: LegacyRuntimeState, now: number): void {
    if (!isAmbienceEnabled() || !isSfxEnabled()) {
      if (this.running) this.stop();
      return;
    }
    if (!this.running) this.start();
    if (!this.running || !this.ctx || now - this.lastUpdate < 300) return;
    this.lastUpdate = now;

    const dense = runtime.denseState;
    const game = runtime.game;
    const camX = game.cameraColumn + game.cursorColumn;
    const camY = game.cameraRow + game.cursorRow;

    // Find village center (Chief Hut 3 or first living building)
    let vx = 25;
    let vy = 25;
    for (let b = 1; b <= 30; b += 1) {
      if ((dense[BLD_HP + b] ?? 0) <= 0) continue;
      if ((dense[BLD_KIND + b] ?? 0) === 3) {
        vx = dense[BLD_X + b] ?? 25;
        vy = dense[BLD_Y + b] ?? 25;
        break;
      }
    }

    const distToVillage = Math.hypot(camX - vx, camY - vy);
    // In village (dist <= 6): full village hearth volume; in deep forest (dist >= 18): 0
    const villageProximity = Math.max(0, Math.min(1, 1 - (distToVillage - 4) / 14));
    const master = getMasterVolume();

    const isNight = dayNightCycle.getPhase() === "night";
    const cricketTarget = isNight ? master * 0.045 : 0;
    const villageTarget = master * 0.05 * villageProximity;

    const t = this.ctx.currentTime;
    this.villageGain?.gain.setTargetAtTime(villageTarget, t, 0.4);

    // Crickets pulse periodically
    if (this.cricketsGain && isNight) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.016);
      this.cricketsGain.gain.setTargetAtTime(cricketTarget * pulse, t, 0.1);
    } else {
      this.cricketsGain?.gain.setTargetAtTime(0, t, 0.4);
    }
  }
}

export const spatialAmbience = new SpatialAmbienceManager();
