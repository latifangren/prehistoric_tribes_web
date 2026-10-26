import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { liveView } from "../core/LegacyRuntimeState";
import { runLegacyL, runLegacyM } from "../sim/tribe/LegacySubsystemLifecycle";
import { classifyLegacyNegativeEntity, classifyLegacyPositiveEntity, isLegacyEntityIdInRange101to122 } from "../render/LegacyEntityClassifiers";
import { classifyLegacySubsystemB } from "../sim/tribe/LegacySubsystemBClassify";
import { stepLegacyByteActionQueue } from "./LegacyByteActionQueue";
import { stepLegacyZL, type LegacyZLState } from "./LegacyZL";
import { drawPackedComposite } from "../render/RenderRuntime";
import { BLD_KIND, BLD_X, BLD_Y, UNIT_DIRECTION, UNIT_FLAGS, UNIT_HAPPINESS, UNIT_HOME_X, UNIT_HOME_Y, UNIT_HP, UNIT_ORDER, UNIT_RECORD, UNIT_SPEED, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_WORK_TARGET, UNIT_X, UNIT_Y } from "../core/DenseLayout";
import { T_BUILDING } from "../core/DataTables";

/** Exact private void t(): clears f.d:[[B]'s (#268) row 0, all 40 slots. */
export function stepLegacySceneAnimatedSlotClear(rt: LegacyRuntimeState): void {
  rt.mainArrays.d[0]!.fill(0);
}

/**
 * Exact private void T()'s `ai===37` branch (bytecode/f-javap.txt
 * offsets 115..272) -- the branch rt whole investigation traced
 * `finalizeEntity`'s real automatic trigger through. `b.l()`
 * (`runLegacyL`) fires FIRST, before any of the entity-spawn calls
 * below, so `finalizeEntity` reliably runs even though the batch-
 * allocate calls that follow are confirmed (2026-08-18, see
 * LegacyEntityBatchAllocate.ts's docblock) to throw partway through on
 * their `type===1` calls due to a real, permanently-null-field bug in
 * the original game -- caught by `f.ak()`'s already-modeled try/catch,
 * matching the original's own behavior exactly, not worked around.
 */
/** b.l(), used by both T()'s ai===37 and ai===38 branches. */
export function stepLegacyBL(rt: LegacyRuntimeState): void {
  runLegacyL({
    state: rt.denseState,
    // b-javap 49849 offset 23: `f.c(IZ)V` (#364), the record removal
    // (stepEntityRemoval) for records 1..60 -- not f.c(int). CORRECTED
    // 2026-09-29: rt cleared unit associations and removed nothing.
    onPrimaryStep: (id, flag) => rt.stepEntityRemoval(id, flag),
    onEntityCleanup: (id) => { rt.finalizeEntity(id); },
    // b.m(int) (#400) = entityDeathCleanup, ported 09-16; wired here 2026-09-27.
    onRecordMaintenance: (id) => rt.entityDeathCleanup(id),
    onAuxiliaryPass: (index) => rt.removeAnimal(index),
  });
}

/** b.m(), used by T()'s ai===45 branch. */
export function stepLegacyBM(rt: LegacyRuntimeState): void {
  runLegacyM({
    state: rt.denseState,
    onEntityCleanup: (id) => { rt.finalizeEntity(id); },
    // b.m(int) (#400) = entityDeathCleanup, ported 09-16; wired here 2026-09-27.
    onRecordMaintenance: (id) => rt.entityDeathCleanup(id),
    onAuxiliaryPass: (index) => rt.removeAnimal(index),
  });
}

/** Exact private void e(int,int,int) (bytecode/f-javap.txt offsets 0..75). */
export function stepLegacyE3(rt: LegacyRuntimeState, x: number, y: number, recordOffset: number): void {
  const dense = rt.denseState;
  dense[UNIT_TYPE + recordOffset] = 69;
  dense[UNIT_TARGET_X + recordOffset] = x;
  dense[UNIT_TARGET_Y + recordOffset] = y;
  dense[UNIT_ORDER + recordOffset] = 2;
  dense[UNIT_WORK_TARGET + recordOffset] = 0;
  dense[UNIT_FLAGS + recordOffset] = (dense[UNIT_FLAGS + recordOffset] ?? 0) & 191;
}

