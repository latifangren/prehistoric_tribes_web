import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import type { Graphics } from "../platform/Graphics";
import { emitLegacyCRenderRow, type LegacyCDrawCommand } from "../text/LegacyCComposition";
import { stepLegacyZSubrecordDraw, type LegacyZSubrecordDrawCallbacks } from "./LegacyZSubrecordDraw";
import { drawLegacyPackedSpritePrimitive, type LegacyPackedSpritePrimitiveCallbacks } from "./LegacyPackedSpritePrimitive";
import { LegacyPackedSpriteRenderer } from "./LegacyPackedSpriteRenderer";
import { prepareLegacyImageHelperInvocation } from "./LegacyImageHelperInvocation";
import { LEGACY_DEFAULT_MAP_VIEWPORT, type LegacyMapViewport } from "./LegacyMapRenderer";
import { classifyLegacyCameraCell } from "./LegacyCameraFrame";
import { stepCameraFrame } from "./CameraRuntime";
import { classifyLegacyPositiveEntity, isLegacyEntityIdInRange101to122, isLegacyMarkerIdInRangeMinus110to61 } from "./LegacyEntityClassifiers";
import { stepLegacyMapMarkerDetail } from "./LegacyMapMarkerDetail";
import { stepLegacyGameplayFramePrep, type LegacyGameplayFramePrepState } from "./LegacyGameplayFramePrep";
import { BLD_KIND, RES_KIND, UNIT_AGE, UNIT_FLAGS, UNIT_Y } from "../core/DenseLayout";
import { T_BUILDING } from "../core/DataTables";
/**
 * LegacyRuntimeState wiring moved out of the class (phase 2 step 3): each function is the former
 * method of the same name, with `this` as the `rt` parameter.
 */

/** Emit the exact c.a(Graphics,int) drawRegion commands for one row window. */
export function renderCRow(rt: LegacyRuntimeState, rowStart: number, onDraw?: (command: LegacyCDrawCommand) => void): LegacyCDrawCommand[] {
  return emitLegacyCRenderRow(rt.cComposition, rt.packedBytes, rt.packedOffsets, rt.resourceTables.byteViews, rt.imageGroups[0], rowStart, onDraw, rt.setDialogueEdges, rt.cRenderExtras());
}

/** Resolve the proven f.d(IIII) subrecord and expose its f.a(III) boundary. */
export function stepZSubrecordDraw(rt: LegacyRuntimeState, index: number, x: number, y: number, phase: number, callbacks: LegacyZSubrecordDrawCallbacks = {}): void {
  const data = rt.packedData;
  if (!data) throw new Error("Packed /pd0 data is not loaded");
  stepLegacyZSubrecordDraw({ shortRows: data.shortTables, byteRows: data.byteTables }, index, x, y, phase, callbacks);
}

/** Execute the proven private f.b(III) image/primitive branch. */
/**
 * f.b(int,int,int) (#535). This project ports that method TWICE:
 * `LegacyPackedSpritePrimitive.ts` decodes it into callbacks, and
 * `LegacyPackedSpriteRenderer.ts`'s `drawSprite` renders it against a bound
 * Graphics. The renderer is the one that actually puts pixels anywhere.
 *
 * BUG FIX (2026-09-09): rt method only called the callback-decoding port,
 * and EVERY call site in the codebase (O()'s two HUD bars at 524/528, the
 * four `onSpriteRecord` seams, and the entity-overlay site) passes no
 * callbacks -- so `f.b(int,int,int)` drew nothing, anywhere, ever. Found
 * while chasing the empty HUD: O() computes
 * `drawPackedSpritePrimitive(524, 0, 22)` and `(528, 0, 310)` with
 * targetSlot 0, which is exactly the two bars paint()'s v==1 tail then blits
 * from offscreen image 0 -- and offscreen 0 stayed blank because these two
 * calls emitted nothing.
 *
 * Now renders through the same `Graphics[N:B] == graphics[targetSlot]` the
 * original writes to, and still runs the decoder so existing callback
 * consumers keep their trace.
 */
/**
 * a(int,int,int) (#439) into Graphics[N:B]. c(int,int)'s d(IIII) frames and
 * its offset-762 item icon are composites; until 2026-10-01 they went
 * through drawPackedSpritePrimitive (b(III)), so the placement cursor's
 * "!" / arrow drew one stray 8x5 piece.
 */
