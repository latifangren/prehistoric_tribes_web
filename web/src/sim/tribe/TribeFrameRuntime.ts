import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import { LegacySubsystemArrays } from "../../core/LegacySubsystemArrays";
import { stepLegacyD as stepLegacyFD } from "../../ui/LegacyFrameProgressionScan";
import { enqueueLegacyEffectSlot } from "../../render/LegacyEffectSlotScan";
import { allocateLegacySubsystemRecord } from "./LegacySubsystemRecord";
import { selectLegacyAuxiliaryCandidates, restoreLegacyAuxiliary } from "../world/LegacyAuxiliaryQueue";
import { stepLegacyEntityIUpdate } from "../units/LegacyEntityIUpdate";
import { runLegacySubsystemPrepass, type LegacySubsystemPrepassInput } from "./LegacySubsystemPrepass";
import { runLegacySubsystemEntityLoop, type LegacySubsystemEntityLoopInput } from "./LegacySubsystemEntityLoop";
import { stepLegacySubsystemI } from "./LegacySubsystemTail";
import { stepLegacySubsystemWorkerDispatch } from "./LegacySubsystemWorkerDispatch";
import { stepLegacyEntityIFinalize } from "../units/LegacyEntityIFinalize";
import { checkLegacyEntityAffordable } from "../units/LegacyEntityResourceCost";
import { stepLegacySubsystemNearestBuilding } from "./LegacySubsystemNearestBuilding";
import { stepLegacySubsystemAk } from "./LegacySubsystemAk";
import { stepLegacySubsystemAl } from "./LegacySubsystemAl";
import { stepLegacySubsystemH } from "./LegacySubsystemH";
import { stepLegacyEntityOccupantCare } from "../units/LegacyEntityOccupantCare";
import { stepLegacySubsystemAj } from "./LegacySubsystemAj";
import { stepLegacySubsystemAm } from "./LegacySubsystemAm";
import { stepLegacyAnimalHitReaction } from "../units/LegacyAnimalHitReaction";
import { stepLegacyEntityScreenIndex } from "../units/LegacyEntityScreenIndex";
import { stepLegacyEntityMoodPick } from "../units/LegacyEntityMoodPick";
import { stepLegacyEntitySpotAlert } from "../units/LegacyEntitySpotAlert";
import { computeLegacySubsystemPairScore } from "./LegacySubsystemScore";
import { stepLegacySubsystemRecordWorkerLevel } from "./LegacySubsystemEntityMoveCancel";
import { stepLegacySubsystemEntityPaceAccum } from "./LegacySubsystemEntityPaceAccum";
import { stepLegacySubsystemAf } from "./LegacySubsystemAf";
import { stepLegacySubsystemAg } from "./LegacySubsystemAg";
import { stepLegacySubsystemAh } from "./LegacySubsystemAh";
import { stepLegacySubsystemAi } from "./LegacySubsystemAi";
import { stepLegacyEntityStatusGuard } from "../units/LegacyEntityStatusGuard";
import { stepLegacyEntityActionCommit } from "../units/LegacyEntityActionCommit";
import { stepLegacyEntityFollowup } from "../units/LegacyEntityFollowup";
import { checkLegacyEntityModeListed, stepLegacySubsystemEntityProbe } from "./LegacySubsystemEntityProbe";
import { stepLegacySubsystemEntityAssociationScan } from "./LegacySubsystemEntityAssociationScan";
import { stepLegacyEntityCWatch } from "../units/LegacyEntityCWatch";
import { stepLegacyEntityActionScoreGate } from "../units/LegacyEntityActionScoreGate";
import { checkLegacyEntityOccupant } from "../units/LegacyEntityOccupantCheck";
import { checkLegacySpiralPlacementGate } from "../world/LegacySpiralPlacementGate";
import { indexLegacyEntityRecord } from "../world/LegacyEntityRecordLifecycle";
import { stepLegacyEntityDPredicate } from "../units/LegacyEntityDPredicate";
import { stepLegacyEntityHousing } from "../units/LegacyEntityHousing";
import { stepLegacyEntityCrowdDecay, stepLegacyEntityCrowdSpread } from "../units/LegacyEntityCrowdStress";
import { stepLegacyEntityHappiness } from "../units/LegacyEntityHappiness";
import { stepLegacyEntityESelection } from "../units/LegacyEntityESelection";
import { checkLegacyEntityRecord } from "../units/LegacyEntityRecordCheck";
import { stepLegacyEntityAssociationCleanup } from "../units/LegacyEntityAssociationCleanup";
import { BLD_KIND, BLD_OWNER, BLD_WORK, BLD_WORKERS, BLD_WORKER_HEAD, UNIT_AGE, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_FLAGS, UNIT_HELD_ITEM, UNIT_HP, UNIT_JOB_TYPE, UNIT_MELEE_SKILL, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_ORDER, UNIT_RANGED_SKILL, UNIT_RECORD, UNIT_SCOUT_SKILL, UNIT_SLOT, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TIMER, UNIT_TYPE, UNIT_VISION, UNIT_WORK_TARGET, UNIT_Y } from "../../core/DenseLayout";
import { stepLegacySubsystemEntityRevertIdle } from "./LegacySubsystemEntityRevertIdle";
import { liveView } from "../../core/LegacyRuntimeState";
import { subsystemTeamOneAiMuster } from "./TribeAiMusterRuntime";
import { stepSubsystemAnFor, subsystemEntityLoopTail, subsystemUnitTraining } from "./TribeEntityRuntime";

/** Raw b.s() prepass used by the original b.e() update. */
export function runSubsystemPrepass(rt: LegacyRuntimeState, 
  frame: number,
  q: number,
  bByte: number,
  lFlag: boolean,
  callbacks: Omit<LegacySubsystemPrepassInput, "frame" | "q" | "bByte" | "lFlag" | "packedBytes" | "packedOffsets" | "mainShort">,
): void {
  runLegacySubsystemPrepass({
    ...callbacks,
    frame,
    q,
    bByte,
    lFlag,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    mainShort: rt.mainArrays.aShort,
  });
}

