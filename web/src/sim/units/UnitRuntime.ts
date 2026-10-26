import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import { LegacySubsystemArrays } from "../../core/LegacySubsystemArrays";
import { legacyEntityPartition } from "../world/LegacyEntityPartition";
import { stepLegacyEffectSlotScan, enqueueLegacyEffectSlot } from "../../render/LegacyEffectSlotScan";
import { selectLegacyAuxiliaryCandidates } from "../world/LegacyAuxiliaryQueue";
import { stepLegacyEntityIUpdate } from "./LegacyEntityIUpdate";
import { writeLegacyEntityLinkByte } from "./LegacyEntityLinkByte";
import { placeLegacyEntity, type LegacyEntityPlacementInput } from "./LegacyEntityPlacement";
import { selectLegacyEntityUpdateCandidates, type LegacyEntityUpdateSelectionInput } from "./LegacyEntityUpdateSelection";
import { stepLegacyEntityWorkDeposit } from "./LegacyEntityWorkDeposit";
import { stepLegacyEntityModeSelect } from "./LegacyEntityModeSelect";
import { stepLegacyEntityKPredicate } from "./LegacyEntityKPredicate";
import { stepLegacyEntityHealthDelta } from "./LegacyEntityHealthDelta";
import { stepLegacyEntityDeathCleanup } from "./LegacyEntityDeathCleanup";
import { stepLegacyEntitySkillGain, stepLegacyEntitySlotSkillGain } from "./LegacyEntitySkillGain";
import { stepLegacyEntityCourtship } from "./LegacyEntityCourtship";
import { stepLegacyEntityMUpdate } from "./LegacyEntityMUpdate";
import { stepLegacySubsystemEntityOccupancyCheck } from "../tribe/LegacySubsystemEntityOccupancyCheck";
import { stepLegacySubsystemNearestBuilding } from "../tribe/LegacySubsystemNearestBuilding";
import { stepLegacySubsystemBM } from "../tribe/LegacySubsystemBM";
import { stepLegacySubsystemBDecision } from "../tribe/LegacySubsystemBDecision";
import { stepLegacyEntityRecordDoorRetarget } from "./LegacyEntityRecordDoorRetarget";
import { stepLegacyEntityAo } from "./LegacyEntityRecordRecovery";
import { stepLegacyEntityEquipIssue } from "./LegacyEntityEquipIssue";
import { stepLegacyEntityAbduction } from "./LegacyEntityAbduction";
import { stepLegacyEntitySelectionDrop } from "../../ui/LegacyEntitySelectionDrop";
import { stepLegacySubsystemEntityTypeReaction } from "../tribe/LegacySubsystemEntityTypeReaction";
import { triggerLegacyEntityMove } from "./LegacyEntityMoveTrigger";
import { readLegacyEntityModeValue } from "./LegacyEntityModeValue";
import { stepLegacyEntityTarget, type LegacyEntityTargetStepInput } from "./LegacyEntityTargetStep";
import { finalizeLegacyEntitySelection, releaseLegacyEntitySelection } from "../../ui/LegacyEntitySelectionRelease";
import { stepLegacyEntityCoreUpdate, type LegacyEntityCoreUpdateInput } from "./LegacyEntityCoreUpdate";
import { stepLegacyEntityWUpdate, type LegacyEntityWUpdateInput } from "./LegacyEntityWUpdate";
import { stepLegacyEntityRecordCancel } from "./LegacyEntityRecordCancel";
import { initializeLegacyEntityRecord, indexLegacyEntityRecord } from "../world/LegacyEntityRecordLifecycle";
import { changeLegacyEntityType, stepLegacySubsystemC, type LegacyEntityTypeChangeInput } from "./LegacyEntityTypeChange";
import { selectLegacyEntityTypeAfterQ } from "./LegacyEntityModePromotion";
import { finalizeLegacyEntity } from "../world/LegacyEntityFinalize";
import { BLD_HP, BLD_KIND, BLD_OWNER, BLD_WORK, BLD_WORKER_HEAD, BLD_X, BLD_Y, UNIT_NEXT_WORKER } from "../../core/DenseLayout";
import { liveView } from "../../core/LegacyRuntimeState";
import { stepSubsystemAnFor } from "../tribe/TribeEntityRuntime";
import { subsystemMarkerScan, subsystemMarkerRescan } from "../tribe/TribeSignalRuntime";
import { stepSubsystemP, subsystemB, subsystemBBoolean, subsystemD, subsystemEntityTransform, subsystemG, subsystemH, subsystemPrivateO, subsystemRecordRecovery, subsystemTenSlotRelease, subsystemTenSlotReleaseEntity } from "../tribe/TribeRuntime";
import { T_BUILDING } from "../../core/DataTables";