/** Exact private void d(int,int,int) (bytecode/f-javap.txt offsets 0..45). */
export function stepLegacyD3(rt: LegacyRuntimeState, x: number, y: number, indexFilter: number): void {
  for (let i = 0; i < rt.auxiliaryScratch.length; i += 1) {
    if (i === indexFilter || i >= 6) stepLegacyE3(rt, x, y, rt.auxiliaryScratch[i] ?? 0);
  }
}

/**
 * Exact private void O() (bytecode/f-javap.txt offsets 0..232), `S()`'s
 * `onO` callback (only invoked when `aPInt===1`). Composites
 * `Image[frameImageSlots[1]]` onto `Graphics[frameImageSlots[0]]` via
 * the SAME static blit helper #435 already fully decoded and ported as
 * `stepGameplayPaintComposite` -- a second, independent real caller of
 * that helper, confirming it's genuinely reused across the codebase
 * rather than a one-off. Then runs the SAME 20-slot `selectionFlags`
 * element-scan/fixed-sprite (524/528) shape `f.m()`
 * (`stepGameplayFramePrep`) already has -- but NOT the same underlying
 * data: `f.m()` reads `frameRecordInts` (f.c:[I] #264) and subtracts 8
 * from each entry; `O()` reads a DIFFERENT field, `f.d:[I]` (#275,
 * `oElementRecordInts`), with no adjustment. Confirmed distinct via
 * constant-pool index before reuse, not assumed.
 *
 * CONFIRMED (2026-08-24): both `frameRecordInts` and `oElementRecordInts`
 * were believed permanently null (RETRACTED 2026-09-07 -- they are not) in the original -- see `LegacyGameState.ts`'s own
 * docblocks and `docs/unknowns.md`'s 2026-08-24 entry. This method's own
 * `rt.game.oElementRecordInts[recordIndex] ?? 0` fallback intentionally
 * does not reproduce the real guaranteed-throw, same reasoning as `f.m()`.
 */
export function stepLegacyO(rt: LegacyRuntimeState): void {
  rt.game.frameImageSlots[8] = 0;
  rt.game.frameImageSlots[9] = 0;

  const graphics = rt.offscreenTargets?.graphics[rt.game.frameImageSlots[0] as 0 | 1 | 2 | 3];
  const image = rt.offscreenTargets?.images[rt.game.frameImageSlots[1] as 0 | 1 | 2 | 3];
  if (graphics && image) {
    try {
      graphics.drawRegion(image, 0, 0, 264, rt.game.selectionAInt, 0, 0, rt.game.selectionBb - rt.game.selectionAx, 0);
    } catch { /* a(Graphics,Image,...) (#435) catches the underlying draw exception. */ }
  }

  const base195 = rt.packedOffsets[195] ?? 0;
  for (let i = 0; i < 20; i += 1) {
    if (!rt.game.selectionFlags[i]) continue;
    rt.game.frameFlags[i] = true;

    // Offsets 84..109: a(i, 0, d[t195[i]]) -- drawn, not just traced
    // (until 2026-10-01 only the trace entry was pushed, so the pause
    // menu's copy of the gameplay screen had no top resource bar).
    const recordIndex = rt.packedBytes[base195 + i] ?? 0;
    const y = rt.game.oElementRecordInts[recordIndex] ?? 0;
    rt.framePrimitives.push([i, 0, y]);
    rt.drawFrameCommandPrimitive(i, 0, y);

    rt.game.targetSlot = rt.game.frameImageSlots[0] ?? 0;

    const marker = rt.packedBytes[base195 + 20 + i] ?? 0;
    if (marker === 1 && rt.game.screen !== 20) {
      drawPackedComposite(rt, 524, 0, rt.game.selectionBb);
    } else if (marker === 2) {
      drawPackedComposite(rt, 528, 0, 320 - rt.game.selectionBa);
    }
  }

  // Offsets 216..231: `c[9] = c[8] = 2` (dup_x2 stores 2 into both).
  rt.game.frameImageSlots[8] = 2;
  rt.game.frameImageSlots[9] = 2;
}

