import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import {
  BLD_HP,
  BLD_KIND,
  BLD_WORKERS,
  BLD_X,
  BLD_Y,
  RES_AMOUNT,
  RES_KIND,
  RES_X,
  RES_Y,
  UNIT_AGE,
  UNIT_HELD_ITEM,
  UNIT_HP,
  UNIT_JOB_TYPE,
  UNIT_MODE,
  UNIT_ORDER,
  UNIT_TARGET_X,
  UNIT_TARGET_Y,
  UNIT_TYPE,
  UNIT_WORK_TARGET,
  UNIT_Y,
} from "../../core/DenseLayout";
import { stepLegacyEntityEquipIssue } from "../units/LegacyEntityEquipIssue";

/**
 * Youth Initiation & Apprentice System (Inisiasi Kedewasaan & Sistem Magang)
 *
 * When a tribe child reaches adulthood (age 12):
 * 1. Equipped with their favored weapon from the tribe Storehouse if available (melee vs ranged aptitude).
 * 2. If armed and Gym / Archery Range exists with available space, dispatches to train combat skills.
 * 3. Fallback (no weapons or no training facility): Apprentice System dispatches the young adult
 *    to assist the nearest working senior villager in their task (harvesting trees, rocks, or berries).
 * 4. Fallback 2: Dispatches to nearest available natural resource.
 */
export class YouthInitiationManager {
  private initiatedUnits = new Set<number>();
  private knownChildren = new Set<number>();
  private lastCheckMs = 0;

  reset(): void {
    this.initiatedUnits.clear();
    this.knownChildren.clear();
    this.lastCheckMs = 0;
  }

  tick(rt: LegacyRuntimeState, nowMs: number, onCelebrate?: (id: number) => void): void {
    if (rt.game.loopMode !== 1) return;
    if (nowMs - this.lastCheckMs < 600) return;
    this.lastCheckMs = nowMs;

    const dense = rt.denseState;

    // Monitor Team 0 (Player's tribe) villagers (ids 1..50)
    for (let id = 1; id <= 50; id++) {
      const hp = dense[UNIT_HP + id] ?? 0;
      if (hp <= 0) {
        this.initiatedUnits.delete(id);
        this.knownChildren.delete(id);
        continue;
      }

      const age = dense[UNIT_AGE + id] ?? 18;
      const type = dense[UNIT_TYPE + id] ?? 69;

      const order = dense[UNIT_ORDER + id] ?? 0;
      const workTarget = dense[UNIT_WORK_TARGET + id] ?? 0;
      const job = dense[UNIT_JOB_TYPE + id] ?? 69;

      // A young child still playing inside nursery (age < 11)
      if (age < 11 && (type === 17 || type === 73)) {
        this.knownChildren.add(id);
        continue;
      }

      // Check if graduated from nursery or is an idle youth
      const isLinkedToNursery = workTarget < 0 && (dense[BLD_KIND + -workTarget] ?? 0) === 10;
      const graduatedFromNursery = isLinkedToNursery && (age >= 11 || type === 59 || type === 17);
      const wasChild = this.knownChildren.has(id);
      // Include type 84 (idle villager in village), 69, 59, 17
      const isIdleYouth = (age >= 11 && age <= 25) && (order === 0 || order === 3) && (workTarget === 0 || isLinkedToNursery) && (type === 84 || type === 69 || type === 59 || type === 17) && (job === 69 || job === 0);
      if ((wasChild || graduatedFromNursery || isIdleYouth) && !this.initiatedUnits.has(id)) {
        this.knownChildren.delete(id);
        this.initiatedUnits.add(id);
        this.performInitiation(rt, id);
        onCelebrate?.(id);
      }
    }
  }

