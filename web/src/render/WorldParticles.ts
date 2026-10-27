import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import {
  ANIMAL_HP,
  ANIMAL_KIND,
  ANIMAL_X,
  ANIMAL_Y,
  BLD_HP,
  BLD_KIND,
  BLD_X,
  BLD_Y,
  UNIT_HP,
  UNIT_MODE,
  UNIT_TYPE,
  UNIT_X,
  UNIT_Y,
} from "../core/DenseLayout";
import type { WideScreen } from "../WideScreen";
import { weatherSystem } from "./WeatherSystem";
import { dayNightCycle } from "./DayNightCycle";

interface Footprint {
  tx: number;
  ty: number;
  bornAt: number;
  lifeMs: number;
  isBeast: boolean;
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  bornAt: number;
  lifeMs: number;
}

interface Critter {
  tx: number;
  ty: number;
  seed: number;
}

interface Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bornAt: number;
  lifeMs: number;
}

interface WorkChip {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  bornAt: number;
  lifeMs: number;
}

export class WorldParticles {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private enabled = true;

  private footprints: Footprint[] = [];
  private smokePuffs: SmokePuff[] = [];
  private critters: Critter[] = [];
  private birds: Bird[] = [];
  private workChips: WorkChip[] = [];

  private lastFootprintTime = 0;
  private lastSmokeTime = 0;
  private lastWorkChipTime = 0;
  private lastCritterInit = false;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "world-particles-canvas";
    this.canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;";
    this.ctx = this.canvas.getContext("2d");
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
    if (!on) {
      this.footprints.length = 0;
      this.smokePuffs.length = 0;
      this.birds.length = 0;
      this.workChips.length = 0;
      if (this.ctx && this.canvas.width > 0) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  triggerBirdScatter(tileX: number, tileY: number, screen: WideScreen): void {
    if (!this.enabled) return;
    const pos = screen.tileToCss(tileX, tileY);
    const now = performance.now();
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI * 0.75 + (Math.random() - 0.5) * 1.2;
      const speed = 1.8 + Math.random() * 1.6;
      this.birds.push({
        x: pos.x + (Math.random() - 0.5) * 16,
        y: pos.y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        bornAt: now,
        lifeMs: 2200 + Math.random() * 800,
      });
    }
    if (this.birds.length > 25) this.birds.splice(0, this.birds.length - 25);
  }

  tick(now: number, runtime: LegacyRuntimeState, screen: WideScreen): void {
    if (!this.enabled) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0 || !this.ctx) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    const dense = runtime.denseState;
    const weather = weatherSystem.getMode();
    const isNight = dayNightCycle.getPhase() === "night";

    // 1. Footprints Generator (Snow / Rain Mud)
    if (weather !== "clear" && now - this.lastFootprintTime > 650) {
      this.lastFootprintTime = now;
      for (let id = 1; id <= 50; id += 1) {
        if ((dense[UNIT_HP + id] ?? 0) <= 0) continue;
        const mode = (dense[UNIT_MODE + id] ?? 0) & 0xff;
        if (mode >= 1 && mode <= 7) {
          const ux = dense[UNIT_X + id] ?? 0;
          const uy = dense[UNIT_Y + id] ?? 0;
          this.footprints.push({
            tx: ux + (Math.random() - 0.5) * 0.3,
            ty: uy + (Math.random() - 0.5) * 0.3,
            bornAt: now,
            lifeMs: weather === "snow" ? 14000 : 9000,
            isBeast: false,
          });
        }
      }
      for (let a = 0; a < 22; a += 1) {
        if ((dense[ANIMAL_HP + a] ?? 0) <= 0) continue;
        const ax = dense[ANIMAL_X + a] ?? 0;
        const ay = dense[ANIMAL_Y + a] ?? 0;
        this.footprints.push({
          tx: ax,
          ty: ay,
          bornAt: now,
          lifeMs: 12000,
          isBeast: (dense[ANIMAL_KIND + a] ?? 0) === 0,
        });
      }
      if (this.footprints.length > 100) this.footprints.splice(0, this.footprints.length - 100);
    }