export function drawPackedComposite(rt: LegacyRuntimeState, record: number, x: number, y: number): void {
  const data = rt.packedData;
  const graphics = rt.offscreenTargets?.graphics[rt.game.targetSlot as 0 | 1 | 2 | 3];
  if (!data || !graphics) return;
  new LegacyPackedSpriteRenderer({
    shortTables: data.shortTables,
    byteTables: data.byteTables,
    imageGroups: rt.imageGroups,
    graphics,
  }).drawComposite(record, x, y);
}

export function drawPackedSpritePrimitive(rt: LegacyRuntimeState, id: number, x: number, y: number, typeOverride = -1, callbacks: LegacyPackedSpritePrimitiveCallbacks = {}): void {
  const data = rt.packedData;
  if (!data) throw new Error("Packed /pd0 data is not loaded");
  drawLegacyPackedSpritePrimitive({ byteRows: data.byteTables, colorRows: data.byteTables, typeOverride }, id, x, y, callbacks);
  const graphics = rt.offscreenTargets?.graphics[rt.game.targetSlot as 0 | 1 | 2 | 3];
  if (!graphics) return;
  new LegacyPackedSpriteRenderer({
    shortTables: data.shortTables,
    byteTables: data.byteTables,
    imageGroups: rt.imageGroups,
    graphics,
  }).drawSprite(id, x, y);
}

/**
 * Exact private void c(int,int) (bytecode/f-javap.txt offsets 0..966),
 * `f.m()`'s cursor/selection-overlay method, called twice per frame for
 * viewport translation. Composed almost entirely from already-ported
 * pieces found while tracing rt: the 4 static classifiers
 * (`classifyLegacyPositiveEntity`/`classifyLegacyCameraCell`/
 * `isLegacyEntityIdInRange101to122`/`isLegacyMarkerIdInRangeMinus110to61`,
 * all already in `LegacyEntityClassifiers.ts`/`LegacyCameraFrame.ts`) and
 * `f.d(int,int,int,int)` (`stepZSubrecordDraw`, already used extensively
 * elsewhere).
 *
 * CORRECTION (2026-08-24): the `local5>0`/`cACInt>0`-gated calls to
 * `c.a(int,int,int,String,int)` (#451) and `c.a(Graphics)` (#452) were
 * previously characterized as "cosmetic debug text, not gameplay state"
 * and left as no-ops. That was wrong on two counts: (1) both methods
 * were ALREADY fully ported, as `LegacyGeometryDecoder.queueTextWithWidth`
 * (#451) and `LegacyGeometryRenderer.emit`/`renderTo` (#452) -- the same
 * machinery the menu "Z scan" text already uses (`rt.geometry`/
 * `rt.geometryRenderer`) -- so wiring them needed no new port at all;
 * (2) `javap -v`'s real constant pool shows string #665 is empty (""),
 * so the drawn text is just the plain decimal number, not a "STR"-
 * prefixed debug label -- rt is a genuine numeric HUD overlay (a
 * count, drawn at the cursor position). The `local5>0` branch is now
 * wired below: `local5` (an armed/occupied-slot count for the selected
 * formation, `g.selectionGroup`) is already computed earlier in rt method, so
 * it has no further dependency. The `cACInt`/`f.aC:I`(#151) branch
 * draws the box count: its producer is a DIFFERENT,
 * method, `private boolean a()`
 * (`bytecode/f-javap.txt` offsets 0..275, starting at that file's line
 * 5394 -- not `p()`, an earlier misattribution caught while re-deriving
 * rt), which scans the camera-visible `gridC` cells for a per-type
 * gate (`e[1919+cellType]>0`) and also sets `ax:I` (since ported in
 * LegacySpriteLayerPredicates.ts); the branch is wired since 2026-10-16. The `a(1000+s+1,2)`
 * building ghost (offset 518) is wired since 2026-10-01 through
 * `drawImageHelper`: its >= 1000 arm takes its origin from S:I/T:I, not
 * ah/ai, so the earlier objection did not apply.
 */
/** Ported from upstream BOMBWCC 3b37af1: in touch play the action icon at the cursor (its sub-record, 0 none) is drawn by the HUD instead, centred on the cursor's tile and larger (user, 2026-10-26), not beside the hand. A module object, not runtime state: the wide view's state snapshot does not undo it. */
export const touchAction = { icon: 0 };

