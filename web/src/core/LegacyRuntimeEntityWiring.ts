import type { LegacyRuntimeState } from "./LegacyRuntimeState";
import { liveView } from "./LegacyRuntimeState";
import { syncLegacySubsystemBCoordinate } from "../sim/tribe/LegacySubsystemBCoordinateSync";
import { stepLegacySubsystemBVoidO } from "../sim/tribe/LegacySubsystemBVoidO";
import { stepLegacySubsystemEntityOccupancyCheck } from "../sim/tribe/LegacySubsystemEntityOccupancyCheck";
import { type LegacySubsystemRecordInput, allocateLegacySubsystemRecord } from "../sim/tribe/LegacySubsystemRecord";
import { type LegacySubsystemScoreInput, stepLegacySubsystemScore } from "../sim/tribe/LegacySubsystemScore";
import { stepLegacySubsystemU } from "../sim/tribe/LegacySubsystemU";
import { stepLegacySubsystemV } from "../sim/tribe/LegacySubsystemV";
import { stepLegacyAnimalHitReaction } from "../sim/units/LegacyAnimalHitReaction";
import { transferLegacyEntityAction } from "../sim/units/LegacyEntityActionTransfer";
import { filterLegacyEntityLifecycle } from "../sim/units/LegacyEntityLifecycleFilter";
import { type LegacyEntityMCalculationInput, calculateLegacyEntityM } from "../sim/units/LegacyEntityMCalculation";
import { type LegacyEntityModeInput, setLegacyEntityMode } from "../sim/units/LegacyEntityMode";
import { promoteLegacyEntityMode } from "../sim/units/LegacyEntityModePromotion";
import { type LegacyEntityTargetScanInput, type LegacyEntityTargetScanResult, scanLegacyEntityTargets } from "../sim/units/LegacyEntityTargetScan";
import { type LegacyEntityUpdateCleanupInput, cleanupLegacyEntityUpdate } from "../sim/units/LegacyEntityUpdateCleanup";
import { stepLegacyAj } from "../sim/units/LegacyUnitSelection";
import { type LegacyAuxiliaryModes67Input, stepLegacyAuxiliaryModes67 } from "../sim/world/LegacyAuxiliaryModes67";
import { type LegacyAuxiliaryModeWriteResult, applyLegacyAuxiliaryModeWrites } from "../sim/world/LegacyAuxiliaryModeWrites";
import { refreshLegacyAuxiliaryTag } from "../sim/world/LegacyAuxiliaryQueue";
import type { LegacyAPPrefixInput } from "../sim/world/LegacyMapEntryTransitions";
import { legacyPathCellPredicate } from "../sim/world/LegacyPathCellPredicate";
import { type LegacyPathDirectionState, setLegacyPathDirection } from "../sim/world/LegacyPathDirection";
import { stepLegacyPathE } from "../sim/world/LegacyPathE";
import { type LegacyPathPreparationInput, prepareLegacyPath } from "../sim/world/LegacyPathPreparation";
import { type LegacyRecordAllocatorInput, allocateLegacyRecord } from "../sim/world/LegacyRecordAllocator";
import { allocateLegacySpecialTile } from "../sim/world/LegacySpecialTileAllocator";
import { checkLegacySpiralPlacementGate } from "../sim/world/LegacySpiralPlacementGate";
import { runPathTables } from "../sim/world/WorldRuntime";
import { finalizeLegacyEntitySelection, releaseLegacyEntitySelection } from "../ui/LegacyEntitySelectionRelease";
import { stepStateAPPrefix } from "../ui/UiStateRuntime";
import { ANIMAL_HP, ANIMAL_KIND, ANIMAL_X, ANIMAL_Y } from "./DenseLayout";
import { toJavaByte } from "./RowUtils";

/** Raw f.b(int,int,int,int) auxiliary 22-slot record initializer. */
export function allocateSubsystemRecord(rt: LegacyRuntimeState, map: Int8Array[], first: number, x: number, y: number, counterIndex: number, input: Omit<LegacySubsystemRecordInput, "state" | "map" | "packedBytes" | "packedOffsets">): number {
    return allocateLegacySubsystemRecord({
      ...input,
      state: rt.denseState,
      map,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
    }, first, x, y, counterIndex);
  }

