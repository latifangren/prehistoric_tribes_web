import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { toJavaByte } from "../core/LegacyRuntimeState";
import { stepLegacyGameplayTick } from "../core/LegacyGameplayTick";
import { stepLegacyGameplayInput } from "./LegacyGameplayInput";
import { stepLegacyGameplayCommand } from "./LegacyGameplayCommand";
import { acceptLegacyNumericValue } from "../core/LegacyNumericSequence";
import { stepLegacyFrame, type LegacyFrameStepInput } from "../core/LegacyFrameStep";
import { stepLegacyZTransition } from "./LegacyZTransition";
import { stepLegacyZAi } from "./LegacyZAi";
import { resetLegacyZI } from "./LegacyZI";
import { stepLegacyZAb } from "./LegacyZAb";
import { stepLegacyZAc } from "./LegacyZAc";
import { stepLegacyZAd } from "./LegacyZAd";
import { stepLegacyZAa } from "./LegacyZAa";
import { releaseLegacyEntityHome } from "../sim/units/LegacyEntityDeathCleanup";
import { stepLegacyCursorHover } from "./LegacyCursorHover";
import { stepLegacySelectionFlags } from "./LegacySelectionFlags";
import { stepLegacyAKViewport, stepLegacyAL } from "../sim/world/LegacyMapEntryTransitions";
import { subsystemTenSlotReleaseEntity } from "../sim/tribe/TribeRuntime";
import { stepCameraFollow } from "../render/CameraRuntime";
import { stepLegacyZAe } from "./LegacyZAe";
import { stepLegacyZAf } from "./LegacyZAf";
import { stepStateAi } from "./UiStateRuntime";

/**
 * LegacyRuntimeState wiring moved out of the class (phase 2 step 3): each function is the former
 * method of the same name, with `this` as the `rt` parameter.
 */

/** Feed a raw numeric keycode into the original f.m(int) sequence helper. */
export function acceptNumericSequence(rt: LegacyRuntimeState, value: number): void {
  // u:B (#372) is the SAME real field f.j()/f.am()/f.a(BBBB)/f.aM() share
  // (game.uByte); prime it from there so rt method's conditional
  // "u = 1" write is a faithful read-modify-write against the live
  // field, not a disconnected shadow copy (merged 2026-08-20).
  rt.numericSequence.u = rt.game.uByte;
  // q:B (#357) is likewise the SAME field `game.mission` already tracks
  // pervasively (30+ call sites); prime/write back through it instead of
  // the disconnected `numericQ` shadow (merged 2026-08-20, see
  // docs/unknowns.md's "f.j()/LegacyFrameStep duplicate-field cluster").
  rt.numericSequence.q = rt.game.mission;
  acceptLegacyNumericValue(rt.numericSequence, value);
  rt.game.numericAe = rt.numericSequence.ae;
  rt.game.numericAf = rt.numericSequence.af;
  rt.game.numericAg = rt.numericSequence.ag;
  rt.game.uByte = rt.numericSequence.u;
  rt.game.mission = rt.numericSequence.q;
}

/** Raw keyPressed(int) writes outside the input mirror. */
export function projectRawKeyPressed(rt: LegacyRuntimeState, value: number): void {
  switch (value) {
    case 53:
      // keyPressed offsets 311..343: i, t, n:I += 1 (the double-tap count
      // a(byte,byte) reads; FIXED 2026-10-08, it never counted), and E:B = 0
      // unless u:Z.
      rt.game.iFlag = true;
      rt.game.inputT = true;
      rt.game.nInt += 1;
      if (!rt.game.boxSelecting) rt.game.E = 0;
      return;
    case 50: rt.game.inputUp = true; return;
    case 56: rt.game.inputDown = true; return;
    case 52: rt.game.inputLeft = true; return;
    case 54: rt.game.inputRight = true; return;
    default: return;
  }
}

/** Raw keyReleased(int) writes outside the input mirror. */
export function projectRawKeyReleased(rt: LegacyRuntimeState, value: number): void {
  switch (value) {
    case 53:
      rt.game.inputT = false;
      if (rt.game.E < 4) rt.game.inputV = true;
      return;
    case 50: rt.game.inputUp = false; return;
    case 56: rt.game.inputDown = false; return;
    case 52: rt.game.inputLeft = false; return;
    case 54: rt.game.inputRight = false; return;
    default: return;
  }
}

/**
 * Exact f.c() (#365, bytecode/f-javap.txt, offsets 0..53): the map widens
 * to its full stored size (c:S = e:S, d:S = f:S -- aN() cut mission 5 to
 * 32 columns less), q moves on, aP() places the new mission's entities and
 * b.G:I = t219 + 4q. b.ak() calls it when mission 5 is won, which is how
 * mission 6 starts on the same, now larger, map. WIRED 2026-09-24; the old
 * port (beginMapSession) had no caller and an invented session byte.
 */