export function stepLegacyC2(rt: LegacyRuntimeState, arg1: number, arg2: number, touchCursor = false): void {
  const g = rt.game;
  const dense = rt.denseState;

  if (g.cAaByte !== 0) {
    rt.stepZSubrecordDraw(
      34 + g.cAaByte,
      (g.cAbByte - g.cameraColumn) * 22,
      (g.cAcByte - g.cameraRow) * 16,
      g.animStep,
      { onSpriteRecord: (record, x, y) => drawPackedComposite(rt, record, x, y) },
    );
    if (g.animStep === 5) g.cAaByte = 0;
  }

  const local4 = rt.gridC[g.cameraRow + g.cursorRow]?.[g.cameraColumn + g.cursorColumn] ?? 0;
  let local3 = 32;

  if (g.barMode !== 2) {
    let local5 = -1;

    if (g.barMode === 1) {
      if (g.kByte !== 0) {
        local5 = 1;
      } else if (g.selectionGroup !== -1) {
        local5 = 0;
        for (let i = 0; i < 50; i += 1) {
          if ((rt.mainArrays.aByte[g.selectionGroup]?.[i] ?? 0) !== 0) local5 += 1;
        }
      }
      if (g.outerLoopZByte !== 0) {
        local3 = 33;
      } else {
        const accept =
          classifyLegacyCameraCell(local4) === 1 ||
          isLegacyEntityIdInRange101to122(local4) ||
          (classifyLegacyPositiveEntity(local4) === 1 && ((dense[UNIT_FLAGS + local4] ?? 0) & 2) === 0);
        local3 = accept ? 34 : 33;
      }
    } else if (g.barMode === 3) {
      if (g.cSInt === 100) {
        g.cRFlag = true;
        local3 = 105;
      } else if (g.cSInt <= 3) {
        // Offset 260 `iflt 271`: a negative s (a building order) takes rt branch too.
        // Reach the r:I=W assignment (offset 323) when EITHER (a) local4
        // classifies as team-0-range AND e[1414+local4]>=12 (direct
        // jump at offset 292), OR (b) that's false but W:B ALSO
        // classifies as team-0-range AND e[1414+W]>=12 (falls through
        // the offset 295..320 check instead). Re-verified against the
        // exact bytecode after an initial transcription had rt
        // condition inverted.
        const local4Accepts = classifyLegacyPositiveEntity(local4) === 0 && (dense[UNIT_AGE + local4] ?? 0) >= 12;
        const wAccepts = classifyLegacyPositiveEntity(g.hoverUnit) === 0 && (dense[UNIT_AGE + g.hoverUnit] ?? 0) >= 12;
        if (local4Accepts || wAccepts) {
          g.cRInt = g.hoverUnit;
          g.cTInt = dense[0 + g.cRInt] ?? 0;
          g.cUInt = dense[UNIT_Y + g.cRInt] ?? 0;
          g.cRFlag = true;
          local3 = 33;
        } else if (g.cSInt === 3) {
          g.cRFlag = true;
          local3 = 33;
        } else {
          g.cRFlag = false;
          local3 = 32;
        }
      } else {
        // Offsets 400..566, still inside `w == 3` (s > 3 at offset 268).
        // CORRECTED 2026-09-15: rt block hung off `w != 1 && w != 3`, so a
        // building cursor never set r:Z.
        const local6 = rt.packedBytes[(rt.packedOffsets[T_BUILDING] ?? 0) + 104 + g.cSInt] ?? 0;
        const local7 = rt.packedBytes[(rt.packedOffsets[T_BUILDING] ?? 0) + 130 + g.cSInt] ?? 0;
        g.cTInt = g.cursorColumn - Math.trunc(local6 / 2);
        g.cUInt = g.cursorRow - Math.trunc(local7 / 2);
        // Offsets 473..518: S:I/T:I (#98/#101, projectionS/T -- a twin
        // cSViewportX/cTViewportY pair was merged 2026-10-01), then the
        // building ghost a(1000 + s + 1, 2), which was deferred until then.
        g.projectionS = arg1 - Math.trunc(local6 / 2) * 22;
        g.projectionT = arg2 - Math.trunc(local7 / 2) * 16 - 5 + g.animStep;
        drawImageHelper(rt, 1000 + g.cSInt + 1, 2, g.projectionS, g.projectionT);
        // a(int,int,int,boolean):boolean (#450) is canPlaceLegacyFootprint.
        const accepted = rt.canPlaceFootprint(rt.gridC, g.cameraColumn + g.cTInt, g.cameraRow + g.cUInt, g.cSInt, true);
        g.cRFlag = accepted;
        local3 = accepted ? 41 : 40;
      }
    }

    if (g.cEFlag && g.animStep < 2 && local3 <= 34) local3 += 5;
    // `touchCursor` is not in the original (phase 3, the larger view for touch play): no hand
    // outside building placement -- only the action icon and the count stay.
    if (!touchCursor || g.barMode === 3) {
      rt.stepZSubrecordDraw(local3, arg1, arg2, g.animStep, {
        onSpriteRecord: (record, x, y) => drawPackedComposite(rt, record, x, y),
      });
    }
    // local5-gated numeric overlay: c.a(x+22,y+8,0,String(local5),1) then
    // c.a(Graphics[N:B]) -- see docblock above, CORRECTED 2026-08-24.
    // local5 is already computed above (armed/occupied-slot count for the
    // selected formation), so rt needs no new dependency.
    if (local5 > 0) {
      const graphics = rt.offscreenTargets?.graphics[rt.game.targetSlot];
      if (graphics) {
        rt.geometry.queueTextWithWidth(arg1 + 22, arg2 + 8, 0, String(local5), 1);
        rt.geometryRenderer.renderTo(graphics, rt.imageGroups[0]!);
        // c.a(Graphics)'s tail (offset 624) sets a:B = 0. Missing here and in
        // the 1010 slot counts until 2026-10-10 (oracle run 8, frame 11645):
        // rows piled up until row 13 spilled into the floating-text ring.
        rt.geometry.reset();
      }
    }
    // Offsets 662..721: the same overlay with aC:I, the unit count f.a()Z leaves for the box
    // being dragged (the "2" next to the cursor). Unwired until 2026-10-16 (screenshot diff).
    if (g.boxUnitCount > 0) {
      const graphics = rt.offscreenTargets?.graphics[rt.game.targetSlot];
      if (graphics) {
        rt.geometry.queueTextWithWidth(arg1 + 22, arg2 + 8, 0, String(g.boxUnitCount), 1);
        rt.geometryRenderer.renderTo(graphics, rt.imageGroups[0]!);
        rt.geometry.reset();
      }
    }

    if (g.barMode === 3) {
      if (g.cSInt < 0) {
        drawPackedComposite(rt, 659 - g.cSInt - 1, arg1 + 11 + 5, arg2 + 8 + 5);
      } else if (g.cSInt <= 3) {
        rt.stepZSubrecordDraw(g.cSInt + 48, arg1, arg2, g.animStep, {
          onSpriteRecord: (record, x, y) => drawPackedComposite(rt, record, x, y),
        });
      }
    }
  }

  // offset 793: w===2 jumps directly here too.
  local3 = 0;
  if (g.barMode === 1) {
    if (g.cQFlag && g.cAaByte !== 0) {
      local3 = 47;
      g.outerLoopZByte = 0;
    } else if (local4 === -124) {
      local3 = 44;
    } else if (local4 === -125) {
      local3 = 45;
    } else if (classifyLegacyCameraCell(local4) === 0) {
      if ((dense[BLD_KIND - local4] ?? 0) !== 10) local3 = 41;
    } else if (isLegacyMarkerIdInRangeMinus110to61(local4)) {
      local3 = (dense[RES_KIND + (local4 + 61) * -1] ?? 0) === 7 ? 46 : 43;
    } else if (isLegacyEntityIdInRange101to122(local4)) {
      if (g.outerLoopZByte === 0) local3 = 43;
    }
  }
  // Touch play without the hand: villagers selected and no action icon (plain ground) shows the
  // original's four inward arrows (sub-record 35) where they will go.
  const ownUnit = (id: number) => id >= 1 && id <= 50;
  if (touchCursor && local3 === 0 && g.barMode === 1 && !ownUnit(local4) && !ownUnit(g.hoverUnit)) local3 = 35;
  if (touchCursor) {
    touchAction.icon = local3 !== 0 && g.outerLoopZByte !== 2 ? local3 : 0;
    return;
  }
  if (local3 !== 0 && g.outerLoopZByte !== 2) {
    rt.stepZSubrecordDraw(local3, arg1, arg2, g.animStep, {
      onSpriteRecord: (record, x, y) => drawPackedComposite(rt, record, x, y),
    });
  }
}

