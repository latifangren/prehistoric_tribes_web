import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import {
  RES_AMOUNT,
  RES_KIND,
  RES_X,
  RES_Y,
  UNIT_HP,
  UNIT_MODE,
  UNIT_ORDER,
  UNIT_SELECTION,
  UNIT_TARGET_X,
  UNIT_TARGET_Y,
  UNIT_TYPE,
  UNIT_WORK_TARGET,
  UNIT_X,
  UNIT_Y,
} from "../../core/DenseLayout";

export class SmartHarvestingManager {
  private lastCheckTime = 0;
  /** Tracks active harvester units: unitId -> { slotIndex, resKind, lastX, lastY } */
  private activeHarvesters = new Map<number, { slotIndex: number; resKind: number; lastX: number; lastY: number }>();

  tick(runtime: LegacyRuntimeState, now: number): void {
    if (now - this.lastCheckTime < 800) return;
    this.lastCheckTime = now;

    const dense = runtime.denseState;

    for (let id = 1; id <= 50; id += 1) {
      if ((dense[UNIT_HP + id] ?? 0) <= 0) {
        this.activeHarvesters.delete(id);
        continue;
      }

      // If unit is currently selected or manually ordered by player, do not intervene
      if ((dense[UNIT_SELECTION + id] ?? 0) !== 0) {
        continue;
      }

      const workTarget = dense[UNIT_WORK_TARGET + id] ?? 0;
      const type = dense[UNIT_TYPE + id] ?? 0;

      // Active resource target on map (-61 to -110)
      if (workTarget <= -61 && workTarget >= -110) {
        const slot = -(workTarget + 61);
        const resKind = dense[RES_KIND + slot] ?? 0;
        const resAmount = dense[RES_AMOUNT + slot] ?? 0;
        const resX = dense[RES_X + slot] ?? (dense[UNIT_TARGET_X + id] ?? 0);
        const resY = dense[RES_Y + slot] ?? (dense[UNIT_TARGET_Y + id] ?? 0);

        if (resAmount > 0) {
          this.activeHarvesters.set(id, { slotIndex: slot, resKind, lastX: resX, lastY: resY });
          continue;
        }

        // Tree / rock / bush just depleted! Auto-chain to nearest matching node
        const nextSlot = this.findNearestMatchingResource(dense, resKind, resX, resY, 8);
        if (nextSlot >= 0) {
          const nextX = dense[RES_X + nextSlot] ?? resX;
          const nextY = dense[RES_Y + nextSlot] ?? resY;
          const nextMarker = -61 - nextSlot;

          dense[UNIT_TARGET_X + id] = nextX;
          dense[UNIT_TARGET_Y + id] = nextY;
          dense[UNIT_WORK_TARGET + id] = nextMarker;
          dense[UNIT_ORDER + id] = 2; // Action/work
          dense[UNIT_MODE + id] = 1;  // Walk

          this.activeHarvesters.set(id, { slotIndex: nextSlot, resKind, lastX: nextX, lastY: nextY });
        } else {
          this.activeHarvesters.delete(id);
        }
      } else if (type === 69 && (dense[UNIT_ORDER + id] ?? 0) === 0) {
        // Unit just dropped into idle state; check if it was harvesting recently
        const prev = this.activeHarvesters.get(id);
        if (prev) {
          const ux = dense[UNIT_X + id] ?? prev.lastX;
          const uy = dense[UNIT_Y + id] ?? prev.lastY;
          const nextSlot = this.findNearestMatchingResource(dense, prev.resKind, ux, uy, 8);

          if (nextSlot >= 0) {
            const nextX = dense[RES_X + nextSlot] ?? ux;
            const nextY = dense[RES_Y + nextSlot] ?? uy;
            const nextMarker = -61 - nextSlot;

            dense[UNIT_TARGET_X + id] = nextX;
            dense[UNIT_TARGET_Y + id] = nextY;
            dense[UNIT_WORK_TARGET + id] = nextMarker;
            dense[UNIT_ORDER + id] = 2;
            dense[UNIT_MODE + id] = 1;

            this.activeHarvesters.set(id, { slotIndex: nextSlot, resKind: prev.resKind, lastX: nextX, lastY: nextY });
          } else {
            this.activeHarvesters.delete(id);
          }
        }
      }
    }
  }

  private findNearestMatchingResource(
    dense: Int8Array,
    resKind: number,
    fromX: number,
    fromY: number,
    maxRadius: number,
  ): number {
    let bestSlot = -1;
    let minDistance = maxRadius + 1;

    for (let s = 0; s < 50; s += 1) {
      const amount = dense[RES_AMOUNT + s] ?? 0;
      if (amount <= 0) continue;

      const kind = dense[RES_KIND + s] ?? 0;
      if (!this.isMatchingKind(kind, resKind)) continue;

      const rx = dense[RES_X + s] ?? 0;
      const ry = dense[RES_Y + s] ?? 0;
      const dist = Math.hypot(rx - fromX, ry - fromY);

      if (dist < minDistance) {
        minDistance = dist;
        bestSlot = s;
      }
    }

    return bestSlot;
  }

  private isMatchingKind(k1: number, k2: number): boolean {
    if (k1 === k2) return true;
    // Trees (Wood): 0, 1, 2, 3
    if (k1 <= 3 && k2 <= 3) return true;
    // Berries & Food: 5, 6
    if ((k1 === 5 || k1 === 6) && (k2 === 5 || k2 === 6)) return true;
    return false;
  }
}

export const smartHarvesting = new SmartHarvestingManager();