/** f.aP() (#497): the q-selected placement table, with the live wiring. */
export function runAP(rt: LegacyRuntimeState, placementCallbacks: Omit<LegacyAPPrefixInput, "state" | "packedBytes" | "packedOffsets" | "shortRows"> = {}): void {
    stepStateAPPrefix(rt, {
      ...placementCallbacks,
      // Live: aP() writes aw itself (the old inline snapshot dropped it).
    state: liveView<LegacyAPPrefixInput["state"]>(rt.game, { q: "mission", bByte: "difficulty", awByte: "levelAwByte" }),
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      shortRows: rt.mainArrays.aShort,
      onDenseWrite: placementCallbacks.onDenseWrite ?? ((index, value) => {
        if (index >= 0 && index < rt.denseState.length) rt.denseState[index] = value;
      }),
      onPlaceFive: placementCallbacks.onPlaceFive ?? ((team, type, x, y, flags, specialPlacement, existingId) => {
        rt.placeEntity(rt.gridC, team, type, x, y, flags, specialPlacement, existingId, rt.buildingPlacementOptions());
      }),
      onCreateRecord: placementCallbacks.onCreateRecord ?? ((team, x, y, type, flags) => {
        rt.allocateRecord(rt.gridC, team, x, y, type, flags, rt.recordOptions());
      }),
      // Offset 328 of aP() is `invokevirtual #540`, f's own b(IIII)V -- the 22-slot animal
      // record -- as b(1, row2, row3, row0). FIXED 2026-10-14 (oracle run 15, play20 frame
      // 62619, mission 4's 14 animals): this ran b.b(IIII), the mission-script step.
      onAuxRecord: placementCallbacks.onAuxRecord ?? ((first, x, y, counterIndex) => {
        rt.allocateSubsystemRecord(rt.gridC, first, x, y, counterIndex, {
          randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
          counters: rt.game.subsystemT,
          q: rt.game.mission,
        });
      }),
    });
  }

/** Raw b.ad() cleanup for a selected entity-update association. */
export function cleanupEntityUpdate(rt: LegacyRuntimeState, id: number, associationIndex: number, callbacks: Omit<LegacyEntityUpdateCleanupInput, "state" | "subsystemG" | "id" | "associationIndex"> = {}): void {
    cleanupLegacyEntityUpdate({
      ...callbacks,
      state: rt.denseState,
      subsystemG: rt.subsystemArrays.gRows,
      id,
      associationIndex,
    });
  }

/**
 * `final boolean a(int,int,int,int)` (#270, the ~1900-instruction spiral
 * placement gate) -- shared wiring for all six call sites
 * (`an()`'s onLargeGate, `h()`'s onFootprint, `af()`'s onFootprintGate,
 * `N()`'s onGate x2, `f.b(int,int)`'s onFootprintProbe). Extracted
 * 2026-09-07 when the method was restored from its retracted "every mode
 * throws" premise (see `LegacySpiralPlacementGate.ts`'s own docblock) --
 * every one of those six sites needs the same dense/packedBytes/
 * saveOffsets/gridB/gridC/cRows/entityB/ae wiring, only mode/scanLimit/
 * origin/onOccupantCheck differ per call.
 */