/**
 * private void a(int,byte) (#441) for resourceId >= 1000: origin S:I/T:I,
 * records b[0]/j[0][resourceId - 1000], then a(IBBIIB) and the g/h/i clear.
 * Shared by G()'s a(1118, mode) and c(int,int)'s building ghost
 * a(1000 + s + 1, 2) (offset 518; was deferred until 2026-10-01).
 */
export function drawImageHelper(rt: LegacyRuntimeState, resourceId: number, mode: number, S: number, T: number): void {
  if (!rt.packedData || !rt.offscreenTargets) return;
  // Exact private f.a(int,byte) prelude for resource 1118. The
  // helper receives the negative marker id, the e[9115+id] gate,
  // the e[8749+id] selector, and the computed map-screen origin;
  // it does not receive resourceId-1000 as its argument tuple.
  const invocation = prepareLegacyImageHelperInvocation({
    resourceId,
    dense: rt.denseState,
    shortOffsets: rt.packedOffsets,
    shortTables: rt.packedData.shortTables,
    byteTables: rt.packedData.byteTables,
    groupSelectors: rt.entityMarkerG,
    ah: 0,
    ai: rt.game.aiScratch,
    I: rt.game.cameraColumn,
    K: rt.game.cameraRow,
    S,
    T,
    vByte: rt.game.loopMode,
    fCounter: rt.game.animPhase,
  });
  const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
  const packed = new LegacyPackedSpriteRenderer({
    shortTables: rt.packedData.shortTables,
    byteTables: rt.packedData.byteTables,
    imageGroups: rt.imageGroups,
    graphics,
  });
  rt.frameProjections.length = 0;
  // a(IBBIIB) (#442) -- the same method the map markers use, through the same port. CORRECTED
  // 2026-10-16 (pixel comparison, title-screen scenery): rt path had its own copy of #442
  // (LegacyImageHelperProjection.ts) that still recomputed the animation phase from f:I per record
  // and kept g/h/i in a second set of arrays, so the menu's smoke and water ran out of phase.
  stepLegacyMapMarkerDetail(
    invocation.marker,
    invocation.argument2,
    invocation.argument3,
    invocation.originX,
    invocation.originY,
    mode,
    {
      phase: rt.game.animPhase,
      N: invocation.recordBase,
      O: invocation.recordCount,
      qByte: rt.game.mission,
      vByte: rt.game.loopMode,
      ai: rt.game.aiScratch,
      originRow: rt.game.cameraRow,
      dense: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      shortTables: rt.packedData.shortTables,
      byteTables: rt.packedData.byteTables,
      entityMarkerG: rt.entityMarkerG,
      entityMarkerH: rt.entityMarkerH,
      entityMarkerI: rt.entityMarkerI,
      statScratch: rt.mainArrays.aShort,
    },
    {
      onX: (value) => { rt.game.unitInBuilding = value; },
      onComposite: (record, x, y) => packed.drawComposite(record, x, y),
      onSpriteDraw: (record, x, y, phase) => {
        rt.frameProjections.push([record, x, y, phase]);
        rt.stepZSubrecordDraw(record, x, y, phase, {
          onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
        });
      },
      onEntityAction: (id, x, y, arg4, arg5) => rt.stepEntityAction(id, x, y, arg4, arg5),
      onXFlag: () => { rt.game.xZFlag = true; },
    },
  );
  // f.a(int,byte) offsets 1158..1202 clear g/h/i[0..7] after the detail draw.
  for (let index = 0; index < 8; index += 1) {
    rt.entityMarkerG[index] = 0;
    rt.entityMarkerH[index] = 0;
    rt.entityMarkerI[index] = 0;
  }
}

