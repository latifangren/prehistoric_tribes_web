import type { Graphics } from "../platform/Graphics";
import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { LegacyPackedSpriteRenderer } from "./LegacyPackedSpriteRenderer";
import { stepLegacyMapMarkerScan, decayLegacyMapMarkerDenseState, type LegacyMapMarkerScanState } from "./LegacyMapMarkerScan";
import { stepLegacyGameplayOuterLoop, type LegacyGameplayOuterLoopViewport, type LegacyGameplayOuterLoopState } from "./LegacyGameplayOuterLoop";
import { dispatchLegacyGameplayCellBody, type LegacyGameplayCellBodyState } from "./LegacyGameplayCellBodyDispatch";
import { markLegacyEntityFootprint, LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS, type LegacyEntityFootprintMarkState } from "../sim/units/LegacyEntityFootprintMark";
import { stepLegacySecondaryCellChain, type LegacySecondaryCellChainState } from "./LegacySecondaryCellChain";
import { drawMapMarker } from "./CameraRuntime";
import { stepLegacyAnimatedSlotScan } from "./LegacyAnimatedSlotScan";
import { stepLegacyEffectSlotScan, isLegacyWithinViewport } from "./LegacyEffectSlotScan";
import { stepLegacyD as stepLegacyFD } from "../ui/LegacyFrameProgressionScan";

/**
 * f.u()'s outer loop (`stepLegacyGameplayOuterLoop`), called from
 * `onGameplayDraw` -- the real f.R()/f.P() call site (see the "P"
 * handler above), matching the bytecode's own `R() -> u()` relationship
 * (`LegacyGameplayPaintTriggers.ts`'s docblock names rt exact
 * callback `f.u()`), and also from `K()`'s and `am()`'s own `onU`.
 * Wired 2026-08-14: the loop shape now genuinely iterates every
 * (ah,ai) cell in the real viewport/map bounds each time any of those
 * three reach rt point in live play, using real `gridB`/`gridC`/
 * `gridG` and the already-tested `occupancyClass()` classifier.
 *
 * `viewport.columns`/`rows` are f.O:B/#83 and f.P:B/#87 (game.viewColumns/P;
 * producer e.c(), see LegacyFrameLayout -- a {12, 19} placeholder until 2026-10-08). `lFlag`/`nFlag`/`rowEndMarker` read
 * `game.formUpActive`/`outerLoopNFlag`/`outerLoopRowEndMarker`.
 * **CORRECTION (2026-08-24)**: rt paragraph's original claim ("stay
 * at construction defaults... end-of-row draw never fires yet") is
 * stale -- it predates two later passes that already closed rt gap:
 * `private void X()` (their producer) was ported and wired as
 * `stepLegacyX`/`onXDispatch` on 2026-08-18, reachable through the
 * real `stepGameplayFrame()`->`onV` dispatch chain and gated on
 * `cRFlag`, itself populated live via `stepLegacyC2`'s `onC` (also
 * 2026-08-18); and `onRowEndDraw` itself (below) was found unwired and
 * fixed on 2026-08-22. Both are live now, not inert.
 *
 * `onUnhandledCellBody` is now ALSO wired (second pass, same day):
 * routes to `dispatchLegacyGameplayCellBody`, reconstructing `ah`/`ai`
 * from `columnPixelX`/`rowPixelBase` (exact integer division, since
 * `stepLegacyGameplayCell` computes both as `ah*22`/`ai*16`) since the
 * cell-loop callback doesn't pass them directly. `onFootprintMark`
 * routes to `markLegacyEntityFootprint` using a newly-confirmed
 * width-mask table (`LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS`, a plain
 * `(1<<width)-1` closed form matched against every `iastore` in `b`'s
 * constructor) and the same `mainArrays.aInt` bitmap `occupancyClass()`
 * already reads. `onPackedPrimitive`/`onSpriteDraw` route to
 * `LegacyPackedSpriteRenderer.drawSprite`/`stepZSubrecordDraw`, same
 * pattern as `stepCameraCursor`'s `onCorner`. All three call sites now
 * supply a real `graphics` target (third pass, 2026-08-14): R() passes
 * `graphics[pFrameState.targetSlot]` (it writes `targetSlot=0` itself
 * right before calling); K()'s and am()'s bytecode never write `N:B`
 * (#79) before calling `u()`, so they read the live `game.targetSlot`
 * as-is instead of assuming 0. **STALE CORRECTION (2026-09-04)**: rt
 * paragraph used to claim `onMapMarkerArg1` and `onEntityAction` "remain
 * unresolved/inert -- neither has been ported from bytecode yet." That
 * was already false by the time it was written: `onMapMarkerArg1`'s
 * target (`private void a(int,byte,byte,int,int,byte)` #442) has been
 * ported since 2026-08-14 as `stepLegacyMapMarkerDetail`
 * (`LegacyMapMarkerDetail.ts`) and is wired at rt callback's own call
 * site inside `onUnhandledCellBody`, below; `onEntityAction`'s target
 * (#443) has been ported since 2026-08-15 as `stepEntityAction`, wired
 * directly two lines below rt one. Both are live, not inert -- see
 * `docs/unknowns.md`'s 2026-09-04 entry ("stale docblock" is a recurring
 * failure mode in rt file, already hit at `c5511ce`/`c4d7c23`). For
 * ordinary units (villagers, id 1..50, not associated with a map-marker
 * id), `onMapMarkerArg1` never actually fires from rt branch --
 * `stepLegacyPositiveEntityBranch`'s own gate requires
 * `dense[4545+id]`'s classifier to be non-default, which is 0/default
 * for every plain unit -- so the branch's only live effect for them is
 * `onEntityAction` (live since 2026-09-04, when its `f.b:[S]` #245 input
 * stopped being modelled as null -- see that method's docblock).
 */