export function checkSpiralPlacementGate(rt: LegacyRuntimeState, mode: number, scanLimit: number, originX: number, originY: number, id: number, onOccupantCheck?: (cellValue: number) => boolean): boolean {
    const game = rt.game;
    const queue = rt.auxiliaryQueueState;
    return checkLegacySpiralPlacementGate({
      mode,
      scanLimit,
      originX,
      originY,
      dense: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      saveOffsets: rt.saveOffsets,
      gridC: rt.gridC,
      gridB: rt.gridB,
      cRows: rt.subsystemArrays.cRows,
      mapWidth: rt.game.mapWidth,
      mapHeight: rt.game.mapHeight,
      id,
      entityB: rt.subsystemArrays.bField8,
      ae: rt.subsystemArrays.bField105,
      onOccupantCheck,
      onO: () => stepLegacySubsystemBVoidO({
        state: rt.denseState,
        id,
        localFlags: rt.game.subsystemBLocalFlags,
        // b.b(int,int,int,int):byte (#332), o()'s offset-100 tail. Ported
        // 2026-09-04 as stepLegacySubsystemScore; it used to be inlined here
        // as a literal 0 on a retracted premise. Its own two callees (#267/
        // #268) are now ported for real too (2026-09-08,
        // LegacySubsystemScore.ts) -- see that file's own docblock. #264/
        // #366 (onPairSetup/onDCall) are ALSO now real calls (2026-09-08,
        // LegacySubsystemPairSetup.ts) -- #264 is the only writer of the
        // shared loop bound `c:B`/bField144, so the #267/#268 loops are no
        // longer a guaranteed no-op. #265/#380 (onFlagToggle/onFCall) remain
        // callbacks (a separate, concurrent port owns those two methods).
        onScore: (a, b, c, d) => stepLegacySubsystemScore(rt.legacySubsystemScoreInput(id), a, b, c, d),
      }),
      onOccupancyCheck: (x, y, arg3) => rt.occupancyCheck(id, x, y, arg3),
      onGroupMode: (entityId, argument) => rt.subsystemG(entityId, argument),
      bScalars: rt.subsystemArrays,
      scratchB: { get value() { return game.subsystemB; }, set value(v: number) { game.subsystemB = v; } },
      team: game.bTeam,
      // mode 6 (af()'s animal scan): `id` is the animal slot.
      onHitReaction: (x, y, target, arg4) => stepLegacyAnimalHitReaction({
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        slot: id,
        onFlee: (flag) => rt.animalRoam(id, flag),
      }, x, y, target, arg4),
      onRepaint: (x, y, w, h) => rt.repaintRect(x, y, w, h),
      rByte: { get value() { return game.subsystemRByte; }, set value(v: number) { game.subsystemRByte = v; } },
      fP: rt.auxiliaryScratch,
      oCounter: { get value() { return queue.O; }, set value(v: number) { queue.O = v; } },
    });
  }

/** Execute the proven a(int) 30-slot target scan against the live entity bank. */
export function scanEntityTargets(rt: LegacyRuntimeState, id: number, targetType: number, partition: number, onBestTarget?: LegacyEntityTargetScanInput["onBestTarget"]): LegacyEntityTargetScanResult {
    return scanLegacyEntityTargets({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      partition,
      entityId: id,
      targetType,
      onBestTarget,
    });
  }

/** Proven b.P() mode write against the live entity bank. */
export function promoteEntityMode(rt: LegacyRuntimeState, id: number, status: number): number {
    return promoteLegacyEntityMode(rt.denseState, id, status);
  }

/** Proven b.m calculation core; callers supply the original k[] snapshot. */
export function calculateEntityM(rt: LegacyRuntimeState, input: Omit<LegacyEntityMCalculationInput, "state" | "packedBytes" | "packedOffsets">): number {
    return calculateLegacyEntityM({
      ...input,
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
    });
  }

/** Compose the proven f.a(int,boolean) filter with its a(IIZZ) action boundary. */
export function filterEntityLifecycle(rt: LegacyRuntimeState, id: number, enabled: boolean, readEntityCell: (row: number, column: number) => number, callbacks: {
      readonly onRecordCompletion?: (record: number) => void;
      readonly onLifecycleReset?: (record: number, enabled: boolean) => void;
    } = {}): void {
    filterLegacyEntityLifecycle({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      entityId: id,
      enabled,
      onAction: (record, entityId, first, second) => {
        transferLegacyEntityAction({
          state: rt.denseState,
          entityId: record,
          record: entityId,
          moveFlag: first !== 0,
          resetFlag: second !== 0,
          readEntityCell,
          onRecordCompletion: callbacks.onRecordCompletion,
          onLifecycleReset: callbacks.onLifecycleReset,
        });
      },
    });
  }

/** Raw mode 1..4 coordinate-write segment of b.a(IIII). */
export function applyAuxiliaryModeWrites(rt: LegacyRuntimeState, input: Omit<Parameters<typeof applyLegacyAuxiliaryModeWrites>[0], "dense" | "packedOffsets">): LegacyAuxiliaryModeWriteResult {
    return applyLegacyAuxiliaryModeWrites({
      ...input,
      dense: rt.denseState,
      packedOffsets: rt.packedOffsets,
    });
  }

/** Raw mode 6/7 gate segment of b.a(IIII), with opaque owners as callbacks. */
export function stepAuxiliaryModes67(rt: LegacyRuntimeState, input: Omit<LegacyAuxiliaryModes67Input, "dense" | "packedBytes" | "packedOffsets">): boolean {
    return stepLegacyAuxiliaryModes67({
      ...input,
      dense: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
    });
  }

