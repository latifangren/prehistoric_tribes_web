import { readStorage, writeStorage } from "../platform/Storage";
import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import {
  BLD_HP,
  BLD_KIND,
  BLD_X,
  BLD_Y,
  UNIT_ENERGY,
  UNIT_HAPPINESS,
  UNIT_HP,
  UNIT_MODE,
  UNIT_ORDER,
  UNIT_SELECTION,
  UNIT_TARGET_X,
  UNIT_TARGET_Y,
  UNIT_TYPE,
  UNIT_X,
  UNIT_Y,
} from "../core/DenseLayout";
import type { WideScreen } from "../WideScreen";
import { weatherSystem } from "./WeatherSystem";
const DAY_NIGHT_ENABLED_KEY = "pt.dayNight";

export function isDayNightEnabled(): boolean {
  try {
    const val = readStorage(DAY_NIGHT_ENABLED_KEY);
    return val === null ? true : val === "on";
  } catch {
    return true;
  }
}

export function setDayNightEnabled(on: boolean): void {
  try {
    void writeStorage(DAY_NIGHT_ENABLED_KEY, on ? "on" : "off");
  } catch {
    // ignore storage error
  }
}

export type TimePhase = "dawn" | "day" | "dusk" | "night";

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: string;
}
const SPRITE_SIZE = 256;
let punchSprite: HTMLCanvasElement | null = null;
let glowSprite: HTMLCanvasElement | null = null;

