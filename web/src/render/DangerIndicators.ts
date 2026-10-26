import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { BLD_HP, BLD_KIND, BLD_MAX_HP, BLD_WORK, BLD_X, BLD_Y, UNIT_HP, UNIT_MAX_HP, UNIT_X, UNIT_Y } from "../core/DenseLayout";
import { sfx } from "../platform/SoundEffects";
import type { TouchControls } from "../TouchControls";
import type { WideScreen } from "../WideScreen";
import { atmosphereAudio } from "../audio/AtmosphereAudio";
import { escapeHtml } from "../platform/Html";

interface DangerSpot {
  id: string;
  tx: number;
  ty: number;
  createdAt: number;
  lastHitAt: number;
  type: "attack" | "building" | "unit";
  icon: string;
  label: string;
}

const DANGER_EXPIRY_MS = 8000;
const MAX_INDICATORS = 4;

/**
 * Off-screen danger & combat indicators.
 * Projects pulsing tribal warning arrows on the viewport edges when team-0 units or buildings
 * are under attack outside the current visible screen area. Tapping the indicator instantly
 * centers the camera onto the conflict hotspot.
 */
export function attachDangerIndicators(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
): { track(): void; registerDanger(tx: number, ty: number, type?: "attack" | "building" | "unit"): void } {
  const container = document.createElement("div");
  container.className = "danger-indicators-layer";
  container.setAttribute("aria-hidden", "true");
  app.append(container);

  const dangers = new Map<string, DangerSpot>();

  // Element pool to avoid GC churn
  const elements = new Map<string, { el: HTMLElement; arrow: HTMLElement; distEl: HTMLElement; iconEl: HTMLElement }>();

  const registerDanger = (tx: number, ty: number, type: "attack" | "building" | "unit" = "attack") => {
    if (tx < 0 || ty < 0 || !runtime.activeMap) return;

    // Grid snap danger spots within a 3-tile radius
    const key = `${Math.floor(tx / 3)}_${Math.floor(ty / 3)}`;
    const now = performance.now();
    const existing = dangers.get(key);

    const icon = type === "building" ? "🔥" : "⚔️";
    const label = type === "building" ? "Structure under assault" : "Tribe member in combat";

    if (existing) {
      existing.lastHitAt = now;
      existing.tx = tx;
      existing.ty = ty;
    } else {
      dangers.set(key, {
        id: key,
        tx,
        ty,
        createdAt: now,
        lastHitAt: now,
        type,
        icon,
        label,
      });
    }

    // Trigger dynamic battle drums in the atmosphere audio
    atmosphereAudio.triggerCombat();
  };

  // Chain runtime attack listener
  const previousOnAttacked = runtime.onTribeAttacked;
  runtime.onTribeAttacked = (x, y) => {
    previousOnAttacked?.(x, y);
    registerDanger(x, y, "attack");
  };

  // Periodic scan for damaged buildings or injured villagers taking damage
  let lastScan = 0;
  const scanHealth = (now: number) => {
    if (now - lastScan < 600 || runtime.game.loopMode !== 1) return;
    lastScan = now;

    const e = runtime.denseState;
    // Scan team 0 buildings (1..30)
    for (let b = 1; b <= 30; b += 1) {
      const kind = e[BLD_KIND + b] ?? 0;
      if (kind <= 0) continue;
      const hp = e[BLD_HP + b] ?? 0;
      const maxHp = e[BLD_MAX_HP + b] ?? 100;
      const work = e[BLD_WORK + b] ?? 0; // 2 = repair
      if (hp > 0 && (hp < maxHp * 0.45 || work === 2)) {
        const bx = e[BLD_X + b] ?? 0;
        const by = e[BLD_Y + b] ?? 0;
        if (bx > 0 || by > 0) registerDanger(bx, by, "building");
      }
    }
  };

  const getOrCreateElement = (id: string, spot: DangerSpot) => {
    let entry = elements.get(id);
    if (!entry) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `danger-indicator-btn ${spot.type}`;
      el.innerHTML = `
        <div class="danger-arrow"></div>
        <div class="danger-body">
          <span class="danger-icon">${escapeHtml(spot.icon)}</span>
          <span class="danger-dist"></span>
        </div>
      `;
      const arrow = el.querySelector<HTMLElement>(".danger-arrow")!;
      const distEl = el.querySelector<HTMLElement>(".danger-dist")!;
      const iconEl = el.querySelector<HTMLElement>(".danger-icon")!;

      el.addEventListener("click", () => {
        const currentSpot = dangers.get(id);
        if (currentSpot) {
          sfx.order();
          touch.focus(currentSpot.tx, currentSpot.ty);
          // Dismiss on direct jump
          dangers.delete(id);
          el.remove();
          elements.delete(id);
        }
      });

      container.append(el);
      entry = { el, arrow, distEl, iconEl };
      elements.set(id, entry);
    }
    return entry;
  };

  const track = () => {
    if (runtime.game.loopMode !== 1 || !runtime.activeMap || screen.frozen) {
      container.style.display = "none";
      return;
    }
    container.style.display = "block";

    const now = performance.now();
    scanHealth(now);

    // Filter expired spots
    for (const [id, spot] of dangers.entries()) {
      if (now - spot.lastHitAt > DANGER_EXPIRY_MS) {
        dangers.delete(id);
        const dom = elements.get(id);
        if (dom) {
          dom.el.remove();
          elements.delete(id);
        }
      }
    }

    if (dangers.size === 0) return;

    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const insetX = 26;
    const insetTop = 56; // Below top bar
    const insetBottom = 78; // Above bottom bar/sheet

    const boundsW = viewW - insetX * 2;
    const boundsH = viewH - insetTop - insetBottom;
    const centerX = insetX + boundsW / 2;
    const centerY = insetTop + boundsH / 2;

    const game = runtime.game;
    const camX = game.cameraColumn + (game.viewColumns >> 1);
    const camY = game.cameraRow + (game.viewRows >> 1);

    const activeList = Array.from(dangers.values())
      .sort((a, b) => b.lastHitAt - a.lastHitAt)
      .slice(0, MAX_INDICATORS);

    const activeIds = new Set<string>();

    for (const spot of activeList) {
      activeIds.add(spot.id);
      const pos = screen.tileToCss(spot.tx, spot.ty);
      const isOffScreen =
        pos.x < insetX || pos.x > viewW - insetX || pos.y < insetTop || pos.y > viewH - insetBottom;

      const dom = getOrCreateElement(spot.id, spot);

      if (!isOffScreen) {
        // Danger is in view; player can see it, so hide edge indicator
        dom.el.style.display = "none";
        continue;
      }

      dom.el.style.display = "flex";
      dom.iconEl.textContent = spot.icon;

      // Distance calculation in tiles
      const distTiles = Math.max(1, Math.round(Math.hypot(spot.tx - camX, spot.ty - camY)));
      dom.distEl.textContent = `${distTiles}m`;

      // Project ray from center towards offscreen point
      const dx = pos.x - centerX;
      const dy = pos.y - centerY;
      const angle = Math.atan2(dy, dx);

      // Clamp ray to rectangular edge
      const halfW = boundsW / 2;
      const halfH = boundsH / 2;

      let edgeX = 0;
      let edgeY = 0;

      // Find intersection with box
      const absCos = Math.abs(Math.cos(angle));
      const absSin = Math.abs(Math.sin(angle));

      if (halfW * absSin < halfH * absCos) {
        // Hits left or right boundary
        edgeX = Math.sign(dx) * halfW;
        edgeY = Math.sign(dx) * halfW * Math.tan(angle);
      } else {
        // Hits top or bottom boundary
        edgeX = Math.sign(dy) * halfH / Math.tan(angle);
        edgeY = Math.sign(dy) * halfH;
      }

      const screenX = centerX + edgeX;
      const screenY = centerY + edgeY;

      dom.el.style.left = `${screenX}px`;
      dom.el.style.top = `${screenY}px`;

      // Arrow angle pointing outwards
      const deg = (angle * 180) / Math.PI;
      dom.arrow.style.transform = `rotate(${deg}deg)`;
    }

    // Hide DOM elements no longer in activeList
    for (const [id, dom] of elements.entries()) {
      if (!activeIds.has(id)) {
        dom.el.style.display = "none";
      }
    }
  };

  return { track, registerDanger };
}