/**
 * Render the retained original map directly to the logical browser
 * surface. When `viewport` is omitted, its `column`/`row` (the map-tile
 * origin f.o() reads via I:B/K:B) track the LIVE `game.cameraColumn`/`game.cameraRow`
 * fields rather than a fixed (0,0) -- f.n() (LegacyCameraScroll.ts) is
 * not wired to a live outer loop yet, but I:B/K:B are already the real
 * camera-origin fields every other ported piece of rt project reads,
 * so rt at least renders the correct part of the map once something
 * else moves them (and stops silently rendering the map's top-left
 * corner forever, which is what the fixed default viewport did before).
 *
 * Also draws both halves of f.w() (LegacyCameraFrame.ts) directly
 * afterward:
 *
 *  - Letterbox (offsets 0..296): an outlined rectangle showing how far
 *    the viewport extends past the map bounds, gated by `uFlag`
 *    (f.u:Z #370). Wired 2026-08-14 now that its `boxAnchorColumn`/`boxAnchorRow` (f.G/f.H)
 *    inputs (f.G:I/H:I #53/58) are genuinely live -- see
 *    gameplay-paint-cluster.md's "f.aE()'s caller traced" section.
 *  - Camera-center cursor (offsets 297..496): a 4-corner bracket drawn
 *    around the centered tile when its map classification is 0. Wired
 *    2026-08-14: `animationPhase` (f.e:I #284) -- previously flagged as
 *    having no established source -- turned out to already be ported and
 *    live as `game.animStep` (see `LegacyGameplayTick.ts`'s
 *    `stepLegacyGameplayTick`, which increments/wraps it every tick;
 *    confirmed by matching its exact bytecode pattern, `e:I+=1; if
 *    e:I>=6 {...}; if e:I>=8 {e:I=0;}`, against `f.h()`'s own bytecode).
 *    `onCorner` routes through the same `stepZSubrecordDraw` boundary
 *    already used elsewhere in rt file (e.g. the frame-1137 selection
 *    marker), backed by a fresh `LegacyPackedSpriteRenderer` bound to
 *    rt call's `graphics`.
 */
