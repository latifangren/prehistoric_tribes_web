import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import type { Graphics } from "../platform/Graphics";
import { LegacyPackedSpriteRenderer } from "./LegacyPackedSpriteRenderer";
import { hdArt } from "./HdArt";
import { drawLegacyMapMarkerPieces, prepareLegacyMapMarkerDispatch } from "./LegacyMapMarkerDispatch";
import { stepLegacyMapMarkerDetail } from "./LegacyMapMarkerDetail";
import { renderLegacyMap, type LegacyMapRedrawRange } from "./LegacyMapRenderer";
import { stepLegacyCameraFollow, type LegacyCameraFollowState } from "./LegacyCameraFollow";
import { stepLegacyCameraScroll } from "./LegacyCameraScroll";
import { stepLegacyCameraLetterbox, stepLegacyCameraCursor, type LegacyCameraFrameCursorState } from "./LegacyCameraFrame";

/**
 * Raw f.Y(): the real camera-pan driver (see LegacyCameraFollow.ts). Its
 * callers are f.aD() and f.V()'s tail (LegacyGameplayInput's onY, wired;
 * the old "V() not yet ported" note was stale -- 2026-09-28). Builds a
 * fresh state object each call (rather than reusing a persisted one, the
 * pattern used elsewhere in rt class) since most of `LegacyCameraFollowState`'s
 * fields are `readonly` from the port's own perspective.
 */
export function stepCameraFollow(rt: LegacyRuntimeState): void {
  const state: LegacyCameraFollowState = {
    cameraBFlag: rt.game.cameraBFlag,
    inputUp: rt.game.inputUp,
    inputDown: rt.game.inputDown,
    inputLeft: rt.game.inputLeft,
    inputRight: rt.game.inputRight,
    cursorColumn: rt.game.cursorColumn,
    cursorRow: rt.game.cursorRow,
    cursorTargetColumn: rt.game.cursorTargetColumn,
    cursorTargetRow: rt.game.cursorTargetRow,
    originColumn: rt.game.cameraColumn,
    originRow: rt.game.cameraRow,
    columnScrollDelta: rt.game.columnScrollDelta,
    rowScrollDelta: rt.game.rowScrollDelta,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    // f.O:B / f.P:B (#83/#87), live -- were a {12, 19} placeholder until 2026-10-09 (oracle run 5,
    // frame 12275: with P 16 the camera scrolls down at K 11, the placeholder stopped it there).
    viewportColumns: rt.game.viewColumns,
    viewportRows: rt.game.viewRows,
    selectionFlags: rt.game.selectionFlags,
    selectionBa: rt.game.selectionBa,
  };
  stepLegacyCameraFollow(state);
  rt.game.cursorColumn = state.cursorColumn;
  rt.game.cursorRow = state.cursorRow;
  rt.game.cameraColumn = state.originColumn;
  rt.game.cameraRow = state.originRow;
  rt.game.columnScrollDelta = state.columnScrollDelta;
  rt.game.rowScrollDelta = state.rowScrollDelta;
}

/**
 * Raw f.n(): per-tick camera pixel-scroll handler (see LegacyCameraScroll.ts).
 *
 * BUG FIX (2026-09-08): `onRedraw` (f.o(), five call sites in f.n() matching
 * rt port's five `onRedraw?.()` sites) used to be left inert, on the
 * reasoning that "main.ts's own per-frame render() already unconditionally
 * redraws the gameplay map every frame". That substitution put terrain on
 * the WRONG surface. In the original, f.o() draws tiles through
 * `a(int,int,int)` (#439) into `Graphics[N:B]` -- the offscreen buffer --
 * and `paint()`'s v==1 branch then blits that buffer to the screen. The
 * port instead drew terrain straight onto the visible Graphics inside
 * `renderGameplayTo`, and then the (faithful) composite blitted the
 * terrain-less offscreen over the top of it. Measured: the visible canvas
 * went 0 -> 69616 non-black pixels from that direct draw, then back down to
 * 2240 the moment the composite ran. Now wired to `renderMap` against
 * `graphics[targetSlot]`, which is what `Graphics[N:B]` is.
 *
 * `onPartialBlit` is helper #435 (drawRegion, exception swallowed). Offset
 * 134..175 copies the clean map Image[c[0]] into Graphics[c[1]], shifted by
 * aj/ak -- rt is what erases last tick's units, bubbles and cursor; 420..455
 * copies Graphics[c[1]] back into Image[c[0]] after any o() redraw.
 * WIRED 2026-09-30: both were inert, so everything u() drew stayed on the
 * map layer until the next full redraw (stale thought bubbles).
 */