  private performInitiation(rt: LegacyRuntimeState, id: number): void {
    const dense = rt.denseState;
    // Only initiate if idle and not executing an explicit player command
    const order = dense[UNIT_ORDER + id] ?? 0;
    if (order !== 0 && order !== 3) return;

    // Promote graduated youth to full adult status so the engine allows them to enter training/work
    if ((dense[UNIT_AGE + id] ?? 0) < 12) {
      dense[UNIT_AGE + id] = 12;
    }
    dense[UNIT_TYPE + id] = 69;
    dense[UNIT_JOB_TYPE + id] = 69;
    const currentWork = dense[UNIT_WORK_TARGET + id] ?? 0;
    if (currentWork < 0 && (dense[BLD_KIND + -currentWork] ?? 0) === 10) {
      dense[UNIT_WORK_TARGET + id] = 0;
    }
    // 1. Try to equip preferred weapon from tribe Storehouse pool using native bytecode logic
    if ((dense[UNIT_HELD_ITEM + id] ?? 9) === 9 && rt.packedData) {
      stepLegacyEntityEquipIssue({
        state: dense,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        v: id,
        pools: rt.mainArrays.aShort,
        team: 0,
        onRecordCompletion: () => {},
      });
    }

    const heldItem = dense[UNIT_HELD_ITEM + id] ?? 9;

    // 2. If holding a weapon, check for corresponding training facility
    if (heldItem !== 9) {
      // Melee weapons (0: club, 3: stone-axe, 4: bone-mace, 7: spring-trap) -> Gym (building kind 1)
      // Ranged weapons (1: stone, 2: spear, 5: tomahawk, 6: net-trap) -> Archery Range (building kind 5)
      const isRanged = heldItem === 1 || heldItem === 2 || heldItem === 5 || heldItem === 6;
      const targetBuildingKind = isRanged ? 5 : 1;
      const trainingBuilding = this.findNearestAvailableBuilding(rt, id, targetBuildingKind);

      if (trainingBuilding) {
        dense[UNIT_TARGET_X + id] = trainingBuilding.x;
        dense[UNIT_TARGET_Y + id] = trainingBuilding.y;
        dense[UNIT_WORK_TARGET + id] = -trainingBuilding.id;
        dense[UNIT_ORDER + id] = 2; // ORDER 2: Move to target!
        dense[UNIT_MODE + id] = 1;  // MODE 1: Walking!
        dense[7777 + id] = 0;
        return;
      }
    }

    // 3. Fallback: Apprentice System (Magang Membantu Senior Terdekat)
    const apprenticeTarget = this.findSeniorWorkTarget(rt, id);
    if (apprenticeTarget) {
      dense[UNIT_TARGET_X + id] = apprenticeTarget.x;
      dense[UNIT_TARGET_Y + id] = apprenticeTarget.y;
      dense[UNIT_WORK_TARGET + id] = apprenticeTarget.workTarget;
      dense[UNIT_ORDER + id] = 2; // ORDER 2: Move to target!
      dense[UNIT_MODE + id] = 1;  // MODE 1: Walking!
      dense[7777 + id] = 0;
      return;
    }

    // 4. Fallback 2: Find nearest natural resource to harvest
    const nearestRes = this.findNearestResource(rt, id);
    if (nearestRes) {
      dense[UNIT_TARGET_X + id] = nearestRes.x;
      dense[UNIT_TARGET_Y + id] = nearestRes.y;
      dense[UNIT_WORK_TARGET + id] = nearestRes.marker;
      dense[UNIT_ORDER + id] = 2; // ORDER 2: Move to target!
      dense[UNIT_MODE + id] = 1;  // MODE 1: Walking!
      dense[7777 + id] = 0;
    }
  }

  private findNearestAvailableBuilding(
    rt: LegacyRuntimeState,
    unitId: number,
    targetKind: number,
  ): { id: number; x: number; y: number } | null {
    const dense = rt.denseState;
    const ux = dense[unitId] ?? 0;
    const uy = dense[UNIT_Y + unitId] ?? 0;

    let bestBuilding: { id: number; x: number; y: number } | null = null;
    let bestDist = Infinity;

    // Team 0 (Player) buildings are 1..30
    for (let b = 1; b <= 30; b++) {
      const hp = dense[BLD_HP + b] ?? 0;
      const kind = dense[BLD_KIND + b] ?? 0;
      if (hp <= 0 || kind !== targetKind) continue;

      const workers = dense[BLD_WORKERS + b] ?? 0;
      // Cap training slots to 4 to prevent crowding
      if (workers >= 4) continue;

      const bx = dense[BLD_X + b] ?? 0;
      const by = dense[BLD_Y + b] ?? 0;
      const dist = (ux - bx) ** 2 + (uy - by) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestBuilding = { id: b, x: bx, y: by };
      }
    }

    return bestBuilding;
  }

  private findSeniorWorkTarget(
    rt: LegacyRuntimeState,
    unitId: number,
  ): { x: number; y: number; workTarget: number } | null {
    const dense = rt.denseState;
    const ux = dense[unitId] ?? 0;
    const uy = dense[UNIT_Y + unitId] ?? 0;

    let bestSenior: { x: number; y: number; workTarget: number } | null = null;
    let bestDist = Infinity;

    for (let s = 1; s <= 50; s++) {
      if (s === unitId) continue;
      const hp = dense[UNIT_HP + s] ?? 0;
      const age = dense[UNIT_AGE + s] ?? 18;
      if (hp <= 0 || age <= 12) continue;

      const workTarget = dense[UNIT_WORK_TARGET + s] ?? 0;
      const order = dense[UNIT_ORDER + s] ?? 0;
      if (workTarget === 0 && order !== 3) continue;

      const tx = dense[UNIT_TARGET_X + s] ?? (dense[s] ?? 0);
      const ty = dense[UNIT_TARGET_Y + s] ?? (dense[UNIT_Y + s] ?? 0);
      const dist = (ux - tx) ** 2 + (uy - ty) ** 2;

      if (dist < bestDist) {
        bestDist = dist;
        bestSenior = { x: tx, y: ty, workTarget };
      }
    }

    return bestSenior;
  }

  private findNearestResource(
    rt: LegacyRuntimeState,
    unitId: number,
  ): { x: number; y: number; marker: number } | null {
    const dense = rt.denseState;
    const ux = dense[unitId] ?? 0;
    const uy = dense[UNIT_Y + unitId] ?? 0;

    let bestRes: { x: number; y: number; marker: number } | null = null;
    let bestDist = Infinity;

    for (let slot = 0; slot < 50; slot++) {
      const kind = dense[RES_KIND + slot] ?? 0;
      const amount = dense[RES_AMOUNT + slot] ?? 0;
      if (kind === 0 || amount <= 0) continue;

      const rx = dense[RES_X + slot] ?? 0;
      const ry = dense[RES_Y + slot] ?? 0;
      const dist = (ux - rx) ** 2 + (uy - ry) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestRes = { x: rx, y: ry, marker: -61 - slot };
      }
    }

    return bestRes;
  }
}

export const youthInitiation = new YouthInitiationManager();