export function renderGameplayTo(rt: LegacyRuntimeState, graphics: Graphics, viewport?: LegacyMapViewport): readonly { resourceId: number; x: number; y: number }[] {
  if (!rt.activeMap) return [];
  const resolvedViewport = viewport ?? {
    ...LEGACY_DEFAULT_MAP_VIEWPORT,
    column: rt.game.cameraColumn,
    row: rt.game.cameraRow,
  };
  // The terrain draw that used to sit here (`mapRenderer.render(graphics,
  // ...)`, straight onto the VISIBLE Graphics) was the last of the
  // non-bytecode-faithful bridges rt docblock mentions. paint()'s v==1
  // branch has no such step: f.o() draws tiles into Graphics[N:B] and the
  // composite below blits that buffer. Removed 2026-09-08; f.o() is now
  // wired for real at stepCameraScroll's onRedraw.
  void resolvedViewport;
  stepCameraFrame(rt, graphics);
  rt.stepGameplayPaintComposite(graphics);
  stepGameplayPaintHud(rt, graphics);
  return [];
}

/**
 * f.paint()'s v==1 tail, offsets 89..244 -- the gameplay HUD bars, drawn
 * straight onto the VISIBLE Graphics rather than into an offscreen.
 *
 * That is why nothing the port did to the offscreens ever produced a top
 * resource bar: the composite above maps offscreen y 0 to screen y 14 (its
 * measured call is `drawRegion(img, 0, 0, 262, 304, 0, -11, 14, 0)`), so the
 * top 14 rows are outside the blit by construction and only rt loop fills
 * them.
 *
 * Per slot, gated on `a:[Z][slot]` (offsets 98..104):
 *
 *   record = a[a_s[195] + slot]
 *   a(g, Image[c:[B][record]],
 *     0, c:[I][record],                       // source x, y
 *     a:[I][record] + 11, b:[I][record],      // width, height
 *     a:S - 11, b:S + d:[I][record] + 0, 0)   // dest x, y, anchor
 *
 * `a:S`(#140)/`b:S`(#240) have zero putfield sites anywhere (see
 * LegacyPaintScreen.ts's own note), so both are 0 and the dest reduces to
 * `(-11, d:[I][record])`. Helper #435 passes its coordinates through
 * unchanged -- the same helper, and the same treatment, as the composite
 * above.
 *
 * With the live tables rt resolves to exactly the two bars: slot 0 takes
 * record 2 (source y 304, 22 tall, dest y 0 -- the top resource bar) and
 * slot 9 takes record 10 (source y 326, 38 tall, dest y 282 -- the bottom
 * status bar).
 *
 * Per-slot extras, offsets 245..454 (ported 2026-09-28), all through
 * `a(Graphics,int,int,int)` (#436, the packed composite on `g`):
 *   slot 7 or 8: record 556 at (a:[I][rec] - 68, b:[I][rec] - 55 + bb + d:[I][rec] + 5)
 *   t195[20 + slot] == 1: record 524 at (0, bb); == 2: record 528 at (0, 320 - ba)
 *
 * `skipSlots` is not in the original: the larger view (WideScreen.ts) draws the HUD again without
 * the bars it replaces.
 */
export function stepGameplayPaintHud(rt: LegacyRuntimeState, graphics: Graphics, skipSlots?: ReadonlySet<number>): void {
  const images = rt.offscreenTargets?.images;
  if (!images) return;
  const base195 = rt.packedOffsets[195] ?? 0;
  const g = rt.game;
  const packed = rt.packedData && rt.imageGroups[0]
    ? new LegacyPackedSpriteRenderer({
      shortTables: rt.packedData.shortTables,
      byteTables: rt.packedData.byteTables,
      imageGroups: rt.imageGroups,
      graphics,
    })
    : undefined;
  for (let slot = 0; slot < 20; slot += 1) {
    if (!g.selectionFlags[slot] || skipSlots?.has(slot)) continue;
    const record = rt.packedBytes[base195 + slot] ?? 0;
    const image = images[g.frameImageSlots[record] as 0 | 1 | 2 | 3];
    if (image) {
      try {
        graphics.drawRegion(
          image,
          0,
          g.frameRecordInts[record] ?? 0,
          (g.frameRecordWidths[record] ?? 0) + 11,
          g.frameRecordHeights[record] ?? 0,
          0,
          -11,
          g.oElementRecordInts[record] ?? 0,
          0,
        );
      } catch {
        // Helper #435 catches drawRegion's out-of-bounds exception: records
        // 5/7/10 (source y 326 + 48/86/38 > image 0's 352 rows) draw nothing.
      }
    }
    if (!packed) continue;
    // paint()'s three composites go through #436, the unshifted family (2026-10-15).
    if (slot === 8 || slot === 7) {
      packed.drawCompositeUnshifted(
        556,
        (g.frameRecordWidths[record] ?? 0) - 68,
        (g.frameRecordHeights[record] ?? 0) - 55 + g.selectionBb + (g.oElementRecordInts[record] ?? 0) + 5,
      );
    }
    const edge = rt.packedBytes[base195 + 20 + slot] ?? 0;
    if (edge === 1) packed.drawCompositeUnshifted(524, 0, g.selectionBb);
    else if (edge === 2) packed.drawCompositeUnshifted(528, 0, 320 - g.selectionBa);
  }
}