/**
 * Exact private void l(int) (bytecode/f-javap.txt offsets 0..376), a thin
 * runtime adapter around the already-ported, already-tested pure function
 * `stepLegacyZL`. Reuses `selectionFlags`/`frameFlags` for the
 * bytecode's `a:[Z`(#123)/`b:[Z`(#234) -- confirmed the same fields via
 * constant-pool index cross-check. CORRECTION (2026-09-02): rt used
 * to target a separate `selectionMirrorFlags` array that was never
 * read by anything downstream (a duplicate of `frameFlags` for the
 * same real field) -- see `docs/unknowns.md`'s 2026-09-02 entry.
 *
 * CORRECTION (2026-08-22): `onFourFlagReset`/`onNineFlagReset` used to be
 * left unwired -- rt call site passed no callbacks object at all. Both
 * are the same `a(ZZZZ)`/`a(ZZZZZZZZZ)` overloads already ported as
 * `runSelectionFlagsRefresh`, reused at ~10 other call sites; wired here
 * too. `onAh` was wired on 2026-10-09 (see the call); the note below is the old reasoning -- lowercase
 * `ah()` itself is no longer a mystery (`LegacyZAh.ts`/`stepLegacyZAh`,
 * fully derived and safely wired at `stepGameplayZAe`'s own, NON-nested
 * `onAh` call site), but wiring it HERE would create a genuinely new,
 * directly self-recursive path rt codebase has never exercised before:
 * `stepLegacyL(-1)` -> `onAh` -> `stepLegacyZAh` -> (`state.w===4`) ->
 * `onL(-1)` -> `stepLegacyL(-1)` again, with `zlXByte`/`cSInt`/`kFlag`
 * (the three values that decide whether that inner call re-triggers
 * `onAh` and hits `w===4` again) all left completely unmutated by the
 * `w===4` branch itself. Whether the real game ever reaches a state
 * where rt chain terminates (some external write between iterations)
 * or whether `zlXByte===4 && cSInt===100 && kFlag===false` is simply
 * unreachable together is unproven -- porting rt specific call blind
 * risks a real stack-overflow bug, so it stays a documented no-op.
 * `onEntityMode` (2026-08-24): its real consumer, `final void
 * c(int, boolean)` (#555, offset 29630), is now fully ported --
 * `stepEntityRemoval` above -- and wired here, arg2 always `true`.
 */
export function stepLegacyL(rt: LegacyRuntimeState, value: number): void {
  const g = rt.game;
  // Scalars live: onEntityMode's stepEntityRemoval writes w and P itself.
  const state: LegacyZLState = Object.assign(
    liveView<Pick<LegacyZLState, "q" | "w" | "x" | "Y" | "s" | "P" | "M" | "O">>(g, {
      q: "qCounter", w: "barMode", x: "zlXByte", Y: "zlYInt", s: "cSInt", P: "pendingP", M: "xMFlag", O: "xOFlag",
    }),
    { d: g.zlDShorts, k: g.zlKBytes, flags: g.selectionFlags, bFlags: g.frameFlags, cSnapshot: g.zlFlagSnapshot },
  );
  stepLegacyZL(state, value, {
    onFourFlagReset: (a, b, c, d) => rt.runSelectionFlagsRefresh(a, b, c, d),
    onNineFlagReset: (a, b, c, d, e, f, h, i, j) => rt.runSelectionFlagsRefresh(a, b, c, d, e, f, h, i, j),
    onEntityMode: (id) => rt.stepEntityRemoval(id, true),
    // f.l(int) offset 350: ah() after a CALL TO ARMS / FORM UP place (s == 100). WIRED
    // 2026-10-09 (oracle run 6, frame 18861): without it w stayed at the saved x (2, the
    // unit bar) instead of ah()'s 0/1. ah() re-enters l(-1) only when w == 4, where the
    // original would recurse the same way.
    onAh: () => rt.stepZAh(),
  });
}

/**
 * Exact private void X() (bytecode/f-javap.txt offsets 0..484). Its only
 * confirmed real caller is `V()`'s `wByte===3` branch (offsets 261..273
 * of `private void V()`), wired via `stepLegacyGameplayInput`'s
 * `onXDispatch` callback (2026-08-18). Gated on `cRFlag` (r:Z #359) --
 * its real producer is `stepLegacyC2`'s (`private void c(int,int)`) own
 * `wByte===3` branch, ALREADY wired via `onC` in `stepGameplayFramePrep`
 * (found 2026-08-18 while tracing rt exact gate: `cRFlag` was
 * originally duplicated under a fresh `xTriggerFlag` name before the two
 * methods' fields were merged -- see `LegacyGameState.ts`'s docblock on
 * `cRFlag` for the full self-caught-bug writeup). So `stepLegacyX()` is
 * now reachable AND its gate is populated by real gameplay state, not
 * just wired-but-inert.
 *
 * Four branches on `cSInt` (s:I #364): `===100` (branch A -- two
 * conditional calls into class b's own no-arg `b()`, a genuinely
 * tangential ~250-instruction loop over team slots 1..50, left a
 * documented no-op matching rt session's convention for the
 * c(int,int)/O() class-c calls), `<0` (branch B, dense-state writes),
 * `0..3` (branch C, a linear scan over `xSlotTable`/`b:[[[B` #237 that
 * either reuses an empty slot or, when the value being written is
 * exactly 3, treats it as a real "spawn" and calls `l(-1)`), and the
 * default/else (branch D -- an in-bounds check via the original's
 * private `b(int,int):boolean` #533, then a real `placeEntity()` call).
 */
