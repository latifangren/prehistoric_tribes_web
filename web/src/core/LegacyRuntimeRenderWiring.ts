import type { LegacyRuntimeState } from "./LegacyRuntimeState";
import { T_MAP_SIZE } from "./DataTables";
import { UNIT_CARRY_KIND } from "./DenseLayout";
import { legacyRandomRemainder } from "../platform/LegacyRandom";
import { hdArt } from "../render/HdArt";
import { stepLegacyCRect } from "../render/LegacyEffectRectMark";
import { isLegacyWithinViewport } from "../render/LegacyEffectSlotScan";
import { scanLegacyZElementPrefix, type LegacyZElementScanCallbacks, type LegacyZElementScanState } from "../render/LegacyZElementScan";
import { stepLegacyZKind3, type LegacyZKind3Callbacks, type LegacyZKind3State } from "../render/LegacyZKind3";
import { stepLegacyZKind4, type LegacyZKind4Callbacks, type LegacyZKind4State } from "../render/LegacyZKind4";
import { type LegacyZSubrecordDrawCallbacks } from "../render/LegacyZSubrecordDraw";
import { drawPackedComposite, renderCRow, stepZSubrecordDraw as renderStepZSubrecordDraw } from "../render/RenderRuntime";
import { legacyOccupancyClass } from "../sim/world/LegacyOccupancyClass";
import { composeLegacyC, type LegacyCDrawCommand, type LegacyCRenderExtras } from "../text/LegacyCComposition";
import { drawLegacyCScan } from "../text/LegacyCScanDraw";
import { applyLegacyZFiveIntGeometry, applyLegacyZSevenIntGeometry } from "../text/LegacyZGeometryBridge";
import { stepLegacyZKText, type LegacyZKTextCallbacks, type LegacyZKTextState } from "../text/LegacyZKText";
import { consumeLegacyZCommand, type LegacyZCommandConsumerCallbacks } from "../ui/LegacyZCommandConsumer";
import { dispatchLegacyZ, type LegacyZDispatchCallbacks } from "../ui/LegacyZDispatch";

/** Read-only raw state snapshot for development parity inspection. */
export function debugSnapshot(rt: LegacyRuntimeState): Readonly<Record<string, unknown>> {
  return {
    Q: rt.game.screen,
    vByte: rt.game.loopMode,
    vInt: rt.game.vInt,
    H: rt.game.H,
    U: rt.game.U,
    R: rt.game.R,
    S: rt.game.S,
    c: rt.game.missionFrame,
    b: rt.game.b,
    aOffsets: {
      149: rt.packedOffsets[T_MAP_SIZE],
      153: rt.packedOffsets[153],
      197: rt.packedOffsets[197],
      248: rt.packedOffsets[248],
      280: rt.packedOffsets[280],
    },
    map: { width: rt.game.mapWidth, height: rt.game.mapHeight },
    framePrimitiveCount: rt.framePrimitives.length,
  };
}

/** Raw f.a(int,int) class lookup over the two confirmed bit planes. */
export function occupancyClass(rt: LegacyRuntimeState, x: number, y: number): number {
  return legacyOccupancyClass(rt.mainArrays.aInt, x, y);
}

/**
 * Execute the proven c.a(IIIII) geometry call from a Z element callback.
 * The arguments remain raw until f.a(byte,int,int) is mapped.
 */
export function applyZFiveIntGeometry(rt: LegacyRuntimeState, x: number, mode: number, width: number, record: number, value: number): number {
  return applyLegacyZFiveIntGeometry(rt.geometry, x, mode, width, record, value);
}

/** Execute the proven c.a(IIIIIII) segmented geometry call from Z. */
export function applyZSevenIntGeometry(rt: LegacyRuntimeState, x: number, mode: number, width: number, first: number, second: number, third: number, value: number): void {
  applyLegacyZSevenIntGeometry(rt.geometry, x, mode, width, first, second, third, value);
}

/** Expand one localized c.a[1]/c.b[1] record through c.b(IIIIIII). */
export function composeC(rt: LegacyRuntimeState, x: number, y: number, width: number, height: number, record: number, align: number, value: number): void {
  composeLegacyC(rt.cComposition, rt.packedBytes, rt.packedOffsets, rt.resourceTables.byteViews, rt.resourceTables.offsetViews, x, y, width, height, record, align, value, rt.resourceTables.sectionArg, rt.zhCompose);
}

/** c.a(Graphics,int)'s stats numbers, RNG and icons. */
export function cRenderExtras(rt: LegacyRuntimeState): LegacyCRenderExtras {
  return {
    onNumber: (x, y, width, text, value) => { rt.geometry.queueTextWithWidth(x, y, width, text, value); },
    random: (mask, divisor) => rt.randomRemainder(mask, divisor),
    pools: rt.mainArrays.aShort,
    onIcon: (record, x, y) => drawPackedComposite(rt, record, x, y),
  };
}

/**
 * Run the proven Z-element scan and bind its selection callbacks to c's
 * composition/render phases in the original offset-959 -> offset-1010 order.
 */
