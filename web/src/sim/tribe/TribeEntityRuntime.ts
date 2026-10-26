import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import { liveView } from "../../core/LegacyRuntimeState";
import { stepLegacySubsystemEntityUpdateTail } from "./LegacySubsystemEntityUpdateTail";
import { stepLegacySubsystemEntityMoveApply } from "./LegacySubsystemEntityMoveApply";
import { stepLegacySubsystemEntityDisplace } from "./LegacySubsystemEntityDisplace";
import { stepLegacySubsystemEntityPaceAccum } from "./LegacySubsystemEntityPaceAccum";
import { stepLegacySubsystemUnitTraining } from "./LegacySubsystemUnitTraining";
import { stepLegacySubsystemEntityTrainingSlot } from "./LegacySubsystemEntityTrainingSlot";
import { stepLegacyEntityActionCommit } from "../units/LegacyEntityActionCommit";
import { checkLegacyEntityOccupant } from "../units/LegacyEntityOccupantCheck";
import { stepLegacySubsystemBBoolean } from "./LegacySubsystemBBoolean";
import { checkLegacyResourceNodeGate } from "../world/LegacyResourceNodeGate";
import { subsystemMarkerScan } from "./TribeSignalRuntime";
import { stepLegacySubsystemAn } from "./LegacySubsystemAn";
import { BLD_KIND, BLD_OWNER, BLD_WORK, BLD_WORKERS, BLD_WORKER_HEAD, UNIT_AGE, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_FLAGS, UNIT_HELD_ITEM, UNIT_HP, UNIT_JOB_TYPE, UNIT_MELEE_SKILL, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_ORDER, UNIT_RANGED_SKILL, UNIT_RECORD, UNIT_SCOUT_SKILL, UNIT_SLOT, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TIMER, UNIT_TYPE, UNIT_VISION, UNIT_WORK_TARGET, UNIT_Y } from "../../core/DenseLayout";

/** private void an() (#321) for unit `id`. */
export function stepSubsystemAnFor(rt: LegacyRuntimeState, id: number): void {
  stepLegacySubsystemAn({
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    grid: rt.gridC,
    id,
    onOccupantCheck: (occupant) => checkLegacyEntityOccupant({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      id,
    }, occupant),
    onBBoolean: () => stepLegacySubsystemBBoolean({
      dense: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      saveOffsets: rt.saveOffsets,
      arrays: rt.subsystemArrays,
      v: id,
      arg: false,
      onG: () => rt.subsystemG(id, 2),
      onC: (value) => checkLegacyResourceNodeGate({
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        tableOffsets: rt.packedOffsets,
        v: id,
      }, value),
    }),
    onRawAction: (rawId, action) => { rt.changeEntityType(rawId, action); },
    // private void N() -- derived 2026-08-21, see LegacySubsystemN.ts's
    // own docblock. g(int)/O() reuse the already-ported/wired
    // subsystemG/stepLegacySubsystemO* chain (same shape as the other
    // real N() caller, f.am()'s own onN, below).
    onN: () => rt.stepSubsystemN(id, rt.game.bTeam),
    onGroupMode: (mode) => rt.subsystemG(id, mode),
    // The gate (#270, ~1900 instructions) -- restored 2026-09-07 (see
    // LegacySpiralPlacementGate.ts's own docblock). an()'s call site
    // uses mode=0/scanLimit=19 (both literal constants in the original
    // bytecode); every known caller including rt one discards the
    // boolean result. an()'s own bytecode has no local catch around
    // rt call, so -- matching the original -- none is added here
    // either; a real out-of-range table-53 read propagates up the same
    // call chain the original's NPE/AIOOBE would have.
    onLargeGate: (x, y) => {
      rt.checkSpiralPlacementGate(0, 19, x, y, id, (occupant) => checkLegacyEntityOccupant({
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        id,
      }, occupant));
    },
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
  });
}

/**
 * `b.e()`'s own tail after `v()` (`onEntityCoreUpdate`), offsets 328..731
 * (bytecode/b-javap.txt:8076). Two parts:
 *  1. offset 328..696: `b:Z = 1`, then, behind the gate (`5050 == 0`,
 *     adult, type not 50/105), `a:Z` = "the unit may act on a marker"
 *     (offsets 403..684), `b:Z = 0` and `p()` (result popped). Both flags
 *     are read downstream: `p()` takes `b:Z` and its `H()` branches on
 *     `a:Z`. CORRECTED 2026-10-09 (oracle run 5, frame 12284): neither
 *     flag was written here (they were thought to have no observable
 *     effect), so a villager far from camp who spotted a raider joined
 *     the call-up instead of turning back into a type-59 idler.
 *  2. offset 697..731 (only reached when the gate above does NOT pass, or
 *     after `p()`'s crash would have happened): `u()`
 *     (`LegacySubsystemEntityUpdateTail.ts`), then -- only when
 *     `dense[5959+id]>0` -- `R()` (`LegacySubsystemEntityPaceAccum.ts`).
 */