/** Full raw b.a(IIIII) path preparation; a(II) and a(III)B stay callbacks. */
export function preparePath(rt: LegacyRuntimeState, input: Omit<LegacyPathPreparationInput, "f" | "g">): void {
    prepareLegacyPath({
      ...input,
      f: rt.subsystemArrays.fByte,
      g: rt.subsystemArrays.g,
    });
  }

/** Raw b.a(II) direction mask/delta helper. */
export function preparePathDirection(rt: LegacyRuntimeState, state: LegacyPathDirectionState, dx: number, dy: number): void {
    setLegacyPathDirection(state, dx, dy);
  }

/** Raw b.a(III):byte path-cell predicate; u/v remain explicit raw fields. */
export function pathCellPredicate(rt: LegacyRuntimeState, x: number, y: number, mode: number, u: number, v: number): number {
    return legacyPathCellPredicate({
      map: rt.gridC,
      packedBytes: rt.packedBytes,
      shortOffsets: rt.packedOffsets,
      state: rt.denseState,
      u,
      v,
      occupancyBits: rt.mainArrays.aInt,
    }, x, y, mode);
  }

/**
 * Compose the proven a(II) -> b.e(int) -> a(IIIII) path-preparation chain
 * against the live b storage.  Packed delta reads and a(III)B remain
 * explicit because their scalar owner is not yet proven at this caller.
 */
export function preparePathLive(rt: LegacyRuntimeState, input: {
    readonly arg1: number;
    readonly arg2: number;
    readonly arg3: number;
    readonly arg4: number;
    readonly mode: number;
    readonly readPackedDelta: (offset: number) => number;
    readonly onCellValue: (x: number, y: number, mode: number) => number;
  }): { readonly directionMask: number; readonly directionDeltas: Int8Array; readonly transitionCount: number } {
    const direction = { a: 0, c: new Int8Array(2) };
    const pathState = { d: 0, c: 0, b: 0, e: 0 };
    const tableState = { a: 0, b: 0, e: 0, f: 0, g: 0, cCursor: 0 };
    prepareLegacyPath({
      ...input,
      pathData: rt.subsystemArrays.d,
      eRows: rt.subsystemArrays.e,
      eValues: rt.subsystemArrays.eByte,
      f: rt.subsystemArrays.fByte,
      g: rt.subsystemArrays.g,
      h: rt.subsystemArrays.h,
      map: rt.gridC,
      mapMirror: rt.gridB,
      state: pathState,
      onRelativePreparation: (dx, dy) => setLegacyPathDirection(direction, dx, dy),
      onE: (mode) => stepLegacyPathE({
        mode,
        directionMask: direction.a,
        deltas: rt.subsystemArrays.fByte,
        c: direction.c,
        dScratch: rt.subsystemArrays.dByte,
        pathData: rt.subsystemArrays.d,
        eCounts: rt.subsystemArrays.eByte,
        map: rt.gridC,
        readPackedDelta: input.readPackedDelta,
        onCellValue: input.onCellValue,
        state: tableState,
      }),
      onCellValue: input.onCellValue,
    });
    return {
      directionMask: direction.a,
      directionDeltas: new Int8Array(direction.c),
      transitionCount: pathState.c,
    };
  }

export function allocateRecord(rt: LegacyRuntimeState, map: Int8Array[], team: number, x: number, y: number, type: number, flags: number, options: Omit<LegacyRecordAllocatorInput, "state" | "map" | "packedBytes" | "packedOffsets" | "counters" | "randomRemainder">): number {
    return allocateLegacyRecord({
      ...options,
      state: rt.denseState,
      map,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      counters: rt.mainArrays.aShort,
      randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    }, team, x, y, type, flags);
  }

/** `f.aJ():V` (UPPERCASE, constant-pool #491, `stepLegacyAj`), reused by `af()`'s several branches. */
export function runAjUpper(rt: LegacyRuntimeState): void {
    const g = rt.game;
    const ajState = {
      uFlag: g.boxSelecting, F: g.selectionGroup, k: g.kByte,
      E: g.ECounter, D: g.DCounter, C: g.CCounter, B: g.BCounter,
    };
    stepLegacyAj(ajState);
    g.boxSelecting = ajState.uFlag;
    g.selectionGroup = ajState.F;
    g.kByte = ajState.k;
    g.ECounter = ajState.E;
    g.DCounter = ajState.D;
    g.CCounter = ajState.C;
    g.BCounter = ajState.B;
  }

