import { hdArt } from "../../render/HdArt";
import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import type { Graphics } from "../../platform/Graphics";
import { LegacyPackedSpriteRenderer } from "../../render/LegacyPackedSpriteRenderer";
import { stepLegacyEntityAction, type LegacyEntityActionState } from "../../render/LegacyEntityAction";
import { stepLegacySubsystemWorkerDispatch } from "../tribe/LegacySubsystemWorkerDispatch";
import { stepLegacyEntityAp } from "./LegacyEntityRecordRecovery";
import { stepLegacyEntityProduceItem } from "./LegacyEntityProduceItem";
import { stepLegacyEntityStrikeGate } from "./LegacyEntityStrikeGate";
import { stepLegacySubsystemEntityTransformC } from "../tribe/LegacySubsystemEntityTransform";
import { stepLegacySubsystemEntityMoveCancel } from "../tribe/LegacySubsystemEntityMoveCancel";
import { stepLegacySubsystemEntityTrainingSlot } from "../tribe/LegacySubsystemEntityTrainingSlot";
import { stepLegacyEntityCoordinateUpdate } from "../../ui/LegacyEntityCoordinateUpdate";
import { stepLegacyAp } from "../../ui/LegacyStateMachine";
import { stepLegacyAj } from "./LegacyUnitSelection";
import { stepLegacySpriteLayerLoop } from "../../render/LegacySpriteLayerLoop";
import { stepLegacySpriteLayerPredicateA, stepLegacySpriteLayerPredicateB } from "../../render/LegacySpriteLayerPredicates";
import { stepLegacyEntityOverlayDraw } from "../../render/LegacyEntityOverlayDraw";
import { liveView } from "../../core/LegacyRuntimeState";
import { subsystemMarkerRescan } from "../tribe/TribeSignalRuntime";
import { stepLegacySubsystemNearestBuilding } from "../tribe/LegacySubsystemNearestBuilding";
import { finalizeLegacyEntitySelection } from "../../ui/LegacyEntitySelectionRelease";

/**
 * f.a(byte,byte,byte) (#306) with its entry gate, offsets 0..42: an
 * argument below 18 needs l:I != 0, Q != 17, !K:Z and u:B <= 0 (18 skips
 * the K:Z test, but 18 and up never reach it).
 */
export function entityActionPrompt(rt: LegacyRuntimeState, ap: number, am: number, an: number): void {
  const game = rt.game;
  if (ap < 18 && (game.lInt === 0 || game.screen === 17 || game.choosingChief || game.uByte > 0)) return;
  rt.beginEntityAction(ap, am, an);
}

/**
 * `private void ap()` (#323, `LegacyEntityRecordRecovery.ts`) -- shared by
 * `r()`'s type 94..96 tail and `O()`'s own call. Extracted 2026-09-23 when
 * `O()`'s site turned out to still be a throwing stub, two days after the
 * method itself was ported.
 */
export function entityAp(rt: LegacyRuntimeState, id: number): void {
  const game = rt.game;
  stepLegacyEntityAp({
    state: rt.denseState,
    v: id,
    team: game.bTeam,
    slotTable: game.xSlotTable,
    scratch: {
      get v() { return game.bUnit; }, set v(value: number) { game.bUnit = value; },
      get z() { return game.subsystemEntityZ; }, set z(value: number) { game.subsystemEntityZ = value; },
    },
    onChangeType: (target, type) => { rt.changeEntityType(target, type); },
    onN: () => rt.stepSubsystemN(id, game.bTeam),
    onWorkerDispatch: (target) => stepLegacySubsystemWorkerDispatch({
      state: rt.denseState,
      fields: liveView<{ v: number }>(rt.game, { v: "bUnit" }),
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      gridC: rt.gridC,
      team: game.bTeam,
      aRows: rt.mainArrays.aByte3,
      bRows: game.xSlotTable,
      onChangeType: (entityId, type) => { rt.changeEntityType(entityId, type); },
      onN: (entityId) => rt.stepSubsystemN(entityId, game.bTeam),
    }, target),
    onOccupancy: (x, y, mode) => rt.occupancyCheck(id, x, y, mode),
    onP: (target) => rt.stepSubsystemP(target),
  });
}

/**
 * `private void f(boolean)` (#382, `LegacyEntityProduceItem.ts`) -- shared
 * by `k()`'s `onF(true)` and `i()`'s finalizer `onF(false)`, both for a
 * type 26 or 27 unit.
 */