export function subsystemEntityLoopTail(rt: LegacyRuntimeState, id: number, team: number): void {
  const game = rt.game;
  const dense = rt.denseState;
  const type = dense[UNIT_TYPE + id] ?? 0;
  const arrays = rt.subsystemArrays;
  arrays.bField137 = true; // b:Z, offset 328
  if ((dense[5050 + id] ?? 0) === 0 && (dense[UNIT_AGE + id] ?? 0) >= 12 && type !== 50 && type !== 105) {
    const t = (row: number, index: number) => rt.packedBytes[(rt.packedOffsets[row] ?? 0) + index] ?? 0;
    // Offsets 404..513: an ordered unit (6161 != 0) on a turn its team does not own still counts
    // only when it is a walking (1) unit at the end of its route, crowded (z/10 > B) and busy.
    const order = dense[UNIT_ORDER + id] ?? 0;
    let a = true;
    if (order !== 0 && (game.subsystemGCurrentI & (team + 1)) === 0) {
      a = order === 1 &&
        (dense[808 + id] ?? 0) <= (dense[707 + id] ?? 0) &&
        Math.trunc(game.subsystemEntityZ / 10) > rt.subsystemArrays.bField8 &&
        ((dense[UNIT_MODE + id] ?? 0) & 255) > 7;
    }
    // Offsets 516..609: off its own cell, only a kind-16 worker with a live 6565 slot.
    if (a && (rt.gridC[dense[UNIT_Y + id] ?? 0]?.[dense[id] ?? 0] ?? 0) !== id) {
      a = t(41, type) === 16 && t(18, dense[UNIT_HELD_ITEM + id] ?? 0) > 0;
    }
    // Offsets 612..676: not while 7979 bit 1 is set; a child (type <= 9) only if t27 bit 2 is clear.
    if (a) a = ((dense[UNIT_FLAGS + id] ?? 0) & 2) === 0 && (type > 9 || (t(27, type) & 4) === 0);
    arrays.bField73 = a; // a:Z, offset 684
    arrays.bField137 = false; // b:Z, offset 689
    // p()'s boolean result is popped (offset 696).
    subsystemMarkerScan(rt, id, team);
  }

  const tailInput = {
    state: dense,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    gridC: rt.gridC,
    id,
    team,
    onN: () => rt.stepSubsystemN(id, team),
    onF: () => rt.entityMoveCancel(id),
    // f.c(x,y,1,1) (#357) -- the dirty-rectangle repaint, WIRED 2026-09-23.
    onMarkVisible: (x: number, y: number, w: number, h: number) => rt.repaintRect(x, y, w, h),
    // z and R live: onP -> p() -> N() writes z (entityAp) and can write
    // R (the #270 gate's mode 7). FIXED 2026-09-23 (were snapshots).
    z: { get value() { return game.subsystemEntityZ; }, set value(v: number) { game.subsystemEntityZ = v; } },
    bValue: rt.subsystemArrays.bField8,
    // Offsets 337..345 decrement `R:B`(#48), not `Q:B`(#46) -- see the
    // 2026-09-10 correction in LegacySubsystemEntityUpdateTail.ts.
    rByte: { get value() { return game.subsystemRByte; }, set value(v: number) { game.subsystemRByte = v; } },
    scalars: rt.subsystemArrays,
    // c()'s (#356) own inputs, restored 2026-09-10 along with the method
    // itself -- see LegacySubsystemEntityPathStep.ts's retraction note.
    route: rt.subsystemArrays.a,
    saveOffsets: rt.saveOffsets,
    visibilityBits: rt.mainArrays.aInt,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    fogClass: (x: number, y: number) => rt.occupancyClass(x, y),
    onP: () => rt.stepSubsystemP(id),
    // `private void a(byte)` (#285), c()'s offset-594 friendly-unit
    // displacement -- ported 2026-09-14, see LegacySubsystemEntityDisplace.ts.
    // Its two callees run for the OCCUPANT (the original switches v:I to it
    // at offset 11), so both receive that id rather than `id`.
    onDisplace: (occupant: number) => stepLegacySubsystemEntityDisplace({
      state: dense,
      id,
      gridC: rt.gridC,
      scalars: rt.subsystemArrays,
      onActionCommit: (target, actionCode) => {
        const jRows = rt.packedData?.byteTables;
        if (!jRows) return false;
        return stepLegacyEntityActionCommit({
          state: dense,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          gridC: rt.gridC,
          jRows,
          entityId: target,
          actionCode,
          allowRestart: false,
          onChangeType: (targetId, type) => { rt.changeEntityType(targetId, type); },
          onIUpdate: (arg) => rt.stepEntityIUpdate(target, arg, target <= 50 ? 0 : 1),
        });
      },
      onMoveApply: (target) => stepLegacySubsystemEntityMoveApply({
        state: dense,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        gridC: rt.gridC,
        id: target,
        onF: () => rt.entityMoveCancel(target),
      }),
    }, occupant),
  };
  stepLegacySubsystemEntityUpdateTail(tailInput);

  if ((dense[5959 + id] ?? 0) > 0) {
    stepLegacySubsystemEntityPaceAccum({
      state: dense,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      id,
      team,
      randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
      onQueueAction: (...args) => { rt.entityStrikeGate(id, ...args); },
    });
  }
}