    // Render Footprints
    const fpColor = weather === "snow" ? "rgba(220, 235, 255, " : "rgba(68, 52, 38, ";
    for (let i = this.footprints.length - 1; i >= 0; i -= 1) {
      const fp = this.footprints[i]!;
      const age = now - fp.bornAt;
      if (age >= fp.lifeMs) {
        this.footprints.splice(i, 1);
        continue;
      }
      const alpha = (1 - age / fp.lifeMs) * (fp.isBeast ? 0.45 : 0.28);
      const pos = screen.tileToCss(fp.tx, fp.ty);
      if (pos.x < -20 || pos.x > w + 20 || pos.y < -20 || pos.y > h + 20) continue;

      ctx.fillStyle = `${fpColor}${alpha.toFixed(3)})`;
      ctx.beginPath();
      if (fp.isBeast) {
        ctx.arc(pos.x, pos.y, 4.5, 0, Math.PI * 2);
      } else {
        ctx.ellipse(pos.x, pos.y, 2.2, 1.4, Math.PI * 0.2, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // 2. Chimney & Hearth Smoke Puffs
    if (now - this.lastSmokeTime > 420) {
      this.lastSmokeTime = now;
      for (let b = 1; b <= 30; b += 1) {
        if ((dense[BLD_HP + b] ?? 0) <= 0) continue;
        const k = dense[BLD_KIND + b] ?? 0;
        // Chief Hut (3), Kitchen (4), Armoury (5), Disco (7)
        if (k === 3 || k === 4 || k === 5 || k === 7) {
          const bx = dense[BLD_X + b] ?? 0;
          const by = dense[BLD_Y + b] ?? 0;
          const pos = screen.tileToCss(bx + 1.2, by + 0.4);
          this.smokePuffs.push({
            x: pos.x + (Math.random() - 0.5) * 8,
            y: pos.y + (Math.random() - 0.5) * 6,
            vx: 0.25 + (Math.random() - 0.5) * 0.2,
            vy: -0.65 - Math.random() * 0.35,
            size: 4 + Math.random() * 3,
            bornAt: now,
            lifeMs: 2200 + Math.random() * 800,
          });
        }
      }
      if (this.smokePuffs.length > 60) this.smokePuffs.splice(0, this.smokePuffs.length - 60);
    }

    // Render Smoke
    for (let i = this.smokePuffs.length - 1; i >= 0; i -= 1) {
      const p = this.smokePuffs[i]!;
      const age = now - p.bornAt;
      if (age >= p.lifeMs) {
        this.smokePuffs.splice(i, 1);
        continue;
      }
      const progress = age / p.lifeMs;
      const alpha = (1 - progress) * 0.32;
      const rad = p.size + progress * 14;
      const px = p.x + p.vx * (age * 0.05);
      const py = p.y + p.vy * (age * 0.05);

      if (px < -rad || px > w + rad || py < -rad || py > h + rad) continue;

      ctx.fillStyle = `rgba(180, 185, 195, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Critters: Fireflies (Night) & Butterflies (Day)
    if (!this.lastCritterInit) {
      this.lastCritterInit = true;
      for (let i = 0; i < 16; i += 1) {
        this.critters.push({
          tx: 10 + Math.random() * 30,
          ty: 10 + Math.random() * 30,
          seed: Math.random() * 100,
        });
      }
    }

    for (const c of this.critters) {
      const driftX = Math.sin(now * 0.0012 + c.seed) * 2.5;
      const driftY = Math.cos(now * 0.0009 + c.seed * 2) * 2.5;
      const pos = screen.tileToCss(c.tx + driftX * 0.1, c.ty + driftY * 0.1);

      if (pos.x < -10 || pos.x > w + 10 || pos.y < -10 || pos.y > h + 10) continue;

      if (isNight) {
        // Glowing Firefly
        const glow = 0.3 + 0.6 * Math.abs(Math.sin(now * 0.003 + c.seed));
        ctx.fillStyle = `rgba(200, 245, 60, ${glow.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Fluttering Butterfly
        const flap = Math.sin(now * 0.018 + c.seed);
        ctx.fillStyle = c.seed > 50 ? "rgba(255, 170, 70, 0.75)" : "rgba(90, 210, 255, 0.75)";
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, 2.2 * Math.abs(flap), 1.8, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Scattering Birds
    for (let i = this.birds.length - 1; i >= 0; i -= 1) {
      const b = this.birds[i]!;
      const age = now - b.bornAt;
      if (age >= b.lifeMs) {
        this.birds.splice(i, 1);
        continue;
      }
      const progress = age / b.lifeMs;
      const alpha = (1 - progress);
      const bx = b.x + b.vx * (age * 0.06);
      const by = b.y + b.vy * (age * 0.06);

      if (bx < -20 || bx > w + 20 || by < -20 || by > h + 20) continue;

      // Draw graceful V-silhouette bird
      const wingFlap = Math.sin(now * 0.02 + b.bornAt);
      ctx.strokeStyle = `rgba(32, 28, 24, ${alpha.toFixed(2)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(bx - 4, by - wingFlap * 3);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + 4, by - wingFlap * 3);
      ctx.stroke();
    }

    // 5. Wood & Rock Work Chips
    if (now - this.lastWorkChipTime > 500) {
      this.lastWorkChipTime = now;
      for (let id = 1; id <= 50; id += 1) {
        if ((dense[UNIT_HP + id] ?? 0) <= 0) continue;
        const type = dense[UNIT_TYPE + id] ?? 0;
        // Wood chopping (10), Stone mining (12)
        if (type === 10 || type === 12) {
          const ux = dense[UNIT_X + id] ?? 0;
          const uy = dense[UNIT_Y + id] ?? 0;
          const pos = screen.tileToCss(ux, uy);
          this.workChips.push({
            x: pos.x,
            y: pos.y - 8,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -1.2 - Math.random() * 1.2,
            color: type === 10 ? "#d7a15c" : "#9e9e9e",
            bornAt: now,
            lifeMs: 500 + Math.random() * 250,
          });
        }
      }
      if (this.workChips.length > 20) this.workChips.splice(0, this.workChips.length - 20);
    }

    // Render Work Chips
    for (let i = this.workChips.length - 1; i >= 0; i -= 1) {
      const c = this.workChips[i]!;
      const age = now - c.bornAt;
      if (age >= c.lifeMs) {
        this.workChips.splice(i, 1);
        continue;
      }
      const cx = c.x + c.vx * (age * 0.08);
      const cy = c.y + c.vy * (age * 0.08) + 0.002 * (age * age * 0.01); // Gravity drop

      ctx.fillStyle = c.color;
      ctx.fillRect(cx, cy, 2, 2);
    }
  }
}

export const worldParticles = new WorldParticles();
