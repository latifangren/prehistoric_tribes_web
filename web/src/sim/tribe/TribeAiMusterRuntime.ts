import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import { liveView } from "../../core/LegacyRuntimeState";
import { stepLegacySubsystemAq } from "./LegacySubsystemAq";
import { stepLegacySubsystemAr } from "./LegacySubsystemAr";
import { stepLegacySubsystemAs } from "./LegacySubsystemAs";
import { stepLegacySubsystemAt, stepLegacySubsystemAu } from "./LegacySubsystemAt";
import { stepLegacySubsystemAv } from "./LegacySubsystemAv";
import { stepLegacySubsystemAw } from "./LegacySubsystemAw";
import { stepLegacySubsystemLowerO } from "./LegacySubsystemLowerO";
import { stepLegacySubsystemNearestBuilding } from "./LegacySubsystemNearestBuilding";
import { stepLegacyEntityRecordCancel } from "../units/LegacyEntityRecordCancel";
import { stepLegacyZB2 } from "../../ui/LegacyZB2";
import { releaseLegacySubsystemBTenSlotEntity } from "./LegacySubsystemBTenSlot";

/**
 * Team 1's "muster and deploy" AI cluster (aq()/ar()/as()/av()/aw()/
 * at()/o(int)), wired into b.e()'s real `if (team===1) aq();` call site
 * (`onTeamOneAuxiliary`, `LegacySubsystemEntityLoop.ts`). No try/catch
 * needed here specifically -- rt whole callback runs INSIDE
 * `stepSubsystemFrame()`'s existing try/catch around
 * `runSubsystemEntityLoop(...)`, which already matches `b.e()`'s own
 * real exception table (offsets 0..832 -> 833) that rt call chain
 * (none of aq()/as()/at() have their own exception tables) propagates
 * into on at()'s confirmed guaranteed throw.
 *
 * `private int a(int,int,int)` (#266, as()/aw()'s shared "occupancy
 * check") is now wired for real -- confirmed a guaranteed throw (same
 * permanently-null `b:[S]`#132 as elsewhere rt session; see
 * `LegacySubsystemEntityOccupancyCheck.ts`) except for a narrow escape
 * (`dense[4444+v] < -1`), so both call sites can genuinely crash rt
 * whole cluster for a tick, caught by the same outer handler noted
 * above.
 *
 * `f.b(int,boolean):V` (#353, ar()'s building-order action) is ALSO now
 * wired for real: direct bytecode read confirms its very first action
 * unconditionally calls `b.b(byte)`, already confirmed a guaranteed
 * throw from earlier work rt session (`LegacySubsystemBFreeList.ts`,
 * via the SAME `g:[[B]`#176 permanently-null field `g()` hit) -- no new
 * derivation needed, just wiring.
 *
 * `av()`'s rally broadcast (#307) is class b's OWN sibling method
 * `a(IIIBB)`, the same one f.T() calls (`batchAllocate`). RETRACTED
 * 2026-09-23: it was a separate duplicate port (LegacySubsystemRallySpawn)
 * that never ran L() or the #270 free-cell search; now shared.
 *
 * `o(int)`'s own gate (#288, `rt.a(6)`) is ALSO now wired for real --
 * unlike every other helper in rt cluster, it does NOT touch any
 * confirmed-null field; it's genuine "find the nearest eligible
 * building and clamp the entity's target onto its footprint" logic
 * (`LegacySubsystemNearestBuilding.ts`). Every cross-method helper rt
 * cluster depends on is now either wired for real or a confirmed
 * guaranteed throw -- none remain as invented no-op stubs.
 */