/**
 * LegacyRuntimeState wiring moved out of the class (phase 2 step 3): each function is the former
 * method of the same name, with `this` as the `rt` parameter.
 */

/** Raw f.a(int) entity-table partition lookup; caller meaning is unresolved. */
export function entityPartition(rt: LegacyRuntimeState, id: number): number {
  return legacyEntityPartition(id);
}

/** Raw b.g() outer candidate gate; movement/combat helpers remain callbacks. */
export function selectEntityUpdateCandidates(rt: LegacyRuntimeState, 
  simulationCounter: number,
  callbacks: Omit<LegacyEntityUpdateSelectionInput, "state" | "simulationCounter" | "auxiliaryF" | "subsystemG"> = {},
): void {
  selectLegacyEntityUpdateCandidates({
    ...callbacks,
    state: rt.denseState,
    simulationCounter,
    auxiliaryF: rt.mainArrays.f4,
    subsystemG: rt.subsystemArrays.gRows,
  });
}

/** Raw b.t() target-step gates and fixed state writes; inner helpers are callbacks. */
export function stepEntityTarget(rt: LegacyRuntimeState, 
  id: number,
  input: Omit<LegacyEntityTargetStepInput, "state" | "packedBytes" | "saveOffsets" | "packedOffsets" | "id">,
) {
  return stepLegacyEntityTarget({
    // Offsets 632..738, t()'s reset path, WIRED 2026-09-23: after clearing
    // the order and parking the target on its own cell the unit gets a new
    // type through Q() (#253) and a(12, v, 0) (#274). Both were ported;
    // neither had ever been connected here.
    onQ: () => rt.selectEntityTypeAfterQ(id),
    onTargetDispatch: (action, target, id2) => rt.entityMove(action, target, id2),
    ...input,
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    saveOffsets: rt.saveOffsets,
    packedOffsets: rt.packedOffsets,
    id,
  });
}

/**
 * Raw b.v() entity-core boundary. The f.j[][] table and private w/d/e/y
 * owners remain explicit inputs because their original aliases are not yet
 * proven; rt wrapper nevertheless binds the complete confirmed prefix to
 * the live dense state bank.
 */
export function stepEntityCoreUpdate(rt: LegacyRuntimeState, 
  id: number,
  input: Omit<LegacyEntityCoreUpdateInput, "state" | "packedBytes" | "packedOffsets" | "entityId">,
): boolean {
  return stepLegacyEntityCoreUpdate({
    ...input,
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    entityId: id,
  });
}

/** Raw b.w() state-update prefix with original table/callee seams explicit. */
export function stepEntityWUpdate(rt: LegacyRuntimeState, 
  id: number,
  input: Omit<LegacyEntityWUpdateInput, "state" | "packedBytes" | "packedOffsets" | "entityId">,
): void {
  stepLegacyEntityWUpdate({
    ...input,
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    entityId: id,
  });
}

/** Apply the proven b.a(int,byte) type-change side effects to the live bank. */
export function changeEntityType(rt: LegacyRuntimeState, id: number, type: number, onC?: LegacyEntityTypeChangeInput["onC"]): number {
  return changeLegacyEntityType({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    shortTableB: rt.saveOffsets,
    shortTableBOffsets: rt.sectionOffsets,
    entityId: id,
    type,
    fields: liveView<{ B: number }, LegacySubsystemArrays>(rt.subsystemArrays, { B: "bField8" }),
    // b.C() on the ambient v:I (game.bUnit) unless a caller supplies its own.
    onC: onC ?? (() => stepLegacySubsystemC({ state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets }, rt.game.bUnit)),
  });
}

/**
 * Run `private void i(int)` (#391, bytecode/b-javap.txt line 13281)
 * against the live entity bank. WIRED 2026-08-31; see
 * LegacyEntityIUpdate.ts's own docblock for the full re-derivation and
 * the four bugs it fixes. `y()`'s convergence tail
 * (LegacyEntityFollowup.ts) is its only live call site so far.
 *
 * All four of the method's cross-call scalars are threaded through the
 * shared `raw` object and written back afterwards. `x:I` is read-only
 * inside `i(int)` itself but IS written by the `onF` stub below, so it
 * still has to round-trip.
 */
