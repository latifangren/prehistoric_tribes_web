import { ZH_LANGUAGE } from "../text/LegacyZhText";
import { audioManager } from "../platform/AudioManager";
import { getMasterVolume, isSfxEnabled } from "../platform/SoundEffects";
import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { UNIT_ENERGY, UNIT_HP } from "../core/DenseLayout";

const WEATHER_ENABLED_KEY = "pt.weather";

export function isWeatherEnabled(): boolean {
  try {
    const val = localStorage.getItem(WEATHER_ENABLED_KEY);
    return val === null ? true : val === "on";
  } catch {
    return true;
  }
}

export function setWeatherEnabled(on: boolean): void {
  try {
    localStorage.setItem(WEATHER_ENABLED_KEY, on ? "on" : "off");
  } catch {
    // ignore quota error
  }
}

export type WeatherMode = "clear" | "rain" | "snow";

type RainDrop = {
  x: number;
  y: number;
  speed: number;
  length: number;
  thickness: number;
  alpha: number;
};

type SnowFlake = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  driftAngle: number;
  alpha: number;
};

type Ripple = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
};

export class WeatherSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private currentMode: WeatherMode = "clear";
  private rainDrops: RainDrop[] = [];
  private snowFlakes: SnowFlake[] = [];
  private ripples: Ripple[] = [];
  private lastCycleTime = performance.now();
  private cycleDurationMs = 150000; // 2.5 minutes per weather phase
  private lightningAlpha = 0;
  private lastLightningTime = 0;
  private audioCtx: AudioContext | null = null;
  private rainGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private enabled = true;
  private onWeatherChange?: (mode: WeatherMode) => void;
  private lastEffectTime = 0;
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "weather-canvas";
    this.canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;";
    this.ctx = this.canvas.getContext("2d");
    this.enabled = isWeatherEnabled();
    this.initParticles(300, 300);
  }

  mount(parent: HTMLElement): void {
    if (!parent.contains(this.canvas)) {
      parent.append(this.canvas);
    }
  }

  resize(width: number, height: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.initParticles(width, height);
    }
  }

  getMode(): WeatherMode {
    return this.currentMode;
  }

  setOnWeatherChange(cb: (mode: WeatherMode) => void): void {
    this.onWeatherChange = cb;
  }

  setMode(mode: WeatherMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.updateWeatherAudio();
    this.onWeatherChange?.(mode);
  }

  applyGameplayEffects(runtime: LegacyRuntimeState, now: number): void {
    if (!this.enabled || now - this.lastEffectTime < 3000) return;
    this.lastEffectTime = now;

    const dense = runtime.denseState;

    if (this.currentMode === "snow") {
      // Freezing cold: outdoor villagers lose energy slightly faster
      for (let id = 1; id <= 50; id += 1) {
        if ((dense[UNIT_HP + id] ?? 0) > 0) {
          const energy = dense[UNIT_ENERGY + id] ?? 50;
          if (energy > 5) dense[UNIT_ENERGY + id] = energy - 1;
        }
      }
    } else if (this.currentMode === "rain") {
      // Rain nourishes berry vegetation: subtle natural food bonus
      const row = runtime.mainArrays.aShort[0];
      if (row && row[1] !== undefined && row[1] < 990) {
        row[1] = Math.min(999, row[1] + 1);
      }
    }
  }
  setEnabled(on: boolean): void {
    this.enabled = on;
    setWeatherEnabled(on);
    if (!on) {
      this.stopWeatherAudio();
      this.clearCanvas();
    } else {
      this.updateWeatherAudio();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private initParticles(w: number, h: number): void {
    this.rainDrops = [];
    for (let i = 0; i < 90; i += 1) {
      this.rainDrops.push({
        x: Math.random() * w,
        y: Math.random() * h,
        speed: 550 + Math.random() * 350,
        length: 12 + Math.random() * 10,
        thickness: 1 + Math.random() * 1.2,
        alpha: 0.35 + Math.random() * 0.45,
      });
    }

    this.snowFlakes = [];
    for (let i = 0; i < 80; i += 1) {
      this.snowFlakes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: 1.5 + Math.random() * 2.5,
        speed: 40 + Math.random() * 60,
        drift: 20 + Math.random() * 25,
        driftAngle: Math.random() * Math.PI * 2,
        alpha: 0.4 + Math.random() * 0.5,
      });
    }
  }

  private clearCanvas(): void {
    if (this.ctx && this.canvas.width > 0 && this.canvas.height > 0) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === "undefined" || !isSfxEnabled() || !this.enabled) return null;
    this.audioCtx = audioManager.getContext();
    return this.audioCtx;
  }

  private updateWeatherAudio(): void {
    if (!this.enabled || !isSfxEnabled()) {
      this.stopWeatherAudio();
      return;
    }
    if (this.currentMode === "rain") {
      this.startRainAudio();
    } else {
      this.stopWeatherAudio();
    }
  }

  private startRainAudio(): void {
    const ctx = this.ensureAudioContext();
    if (!ctx || this.rainSource) return;

    // Generate smooth pink noise for rain patter
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Filter to sound like rain hitting foliage
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;

    const gain = ctx.createGain();
    const vol = getMasterVolume() * 0.12;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1.2);

    const destination = audioManager.getWeatherBus() ?? ctx.destination;
    source.connect(filter).connect(gain).connect(destination);
    source.start();

    this.rainSource = source;
    this.rainGain = gain;
  }

  private stopWeatherAudio(): void {
    if (this.rainGain && this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        this.rainGain.gain.setValueAtTime(this.rainGain.gain.value, now);
        this.rainGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
        window.setTimeout(() => {
          this.rainSource?.stop();
          this.rainSource?.disconnect();
          this.rainSource = null;
          this.rainGain = null;
        }, 650);
      } catch {
        this.rainSource = null;
        this.rainGain = null;
      }
    } else {
      this.rainSource = null;
      this.rainGain = null;
    }
  }

  private triggerThunder(): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = getMasterVolume() * 0.22;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 1.2);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(160, now);
    filter.frequency.linearRampToValueAtTime(50, now + 1.2);

    gain.gain.setValueAtTime(vol * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    const destination = audioManager.getWeatherBus() ?? ctx.destination;
    osc.connect(filter).connect(gain).connect(destination);
    osc.start(now);
    osc.stop(now + 1.45);
  }

  tick(now: number, deltaMs: number): void {
    if (!this.enabled) return;

    // Cycle between Clear -> Rain -> Clear -> Snow
    if (now - this.lastCycleTime > this.cycleDurationMs) {
      this.lastCycleTime = now;
      if (this.currentMode === "clear") {
        this.setMode(Math.random() > 0.4 ? "rain" : "snow");
      } else {
        this.setMode("clear");
      }
    }

    const dt = Math.min(0.1, deltaMs / 1000);
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0 || !this.ctx) return;

    // Lightning effect in rain
    if (this.currentMode === "rain") {
      if (now - this.lastLightningTime > 18000 + Math.random() * 22000) {
        this.lastLightningTime = now;
        this.lightningAlpha = 0.45;
        this.triggerThunder();
      }
    }

    if (this.lightningAlpha > 0) {
      this.lightningAlpha = Math.max(0, this.lightningAlpha - dt * 2.2);
    }

    // Update ripples
    for (let i = this.ripples.length - 1; i >= 0; i -= 1) {
      const rip = this.ripples[i]!;
      rip.radius += dt * 30;
      rip.alpha -= dt * 1.5;
      if (rip.alpha <= 0 || rip.radius >= rip.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }

    // Render pass
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    if (this.currentMode === "rain") {
      // Draw rain drops
      ctx.strokeStyle = "rgba(186, 218, 255, 0.75)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const d of this.rainDrops) {
        d.x += dt * 80; // slight slant
        d.y += dt * d.speed;
        if (d.y > h) {
          d.y = -d.length;
          d.x = Math.random() * w;
          // Spawn ripple
          if (this.ripples.length < 24 && Math.random() < 0.25) {
            this.ripples.push({
              x: d.x,
              y: h - Math.random() * (h * 0.4),
              radius: 2,
              maxRadius: 8 + Math.random() * 6,
              alpha: 0.35,
            });
          }
        }
        if (d.x > w) d.x = 0;

        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 3, d.y + d.length);
      }
      ctx.stroke();

      // Draw ground ripples
      ctx.lineWidth = 1;
      for (const rip of this.ripples) {
        ctx.strokeStyle = `rgba(200, 225, 255, ${Math.max(0, rip.alpha)})`;
        ctx.beginPath();
        ctx.ellipse(rip.x, rip.y, rip.radius, rip.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Cool bluish tint
      ctx.fillStyle = "rgba(10, 24, 45, 0.08)";
      ctx.fillRect(0, 0, w, h);
    } else if (this.currentMode === "snow") {
      // Draw snowflakes
      for (const s of this.snowFlakes) {
        s.driftAngle += dt * 2.5;
        s.x += Math.cos(s.driftAngle) * s.drift * dt;
        s.y += s.speed * dt;
        if (s.y > h) {
          s.y = -s.radius;
          s.x = Math.random() * w;
        }
        if (s.x > w) s.x = 0;
        if (s.x < 0) s.x = w;

        ctx.fillStyle = `rgba(240, 248, 255, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Frosty icy tint
      ctx.fillStyle = "rgba(180, 220, 255, 0.05)";
      ctx.fillRect(0, 0, w, h);
    } else {
      // Warm savanna clear day: subtle warm vignette
      ctx.fillStyle = "rgba(255, 220, 150, 0.02)";
      ctx.fillRect(0, 0, w, h);
    }

    // Flash from lightning
    if (this.lightningAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

export const weatherSystem = new WeatherSystem();