export function stepLegacyC(rt: LegacyRuntimeState): void {
  const g = rt.game;
  if (rt.activeMap) {
    g.mapWidth = rt.activeMap.width;
    g.mapHeight = rt.activeMap.height;
  }
  g.mission = toJavaByte(g.mission + 1);
  rt.runAP();
  // b.G:I = f.a:[S][219] + 4q (offsets 31..50). FIXED 2026-10-08 (oracle): wrote an
  // unread `subsystemPointer` copy, from saveOffsets (f.b:[S) instead of packedOffsets.
  g.subsystemGBase = (rt.packedOffsets[219] ?? 0) + g.mission * 4;
}

/** Execute the bytecode-backed f.j() control-flow step against caller-owned map/update hooks. */
export function stepFrame(rt: LegacyRuntimeState, input: Omit<LegacyFrameStepInput, "game">): void {
  stepLegacyFrame({ ...input, game: rt.game });
}

/**
 * Enter the proven f.j() maintenance step used by the v==1 branch.
 * Entity/subsystem callbacks remain inert until their callers are mapped,
 * but the original map sweep and transition counters are still advanced.
 */
export function stepGameplayFrame(rt: LegacyRuntimeState): void {
  rt.game.resourceByte = (shortOffset, add) => {
    const base = rt.packedOffsets[shortOffset] ?? 0;
    return rt.packedBytes[base + add] ?? 0;
  };
  stepLegacyGameplayTick(rt.game, {
    // f.l(int) (#620), the same method as every other l() call site. Was
    // `mByte = mode` until 2026-10-08 (oracle): h()'s k:Z reset block's l(-1)
    // clobbered m:B and never set Y:I.
    loadMode: (mode) => rt.stepLegacyL(mode),
    onI: () => resetLegacyZI(rt.game),
    onClearO: () => rt.input.clearRepeatGuard(),
    // f.h() owns the v==0 -> f.ak() dispatch in the original run loop.
    // Keep it inside rt tick so timing counters and state transitions have
    // the same caller boundary in menu and gameplay states.
    onStateMachine: () => { rt.stepStateMachine(); },
    onV: () => {
      stepLegacyGameplayInput(rt.game, rt.denseState, rt.gridC, {
        onW: () => {
          stepLegacyGameplayCommand(rt.game, {
            // f.W()'s staticL branch calls a(true,false,false,false,true,
            // false,false,false,false) -- confirmed via direct bytecode
            // read (offsets 18-27, invokespecial #464) -- the SAME
            // 9-arg method already ported as runSelectionFlagsRefresh
            // (extended 2026-08-18 to expose all 9 params for rt call).
            onSelectionPreset: () => rt.runSelectionFlagsRefresh(true, false, false, false, true),
            onZ: () => { rt.stepFrameSelectionTransition(); },
            // f.l(int) is already ported/wired elsewhere as stepLegacyL
            // (LegacyZL.ts, via stepLegacyX's l(-1) calls) -- rt is the
            // SAME method, confirmed via bytecode (constant pool #620,
            // `invokespecial #620 // Method l:(I)V`, identical to every
            // other l(-1) call site rt session already traced).
            onL: (value) => rt.stepLegacyL(value),
            onViewportReset: () => {
              // BUG FIX (2026-08-18): was reading the stale, unverified
              // game.viewportC/viewportD; direct bytecode read of f.W()'s
              // own i===1 branch (offset ~228/254) confirms y:B=C:B/
              // A:B=D:B here too, i.e. cursorTargetColumn/cursorTargetRow.
              rt.game.cursorColumn = rt.game.cursorTargetColumn;
              rt.game.cursorRow = rt.game.cursorTargetRow;
              // f.W(i=1) derives I/K from k[0][0]/k[1][0] before aK().
              rt.game.cameraColumn = rt.mainArrays.kMatrix[0][0] - rt.game.cursorColumn;
              rt.game.cameraRow = rt.mainArrays.kMatrix[1][0] - rt.game.cursorRow;
              rt.normalizeEntityViewport();
            },
            onEntityActionStart: (ap, am, an) => rt.beginEntityAction(ap, am, an),
            onExitPreparation: () => rt.stepLegacyExitPreparation(),
            // f.W()'s own last instruction (offset 391) -- found missing
            // entirely (2026-08-22) while auditing rt session's other
            // i() (#610) call sites; see LegacyGameplayCommand.ts's own
            // onI docblock.
            onI: () => resetLegacyZI(rt.game),
          });
        },
        onAF: () => rt.selectWindowUnits(),
        onAE: () => rt.stepAe(),
        onAG: () => rt.stepGroupKey(true),
        onAH: () => rt.stepGroupKey(false),
        onAL: () => {
          const state = { w: rt.game.wFlag ? 1 : 0, I: rt.game.inputI };
          stepLegacyAL(state);
          rt.game.wFlag = state.w !== 0;
          rt.game.inputI = state.I;
        },
        onClearSelection: () => { rt.game.pendingP = false; },
        onD: (arg) => rt.stepLegacyD(arg),
        onE: (arg) => rt.stepLegacyE(arg),
        onF: (arg) => rt.stepLegacyF(arg),
        onXDispatch: () => rt.stepLegacyX(),
        onY: () => stepCameraFollow(rt),
      });
    },
    allocateMaintenanceRecord: () => { rt.stepByteActionQueueMaintenance(); },
    // f.h()'s w:B===2||4 gate calls lowercase `ae()` (invokespecial #506,
    // "Method ae:()V", confirmed via direct bytecode read at offset
    // 344-382) -- NOT the unrelated UPPERCASE f.aE() already wired via
    // stepStateAe/onAE above, a case-sensitive collision confirmed
    // separately. See stepGameplayZAe().
    onAe: () => { rt.stepGameplayZAe(); },
    // f.k() (#616), the cursor's hover target W:B. Unwired until 2026-10-08
    // (oracle frame 482): a tap next to a villager never selected it.
    onK: () => stepLegacyCursorHover(rt.game, rt.gridC, rt.denseState),
    onFrameUpdate: () => rt.stepOriginalJ(),
    // f.h()'s k-reset block -- WIRED (2026-08-24), confirmed via direct
    // bytecode read (offset 593, invokespecial #434 // Method a:(ZZZZ)V):
    // the SAME 4-arg boolean overload already ported as
    // runSelectionFlagsRefresh.
    resetSelection: (a, b, c, d) => rt.runSelectionFlagsRefresh(a, b, c, d),
    // f.h()'s own aI() call (offset 642, invokespecial #490 // Method
    // aI:()V) -- WIRED (2026-08-24): already ported as stepLegacyAi
    // (stepStateAi's own wrapper) but had zero callers anywhere in the
    // codebase until now. a4 is f.a:[[B](#130) index 4, the SAME field
    // already established as mainArrays.aByte (fixed earlier today for
    // stepLegacyE's own teamEntitySlots duplicate-field bug).
    onFlushPending: () => {
      stepStateAi(rt, { a4: rt.mainArrays.aByte[4]!, dense: rt.denseState });
    },
  });
}