/**
 * Smart Villager Auto-Displace:
 * If friendly villagers are inside the building footprint when placing,
 * smoothly nudges them to the nearest safe, free, walkable tile adjacent to the building.
 */
function displaceVillagersFromFootprint(
  rt: LegacyRuntimeState,
  fx: number,
  fy: number,
  width: number,
  height: number,
): void {
  const g = rt.game;
  const dense = rt.denseState;

  for (let cy = fy; cy < fy + height; cy += 1) {
    for (let cx = fx; cx < fx + width; cx += 1) {
      const vid = rt.gridC[cy]?.[cx] ?? 0;
      if (vid >= 1 && vid <= 50) {
        let safeX = -1;
        let safeY = -1;
        let bestDist = Infinity;

        for (let r = 1; r <= 6; r += 1) {
          for (let dy = -r; dy <= r; dy += 1) {
            for (let dx = -r; dx <= r; dx += 1) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= fx && nx < fx + width && ny >= fy && ny < fy + height) continue;
              if (nx < 0 || ny < 0 || nx >= g.mapWidth || ny >= g.mapHeight) continue;
              if ((rt.gridC[ny]?.[nx] ?? -1) !== 0) continue;
              if (rt.occupancyClass(nx, ny) === 2) continue;

              const dist = dx * dx + dy * dy;
              if (dist < bestDist) {
                bestDist = dist;
                safeX = nx;
                safeY = ny;
              }
            }
          }
          if (safeX !== -1) break;
        }

        if (safeX !== -1) {
          rt.gridC[cy][cx] = 0;
          rt.gridC[safeY][safeX] = vid;
          dense[UNIT_X + vid] = safeX;
          dense[UNIT_Y + vid] = safeY;
          dense[UNIT_TARGET_X + vid] = safeX;
          dense[UNIT_TARGET_Y + vid] = safeY;
          dense[UNIT_HOME_X + vid] = safeX;
          dense[UNIT_HOME_Y + vid] = safeY;
        }
      }
    }
  }
}

export function stepLegacyX(rt: LegacyRuntimeState): void {
  const g = rt.game;
  const dense = rt.denseState;
  if (!g.cRFlag) return;

  if (g.cSInt === 100) {
    if (g.xOFlag) {
      g.callToArmsActive = g.xOFlag;
      g.xMFlag = false;
      g.formUpActive = false;
      rt.subsystemBTeamSweep();
    } else if (g.xMFlag) {
      g.formUpActive = g.xMFlag;
      rt.subsystemBTeamSweep();
    }
    g.outerLoopRowEndMarker[0] = g.cameraColumn + g.cursorColumn;
    g.outerLoopRowEndMarker[1] = g.cameraRow + g.cursorRow;
    rt.stepLegacyL(-1);
    return;
  }

  if (g.cSInt < 0) {
    dense[UNIT_TARGET_X + g.cRInt] = dense[BLD_X + g.qCounter] ?? 0;
    dense[UNIT_TARGET_Y + g.cRInt] = dense[BLD_Y + g.qCounter] ?? 0;
    dense[UNIT_TYPE + g.cRInt] = 43 - g.cSInt;
    dense[UNIT_ORDER + g.cRInt] = 3;
    return;
  }

  if (g.cSInt <= 3) {
    g.xNByte = 0;
    while (g.xNByte < 29 && (g.xSlotTable[0]?.[0]?.[g.xNByte] ?? 0) !== 0) {
      g.xNByte += 1;
    }
    const row0 = g.xSlotTable[0];
    if (!row0) return;
    row0[1]![g.xNByte] = g.cSInt;
    if (row0[1]![g.xNByte] === 3) {
      row0[0]![g.xNByte] = g.qCounter;
      row0[2]![g.xNByte] = g.cameraColumn + g.cursorColumn;
      row0[3]![g.xNByte] = g.cameraRow + g.cursorRow;
      rt.stepLegacyL(-1);
      return;
    }
    if (classifyLegacyPositiveEntity(g.cRInt) !== 0) return;
    row0[0]![g.xNByte] = g.qCounter;
    row0[2]![g.xNByte] = g.cRInt;
    return;
  }

  const x = g.cameraColumn + g.cTInt;
  const y = g.cameraRow + g.cUInt;
  if (!(x >= 0 && y >= 0 && x < g.mapWidth && y < g.mapHeight)) return;
  const tableBase = rt.packedOffsets[T_BUILDING] ?? 0;
  const width = rt.packedBytes[tableBase + 104 + g.cSInt] ?? 1;
  const height = rt.packedBytes[tableBase + 130 + g.cSInt] ?? 1;
  displaceVillagersFromFootprint(rt, x, y, width, height);
  const placementOptions = rt.buildingPlacementOptions();
  const placed = rt.placeEntity(rt.gridC, 0, g.cSInt, x, y, 1, false, -1, placementOptions);
  if (placed <= 0) return;
  rt.stepLegacyL(-1);
  g.barMode = 2;
}

