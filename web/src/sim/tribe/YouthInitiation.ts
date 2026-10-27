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

    // Monitor Team 1 villagers (ids 51..100)
    for (let id = 51; id <= 100; id++) {
      const hp = dense[UNIT_HP + id] ?? 0;
      if (hp <= 0) {
        this.initiatedUnits.delete(id);
        this.knownChildren.delete(id);
        continue;
      }

      const age = dense[UNIT_AGE + id] ?? 18;
      const type = dense[UNIT_TYPE + id] ?? 69;

      // Track children
      if (age < 12 || type === 17) {
        this.knownChildren.add(id);
        continue;
      }

      // Check for coming of age transition: was known child and now age >= 12
      const isComingOfAge = this.knownChildren.has(id);
      if (isComingOfAge && !this.initiatedUnits.has(id)) {
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

    // 1. Try to equip preferred weapon from tribe Storehouse pool using native bytecode logic
    if ((dense[UNIT_HELD_ITEM + id] ?? 9) === 9 && rt.packedData) {
      stepLegacyEntityEquipIssue({
        state: dense,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        v: id,
        pools: rt.mainArrays.aShort,
        team: 1,
        onRecordCompletion: () => {},
      });
    }

    const heldItem = dense[UNIT_HELD_ITEM + id] ?? 9;

    // 2. If holding a weapon, check for corresponding training facility
    if (heldItem !== 9) {
      // Melee weapons (0: club, 3: stone-axe, 4: bone-mace) -> Gym (building kind 1)
      // Ranged weapons (1: stone, 2: spear, 5: tomahawk) -> Archery Range (building kind 5)
      const isRanged = heldItem === 1 || heldItem === 2 || heldItem === 5;
      const targetBuildingKind = isRanged ? 5 : 1;
      const trainingBuilding = this.findNearestAvailableBuilding(rt, id, targetBuildingKind);

      if (trainingBuilding) {
        dense[UNIT_TARGET_X + id] = trainingBuilding.x;
        dense[UNIT_TARGET_Y + id] = trainingBuilding.y;
        dense[UNIT_WORK_TARGET + id] = -trainingBuilding.id;
        dense[UNIT_ORDER + id] = 3;
        return;
      }
    }

    // 3. Fallback: Apprentice System (Magang Membantu Senior Terdekat)
    const apprenticeTarget = this.findSeniorWorkTarget(rt, id);
    if (apprenticeTarget) {
      dense[UNIT_TARGET_X + id] = apprenticeTarget.x;
      dense[UNIT_TARGET_Y + id] = apprenticeTarget.y;
      dense[UNIT_WORK_TARGET + id] = apprenticeTarget.workTarget;
      dense[UNIT_ORDER + id] = 3;
      return;
    }

    // 4. Fallback 2: Find nearest natural resource to harvest
    const nearestRes = this.findNearestResource(rt, id);
    if (nearestRes) {
      dense[UNIT_TARGET_X + id] = nearestRes.x;
      dense[UNIT_TARGET_Y + id] = nearestRes.y;
      dense[UNIT_WORK_TARGET + id] = nearestRes.marker;
      dense[UNIT_ORDER + id] = 3;
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

    // Team 1 buildings are 31..60
    for (let b = 31; b <= 60; b++) {
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

    for (let s = 51; s <= 100; s++) {
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