/**
 * Runtime owner for the lowercase `f.ae()` dispatcher (`LegacyZAe.ts`).
 * Reuses `stepLegacyZAi`/`stepLegacyZAh` (already fully derived, now
 * wired for the first time via rt call) for the `ai()`/`ah()` tail
 * calls. **DOC CORRECTION (2026-08-22)**: `af()` is now fully derived
 * and wired too (`LegacyZAf.ts`, `onAf` below) -- rt comment's own
 * "left as a no-op seam until the remaining branches are ported" was
 * stale, left over from before that same-day fix landed.
 */
export function stepGameplayZAe(rt: LegacyRuntimeState): void {
  const g = rt.game;
  const state = {
    nInt: g.nInt,
    inputLeft: g.inputLeft,
    inputRight: g.inputRight,
    inputUp: g.inputUp,
    inputDown: g.inputDown,
    jByte: g.jByte,
    as: g.menuCursor,
    aX: g.frameLayoutAX,
    aW: g.frameLayoutAW,
    ar: g.frameLayoutAR,
    V: g.zAfCursorVFlag,
    gameplaySFlag: g.gameplaySFlag,
    selectionFlags: g.selectionFlags,
    QFlag: g.zAd14QFlag,
    RFlag: g.zAd14RFlag,
    y: g.frameGenCounterY,
    zlYInt: g.zlYInt,
    s: rt.mainArrays.s,
    at: g.frameLayoutAT,
    tiles: rt.mainArrays.aByte3,
    zScratchAuByte: g.zScratchAuByte,
    r: rt.mainArrays.r,
    iFlag: g.iFlag,
    staticL: g.staticL,
    inputV: g.inputV,
    E: g.E,
    wByte: g.barMode,
    staticM: g.staticM,
  };
  const writeBack = (): void => {
    g.nInt = state.nInt;
    g.frameGenCounterY = state.y;
    g.inputLeft = state.inputLeft;
    g.inputRight = state.inputRight;
    g.inputUp = state.inputUp;
    g.inputDown = state.inputDown;
    g.menuCursor = state.as;
    g.frameLayoutAX = state.aX;
    g.zAfCursorVFlag = state.V;
    g.zlYInt = state.zlYInt;
    g.iFlag = state.iFlag;
    g.staticL = state.staticL;
    g.inputV = state.inputV;
    g.E = state.E;
    g.barMode = state.wByte;
    g.staticM = state.staticM;
  };
  const readIn = (): void => {
    state.nInt = g.nInt;
    state.inputLeft = g.inputLeft;
    state.inputRight = g.inputRight;
    state.inputUp = g.inputUp;
    state.inputDown = g.inputDown;
    state.as = g.menuCursor;
    state.aX = g.frameLayoutAX;
    state.V = g.zAfCursorVFlag;
    state.zlYInt = g.zlYInt;
    state.iFlag = g.iFlag;
    state.staticL = g.staticL;
    state.inputV = g.inputV;
    state.E = g.E;
    state.wByte = g.barMode;
    state.staticM = g.staticM;
  };
  stepLegacyZAe(state, {
    onAi: () => {
      const aiState = {
        flags: g.selectionFlags,
        bFlags: g.frameFlags,
        r: rt.mainArrays.r,
        // ai() re-reads ad:B after its a(Z..) calls (offset 190), so live.
        get ad() { return g.selectionAd; },
        as: state.as,
        ar: state.ar,
        aX: state.aX,
        aW: state.aW,
        q: g.mission,
        l: g.selectedId,
        T: g.frameLayoutT,
        U: g.frameLayoutU,
      };
      stepLegacyZAi(aiState, rt.aiFlagCallbacks());
      g.selectedId = aiState.l;
      g.frameLayoutT = aiState.T;
      g.frameLayoutU = aiState.U;
    },
    // l(int) writes w and P directly; same push/pull as onAh/onAf (it was
    // missing here, so ae()'s final writeBack undid l()'s w). 2026-09-23.
    onL: (value) => {
      writeBack();
      rt.stepLegacyL(value);
      readIn();
    },
    onAh: () => {
      writeBack();
      rt.stepZAh();
      readIn();
    },
    // BUG FIX (2026-09-14): af() and its callees (l(int) in particular)
    // write game.* directly, but rt method snapshots those same fields
    // into `state` and wrote the snapshot back after stepLegacyZAe returned.
    // Measured: choosing a building ran l(0) -- d[4]=33 ("place the
    // building."), zlX=w, the four-flag reset -- and set w=3, and then the
    // write-back restored the stale w=2, so placement mode never started.
    // The original has no snapshot: ae(), af() and l() share the instance
    // fields. Push before af(), pull after.
    onAf: () => {
      writeBack();
      rt.stepGameplayZAf();
      readIn();
    },
  });
  writeBack();
}