export function subsystemTeamOneAiMuster(rt: LegacyRuntimeState): void {
  const g = rt.game;

  const onLowerO = (entityId: number) => {
    stepLegacySubsystemLowerO(
      { state: rt.denseState, gridC: rt.gridC, entityId, arg: -1 },
      {
        onChangeEntityType: (id, type) => { rt.changeEntityType(id, type); },
        onCheckGate: (kind) =>
          stepLegacySubsystemNearestBuilding(
            { state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets, team: 1, entityId, kind },
            { onClamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
          ),
        onGroupMode: (id, argument) => rt.subsystemG(id, argument),
      },
    );
  };

  const onAt = (entityId: number, aT: number) => {
    stepLegacySubsystemAt(
      {
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        jobTable: rt.subsystemArrays.j,
        entityId,
        qByte: g.subsystemBQByte,
        mByte: g.subsystemM,
        aT,
        gBase: g.subsystemGBase,
        gridC: rt.gridC,
        sceneQ: g.mission,
        fBByte: g.difficulty,
        simulationCounter: g.missionFrame,
        saveOffsets: rt.saveOffsets,
        // b.x:I (#230) / b.w:I (#228) -- cross-method scratch fields, not
        // per-call locals (see LegacySubsystemAt.ts's own docblock and
        // 2d38a12's o() fix for the same class of bug). Live-bound to
        // `game.subsystemX`/`game.subsystemW` so writes persist for the
        // other 8+ methods that read them.
        scratch: {
          get x(): number { return g.subsystemX; },
          set x(v: number) { g.subsystemX = v; },
          get w(): number { return g.subsystemW; },
          set w(v: number) { g.subsystemW = v; },
        },
      },
      {
        onLowerO: () => onLowerO(entityId),
        onChangeEntityType: (id, type) => { rt.changeEntityType(id, type); },
        // final boolean a(int) (#288) -- the SAME gate onLowerO's own
        // onCheckGate calls; at()'s Block E is a second real call site
        // for it (see LegacySubsystemAt.ts's docblock for the
        // correction to LegacySubsystemNearestBuilding.ts's "only one
        // call site" claim).
        onCheckGate: (kind) =>
          stepLegacySubsystemNearestBuilding(
            { state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets, team: 1, entityId, kind },
            { onClamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
          ),
        // private void au() (#328), ported 2026-09-28.
        onAu: () => { const runtime = rt; stepLegacySubsystemAu({
          state: rt.denseState,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          gridC: rt.gridC,
          v: entityId,
          sceneQ: g.mission,
          scratch: {
            get C(): number { return runtime.subsystemArrays.bField10; }, set C(value: number) { runtime.subsystemArrays.bField10 = value; },
            get D(): number { return runtime.subsystemArrays.bField12; }, set D(value: number) { runtime.subsystemArrays.bField12 = value; },
          },
          onChangeEntityType: (id, type) => { rt.changeEntityType(id, type); },
        }); },
      },
    );
  };

  const onAv = () => {
    const result = stepLegacySubsystemAv(
      {
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        jobTable: rt.subsystemArrays.j,
        team: 1,
        aInt: g.subsystemA,
        mByte: g.subsystemM,
        rByte: g.subsystemRByte,
        nByte: g.subsystemNByte,
        oByte: g.subsystemOByte,
        gByte: rt.subsystemArrays.bgByte,
        sceneQ: g.mission,
        fBByte: g.difficulty,
        simulationCounter: g.missionFrame,
        fields: liveView<{ x: number; y: number; z: number; aU: number; v: number }>(g, {
          x: "subsystemX", y: "subsystemY", z: "subsystemEntityZ", aU: "subsystemAU", v: "bUnit",
        }),
      },
      {
        onClamp: (value, min, max) => Math.max(min, Math.min(max, value)),
        onRandomA: (mask, divisor) => rt.randomRemainder(mask, divisor),
        // b.a(IIIBB) #307 -- the same method T() reaches via onBCreate.
        onRallyBroadcast: (count, x, y, team, role) => { rt.batchAllocate(count, x, y, team, role); },
      },
    );
    g.subsystemRByte = result.rByte;
    g.subsystemNByte = result.nByte;
    g.subsystemOByte = result.oByte;
  };

  const onAw = () => {
    const result = stepLegacySubsystemAw(
      {
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        gridC: rt.gridC,
        team: 1,
        nByte: g.subsystemNByte,
        oByte: g.subsystemOByte,
        aR: g.subsystemAR,
        sceneQ: g.mission,
        simulationCounter: g.missionFrame,
      },
      {
        onCheckOccupancy: (id, x, y, arg) =>
          rt.occupancyCheck(id, x, y, arg),
      },
    );
    g.subsystemOByte = result.oByte;
  };

  const onAs = () => {
    const result = stepLegacySubsystemAs(
      {
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        jobTable: rt.subsystemArrays.j,
        team: 1,
        aQ: rt.subsystemArrays.bAQ,
        fByte: g.subsystemGFFlagByte,
        mByte: g.subsystemM,
        sceneQ: g.mission,
        fBByte: g.difficulty,
        simulationCounter: g.missionFrame,
        fields: liveView<{ O: number; aR: number; v: number; w: number; Q: number }>(g, { O: "subsystemOByte", aR: "subsystemAR", v: "bUnit", w: "subsystemW", Q: "subsystemBQByte" }),
      },
      {
        onRandomA: (mask, divisor) => rt.randomRemainder(mask, divisor),
        onAt,
        onAv,
        onAw,
        onGroupMode: (id, argument) => rt.subsystemG(id, argument),
        onCheckOccupancy: (id, x, y, arg) =>
          rt.occupancyCheck(id, x, y, arg),
      },
    );
    rt.subsystemArrays.bAQ = result.aQ;
    g.subsystemAU = result.aU;
  };

  const placementOptions = rt.buildingPlacementOptions();

  stepLegacySubsystemAq(
    {
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      mainShort: rt.mainArrays.aShort,
      gridC: rt.gridC,
      // f.a:[[[B (#74 via b, #132 in f) is mainArrays.aByte3 and f.b:[[[B (#139 via b,
      // #237 in f) is xSlotTable; the separate scoutMemory/buildingQueue copies were
      // never read by anything else (merged 2026-09-14).
      scoutMemory: rt.mainArrays.aByte3,
      buildingQueue: g.xSlotTable,
      freeSlotTable: rt.mainArrays.f4,
      team: 1,
      fByte: g.subsystemGFFlagByte,
      qByte: g.subsystemBQByte,
      rByte: g.subsystemRByte,
      sceneQ: g.mission,
      simulationCounter: g.missionFrame,
    },
    {
      onPrologue: (m, a) => { g.subsystemM = m; g.subsystemA = a; },
      // private void n(int) (#404), b-javap offsets 0..193: v = 0, w = a table
      // row picked at random, then a(1, 127, x, y) (#270) puts a free cell near
      // a random point of that row's rectangle into dense[3131]/[3232] (v = 0).
      // Ported 2026-10-13 (oracle run 13, play10 frame 30713): was unwired.
      onN: (arg) => {
        const t = (index: number) => rt.packedBytes[index] ?? 0;
        const q = g.mission;
        const row = (rt.packedOffsets[arg + 1] ?? 0) + q;
        g.bUnit = 0;
        g.subsystemW = (rt.packedOffsets[arg] ?? 0) +
          (t(row) + rt.randomRemainder(255, t(row + 1) - t(row))) * 4;
        const w = g.subsystemW;
        const x = t(w) + rt.randomRemainder(65535, t(w + 2) - t(w) + 1);
        const y = t(w + 1) + rt.randomRemainder(65535, t(w + 3) - t(w + 1) + 1);
        rt.checkSpiralPlacementGate(1, 127, x, y, g.bUnit);
      },
      onAr: () => {
        const result = stepLegacySubsystemAr(
          {
            state: rt.denseState,
            packedBytes: rt.packedBytes,
            packedOffsets: rt.packedOffsets,
            gridC: rt.gridC,
            pByte: g.subsystemP,
            sceneQ: g.mission,
            simulationCounter: g.missionFrame,
          },
          {
            // f.b(int,boolean) (#353), the whole method. FIXED 2026-10-07:
            // only its opening b.b(byte) ran here, so 8627 was never set;
            // ar() re-picks any record with 8627 == 0, re-inserted the same
            // team-1 records into g[0] every pass until all 20 slots were
            // full, after which no upgrade/repair could be queued and g()
            // threw (and aborted) on every record with 8627 != 0.
            onBuildingAction: (id: number, flag: boolean) => {
              stepLegacyZB2(
                { dense: rt.denseState, gRows: rt.subsystemArrays.gRows, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets },
                id,
                flag,
                {
                  onReleaseTenEntity: (target) => releaseLegacySubsystemBTenSlotEntity(rt.subsystemArrays.cRows, rt.denseState, target, {
                    onD: (entityIndex, argument) => rt.subsystemD(entityIndex, argument),
                  }),
                  onRecordCancel: (node, owner) => stepLegacyEntityRecordCancel(
                    rt.denseState, rt.gridC, node, owner, false, false, (record) => rt.completeEntityRecord(record),
                  ),
                },
              );
            },
            onV: (value) => { g.bUnit = value; },
            onPlaceEntity: (team, type, x, y, flags, specialPlacement, existingId) =>
              rt.placeEntity(rt.gridC, team, type, x, y, flags, specialPlacement, existingId, placementOptions),
          },
        );
        g.subsystemP = result.pByte;
      },
      onAs,
    },
  );
}