export function stepEntityIUpdate(rt: LegacyRuntimeState, id: number, argument: number, team: number): void {
  const game = rt.game;
  // Live (2026-09-23): onFByte's scene dispatch writes p (and can write y),
  // which a snapshot written back afterwards used to undo.
  const raw = liveView<{ x: number; H: number; y: number; p: number }>(rt.game, {
    x: "subsystemX", H: "subsystemH", y: "subsystemY", p: "persistedPByte",
  });
  stepLegacyEntityIUpdate({
    state: rt.denseState,
    entityId: id,
    argument,
    readPacked: (table, index) =>
      rt.packedBytes[(rt.packedOffsets[table] ?? 0) + index] ?? 0,
    // b.B:I (#8) has to be re-read on demand: onChangeType below rewrites
    // it as part of b.a(int,byte)'s own body.
    readBValue: () => rt.subsystemArrays.bField8,
    qValue: rt.game.mission,
    // b.u:I (#222) -- the team index e()'s own entity loop is currently on.
    uValue: team,
    raw,
    // private boolean f() (#381) -- LegacyEntityWorkDeposit.ts; its false path
    // re-rolls x:I, which the rest of i(int) reads through raw.x.
    onF: () => stepLegacyEntityWorkDeposit({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      entityId: id,
      fRows: rt.subsystemArrays.fRows,
      gRows: rt.subsystemArrays.gRows,
      // b.C:I (#10) is shared with J()/g()'s loop, so read and write it live.
      scratch: (() => {
        const arrays = rt.subsystemArrays;
        return { get C() { return arrays.bField10; }, set C(value: number) { arrays.bField10 = value; } };
      })(),
      onRecordCompletion: (record) => rt.completeEntityRecord(record),
      onReroll: () => { raw.x = rt.randomRemainder(0xffffff, 100); },
    }),
    // offset 198: b.a(int,byte) (#275), the real entity type change.
    onChangeType: (targetId, type) => { rt.changeEntityType(targetId, type); },
    // offset 348: f.a(int,int) (#269) -- `random.nextInt() & mask % divisor`.
    onRandomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    // offset 509: f.a(int,byte) (#277) -- the xSlotTable slot writer.
    onLinkByte: (targetId, value) => {
      writeLegacyEntityLinkByte({
        state: rt.denseState,
        entityId: targetId,
        value,
        bCube: rt.game.xSlotTable,
      });
    },
    // offset 708: b.b(int,int,int) (#342), called with (id, 0, 1).
    onSubsystemB: (first, second, third) => {
      selectLegacyAuxiliaryCandidates({
        p: rt.auxiliaryScratch,
        dense: rt.denseState,
        shortRows: rt.mainArrays.aShort,
      }, rt.auxiliaryQueueState, first, second, third);
    },
    // offset 735: f.b(int) (#343) -- runSceneDispatch, already wired
    // elsewhere as b.i()'s own onFByte.
    onFByte: (value) => { rt.runSceneDispatch(value); },
    // private boolean b(int) (#345) with z()/g() -- LegacyEntityModeSelect.ts.
    // It writes H:I/y:I, which the rest of i(int) reads through `raw`.
    onBInt: (value) => stepLegacyEntityModeSelect({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      gridC: rt.gridC,
      entityId: id,
      team,
      mapWidth: rt.game.mapWidth,
      mapHeight: rt.game.mapHeight,
      readBValue: () => rt.subsystemArrays.bField8,
      raw,
      scratch: (() => {
        const arrays = rt.subsystemArrays;
        return {
          get C() { return arrays.bField10; }, set C(v: number) { arrays.bField10 = v; },
          get D() { return arrays.bField12; }, set D(v: number) { arrays.bField12 = v; },
        };
      })(),
    }, value),
    // offset 140: private void M() (#249) -- an idle villager becomes type 83.
    // WIRED 2026-09-23: it was held back (2026-09-14) because the way back,
    // I() (#245) at i()Z's offset 1024, sat behind unported callbacks
    // (l() #398, a(int,boolean,int) #292, j(int) #394); all are wired now.
    onM: () => stepLegacyEntityMUpdate({
      state: rt.denseState,
      entityId: id,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      raw: { get R() { return game.subsystemR; }, set R(value: number) { game.subsystemR = value; } },
      onChangeType: (targetId, newType) => { rt.changeEntityType(targetId, newType); },
      randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    }),
  });
}

/** Proven b.Q() type selection against the live entity bank. */
export function selectEntityTypeAfterQ(rt: LegacyRuntimeState, id: number): number {
  return selectLegacyEntityTypeAfterQ(rt.denseState, id, (entityId, type) => {
    rt.changeEntityType(entityId, type);
  });
}

/**
 * Execute the proven `f.a(byte)` (`LegacyEntityFinalize.ts`), composed
 * from its already-ported/already-wired-elsewhere pieces: `e(int)`
 * (`releaseLegacyEntitySelection`), `f(int)`
 * (`finalizeLegacyEntitySelection`), and `c(int)`
 * (`clearEntityRecordTarget`, whose own `onRecordReset` is `c(int)`'s
 * call into `a(int,boolean)`/`filterEntityLifecycle`). The type=3
 * byte-action-queue insert reuses the same queue arrays
 * `stepByteActionQueueMaintenance`'s type=100 maintenance call reads, so
 * an insert here is genuinely picked up by that already-live per-tick
 * processing. This method's own real callers live in class `b`
 * (bytecode/b-javap.txt), not yet ported -- calling rt requires an
 * explicit id from elsewhere until that caller chain is wired.
 */