/**
 * `b.e()`'s own offset 734..737 (private void Z()), fired once per team
 * right after that team's entity loop finishes (`onTeamEnd`). Ported
 * (`LegacySubsystemUnitTraining.ts`) and tested previously but never
 * wired into the live loop until now. Composes with `G()`
 * (`LegacySubsystemEntityTrainingSlot.ts`, its own `onG` target) and the
 * class-f viewport bounds check (`isInView`, the same
 * `IByte`/`KByte`/`viewportO`/`viewportP` fields
 * `LegacyCellCompatibilityCheck.ts`'s own class-f `a(int,int):boolean`
 * derivation already established).
 *
 * Verified live in-browser (2026-08-29, debug runtime): with a
 * training-eligible team-0 building slot and no interfering entities,
 * `onTeamEnd` fires once per team per tick, `Z()` allocates a new record
 * and links it into the building's `dense[8993]` chain, and `G()` runs
 * to completion with zero errors, assigning a real formation slot.
 * (Verifying with the debug map's default entity roster present also
 * surfaced two confirmed-guaranteed-throw paths from earlier sessions --
 * `p()`'s crash gate and `subsystemEntityAAlert`'s -- firing readily on
 * default entity state, and a separate, genuinely uncaught bug in the
 * (since-retired) `queueLegacyAuxiliary` chimera (`gRows` under-sized at
 * 3 rows, needs 4) that predated rt change and was flagged separately
 * at the time. **MOOT as of 2026-08-31**: `queueLegacyAuxiliary` was a
 * chimera of `b(III)` and `c(boolean)` and has been deleted -- see
 * `LegacyAuxiliaryQueue.ts`'s history docblock -- so rt specific
 * `gRows` sizing complaint no longer applies to any live call path.)
 */
export function subsystemUnitTraining(rt: LegacyRuntimeState, team: number): void {
  stepLegacySubsystemUnitTraining({
    state: rt.denseState,
    team,
    mainShort: rt.mainArrays.aShort,
    // t[a_s[275 + f.b] + f.q] and t[a_s[212 + f.b] + f.q] (f.b:B, levelBByte, picks the row).
    // CORRECTED 2026-10-14: both added the never-written subsystemModeByte to the row's offset.
    populationThreshold: rt.packedBytes[
      (rt.packedOffsets[275 + rt.game.difficulty] ?? 0) + rt.game.mission
    ] ?? 0,
    teamOneFlags: Math.trunc(
      (rt.packedBytes[
        (rt.packedOffsets[212 + rt.game.difficulty] ?? 0) + rt.game.mission
      ] ?? 0) / 4,
    ),
    sceneGateActive: rt.game.mission === 3,
    subsystemQByte: rt.game.subsystemBQByte,
    isInView: (x, y) =>
      x >= rt.game.cameraColumn - 1 && x <= rt.game.cameraColumn + rt.game.viewColumns &&
      y >= rt.game.cameraRow - 1 && y <= rt.game.cameraRow + rt.game.viewRows,
    onG: (newEntityId) => stepLegacySubsystemEntityTrainingSlot({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      entityId: newEntityId,
      randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
      fields: liveView<{ x: number; y: number }>(rt.game, { x: "subsystemX", y: "subsystemY" }),
      owners: rt.subsystemArrays.i,
    }),
    allocateRecord: (allocTeam, x, y, type, flags) =>
      rt.allocateRecord(rt.gridC, allocTeam, x, y, type, flags, rt.recordOptions()),
  });
}
