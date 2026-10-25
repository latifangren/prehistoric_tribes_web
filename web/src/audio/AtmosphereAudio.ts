import { getMasterVolume, isSfxEnabled, onMasterVolumeChange } from "../platform/SoundEffects";

const AMBIENCE_KEY = "pt.ambience";

export function isAmbienceEnabled(): boolean {
  try {
    const val = localStorage.getItem(AMBIENCE_KEY);
    return val === null ? true : val === "on";
  } catch {
    return true;
  }
}

export function setAmbienceEnabled(on: boolean): void {
  try {
    localStorage.setItem(AMBIENCE_KEY, on ? "on" : "off");
  } catch {
    // ignore
  }
  if (!on) {
    atmosphereAudio.stop();
  } else {
    atmosphereAudio.start();
  }
}

/**
 * Procedural prehistoric atmosphere and dynamic tribal war drums using the Web Audio API.
 * - Wind & nature soundscape: organic breeze with subtle natural modulation and occasional wildlife chirps.
 * - Dynamic battle drums: polyrhythmic tribal percussion that swells during combat / Call to Arms,
 *   and gracefully recedes to peaceful wilderness when danger passes.
 */
class AtmosphereAudio {
  private ctx: AudioContext | null = null;
  private running = false;
  private lastDangerTime = -Infinity;
  private callToArmsActive = false;

  // Audio Nodes
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private battleDrumsGain: GainNode | null = null;

  // Wind nodes
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  // Loop timer
  private drumTimer: number | null = null;
  private wildlifeTimer: number | null = null;
  private stepBeat = 0;