/**
 * Exact `private void a(boolean×9)` (constant pool #464) -- the REAL
 * method `stepLegacySelectionFlags` models. CORRECTION (2026-08-18):
 * a docblock here previously claimed this was `a(boolean,boolean,
 * boolean,boolean)` (#434) -- that IS a real, separate method, but
 * direct bytecode read confirms it's a trivial 4-arg convenience
 * wrapper (`iload_1..4; iconst_0×5; invokespecial #464`) that just
 * calls THIS 9-arg method with the last 5 args hardcoded false. Every
 * call site through 2026-08-18 only ever passed 4 args (defaulting the
 * rest to false via the JS default params, matching the wrapper's own
 * behavior) until `f.W()`'s `staticL` branch (`onSelectionPreset`) was
 * traced and found to call the 9-arg form DIRECTLY with `fifth=true`
 * (`iconst_1,0,0,0,1,0,0,0,0`) -- a real, non-default value the 4-arg
 * wrapper can never produce, requiring this signature to actually
 * expose all 9 params, not just 4.
 */
/**
 * f.ai()'s own a(ZZZZZZZZZ) (#464, offset 145: a villager item turns the
 * unit panel on) and a(ZZZZ) (#434, offset 170). WIRED 2026-10-08: both
 * ai() call sites passed no callbacks, so browsing VILLAGERS never showed
 * the browsed villager's panel.
 */
export function aiFlagCallbacks(rt: LegacyRuntimeState) {
    return {
      onNineFlagReset: (a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean, h: boolean, i: boolean, j: boolean) =>
        rt.runSelectionFlagsRefresh(a, b, c, d, e, f, h, i, j),
      onFourFlagReset: (a: boolean, b: boolean, c: boolean, d: boolean) => rt.runSelectionFlagsRefresh(a, b, c, d),
    };
  }

/**
 * b.e()'s decision-check step: composes the currently-ported b()
 * segments (extracted from stepSubsystemFrame's onEntityDecisionCheck
 * callback so it can be exercised directly, e.g. by
 * verify-subsystem-b-wiring.mjs).
 *
 * onRawAction/onQueue (2026-08-18): traced to b.a(int,byte) (void,
 * offset 5985..6092) and b.Q() (offset 0..39) via raw bytecode -- both
 * already ported (LegacyEntityTypeChange.ts/changeEntityType,
 * LegacyEntityModePromotion.ts/selectEntityTypeAfterQ) but never wired
 * to a live caller until now.
 *
 * onBBoolean (2026-08-18, continued; fully rederived 2026-09-07): traced
 * to b.b(boolean) (offset 0..364) -- ported as stepLegacySubsystemBBoolean,
 * a real closest-scored-candidate scan over dense's 9833/9733/9783
 * scratch table. See LegacySubsystemBBoolean.ts's own docblock for the
 * full derivation.
 *
 * onGroupMode (2026-08-18, continued): traced to b.g(int) (offset
 * 0..317) -- already ported as stepLegacyEntityGPrefix, now wired via
 * `subsystemG` (own doc below); its `onD` sub-callback is also newly
 * ported+wired for real (`subsystemD`/`subsystemK`, b.d(int,int) and
 * b.k(int)).
 *
 * onEntityTransform (2026-08-18, RETRACTED-PREMISE 2026-09-07): traced
 * to `b.a(int,int,boolean)`/`subsystemEntityTransform`, previously
 * believed a 100%-unconditional guaranteed throw -- it is not, see that
 * method's own corrected docblock. Now wired for real; args forwarded.
 */
/**
 * `private boolean a(int,boolean,int)` (#292) with its check b(int,boolean,int)
 * (#344) -- LegacyEntityResourceCost.ts. `v` is b.v:I at the call site: the
 * record for ab(), the unit itself for i()Z. V:I/W:I are written before they
 * are read inside one call, so each call gets fresh ones.
 */
export function entityCostInput(rt: LegacyRuntimeState, v: number) {
    return {
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      gridC: rt.gridC,
      team: rt.game.bTeam,
      v,
      pool: rt.mainArrays.aShort,
      dShort: rt.subsystemArrays.dShort,
      scratch: { V: 0, W: 0 },
      onNotify: () => rt.runByteActionQueue(9, 0, 0, 0),
      R: (() => { const g = rt.game; return { get value() { return g.subsystemR; }, set value(v: number) { g.subsystemR = v; } }; })(),
    };
  }