/**
 * Exact private void d(byte) (bytecode/f-javap.txt offsets 0..123), one
 * of `V()`'s movement/target dispatch targets. A second tap within the
 * n:I cooldown sets the window to the viewport and runs aF() (offset 60),
 * selecting every unit on screen -- wired 2026-09-23 (was an inert no-op).
 */
export function stepLegacyD(rt: LegacyRuntimeState, arg: number): void {
  const g = rt.game;
  if (g.nInt > 1) {
    g.nInt = 0;
    g.BCounter = g.cameraColumn - 1;
    g.CCounter = g.cameraRow - 1;
    g.DCounter = g.viewColumns;
    g.ECounter = g.viewRows;
    g.boxSelecting = true;
    g.inputT = true; // t:Z (#367)
    rt.selectWindowUnits(); // aF(), offset 60
    rt.runSelectionFlagsRefresh(true, true, false, false);
    g.selectedId = 0;
    g.kByte = 0;
    return;
  }
  if ((rt.denseState[UNIT_HP + arg] ?? 0) > 0) {
    rt.runSelectionFlagsRefresh(false, true, false, true);
    g.barMode = 1;
    g.selectedId = arg;
    g.kByte = arg;
    g.selectionGroup = -1;
  }
}

/**
 * Exact private void e(byte) (bytecode/f-javap.txt offsets 0..69). Loops
 * `mainArrays.aByte[FByte]` when `FByte!==-1`, else dispatches once using
 * `kByte`.
 *
 * CORRECTION (2026-08-24): was `game.teamEntitySlots`, a disconnected
 * duplicate of rt SAME field (`f.a:[[B]`#130, confirmed via rt
 * method's own bytecode read, offset 17) -- `teamEntitySlots` had no
 * real writer anywhere (its own docblock said "producer untraced"),
 * while `mainArrays.aByte` is the field's live, already-established
 * identity (`docs/code-mapping.md`'s `f.aa()` row, confirmed via exact
 * constructor allocation size). This was a real, currently-live bug:
 * `stepLegacyE`'s `FByte!==-1` loop always saw zeros and never
 * dispatched anything for a selected formation's armed units.
 */
export function stepLegacyE(rt: LegacyRuntimeState, arg: number): void {
  const g = rt.game;
  if (g.selectionGroup !== -1) {
    const row = rt.mainArrays.aByte[g.selectionGroup];
    if (row) {
      for (let id = 0; id < 50; id += 1) {
        const value = row[id] ?? 0;
        if (value > 0) rt.stepLegacyA2(value, arg);
      }
    }
  } else {
    rt.stepLegacyA2(g.kByte, arg);
  }
  g.nInt = 0;
}