export function finalizeEntity(rt: LegacyRuntimeState, id: number): void {
  const result = finalizeLegacyEntity({
    dense: rt.denseState,
    grid: rt.gridC,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    id,
    q: rt.game.qCounter,
    entityFocusFlag: rt.game.entityFocusFlag,
    entityFocusPFlag: rt.game.pendingP,
    cameraSFlag: rt.game.cameraSFlag,
    onRelease: (entityId) => {
      releaseLegacyEntitySelection({
        groups: rt.mainArrays.aByte,
        dense: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        id: entityId,
        F: rt.game.selectionGroup,
        w: rt.game.barMode,
        onModeReset: () => { rt.game.barMode = 0; },
        onFReset: () => { rt.game.selectionGroup = -1; },
      });
    },
    onFinalize: (entityId) => {
      const finalizeResult = finalizeLegacyEntitySelection({
        id: entityId,
        k: rt.game.kByte,
        w: rt.game.barMode,
        l: rt.game.selectedId,
        q: rt.game.qCounter,
        dense: rt.denseState,
        onSelectionReset: () => { rt.runSelectionFlagsRefresh(true, true, false, false); },
      });
      rt.game.kByte = finalizeResult.k;
      rt.game.barMode = finalizeResult.w;
      rt.game.selectedId = finalizeResult.l;
    },
    onRecordClear: (entityId) => { rt.clearEntityRecordTarget(entityId); },
    onQueueInsert: (type, x, y, value) => rt.runByteActionQueue(type, x, y, value),
    onTeamCounter: (teamRowIndex) => {
      const row = rt.mainArrays.aShort[teamRowIndex];
      if (row) row[22] = (row[22] ?? 0) + 1;
    },
  });
  rt.game.pendingP = result.entityFocusPFlag;
}

/** Exact b.b(int) mode-byte helper used by later entity state transitions. */
export function entityModeValue(rt: LegacyRuntimeState, id: number): number {
  return readLegacyEntityModeValue({ state: rt.denseState, id });
}

/** Raw f.a(byte,int,int,int,int,boolean,int) entity/building placement boundary. */
export function placeEntity(rt: LegacyRuntimeState, 
  map: Int8Array[],
  team: number,
  type: number,
  x: number,
  y: number,
  flags: number,
  specialPlacement: boolean,
  existingId: number,
  options: Omit<LegacyEntityPlacementInput, "state" | "map" | "packedBytes" | "packedOffsets" | "mainShort" | "typeZeroRows" | "auxiliarySlots" | "mapWidth" | "mapHeight" | "occupancyClass">,
): number {
  return placeLegacyEntity({
    ...options,
    state: rt.denseState,
    map,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    mainShort: rt.mainArrays.aShort,
    typeZeroRows: rt.mainArrays.aByte3,
    auxiliarySlots: rt.mainArrays.f4,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    occupancyClass: (cellX, cellY) => rt.occupancyClass(cellX, cellY),
  }, team, type, x, y, flags, specialPlacement, existingId);
}

/**
 * Exact final void c(int, boolean) (#555, bytecode/f-javap.txt offsets
 * 0..577) -- entity removal/cleanup. Two real callers, both already
 * wired live: `s()`'s (`stepLegacyEffectSlotScan`) `onModeThreeExpire`
 * (arg2 always `false`) and `l(int)`'s (`stepLegacyL`) `onEntityMode`
 * (arg2 always `true`).
 *
 * `local3`(type)===2's call to `releaseTenEntity` (offset 89..101) is
 * the method's own FIRST real action, BEFORE the try/catch that wraps
 * everything else (offset 102..575) -- if it throws (see
 * `LegacySubsystemBTenSlotThrows.ts`), the exception propagates out of
 * rt method entirely, uncaught, same as the original.
 *
 * `local8`(team) is `(id<31) ? 0 : 1`, `local6`/`local7` are the
 * type's packed width/height (table 138, offsets 104/130 -- the SAME
 * lookup `stepLegacyEffectSlotScan` already uses).
 */