/**
 * b.l(int) (#399, bytecode/b-javap.txt 33922, offsets 0..340): take animal
 * `a` off the map -- free the step cell it reserved (-128) while less than
 * half way through a step, clear its own cell and e[9513+a], and count its
 * species f.t[e[9469+a]] down when that index is below t202[q]. Ported
 * 2026-09-27 for vacate (kind 106) and b.l()/b.m()'s 22-animal pass.
 * Offset 20 compares e[9623+a] unmasked (the load rebuild masks it).
 */
export function removeAnimal(rt: LegacyRuntimeState, a: number): void {
    const e = rt.denseState;
    const t = (row: number, index: number) => rt.packedBytes[(rt.packedOffsets[row] ?? 0) + index] ?? 0;
    const c = rt.gridC;
    const dir = e[9491 + a] ?? 0;
    if (((e[9557 + a] ?? 0) & 255) <= 7 &&
        (e[9623 + a] ?? 0) < Math.trunc((t(15, (dir & 1) * 9 + t(179, e[ANIMAL_KIND + a] ?? 0)) + 1) / 2)) {
      const ny = (e[ANIMAL_Y + a] ?? 0) + t(1, 8 + dir);
      const nx = (e[ANIMAL_X + a] ?? 0) + t(1, dir);
      if (c[ny]?.[nx] === -128) c[ny]![nx] = 0;
    }
    const row = c[e[ANIMAL_Y + a] ?? 0];
    if (row) row[e[ANIMAL_X + a] ?? 0] = 0;
    e[ANIMAL_HP + a] = 0;
    const species = e[9469 + a] ?? 0;
    if (species < t(202, rt.game.mission)) {
      const counts = rt.game.subsystemT; // f.t:[B (#368)
      counts[species] = counts[species]! - 1;
    }
  }

/**
 * b.a(int,int,int) (#266) -- LegacySubsystemEntityOccupancyCheck.ts, with
 * its q:B/r:B (#212/#215) writes landing in subsystemArrays for d(int).
 */
export function occupancyCheck(rt: LegacyRuntimeState, id: number, x: number, y: number, arg3: number): number {
    return stepLegacySubsystemEntityOccupancyCheck(
      rt.denseState, rt.packedBytes, rt.packedOffsets, rt.saveOffsets, id, x, y, arg3, rt.subsystemArrays,
    );
  }

/**
 * f.a(int,int,int,int) (#301, bytecode/f-javap.txt 6923, offsets 0..85):
 * the first free slot of f.d:[[B (row 0 == 0, 40 slots) gets row 1 = 0,
 * row 0 = frame record, row 2 = offset, row 6 = kind, row 5 = target;
 * f.r() (LegacyAnimatedSlotScan.ts) animates and draws it. Full: nothing.
 */
export function allocateEffectSlot(rt: LegacyRuntimeState, target: number, kind: number, offset: number, frame: number): void {
    const d = rt.mainArrays.d;
    for (let slot = 0; slot < 40; slot += 1) {
      if ((d[0]![slot] ?? 0) !== 0) continue;
      d[1]![slot] = 0;
      d[0]![slot] = toJavaByte(frame);
      d[2]![slot] = toJavaByte(offset);
      d[6]![slot] = toJavaByte(kind);
      d[5]![slot] = toJavaByte(target);
      return;
    }
  }

/** f.a(int,int,int,byte) (#299) on the live grid -- LegacySpecialTileAllocator.ts. */
export function placeGroundSlot(rt: LegacyRuntimeState, kind: number, x: number, y: number, amount: number): number {
    return allocateLegacySpecialTile(rt.denseState, (cx, cy, value) => {
      const row = rt.gridC[cy];
      if (row && cx >= 0 && cx < row.length) row[cx] = value;
    }, { type: kind, x, y, parameter: amount });
  }

/** b's `private void c(boolean)` (#361): pick team 0's best adults into e[1..3]. */
export function pickAdults(rt: LegacyRuntimeState, flag: boolean): void {
    refreshLegacyAuxiliaryTag({
      dense: rt.denseState,
      shortRows: rt.mainArrays.aShort,
      auxiliaryRows: rt.subsystemArrays.eRows,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      saveOffsets: rt.saveOffsets,
    }, rt.auxiliaryQueueState, flag);
  }