/**
 * Exact private void a(byte,byte) (bytecode/f-javap.txt offsets 0..622),
 * `e(byte)`'s own dispatch target -- `target` is `local_1` (an id read
 * out of `teamEntitySlots`/`kByte`, NOT a loop counter), `source` is
 * `local_2` (`e(byte)`'s own `arg`).
 *
 * `b.a(byte,int,int)` (f-side pool #468, b-side #274) is WIRED as of
 * 2026-09-10. The 2026-08-22 note that replaced it -- "CONFIRMED a
 * guaranteed-throw past its two real guards ... class b's own
 * `short[] d`(#152) has ZERO `putfield` sites anywhere in the class" --
 * is RETRACTED. `f.g()` allocates it (`f-javap.txt:1329`,
 * `bipush 6; newarray short; putfield #273 // Field b.d:[S`), and class
 * b's own `a(f)` then fills it with -1 at its offsets 209..238, which
 * would itself have thrown if the field were really null. It is rt
 * port's `LegacySubsystemArrays.dShort`.
 *
 * The method was ALREADY fully ported under the same retraction on
 * 2026-09-07 (`LegacyEntityMoveTrigger.ts`, `triggerLegacyEntityMove`,
 * already wired at three other call sites), so rt site just calls it.
 * The stale `LegacySubsystemBFootprintGate.ts` -- a second, partial port
 * of the SAME method (#274) that only implemented the two guards and
 * stopped at the "guaranteed throw" -- had no call site at all and has
 * been deleted rather than left as a second source of truth.
 * `b.b(int):byte` (#543, ~94 instructions) is now fully ported
 * (`LegacySubsystemBClassify.ts`) and wired below for its
 * `dense[7777+target]` side effect -- the original discards its return
 * value, so rt port does too.
 * `Z()` (#428) IS wired, via `stepFrameSelectionTransition()` -- found
 * 2026-08-18 that an earlier pass here had wrongly trusted a stale
 * "unopened" comment elsewhere in rt codebase and left it a no-op;
 * `Z()` was actually already fully ported (`LegacyZTransition.ts`) AND
 * already wired at a completely different real call site (`f.W()`'s own
 * Z-command dispatch, `stepLegacyGameplayCommand`'s `onZ`). Since `Z()`
 * is parameterless and operates purely on persistent instance state,
 * rt call site reuses that SAME already-wired method directly rather
 * than duplicating its (substantial) field/callback wiring. See
 * `docs/unknowns.md`'s "Z() cluster wiring" entry for the full
 * writeup of that correction.
 */
export function stepLegacyA2(rt: LegacyRuntimeState, target: number, source: number): void {
  const g = rt.game;
  const dense = rt.denseState;

  // f.a(byte,byte) offsets 0..56. BUG FIX (2026-09-10): rt condition was
  // `... && (N || (L && (dense[7979+target] & 64) === 0))`. The bytecode is
  // `getfield N:Z; ifne 57` (skip when N is SET) then `getfield L:Z;
  // ifeq 45` (call when L is CLEAR) then `(dense[7979+target] & 64); ifne
  // 57`, i.e. `!N && (!L || (dense[7979+target] & 64) === 0)`.
  if (
    (dense[UNIT_HAPPINESS + target] ?? 0) < 10 &&
    !g.callToArmsActive &&
    (!g.formUpActive || ((dense[UNIT_FLAGS + target] ?? 0) & 64) === 0)
  ) {
    // Offset 45..56: `b.a(12, target, 0); return;`
    rt.entityMove(12, target, 0);
    return;
  }

  if (classifyLegacyNegativeEntity(source) === 0 && (dense[BLD_KIND - source] ?? 0) === 6) {
    rt.runSelectionFlagsRefresh(true, false, true, false);
    g.qCounter = -source;
    g.barMode = 2;
    rt.stepFrameSelectionTransition();
    return;
  }

  // Offsets 104..156: a double tap (n:I > 1) or re-ordering the same cell.
  // FIXED 2026-10-08: was `n <= 1 || same`, and q:Z was set on every order
  // (offset 157 sets it on rt branch only).
  const samePosition = g.nInt > 1
    || ((dense[UNIT_TARGET_X + target] ?? 0) === g.cursorColumn + g.cameraColumn && (dense[UNIT_TARGET_Y + target] ?? 0) === g.cursorRow + g.cameraRow);

  const packedOffsetsBase = (nibbleBase: number) => {
    const nibble = (dense[UNIT_DIRECTION + target] ?? 0) & 1;
    const v1 = rt.packedOffsets[nibbleBase + nibble * 2] ?? 0;
    const v2 = rt.packedOffsets[nibbleBase + nibble * 2 + 1] ?? 0;
    const inner = rt.packedBytes[v2 + (dense[UNIT_SPEED + target] ?? 0) - 5] ?? 0;
    const outer = rt.packedBytes[v1 + inner + ((dense[1111 + target] ?? 0) & 15)] ?? 0;
    return ((dense[1111 + target] ?? 0) & 240) + outer;
  };

  if (samePosition) {
    g.cQFlag = true;
    if ((dense[7777 + target] ?? 0) === 0) {
      dense[7777 + target] = 3;
      classifyLegacySubsystemB({ dense, id: target });
      // Real bytecode re-checks dense[7777+target] after b.b()'s call
      // (offset 194..204) -- several of its branches reset that field
      // back to 0, in which case the packedOffsetsBase(129) write below
      // never happens.
      if ((dense[7777 + target] ?? 0) > 0) {
        dense[1111 + target] = packedOffsetsBase(129);
      }
    }
  } else if ((dense[7777 + target] ?? 0) > 0) {
    dense[1111 + target] = packedOffsetsBase(133);
    dense[7777 + target] = 0;
  }

  dense[UNIT_TARGET_X + target] = g.cursorColumn + g.cameraColumn;
  dense[UNIT_TARGET_Y + target] = g.cursorRow + g.cameraRow;
  dense[UNIT_FLAGS + target] = (dense[UNIT_FLAGS + target] ?? 0) & 223;
  dense[UNIT_ORDER + target] = 2;
  dense[UNIT_WORK_TARGET + target] = source;
  g.cAbByte = g.cursorColumn + g.cameraColumn;
  g.cAcByte = g.cursorRow + g.cameraRow;

  const checksOccupancy = classifyLegacyPositiveEntity(source) === 1
    || classifyLegacyNegativeEntity(source) === 1
    || isLegacyEntityIdInRange101to122(source);
  if (checksOccupancy && rt.occupancyClass(g.cursorColumn + g.cameraColumn, g.cursorRow + g.cameraRow) === 0) {
    g.cAaByte = 2;
  } else {
    g.cAaByte = 1;
  }
}