/** Raw b.e() outer entity loop; private entity methods remain callbacks. */
export function runSubsystemEntityLoop(rt: LegacyRuntimeState, 
  frame: number,
  q: number,
  bByte: number,
  scheduler: { kByte: number },
  callbacks: Omit<LegacySubsystemEntityLoopInput, "state" | "mainShort" | "packedBytes" | "packedOffsets" | "frame" | "q" | "bByte" | "scheduler"> = {},
): void {
  runLegacySubsystemEntityLoop({
    ...callbacks,
    state: rt.denseState,
    mainShort: rt.mainArrays.aShort,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    frame,
    q,
    bByte,
    scheduler,
  });
}
/**
 * Execute the confirmed outer b.g()/b.e() update order used by f.j().
 *
 * b.h() and the entity-private movement/combat calls are intentionally left
 * as raw callback boundaries until their bytecode consumers are mapped.
 *
 * WIRED (2026-08-24): `selectEntityUpdateCandidates`'s `onCleanup` --
 * see `LegacyEntityUpdateSelection.ts`'s own docblock for the bug rt
 * fixed (the gate conditions were previously inverted/mis-scoped, and
 * never wired to any real caller, so it shipped silently broken). The
 * real bytecode's `f.a(id,true)` is the already-ported/wired
 * `filterEntityLifecycle` (same `readEntityCell` used at its other real
 * call site above); `b.ad()` is the already-ported `cleanupEntityUpdate`.
 *
 * WIRED (2026-08-24): `onEntityReset`/`onEntityFinalize` (`f.a(id,0)`/
 * `f.d(id)`) -- both targets were already ported/wired elsewhere and
 * just needed reuse here: `f.a(int,int)`(#477) is `enqueueLegacyEffectSlot`
 * (same `mainArrays.e`/`e:[[B]`#280 table `stepEntityRemoval` already
 * enqueues into above); `f.d(int)` is `stepLegacyFD`
 * (`LegacyFrameProgressionScan.ts`'s `stepLegacyD`, imported aliased,
 * same helper already wired at rt file's `onSlotAction`/offset-100
 * call sites).
 */