/**
 * Runtime owner for `private void af()` (`LegacyZAf.ts`). Its sole real
 * caller is `f.ae()`'s `i:Z||static-l:Z` branch (`stepGameplayZAe()`'s
 * `onAf`). `b.b(byte)` (inside `f.b(int,boolean)`, `r[as] in {16,26}`) is
 * left as a documented no-op seam -- see `LegacyZB2.ts`'s own docblock
 * for why. `b.a(int,boolean)` (inside `b.c()`, `r[as] in {14,15}`) is now
 * fully ported and wired -- see `subsystemBC()`'s own docblock.
 */
export function stepGameplayZAf(rt: LegacyRuntimeState): void {
  const g = rt.game;
  const state = {
    dense: rt.denseState,
    r: rt.mainArrays.r,
    as: g.menuCursor,
    entityFocusFlag: g.entityFocusFlag,
    kByte: g.kByte,
    frameLayoutAX: g.frameLayoutAX,
    frameLayoutL: g.selectedId,
    V: g.zAfCursorVFlag,
    qCounter: g.qCounter,
    selectionFlags: g.selectionFlags,
    wByte: g.barMode,
    cSInt: g.cSInt,
    pendingP: g.pendingP,
    xMFlag: g.xMFlag,
    xOFlag: g.xOFlag,
    outerLoopLFlag: g.formUpActive,
    outerLoopNFlag: g.callToArmsActive,
    frameLayoutAq: g.frameLayoutAq,
    yByte: g.cursorColumn,
    IByte: g.cameraColumn,
    AByte: g.cursorRow,
    KByte: g.cameraRow,
    FByte: g.selectionGroup,
    aByte2d: rt.mainArrays.aByte,
    gridC: rt.gridC,
    kFlag: g.choosingChief,
    aShort: rt.mainArrays.aShort,
    gRows: rt.subsystemArrays.gRows,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  };
  // BUG FIX (2026-09-14): same stale-snapshot shape as stepGameplayZAe.
  // af()'s callbacks write game.* directly -- l(int) sets w/s/P/M/O,
  // aJ() sets k, f(int,int) moves the camera -- while rt method kept
  // copies of those same fields in `state` and wrote them all back after
  // stepLegacyZAf returned. Measured: picking a building ran l(0), which set
  // w=3, and the write-back restored w=2, so placement mode never began.
  // In the original every one of these is a shared instance field, so each
  // callback now sees af()'s current values and af() sees what it left.
  const writeBack = (): void => {
    g.menuCursor = state.as;
    g.entityFocusFlag = state.entityFocusFlag;
    // af() offset 129..131 clears f.K:Z (#69) inside the k===l branch.
    g.choosingChief = state.kFlag;
    g.kByte = state.kByte;
    g.frameLayoutAX = state.frameLayoutAX;
    g.selectedId = state.frameLayoutL;
    g.zAfCursorVFlag = state.V;
    g.barMode = state.wByte;
    g.cSInt = state.cSInt;
    g.pendingP = state.pendingP;
    g.xMFlag = state.xMFlag;
    g.xOFlag = state.xOFlag;
    g.formUpActive = state.outerLoopLFlag;
    g.callToArmsActive = state.outerLoopNFlag;
    g.frameLayoutAq = state.frameLayoutAq;
  };
  const readIn = (): void => {
    state.as = g.menuCursor;
    state.entityFocusFlag = g.entityFocusFlag;
    state.kFlag = g.choosingChief;
    state.kByte = g.kByte;
    state.frameLayoutAX = g.frameLayoutAX;
    state.frameLayoutL = g.selectedId;
    state.V = g.zAfCursorVFlag;
    state.wByte = g.barMode;
    state.cSInt = g.cSInt;
    state.pendingP = g.pendingP;
    state.xMFlag = g.xMFlag;
    state.xOFlag = g.xOFlag;
    state.outerLoopLFlag = g.formUpActive;
    state.outerLoopNFlag = g.callToArmsActive;
    state.frameLayoutAq = g.frameLayoutAq;
    state.qCounter = g.qCounter;
    state.yByte = g.cursorColumn;
    state.IByte = g.cameraColumn;
    state.AByte = g.cursorRow;
    state.KByte = g.cameraRow;
    state.FByte = g.selectionGroup;
  };
  const shared = <A extends unknown[], R>(fn: (...args: A) => R) => (...args: A): R => {
    writeBack();
    const result = fn(...args);
    readIn();
    return result;
  };
  stepLegacyZAf(state, {
    onF2: shared((arg1: number, arg2: number) => rt.stepEntityCoordinateUpdate(arg1, arg2)),
    onAjUpper: shared(() => rt.runAjUpper()),
    onCompleteEntityRecord: shared((record: number) => rt.completeEntityRecord(record)),
    resourceByte: (shortOffset, add) => g.resourceByte?.(shortOffset, add) ?? 0,
    onSubsystemBC: shared(() => rt.subsystemBC()),
    onReleaseTenEntity: shared((id: number) => subsystemTenSlotReleaseEntity(rt, id)),
    onSelectionReset: shared((a: boolean, b: boolean, c: boolean, d: boolean) => rt.runSelectionFlagsRefresh(a, b, c, d)),
    onSelectionReset9: shared((a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean, h: boolean, i: boolean, j: boolean) =>
      rt.runSelectionFlagsRefresh(a, b, c, d, e, f, h, i, j)),
    onL: shared((value: number) => rt.stepLegacyL(value)),
    // Offsets 134..150, after a new chief is picked: b.b(int) (#544, the
    // chief gives up its reserved hut) and d(byte) (#578). WIRED 2026-09-23.
    onSubsystemBB: shared((id: number) => releaseLegacyEntityHome(rt.denseState, rt.saveOffsets, id)),
    onDByte: shared((value: number) => rt.stepLegacyD(value)),
  });
  writeBack();
}