/**
 * f.paint()'s v==1 branch, offsets 8..89: the real compositing step that
 * blits whichever offscreen Image f.m()/K()/R()/am() just drew gameplay
 * content into (fog-of-war, entities, footprint marks, health bars --
 * everything `stepGameplayOuterLoop()` draws) onto the real screen
 * Graphics. Ported 2026-08-18, replacing the two interim,
 * explicitly-non-bytecode-faithful "draw twice" bridges added the same
 * investigation (`renderGameplayTo` calling `stepGameplayOuterLoop`
 * directly against the visible graphics, and `onFillHiddenTile` mirroring
 * its fill onto it) -- both are now unnecessary since rt blit picks up
 * the SAME offscreen buffer those callbacks already draw into via their
 * real dispatch paths.
 *
 * Bytecode (exact stack simulation, correcting an earlier looser guess
 * that treated `A:I` and `(a:S-11+ad:I)` as one subtracted expression --
 * they are two separate call arguments):
 *   local2 = (ad:I===0 && ae:I===0) ? c[1] : 3      // offsets 9..33
 *   a(g, Image[local2],                              // offset 86, #435
 *     /*sourceX=*\/0, /*sourceY=*\/0, /*width=*\/262,
 *     /*height=*\/A:I,
 *     /*x=*\/a:S - 11 + ad:I,
 *     /*y=*\/b:S - 8 + bb:I - ax:B + ae:I,
 *     /*anchor=*\/0)
 * `a:S` (#140) and `b:S` (#240) are read-only everywhere in rt class --
 * exhaustively grepped, zero `putfield` sites anywhere -- so as `short`
 * primitives (not references, no NPE) they stay at Java's implicit
 * default 0 for the entire game, simplifying x/y to `ad-11` and
 * `bb-ax+ae-8`. Helper #435 itself (`static boolean a(Graphics,Image,
 * IIIIIII)`) is just `graphics.drawRegion(image, sx,sy,w,h,
 * /*transform=*\/0, x,y,anchor)` wrapped in try/catch returning success --
 * confirmed by reading its own body directly, not guessed. `c[1]` is
 * `game.frameImageSlots[1]`, confirmed to be the SAME value f.m() (see
 * `LegacyGameplayFramePrep.ts`'s `onTargetSlot`) sets `game.targetSlot`
 * to in every branch except its own ad!==0||ae!==0 case (which sets
 * both to `3`) -- so by the time rt runs, the slot rt reads is the
 * one that tick's K/R/am/m dispatch actually drew into.
 */
export function stepGameplayPaintComposite(rt: LegacyRuntimeState, graphics: Graphics): void {
  if (!rt.offscreenTargets) return;
  const local2 = rt.game.ad === 0 && rt.game.ae === 0 ? (rt.game.frameImageSlots[1] ?? 0) : 3;
  const image = rt.offscreenTargets.images[local2 as 0 | 1 | 2 | 3];
  if (!image) return;
  const x = rt.game.ad - 11;
  const y = rt.game.selectionBb - rt.game.selectionAx + rt.game.ae - 8;
  try {
    graphics.drawRegion(image, 0, 0, 262, rt.game.selectionAInt, 0, x, y, 0);
  } catch {
    // a(Graphics, Image, …) (#435) catches the underlying J2ME draw exception.
  }
}


