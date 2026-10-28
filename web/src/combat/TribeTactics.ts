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
  UNIT_HELD_ITEM,
  UNIT_HP,
  UNIT_ORDER,
  UNIT_SELECTION,
  UNIT_TARGET_X,
  UNIT_TARGET_Y,
  UNIT_WORK_TARGET,
  UNIT_X,
  UNIT_Y,
} from "../core/DenseLayout";
import { sfx } from "../platform/SoundEffects";
import type { TouchControls } from "../TouchControls";
import type { WideScreen } from "../WideScreen";

export type RallyPoint = {
  buildingId: number;
  tileX: number;
  tileY: number;
};


export class TribeTacticsManager {
  private attackMoveActive = false;
  private attackMoveSquad: number[] = [];
  private rallyPoints = new Map<number, { x: number; y: number }>();
  private settingRallyForBuilding = -1;
  private processedNewborns = new Set<number>();
  private markerOverlay: HTMLElement | null = null;
  private flagElements = new Map<number, HTMLElement>();
  private lastEnemyTacticsTime = 0;
  isAttackMoveActive(): boolean {
    return this.attackMoveActive;
  }

  toggleAttackMove(): boolean {
    this.attackMoveActive = !this.attackMoveActive;
    sfx.click();
    return this.attackMoveActive;
  }

  cancelAttackMove(): void {
    this.attackMoveActive = false;
  }

  isSettingRally(): boolean {
    return this.settingRallyForBuilding > 0;
  }

  getRallyBuilding(): number {
    return this.settingRallyForBuilding;
  }

  startSettingRally(buildingId: number): void {
    this.settingRallyForBuilding = buildingId;
    sfx.click();
  }

  cancelSettingRally(): void {
    this.settingRallyForBuilding = -1;
  }

  setRallyPoint(buildingId: number, x: number, y: number): void {
    this.rallyPoints.set(buildingId, { x, y });
    this.settingRallyForBuilding = -1;
    sfx.select();
  }

  getRallyPoint(buildingId: number): { x: number; y: number } | undefined {
    return this.rallyPoints.get(buildingId);
  }

  clearRallyPoints(): void {
    this.rallyPoints.clear();
    this.flagElements.forEach((el) => el.remove());
    this.flagElements.clear();
  }

  /**
   * Called when player taps a map tile while Attack-Move mode is active.
   */
  executeAttackMove(targetX: number, targetY: number, runtime: LegacyRuntimeState, touch: TouchControls): void {
    const dense = runtime.denseState;
    const squad: number[] = [];

    // Find all currently selected living team 0 units
    for (let id = 1; id <= 50; id += 1) {
      if ((dense[UNIT_HP + id] ?? 0) <= 0) continue;
      // If unit is selected
      if ((dense[UNIT_SELECTION + id] ?? 0) !== 0 || runtime.game.selectedId === id) {
        squad.push(id);
      }
    }

    if (squad.length === 0 && runtime.game.selectedId > 0) {
      squad.push(runtime.game.selectedId);
    }

    if (squad.length > 0) {
      this.attackMoveSquad = squad;
      touch.fireAt(targetX, targetY);
      this.applySmartBattleFormation(squad, targetX, targetY, runtime);
      sfx.select();
    }
    this.attackMoveActive = false;
  }

  /**
   * Smart Battle Line: Deploys melee warriors to the frontline and ranged fighters
   * 2 tiles behind, spreading horizontally along the battle rank.
   */
  applySmartBattleFormation(
    squad: number[],
    targetX: number,
    targetY: number,
    runtime: LegacyRuntimeState,
  ): void {
    const dense = runtime.denseState;
    if (squad.length <= 1) return;

    // Calculate squad center
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const u of squad) {
      sumX += dense[UNIT_X + u] ?? targetX;
      sumY += dense[UNIT_Y + u] ?? targetY;
      count += 1;
    }
    const squadCenterX = count > 0 ? sumX / count : targetX;
    const squadCenterY = count > 0 ? sumY / count : targetY;

    // Approach direction vector towards target
    const dx = targetX - squadCenterX;
    const dy = targetY - squadCenterY;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Perpendicular vector for rank line spread
    const perpX = -dirY;
    const perpY = dirX;

    const meleeUnits: number[] = [];
    const rangedUnits: number[] = [];

    for (const u of squad) {
      const held = dense[UNIT_HELD_ITEM + u] ?? 9;
      // Ranged weapons: 1 throwing stone, 2 spear, 5 tomahawk
      if (held === 1 || held === 2 || held === 5) {
        rangedUnits.push(u);
      } else {
        meleeUnits.push(u);
      }
    }

