/**
 * Shared, robust AudioContext singleton for Prehistoric Tribes Web.
 * Ensures a single hardware context across all sound sub-systems:
 * - SoundEffects (UI clicks, alerts, unit shouts)
 * - AtmosphereAudio (Ambient wind and dynamic tribal battle drums)
 * - OriginalMidiPlayer (J2ME /sa MIDI synthesis)
 * - WeatherSystem (Rain, snow, procedural thunder)
 */

const SFX_KEY = "pt.sfx";
const VOLUME_KEY = "pt.volume";

export function isSfxEnabled(): boolean {
  try {
    const val = localStorage.getItem(SFX_KEY);
    return val === null ? true : val === "on";
  } catch {
    return true;
  }
}

export function setSfxEnabled(on: boolean): void {
  try {
    localStorage.setItem(SFX_KEY, on ? "on" : "off");
  } catch {
    // ignore storage errors
  }
}

export function getMasterVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 0.75;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.75;
  } catch {
    return 0.75;
  }
}

export function setMasterVolume(vol: number): void {
  const clamped = Math.max(0, Math.min(1, vol));
  try {
    localStorage.setItem(VOLUME_KEY, String(clamped));
  } catch {
    // ignore storage errors
  }
  audioManager.updateMasterVolume(clamped);
}

const onVolumeChangeCallbacks = new Set<(vol: number) => void>();
export function onMasterVolumeChange(cb: (vol: number) => void): () => void {
  onVolumeChangeCallbacks.add(cb);
  return () => onVolumeChangeCallbacks.delete(cb);
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private weatherGain: GainNode | null = null;
  private unlockAttached = false;

  constructor() {
    this.attachUnlockListeners();
  }

  private attachUnlockListeners(): void {
    if (typeof window === "undefined" || this.unlockAttached) return;
    this.unlockAttached = true;
    const unlock = () => {
      this.resume();
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
  }

  /** Gets or lazily creates the single shared AudioContext */
  getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor =
      typeof AudioContext !== "undefined"
        ? AudioContext
        : (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    if (!this.ctx) {
      const created = new Ctor();
      this.ctx = created;
      this.initBuses(created);
    }
    const current = this.ctx;
    if (current && current.state === "suspended") {
      void current.resume().catch(() => {});
    }
    return current;
  }

  private initBuses(ctx: AudioContext): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(getMasterVolume(), ctx.currentTime);
    master.connect(ctx.destination);
    this.masterGain = master;

    const sfx = ctx.createGain();
    sfx.gain.setValueAtTime(1.0, ctx.currentTime);
    sfx.connect(master);
    this.sfxGain = sfx;

    const music = ctx.createGain();
    music.gain.setValueAtTime(1.0, ctx.currentTime);
    music.connect(master);
    this.musicGain = music;

    const ambience = ctx.createGain();
    ambience.gain.setValueAtTime(1.0, ctx.currentTime);
    ambience.connect(master);
    this.ambienceGain = ambience;

    const weather = ctx.createGain();
    weather.gain.setValueAtTime(1.0, ctx.currentTime);
    weather.connect(master);
    this.weatherGain = weather;
  }

  getMasterBus(): GainNode | null {
    this.getContext();
    return this.masterGain;
  }

  getSfxBus(): GainNode | null {
    this.getContext();
    return this.sfxGain;
  }

  getMusicBus(): GainNode | null {
    this.getContext();
    return this.musicGain;
  }

  getAmbienceBus(): GainNode | null {
    this.getContext();
    return this.ambienceGain;
  }

  getWeatherBus(): GainNode | null {
    this.getContext();
    return this.weatherGain;
  }

  resume(): void {
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
  }

  updateMasterVolume(vol: number): void {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.03);
    }
    onVolumeChangeCallbacks.forEach((cb) => cb(vol));
  }
}

export const audioManager = new AudioManager();