function getOrCreateLightSprites(): { punch: HTMLCanvasElement | null; glow: HTMLCanvasElement | null } {
  if (typeof document === "undefined") return { punch: null, glow: null };
  if (!punchSprite) {
    const cvs = document.createElement("canvas");
    cvs.width = SPRITE_SIZE;
    cvs.height = SPRITE_SIZE;
    const ctx = cvs.getContext("2d");
    if (ctx) {
      const half = SPRITE_SIZE / 2;
      const grad = ctx.createRadialGradient(half, half, half * 0.12, half, half, half);
      grad.addColorStop(0, "rgba(0, 0, 0, 1)");
      grad.addColorStop(0.65, "rgba(0, 0, 0, 0.75)");
      grad.addColorStop(0.9, "rgba(0, 0, 0, 0.35)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(half, half, half, 0, Math.PI * 2);
      ctx.fill();
      punchSprite = cvs;
    }
  }
  if (!glowSprite) {
    const cvs = document.createElement("canvas");
    cvs.width = SPRITE_SIZE;
    cvs.height = SPRITE_SIZE;
    const ctx = cvs.getContext("2d");
    if (ctx) {
      const half = SPRITE_SIZE / 2;
      const grad = ctx.createRadialGradient(half, half, half * 0.1, half, half, half);
      grad.addColorStop(0, "rgba(255, 185, 45, 0.28)");
      grad.addColorStop(0.5, "rgba(255, 130, 20, 0.12)");
      grad.addColorStop(0.85, "rgba(255, 90, 0, 0.03)");
      grad.addColorStop(1, "rgba(255, 80, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(half, half, half, 0, Math.PI * 2);
      ctx.fill();
      glowSprite = cvs;
    }
  }
  return { punch: punchSprite, glow: glowSprite };
}

export class DayNightCycle {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  /** Current time in 24-hour decimal (starts at 08:30 morning). */
  private time = 8.5;
  /** Duration in seconds for a full 24-hour cycle at 1x speed (6 minutes = 360s). */
  private cycleDurationSec = 360;
  private enabled = true;
  private lastTickTime = performance.now();
  private scaleFactor = 1;
  private lastSleepRoutineTime = 0;
  private awakenedThisCycle = false;
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "day-night-canvas";
    this.canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;";
    this.ctx = this.canvas.getContext("2d");
    this.enabled = isDayNightEnabled();
  }

  mount(parent: HTMLElement): void {
    if (!parent.contains(this.canvas)) {
      parent.append(this.canvas);
    }
  }

  resize(width: number, height: number): void {
    this.scaleFactor = width > 1280 ? 1280 / width : 1;
    const cw = Math.max(1, Math.round(width * this.scaleFactor));
    const ch = Math.max(1, Math.round(height * this.scaleFactor));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    setDayNightEnabled(on);
    if (!on && this.ctx && this.canvas.width > 0) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getTime(): number {
    return this.time;
  }

  setTime(time: number): void {
    this.time = (time % 24 + 24) % 24;
  }

  getTimeFormatted(): string {
    const hours = Math.floor(this.time);
    const minutes = Math.floor((this.time - hours) * 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  getPhase(): TimePhase {
    if (this.time >= 5 && this.time < 8) return "dawn";
    if (this.time >= 8 && this.time < 16.5) return "day";
    if (this.time >= 16.5 && this.time < 19.5) return "dusk";
    return "night";
  }

  /** Calculates ambient darkness color and alpha depending on time of day. */
  private getAmbient(): { r: number; g: number; b: number; a: number; warmTint?: string } {
    const t = this.time;

    // 08:00 - 16:30: Clear daylight
    if (t >= 8 && t < 16.5) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }

    // 16:30 - 19:30: Dusk (Sunset transition)
    if (t >= 16.5 && t < 19.5) {
      const p = (t - 16.5) / 3.0; // 0..1
      // Warm golden/orange sunset transitioning into deep nocturnal blue
      const r = Math.round(210 * (1 - p) + 8 * p);
      const g = Math.round(80 * (1 - p) + 14 * p);
      const b = Math.round(20 * (1 - p) + 32 * p);
      const a = 0.05 + p * 0.58;
      const warmTint = `rgba(235, 110, 30, ${(0.22 * (1 - p)).toFixed(3)})`;
      return { r, g, b, a, warmTint };
    }

    // 05:00 - 08:00: Dawn (Sunrise transition)
    if (t >= 5 && t < 8) {
      const p = (t - 5) / 3.0; // 0..1
      // Deep blue fading into golden dawn, then clear
      const r = Math.round(8 * (1 - p) + 240 * p);
      const g = Math.round(14 * (1 - p) + 160 * p);
      const b = Math.round(32 * (1 - p) + 50 * p);
      const a = Math.max(0, 0.63 * (1 - p) - 0.05);
      const warmTint = `rgba(255, 190, 80, ${(0.18 * Math.sin(p * Math.PI)).toFixed(3)})`;
      return { r, g, b, a, warmTint };
    }

    // 19:30 - 05:00: Full Night
    return { r: 6, g: 12, b: 28, a: 0.65 };
  }

  /**
   * Scans living buildings and key units in the tribe to extract active light sources.
   */
  private collectLightSources(
    runtime: LegacyRuntimeState,
    screen: WideScreen,
    now: number,
  ): LightSource[] {
    const lights: LightSource[] = [];
    const dense = runtime.denseState;
    const s = this.scaleFactor;

    // Organic flame flicker factor, dampened slightly in rain
    const rainDampen = weatherSystem.getMode() === "rain" ? 0.8 : 1.0;
    const flicker =
      (0.94 +
      0.06 * Math.sin(now * 0.007) +
      0.03 * Math.cos(now * 0.015) +
      0.02 * Math.sin(now * 0.023)) * rainDampen;

    // 1. Scan Tribe Buildings 1..30 (Team 0)
    for (let id = 1; id <= 30; id += 1) {
      const hp = dense[BLD_HP + id] ?? 0;
      if (hp <= 0) continue;
      const kind = dense[BLD_KIND + id] ?? 0;
      const tx = dense[BLD_X + id] ?? 0;
      const ty = dense[BLD_Y + id] ?? 0;

      // Chief's Hut (Campfire hub)
      if (kind === 3) {
        const center = screen.tileToCss(tx + 1.5, ty + 1.5);
        lights.push({
          x: center.x * s,
          y: center.y * s,
          radius: Math.round(145 * flicker * s),
          color: "#ffb300",
        });
      }
      // Lookout Tower (Torch)
      else if (kind === 11) {
        const pos = screen.tileToCss(tx + 1, ty + 1);
        lights.push({
          x: pos.x * s,
          y: pos.y * s,
          radius: Math.round(95 * flicker * s),
          color: "#ffa000",
        });
      }
      // Disco (Party Light)
      else if (kind === 7) {
        const pos = screen.tileToCss(tx + 1.5, ty + 1.5);
        lights.push({
          x: pos.x * s,
          y: pos.y * s,
          radius: Math.round(110 * (0.9 + 0.1 * Math.sin(now * 0.01)) * s),
          color: "#ff7043",
        });
      }
      // Sanctuary / Shaman Temple (Mystic Braziers)
      else if (kind === 8) {
        const pos = screen.tileToCss(tx + 1.5, ty + 1.5);
        lights.push({
          x: pos.x * s,
          y: pos.y * s,
          radius: Math.round(105 * flicker * s),
          color: "#ffd54f",
        });
      }
      // Kitchen (Cooking Hearth)
      else if (kind === 4) {
        const pos = screen.tileToCss(tx + 1.5, ty + 1.5);
        lights.push({
          x: pos.x * s,
          y: pos.y * s,
          radius: Math.round(85 * flicker * s),
          color: "#ff9800",
        });
      }
    }

    // 2. Chief walking at night carries a personal torch
    const chiefId = runtime.mainArrays.aShort[0]?.[17] ?? 0;
    if (chiefId > 0 && (dense[UNIT_HP + chiefId] ?? 0) > 0) {
      const tile = screen.tileToCss(
        (dense[0 + chiefId] ?? 0) + 0.5,
        (dense[101 + chiefId] ?? 0) + 0.5,
      );
      lights.push({
        x: tile.x * s,
        y: (tile.y - 12) * s,
        radius: Math.round(75 * flicker * s),
        color: "#ffb74d",
      });
    }

    return lights;
  }

  /**
   * Natural sleep routine: at night (21:00 - 05:00), idle/tired villagers
   * walk home to their huts to rest and wake up energized at dawn.
   */
  private applyNightSleepRoutine(runtime: LegacyRuntimeState, now: number): void {
    if (now - this.lastSleepRoutineTime < 2500) return;
    this.lastSleepRoutineTime = now;

    const dense = runtime.denseState;
    const isLateNight = this.time >= 21.0 || this.time < 5.0;

    if (isLateNight) {
      this.awakenedThisCycle = false;
      for (let id = 1; id <= 50; id += 1) {
        if ((dense[UNIT_HP + id] ?? 0) <= 0) continue;
        // Never disturb units selected by player or executing an order
        if ((dense[UNIT_SELECTION + id] ?? 0) !== 0 || (dense[UNIT_ORDER + id] ?? 0) !== 0) continue;

        const home = dense[3434 + id] ?? 0;
        if (home <= 0 || (dense[BLD_HP + home] ?? 0) <= 0) continue;

        const hx = dense[BLD_X + home] ?? 0;
        const hy = dense[BLD_Y + home] ?? 0;
        const ux = dense[UNIT_X + id] ?? 0;
        const uy = dense[UNIT_Y + id] ?? 0;

        // Already in or near home hut: recover energy
        if (Math.abs(ux - hx) <= 1 && Math.abs(uy - hy) <= 1) {
          const energy = dense[UNIT_ENERGY + id] ?? 50;
          if (energy < 99) {
            dense[UNIT_ENERGY + id] = Math.min(99, energy + 2);
          }
          continue;
        }

        // Tired or deep night: head home to sleep
        const energy = dense[UNIT_ENERGY + id] ?? 50;
        if (energy < 75 || this.time >= 22.0 || this.time < 4.0) {
          dense[UNIT_TARGET_X + id] = hx;
          dense[UNIT_TARGET_Y + id] = hy;
          dense[UNIT_MODE + id] = 1;
        }
      }
    } else if (this.time >= 18.5 && this.time < 20.8) {
      // Evening tribal gathering: idle villagers relax near campfire, boosting happiness
      let campX = 0;
      let campY = 0;
      for (let b = 1; b <= 30; b += 1) {
        if ((dense[BLD_HP + b] ?? 0) <= 0) continue;
        const k = dense[BLD_KIND + b] ?? 0;
        if (k === 3 || k === 7) {
          campX = dense[BLD_X + b] ?? 0;
          campY = dense[BLD_Y + b] ?? 0;
          break;
        }
      }
      if (campX > 0) {
        for (let id = 1; id <= 50; id += 1) {
          if ((dense[UNIT_HP + id] ?? 0) <= 0) continue;
          if ((dense[UNIT_SELECTION + id] ?? 0) !== 0 || (dense[UNIT_ORDER + id] ?? 0) !== 0) continue;
          if ((dense[UNIT_TYPE + id] ?? 0) !== 69) continue;

          const ux = dense[UNIT_X + id] ?? 0;
          const uy = dense[UNIT_Y + id] ?? 0;
          const dist = Math.hypot(ux - campX, uy - campY);
          if (dist <= 3) {
            const hap = dense[UNIT_HAPPINESS + id] ?? 50;
            if (hap < 85) dense[UNIT_HAPPINESS + id] = hap + 1;
          } else if (dist <= 10) {
            dense[UNIT_TARGET_X + id] = campX;
            dense[UNIT_TARGET_Y + id] = campY;
            dense[UNIT_MODE + id] = 1;
          }
        }
      }
    } else if (this.time >= 5.5 && this.time < 7.5 && !this.awakenedThisCycle) {
      // Dawn awakening: villagers wake up refreshed with max energy
      this.awakenedThisCycle = true;
      for (let id = 1; id <= 50; id += 1) {
        if ((dense[UNIT_HP + id] ?? 0) > 0) {
          const currentEnergy = dense[UNIT_ENERGY + id] ?? 50;
          dense[UNIT_ENERGY + id] = Math.max(currentEnergy, 95);
        }
      }
    }
  }

  tick(
    now: number,
    deltaMs: number,
    speed: 1 | 2 | 4,
    runtime: LegacyRuntimeState,
    screen: WideScreen,
  ): void {
    if (!this.enabled) return;

    this.applyNightSleepRoutine(runtime, now);

    const dtSec = Math.min(0.2, deltaMs / 1000) * speed;
    // Progress world clock (24 hours per cycleDurationSec)
    const hoursPerSec = 24 / this.cycleDurationSec;
    this.time = (this.time + dtSec * hoursPerSec) % 24;

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0 || !this.ctx) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    const ambient = this.getAmbient();

    // In bright daylight, nothing to darken or cut out
    if (ambient.a <= 0.01 && !ambient.warmTint) return;

    // Apply sunset / sunrise warm tint if present
    if (ambient.warmTint) {
      ctx.fillStyle = ambient.warmTint;
      ctx.fillRect(0, 0, w, h);
    }

    if (ambient.a <= 0.02) return;

    // Render dark ambient mask
    ctx.save();
    ctx.fillStyle = `rgba(${ambient.r}, ${ambient.g}, ${ambient.b}, ${ambient.a.toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);

    // Punch out light circles around campfires & torches
    const lights = this.collectLightSources(runtime, screen, now);

    if (lights.length > 0) {
      const { punch, glow } = getOrCreateLightSprites();
      if (punch) {
        ctx.globalCompositeOperation = "destination-out";
        for (const light of lights) {
          if (
            light.x < -light.radius ||
            light.x > w + light.radius ||
            light.y < -light.radius ||
            light.y > h + light.radius
          ) {
            continue;
          }
          const d = light.radius * 2;
          ctx.drawImage(punch, light.x - light.radius, light.y - light.radius, d, d);
        }
      }
      if (glow) {
        ctx.globalCompositeOperation = "source-over";
        for (const light of lights) {
          if (
            light.x < -light.radius ||
            light.x > w + light.radius ||
            light.y < -light.radius ||
            light.y > h + light.radius
          ) {
            continue;
          }
          const d = light.radius * 2;
          ctx.drawImage(glow, light.x - light.radius, light.y - light.radius, d, d);
        }
      }
    }

    ctx.restore();
  }
}

export const dayNightCycle = new DayNightCycle();