/** b's `private boolean u()` (#419) -- mission 4's script, LegacySubsystemU.ts. */
export function missionScriptU(rt: LegacyRuntimeState): boolean {
    const game = rt.game;
    const arrays = rt.subsystemArrays;
    const queue = rt.auxiliaryQueueState;
    return stepLegacySubsystemU({
      state: rt.denseState,
      aShort: rt.mainArrays.aShort,
      aInt: rt.mainArrays.aInt,
      eRows: arrays.eRows,
      fP: rt.auxiliaryScratch,
      frame: game.missionFrame,
      bField28: arrays.bField28,
      fields: {
        get R() { return game.subsystemRByte; }, set R(v: number) { game.subsystemRByte = v; },
        get f() { return game.subsystemGFFlagByte; }, set f(v: number) { game.subsystemGFFlagByte = v; },
        get N() { return queue.N; }, set N(v: number) { queue.N = v; },
      },
      onAuxiliary: (first, second, third) => rt.auxiliaryCandidates(first, second, third),
      onScene: (value) => rt.runSceneDispatch(value),
      onPickAdults: (flag) => rt.pickAdults(flag),
    });
  }

/** b's `private boolean v()` (#421) -- the mission script step, LegacySubsystemV.ts. */
export function missionScriptV(rt: LegacyRuntimeState): boolean {
    const game = rt.game;
    const arrays = rt.subsystemArrays;
    const queue = rt.auxiliaryQueueState;
    return stepLegacySubsystemV({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      aShort: rt.mainArrays.aShort,
      eRows: arrays.eRows,
      fP: rt.auxiliaryScratch,
      q: game.mission,
      frame: game.missionFrame,
      bField28: arrays.bField28,
      fields: {
        get f() { return game.subsystemGFFlagByte; }, set f(v: number) { game.subsystemGFFlagByte = v; },
        get F() { return arrays.bField16; }, set F(v: number) { arrays.bField16 = v; },
        get N() { return queue.N; }, set N(v: number) { queue.N = v; },
        get I() { return game.subsystemGCurrentI; }, set I(v: number) { game.subsystemGCurrentI = v; },
        get aw() { return game.levelAwByte; }, set aw(v: number) { game.levelAwByte = v; },
      },
      onPlaceStep: (first, second, x, y) => rt.runAuxiliaryPlacement(first, second, x, y, game.bUnit),
      onCoordinateSync: (id, flag) => syncLegacySubsystemBCoordinate({
        dense: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
        // a(int,boolean) offset 286: a(id, 69) (#275), wired 2026-09-27.
        onSpawnMark: (unit) => rt.changeEntityType(unit, 69),
      }, id, flag),
      onFPair: (x, y) => rt.stepFPairCommand({}, x, y),
      onSpawn: (count, x, y, team, value) => rt.batchAllocate(count, x, y, team, value),
      onRecord: (team, x, y, type, flags) => {
        rt.allocateRecord(rt.gridC, team, x, y, type, flags, rt.recordOptions());
      },
      onAuxiliary: (first, second, third) => rt.auxiliaryCandidates(first, second, third),
      onPickAdults: (flag) => rt.pickAdults(flag),
      onScene: (value) => rt.runSceneDispatch(value),
    });
  }

/**
 * Shared input for `stepLegacySubsystemScore` (b's `b(IIII)` #332, and its
 * four now-ported callees #267/#268/#264/#366) at both of its call sites
 * (`onO`'s inline callback above and `stepSubsystemP` below). `id` is the
 * ambient entity id (`v:I`#225) both #267 and #268 read as `entityId` --
 * passed through explicitly rather than via `game.bUnit`, see
 * LegacySubsystemScore.ts's own docblock for why. `dByte`/`gridC` are
 * #264's own storage (`LegacySubsystemPairSetup.ts`); `bThreshold` is
 * `b.B:I`(#8), #366's threshold, precomputed the same way
 * `LegacySubsystemP.ts`'s own wiring already does.
 */