export function stepCameraScroll(rt: LegacyRuntimeState): void {
  rt.cameraScrollState.rowScrollDelta = rt.game.rowScrollDelta;
  rt.cameraScrollState.columnScrollDelta = rt.game.columnScrollDelta;
  rt.cameraScrollState.pixelColumnOffset = rt.game.pixelColumnOffset;
  rt.cameraScrollState.pixelRowOffset = rt.game.pixelRowOffset;
  rt.cameraScrollState.scrollTargetColumn = rt.game.scrollTargetColumn;
  rt.cameraScrollState.scrollTargetRow = rt.game.scrollTargetRow;
  rt.cameraScrollState.followFlag = rt.game.AFlag;
  rt.cameraScrollState.cFlag = rt.game.cameraCFlag;
  rt.cameraScrollState.bFlag = rt.game.cameraBFlag;
  rt.cameraScrollState.dFlag = rt.game.cameraDFlag;
  rt.cameraScrollState.aiScratch = rt.game.aiScratch;
  rt.cameraScrollState.sFlag = rt.game.cameraSFlag;
  stepLegacyCameraScroll(rt.cameraScrollState, rt.cameraScrollViewport, rt.game.selectionAInt, {
    onPartialBlit: (destX, destY, height, graphicsSlot, imageSlot) => {
      const slots = rt.game.frameImageSlots;
      const target = rt.offscreenTargets?.graphics[slots[graphicsSlot] as 0 | 1 | 2 | 3];
      const image = rt.offscreenTargets?.images[slots[imageSlot] as 0 | 1 | 2 | 3];
      if (!target || !image) return;
      try {
        target.drawRegion(image, 0, 0, 264, height, 0, destX, destY, 0);
      } catch {
        // #435 returns false.
      }
    },
    // f.o() (#629): redraw f.n()'s window -- aj..al x ak..am, only the a:[[Z] cells while D:Z --
    // into the offscreen buffer the composite reads, i.e. Graphics[N:B] == graphics[targetSlot].
    onRedraw: () => {
      const scroll = rt.cameraScrollState;
      renderMap(rt, 
        { fromColumn: scroll.pixelColumnOffset, toColumn: scroll.scrollTargetColumn, fromRow: scroll.pixelRowOffset, toRow: scroll.scrollTargetRow },
        (rt.game.targetSlot as 0 | 1 | 2 | 3),
        scroll.dFlag ? rt.effectRectBoolGrid : null,
      );
    },
  });
  rt.game.rowScrollDelta = rt.cameraScrollState.rowScrollDelta;
  rt.game.columnScrollDelta = rt.cameraScrollState.columnScrollDelta;
  rt.game.pixelColumnOffset = rt.cameraScrollState.pixelColumnOffset;
  rt.game.pixelRowOffset = rt.cameraScrollState.pixelRowOffset;
  rt.game.scrollTargetColumn = rt.cameraScrollState.scrollTargetColumn;
  rt.game.scrollTargetRow = rt.cameraScrollState.scrollTargetRow;
  rt.game.AFlag = rt.cameraScrollState.followFlag;
  rt.game.cameraCFlag = rt.cameraScrollState.cFlag;
  // BUG FIX (2026-09-03): `bFlag` (B:Z #39, game.cameraBFlag) was read in
  // at the top of rt method but never written back here. Real bytecode
  // offset 349..358 of f.n() (`getfield B:Z; ifeq 405; ... putfield 0
  // B:Z`) resets the field to false once its one-shot redraw branch has
  // fired -- `stepLegacyCameraScroll`'s own `if (state.bFlag) { state.bFlag
  // = false; ... }` mirrors that correctly, but the result only ever
  // landed on the throwaway `cameraScrollState.bFlag` copy, never flowed
  // back to `game.cameraBFlag`. `LegacyCameraFollow.ts` (f.Y(), the D-pad
  // cursor driver) has `if (state.cameraBFlag) return;` as its very first
  // line -- once anything set the real field true (e.g. the effect-rect
  // marker `c(IIII)`'s unconditional `state.B = true` in
  // LegacyEffectRectMark.ts, which fires routinely during normal
  // gameplay ticks), the missing write-back meant it could never be
  // observed as reset, permanently blocking direction-key cursor
  // movement. `dFlag` (D:Z #44) has no other reader anywhere in the
  // codebase and is set true then false again within the very same
  // `stepLegacyCameraScroll` call (truly transient, matching that
  // field's own docblock), so it is deliberately left unsynced.
  rt.game.cameraBFlag = rt.cameraScrollState.bFlag;
  rt.game.aiScratch = rt.cameraScrollState.aiScratch;
}