export function stepGameplayOuterLoop(rt: LegacyRuntimeState, graphics?: Graphics): void {
  const viewport: LegacyGameplayOuterLoopViewport = {
    columns: rt.game.viewColumns, // f.O:B (#83)
    rows: rt.game.viewRows, // f.P:B (#87)
    originColumn: rt.game.cameraColumn,
    originRow: rt.game.cameraRow,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    zWriteAiTarget: rt.game.cursorRow,
    zWriteAhTarget: rt.game.cursorColumn,
  };
  const state: LegacyGameplayOuterLoopState = {
    sFlag: rt.game.cameraSFlag,
    // u() offset 142 reads J:Z (#66), not j:Z (#327). Fixed 2026-10-01.
    jFlag: rt.game.jSceneFlag,
    zByte: rt.game.outerLoopZByte,
    gridC: rt.gridC,
    gridB: rt.gridB,
    gridG: rt.gridG,
    lFlag: rt.game.formUpActive,
    nFlag: rt.game.callToArmsActive,
    rowEndMarker: rt.game.outerLoopRowEndMarker,
    // BUG FIX (2026-08-18): was game.animStep (e:I, #284) -- direct
    // bytecode read of u()'s own row-end draw calls (offset 2118/2178/
    // 2203) confirms f:I (#294)/game.animPhase. See fCounter's docblock.
    phase: rt.game.animPhase,
  };
  const data = rt.packedData;
  const packed = graphics && data
    ? new LegacyPackedSpriteRenderer({
        shortTables: data.shortTables,
        byteTables: data.byteTables,
        imageGroups: rt.imageGroups,
        graphics,
      })
    : undefined;
  // f.v() (LegacyMapMarkerScan.ts) runs once, unconditionally, at the
  // very start of f.u() -- before its main visible-window loop below.
  // Wired 2026-08-18: previously fully unwired (its own bytecode-
  // confirmed phase field, f:I/#294, matches rt method's own already-
  // fixed `state.phase`). resourceNodeTable reuses the already-tracked
  // xSlotTable (f.b:[[[B]/#237, same field, confirmed via constructor
  // allocation order); teamMarkerTable (f.c:[[[B]/#256). CORRECTION
  // (2026-08-22): both are now confirmed to have a real producer (aM(),
  // see LegacyGameState.ts's docblocks) -- no longer inert placeholders.
  decayLegacyMapMarkerDenseState(rt.denseState);
  const markerScanState: LegacyMapMarkerScanState = {
    dense: rt.denseState,
    teamMarkerTable: rt.game.teamMarkerTable,
    resourceNodeTable: rt.game.xSlotTable,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    originColumn: rt.game.cameraColumn,
    originRow: rt.game.cameraRow,
    columns: viewport.columns,
    rows: viewport.rows,
    phase: rt.game.animPhase,
  };
  stepLegacyMapMarkerScan(markerScanState, {
    classifyOccupancy: (x, y) => rt.occupancyClass(x, y),
    onSpriteDraw: packed ? (record, x, y) => packed.drawSprite(record, x, y) : undefined,
  });
  const bodyState: LegacyGameplayCellBodyState = {
    dense: rt.denseState,
    gridC: rt.gridC,
    sFlag: rt.game.cameraSFlag,
    ao: rt.game.ao,
    columns: viewport.columns,
    originColumn: rt.game.cameraColumn,
    gridG: rt.gridG,
    gridB: rt.gridB,
    colorTable: rt.game.healthBarColorTable,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    originRow: rt.game.cameraRow,
    scrollA: rt.game.cursorRow,
    scrollY: rt.game.cursorColumn,
    phase: rt.game.animStep,
    hCounter: rt.game.tailHCounter,
  };
  stepLegacyGameplayOuterLoop(viewport, state, {
    classifyOccupancy: (x, y) => rt.occupancyClass(x, y),
    // Offsets 186..225: a tree/rock cell (b 180..231 or 243) in sight draws its detail through
    // a(int,byte) with arg2 = 1. FIXED 2026-10-15 (user report: trees showed only their base):
    // never wired at the loop, so every tree canopy was missing.
    onMapMarkerArg1: (value, markerAh, markerAi) => drawMapMarker(rt, value, 1, markerAh, markerAi, packed),
    // Fog-of-war epilogue draws (bytecode/f-javap.txt offsets ~1791..2027
    // of u()): occupancyClass===1 -> edge-softened fog sprite (record
    // 12); occupancyClass===2 -> either a solid fillRect (interior, all
    // 4 neighbors also class 2, confirmed via the exact 4 consecutive
    // `invokespecial a:(II)B` classifier calls at offsets 1944..1986)
    // or the class-2 edge sprite (record 11). Wired 2026-08-15. The
    // fillRect target is `Graphics[c[1]]` (offset 1891..1899, NOT
    // necessarily the same slot as rt call's own `graphics` param),
    // read the same way f.m() already reads it: `game.frameImageSlots[1]`.
    onPackedPrimitive: packed ? (type, x, y) => packed.drawSprite(type, x, y) : undefined,
    // f.u()'s per-row end-of-row marker (record 105, gated on
    // lFlag||nFlag matching rowEndMarker[1]-originRow===ai). Found
    // unwired 2026-08-22 while tracing u()'s exception scope for the
    // r()/s() wiring; same LegacyZSubrecordDraw routing already used
    // for every other packed sprite draw in rt method.
    onRowEndDraw: packed
      ? (record, x, y, phase) => {
          rt.stepZSubrecordDraw(record, x, y, phase, {
            onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
          });
        }
      : undefined,
    onFillHiddenTile: (x, y) => {
      const target = rt.offscreenTargets?.graphics[rt.game.frameImageSlots[1] ?? 0];
      if (!target) return;
      target.setColor(0);
      target.fillRect(11 + x, 8 + y, 22, 16);
      // No longer mirrored onto `graphics` directly (2026-08-17's interim
      // fix, now removed): stepGameplayPaintComposite() -- the real
      // f.paint() blit -- picks up rt same offscreen fill and composites
      // it onto the screen, so a second direct draw would double-paint.
    },
    // f.i(int): walks the linked chain of entity ids stacked on rt
    // cell's secondary grid, drawing a packed sprite per id whose
    // "kind" (dense[6565+id]) is 1, 2, or 5. Already fully ported as
    // LegacySecondaryCellChain.ts; wired 2026-08-15.
    onSecondaryCell: (headId) => {
      const secondaryState: LegacySecondaryCellChainState = {
        dense: rt.denseState,
        originColumn: rt.game.cameraColumn,
        originRow: rt.game.cameraRow,
        hTable: rt.secondaryCellHTable,
        iTable: rt.secondaryCellITable,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
      };
      stepLegacySecondaryCellChain(headId, secondaryState, {
        // f.i(int) offset 264 is a(III) (#439), a composite. CORRECTED 2026-10-15 (pixel comparison,
        // play26 frame 95000): rt drew a single b(III) sprite, so thrown spears were bare lines.
        onPackedPrimitive: packed ? (record, x, y) => packed.drawComposite(record, x, y) : undefined,
      });
    },
    onUnhandledCellBody: (columnTile, rowTile, columnPixelX, occupancyClass, gridCValue, gridBValue, rowPixelBase) => {
      const ah = columnPixelX / 22;
      const ai = rowPixelBase / 16;
      const result = dispatchLegacyGameplayCellBody(
        gridCValue, columnPixelX, rowTile, columnTile, ai, ah, occupancyClass, rowPixelBase,
        bodyState, graphics, {
          onFootprintMark: (layer, x, y, width, height) => {
            const footprintState: LegacyEntityFootprintMarkState = {
              layer,
              widthMasks: LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS,
              layers: rt.mainArrays.aInt,
              mapHeight: rt.game.mapHeight,
            };
            markLegacyEntityFootprint(footprintState, x, y, width, height);
          },
          // a(III) (#439) in both the negative branch (offset 1234) and its
          // tail (1788): composites, not b(III). Corrected 2026-10-01.
          onPackedPrimitive: packed ? (type, x, y) => packed.drawComposite(type, x, y) : undefined,
          onMapMarkerArg1: (value) => drawMapMarker(rt, value, 1, ah, ai, packed),
          onSpriteDraw: packed
            ? (record, x, y, phase) => {
                rt.stepZSubrecordDraw(record, x, y, phase, {
                  onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
                });
              }
            : undefined,
          onEntityAction: (id, x, y, arg4, arg5) => rt.stepEntityAction(id, x, y, arg4, arg5),
        },
      );
      return { ahDecrement: result.ahDecrement, occupancyClass: result.occupancyClass };
    },
  });
  rt.game.outerLoopZByte = state.zByte;
  // The row counter is the shared field ai:I (#199), not a local: the loop
  // has no early exit, so it ends at P + 3 (oracle 2026-10-08).
  rt.game.aiScratch = viewport.rows + 3;

  // f.u()'s post-loop tail: calls r() then s() unconditionally right
  // after the main visible-window loop (bytecode offsets 2141/2145),
  // then its own once-per-tick row-end-marker draw (offset 2148..2209,
  // record 30/31) -- all three wrapped in u()'s own try/catch-all
  // (offset 11..2209 -> pop;return), modeled with a local try/catch
  // around just these three. CORRECTED 2026-09-28: the old note said r()
  // always throws on f.b:[S] (#245) being null; e.f() writes that field
  // (it is saveOffsets), so r() runs normally now.
  const outerLoopViewportBounds = {
    originColumn: rt.game.cameraColumn,
    originRow: rt.game.cameraRow,
    columns: rt.game.viewColumns,
    rows: rt.game.viewRows,
  };
  try {
    stepLegacyAnimatedSlotScan(
      {
        slotTable: rt.mainArrays.d,
        dense: rt.denseState,
        shortTable2D: rt.packedData?.shortTables ?? [],
        // f.b:[S] (#245): written by e.f() (e-javap.txt:1115), i.e. rt
        // port's saveOffsets. FIXED 2026-09-28: rt was a deliberate null
        // left from the retracted "permanently null" premise, so r() threw
        // on every active unit/animal slot and no hit effect was drawn.
        shortTable1D: rt.saveOffsets,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        byteRows: rt.packedData?.byteTables ?? [],
        originColumn: rt.game.cameraColumn,
        originRow: rt.game.cameraRow,
      },
      {
        isWithinViewport: (x, y) => isLegacyWithinViewport(outerLoopViewportBounds, x, y),
        classifyOccupancy: (x, y) => rt.occupancyClass(x, y),
        onAq: (aq) => { rt.game.projectionAq = aq; },
        onSpriteDraw: packed
          ? (record, x, y, phase) => {
              rt.stepZSubrecordDraw(record, x, y, phase, {
                onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
              });
            }
          : undefined,
      },
    );
    stepLegacyEffectSlotScan(
      {
        ...outerLoopViewportBounds,
        slotGrid: rt.mainArrays.e,
        dense: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
      },
      {
        isWithinViewport: (x, y) => isLegacyWithinViewport(outerLoopViewportBounds, x, y),
        onSpriteDraw: packed
          ? (record, x, y, phase) => {
              rt.stepZSubrecordDraw(record, x, y, phase, {
                onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
              });
            }
          : undefined,
        // final void c(int,boolean) (#555, stepEntityRemoval) -- wired
        // 2026-08-24, arg2 always false at rt call site.
        onModeThreeExpire: (id) => rt.stepEntityRemoval(id, false),
        // final void d(int) (#... see LegacyFrameProgressionScan.ts) --
        // fires once per expiring slot, sets pendingP when w:B===2 and
        // the slot's own id matches game.qCounter.
        onSlotAction: (id) => {
          const dState = { w: rt.game.barMode, q: rt.game.qCounter, P: rt.game.pendingP };
          stepLegacyFD(id, dState);
          rt.game.pendingP = dState.P;
        },
        // final void c(int,int,int,int) / stepLegacyCRect -- its own
        // `isBlocked` predicate (private boolean a(int,int) #446) turned
        // out, on direct bytecode read, to be the EXACT SAME I/O/K/P
        // bounds check as isLegacyWithinViewport (not a distinct
        // "blocked" concept as its placeholder name suggested).
        onRect: (x, y, width, height) => rt.repaintRect(x, y, width, height),
      },
    );
    // f.u()'s own once-per-tick row-end-marker tail (bytecode offset
    // 2148..2209, right after r()/s(), inside the SAME try block as
    // both): gated on ad:I===0 && ae:I===0 (game.ad/game.ae), draws
    // record 30 when outerLoopNFlag, else record 31 when
    // outerLoopLFlag, at fixed pixel (218,11) with fCounter as phase.
    // Found while tracing rt method's exception scope for the r()/s()
    // wiring; genuinely distinct from the per-row onRowEndDraw (record
    // 105) inside the main loop above.
    if (rt.game.ad === 0 && rt.game.ae === 0) {
      if (rt.game.callToArmsActive) {
        rt.stepZSubrecordDraw(30, 218, 11, rt.game.animPhase, {
          onSpriteRecord: (spriteRecord, drawX, drawY) => packed?.drawComposite(spriteRecord, drawX, drawY),
        });
      } else if (rt.game.formUpActive) {
        rt.stepZSubrecordDraw(31, 218, 11, rt.game.animPhase, {
          onSpriteRecord: (spriteRecord, drawX, drawY) => packed?.drawComposite(spriteRecord, drawX, drawY),
        });
      }
    }
  } catch {
    // Matches u()'s own catch-all -- see docblock above.
  }
}