/**
 * Runtime owner for the proven common portion of f.Z() and its f.ai() tail.
 *
 * The child builders aa/ab/ac/ad still have unresolved original table
 * aliases, so they remain no-op seams here.  The flag-6 branch, array reset,
 * window sizing, centering, and f.ai() classification are fully backed by
 * bytecode and are intentionally executed on the live frame state.
 *
 * BROAD EXCEPTION BOUNDARY (2026-09-03, added alongside `LegacyZAa.ts`'s
 * `checkArrayIndex` fix for its `au`-scan loop): `f.Z()`'s own
 * disassembly (`bytecode/f-javap.txt`) carries an `Exception table` whose
 * three ranges (0..28, 29..199, 200..348 -- all targeting the same
 * `pop; return` handler) together cover its ENTIRE body, including the
 * `aa()`/`ab()`/`ac()`/`ai()` call cluster rt method mirrors -- i.e.
 * real Java silently aborts just rt one Z()-step and returns if
 * anything inside throws (`ArrayIndexOutOfBoundsException` included).
 * This method had no equivalent try/catch, so `LegacyZAa.ts`'s new
 * `checkArrayIndex` throw (reproducing a real, previously-implicit JVM
 * bounds check) would have escaped all the way up through
 * `stepGameplayFrame()`'s `stepLegacyGameplayTick` to `main.ts`'s
 * `tick()`, which has no try/catch of its own either -- turning what
 * Java treats as "abort rt one Z() step, keep going" into an uncaught
 * exception that kills the whole tick. Wrapping the body here in the
 * matching `try/catch` is not optional scope creep on top of the
 * `au`-loop fix -- without it, that fix would trade an infinite silent
 * hang for a worse, differently-scoped crash than real Java ever
 * produces.
 */