export function entityProduceItem(rt: LegacyRuntimeState, id: number, team: number, flag: boolean): void {
  const game = rt.game;
  stepLegacyEntityProduceItem({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    gridC: rt.gridC,
    orders: rt.mainArrays.aByte3,
    freeSlotTable: rt.mainArrays.f4,
    pools: rt.mainArrays.aShort,
    v: id,
    team,
    scratch: {
      get R() { return game.subsystemRByte; }, set R(value: number) { game.subsystemRByte = value; },
    },
    onRecordCompletion: (record) => rt.completeEntityRecord(record),
    onMarkVisible: (x, y, w, h) => rt.repaintRect(x, y, w, h),
  }, flag);
}

/**
 * `private boolean a(int,int,int,int,int,int,int,int)` (#298,
 * `LegacyEntityStrikeGate.ts`) -- shared wiring for all three of its real
 * call sites: `c(int,int,int)`'s own gate (a unit's blow),
 * `af()`'s offset-302 call (an animal's blow, `p3 === 2`) and `S()`'s.
 * `v` is the ambient `v:I` (#225) each caller is iterating on -- an entity
 * id for the first and third, an animal slot for `af()`.
 */
export function entityStrikeGate(rt: LegacyRuntimeState, 
  v: number,
  p1: number, p2: number, p3: number, p4: number,
  p5: number, p6: number, p7: number, p8: number,
): boolean {
  const arrays = rt.subsystemArrays;
  const game = rt.game;
  return stepLegacyEntityStrikeGate({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    k: game.subsystemKBytes,
    v,
    chief: rt.mainArrays.aShort[0]?.[17] ?? 0,
    dShort: arrays.dShort,
    cHitPoints: rt.resourceTables.rowFByte,
    // f.ag:Z (#108) has no producer anywhere in rt port yet; false is
    // the JVM field default.
    agFlag: false,
    scratch: {
      get ax() { return arrays.bField126; }, set ax(value: number) { arrays.bField126 = value; },
      get ay() { return arrays.bField127; }, set ay(value: number) { arrays.bField127 = value; },
      get D() { return arrays.bField13; }, set D(value: number) { arrays.bField13 = value; },
      get z() { return arrays.bField235; }, set z(value: number) { arrays.bField235 = value; },
      get A() { return arrays.bField6; }, set A(value: number) { arrays.bField6 = value; },
      get team() { return game.bTeam; }, set team(value: number) { game.bTeam = value; },
    },
    onClassifyCell: (cx, cy, arg3, arg4) => stepLegacySubsystemEntityTransformC({
      dense: rt.denseState,
      gridC: rt.gridC,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      saveOffsets: rt.saveOffsets,
      visibilityBits: rt.mainArrays.aInt,
      k: game.subsystemKBytes,
    }, v, cx, cy, arg3, arg4),
    onMarkerRescan: (rx, ry, range) => subsystemMarkerRescan(rt, v, rx, ry, range),
    onFilterWorkers: (record, flag) => rt.filterEntityLifecycle(record, flag, (r, c) => rt.gridC[r]?.[c] ?? 0),
    onVacate: (kind, vx, vy, target) => rt.vacateEntity(kind, vx, vy, target),
    // f.a(int,int,int,int) (#301): the hit effect slot. Ported 2026-09-28.
    onHitSprite: (target, kind, offset, frame) => rt.allocateEffectSlot(target, kind, offset, frame),
    onMoveTrigger: (action, moveId, id2) => rt.entityMove(action, moveId, id2),
    onByteAction: (type, bx, by, bValue) => rt.runByteActionQueue(type, bx, by, bValue),
    random: (mask, divisor) => rt.randomRemainder(mask, divisor),
    // Phase 3 alerts: a blow from the enemy or an animal (p3 1 / 2) on one of our units (id 1..50)
    // or on a building.
    onHitLanded: (kind, target, hx, hy) => {
      if (p3 !== 0 && ((kind === 1 && target <= 50) || kind === 2)) rt.onTribeAttacked?.(hx, hy);
    },
  }, p1, p2, p3, p4, p5, p6, p7, p8);
}