export function stepSubsystemFrame(rt: LegacyRuntimeState): void {
  rt.selectEntityUpdateCandidates(rt.game.missionFrame, {
    onCleanup: (id, associationIndex) => {
      rt.filterEntityLifecycle(id, true, (row, column) => rt.gridC[row]?.[column] ?? 0);
      rt.cleanupEntityUpdate(id, associationIndex, {
        onEntityReset: (entityId, mode) => {
          enqueueLegacyEffectSlot(rt.mainArrays.e, entityId, mode);
        },
        onEntityFinalize: (entityId) => {
          const dState = { w: rt.game.barMode, q: rt.game.qCounter, P: rt.game.pendingP };
          stepLegacyFD(entityId, dState);
          rt.game.pendingP = dState.P;
        },
      });
    },
  });
  // b.K:B (#28), live: a():Z resets it mid-loop (offset 654). FIXED 2026-10-09 (oracle run 5,
  // frame 12810): a snapshot written back after the loop undid every reset, so K stayed 50 and
  // b.a(byte,int,int) raised prompts the original holds back while K < 50.
  const arrays = rt.subsystemArrays;
  const scheduler = { get kByte() { return arrays.bField28; }, set kByte(value: number) { arrays.bField28 = value; } };
  // e()'s own exception table (offsets 0..832 -> 833, pop;return) wraps
  // the ENTIRE method -- confirmed via direct bytecode read (2026-08-27).
  // This matters because b.t()'s onEntityTargetStep callback can reach a
  // confirmed-guaranteed-throw (subsystemEntityTransform, only when an
  // entity's mode is exactly 2 -- see LegacyEntityActionCommit.ts's own
  // docblock) that is NOT locally caught inside t() itself, so it
  // propagates here. Faithfully reproducing e()'s own catch means one
  // mode===2 entity anywhere in the roster aborts the REST of rt
  // tick's entity loop (every entity after it in iteration order), not
  // just that one entity -- matched with a try/catch at rt exact
  // scope, not the broader f.j()-level catch four other confirmed-throw
  // instances rt session relied on.
  try {
    runSubsystemEntityLoop(rt, 
      rt.game.missionFrame,
    rt.game.mission,
    // f.b:B (b's #138, f's #243 -- levelBByte). CORRECTED 2026-10-14: subsystemModeByte, never written.
    rt.game.difficulty,
    scheduler,
    {
      // b.e()'s own u:I maintenance -- see LegacySubsystemEntityLoop.ts's
      // note at rt callback's call site.
      onTeamStart: (team) => { rt.game.bTeam = team; },
      onV: (v) => { rt.game.bUnit = v; },
      readV: () => rt.game.bUnit,
      onTeamOneAuxiliary: () => { subsystemTeamOneAiMuster(rt); },
      // b.e()'s offset-31 `a(0)` (#281, stepLegacySubsystemWorkerDispatch),
      // result popped. WIRED 2026-09-22 -- the last of e()'s four unwired
      // calls; the method itself was already ported for y()/ap().
      onWorkerDispatchPass: (argument) => {
        stepLegacySubsystemWorkerDispatch({
          state: rt.denseState,
          fields: liveView<{ v: number }>(rt.game, { v: "bUnit" }),
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          gridC: rt.gridC,
          team: rt.game.bTeam,
          aRows: rt.mainArrays.aByte3,
          bRows: rt.game.xSlotTable,
          onChangeType: (entityId, type) => { rt.changeEntityType(entityId, type); },
          onN: (entityId) => rt.stepSubsystemN(entityId, rt.game.bTeam),
        }, argument);
      },
      // b.e()'s offset-256 `h()`, WIRED 2026-09-22 -- a villager noticing an
      // enemy marker within its sight, and the "stop and look" animation
      // whose `true` return holds the unit for the rest of the tick.
      onEntityTimingCheck: (id) => stepLegacyEntitySpotAlert({
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        v: id,
        team: id <= 50 ? 0 : 1,
        frame: rt.game.missionFrame,
        markerTable: rt.game.teamMarkerTable,
        jRow4: (index) => rt.packedData?.byteTables?.[4]?.[index] ?? 0,
        scratch: rt.spotAlertScratch(),
        onSpiralGate: (mode, scanLimit, x, y) => {
          try {
            rt.checkSpiralPlacementGate(mode, scanLimit, x, y, id);
          } catch {
            // e()'s own exception table covers rt call.
          }
        },
      }),
      // b.e()'s offset-311 `B()`, WIRED 2026-09-22 -- it picks the thought
      // bubble LegacyEntityOverlayDraw draws as sprite 77 + dense[3333+id].
      // Unwired, villagers only ever showed the few icons k() and i() set.
      onPeriodicEntityAction: (id) => stepLegacyEntityMoodPick({
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        saveOffsets: rt.saveOffsets,
        v: id,
        random: (mask, divisor) => rt.randomRemainder(mask, divisor),
      }),
      // b.e()'s offset-752 `T()`, WIRED 2026-09-22 -- it rebuilds the
      // on-screen entity index (gridG plus the dense[6060] chain) that
      // LegacySecondaryCellChain.ts walks. Nothing had ever produced it.
      onFinalScriptedPass: () => stepLegacyEntityScreenIndex({
        state: rt.denseState,
        gridG: rt.gridG,
        viewportI: rt.game.cameraColumn,
        viewportK: rt.game.cameraRow,
        viewportO: rt.game.viewColumns,
        viewportP: rt.game.viewRows,
      }),
      onTeamEnd: (team) => { subsystemUnitTraining(rt, team); },
      onPrepass: () => {
        runSubsystemPrepass(rt, 
          rt.game.missionFrame,
          rt.game.mission,
          // b.s() offsets 87..90: f.b:B (levelBByte). CORRECTED 2026-10-14: subsystemModeByte.
          rt.game.difficulty,
          // b.s() offset 30 reads f.L:Z (#33), FORM UP. CORRECTED 2026-10-13
          // (oracle run 14, play11 frame 48344): it read subsystemLFlag, a
          // twin nothing wrote, so the b() sweep never ran during FORM UP.
          rt.game.formUpActive,
          {
            // b.s() offset 7: c.b() -- the floating +n/-n texts. Wired 2026-09-28.
            onResourceTick: () => rt.geometry.stepFloatingTexts(rt.game.missionFrame),
            fByte: rt.game.subsystemGFFlagByte,
            onFReset: () => { rt.subsystemArrays.bField16 = 0; },
            // BUG FIX (2026-09-04): b.s()'s `(f.c & 3) === 0` guard calls
            // `b.d()` (offset 22, invokevirtual #368) -- the every-4th-
            // frame fog/vision recompute, and the ONLY per-frame producer
            // of `mainArrays.aInt`. It was never wired here, so after
            // d797a4b wired the one-shot U()-entry pass, the layers still
            // went empty again the moment anything reset them and never
            // came back: occupancyClass() read 2 (fully unexplored) for
            // every tile of every map, so f.u() filled the whole visible
            // window with the class-2 solid black fog rect and drew no
            // terrain or entity sprite at all. Live-confirmed before the
            // fix: `runSpatialPass` called 0 times across 5 ticks with 9
            // live entities on the map, both int layers all-zero.
            onSpatialPass: () => rt.runSpatialPass({}),
            // b.s()'s `f.L && (f.c&63)===2` guard calls b's own `final
            // void b()` (offset 51, invokevirtual #338 "Method b:()V" --
            // the ONLY no-arg void-returning `b()` in class b, distinct
            // from the `private boolean b()` overload) -- the SAME
            // method already ported and wired elsewhere as
            // `subsystemBTeamSweep`.
            onEntityGuardPass: () => rt.subsystemBTeamSweep(),
          },
        );
      },
      onEntityStatusCheck: (id) => stepLegacyEntityStatusGuard({
        fields: liveView<{ B: number }, LegacySubsystemArrays>(rt.subsystemArrays, { B: "bField8" }),
        onFBump: () => { rt.subsystemArrays.bField16 += 1; },
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        shortTableB: rt.saveOffsets,
        gridC: rt.gridC,
        id,
        team: id <= 50 ? 0 : 1,
        frame: rt.game.missionFrame,
        subsystemGFFlagByte: rt.game.subsystemGFFlagByte,
        randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
        fQByte: rt.game.mission,
        bShort: rt.saveOffsets,
        shortTableBOffsets: rt.sectionOffsets,
        outerLoopLFlag: rt.game.formUpActive,
        onChangeType: (targetId, type) => { rt.changeEntityType(targetId, type); },
        // b.a():Z offsets 652..654 -- K:B (#28) reset, now modelled; see
        // LegacySubsystemArrays.bField28's own docblock.
        onSchedulerReset: () => { rt.subsystemArrays.bField28 = 0; },
        // a(int,int,int,byte) (#283) -- s()/q()/r() reach it through here, so
        // a unit whose HP hits 0 actually leaves the map. Wired 2026-09-16.
        onVacate: (kind, vx, vy, target) => rt.vacateEntity(kind, vx, vy, target),
        // f.b(byte) (#348) at ages 12 and 35: re-roll e[2727+id] for the
        // new life stage. Wired 2026-09-27 (ported, never connected).
        onLevelMilestone: (id) => indexLegacyEntityRecord(rt.entityRecordLifecycleInput(), id),
        // a()'s periodic V() (#258, housing) and W() (happiness drift). Both
        // were unwired until 2026-09-18, so no villager ever got a home and
        // happiness never moved from its birth value -- see
        // LegacyEntityHousing.ts / LegacyEntityHappiness.ts.
        onV: (target) => stepLegacyEntityHousing({
          state: rt.denseState,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          pool: rt.mainArrays.aShort,
          id: target,
          team: target <= 50 ? 0 : 1,
        }),
        onW: (target) => {
          const game = rt.game;
          stepLegacyEntityHappiness({
            state: rt.denseState,
            packedBytes: rt.packedBytes,
            packedOffsets: rt.packedOffsets,
            id: target,
            team: target <= 50 ? 0 : 1,
            frame: game.missionFrame,
            fQ: game.mission,
            bShort: rt.saveOffsets,
            shortTableBOffsets: rt.sectionOffsets,
            scratch: { get w() { return game.subsystemW; }, set w(value) { game.subsystemW = value; } },
          });
        },
        // a()'s periodic X() and Y() (the 8080 crowding counter), wired
        // 2026-09-20 -- see LegacyEntityCrowdStress.ts. X() decays 8080 while
        // the unit holds its own cell and raises it (clamped to 30) while it
        // does not; at 30 it sets 7979 bit 2, whose icon f.q() draws as
        // sprite record 73, and Y() then spreads +8 onto adult neighbours.
        onX: (target) => stepLegacyEntityCrowdDecay({
          state: rt.denseState,
          entityId: target,
          gridC: rt.gridC,
          mapWidth: rt.game.mapWidth,
          mapHeight: rt.game.mapHeight,
        }),
        onY: (target) => stepLegacyEntityCrowdSpread({
          state: rt.denseState,
          entityId: target,
          gridC: rt.gridC,
          mapWidth: rt.game.mapWidth,
          mapHeight: rt.game.mapHeight,
        }),
        // a(int,int) (#294) -- r()'s own hunger/tiredness penalty and regen
        // ticks; unwired until 2026-09-16, so starving villagers took no damage.
        onRandomAction: (target, delta) => { rt.entityHealthDelta(target, delta); },
        // a()'s dying branch (offsets 17..105): once 3030 reaches the death
        // animation's own length (f.j[4][2929 & 255]), m(int) (#400) clears the
        // corpse; R() (#254) runs while 5959 is positive. Wired 2026-09-16.
        animationLimit: rt.packedData?.byteTables?.[4]?.[(rt.denseState[UNIT_MODE + id] ?? 0) & 255],
        onLifecycle: (target) => { rt.entityDeathCleanup(target); },
        onFinal: (target) => {
          stepLegacySubsystemEntityPaceAccum({
            state: rt.denseState,
            packedBytes: rt.packedBytes,
            packedOffsets: rt.packedOffsets,
            id: target,
            team: target <= 50 ? 0 : 1,
            randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
            // S()'s own a(IIIIIIII) (#298) -- WIRED 2026-09-22, see
            // entityStrikeGate. The original discards its result too.
            onQueueAction: (...args) => { rt.entityStrikeGate(target, ...args); },
          });
        },
        // q()'s onA (private void A()) -- see subsystemEntityAAlert's own docblock.
        onA: (targetId) => rt.subsystemEntityAAlert(targetId),
        onMove: (act, moveId) => rt.entityMove(act, moveId, moveId),
      }),
      onEntityTargetStep: (id) => {
        // b.e() invokes b.t(id) after the status guard. `onPositionProbe`
        // (b.a(int,int,boolean)/subsystemEntityTransform) is RETRACTED-
        // PREMISE, FULLY PORTED 2026-09-07 (see subsystemEntityTransform's
        // own docblock) -- real bytecode offsets 108..115 call
        // `a(dense[3131+id], dense[3232+id], true)` then immediately read
        // `l:B`(#199), which is exactly what `subsystemEntityTransform`
        // now returns directly.
        rt.stepEntityTarget(id, {
          u: rt.game.bTeam,
          // t() reads b.m:B (#202) and f.N:Z -- CORRECTED 2026-09-14, was
          // the never-written subsystemModeByte and the unrelated nFlag.
          m: () => rt.game.subsystemMByte,
          kByte: scheduler.kByte,
          fN: rt.game.callToArmsActive,
          onPositionProbe: (x, y) => rt.subsystemEntityTransform(id, x, y, true),
          onAction: (byteValue, enabled) => {
            const jRows = rt.packedData?.byteTables;
            if (!jRows) return false;
            return stepLegacyEntityActionCommit({
              state: rt.denseState,
              packedBytes: rt.packedBytes,
              packedOffsets: rt.packedOffsets,
              gridC: rt.gridC,
              jRows,
              entityId: id,
              actionCode: byteValue,
              allowRestart: enabled,
              onChangeType: (targetId, type) => { rt.changeEntityType(targetId, type); },
              // b.i(0) (#391) after the 83/84 -> 85 and 79 -> 80 type
              // changes. Wired 2026-09-27 (stepEntityIUpdate has been live
              // since 08-31; the "no-op" note here predated it).
              onIUpdate: (arg) => rt.stepEntityIUpdate(id, arg, id <= 50 ? 0 : 1),
            });
          },
          // BUG FIX (2026-09-10): b.t()'s three remaining callbacks were
          // never wired, and all three targets were already ported.
          // b-javap.txt, b.t():
          //   offset 521  `a(III)I`  #266 -- the occupancy/distance probe,
          //               called `a(e[0+v], e[101+v], 0)`.
          //   offset 545  `g(I)V`    #384 -- with a literal 1, on the
          //               type-4 branch's "arrived" path.
          //   offset 572  `a(IB)V`   #275 -- `a(v, 87)`, the entity type
          //               change, on that branch's "still far" path.
          //   offset 628  `g(I)V`    #384 -- the method's own tail,
          //               `g(e[6161+v] == 2 ? 0 : 2)`, reached on every
          //               path that does not return earlier.
          // That tail is the one that matters: `g(int)` is what turns a
          // pending order into movement -- its offsets 0..52 rewrite
          // `e[6161+v]` (2 -> 1, anything else > 1 -> 0), the very field
          // b.t()'s own entry gate reads. With onModeDispatch inert, an
          // ordered unit sat at `e[6161+id] == 2` forever: b.t() entered
          // every tick, ran to its tail, and dropped the dispatch on the
          // floor, so nothing ever advanced the order.
          onDistanceProbe: (x, y, arg3) => rt.occupancyCheck(id, x, y, arg3),
          onModeDispatch: (mode) => rt.subsystemG(id, mode),
          onByteDispatch: (targetId, value) => { rt.changeEntityType(targetId, value); },
        });
      },
      onEntityDecisionCheck: (id) => rt.stepEntityDecisionCheck(id),
      onEntityLoopTail: (id, team) => subsystemEntityLoopTail(rt, id, team),
      onEntityCoreUpdate: (id, team) => {
        // b.e() reaches b.v() after the decision branch.  The f.j[][] table
        // is the 25-row /pd0 byte-table family; bind it only when the
        // original packed resource has been attached.
        const jRows = rt.packedData?.byteTables;
        if (!jRows) return;
        const readPacked = (table: number, index: number): number =>
          rt.packedBytes[(rt.packedOffsets[table] ?? 0) + index] ?? 0;
        const entityCoreRaw = { d: false };
        rt.stepEntityCoreUpdate(id, {
          raw: entityCoreRaw,
          readJ: (row, index) => jRows[row]?.[index] ?? 0,
          readTable39: (index) => readPacked(39, index),
          readTable138: (index) => readPacked(138, index),
          onW: () => rt.stepEntityWUpdate(id, {
            team,
            mainShort: rt.mainArrays.aShort,
            jRows,
            // b.w()'s onC (private void c(int,int,int)) -- fully
            // rederived 2026-09-07, see LegacyEntityCWatch.ts's own
            // docblock. Its gate call (`a(IIIIIIII)Z` #298, 1436 bytes)
            // used to be omitted here -- treated as returning false, the
            // honest "not examined" default. WIRED 2026-09-22 as
            // `LegacyEntityStrikeGate.ts`: that method is where a blow
            // actually lands, so leaving it out meant no hit ever
            // resolved and a unit sent at a rival by H() chased it
            // forever, which in turn locked the needs system out (see
            // that file's own docblock).
            onC: (x, y, value) => stepLegacyEntityCWatch({
              dense: rt.denseState,
              packedBytes: rt.packedBytes,
              packedOffsets: rt.packedOffsets,
              id,
              x,
              y,
              value,
              u: rt.game.bTeam,
              kBytes: rt.game.subsystemKBytes,
              subsystemX: rt.game.subsystemX,
              onGate: (...args) => rt.entityStrikeGate(id, ...args),
            }),
            // b.w()'s onAction (private void a(byte,byte,int,int)) -- see
            // LegacyEntityActionScoreGate.ts's own docblock for the full chain.
            // RESTORED (2026-09-07): rt used to drop the caller's 3rd/4th
            // args (action/mode) entirely -- they're real params the ported
            // method now reads (see that file's docblock).
            onAction: (x, y, action, mode) => stepLegacyEntityActionScoreGate({
              dense: rt.denseState,
              packedBytes: rt.packedBytes,
              packedOffsets: rt.packedOffsets,
              saveOffsets: rt.saveOffsets,
              sectionOffsets: rt.sectionOffsets,
              id,
              x,
              y,
              entityB: rt.subsystemArrays.bField8,
              action,
              mode,
              hTable: rt.secondaryCellHTable,
              iTable: rt.secondaryCellITable,
              bScalars: rt.subsystemArrays,
            }),
            // b.w()'s onJ (private void J(), #246) -- see subsystemEntityJTrigger's own docblock.
            onJ: () => rt.subsystemEntityJTrigger(id),
          }),
          // v() offset 327 invokes `d():Z` (#369) -- see
          // LegacyEntityDPredicate.ts for the 2026-09-17 wiring fix.
          onD: () => stepLegacyEntityDPredicate({
            state: rt.denseState,
            entityId: id,
            z: rt.game.subsystemEntityZ,
            b: rt.subsystemArrays.bField8,
            cBytes: rt.resourceTables.rowFByte,
            readPacked: (row, index) => rt.packedBytes[(rt.packedOffsets[row] ?? 0) + index] ?? 0,
            onI: (argument) => rt.stepEntityIUpdate(id, argument, rt.game.bTeam),
            onG: (argument) => rt.subsystemG(id, argument),
            onPStep: () => rt.stepSubsystemP(id),
            onP: () => stepLegacySubsystemEntityRevertIdle(rt.denseState, id),
            onVacate: (kind, x, y, target) => rt.vacateEntity(kind, x, y, target),
          }),
          onFilterWorkers: (record) => rt.filterEntityLifecycle(record, false, (row, column) => rt.gridC[row]?.[column] ?? 0),
          // private void x(): the worker leaves its record -- rewritten 2026-09-15.
          onX: () => {
            stepLegacyEntityAssociationCleanup({
              state: rt.denseState,
              packedBytes: rt.packedBytes,
              packedOffsets: rt.packedOffsets,
              gridC: rt.gridC,
              entityId: id,
              fields: liveView<{ x: number }>(rt.game, { x: "subsystemX" }),
              team: rt.game.bTeam,
              fP: rt.game.persistedPByte,
              fQ: rt.game.mission,
              mapWidth: rt.game.mapWidth,
              mapHeight: rt.game.mapHeight,
              onRecordWorkerLevel: (record) => stepLegacySubsystemRecordWorkerLevel(rt.denseState, record, rt.game.bTeam),
              onGate: (mode, scanLimit, x, y) => {
                rt.checkSpiralPlacementGate(mode, scanLimit, x, y, id, (occupant) => checkLegacyEntityOccupant({
                  state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets, id,
                }, occupant));
              },
              onP: () => stepLegacySubsystemEntityRevertIdle(rt.denseState, id),
              onSelectionRelease: (entityId) => rt.releaseEntitySelection(entityId),
              onAuxiliary: (first, second, third) => {
                selectLegacyAuxiliaryCandidates({
                  p: rt.auxiliaryScratch,
                  dense: rt.denseState,
                  shortRows: rt.mainArrays.aShort,
                }, rt.auxiliaryQueueState, first, second, third);
              },
              onSceneDispatch: (value) => { rt.runSceneDispatch(value); },
              // f.p:B (#353); persistedPByte is the copy al() and the RMS record use.
              onFP: (value) => { rt.game.persistedPByte = value; },
              onNeeds: () => rt.checkEntityNeeds(id),
              onQ: () => rt.selectEntityTypeAfterQ(id),
              onPStep: () => rt.stepSubsystemP(id),
              onOccupancy: (x, y, layer) => {
                rt.game.subsystemEntityZ = rt.occupancyCheck(id, x, y, layer);
              },
              onN: () => rt.stepSubsystemN(id, rt.game.bTeam),
              randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
            });
          },
          onE: () => {
            return stepLegacyEntityESelection({
              state: rt.denseState,
              packedBytes: rt.packedBytes,
              packedOffsets: rt.packedOffsets,
              entityId: id,
              readStatus: () => rt.entityModeValue(id),
              readRecordCheck: (record) => checkLegacyEntityRecord({
                state: rt.denseState,
                packedBytes: rt.packedBytes,
                packedOffsets: rt.packedOffsets,
                entityId: id,
                record,
                readCell: (row, column) => rt.gridC[row]?.[column] ?? 0,
                // c(int) -> d(int): a(int,int,boolean) (#273), then m:B (#202).
                readM: () => rt.game.subsystemMByte,
                onEntityTransform: (x, y, flag) => { rt.subsystemEntityTransform(id, x, y, flag); },
                // b.Q() (#253) when d(int) is false.
                onQ: () => { rt.selectEntityTypeAfterQ(id); },
              }),
              // Offsets 460..468 and 566, wired 2026-09-27.
              readSecondaryCheck: (kind) => stepLegacySubsystemNearestBuilding({
                state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
                team: id <= 50 ? 0 : 1, entityId: id, kind,
              }),
              onG: (value) => rt.subsystemG(id, value),
              onQ: () => { rt.selectEntityTypeAfterQ(id); },
            });
          },
          onY: () => {
            // b.y() (WIRED 2026-08-31, see LegacyEntityFollowup.ts's own
            // docblock for the full re-derivation, including two
            // previously-uncaught bugs fixed in the same pass). `entityCoreRaw`
            // is the SAME `d:Z`-tracking object v() itself uses -- y() is
            // called with whatever `d` v() left it at, and reads/writes it
            // through rt shared reference, matching the single real
            // instance field both methods operate on.
            // b.z:I, live: y()'s callees (i(int) -> scene dispatch, entityAp) write it too.
            const game = rt.game;
            const followupZ = { get value() { return game.subsystemEntityZ; }, set value(v: number) { game.subsystemEntityZ = v; } };
            stepLegacyEntityFollowup({
              state: rt.denseState,
              entityId: id,
              readPacked,
              raw: entityCoreRaw,
              z: followupZ,
              bValue: rt.subsystemArrays.bField8,
              readCell: (row, column) => rt.gridC[row]?.[column] ?? 0,
              // v = a(v) (#281): the dispatch borrows v:I and hands back its argument.
              onWorkerDispatch: (arg) => {
                rt.game.bUnit = stepLegacySubsystemWorkerDispatch({
                  state: rt.denseState,
                  fields: liveView<{ v: number }>(rt.game, { v: "bUnit" }),
                  packedBytes: rt.packedBytes,
                  packedOffsets: rt.packedOffsets,
                  gridC: rt.gridC,
                  team,
                  aRows: rt.mainArrays.aByte3,
                  bRows: rt.game.xSlotTable,
                  onChangeType: (entityId, type) => { rt.changeEntityType(entityId, type); },
                  onN: (entityId) => rt.stepSubsystemN(entityId, team),
                }, arg);
              },
              // z = a(x, y, 0) (#266) -- persisted at once, p() runs right after.
              onOccupancy: (x, y, layer) => {
                const z = rt.occupancyCheck(id, x, y, layer);
                rt.game.subsystemEntityZ = z;
                return z;
              },
              onP: () => rt.stepSubsystemP(id),
              // y() offset 240: b(e[3939+v] - 28, true, v) (#344), the
              // afford check. Wired 2026-09-27 (was left inert).
              onType84Action: (action, flag, unit) =>
                checkLegacyEntityAffordable(rt.entityCostInput(id), action, flag, unit),
              onEntityProbe: () => {
                // i()/j() share the SAME S:I(#51, game.subsystemS)
                // cross-call scratch -- see both files' own docblocks.
                const game = rt.game;
                // b.f:Z (#172) is shared by i()Z, j()Z, K() and others -- read/write it live.
                const fShared = { get value() { return game.subsystemFFlag; }, set value(next: boolean) { game.subsystemFFlag = next; } };
                const sScratch = { value: rt.game.subsystemS };
                const result = stepLegacySubsystemEntityProbe({
                  state: rt.denseState,
                  packedBytes: rt.packedBytes,
                  packedOffsets: rt.packedOffsets,
                  saveOffsets: rt.saveOffsets,
                  shortRows: rt.mainArrays.aShort,
                  entityId: id,
                  team,
                  // R:I (#49) is rewritten by J() before i()Z's offset 746 reads it.
                  // CORRECTED 2026-09-15: a snapshot gave i()Z the previous unit's R.
                  get rValue() { return game.subsystemR; },
                  // A:I (#7) is rewritten by l() before i()Z's type-70/71 branch reads it.
                  get aValue() { return game.subsystemA; },
                  s: sScratch,
                  f: fShared,
                  // private boolean l() (#398), wired 2026-09-14.
                  onL: () => checkLegacyEntityModeListed(rt.denseState, rt.packedBytes, rt.packedOffsets, id, {
                    get A() { return game.subsystemA; }, set A(value: number) { game.subsystemA = value; },
                  }),
                  // private boolean a(int,boolean,int) (#292), wired 2026-09-15.
                  onCheckTargetKind: (type, flag, entityId) => rt.payEntityCost(type, flag, entityId, entityId),
                  // private boolean a(byte,byte,byte,byte) (#293): skill growth, wired 2026-09-15.
                  onCheckQuad: (attr, chance, cap, step) => rt.gainEntitySkill(id, attr, chance, cap, step),
                  // private boolean b(int,int) (#347): a worker's record skills, wired 2026-09-15.
                  onCheckSlotProgress: (kind, level) => rt.gainEntitySlotSkills(id, kind, level),
                  // private void j(int) (#394), wired 2026-09-21 --
                  // LegacyEntityOccupantCare.ts. i():Z calls it with 0 (the
                  // rest branch) when the unit's mode is 117.
                  onJInt: (arg) => stepLegacyEntityOccupantCare({
                    state: rt.denseState,
                    v: id,
                    scratch: { get S() { return game.subsystemS; }, set S(value: number) { game.subsystemS = value; } },
                    onHealthDelta: (target, delta) => { rt.entityHealthDelta(target, delta); },
                  }, arg),
                  // private boolean k() (#396), wired 2026-09-15.
                  onKPredicate: () => rt.stepEntityKPredicate(id, team),
                  // private void I() (#245), wired 2026-09-15.
                  onIFinalize: () => stepLegacyEntityIFinalize({
                    state: rt.denseState,
                    packedBytes: rt.packedBytes,
                    packedOffsets: rt.packedOffsets,
                    gridC: rt.gridC,
                    id,
                    onChangeType: (entityId, type) => { rt.changeEntityType(entityId, type); },
                    // f(boolean) (#382), ported 2026-09-22; rt I() site was
                    // missed and still threw until 2026-09-23.
                    onF: (flag) => rt.entityProduceItem(id, team, flag),
                    onN: () => rt.stepSubsystemN(id, team),
                    onAn: () => stepSubsystemAnFor(rt, id),
                  }),
                  onJ: () => rt.subsystemEntityJTrigger(id),
                  onAssociationScan: () => stepLegacySubsystemEntityAssociationScan({
                    state: rt.denseState,
                    packedBytes: rt.packedBytes,
                    packedOffsets: rt.packedOffsets,
                    saveOffsets: rt.saveOffsets,
                    gRows: rt.subsystemArrays.gRows,
                    mainShort: rt.mainArrays.aShort,
                    entityId: id,
                    team,
                    zValue: rt.game.subsystemEntityZ,
                    aValue: rt.game.subsystemA,
                    s: sScratch,
                    f: fShared,
                    // K() (#247), WIRED 2026-09-23 -- see entityTypeReaction.
                    onK: () => rt.entityTypeReaction(id, team),
                    onCheckSlotProgress: (kind, level) => rt.gainEntitySlotSkills(id, kind, level),
                    // private void j(int) (#394), wired 2026-09-21 -- same
                    // method and same scratch as i():Z's own call above.
                    onJInt: (arg) => stepLegacyEntityOccupantCare({
                      state: rt.denseState,
                      v: id,
                      scratch: { get S() { return game.subsystemS; }, set S(value: number) { game.subsystemS = value; } },
                      onHealthDelta: (target, delta) => { rt.entityHealthDelta(target, delta); },
                    }, arg),
                    onCheckQuad: (attr, chance, cap, step) => rt.gainEntitySkill(id, attr, chance, cap, step),
                    onN: () => rt.stepSubsystemN(id, team),
                  }),
                });
                rt.game.subsystemS = sScratch.value;
                return result;
              },
              // i(int):V (#391) -- WIRED 2026-08-31. The previous port
              // (stepLegacyEntityIUpdate) was carrying four real bugs and
              // had never had a live caller; see LegacyEntityIUpdate.ts's
              // own docblock for the full re-derivation. `value` is y()'s
              // own z:I, exactly as its offset-579 call site passes it.
              onEntityI: (value) => { rt.stepEntityIUpdate(id, value, team); },
            });
          },
        });
      },
    },
    );
  } catch {
    // e()'s own exception table (offsets 0..832 -> 833, pop;return) --
    // see the docblock above rt try block for the full derivation.
  }
  // b's u/v/w, live (2026-09-23): the animal loop's e(boolean) writes w
  // and the loop counter is v, so a copy written back afterwards was wrong.
  const hRaw = liveView<{ u: number; v: number; w: number }>(rt.game, {
    u: "bTeam", v: "bUnit", w: "subsystemW",
  });
  stepLegacySubsystemH({
    state: rt.denseState,
    bBytes: rt.packedBytes,
    bShorts: rt.packedOffsets,
    frame: rt.game.missionFrame,
    q: rt.game.mission,
    fT: rt.game.subsystemT,
    raw: hRaw,
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    // final boolean a(int,int,int,int) (#270, checkLegacySpiralPlacementGate)
    // -- the SAME gate already wired at an()'s onLargeGate and
    // LegacyFPairCommand.ts's onFootprintProbe. b.h()'s own exception
    // table (offset 0..658, basically the whole method) swallows any
    // throw from mode=1 accepting a candidate, matching rt try/catch.
    onFootprint: (mode, scanLimit, x, y) => {
      try {
        // mode=1 here, so onOccupantCheck (mode===0-only) is irrelevant.
        // The gate's ambient v:I is h()'s own, which offset ~350 has just
        // set to 0 -- so the free cell lands in dense[3131]/[3232], exactly
        // where the spawn reads it. CORRECTED 2026-09-23 (was the stale
        // game.bUnit, writing the cell to some other unit).
        rt.checkSpiralPlacementGate(mode, scanLimit, x, y, hRaw.v);
      } catch {
        // Matches b.h()'s own confirmed exception table.
      }
    },
    // f.b(int,int,int,int) (allocateLegacySubsystemRecord) -- same
    // already-wired helper stepSubsystemStateCommand's own onT (T()'s
    // ai===45 branch, via onSubsystemRecordAllocate) uses.
    onSubsystemRecord: (first, x, y, counterIndex) => {
      rt.allocateSubsystemRecord(rt.gridC, first, x, y, counterIndex, {
        randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
        counters: rt.game.subsystemT,
        q: rt.game.mission,
      });
    },
    // b.h()'s own offset 637..642 (private void af(); private void ah()),
    // called together for each scratch slot with dense[9513+slot]>0.
    // Both sit inside h()'s own exception table (offset 0..658, the
    // whole method), matching the try/catch here. ag() is now fully
    // rederived (2026-09-07, LegacySubsystemAg.ts -- its own
    // RETRACTED-PREMISE field, b:[[[B]#134, is real, not permanently
    // null). Verified live (2026-08-29, debug runtime): also caught a
    // real, un-forced `neighborValue` bounds error when a scratch
    // slot's own position (dense[9359/9381+slot]) hasn't been
    // initialized by whatever real producer normally sets it first --
    // confirms rt try/catch is load-bearing, not just theoretical.
    onTailMaintenance: (slot) => {
      // Offsets 604..655: the loop counter IS b's v:I, which af()/ah() and
      // the #270 gate (mode 6) read as the current animal. FIXED 2026-09-23.
      rt.game.bUnit = slot;
      try {
        const game = rt.game;
        stepLegacySubsystemAf({
          state: rt.denseState,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          gridC: rt.gridC,
          z: { get value() { return game.subsystemEntityZ; }, set value(v: number) { game.subsystemEntityZ = v; } },
          slot,
          frame: rt.game.missionFrame,
          sceneQ: rt.game.mission,
          subsystemFByte: rt.game.subsystemGFFlagByte,
          jRow4: (index) => rt.packedData?.byteTables?.[4]?.[index] ?? 0,
          randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
          // af()'s offset-302 `a(IIIIIIII)` (#298) -- the animal striking a
          // villager. WIRED 2026-09-22 alongside c()'s own gate; it was the
          // other unwired half of combat. `p3` is the literal 2 af() passes,
          // which is what lets a wild animal hit either team.
          onQueueAction8: (...args) => { rt.entityStrikeGate(slot, ...args); },
          // af()'s `a(int,int,byte,int)` (#289) -- the wounded animal's own
          // reaction, WIRED 2026-09-22 (LegacyAnimalHitReaction.ts). Its
          // t181 aggression lookup is where the boar's counter-attack and
          // the deer's flight part company. `e(boolean)` (#376), the flight
          // half, is 308 javap lines and stays an explicit seam.
          onFinishSlot: (targetX, targetY, targetId, arg4) => stepLegacyAnimalHitReaction({
            state: rt.denseState,
            packedBytes: rt.packedBytes,
            packedOffsets: rt.packedOffsets,
            slot,
            // e(true) -- the flight half, WIRED 2026-09-22.
            onFlee: (flag) => rt.animalRoam(slot, flag),
          }, targetX, targetY, targetId, arg4),
          // af()'s offset-470 `e(boolean)` (#376), WIRED 2026-09-22.
          onAnimReset: (flag) => rt.animalRoam(slot, flag),
          onFootprintGate: (mode, scanLimit, x, y) => {
            try {
              // Same ambient-v reasoning as onFootprint above (b.h()'s
              // af()/ah() have no explicit id parameter either).
              return rt.checkSpiralPlacementGate(mode, scanLimit, x, y, rt.game.bUnit);
            } catch {
              return false;
            }
          },
          neighborValue: (x, y, mode) => rt.occupancyCheck(slot, x, y, mode),
          onAg: () => {
            stepLegacySubsystemAg({
              state: rt.denseState,
              packedBytes: rt.packedBytes,
              packedOffsets: rt.packedOffsets,
              localFlags: rt.game.subsystemBLocalFlags,
              gridC: rt.gridC,
              candidateCells: rt.subsystemArrays.b,
              slot,
              frame: rt.game.missionFrame,
              // b.z:I (#234) is class b's own scalar int field, NOT a
              // dense[] offset -- FIXED 2026-09-07 (was reading
              // rt.denseState[234], an unrelated dense-array cell).
              zValue: rt.game.subsystemEntityZ,
              // ag()'s offset-242 `e(boolean)` (#376), WIRED 2026-09-22.
              onAnimReset: (flag) => rt.animalRoam(slot, flag),
              // `private byte a(int,int,int,int,int,int)` (#268) -- ported
              // 2026-09-08 as computeLegacySubsystemPairScore but never
              // wired at THIS call site, so it returned 0 through the `?? 0`
              // default. Its result is `dense[9689+v]`, the size of the
              // candidate-cell bucket ag() then walks: a 0 meant
              // `9711 < 9689` was never true, the walking branch never ran,
              // and animals stood still. WIRED 2026-09-22.
              onFinishBucketAssign: (a1, a2, a3, a4, a5, a6) => computeLegacySubsystemPairScore(
                rt.legacySubsystemScoreInput(slot), a1, a2, a3, a4, a5, a6,
              ),
              onAi: () => stepLegacySubsystemAi({
                state: rt.denseState,
                packedBytes: rt.packedBytes,
                packedOffsets: rt.packedOffsets,
                slot,
                sceneQ: rt.game.mission,
                randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
                x: { get value() { return game.subsystemX; }, set value(v: number) { game.subsystemX = v; } },
              }),
            });
          },
        });
        stepLegacySubsystemAh({
          state: rt.denseState,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          gridC: rt.gridC,
          slot,
        });
      } catch {
        // Matches b.h()'s own confirmed exception table.
      }
    },
  });
  // Offset 604 resets v:I for the animal loop, which leaves it at 22.
  rt.game.bUnit = 22;
  const tail = {
    lByte: rt.subsystemArrays.bField32,
    kByte: rt.subsystemArrays.bField28,
  };
  // b.i()'s post-loop t()/u()/v() (offsets 397..432). RETRACTED
  // 2026-09-23: these were left unwired on the premise that u()/v()'s
  // c(boolean) calls throw on a permanently-null b:[S] (#132); that field
  // is saveOffsets and is live. Ported as LegacySubsystemT/U/V.ts.
  stepLegacySubsystemI({
    state: rt.denseState,
    bBytes: rt.packedBytes,
    bShorts: rt.packedOffsets,
    frame: rt.game.missionFrame,
    q: rt.game.mission,
    tail,
    onT: () => rt.subsystemT(),
    onU: () => rt.missionScriptU(),
    onV: () => rt.missionScriptV(),
    setV: (v) => { rt.game.bUnit = v; },
    // Wired 2026-09-27: i() offset 347, aj() offsets 113/209 call
    // f.c(int,int,int,int) (the repaint), am() offset 285 a(int,byte).
    onRepairCell: (x, y, width, height) => rt.repaintRect(x, y, width, height),
    onAj: (index) => {
      stepLegacySubsystemAj({
        state: rt.denseState,
        bBytes: rt.packedBytes,
        bShorts: rt.packedOffsets,
        index,
        onCellUpdate: (x, y, width, height) => rt.repaintRect(x, y, width, height),
        onAm: () => {
          stepLegacySubsystemAm({
            state: rt.denseState,
            bBytes: rt.packedBytes,
            bShorts: rt.packedOffsets,
            aM: index,
            fields: liveView<{ u: number; v: number }>(rt.game, { u: "bTeam", v: "bUnit" }),
            onEntityAction: (id, type) => { rt.changeEntityType(id, type); },
            onN: (id, team) => { rt.stepSubsystemN(id, team); },
          });
        },
      });
    },
    // b.ak(): the win/lose check. `u` is f.u:B (game.uByte), NOT b.u:I --
    // CORRECTED 2026-09-24 (it never started the countdown).
    onAk: () => {
      stepLegacySubsystemAk(Object.assign(
        liveView<{ u: number; fByte: number }>(rt.game, { u: "uByte", fByte: "subsystemGFFlagByte" }),
        {
          q: rt.game.mission,
          dense: rt.denseState,
          shortRows: rt.mainArrays.aShort,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          onMapSession: () => rt.stepLegacyC(),
        },
      ));
    },
    onAl: () => {
      const alState = {
        pByte: rt.game.persistedPByte,
        q: rt.game.mission,
        bG: rt.subsystemArrays.bgByte,
        bF: rt.game.subsystemGFFlagByte,
        fK: rt.game.choosingChief,
        fF: rt.game.entityFocusFlag,
        // al() reads f.N:Z (outerLoopNFlag) -- CORRECTED 2026-09-14, was nFlag.
        fN: rt.game.callToArmsActive,
        J: rt.subsystemArrays.bJByte,
        cByte: rt.game.missionFrame,
        aQ: rt.subsystemArrays.bAQ,
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        shortRows: rt.mainArrays.aShort,
        onSubsystemAction: (first: number, second: number, mode: number) => {
          // b.al() invokes b(0,0,3).  This is the same b.b(III) queue
          // already used by the f.aP(second == -2) path; the bytecode
          // proves firstFlag=false for rt call site.
          if (mode !== 3) return;
          selectLegacyAuxiliaryCandidates({
            p: rt.auxiliaryScratch,
            dense: rt.denseState,
            shortRows: rt.mainArrays.aShort,
          }, rt.auxiliaryQueueState, first, second, mode);
        },
        onStateCommand: (value: number) => {
          rt.stepSubsystemStateCommand(value);
        },
      };
      stepLegacySubsystemAl(alState);
      rt.subsystemArrays.bgByte = alState.bG;
      rt.subsystemArrays.bJByte = alState.J;
      rt.subsystemArrays.bAQ = alState.aQ;
    },
    // b.i() calls b.j() after its ak/al gates. The raw b.j() table
    // reconstruction is already ported; keep rt confirmed call live
    // while b.ak()/b.al() remain explicit callback seams.
    onJ: () => { rt.runSubsystemJ(rt.game.mission); },
    // b.i()'s own tail: b.b(0,0,3) -- the exact same b.b(III) queue
    // onAl's onSubsystemAction above already wires (same reasoning:
    // firstFlag=false, mode=3). f.b(int) is runSceneDispatch, already
    // ported/wired elsewhere (onBByte) -- confirmed same target via
    // matching bytecode offsets (17347..17572).
    onSubsystemB: (first, second, mode) => {
      if (mode !== 3) return;
      selectLegacyAuxiliaryCandidates({
        p: rt.auxiliaryScratch,
        dense: rt.denseState,
        shortRows: rt.mainArrays.aShort,
      }, rt.auxiliaryQueueState, first, second, mode);
    },
    onFByte: (value) => { rt.runSceneDispatch(value); },
  });
  rt.subsystemArrays.bField32 = tail.lByte;
}