/** f.o() (#629) into Graphics[target]; see LegacyMapRenderer.ts. */
export function renderMap(rt: LegacyRuntimeState, range: LegacyMapRedrawRange, target: 0 | 1 | 2 | 3, dirty: boolean[][] | null): void {
  const data = rt.packedData;
  const graphics = rt.offscreenTargets?.graphics[target];
  if (!rt.activeMap || !data || !graphics) return;
  const packed = new LegacyPackedSpriteRenderer({
    shortTables: data.shortTables,
    byteTables: data.byteTables,
    imageGroups: rt.imageGroups,
    graphics,
  });
  renderLegacyMap({
    width: rt.game.mapWidth,
    height: rt.game.mapHeight,
    gridB: rt.gridB,
    gridC: rt.gridC,
    onComposite: (record, x, y) => { if (!(hdArt.active && hdArt.drawStoneTile(record, x, y))) packed.drawComposite(record, x, y); },
    onMarker: (value, ah, ai) => drawMapMarker(rt, value, 0, ah, ai, packed),
  }, { column: rt.game.cameraColumn, row: rt.game.cameraRow }, range, dirty);
}

/** f.w(): both halves (letterbox + camera-center cursor), factored out so `renderGameplayTo` and `stepGameplayFramePrep` (f.m()'s `onW`) can share it. */
export function stepCameraFrame(rt: LegacyRuntimeState, graphics: Graphics): void {
  const letterboxOutput = stepLegacyCameraLetterbox(rt.letterboxState(), graphics);
  if (letterboxOutput) {
    rt.game.BCounter = letterboxOutput.b;
    rt.game.CCounter = letterboxOutput.c;
    rt.game.DCounter = letterboxOutput.d;
    rt.game.ECounter = letterboxOutput.e;
  }
  stepCameraCursor(rt, graphics);
}

export function stepCameraCursor(rt: LegacyRuntimeState, graphics: Graphics): void {
  const data = rt.packedData;
  if (!data) return;
  const packed = new LegacyPackedSpriteRenderer({
    shortTables: data.shortTables,
    byteTables: data.byteTables,
    imageGroups: rt.imageGroups,
    graphics,
  });
  const state: LegacyCameraFrameCursorState = {
    gridC: rt.gridC,
    viewportOriginK: rt.game.cameraRow,
    scrollA: rt.game.cursorRow,
    viewportOriginI: rt.game.cameraColumn,
    scrollY: rt.game.cursorColumn,
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  };
  stepLegacyCameraCursor(state, rt.game.animStep, {
    onCorner: (index, x, y, phase) => {
      rt.stepZSubrecordDraw(index, x, y, phase, {
        onSpriteRecord: (record, drawX, drawY) => packed.drawComposite(record, drawX, drawY),
      });
    },
  });
}

/**
 * private void a(int,byte) (#441) for cell (ah, ai): the routing half
 * (prepareLegacyMapMarkerDispatch, offsets 0..993), then either the
 * ground/stacked-piece draw (994..1140, arg2 still 0 -- f.o()'s call) or
 * the detail draw a(int,byte,byte,int,int,byte) (1143..1155), then
 * offsets 1158..1202 clear g/h/i[0..7].
 */