export function stepEntityRemoval(rt: LegacyRuntimeState, id: number, arg2: boolean): void {
  const dense = rt.denseState;
  const g = rt.game;
  const tableBase = rt.packedOffsets[T_BUILDING] ?? 0;
  const type = dense[BLD_KIND + id] ?? 0;
  const x = dense[BLD_X + id] ?? 0;
  const y = dense[BLD_Y + id] ?? 0;
  const width = rt.packedBytes[tableBase + 104 + type] ?? 0;
  const height = rt.packedBytes[tableBase + 130 + type] ?? 0;
  const team = id < 31 ? 0 : 1;

  if (type === 2) subsystemTenSlotReleaseEntity(rt, id);

  try {
    if (arg2) {
      rt.stepEntityCoordinateUpdate(id === 1 ? -1 : 0, 0);
      dense[BLD_HP + id] = -1;
      enqueueLegacyEffectSlot(rt.mainArrays.e, id, 3);

      let cursor = dense[BLD_WORKER_HEAD + id] ?? 0;
      while (cursor > 0) {
        stepLegacyEntityRecordCancel(dense, rt.gridC, cursor, id, true, false, (record: number) => rt.completeEntityRecord(record));
        cursor = dense[UNIT_NEXT_WORKER + cursor] ?? 0;
      }

      const linked = dense[BLD_OWNER + id] ?? 0;
      const skip = linked <= 1 || (type === 2 && (dense[BLD_WORK + id] ?? 0) === 0);
      if (!skip) {
        stepLegacyEntityRecordCancel(dense, rt.gridC, linked, id, true, false, (record: number) => rt.completeEntityRecord(record));
      }

      if ((g.barMode === 2 || g.barMode === 4) && id === g.qCounter) {
        g.barMode = 0;
        g.qCounter = 0;
        rt.runSelectionFlagsRefresh(true, true, false, false);
      }
      return;
    }

    dense[BLD_HP + id] = 0;
    dense[BLD_WORK + id] = 3;
    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        if (rt.gridC[y + row]) rt.gridC[y + row][x + col] = 0;
      }
    }

    if (type === 2) {
      const marks = rt.mainArrays.aShort[team];
      if (marks) {
        marks[16] = marks[16] - 4; // Int16Array assignment narrows like i2s
        if (marks[16] < 0) marks[16] = 1;
      }
      const base = team * 50 + 1;
      for (let slot = base; slot < base + 50; slot += 1) {
        if ((dense[3434 + slot] ?? 0) === id) dense[3434 + slot] = 0;
      }
    }

    if (!g.cameraSFlag) {
      const own = rt.mainArrays.aShort[team];
      if (own) own[14] = own[14] - 1;
      const other = rt.mainArrays.aShort[1 - team];
      if (other) other[21] = other[21] + 1;
    }

    if (type === 0) {
      const rows = rt.mainArrays.aByte3[team];
      let slot = 0;
      while (slot < 10 && (rows?.[slot]?.[11] ?? 0) !== id) slot += 1;
      if (slot >= 10) slot = 9;
      if (rows?.[slot]) rows[slot][11] = 0;
    }

    subsystemTenSlotRelease(rt, id);

    if (team === 0) rt.runByteActionQueue(8, x, y, 0);
  } catch {
    // Matches the real exception table (offset 102..575, catch(Exception){}):
    // every branch above can hit a confirmed-permanently-null field
    // (LegacySubsystemBTenSlotThrows.ts) and rt silently swallows it.
  }
}

/** `private boolean b(int,int)` (#347) for unit `id` -- LegacyEntitySkillGain.ts. */
export function gainEntitySlotSkills(rt: LegacyRuntimeState, id: number, kind: number, level: number): boolean {
  return stepLegacyEntitySlotSkillGain({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    id,
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
  }, kind, level);
}

/** `private boolean a(byte,byte,byte,byte)` (#293) for unit `id` -- LegacyEntitySkillGain.ts. */
export function gainEntitySkill(rt: LegacyRuntimeState, id: number, attr: number, chance: number, cap: number, step: number): boolean {
  return stepLegacyEntitySkillGain({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    id,
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
  }, attr, chance, cap, step);
}

/**
 * `private void m(int)` (#400) for unit `id` -- LegacyEntityDeathCleanup.ts,
 * the corpse cleanup `a()`'s dying branch runs once the death animation ends.
 */
export function entityDeathCleanup(rt: LegacyRuntimeState, id: number): void {
  stepLegacyEntityDeathCleanup({
    state: rt.denseState,
    gridC: rt.gridC,
    saveOffsets: rt.saveOffsets,
    shortRows: rt.mainArrays.aShort,
    onD: (target, argument) => rt.subsystemD(target, argument),
  }, id);
}

/** `private boolean a(int,int)` (#294) for unit `id` -- LegacyEntityHealthDelta.ts. */
export function entityHealthDelta(rt: LegacyRuntimeState, id: number, delta: number): boolean {
  return stepLegacyEntityHealthDelta({
    state: rt.denseState,
    team: rt.game.bTeam,
    cBytes: rt.resourceTables.rowFByte,
  }, id, delta);
}

