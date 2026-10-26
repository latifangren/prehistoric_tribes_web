import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { BLD_HP, BLD_KIND, BLD_X, BLD_Y, UNIT_HP } from "../core/DenseLayout";
import type { WideScreen } from "../WideScreen";

const DAY_NIGHT_ENABLED_KEY = "pt.dayNight";

export function isDayNightEnabled(): boolean {
  try {
    const val = localStorage.getItem(DAY_NIGHT_ENABLED_KEY);
    return val === null ? true : val === "on";
  } catch {
    return true;
  }
}

export function setDayNightEnabled(on: boolean): void {
  try {
    localStorage.setItem(DAY_NIGHT_ENABLED_KEY, on ? "on" : "off");
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

export class DayNightCycle {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  /** Current time in 24-hour decimal (starts at 08:30 morning). */
  private time = 8.5;
  /** Duration in seconds for a full 24-hour cycle at 1x speed (6 minutes = 360s). */
  private cycleDurationSec = 360;
  private enabled = true;
  private lastTickTime = performance.now();

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
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
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

    // Organic flame flicker factor
    const flicker =
      0.94 +
      0.06 * Math.sin(now * 0.007) +
      0.03 * Math.cos(now * 0.015) +
      0.02 * Math.sin(now * 0.023);

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
          x: center.x,
          y: center.y,
          radius: Math.round(145 * flicker),
          color: "#ffb300",
        });
      }
      // Lookout Tower (Torch)
      else if (kind === 11) {
        const pos = screen.tileToCss(tx + 1, ty + 1);
        lights.push({
          x: pos.x,
          y: pos.y,
          radius: Math.round(95 * flicker),
          color: "#ffa000",
        });
      }
      // Disco (Party Light)
      else if (kind === 7) {
        const pos = screen.tileToCss(tx + 1.5, ty + 1.5);
        lights.push({
          x: pos.x,
          y: pos.y,
          radius: Math.round(110 * (0.9 + 0.1 * Math.sin(now * 0.01))),
          color: "#ff7043",
        });
      }
      // Sanctuary / Shaman Temple (Mystic Braziers)
      else if (kind === 8) {
        const pos = screen.tileToCss(tx + 1.5, ty + 1.5);
        lights.push({
          x: pos.x,
          y: pos.y,
          radius: Math.round(105 * flicker),
          color: "#ffd54f",
        });
      }
      // Kitchen (Cooking Hearth)
      else if (kind === 4) {
        const pos = screen.tileToCss(tx + 1.5, ty + 1.5);
        lights.push({
          x: pos.x,
          y: pos.y,
          radius: Math.round(85 * flicker),
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
        x: tile.x,
        y: tile.y - 12,
        radius: Math.round(75 * flicker),
        color: "#ffb74d",
      });
    }

    return lights;
  }

  tick(
    now: number,
    deltaMs: number,
    speed: 1 | 2 | 4,
    runtime: LegacyRuntimeState,
    screen: WideScreen,
  ): void {
    if (!this.enabled) return;

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
      // Step A: Cut holes in the darkness
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

        const grad = ctx.createRadialGradient(
          light.x,
          light.y,
          Math.max(1, light.radius * 0.12),
          light.x,
          light.y,
          light.radius,
        );
        grad.addColorStop(0, "rgba(0, 0, 0, 1)");
        grad.addColorStop(0.65, "rgba(0, 0, 0, 0.75)");
        grad.addColorStop(0.9, "rgba(0, 0, 0, 0.35)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Step B: Add warm golden fire glow on the rim
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

        const glowGrad = ctx.createRadialGradient(
          light.x,
          light.y,
          Math.max(1, light.radius * 0.1),
          light.x,
          light.y,
          light.radius,
        );
        glowGrad.addColorStop(0, "rgba(255, 185, 45, 0.28)");
        glowGrad.addColorStop(0.5, "rgba(255, 130, 20, 0.12)");
        glowGrad.addColorStop(0.85, "rgba(255, 90, 0, 0.03)");
        glowGrad.addColorStop(1, "rgba(255, 80, 0, 0)");

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

export const dayNightCycle = new DayNightCycle();
