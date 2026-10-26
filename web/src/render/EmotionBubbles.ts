import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import {
  UNIT_ENERGY,
  UNIT_FOOD,
  UNIT_HP,
  UNIT_MAX_HP,
  UNIT_MODE,
  UNIT_HAPPINESS,
  UNIT_THOUGHT,
  UNIT_TYPE,
} from "../core/DenseLayout";
import type { WideScreen } from "../WideScreen";

const EMOTES_ENABLED_KEY = "pt.emotes";

export function isEmotesEnabled(): boolean {
  try {
    const val = localStorage.getItem(EMOTES_ENABLED_KEY);
    return val === null ? true : val === "on";
  } catch {
    return true;
  }
}

export function setEmotesEnabled(on: boolean): void {
  try {
    localStorage.setItem(EMOTES_ENABLED_KEY, on ? "on" : "off");
  } catch {
    // ignore quota error
  }
}

export type EmotionType = "hunger" | "sleep" | "love" | "danger" | "happy" | "work";

interface ActiveBubble {
  id: number;
  type: EmotionType;
  emoji: string;
  startTime: number;
  durationMs: number;
}

export class EmotionBubbles {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private enabled = true;
  private activeBubbles = new Map<number, ActiveBubble>();
  private lastTriggerTime = new Map<number, number>();
  private previousHp = new Map<number, number>();
  private lastScanTime = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "emotion-canvas";
    this.canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;";
    this.ctx = this.canvas.getContext("2d");
    this.enabled = isEmotesEnabled();
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
    setEmotesEnabled(on);
    if (!on) {
      this.activeBubbles.clear();
      if (this.ctx && this.canvas.width > 0) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private triggerBubble(id: number, type: EmotionType, emoji: string, now: number): void {
    const last = this.lastTriggerTime.get(id) ?? 0;
    // Minimum 14 seconds cooldown between bubbles for the same villager
    if (now - last < 14000) return;
    // Maximum 8 bubbles displayed simultaneously on screen
    if (this.activeBubbles.size >= 8) return;

    this.lastTriggerTime.set(id, now);
    this.activeBubbles.set(id, {
      id,
      type,
      emoji,
      startTime: now,
      durationMs: 2800,
    });
  }

  tick(now: number, runtime: LegacyRuntimeState, screen: WideScreen): void {
    if (!this.enabled) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0 || !this.ctx) return;

    const dense = runtime.denseState;

    // Scan living villagers every 600ms
    if (now - this.lastScanTime > 600) {
      this.lastScanTime = now;

      for (let id = 1; id <= 50; id += 1) {
        const hp = dense[UNIT_HP + id] ?? 0;
        if (hp <= 0) {
          this.activeBubbles.delete(id);
          this.previousHp.delete(id);
          continue;
        }

        const prevHp = this.previousHp.get(id) ?? hp;
        this.previousHp.set(id, hp);

        // 1. Danger / Attacked (HP dropped recently)
        if (hp < prevHp && prevHp - hp >= 2) {
          this.triggerBubble(id, "danger", "❗", now);
          continue;
        }

        // 2. Starving (Food critical or thought === 0)
        const food = dense[UNIT_FOOD + id] ?? 50;
        const thought = dense[UNIT_THOUGHT + id] ?? -1;
        if (food < 15 || thought === 0) {
          this.triggerBubble(id, "hunger", "🍗", now);
          continue;
        }

        // 3. Exhausted / Sleepy (Energy critical or thought === 2)
        const energy = dense[UNIT_ENERGY + id] ?? 50;
        if (energy < 20 || thought === 2) {
          this.triggerBubble(id, "sleep", "💤", now);
          continue;
        }

        // 4. Courting / Love (thought === 1)
        if (thought === 1) {
          this.triggerBubble(id, "love", "❤️", now);
          continue;
        }

        // 5. Great happiness / Festive Disco mood
        const happy = dense[UNIT_HAPPINESS + id] ?? 50;
        if (happy >= 75) {
          this.triggerBubble(id, "happy", "😊", now);
          continue;
        }

        // 6. Hard at work crafting or building
        const mode = dense[UNIT_MODE + id] ?? 0;
        const type = dense[UNIT_TYPE + id] ?? 0;
        if ((type === 56 || type === 77) && mode > 0) {
          this.triggerBubble(id, "work", "🔨", now);
        }
      }
    }

    // Render pass
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    if (this.activeBubbles.size === 0) return;

    for (const [id, bubble] of this.activeBubbles.entries()) {
      const elapsed = now - bubble.startTime;
      if (elapsed >= bubble.durationMs) {
        this.activeBubbles.delete(id);
        continue;
      }

      // Check if villager is alive and on map
      const hp = dense[UNIT_HP + id] ?? 0;
      if (hp <= 0) {
        this.activeBubbles.delete(id);
        continue;
      }

      const tx = dense[0 + id] ?? 0;
      const ty = dense[101 + id] ?? 0;
      const offsetX = dense[202 + id] ?? 0;
      const offsetY = dense[303 + id] ?? 0;

      // Convert game tile to screen CSS pixels
      const pos = screen.tileToCss(tx + offsetX / 16, ty + offsetY / 16);

      // Skip offscreen
      if (pos.x < -40 || pos.x > w + 40 || pos.y < -40 || pos.y > h + 40) {
        continue;
      }

      // Animations:
      // Entry: scale 0 -> 1 in first 220ms
      let scale = 1;
      if (elapsed < 220) {
        const p = elapsed / 220;
        scale = 1 + Math.sin(p * Math.PI) * 0.25; // pop effect
      }

      // Exit: opacity 1 -> 0 in last 500ms
      let alpha = 1;
      const remaining = bubble.durationMs - elapsed;
      if (remaining < 500) {
        alpha = Math.max(0, remaining / 500);
      }

      // Gentle floating bob
      const floatY = (elapsed / bubble.durationMs) * 12 + Math.sin(elapsed * 0.007) * 3;
      const bx = Math.round(pos.x);
      const by = Math.round(pos.y - 34 - floatY);

      // Draw Thought Bubble
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(bx, by);
      ctx.scale(scale, scale);

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.beginPath();
      ctx.arc(1, 2, 13, 0, Math.PI * 2);
      ctx.fill();

      // Main White Bubble
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#3c220c";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pointer tail dots
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-2, 15, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-4, 20, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Emoji Glyph inside
      ctx.font = '14px/1 system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(bubble.emoji, 0, 1);

      ctx.restore();
    }
  }
}

export const emotionBubbles = new EmotionBubbles();