/** `private boolean k()` (#396) for unit `id` -- LegacyEntityKPredicate.ts. */
export function stepEntityKPredicate(rt: LegacyRuntimeState, id: number, team: number): boolean {
  const arrays = rt.subsystemArrays;
  return stepLegacyEntityKPredicate({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    gridC: rt.gridC,
    id,
    flags: {
      get a() { return arrays.bField73; }, set a(value: boolean) { arrays.bField73 = value; },
      get b() { return arrays.bField137; }, set b(value: boolean) { arrays.bField137 = value; },
    },
    onP: () => subsystemMarkerScan(rt, id, team),
    // b.f(boolean) (#382), WIRED 2026-09-22 -- the armoury order loop: a
    // type-26 unit banks the finished item into the tribe's pool, a
    // type-27 one puts it on the ground as a negative grid marker (the
    // trap). See LegacyEntityProduceItem.ts.
    onF: (flag) => rt.entityProduceItem(id, team, flag),
    // b.ao() (#322) -- ported 2026-09-21 as part of the r()/ap()/ao() chain
    // (LegacyEntityRecordRecovery.ts); rt stub was simply left behind.
    onAo: () => stepLegacyEntityAo({
      state: rt.denseState,
      v: id,
      team,
      slotTable: rt.game.xSlotTable,
    }),
    // b.L() (#248), WIRED 2026-09-22 -- handing a type-50 unit a weapon.
    onL: () => stepLegacyEntityEquipIssue({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      v: id,
      pools: rt.mainArrays.aShort,
      team,
      onRecordCompletion: (record) => rt.completeEntityRecord(record),
    }),
    onO: () => subsystemPrivateO(rt, id),
    onD: (unit, argument) => rt.subsystemD(unit, argument),
    // b.c(byte) (#363), WIRED 2026-09-22 -- the balloon carrying a villager
    // off into the other tribe. All four f-side callees are wired too:
    // f.e(int) #377 and f.b(byte) #348 / f.g(int) #386 were already ported
    // (releaseEntitySelection, indexLegacyEntityRecord,
    // initializeLegacyEntityRecord); f.f(int) #383 is new
    // (LegacyEntitySelectionDrop.ts).
    onCByte: (record) => stepLegacyEntityAbduction({
      state: rt.denseState,
      saveOffsets: rt.saveOffsets,
      routes: rt.subsystemArrays.a,
      pools: rt.mainArrays.aShort,
      gridC: rt.gridC,
      team,
      fields: liveView<{ R: number; S: number }>(rt.game, { R: "subsystemR", S: "subsystemS" }),
      chief: rt.mainArrays.aShort[0]?.[17] ?? 0,
      onVictimE: (victim) => { rt.releaseEntitySelection(victim); },
      onVictimF: (victim) => stepLegacyEntitySelectionDrop({
        state: rt.denseState,
        qCounter: rt.game.qCounter,
        game: rt.game,
        onSelectionRefresh: (a, b, c, d) => rt.runSelectionFlagsRefresh(a, b, c, d),
      }, victim),
      onRegister: (copy) => indexLegacyEntityRecord(rt.entityRecordLifecycleInput(), copy),
      onRefresh: (copy) => initializeLegacyEntityRecord(rt.entityRecordLifecycleInput(), copy),
      onMoveTrigger: (action, moveId, id2) => rt.entityMove(action, moveId, id2),
    }, record),
    onVacate: (kind, x, y, target) => rt.vacateEntity(kind, x, y, target),
    onNeeds: () => rt.checkEntityNeeds(id),
    onChangeType: (unit, type) => { rt.changeEntityType(unit, type); },
    onBBoolean: (flag) => subsystemBBoolean(rt, id, flag),
    onNearestBuilding: (kind) => stepLegacySubsystemNearestBuilding({
      state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
      team, entityId: id, kind,
    }),
    onGroupMode: (argument) => rt.subsystemG(id, argument),
  });
}