export function stepFrameSelectionTransition(rt: LegacyRuntimeState): void {
  try {
    stepFrameSelectionTransitionInner(rt);
  } catch {
    // Preserve Z()'s broad exception boundary: abort just rt Z()
    // step, exactly like the real `try { aa()/ab()/ac()/...; } catch
    // (Exception e) { }` wrapping its whole body.
  }
}

export function stepFrameSelectionTransitionInner(rt: LegacyRuntimeState): void {
  const raw = {
    ar: rt.game.frameLayoutAR,
    at: rt.game.frameLayoutAT,
    as: rt.game.menuCursor,
    aX: rt.game.frameLayoutAX,
    aW: rt.game.frameLayoutAW,
    aY: rt.game.frameLayoutAY,
    aZ: rt.game.frameLayoutAZ,
    l: rt.game.selectedId,
  };
  stepLegacyZTransition({
    flags: rt.game.selectionFlags,
    // Z() offsets 280..288: `b[ad] = true` -- b:[Z #234, frameFlags.
    bFlags: rt.game.frameFlags,
    r: rt.mainArrays.r,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    raw,
    qByte: rt.game.mission,
    // BUG FIX (2026-09-14): Z() offset 130 is `getfield #200 // Field ai:B`,
    // the T()/S()/U() scene-dispatch key (game.ai). frameCommandAI is
    // `aI:I` (#157), the f.d(int,int) frame-command field -- a different
    // field that differs only in letter case (class f also has `ai:I` #199).
    // With the wrong twin the count at offsets 117..144,
    // `q > 1 ? 11 : (ai < 18 ? 3 : 6)`, read an int like 534 and built six
    // Build entries where KEmulator shows three (hut, store, kitchen).
    aiByte: rt.game.ai,
    pendingP: rt.game.pendingP,
    adByte: rt.game.selectionAd,
    aU: rt.game.frameLayoutAU,
    aV: rt.game.frameLayoutAV,
    onAI: () => {
      const game = rt.game;
      const aiState = {
        flags: rt.game.selectionFlags,
        bFlags: rt.game.frameFlags,
        r: rt.mainArrays.r,
        get ad() { return game.selectionAd; },
        as: raw.as,
        ar: raw.ar,
        aX: raw.aX,
        aW: raw.aW,
        q: rt.game.mission,
        l: raw.l,
        T: rt.game.frameLayoutT,
        U: rt.game.frameLayoutU,
      };
      stepLegacyZAi(aiState, rt.aiFlagCallbacks());
      // Into `raw`, which the epilogue below writes back. BUG FIX
      // 2026-09-23: writing game.selectedId here was overwritten by that
      // epilogue with Z()'s own `l = 0`, so the chief-pick cursor sat on 0.
      raw.l = aiState.l;
      rt.game.frameLayoutT = aiState.T;
      rt.game.frameLayoutU = aiState.U;
    },
    onAA: () => {
      // f.aa() is the producer for r[]/s[] later consumed by 1010.
      // 2026-08-21: switched from the mode-0-only fillLegacyZChoiceRows to
      // the full stepLegacyZAa (modes 0/6/8) now that mode 6's k/F/
      // a:[[B]/a:[[S] inputs are resolved -- k=game.kByte(f.k:B #333),
      // F=game.selectionGroup(f.F:B #50), a:[[B]/a:[[S] = mainArrays.aByte/
      // aShort (confirmed via exact constructor allocation sizes 5x50/
      // 2x26). See LegacyZAa.ts's own docblock for the mode-0 formula fix
      // made earlier the same day.
      const aaState = {
        e: rt.denseState,
        packed: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        tiles: rt.mainArrays.aByte3,
        a2dByte: rt.mainArrays.aByte,
        a2dShort: rt.mainArrays.aShort,
        s: rt.mainArrays.s,
        r: rt.mainArrays.r,
        // aa() reads q:I (#356, the selected record) and the live ar:B
        // Z() has just reset -- FIXED 2026-10-07: it was given f.q:B (the
        // mission) and the pre-Z() ar snapshot, so the armoury listed five
        // clubs instead of club / spear / net trap.
        q: rt.game.qCounter,
        k: rt.game.kByte,
        F: rt.game.selectionGroup,
        au: 0,
        av: rt.game.frameLayoutAv,
        at: raw.at,
        ar: raw.ar,
      };
      stepLegacyZAa(aaState);
      rt.game.frameLayoutAv = aaState.av;
      raw.at = aaState.at;
      raw.ar = aaState.ar;
    },
    onAB: () => {
      const abState = {
        e: rt.denseState,
        j: rt.game.zAbScratch,
        r: rt.mainArrays.r,
        q: rt.game.qCounter,
        ar: raw.ar,
      };
      stepLegacyZAb(abState);
      raw.ar = abState.ar;
    },
    onAC: () => {
      const acState = {
        e: rt.denseState,
        // f.f:[B (#290) is the per-kind max level b.j() fills (mainArrays.f).
        // FIXED 2026-10-07: was a never-written copy, so UPGRADE never showed.
        f: rt.mainArrays.f,
        r: rt.mainArrays.r,
        q: rt.game.qCounter,
        ar: raw.ar,
      };
      stepLegacyZAc(acState);
      raw.ar = acState.ar;
    },
    // f.ad() -- wired 2026-08-21. F/N/L/K/q were already-canonical fields
    // (see docs/code-mapping.md's 2026-08-21 entries); aq is the newly
    // exposed game.frameLayoutAq scratch counter (see its own docblock).
    // The F===true branch really does overwrite aq as a reused loop
    // counter in the original bytecode -- writing it back unconditionally
    // is faithful, not a bug.
    onAD: () => {
      const adState = {
        F: rt.game.entityFocusFlag,
        qByte: rt.game.mission,
        N: rt.game.callToArmsActive,
        L: rt.game.formUpActive,
        K: rt.game.choosingChief,
        e: rt.denseState,
        r: rt.mainArrays.r,
        ar: raw.ar,
        aq: rt.game.frameLayoutAq,
        aqInt: rt.game.projectionAq,
      };
      // Offset 354: a(ZZZZZZZZZ) (#464) -- was left unwired.
      stepLegacyZAd(adState, rt.aiFlagCallbacks());
      raw.ar = adState.ar;
      rt.game.frameLayoutAq = adState.aq;
      rt.game.projectionAq = adState.aqInt;
    },
  });
  rt.game.frameLayoutAR = raw.ar;
  rt.game.frameLayoutAT = raw.at;
  rt.game.menuCursor = raw.as;
  rt.game.frameLayoutAX = raw.aX;
  rt.game.frameLayoutAW = raw.aW;
  rt.game.frameLayoutAY = raw.aY;
  rt.game.frameLayoutAZ = raw.aZ;
  rt.game.selectedId = raw.l;
}