export function scanZElement(
  rt: LegacyRuntimeState,
  state: Omit<LegacyZElementScanState, "packedBytes" | "packedOffsets" | "byteRows" | "shortRows">,
  aD: number,
  xOffset: number,
  yOffset: number,
  callbacks: LegacyZElementScanCallbacks = {},
  onDraw?: (command: LegacyCDrawCommand) => void,
  zCommandCallbacks: LegacyZCommandConsumerCallbacks = {},
): boolean {
  const data = rt.packedData;
  if (!data) throw new Error("Packed /pd0 data is not loaded");
  return scanLegacyZElementPrefix({
    ...state,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    byteRows: data.byteTables,
    shortRows: data.shortTables,
  }, aD, xOffset, yOffset, {
    ...callbacks,
    onDispatch: (subtype, entry) => {
      callbacks.onDispatch?.(subtype, entry);
      rt.dispatchZCommand(subtype, entry, zCommandCallbacks);
    },
    onSelectionCompose: (x, y, width, height, value, style, mode) => {
      callbacks.onSelectionCompose?.(x, y, width, height, value, style, mode);
      rt.composeC(x, y, width, height, value, style, mode);
    },
    onSelectionRender: (rowStart) => {
      callbacks.onSelectionRender?.(rowStart);
      renderCRow(rt, rowStart, onDraw);
    },
  });
}

/**
 * Exact f.d(int,int) dispatch boundary. Kind 1 delegates to f.j(int);
 * kind 0 only updates the proven composite-position registers. The
 * remaining kind-2 branch stays explicit through the caller callback.
 */
export function dispatchZCommand(rt: LegacyRuntimeState, kind: number, command: number, callbacks: LegacyZCommandConsumerCallbacks & LegacyZDispatchCallbacks = {}): void {
  dispatchLegacyZ({
    aI: rt.game.frameCommandAI,
    aJ: rt.game.frameCommandAJ,
    aK: rt.game.frameCommandAK,
    aG: rt.game.frameCommandAG,
    aH: rt.game.frameCommandAH,
  }, kind, command, {
    onComposite: (index, x, y) => {
      callbacks.onComposite?.(index, x, y);
      rt.game.frameCommandAG = x;
      rt.game.frameCommandAH = y;
    },
    onCommand: (value) => {
      callbacks.onCommand?.(value);
      rt.consumeFrameCommand(value, callbacks);
    },
    onUnportedBranch: callbacks.onUnportedBranch,
  });
}

/** Run f.k(int) with the proven /a offset and dense-state sources. */
export function stepZKText(rt: LegacyRuntimeState, state: LegacyZKTextState, command: number, callbacks: Omit<LegacyZKTextCallbacks, "readAdvance" | "readMode" | "languageBase" | "commandStyle"> = {}): void {
  const data = rt.packedData;
  if (!data) throw new Error("Packed /pd0 data is not loaded");
  stepLegacyZKText(state, command, {
    ...callbacks,
    // a_s[126] / a_s[127] are packedOffsets (#138), the category's field
    // base is b:[S (#245, saveOffsets). Was read from saveOffsets[126/127].
    readAdvance: (aF, language) => {
      const category = rt.packedBytes[(rt.packedOffsets[126] ?? 0) + aF] ?? -1;
      if (category === -1) return undefined;
      return (rt.denseState[(rt.saveOffsets[category] ?? 0) + language] ?? 0)
        + (rt.packedBytes[(rt.packedOffsets[127] ?? 0) + aF] ?? 0);
    },
    readMode: (language) => rt.denseState[UNIT_CARRY_KIND + language] ?? 0,
    languageBase: () => rt.mainArrays.aShort[0]?.[16] ?? 0,
    commandStyle: (value) => ((data.byteTables[3]?.[value] ?? 0) & 0xff) >> 6,
  });
}

/** Run f.d(3,command), binding its proven aI<=2 branch to f.k(int). */
export function stepZKind3(rt: LegacyRuntimeState, state: LegacyZKind3State, command: number, language: number, callbacks: LegacyZKind3Callbacks = {}, onKText?: LegacyZKTextCallbacks["onText"]): void {
  stepLegacyZKind3(state, command, {
    ...callbacks,
    onK: (value) => {
      callbacks.onK?.(value);
      const textState = { aF: state.aF, aI: state.aI, aJ: state.aJ, aK: state.aK, l: language };
      rt.stepZKText(textState, value, { onText: onKText });
      state.aF = textState.aF;
    },
  });
}

/** f.d(4,row): a command row's clip rect (LegacyZKind4.ts). */
export function stepZKind4(rt: LegacyRuntimeState, state: Omit<LegacyZKind4State, "byteRows">, callbacks: LegacyZKind4Callbacks = {}): void {
  const data = rt.packedData;
  if (!data) throw new Error("Packed /pd0 data is not loaded");
  stepLegacyZKind4({ ...state, byteRows: data.byteTables }, callbacks);
}