export function stepEntityDecisionCheck(rt: LegacyRuntimeState, id: number): boolean {
  const entityAt = (row: number, column: number): number =>
    rt.gridC[row]?.[column] ?? id;
  // b.o() (LegacySubsystemNPrivateO.ts) -- RETRACTED 2026-09-07: b.c:[[B]
  // (#143) was believed permanently null; it is not (f.g()-allocated,
  // rt port's LegacySubsystemArrays.cRows). Fully ported; see that
  // file's own docblock for the full derivation.
  const privateO = (): boolean => subsystemPrivateO(rt, id);
  return subsystemB(rt, {
    frame: rt.game.missionFrame,
    id,
    team: rt.game.bTeam,
    B: () => rt.subsystemArrays.bField8,
    fN: rt.game.callToArmsActive,
    fL: rt.game.formUpActive,
    // BUG FIX (2026-09-10): was `rt.game.mission` (f.q:B #357). b() offset
    // 668 reads class b's own Q:B (#46), already tracked as
    // game.subsystemBQByte -- a different field that happens to share the
    // letter, the trap rt project keeps hitting.
    fQ: rt.game.subsystemBQByte,
    // b() offsets 884/919 read b.m:B (#202) -- CORRECTED 2026-09-14, was
    // the never-written subsystemModeByte.
    m: () => rt.game.subsystemMByte,
    // b()'s onA (private void A()) -- see subsystemEntityAAlert's own docblock.
    onA: () => rt.subsystemEntityAAlert(id),
    onOther: () => { privateO(); },
    // b() offset 231: private boolean m() (#401), the rally walk for
    // CALL TO ARMS / FORM UP. Wired 2026-10-02 (was never called).
    onM: () => stepLegacySubsystemBM({
      state: rt.denseState,
      gridC: rt.gridC,
      team: rt.game.bTeam,
      id,
      Q: rt.game.subsystemBQByte,
      fN: rt.game.callToArmsActive,
      fC: rt.game.missionFrame,
      fQ: rt.game.outerLoopRowEndMarker,
      onChangeType: (target, type) => { rt.changeEntityType(target, type); },
      onNearestBuilding: (kind) => stepLegacySubsystemNearestBuilding({
        state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
        team: rt.game.bTeam, entityId: id, kind,
      }),
    }),
    // b() offset 1343: N() (#250). CORRECTED 2026-09-15: rt slot held n() (#402).
    onN: () => rt.stepSubsystemN(id, rt.game.bTeam),
    // b() offset 610: private boolean n() (#402), the idle adult's needs.
    onNeeds: () => { rt.checkEntityNeeds(id); },
    // b()'s onAn -- private void an() (offsets 0..396). See
    // LegacySubsystemAn.ts's own docblock for the full chain.
    onAn: () => stepSubsystemAnFor(rt, id),
    // onEntityTransform (b.a(int,int,boolean)): RETRACTED-PREMISE, FULLY
    // PORTED 2026-09-07 -- see subsystemEntityTransform's own docblock.
    // stepLegacySubsystemBDecision discards the (void) result and calls
    // onQueue right after, unconditionally -- matches the real
    // bytecode's own `a(x,y,true)` followed directly by `Q()`.
    onEntityTransform: (x, y, flag) => { rt.subsystemEntityTransform(id, x, y, flag); },
    // b.Q(): reads state[1414+v], picks type 69 or 17, delegates to the
    // SAME b.a(int,byte) type-change side effects onRawAction uses below
    // (confirmed via bytecode: both invoke #275).
    onQueue: () => rt.selectEntityTypeAfterQ(id),
    // b.a(int,byte) (void-returning, offset 5985..6092): clears #404,
    // writes the type (#2828) and low mode nibble (#1111&15) -- already
    // ported as changeEntityType/LegacyEntityTypeChange.ts, just never
    // wired to a live caller until now.
    onRawAction: (rawId, action) => { rt.changeEntityType(rawId, action); },
    // b.b(boolean): real closest-candidate scan, fully rederived
    // 2026-09-07 -- see LegacySubsystemBBoolean.ts's own docblock.
    onBBoolean: (value) => subsystemBBoolean(rt, id, value),
    // b.g(int): wired via subsystemG (see its own docblock) -- onD is
    // real now (subsystemD); onU/onCalculateM/readL/onQ/onAByteIntInt/
    // onH remain inert within it.
    onGroupMode: (mode) => rt.subsystemG(id, mode),
    // BUG FIX (2026-09-10): rt was a gridC lookup. b() offsets 1346..1375
    // are `z:I = a(e[0+v], e[101+v], 0)` -- `a(III)I` (#266), the same
    // occupancy helper already ported as
    // stepLegacySubsystemEntityOccupancyCheck -- and offsets 1423..1434 then
    // gate on `z:I / 10 <= B:I`. The result is also STORED in z:I (#234,
    // game.subsystemEntityZ), which b.u()'s own cancel-gate reads back
    // (LegacySubsystemEntityUpdateTail.ts, offsets 49..57), so the write has
    // to persist, not just feed rt comparison. gridC is gate 4's lookup
    // (`entityAt` below), not rt one.
    onCellValue: (x, y, layer) => {
  const z = rt.occupancyCheck(id, x, y, layer);
  rt.game.subsystemEntityZ = z;
  return z;
    },
    entityAt,
    // b()'s offset-1291 `q()` (#411), wired 2026-09-21 --
    // LegacyEntityRecordDoorRetarget.ts. `p:B`(#208) and `n:B`(#204) are
    // class b's shared scratch, but every ported reader (o(), Y(), q())
    // assigns them before reading, so a per-call object is equivalent here.
    // `r()` (#412) is wired as well -- see subsystemRecordRecovery below.
    onQ: () => stepLegacyEntityRecordDoorRetarget({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      saveOffsets: rt.saveOffsets,
      v: id,
      bValue: rt.subsystemArrays.bField8,
      scratch: { p: 0, n: 0 },
      onOccupancy: (x, y, mode) => rt.occupancyCheck(id, x, y, mode),
      onBVoid: (flag) => rt.subsystemBVoid(id, flag),
      onChangeType: (target, type) => { rt.changeEntityType(target, type); },
      onIUpdate: (argument) => rt.stepEntityIUpdate(id, argument, rt.game.bTeam),
      onP: () => rt.stepSubsystemP(id),
      onQ: () => rt.selectEntityTypeAfterQ(id),
      onLinkByte: (target, value) => {
        writeLegacyEntityLinkByte({
          state: rt.denseState,
          entityId: target,
          value,
          bCube: rt.game.xSlotTable,
        });
      },
      onR: () => subsystemRecordRecovery(rt, id),
    }),
    // b()'s onP -- private void p() (offsets 0..1906). Wired 2026-08-21;
    // see stepSubsystemP's own docblock for the qByte/fByte scratch-field
    // caveat.
    onP: () => rt.stepSubsystemP(id),
  });
}