export function runSelectionFlagsRefresh(rt: LegacyRuntimeState, 
  first: boolean, second: boolean, third: boolean, fourth: boolean,
  fifth = false, sixth = false, seventh = false, eighth = false, ninth = false,
): void {
  const selectionState = {
    aFlags: rt.game.selectionFlags,
    bFlags: rt.game.frameFlags,
    uBytes: rt.mainArrays.uBytes,
    dBytes: rt.game.selectionDBytes,
    recordOf: (ad: number) => rt.packedBytes[(rt.packedOffsets[195] ?? 0) + ad] ?? 0,
    cInts: rt.game.frameRecordInts,
    bInts: rt.game.frameRecordHeights,
    bb: rt.game.selectionBb,
    ax: rt.game.selectionAx,
    // ag:I/P:B/C:Z/K:B/d:S are the camera's own fields; until 2026-10-01
    // rt used never-shared selectionAg/P/CFlag/K/DSize copies, so a HUD
    // resize never reached n() (stale HUD pixels stayed on the map).
    ag: rt.game.rowScrollDelta,
    ad: rt.game.selectionAd,
    ba: rt.game.selectionBa,
    P: rt.game.viewRows,
    AInt: rt.game.selectionAInt,
    CFlag: rt.game.cameraCFlag,
    K: rt.game.cameraRow,
    A: rt.game.cursorRow,
    AFlag: rt.game.AFlag,
    dSize: rt.game.mapHeight,
  };
  stepLegacySelectionFlags(selectionState, first, second, third, fourth, fifth, sixth, seventh, eighth, ninth);
  rt.game.selectionBb = selectionState.bb;
  rt.game.selectionAx = selectionState.ax;
  rt.game.rowScrollDelta = selectionState.ag;
  rt.game.selectionAd = selectionState.ad;
  rt.game.selectionBa = selectionState.ba;
  rt.game.viewRows = selectionState.P;
  rt.game.selectionAInt = selectionState.AInt;
  rt.game.cameraCFlag = selectionState.CFlag;
  rt.game.cameraRow = selectionState.K;
  rt.game.cursorRow = selectionState.A;
  rt.game.AFlag = selectionState.AFlag;
}