export function legacySubsystemScoreInput(rt: LegacyRuntimeState, id: number): LegacySubsystemScoreInput {
    return {
      dRows: rt.subsystemArrays.dRows,
      localFlags: rt.game.subsystemBLocalFlags,
      q: rt.game.mission,
      dCube: rt.subsystemArrays.d,
      eCube: rt.subsystemArrays.e,
      aCube: rt.subsystemArrays.a,
      bCube: rt.subsystemArrays.b,
      gridB: rt.gridB,
      gridC: rt.gridC,
      gArr: rt.subsystemArrays.g,
      hArr: rt.subsystemArrays.h,
      fByte: rt.subsystemArrays.fByte,
      eByte: rt.subsystemArrays.eByte,
      dByte: rt.subsystemArrays.dByte,
      dense: rt.denseState,
      entityId: id,
      bThreshold: rt.subsystemArrays.bField8,
      bScalars: rt.subsystemArrays,
      // #380 (stepLegacySubsystemFCall)'s own needs -- see
      // LegacySubsystemFlagPass.ts, and the identical checkLegacyCellCompatibility
      // wiring already used by stepSubsystemP's onNearestCandidate below.
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      saveOffsets: rt.saveOffsets,
      visibilityBits: rt.mainArrays.aInt,
      mapWidth: rt.game.mapWidth,
      mapHeight: rt.game.mapHeight,
      team: rt.game.bTeam,
      // #264's own two callees, WIRED 2026-09-10. Both had been ported for
      // weeks and left as unsupplied `?.()` optionals, which is why
      // `eByte`/`fByte` were still all zeros in live play: with `onE` inert,
      // #264 fell straight out at its `if (eByte[g[0]] <= 0) return;` (offset
      // 188..199), so `c:B`(bField144) stayed 0, #332 returned 0, and
      // `dense[808 + id]` -- the step direction `b.u()` gates every move on --
      // was never written. See docs/unknowns.md's 2026-09-10 entry.
      onRelativePreparation: (dx, dy) => setLegacyPathDirection(rt.pathDirection, dx, dy),
      onE: (mode) => runPathTables(rt, mode, id),
      // d(int) (#366)'s a(int,int,int) (#266) calls, offsets 28 and 434.
      // Wired 2026-09-28: unwired, q:B/r:B stayed 0 and every path candidate
      // was scored by its distance to (0,0).
      onComputeQR: (x, y, arg3) => rt.occupancyCheck(id, x, y, arg3),
    };
  }

/**
 * private void p() (offsets 0..1906). CORRECTION (2026-08-22): `o()`
 * (offset 0..3, `p()`'s own unconditional first call) was ported
 * (`stepLegacySubsystemBVoidO`) but never actually invoked anywhere --
 * the old docblock's "already wired separately" claim was aspirational,
 * not true; confirmed via grep, zero real call sites. Now called here,
 * first, matching the real bytecode order. Wired 2026-08-21 into
 * `private boolean b()`'s own real `onP` boundary. `qByte` (`b.Q:B`#46)
 * and `fByte` (`b.f:B`#167) are shared class-b singleton scratch state,
 * not individually traced beyond their confirmed default (-1/0, from
 * `final void a()`'s entity-slot reset) -- see
 * `game.subsystemBQByte`/`game.subsystemGFFlagByte`'s own docblocks.
 */
/**
 * `private void F()` (#242) as `D()`'s `onF`, for one entity. Shared by
 * u()'s own D() call and a(byte)'s (#285) D() call for the displaced
 * occupant.
 */
/** f.h(int) (#390): `f(id); e(id);` -- clear the unit from the player's selection. */
export function releaseEntitySelection(rt: LegacyRuntimeState, entityId: number): void {
    const result = finalizeLegacyEntitySelection({
      id: entityId,
      k: rt.game.kByte,
      w: rt.game.barMode,
      l: rt.game.selectedId,
      q: rt.game.qCounter,
      dense: rt.denseState,
      onSelectionReset: () => { rt.runSelectionFlagsRefresh(true, true, false, false); },
    });
    rt.game.kByte = result.k;
    rt.game.barMode = result.w;
    rt.game.selectedId = result.l;
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
  }

/** Raw f.b(int,boolean) entity-mode entry point. */
export function setEntityMode(rt: LegacyRuntimeState, id: number, enabled: boolean, callbacks: Omit<LegacyEntityModeInput, "state" | "packedBytes" | "packedOffsets"> = {}): void {
    setLegacyEntityMode({
      ...callbacks,
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
    }, id, enabled);
  }