/** Shared inputs for `f.g(int)` / `f.b(byte)` (LegacyEntityRecordLifecycle.ts). */
export function entityRecordLifecycleInput(rt: LegacyRuntimeState) {
  return {
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    randomRemainder: (mask: number, divisor: number) => rt.randomRemainder(mask, divisor),
    focusId: rt.game.selectedId,
    selectionFlags: rt.game.selectionFlags,
    frameFlags: rt.game.frameFlags,
  };
}

/**
 * `private boolean a(boolean)` (#295, `LegacyEntityCourtship.ts`) -- shared
 * by `n()`'s `a(false)` and `K()`'s type-96 `a(true)`. `v` is the ambient
 * `v:I` the method reads: `K()` swaps it to the unit's associated target
 * before the call, and has already set `R:I` to the original `v`, which
 * rt reads live.
 */
export function entityCourtship(rt: LegacyRuntimeState, v: number, flag: boolean): boolean {
  const game = rt.game;
  const arrays = rt.subsystemArrays;
  return stepLegacyEntityCourtship({
    state: rt.denseState,
    pool: rt.mainArrays.aShort,
    cRows: arrays.cRows,
    v,
    team: game.bTeam,
    R: game.subsystemR,
    scratch: {
      get ae() { return arrays.bField105; }, set ae(value: number) { arrays.bField105 = value; },
      get x() { return game.subsystemX; }, set x(value: number) { game.subsystemX = value; },
    },
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    onChangeType: (rawId, type) => { rt.changeEntityType(rawId, type); },
    onN: () => rt.stepSubsystemN(v, game.bTeam),
  }, flag);
}

/**
 * `private void K()` (#247, `LegacySubsystemEntityTypeReaction.ts`), run by
 * `j():Z` for types 94..97. Its docblock long called it "CONFIRMED
 * UNREACHABLE" on the premise that `i()`'s `J()` always throws; `J()` (#246)
 * has been ported and wired as `subsystemEntityJTrigger` since, and `j():Z`
 * is live. Wired 2026-09-23.
 */
export function entityTypeReaction(rt: LegacyRuntimeState, id: number, team: number): void {
  const game = rt.game;
  stepLegacySubsystemEntityTypeReaction({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    teamMarkerTable: game.teamMarkerTable,
    entityId: id,
    team,
    scratch: {
      get R() { return game.subsystemR; }, set R(value: number) { game.subsystemR = value; },
      get fFlag() { return game.subsystemFFlag; }, set fFlag(value: boolean) { game.subsystemFFlag = value; },
    },
  }, {
    onCheckQuad: (attr, chance, cap, step) => rt.gainEntitySkill(id, attr, chance, cap, step),
    onCheckPair: (target, delta) => rt.entityHealthDelta(target, delta),
    onActOnTarget: (target, flag) => entityCourtship(rt, target, flag),
  });
}

/** b's `final void a(byte,int,int)` (#274) -- LegacyEntityMoveTrigger.ts. */
export function entityMove(rt: LegacyRuntimeState, action: number, id: number, id2: number): void {
  const game = rt.game;
  const arrays = rt.subsystemArrays;
  triggerLegacyEntityMove({
    id,
    id2,
    action,
    fQByte: game.mission,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    dShort: arrays.dShort,
    bField28: arrays.bField28,
    bField235: arrays.bField235,
    bField6: arrays.bField6,
    IByte: game.cameraColumn,
    viewportO: game.viewColumns,
    KByte: game.cameraRow,
    viewportP: game.viewRows,
    onNotify: (ap, am, an) => rt.entityActionPrompt(ap, am, an),
  });
}