export function stepZSubrecordDraw(
  rt: LegacyRuntimeState,
  index: number,
  x: number,
  y: number,
  phase: number,
  callbacks: LegacyZSubrecordDrawCallbacks = {},
): void {
  // The HD wide view (render/HdArt.ts): a sub-record frame with an HD picture draws that.
  if (hdArt.active && hdArt.drawEffect(rt, index, x, y, phase)) return;
  return renderStepZSubrecordDraw(rt, index, x, y, phase, callbacks);
}

/**
 * Consume one original f.j(int) command using the raw f field bank. The
 * caller-owned aliases are intentional until bytecode proves the live
 * producers of `as/ad/q/aJ/aK`.
 */
export function consumeFrameCommand(rt: LegacyRuntimeState, command: number, callbacks: LegacyZCommandConsumerCallbacks = {}): void {
  consumeLegacyZCommand({
    r: rt.mainArrays.r,
    // CORRECTED (2026-09-14): f.j(int) reads `as:B` #219, `ad:B` #186 and
    // `q:I` #356 -- the same instance fields Z()/ae() (frameLayoutAS),
    // a(ZZZZZZZZZ) (selectionAd, its only writer) and qCounter already model.
    // The old frameCommandAs/Ad/Q placeholders had no writer at all, so
    // `ad != 6` always held and the Build cost float read column r-6+20.
    as: rt.game.menuCursor,
    ad: rt.game.selectionAd,
    q: rt.game.qCounter,
    e: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    jTables: Array.from(rt.packedData?.byteTables ?? []),
    // f.d:[I (#275, offsets 443/482): the HUD slot y table, oElementRecordInts -- 1107 sets
    // d[8] = -20 to lift the cost panel. CORRECTED 2026-10-15 (pixel comparison, play26 frame
    // 40000): this passed gGeometry[0], so the panel never moved up.
    d: rt.game.oElementRecordInts,
    aF: rt.game.frameCommandAF,
    aI: rt.game.frameCommandAI,
    aJ: rt.game.frameCommandAJ,
    aK: rt.game.frameCommandAK,
  }, command, callbacks);
}

/** Raw c.a(x,y,mode,String,style) text-to-geometry entry point. */
export function queueGeometryText(rt: LegacyRuntimeState, x: number, mode: number, text: string, style: number): number {
  return rt.geometry.queueText(x, mode, text, style);
}

/** Exact f.a(int,int) RNG helper; caller supplies the original mask/divisor. */
export function randomRemainder(rt: LegacyRuntimeState, mask: number, divisor: number): number {
  return legacyRandomRemainder(rt.random, mask, divisor);
}

/** b.B:B (#9) / b.z:B (#235) / b.A:B (#6), live, for `h()`'s own writes. */
export function spotAlertScratch(rt: LegacyRuntimeState): { B: number; z: number; A: number } {
  const game = rt.game;
  const arrays = rt.subsystemArrays;
  return {
    get B() { return game.subsystemB; }, set B(value: number) { game.subsystemB = value; },
    get z() { return arrays.bField235; }, set z(value: number) { arrays.bField235 = value; },
    get A() { return arrays.bField6; }, set A(value: number) { arrays.bField6 = value; },
  };
}

/**
 * f.c(int,int,int,int) (#357, LegacyEffectRectMark.ts): mark the cells of a
 * rectangle inside the viewport for redraw and set B:Z.
 */
export function repaintRect(rt: LegacyRuntimeState, x: number, y: number, width: number, height: number): void {
  const g = rt.game;
  const bounds = { originColumn: g.cameraColumn, originRow: g.cameraRow, columns: g.viewColumns, rows: g.viewRows };
  const rectState = { boolGrid: rt.effectRectBoolGrid, originColumn: g.cameraColumn, originRow: g.cameraRow, B: g.cameraBFlag };
  stepLegacyCRect(x, y, width, height, rectState, {
    isBlocked: (bx, by) => isLegacyWithinViewport(bounds, bx, by),
  });
  g.cameraBFlag = rectState.B;
}

/** class c's final void a(int,int,int) (#445), f.q()'s own scan/draw call. */
export function drawCScan(rt: LegacyRuntimeState, arg1: number, x: number, y: number): void {
  const t = rt.resourceTables;
  drawLegacyCScan({
    k: 0, l: 0, m: 0, n: 0, o: 0, b: t.cBByte, c: t.cCByte,
    rowFShort: t.rowFShort, rowDShort: t.rowDShort, rowEShort: t.rowEShort,
    rowDByte: t.rowDByte, rowEByte: t.rowEByte,
    geometryB: t.geometryB, geometryC: t.geometryC,
  }, rt.packedBytes, rt.packedOffsets, arg1, x, y, {
    onRandomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    onDrawIcon: (sourceX, sourceY, width, height, dx, dy, anchor) => {
      const image = rt.imageGroups[0]?.get(26)?.image;
      const target = rt.offscreenTargets?.graphics[1];
      if (!image || !target) return;
      try { target.drawRegion(image, sourceX, sourceY, width, height, 0, dx, dy, anchor); }
      catch { /* the #435 helper's own try/catch */ }
    },
  });
}
