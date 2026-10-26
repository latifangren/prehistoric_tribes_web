import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import { stepLegacyAj } from "../units/LegacyUnitSelection";
import { stepLegacyClassCReset } from "../../platform/LegacyResourceTables";
import { resetLegacyZI } from "../../ui/LegacyZI";
import { restoreLegacyAuxiliary } from "../world/LegacyAuxiliaryQueue";
export function stepSubsystemStateCommand(rt: LegacyRuntimeState, value: number): void {
  // stateCommandState is live (see its docblock): no copy in or out.
  const state = rt.stateCommandState;

  rt.stepStateTransitionCommand({
    state,
    // BUG FIX (2026-08-31): `i()` (#610) is `b(int)`'s own unconditional
    // first instruction (offset 0..1 of every call, positive or negative
    // arg) -- was never wired on rt call path at all (only the
    // now-dead `runSceneDispatch` called `resetLegacyZI` directly).
    onReset: () => resetLegacyZI(rt.game),
    onS: () => {
      rt.stepStateS({
        state,
        aFlags: rt.game.selectionFlags,
        onAJ: () => {
          const ajState = {
            uFlag: rt.game.boxSelecting, F: rt.game.selectionGroup, k: rt.game.kByte,
            E: rt.game.ECounter, D: rt.game.DCounter, C: rt.game.CCounter, B: rt.game.BCounter,
          };
          stepLegacyAj(ajState);
          rt.game.boxSelecting = ajState.uFlag;
          rt.game.selectionGroup = ajState.F;
          rt.game.kByte = ajState.k;
          rt.game.ECounter = ajState.E;
          rt.game.DCounter = ajState.D;
          rt.game.CCounter = ajState.C;
          rt.game.BCounter = ajState.B;
        },
        onInputReset: () => rt.stepLegacySceneAnimatedSlotClear(),
        onCSelector: (value) => rt.selectResourceSection(value),
        // f.O() (~142 lines), called when aP:I===1. UNIFICATION (2026-08-31):
        // previously left unwired here (deferred, matching a note that
        // rt call path's traced args never hit aP===1) while the
        // now-deleted duplicate `stepLegacyS`/`runSceneDispatch` DID wire
        // it (`stepLegacyO`, already fully ported and used elsewhere by
        // the "K"/"M" handlers' own onO). Wiring it here too now that rt
        // is the ONLY S() path any caller reaches, positive or negative.
        onO: () => rt.stepLegacyO(),
        onSelectionSync: (first, second, third, fourth) => rt.runSelectionFlagsRefresh(first, second, third, fourth),
      });
    },
    onT: () => {
      // T()'s aw/q/bF are live fields (game.levelAwByte/qByte and b.f:B,
      // game.subsystemGFFlagByte). MERGED 2026-09-23: b.f:B -- the
      // mission-script step -- had three unsynced copies (rt one was
      // game.subsystemFByte; U()/ak()/al()/the save record used
      // subsystemArrays.bFByte), so the script read one and advanced
      // another.
      //
      // BUG FIX (2026-08-31): aw/q/bF used to be a plain copy-in/copy-out
      // snapshot (read from game.* before stepStateT ran, written back to
      // game.* only after it returned). Real bytecode `putfield`s write
      // the instance field immediately, so if a LATER call in the same
      // branch throws (e.g. ai===48's onMapLoad -- loadMap() genuinely
      // throws when no /ma resource is attached), the real game still
      // keeps every field write that happened before the throw; the
      // batched copy-out lost all of them. Surfaced by
      // verify-scene-dispatch-branches.mjs's ai===48 case once rt
      // became the ONLY T() path (previously masked because the deleted
      // duplicate `stepLegacyTAi48` wrote game.* directly with no
      // batching). Fixed by making aw/q/bF live accessors straight onto
      // game.* instead of a snapshot -- each write is now visible
      // immediately, matching bytecode field-mutation semantics exactly.
      const runtime = rt;
      const tState = {
        ai: state.ai,
        get aw() { return runtime.game.levelAwByte; },
        set aw(value: number) { runtime.game.levelAwByte = value; },
        get q() { return runtime.game.mission; },
        set q(value: number) { runtime.game.mission = value; },
        get bF() { return runtime.game.subsystemGFFlagByte; },
        set bF(value: number) { runtime.game.subsystemGFFlagByte = value; },
        p: state.p,
      };
      // Live q:B matters here: T() sets q (offsets 480/502) before its
      // placements (bug fixed 2026-08-31, now covered by the shared getters).
      const placementOptions = rt.buildingPlacementOptions();
      rt.stepStateT({
        state: tState,
        onRecordAction: (first, second) => rt.stepEntityCoordinateUpdate(first, second),
        onSubsystemL: () => rt.stepLegacyBL(),
        onSubsystemM: () => rt.stepLegacyBM(),
        onRecordCommand: (first, second, third) => rt.stepLegacyD3(first, second, third),
        onEntityCreate: (team, x, y, type, flags) => {
          rt.allocateRecord(rt.gridC, team, x, y, type, flags, rt.recordOptions());
        },
        // NOTE (2026-08-25, resolved 2026-08-31): rt rebuilds live
        // aw/q on every onBCreate call rather than snapshotting one
        // `batchOptions` up front. Confirmed via bytecode (f-javap.txt
        // offsets 131..259, T()'s ai===37 branch) that aw:B is mutated
        // BETWEEN the b.a(IIIBB) invocations and each call reads b's own
        // live field state, so a stale single snapshot would be wrong.
        // The duplicate hand-written T() port (stepLegacyTAi37/38/48,
        // which DID snapshot once) has since been deleted -- rt is now
        // the only implementation, and it uses the confirmed-correct
        // live-rebuild approach.
        onBCreate: (count, x, y, type, value) => {
          try {
            rt.batchAllocate(count, x, y, type, value);
          } catch { /* f.ak() catches rt, matching the original */ }
        },
        onPlace: (team, type, x, y, flags, special, existingId) => {
          rt.placeEntity(rt.gridC, team, type, x, y, flags, special, existingId, placementOptions);
        },
        onMapReset: (q) => { rt.resetMapEntryAllocation(q); },
        onMapLoad: (q) => { rt.loadMap(q); },
        onResourceReset: () => {
          try { stepLegacyClassCReset(rt.resourceTables); } catch { /* f.ak()'s own try/catch, kept */ }
        },
        // f.b(int,int,int,int) (allocateLegacySubsystemRecord) -- same
        // already-wired helper stepLegacySubsystemH's own onSubsystemRecord
        // uses.
        onSubsystemRecordAllocate: (first, x, y, counterIndex) => {
          rt.allocateSubsystemRecord(rt.gridC, first, x, y, counterIndex, {
            randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
            counters: rt.game.subsystemT,
            q: rt.game.mission,
          });
        },
      });
      // No write-back needed: aw/q/bF above are now live game.* accessors.
    },
    onU: () => {
      rt.stepStateU({
        state,
        frame: rt.game.missionFrame,
        // Wired 2026-09-27: ai == 26 runs f.c() (offset 22) and ai == 28
        // clears one b.d:[S entry (offset 105).
        onMapSession: () => rt.stepLegacyC(),
        onShortWrite: (index, value) => { rt.subsystemArrays.dShort[index] = value; },
        onScriptTimer: (value) => { rt.subsystemArrays.bField16 = value; },
        // BUG FIX (2026-09-04): U()'s very first bytecode instruction
        // (f-javap.txt offset 0..4, before any of its selector branches)
        // is `rt.a.d()` -- a full b.d() spatial pass -- but rt
        // callback was entirely missing from rt call site (LegacyStateU
        // .ts's `onSubsystemReset?.()` silently no-op'd every call). b.d()
        // is the ONLY place in the whole game that ever writes the
        // fog/vision bitmap (`mainArrays.aInt`, f.a:[[[I) for team-0
        // units/buildings -- with rt never wired, occupancyClass() read
        // 2 (fully unexplored) for every tile on every map, forever,
        // which blocks every entity-branch sprite draw in
        // LegacyGameplayCellLoop.ts (positive branch requires
        // occupancyClass===0; the negative branch's and tail's own first
        // gates both no-op when occupancyClass>=2). Wired to
        // `runSpatialPass`, whose default `onPrimarySpatialUpdate` now
        // targets the real `mainArrays.aInt` (see that field's own
        // docblock for the `intLayers` alias bug fixed alongside rt).
        // FOLLOW-UP (2026-09-04): rt U()-entry call is a one-shot; the
        // per-frame producer is b.s()'s `(f.c & 3) === 0` -> b.d(), which
        // was still unwired at the `runSubsystemPrepass` call site until
        // the fix recorded there. `onRectSpatialUpdate` (the building-
        // footprint half) is wired too now -- b.a(IIII) shares b.d(III)
        // with b.a(III), so it marks the same layer.
        onSubsystemReset: () => rt.runSpatialPass({}),
        // Offset 43: `ao == 9` -> b.f(), the end-of-event party restore.
        onSpecialGuard: () => restoreLegacyAuxiliary({
          dense: rt.denseState,
          shortRows: rt.mainArrays.aShort,
          auxiliaryRows: rt.subsystemArrays.eRows,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          saveOffsets: rt.saveOffsets,
        }, rt.auxiliaryQueueState),
        onRecordAction: (first, second) => rt.stepEntityCoordinateUpdate(first, second),
        // U()'s advance branch sets Q = 28 and calls f.b(ai) at once; the
        // live bag makes that write visible to the recursive call.
        onB: (next) => rt.stepSubsystemStateCommand(next),
        onRecordCommand: (first, second, third) => rt.stepLegacyD3(first, second, third),
        onResourceReset: () => {
          try { stepLegacyClassCReset(rt.resourceTables); } catch { /* f.ak()'s own try/catch, kept */ }
        },
        onViewportNormalize: () => rt.normalizeEntityViewport(),
        onSelectionFlags: (flags) => {
          rt.runSelectionFlagsRefresh(
            flags[0] ?? false, flags[1] ?? false, flags[2] ?? false, flags[3] ?? false,
            flags[4] ?? false, flags[5] ?? false, flags[6] ?? false, flags[7] ?? false, flags[8] ?? false,
          );
        },
      });
    },
    onRecordAction: (first, second) => rt.stepEntityCoordinateUpdate(first, second),
  }, value);

}