/**
 * BUG FIX (2026-08-18): `C`/`D`/`sFlag`/`c`/`d` used to read from
 * `game.viewportC`/`viewportD`/`viewportSFlag`/`viewportCSize`/
 * `viewportDSize` -- placeholder fields whose own docblock admitted
 * "source table aliases remain unresolved" (never checked against real
 * bytecode). Direct reads of `aK()`'s own raw bytecode (offset 1-13,
 * 44-48) confirm `C:B`(#42)/`D:B`(#45)/`s:Z`(#365) are the SAME already-
 * tracked `cursorTargetColumn`/`cursorTargetRow`/`cameraSFlag` fields
 * `f.Y()`/`f.n()` already use; `c:S`(#254)/`d:S`(#266) are `mapWidth`/
 * `mapHeight` (also independently confirmed via `f.aK()`'s own bytecode,
 * matching rt project's other confirmed uses of #254/#266). The old
 * fields were fed by nothing real (`viewportC`/`viewportD`/
 * `viewportSFlag` had zero correct producers; `viewportCSize`/
 * `viewportDSize` were a harmless but redundant copy of `mapWidth`/
 * `mapHeight`, always set together with them) -- so rt call has likely
 * been normalizing the viewport against stale/wrong inputs since it was
 * written. See docs/unknowns.md for the discovery trace.
 */
export function normalizeEntityViewport(rt: LegacyRuntimeState): void {
  const viewport = {
    C: rt.game.cursorTargetColumn, D: rt.game.cursorTargetRow,
    y: rt.game.cursorColumn, A: rt.game.cursorRow,
    I: rt.game.cameraColumn, K: rt.game.cameraRow,
    sFlag: rt.game.cameraSFlag, O: rt.game.viewColumns,
    c: rt.game.mapWidth, P: rt.game.viewRows, d: rt.game.mapHeight,
  };
  stepLegacyAKViewport(viewport);
  rt.game.cursorColumn = viewport.y;
  rt.game.cursorRow = viewport.A;
  rt.game.cameraColumn = viewport.I;
  rt.game.cameraRow = viewport.K;
}

/**
 * Exact `private void E()` (bytecode/f-javap.txt offsets 0..157) --
 * `stepLegacyGameplayCommand`'s `onExitPreparation` target (`f.W()`'s
 * `iByte===3` branch, the non-`qByte===3` continuation). Computes two
 * independent clamped viewport-window origins from the camera position
 * (`IByte`/`KByte`) and viewport size (`viewportO`/`viewportP`) against
 * the map bounds (`mapWidth`/`mapHeight`), using two fixed constants
 * (`ag:B`(#195)=40, `ah:B`(#198)=60 -- confirmed via exhaustive grep to
 * have exactly one `putstatic` each, in the class's own `static{}`
 * initializer, never written anywhere else -- true constants, inlined
 * directly rather than tracked as fields). The vertical branch is
 * mutually exclusive: `ah:B<=mapHeight` computes `exitPrepXInt`, else
 * computes `exitPrepALInt` instead (confirmed via the bytecode's own
 * `if_icmple`/early-return structure, not both). Consumers of these
 * three outputs (`W:I`/#111, `X:I`/#114, `aL:I`/#160) are read from many
 * call sites across `V()`/`X()` and others -- out of scope here; rt
 * only ports the producer.
 */
export function stepLegacyExitPreparation(rt: LegacyRuntimeState): void {
  const g = rt.game;
  g.exitPrepWInt = (g.cameraColumn - Math.trunc(40 / 2)) + (g.viewColumns >> 1);
  if (g.exitPrepWInt < 0) {
    g.exitPrepWInt = 0;
  } else if (g.exitPrepWInt + 40 >= g.mapWidth) {
    g.exitPrepWInt = g.mapWidth - 40;
  }

  if (60 <= g.mapHeight) {
    g.exitPrepXInt = (g.cameraRow - Math.trunc(60 / 2)) + (g.viewRows >> 1);
    if (g.exitPrepXInt < 0) {
      g.exitPrepXInt = 0;
    } else if (g.exitPrepXInt + 60 >= g.mapHeight) {
      g.exitPrepXInt = g.mapHeight - 60;
    }
  } else {
    g.exitPrepALInt = (60 - g.mapHeight) >> 1;
  }
}