/**
 * f.m() (no-arg -- not the already-ported `f.m(int)` numeric-sequence
 * overload). Its only real caller in the whole class is `run()`'s main
 * loop (bytecode offset 133, right after `h()`), called unconditionally
 * every tick -- matched here by calling rt from `main.ts`'s `tick()`
 * right after `stepGameplayFrame()` (`h()`), also unconditionally; the
 * method's own `v:B!==1` early-return reproduces the original's own
 * internal gating, so no extra `vByte` check is needed at the call site.
 *
 * This is also `f.u()`'s 5th and final call site (`K()`/`R()`x2/`am()`
 * are the other 4, already wired) and the real per-frame trigger for
 * the gameplay HUD's 20-slot element-scan loop -- `game.selectionFlags`
 * (`f.a:[Z]` #123) is already populated live by
 * `LegacySelectionFlags.ts`'s `stepLegacySelectionFlags`, wired
 * elsewhere in rt class, so rt loop reaches real content.
 *
 * `onN` is `n()` itself (offset 19), before `w()`/`u()`: its opening blit
 * restores the clean map, so u() draws onto a fresh layer. 2026-09-30:
 * main.ts used to call `n()` separately, after rt method -- i.e. after
 * u() -- and K()/am() left theirs inert; `n()` now runs only from its
 * real callers (m(), K(), R(), am()).
 * `onOffscreenDraw` is now wired too (2026-08-20) -- confirmed via direct
 * bytecode read (offsets 30..48) to be a plain
 * `Graphics[3].drawImage(Image[c[1]],0,0,0)`, the exact same static
 * `Image[]`/`Graphics[]` pair `LegacyOffscreenTargets` already models
 * (the same array `onW`/`onU`/`onTargetSlot` above index via
 * `targetSlot`), routed through its existing `copy()` helper. `onC`
 * (`private void c(int,int)`, #552) is now wired too -- see
 * `stepLegacyC2`'s own docblock (ported 2026-08-18).
 */
export function stepGameplayFramePrep(rt: LegacyRuntimeState): void {
  const data = rt.packedData;
  if (!data) return;
  const state: LegacyGameplayFramePrepState = {
    vByte: rt.game.loopMode,
    imageSlotC1: rt.game.frameImageSlots[1] ?? 0,
    scrollY: rt.game.cursorColumn,
    ad: rt.game.ad,
    scrollA: rt.game.cursorRow,
    ae: rt.game.ae,
    slotFlags: rt.game.selectionFlags,
    cInts: rt.game.frameRecordInts,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    // ax/ba/bb are the SAME fields (#229/#248/#249) LegacySelectionFlags.ts
    // already tracks as selectionAx/selectionBa/selectionBb -- reused
    // directly rather than duplicated, see LegacyGameState.ts's own note.
    ax: rt.game.selectionAx,
    bb: rt.game.selectionBb,
    ba: rt.game.selectionBa,
  };
  stepLegacyGameplayFramePrep(state, {
    onN: () => rt.stepCameraScroll(),
    onW: () => {
      const graphics = rt.offscreenTargets?.graphics[rt.game.targetSlot];
      if (graphics) stepCameraFrame(rt, graphics);
    },
    onU: () => {
      const graphics = rt.offscreenTargets?.graphics[rt.game.targetSlot];
      rt.stepGameplayOuterLoop(graphics);
    },
    // Offset 30..48 of f.m(): Graphics[3].drawImage(Image[c[1]], 0, 0, 0),
    // the exact same static Image[]/Graphics[] pair LegacyOffscreenTargets
    // already models (targetSlot/onW/onU above all index the same array).
    // Wired 2026-08-20 -- imageSlot is currently always 0 (no producer
    // traced yet for indices other than 0), guarded to the array's real
    // 0..3 bounds rather than assumed safe.
    onOffscreenDraw: (imageSlot) => {
      if (imageSlot >= 0 && imageSlot <= 3) {
        rt.offscreenTargets?.copy(3, imageSlot as 0 | 1 | 2 | 3, 0, 0, 0);
      }
    },
    onTargetSlot: (slot) => { rt.game.targetSlot = slot; },
    onSReset: () => { rt.game.gameplaySFlag = false; },
    onElementScan: (aD, x, y) => {
      rt.framePrimitives.push([aD, x, y]);
      rt.drawFrameCommandPrimitive(aD, x, y);
    },
    // m() offsets 206/257: a(III) (#439), the composite edge strips.
    onFixedSprite: (record, x, y) => {
      drawPackedComposite(rt, record, x, y);
    },
    // private void c(int,int) (#552), ported 2026-08-18 as
    // stepLegacyC2 -- see its own docblock for the full derivation.
    onC: (x, y) => rt.stepLegacyC2(x, y),
    onF: () => rt.stepFrameDispatch(),
  });
}