/**
 * Exact private void f(byte) (bytecode/f-javap.txt offsets 0..81).
 * `Z()` wired via `stepFrameSelectionTransition()`, same reasoning as
 * `stepLegacyA2`'s docblock.
 */
export function stepLegacyF(rt: LegacyRuntimeState, arg: number): void {
  const g = rt.game;
  const dense = rt.denseState;
  if ((dense[BLD_KIND + arg] ?? 0) === 3 && (dense[UNIT_RECORD + (rt.mainArrays.aShort[0]?.[17] ?? 0)] ?? 0) !== arg) {
    rt.mainArrays.r[0] = 0;
    g.menuCursor = 0;
    rt.stepLegacyL(4);
    return;
  }
  rt.runSelectionFlagsRefresh(true, false, true, false);
  g.qCounter = arg;
  g.barMode = 2;
  g.kByte = 0;
  rt.stepFrameSelectionTransition();
}

/**
 * Exact `private void a(byte,byte,byte,byte)` (constant pool #433) --
 * factored out of `stepByteActionQueueMaintenance` (2026-08-18) so
 * `placeEntity`'s own call to the SAME method (`onTeamZeroReset`,
 * `type=5` -- confirmed via direct bytecode read of `placeEntity`
 * offset 1098..1106: `iconst_5; iload_3(x); i2b; iload 4(y); i2b;
 * iconst_0; invokevirtual #433`) can share it instead of duplicating
 * the state setup/write-back.
 */
export function runByteActionQueue(rt: LegacyRuntimeState, type: number, x: number, y: number, value: number): void {
  const state = {
    c: rt.game.missionFrame,
    u: rt.game.uByte,
    ay: rt.game.ayByte,
    uBytes: rt.mainArrays.uBytes,
    kMatrix: rt.mainArrays.kMatrix,
    gCounters: rt.mainArrays.gCounters,
    selectionFlags: rt.game.selectionFlags,
    // f.a(ZZZZ) is a proven callback boundary.
    onSelectionRefresh: (first: boolean, second: boolean, third: boolean, fourth: boolean) => {
      rt.runSelectionFlagsRefresh(first, second, third, fourth);
    },
    onQueued: rt.onMessage,
  };
  stepLegacyByteActionQueue(state, type, x, y, value);
  // The helper mutates the queue arrays in place; ay is the only scalar
  // result of rt call, so mirror it back to the live f field.
  rt.game.ayByte = state.ay;
}