export function drawMapMarker(rt: LegacyRuntimeState, value: number, arg2: number, ah: number, ai: number, packed?: LegacyPackedSpriteRenderer): void {
  const data = rt.packedData;
  if (!data) return;
  const result = prepareLegacyMapMarkerDispatch(value, arg2, {
    ah,
    ai,
    originColumn: rt.game.cameraColumn,
    originRow: rt.game.cameraRow,
    dense: rt.denseState,
    gridC: rt.gridC,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    shortTables: data.shortTables,
    byteTables: data.byteTables,
    aQ: rt.game.aQ,
  });
  for (const write of result.scratchGWrites) {
    rt.entityMarkerG[write.index] = write.value;
  }
  // The HD wide view (render/HdArt.ts): a building or map object with an HD picture draws that
  // instead; the original's pieces still go through, onto a measuring or discarded canvas.
  const building = value < 0 && value >= -60 ? result.local3 : 0;
  const plan = hdArt.active && packed
    ? hdArt.planMarker(building, result.local4, result.local7, result.resource, result.local7, result.local10, result.local11, result.arg2 !== 0)
    : null;
  if (plan) packed = plan.packed;
  plan?.before();
  if (result.arg2 === 0) {
    if (packed) {
      const pieces = packed;
      drawLegacyMapMarkerPieces(result, ah, ai, data.shortTables, data.byteTables, (record, x, y) => pieces.drawComposite(record, x, y));
      const ground = plan?.original ? hdArt.ground : null;
      if (ground) {
        drawLegacyMapMarkerPieces(result, ah, ai, data.shortTables, data.byteTables, (record, x, y) => ground.drawComposite(record, x, y));
      }
    }
  } else {
    stepLegacyMapMarkerDetail(
      result.local3,
      result.local7,
      result.local4,
      result.local10,
      result.local11,
      result.arg2,
      {
        // BUG FIX (2026-08-18): was game.animStep (e:I,
        // #284) -- direct bytecode read of `a(int,byte,byte,int,
        // int,byte)` (#442, both refs, offset 4/1156) confirms
        // f:I (#294)/game.animPhase. See fCounter's docblock.
        phase: rt.game.animPhase,
        N: result.N,
        O: result.O,
        qByte: rt.game.mission,
        vByte: rt.game.loopMode,
        ai,
        originRow: rt.game.cameraRow,
        dense: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        shortTables: data.shortTables,
        byteTables: data.byteTables,
        entityMarkerG: rt.entityMarkerG,
        entityMarkerH: rt.entityMarkerH,
        entityMarkerI: rt.entityMarkerI,
        statScratch: rt.mainArrays.aShort,
      },
      {
        // CORRECTED 2026-10-15 (docs/bugs.md BUG-001): X:B was never written here, so q() never drew
        // the health bar of a unit inside a building (a chief on a site looked idle).
        onX: (value) => { rt.game.unitInBuilding = value; },
        onComposite: packed ? (record, x, y) => packed.drawComposite(record, x, y) : undefined,
        onSpriteDraw: packed
          ? (record, x, y, phase) => {
              rt.stepZSubrecordDraw(record, x, y, phase, {
                onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
              });
            }
          : undefined,
        // onEntityAction (f.a(IIIIB) #443) wired 2026-08-15 --
        // confirmed a guaranteed no-op in the original (see
        // stepEntityAction's own docblock), wired anyway to
        // document that rather than leave it looking unresolved.
        onEntityAction: (id, x, y, arg4, arg5) => rt.stepEntityAction(id, x, y, arg4, arg5),
        // onXFlag (f.x:Z #383) -- confirmed its only reader
        // (stepEntityAction) is unreachable dead code (see
        // game.xZFlag's own docblock), so rt write has no
        // observable effect; wired anyway to be faithful.
        onXFlag: () => { rt.game.xZFlag = true; },
      },
    );
  }
  plan?.after();
  for (let index = 0; index < 8; index += 1) {
    rt.entityMarkerG[index] = 0;
    rt.entityMarkerH[index] = 0;
    rt.entityMarkerI[index] = 0;
  }
}