export function entityMoveCancel(rt: LegacyRuntimeState, id: number): void {
  stepLegacySubsystemEntityMoveCancel({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    gridC: rt.gridC,
    id,
    readM: () => rt.game.subsystemMByte,
    uInt: rt.game.bTeam,
    onChangeType: (targetId, changeType) => { rt.changeEntityType(targetId, changeType); },
    // b.d(int)'s a(int,int,boolean) (#273), for the same entity.
    onEntityTransform: (x, y, flag) => { rt.subsystemEntityTransform(id, x, y, flag); },
    // f.h(int) (#390) is `f(id); e(id);`. f.f(int) reads f.q:I (#356).
    onSelectionRelease: (entityId) => { rt.releaseEntitySelection(entityId); },
    onTrainingSlot: (entityId) => stepLegacySubsystemEntityTrainingSlot({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      entityId,
      randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
      fields: liveView<{ x: number; y: number }>(rt.game, { x: "subsystemX", y: "subsystemY" }),
      owners: rt.subsystemArrays.i,
    }),
  });
}

/** Execute f.ap() when f.ao() reaches Q=20 and copy its proven writes back. */
export function stepEntityActionConfirmation(rt: LegacyRuntimeState): void {
  const state = rt.entityActionState;
  stepLegacyAp({
    state,
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    onEntityPrepare: (id) => rt.stepSelectionE(id),
    // b.a(int) (#471) for team 0 (b.u = 0) and the prompt's unit (b.v = am);
    // wired 2026-09-27 -- the ap = 14/15 prompts never sent the unit off.
    onSubsystemCheck: (kind) => {
      // f.ap() offsets 57..73 write b.v = am and b.u = 0 before b.a(int); the port only passed
      // them as arguments until 2026-10-16 (oracle, rally.keys frame 52104).
      rt.game.bUnit = state.am;
      rt.game.bTeam = 0;
      return stepLegacySubsystemNearestBuilding({
        state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
        team: 0, entityId: state.am, kind,
      });
    },
    onEntityConfigure: (id) => {
      const result = finalizeLegacyEntitySelection({
        id,
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
    },
    // f(int,int) moves the camera; offsets 275..304 then save the moved
    // I/K/y/A (live fields -- a snapshot made ad() snap the camera back).
    onEntityFallback: (id, value) => { rt.stepEntityCoordinateUpdate(id, value); },
    snapshot: rt.stateCommandState.dFlags,
    onSelection: (v) => rt.runSelectionFlagsRefresh(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8]),
    onFinalize: () => {
      const state = {
        uFlag: rt.game.boxSelecting, F: rt.game.selectionGroup, k: rt.game.kByte,
        E: rt.game.ECounter, D: rt.game.DCounter,
        C: rt.game.CCounter, B: rt.game.BCounter,
      };
      stepLegacyAj(state);
      rt.game.boxSelecting = state.uFlag;
      rt.game.selectionGroup = state.F;
      rt.game.kByte = state.k;
      rt.game.ECounter = state.E;
      rt.game.DCounter = state.D;
      rt.game.CCounter = state.C;
      rt.game.BCounter = state.B;
    },
    // w == 3 path (offsets 138..144): l(-1), ah().
    onRelease: (value) => rt.stepLegacyL(value),
    onAh: () => rt.stepZAh(),
    onOReset: () => { rt.game.oInt = 0; },
    onPReset: () => { rt.game.pendingP = false; },
    onFlag4: () => { rt.game.frameFlags[4] = true; },
    onZ: () => rt.stepFrameSelectionTransition(),
    onAj: () => rt.stepZAj(),
  });
}

export function stepEntityCoordinateUpdate(rt: LegacyRuntimeState, id: number, offset: number): void {
  const state = {
    // BUG FIX (2026-08-31): `L` was read from/written to `game.selectedId` --
    // that field is f.l:B (#337, LOWERCASE l), a completely different
    // field from the one rt method actually writes. Direct bytecode
    // read (private void f(int,int), offset 8..13: `putfield #72 // L:B`)
    // confirms the real target is #72 (UPPERCASE L, saved K), already
    // tracked separately as `game.cameraSavedKByte` -- see its own
    // docblock in LegacyGameState.ts, and the note rt exact trap was
    // already caught once before while tracing T()'s ai===48 branch.
    // Found while merging the duplicate f(int,int) port (`stepLegacyF2`,
    // deleted) into rt one: that port DID target `cameraSavedKByte`
    // correctly, which is what exposed the mismatch. Every call here was
    // silently corrupting game.selectedId (heavily used elsewhere -- entity
    // finalize, gameplay tick, map focus) with K's old value, while the
    // real #72 field never got written by rt method at all.
    J: rt.game.JByte, I: rt.game.cameraColumn,
    L: rt.game.cameraSavedKByte, K: rt.game.cameraRow,
    C: rt.game.cursorTargetColumn, D: rt.game.cursorTargetRow,
    AFlag: rt.game.AFlag,
  };
  stepLegacyEntityCoordinateUpdate({
    state, id, offset, dense: rt.denseState,
    packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
    // BUG FIX (2026-08-18): in the original, aK() and f(int,int) share the
    // SAME I:B/K:B instance fields -- no local-copy step exists. This
    // port's `state.I`/`state.K` are a separate local copy from
    // `game.cameraColumn`/`game.cameraRow`, so a two-way sync is needed around the
    // callback: push the freshly-computed state.I/K INTO game.cameraColumn/KByte
    // first (so aK() actually clamps the fresh position, not whatever
    // game.cameraColumn/KByte happened to hold before rt call started), then
    // pull the clamped result back OUT into state.I/K afterward (so the
    // eventual write-back below doesn't overwrite aK()'s clamp with the
    // stale pre-clamp value). Missing either half is a real bug -- the
    // first version of rt fix only did the pull-back half and silently
    // fed aK() the WRONG (stale, pre-position-update) input instead.
    onViewportNormalize: () => {
      rt.game.cameraColumn = state.I;
      rt.game.cameraRow = state.K;
      rt.normalizeEntityViewport();
      state.I = rt.game.cameraColumn;
      state.K = rt.game.cameraRow;
    },
  });
  rt.game.JByte = state.J;
  rt.game.cameraColumn = state.I;
  rt.game.cameraSavedKByte = state.L;
  rt.game.cameraRow = state.K;
  rt.game.AFlag = state.AFlag;
}

/**
 * `onEntityAction`'s real target, `private void a(int,int,int,int,byte)`
 * (#443, `LegacyEntityAction.ts`).
 *
 * BUG FIX (2026-09-04): was wired with `bShort: null` on the finding that
 * `f.b:[S]` (#245) has zero `putfield` sites, making rt method a
 * guaranteed no-op. That grep covered class `f` only; the field is
 * package-private and `e.f()` allocates it (`new short[570]`) alongside
 * `f.a:[B]`/`f.a:[S]`, then loads all three from `/a`. `saveOffsets` IS
 * that table (see its own docblock and `decodeShortTableB`), so pass it.
 * This unblocks the whole downstream half of the method and its `p()`/
 * `q()` tail, which is where entity sprites are actually drawn.
 */
export function stepEntityAction(rt: LegacyRuntimeState, id: number, x: number, y: number, arg4: number, arg5: number): void {
  const data = rt.packedData;
  if (!data) return;
  const state: LegacyEntityActionState = {
    aq: id, ar: x, as: y, at: arg4, Y: arg5,
    av: 0, au: 0, aw: 0,
    // f.x:Z (#383, game.xZFlag).
    xFlag: rt.game.xZFlag,
    dense: rt.denseState,
    bShort: rt.saveOffsets,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    shortTables: data.shortTables,
    byteTables: data.byteTables,
    aQ: rt.game.aQ,
    vByte: rt.game.loopMode,
  };
  // p()/q(), the tail of f.a(int,int,int,int,byte) and the only place
  // entity sprites are actually emitted. Wired 2026-09-04, once bShort
  // above stopped being (wrongly) modelled as null. Both close over the
  // live `state`, so they see the au/av/aw/ar/as the body just computed,
  // exactly as the original's instance fields do.
  const graphics = rt.offscreenTargets?.graphics ?? [];
  // an:I (#209) is live: p() rewrites it per sprite (offsets 153/457 -- 4 for team 1, the
  // chief's remap, ...) and b(III) reads the field. CORRECTED 2026-10-15 (user report: the
  // chief/selected unit's orange clothes showed yellow): the renderer kept the value from before p().
  const game = rt.game;
  let loopAn: { an: number } | null = null;
  // The HD wide view (render/HdArt.ts): an animal's frame with an HD picture -- its sprite layers
  // go to a scratch canvas, and the picture where they landed.
  const hdAnimal = hdArt.active && arg5 === 108 ? hdArt.planAnimal(rt, id, x, y) : null;
  const packed = data && rt.imageGroups[0]
    ? new LegacyPackedSpriteRenderer({
        shortTables: data.shortTables,
        byteTables: data.byteTables,
        imageGroups: rt.imageGroups,
        graphics: hdAnimal?.graphics ?? graphics[rt.game.targetSlot] as Graphics,
        get an() { return loopAn ? loopAn.an : game.anInt; },
      })
    : undefined;

  stepLegacyEntityAction(state, {
    onP: () => {
      const loop = {
        aA: 0, aB: 0, ao: -1, ap: -1, ax: 0, ay: 0, az: 0, an: rt.game.anInt,
        aq: state.aq, ar: state.ar, as: state.as, au: state.au, Y: state.Y,
        dense: rt.denseState,
        byteTables: data.byteTables,
        shortTables: data.shortTables,
      };
      loopAn = loop;
      stepLegacySpriteLayerLoop(loop, {
        onA: () => {
          const a = {
            ay: loop.ay, sFlag: rt.game.cameraSFlag, vByte: rt.game.loopMode, at: state.at,
            dense: rt.denseState, aq: state.aq, FByte: rt.game.selectionGroup, kByte: rt.game.kByte,
            ar: state.ar, as: state.as, byteTables: data.byteTables, az: loop.az,
            cWByte: rt.game.hoverUnit, ax: loop.ax, cACInt: rt.game.boxUnitCount,
            CCounter: rt.game.CCounter, ECounter: rt.game.ECounter,
            BCounter: rt.game.BCounter, DCounter: rt.game.DCounter,
            gridC: rt.gridC,
          };
          const result = stepLegacySpriteLayerPredicateA(a, {
            onComposite: (record, x, y) => packed?.drawComposite(record, x, y),
          });
          loop.ax = a.ax;
          rt.game.boxUnitCount = a.cACInt;
          return result;
        },
        onB: () => {
          const b = {
            ay: loop.ay, az: loop.az, ap: loop.ap, ax: loop.ax, aq: state.aq,
            an: loop.an, ao: loop.ao, dense: rt.denseState,
            statScratch: rt.mainArrays.aShort,
            packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
            aw: state.aw, at: state.at, av: state.av,
          };
          const result = stepLegacySpriteLayerPredicateB(b);
          loop.ax = b.ax; loop.ap = b.ap; loop.ao = b.ao; loop.an = b.an;
          return result;
        },
        onDrawSprite: (index, x, y) => packed?.drawSprite(index, x, y),
        onDrawComposite: (index, x, y) => packed?.drawComposite(index, x, y),
      });
      hdAnimal?.after();
      rt.game.anInt = loop.an;
      rt.game.aoInt = loop.ao;
      rt.game.apInt = loop.ap;
      rt.game.projectionAx = loop.ax;
      rt.game.projectionAy = loop.ay;
      rt.game.projectionAz = loop.az;
    },
    onQ: () => {
      stepLegacyEntityOverlayDraw({
        sFlag: rt.game.cameraSFlag, ao: rt.game.aoInt, ap: rt.game.apInt, // f.ao:I/f.ap:I (#211/#213); was o:I/aP:I until 2026-10-08
        vByte: rt.game.loopMode, Y: state.Y, aq: state.aq, ar: state.ar, as: state.as,
        at: state.at, frameLayoutAq: rt.game.frameLayoutAq, kByte: rt.game.kByte,
        cWByte: rt.game.hoverUnit, FByte: rt.game.selectionGroup,
        entityFocusFlag: rt.game.entityFocusFlag,
        viewportOriginK: rt.game.cameraRow, scrollA: rt.game.cursorRow,
        viewportOriginI: rt.game.cameraColumn, scrollY: rt.game.cursorColumn,
        XByte: rt.game.unitInBuilding, zAfCursorVFlag: rt.game.zAfCursorVFlag,
        frameLayoutL: rt.game.selectedId, targetSlot: rt.game.targetSlot,
        c: rt.game.missionFrame, timingCounterE: rt.game.animStep,
        fCounter: rt.game.animPhase, dense: rt.denseState,
        colorTable: rt.game.healthBarColorTable, xSlotTable: rt.game.xSlotTable,
        byteTables: data.byteTables, gridC: rt.gridC,
        packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
      }, graphics, {
        onCScanDraw: (arg1, x, y) => rt.drawCScan(arg1, x, y),
        onSubrecordDraw: (index, x, y, phase) => rt.stepZSubrecordDraw(index, x, y, phase, {
          onSpriteRecord: (record, drawX, drawY) => packed?.drawComposite(record, drawX, drawY),
        }),
        onDrawComposite: (index, x, y) => packed?.drawComposite(index, x, y),
      });
    },
  });
  rt.game.xZFlag = state.xFlag;
  // f.aq..f.aw and f.Y are instance fields; keep a(IIIIB)'s values (2026-10-09).
  const g = rt.game;
  g.projectionAq = state.aq; g.projectionAr = state.ar; g.projectionAs = state.as; g.projectionAt = state.at;
  g.projectionAu = state.au; g.projectionAv = state.av; g.projectionAw = state.aw; g.projectionY = state.Y;
}