    const mapW = runtime.game.mapWidth || 50;
    const mapH = runtime.game.mapHeight || 50;
    const clampX = (val: number) => Math.max(1, Math.min(mapW - 2, Math.round(val)));
    const clampY = (val: number) => Math.max(1, Math.min(mapH - 2, Math.round(val)));

    // 1. Melee Frontline
    const meleeCount = meleeUnits.length;
    meleeUnits.forEach((u, idx) => {
      const offset = idx - (meleeCount - 1) / 2;
      dense[UNIT_TARGET_X + u] = clampX(targetX + perpX * offset);
      dense[UNIT_TARGET_Y + u] = clampY(targetY + perpY * offset);
    });

    // 2. Ranged Rearline (2 tiles back)
    const rangedCount = rangedUnits.length;
    rangedUnits.forEach((u, idx) => {
      const offset = idx - (rangedCount - 1) / 2;
      dense[UNIT_TARGET_X + u] = clampX(targetX - dirX * 2 + perpX * offset);
      dense[UNIT_TARGET_Y + u] = clampY(targetY - dirY * 2 + perpY * offset);
    });
  }

  tick(runtime: LegacyRuntimeState, touch: TouchControls): void {
    const game = runtime.game;
    if (game.loopMode !== 1) return;
    const dense = runtime.denseState;

    // 1. Attack-Move scan: check if any units in attack move squad see an enemy nearby
    if (this.attackMoveSquad.length > 0) {
      for (let i = this.attackMoveSquad.length - 1; i >= 0; i -= 1) {
        const u = this.attackMoveSquad[i]!;
        const uHp = dense[UNIT_HP + u] ?? 0;
        if (uHp <= 0) {
          this.attackMoveSquad.splice(i, 1);
          continue;
        }

        const ux = dense[UNIT_X + u] ?? 0;
        const uy = dense[UNIT_Y + u] ?? 0;
        const tx = dense[UNIT_TARGET_X + u] ?? ux;
        const ty = dense[UNIT_TARGET_Y + u] ?? uy;

        // If unit already arrived at destination
        if (Math.abs(ux - tx) <= 1 && Math.abs(uy - ty) <= 1) {
          this.attackMoveSquad.splice(i, 1);
          continue;
        }

        // Look for hostile enemy in radius 5
        let nearestDist = 6;
        let targetEnemyTile: [number, number] | null = null;

        // Team 1 enemies
        for (let e = 51; e <= 100; e += 1) {
          if ((dense[UNIT_HP + e] ?? 0) <= 0) continue;
          const ex = dense[UNIT_X + e] ?? 0;
          const ey = dense[UNIT_Y + e] ?? 0;
          const d = Math.hypot(ex - ux, ey - uy);
          if (d < nearestDist) {
            nearestDist = d;
            targetEnemyTile = [ex, ey];
          }
        }

        // Hostile beasts (Mammoth & Tiger)
        for (let a = 1; a <= 22; a += 1) {
          if ((dense[ANIMAL_HP + a] ?? 0) <= 0) continue;
          const kind = dense[ANIMAL_KIND + a] ?? 0;
          if (kind !== 0 && kind !== 1) continue; // Only aggressive beasts
          const ax = dense[ANIMAL_X + a] ?? 0;
          const ay = dense[ANIMAL_Y + a] ?? 0;
          const d = Math.hypot(ax - ux, ay - uy);
          if (d < nearestDist) {
            nearestDist = d;
            targetEnemyTile = [ax, ay];
          }
        }

        // If hostile spotted, intercept!
        if (targetEnemyTile) {
          dense[UNIT_ORDER + u] = 2;
          dense[UNIT_TARGET_X + u] = targetEnemyTile[0];
          dense[UNIT_TARGET_Y + u] = targetEnemyTile[1];
          dense[UNIT_WORK_TARGET + u] = 0;
          this.applySmartBattleFormation(this.attackMoveSquad, targetEnemyTile[0], targetEnemyTile[1], runtime);
        }
      }
    }

    // 2. Rally points: check newborn/freshly trained villagers and dispatch them
    for (let id = 1; id <= 50; id += 1) {
      if ((dense[UNIT_HP + id] ?? 0) <= 0) continue;
      if (!this.processedNewborns.has(id)) {
        this.processedNewborns.add(id);
        const ux = dense[UNIT_X + id] ?? 0;
        const uy = dense[UNIT_Y + id] ?? 0;

        // Find nearest building with a rally point
        let nearestRally: { x: number; y: number } | null = null;
        let minDist = 4;
        for (const [bId, r] of this.rallyPoints.entries()) {
          const bx = dense[BLD_X + bId] ?? 0;
          const by = dense[BLD_Y + bId] ?? 0;
          const d = Math.hypot(bx - ux, by - uy);
          if (d < minDist) {
            minDist = d;
            nearestRally = r;
          }
        }

        if (nearestRally) {
          dense[UNIT_ORDER + id] = 2;
          dense[UNIT_TARGET_X + id] = nearestRally.x;
          dense[UNIT_TARGET_Y + id] = nearestRally.y;
        }
      }
    }

    // 3. Enemy AI (Team 1) Tactics: coordinates ranged skirmishers every ~1200ms
    const now = performance.now();
    if (now - this.lastEnemyTacticsTime >= 1200) {
      this.lastEnemyTacticsTime = now;
      this.coordinateEnemyTactics(runtime);
    }
  }

  /**
   * Enemy AI (Team 1) Tactics: Coordinates enemy raiders during skirmishes.
   * Ranged enemies (spears/rocks) maintain 2-3 tile standoff distance behind melee vanguards,
   * preventing them from recklessly face-tanking player defenses.
   */
  private coordinateEnemyTactics(runtime: LegacyRuntimeState): void {
    const dense = runtime.denseState;

    for (let e = 51; e <= 100; e += 1) {
      if ((dense[UNIT_HP + e] ?? 0) <= 0) continue;
      const order = dense[UNIT_ORDER + e] ?? 0;
      if (order !== 2 && order !== 3) continue;

      const held = dense[UNIT_HELD_ITEM + e] ?? 0;
      // Ranged: 1 throwing stone, 2 spear, 5 tomahawk
      const isRanged = held === 1 || held === 2 || held === 5;
      if (!isRanged) continue;

      const ex = dense[UNIT_X + e] ?? 0;
      const ey = dense[UNIT_Y + e] ?? 0;

      let nearestDist = 8;
      let targetPlayer: [number, number] | null = null;
      for (let p = 1; p <= 50; p += 1) {
        if ((dense[UNIT_HP + p] ?? 0) <= 0) continue;
        const px = dense[UNIT_X + p] ?? 0;
        const py = dense[UNIT_Y + p] ?? 0;
        const d = Math.hypot(px - ex, py - ey);
        if (d < nearestDist) {
          nearestDist = d;
          targetPlayer = [px, py];
        }
      }

      if (targetPlayer && nearestDist <= 2.5) {
        const dx = ex - targetPlayer[0];
        const dy = ey - targetPlayer[1];
        const len = Math.hypot(dx, dy) || 1;
        const mapW = runtime.game.mapWidth || 50;
        const mapH = runtime.game.mapHeight || 50;
        dense[UNIT_TARGET_X + e] = Math.max(1, Math.min(mapW - 2, Math.round(ex + (dx / len) * 2)));
        dense[UNIT_TARGET_Y + e] = Math.max(1, Math.min(mapH - 2, Math.round(ey + (dy / len) * 2)));
        dense[UNIT_ORDER + e] = 2;
      }
    }
  }

  /** Render rally flags on the screen */
  renderRallyMarkers(app: HTMLElement, runtime: LegacyRuntimeState, screen: WideScreen): void {
    if (!this.markerOverlay) {
      const el = document.createElement("div");
      el.className = "rally-markers-layer";
      el.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden;";
      app.append(el);
      this.markerOverlay = el;
    }

    if (this.rallyPoints.size === 0) {
      if (this.flagElements.size > 0) {
        this.flagElements.forEach((el) => el.remove());
        this.flagElements.clear();
      }
      return;
    }

    // Remove stale flags
    for (const [bId, el] of this.flagElements.entries()) {
      if (!this.rallyPoints.has(bId)) {
        el.remove();
        this.flagElements.delete(bId);
      }
    }

    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    for (const [bId, r] of this.rallyPoints.entries()) {
      let el = this.flagElements.get(bId);
      if (!el) {
        el = document.createElement("div");
        el.className = "rally-flag";
        el.innerHTML = '<span class="flag-icon">🚩</span><span class="flag-label">Rally</span>';
        this.markerOverlay.append(el);
        this.flagElements.set(bId, el);
      }

      const pos = screen.tileToCss(r.x, r.y);
      if (pos.x >= -30 && pos.x <= viewW + 30 && pos.y >= -30 && pos.y <= viewH + 30) {
        el.style.display = "flex";
        el.style.left = `${pos.x}px`;
        el.style.top = `${pos.y}px`;
      } else {
        el.style.display = "none";
      }
    }
  }
}

export const tribeTactics = new TribeTacticsManager();