  private initContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!isSfxEnabled() || !isAmbienceEnabled()) return null;

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    if (!this.ctx) {
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  start(): void {
    if (this.running) return;
    const ctx = this.initContext();
    if (!ctx) return;

    this.running = true;

    // Master atmosphere gain
    const master = ctx.createGain();
    master.gain.setValueAtTime(getMasterVolume() * 0.45, ctx.currentTime);
    master.connect(ctx.destination);
    this.masterGain = master;

    onMasterVolumeChange((vol) => {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(vol * 0.45, this.ctx.currentTime, 0.05);
      }
    });

    // Sub-gains
    this.windGain = ctx.createGain();
    this.windGain.gain.setValueAtTime(0.35, ctx.currentTime);
    this.windGain.connect(master);

    this.battleDrumsGain = ctx.createGain();
    this.battleDrumsGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.battleDrumsGain.connect(master);

    this.startWind(ctx);
    this.scheduleDrums();
    this.scheduleWildlife();
  }

  stop(): void {
    this.running = false;
    if (this.drumTimer !== null) {
      window.clearTimeout(this.drumTimer);
      this.drumTimer = null;
    }
    if (this.wildlifeTimer !== null) {
      window.clearTimeout(this.wildlifeTimer);
      this.wildlifeTimer = null;
    }
    try {
      this.windSource?.stop();
      this.windSource?.disconnect();
    } catch {
      // ignore
    }
    this.windSource = null;
    this.masterGain?.disconnect();
    this.masterGain = null;
  }

  /** Inform the atmosphere of a battle attack event. */
  triggerCombat(): void {
    this.lastDangerTime = performance.now();
    this.checkMusicState();
  }

  setCallToArms(active: boolean): void {
    this.callToArmsActive = active;
    this.checkMusicState();
  }

  /** Checks whether battle drums should be playing or fading out. */
  updateState(now: number, callToArms: boolean, hasNearbyHostiles = false): void {
    if (!this.running) return;
    this.callToArmsActive = callToArms;
    const isDangerRecent = now - this.lastDangerTime < 8500;
    const shouldBattle = this.callToArmsActive || isDangerRecent || hasNearbyHostiles;

    if (!this.ctx || !this.battleDrumsGain) return;
    const targetDrumGain = shouldBattle ? 0.7 : 0.0001;
    const current = this.battleDrumsGain.gain.value;

    if (Math.abs(current - targetDrumGain) > 0.01) {
      const timeConst = shouldBattle ? 0.4 : 2.2;
      this.battleDrumsGain.gain.setTargetAtTime(targetDrumGain, this.ctx.currentTime, timeConst);
    }
  }

  private checkMusicState(): void {
    this.updateState(performance.now(), this.callToArmsActive);
  }

  /** Synthesizes organic looping wind/breeze. */
  private startWind(ctx: AudioContext): void {
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Pink noise / brownian approximation for natural wind
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteSource = ctx.createBufferSource();
    whiteSource.buffer = noiseBuffer;
    whiteSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(380, ctx.currentTime);
    this.windFilter = filter;

    // Slow LFO for organic wind surging
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.18, ctx.currentTime); // ~5.5s period
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(140, ctx.currentTime);
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    if (this.windGain) {
      whiteSource.connect(filter).connect(this.windGain);
      whiteSource.start();
      this.windSource = whiteSource;
    }
  }

  /** Prehistoric rhythm loop: rhythmic war drums (deep tom + wooden strike). */
  private scheduleDrums(): void {
    if (!this.running) return;

    const tempoMs = 155; // ~97 BPM in eighth notes
    this.playDrumStep(this.stepBeat);
    this.stepBeat = (this.stepBeat + 1) % 8;

    this.drumTimer = window.setTimeout(() => this.scheduleDrums(), tempoMs);
  }

  private playDrumStep(step: number): void {
    if (!this.ctx || !this.battleDrumsGain) return;
    if (this.battleDrumsGain.gain.value < 0.01) return; // Silent, skip synthesizing

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Pattern in 8 steps (4/4 time in eighth notes):
    // Step 0: Strong Bass Drum + Rim
    // Step 2: Wood tap
    // Step 4: Mid Tom + Rim
    // Step 6: Double Kick / Syncopated Tom
    // Step 7: Ghost note
    if (step === 0) {
      this.hitBassDrum(ctx, now, 1.0, 110, 42);
      this.hitWoodblock(ctx, now + 0.02, 0.4, 820);
    } else if (step === 2) {
      this.hitWoodblock(ctx, now, 0.5, 960);
    } else if (step === 4) {
      this.hitBassDrum(ctx, now, 0.85, 130, 48);
      this.hitWoodblock(ctx, now + 0.01, 0.35, 780);
    } else if (step === 5) {
      this.hitWoodblock(ctx, now, 0.25, 1100);
    } else if (step === 6) {
      this.hitBassDrum(ctx, now, 0.9, 105, 40);
    } else if (step === 7) {
      this.hitBassDrum(ctx, now, 0.4, 95, 42);
    }
  }

  /** Synthesizes a deep resonant tribal war drum. */
  private hitBassDrum(
    ctx: AudioContext,
    time: number,
    intensity: number,
    startFreq: number,
    endFreq: number,
  ): void {
    if (!this.battleDrumsGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.12);

    const drumVol = intensity * 0.75;
    gain.gain.setValueAtTime(drumVol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.26);

    osc.connect(gain).connect(this.battleDrumsGain);
    osc.start(time);
    osc.stop(time + 0.28);
  }

  /** Synthesizes a dry wooden tribal stick / rim tap. */
  private hitWoodblock(ctx: AudioContext, time: number, intensity: number, freq: number): void {
    if (!this.battleDrumsGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, time + 0.035);

    const vol = intensity * 0.35;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    osc.connect(gain).connect(this.battleDrumsGain);
    osc.start(time);
    osc.stop(time + 0.045);
  }

  /** Subtle periodic wildlife chirps/insects in peaceful mode. */
  private scheduleWildlife(): void {
    if (!this.running) return;

    const nextGapMs = 5000 + Math.random() * 8000;
    this.wildlifeTimer = window.setTimeout(() => {
      this.playWildlifeChirp();
      this.scheduleWildlife();
    }, nextGapMs);
  }

  private playWildlifeChirp(): void {
    if (!this.ctx || !this.windGain || !this.running) return;
    // Don't play wildlife while heavy battle drums are pounding
    if (this.battleDrumsGain && this.battleDrumsGain.gain.value > 0.25) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const baseFreq = 1600 + Math.random() * 800;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.35, now + 0.04);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.9, now + 0.08);

    const chirpVol = (getMasterVolume() * 0.08) * (isAmbienceEnabled() ? 1 : 0);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(chirpVol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain).connect(this.windGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }
}

export const atmosphereAudio = new AtmosphereAudio();
