import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import type { AnchorValue } from "../platform/anchors";
import { LegacyPackedSpriteRenderer } from "./LegacyPackedSpriteRenderer";
import { drawLegacy1137Composition } from "./Legacy1137Composition";
import { ZH_LANGUAGE_NAME, paintZhLine } from "../text/LegacyZhText";
import { drawLegacyFrameCommand } from "./LegacyFrameCommandDraw";
import { stepLegacyFrameCommandChanged, type LegacyZAdChangeState } from "../ui/LegacyFrameCommandChanged";
import { drawLegacy1010 } from "./Legacy1010Renderer";
import { stepLegacyZKind3, type LegacyZKind3State } from "./LegacyZKind3";
import { stepLegacyZKind2, type LegacyZKind2State } from "./LegacyZKind2";
import { applyLegacyZFiveIntGeometry, applyLegacyZSevenIntGeometry } from "../text/LegacyZGeometryBridge";
import { stepLegacyMapOverviewScroll } from "./LegacyMapOverview";
import { BLD_KIND } from "../core/DenseLayout";
import { composeLegacyC, emitLegacyCRenderRow } from "../text/LegacyCComposition";

/**
 * f.a(byte,int,int) (#438), the command-backed frame renderer.  Originally
 * only wired inline inside the "G" handler's onFrameCommand (resources 10
 * and 17); extracted 2026-08-26 so the SAME tested pipeline can also be
 * reached from onElementScan (P()'s epilogue and m()'s per-tick call),
 * which previously only pushed a trace stub and never actually invoked
 * rt method -- see LegacyZElementScan.ts's docblock for the orphaned
 * duplicate port (scanLegacyZElementPrefix) rt replaces as the real
 * wiring target.
 */
export function drawFrameCommandPrimitive(rt: LegacyRuntimeState, command: number, x: number, y: number): void {
  rt.frameHelperCalls.push({ kind: "frame-command", resourceId: command, x, y });
  rt.drawingVillagerPanel = command === 4;
  if (command === 4) rt.villagerPanelDraft = [];
  // command 4 (the selected-unit panel) is drawn like the others since
  // 2026-09-28: the old skip rested on f.b:[S] (#245) being null, which it
  // is not (e.f() writes it); y() is ported as stepLegacyY.
  // f.a(byte,int,int)'s own offset-6 prefix call, private boolean c()
  // (bytecode/f-javap.txt:12798) -- confirmed reachable and ported:
  // aD===0, aD∈{2,5} (->z()), aD===6 (->A()), aD∈{7,8} (c()'s own inline
  // logic), and aD===17 (->B(), the vByte===1 branch; command=17 is the
  // shared text/dialogue overlay every non-G/H handler uses). Opening
  // the command menu via LSK activates selectionFlags[0]/[5]/[17],
  // which f.m()'s HUD loop turns into command=0/5/17 calls; the rest
  // were confirmed via a live jdb trace across all 5 command-menu items
  // -- see reverse-engineering/frame-command-changed-cluster.md.
  const changedState: LegacyZAdChangeState = {
    saveOffsets: rt.saveOffsets,
    l: rt.game.selectedId,
    aShortStats: rt.mainArrays.aShort,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    dShort: rt.game.zlDShorts,
    kBytes: rt.game.zlKBytes,
    flags: rt.game.frameFlags,
    r: rt.mainArrays.r,
    as: rt.game.menuCursor,
    kFlag: rt.game.choosingChief,
    entityFocusFlag: rt.game.entityFocusFlag,
    zAfCursorVFlag: rt.game.zAfCursorVFlag,
    dense: rt.denseState,
    vInt: rt.game.vInt,
    wByte: rt.game.barMode,
    zlYInt: rt.game.zlYInt,
    qCounter: rt.game.qCounter,
    FByte: rt.game.selectionGroup,
    adByte: rt.game.selectionAd,
    frameGenCounterY: rt.game.frameGenCounterY,
    frameGenCounterZ: rt.game.frameGenCounterZ,
    ayByte: rt.game.ayByte,
    aByteRows: rt.mainArrays.aByte,
    uBytes: rt.mainArrays.uBytes,
    am: rt.game.am,
    qByte: rt.game.mission,
    Q: rt.game.screen,
    al: rt.game.al,
    ai: rt.game.ai,
    mByte: rt.game.mByte,
    akByte: rt.game.akByte,
    Z: rt.game.Z,
    W: rt.game.exitPrepWInt,
    X: rt.game.exitPrepXInt,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    zAd14T: rt.game.frameLayoutT,
    zAd14U: rt.game.frameLayoutU,
    zAd14Q: rt.game.zAd14QFlag,
    zAd14R: rt.game.zAd14RFlag,
    af: rt.game.columnScrollDelta,
    ag: rt.game.rowScrollDelta,
  };
  const changed = stepLegacyFrameCommandChanged(command, rt.game.loopMode, changedState, {
    onD: () => stepLegacyMapOverviewScroll(rt.mapOverviewInput()),
  });
  rt.game.vInt = changedState.vInt;
  rt.game.am = changedState.am;
  rt.game.frameLayoutT = changedState.zAd14T;
  rt.game.frameLayoutU = changedState.zAd14U;
  rt.game.zAd14QFlag = changedState.zAd14Q;
  rt.game.zAd14RFlag = changedState.zAd14R;
  rt.game.columnScrollDelta = changedState.af;
  rt.game.rowScrollDelta = changedState.ag;
  const result = drawLegacyFrameCommand({
    command,
    x,
    y,
    changed,
    flags: rt.game.frameFlags,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    shortTables: rt.packedData?.shortTables ?? [],
    byteTables: rt.packedData?.byteTables ?? [],
    // f.c:[B (#263): one field with game.frameImageSlots (merged 2026-09-28;
    // O()'s c[8]/c[9] writes never reached rt copy).
    imageSelectors: rt.game.frameImageSlots,
    dShort: rt.game.zlDShorts,
    kBytes: rt.game.zlKBytes,
    v: rt.game.vInt,
    w: rt.game.resourceSectionW,
    dense: rt.denseState,
    l: rt.game.selectedId,
    onTarget: (target) => { rt.frameDispatchState.N = target; },
    onProgress: (progressX, progressY, width, height, anchor) => {
      rt.frameHelperCalls.push({ kind: "progress", x: progressX, y: progressY, width, height, anchor });
      // f.a(byte,int,int) offsets 702..815: setColor(0), then helper #437
      // (fillRect at +11/+8) blacks out the empty part of the bar.
      const graphics = rt.offscreenTargets?.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
      graphics?.setColor(0);
      graphics?.fillRect(progressX + 11, progressY + 8, width, height);
    },
    onText: (record, textX, textY, style, row) => {
      rt.frameHelperCalls.push({ kind: "frame-text", record, x: textX, y: textY, style, row });
    },
    onRecord1010: (record, mode, recordX, recordY, row) => {
      rt.frameHelperCalls.push({ kind: "frame-record-1010", record, mode, x: recordX, y: recordY, row });
      if (!rt.offscreenTargets || !rt.packedData || !rt.imageGroups[0]) return;
      const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
      const packed = new LegacyPackedSpriteRenderer({
        shortTables: rt.packedData.shortTables,
        byteTables: rt.packedData.byteTables,
        imageGroups: rt.imageGroups,
        graphics,
      });
      drawLegacy1010({
        start: record,
        selection: mode,
        originY: recordY,
        count: rt.game.frameLayoutAW,
        stride: rt.game.frameLayoutAV,
        aX: rt.game.frameLayoutAX,
        originX: rt.game.frameLayoutAY,
        aZ: rt.game.frameLayoutAZ,
        selectedRow: rt.game.menuCursor,
        av: rt.game.frameLayoutAv,
        r: rt.mainArrays.r,
        s: rt.mainArrays.s,
        recordKind: rt.denseState[BLD_KIND + rt.game.qCounter] ?? 0,
        V: rt.game.zAfCursorVFlag,
        F: rt.game.entityFocusFlag,
        t: rt.game.frameLayoutT,
        u: rt.game.frameLayoutU,
        f: rt.game.animPhase,
        e: rt.game.animStep,
        shortTables: rt.packedData.shortTables,
        onSprite: (asset, assetX, assetY) => packed.drawSprite(asset, assetX, assetY),
        onPacked: (asset, assetX, assetY) => packed.drawComposite(asset, assetX, assetY),
        onEntity: (id, entityX, entityY, arg4, arg5) => rt.stepEntityAction(id, entityX, entityY, arg4, arg5),
        onText: (textX, textY, width, text, value) => {
          rt.frameHelperCalls.push({ kind: "frame-1010-number", x: textX, y: textY, value: Number(text), style: width });
          rt.touchBarNumberX = textX;
          try {
            rt.geometry.queueTextWithWidth(textX, textY, width, text, value);
            rt.geometryRenderer.renderTo(graphics, rt.imageGroups[0]!);
            rt.geometry.reset(); // c.a(Graphics)'s tail: a:B = 0
          } catch {
            // Preserve the original c.a(String) exception boundary.
          }
        },
        onSubrecord: (asset, assetX, assetY, phase) => {
          rt.frameHelperCalls.push({ kind: "frame-1010-subrecord", record: asset, x: assetX, y: assetY, mode: phase });
          rt.stepZSubrecordDraw(asset, assetX, assetY, phase, {
            onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
          });
        },
        onS: () => { rt.game.gameplaySFlag = true; },
      });
    },
    onRecord1137: (record, recordX, recordY, row) => {
      rt.frameHelperCalls.push({ kind: "frame-record-1137", record, x: recordX, y: recordY, row });
      if (!rt.offscreenTargets || !rt.packedData || !rt.imageGroups[0]) return;
      const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
      const packed = new LegacyPackedSpriteRenderer({
        shortTables: rt.packedData.shortTables,
        byteTables: rt.packedData.byteTables,
        imageGroups: rt.imageGroups,
        graphics,
      });
      try {
        drawLegacy1137Composition({
          x: recordX,
          y: recordY,
          commandRecord: record,
          languageState: rt.game.screen,
          selectionIndex: rt.game.Z,
          phase: rt.game.animStep,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          shortTables: rt.packedData.shortTables,
          byteTables: rt.packedData.byteTables,
          onLayout: (rowCount) => {
            // f.c() stores the section length in int field ab;
            // f.aC() uses it as the selector wrap bound.
            rt.game.ab = rowCount;
            rt.touchMenuRows.length = 0;
            rt.touchMenuQ = rt.game.screen;
          },
          onPacked: (packedRecord, packedX, packedY) => {
            rt.frameHelperCalls.push({ kind: "frame-1137-packed", record: packedRecord, x: packedX, y: packedY });
            // f.c(III) offset 153 is b(III) (#535), one sprite: the row's background fill, which erases
            // last frame's cursor. CORRECTED 2026-10-15 (docs/bugs.md BUG-002): rt drew a composite
            // (1766 has none), so every row the cursor had visited kept its triangles.
            packed.drawSprite(packedRecord, packedX, packedY);
          },
          // Q14 (the language list) gets a sixth row, 中文, when the Chinese strings are loaded.
          onExtraRow: rt.game.screen === 14 && rt.zhStrings ? (rowX, rowY) => {
            rt.touchMenuRows.push(rowY);
            rt.geometry.queueZhLabel(rowX, rowY, 1, Array.from(ZH_LANGUAGE_NAME, (text) => ({ text })), 0);
          } : undefined,
          onGeometry: (geometryX, mode, width, geometryRecord, value) => {
            rt.touchMenuRows.push(mode);
            rt.geometry.decodeRecord(geometryX, mode, width, geometryRecord, value);
            rt.frameHelperCalls.push({ kind: "frame-1137-geometry", record: geometryRecord, x: geometryX, y: mode, width, value, active: rt.geometry.activeRows });
          },
          onFlush: () => {
            const geometryCommands = rt.geometryRenderer.emit();
            rt.frameHelperCalls.push({ kind: "frame-1137-active", record: rt.geometry.activeRows });
            rt.frameHelperCalls.push({ kind: "frame-1137-draw-count", record: geometryCommands.length, active: rt.geometry.activeRows });
            for (const draw of geometryCommands.slice(0, 8)) {
              rt.frameHelperCalls.push({
                kind: "frame-1137-draw",
                record: draw.imageIndex,
                x: draw.x,
                y: draw.y,
                width: draw.width,
                height: draw.height,
                sourceX: draw.sourceX,
                sourceY: draw.sourceY,
              });
            }
            rt.geometryRenderer.renderTo(graphics, rt.imageGroups[0]!);
            rt.geometry.reset();
          },
          onSelectionMarker: (kind, markerX, markerY, phase) => {
            rt.frameHelperCalls.push({ kind: "frame-1137-marker", record: kind, x: markerX, y: markerY, mode: phase });
            rt.stepZSubrecordDraw(kind, markerX, markerY, phase, {
              onSpriteRecord: (markerRecord, drawX, drawY) => packed.drawComposite(markerRecord, drawX, drawY),
            });
          },
        });
      } catch (error) {
        rt.frameHelperCalls.push({ kind: "frame-1137-error", message: error instanceof Error ? error.message : String(error) });
        // Preserve f.c()'s broad frame-level exception boundary.
      }
    },
    onKind2: (row, aI, aJ, aK) => {
      rt.frameHelperCalls.push({ kind: "frame-kind2", row, mode: aI, x: aJ, y: aK });
      if (!rt.offscreenTargets || !rt.packedData || !rt.imageGroups[0]) return;
      const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
      const packed = new LegacyPackedSpriteRenderer({
        shortTables: rt.packedData.shortTables,
        byteTables: rt.packedData.byteTables,
        imageGroups: rt.imageGroups,
        graphics,
      });
      const kind2State: LegacyZKind2State = {
        Q: rt.game.zAd14QFlag,
        R: rt.game.zAd14RFlag,
        T: rt.game.frameLayoutT,
        U: rt.game.frameLayoutU,
        aI,
        aJ,
        aK,
        y: rt.game.cursorColumn,
        I: rt.game.cameraColumn,
        W: rt.game.exitPrepWInt,
        K: rt.game.cameraRow,
        X: rt.game.exitPrepXInt,
        aL: rt.game.exitPrepALInt,
        A: rt.game.cursorRow,
        O: rt.game.viewColumns,
        P: rt.game.viewRows,
        f: rt.game.animPhase,
        k: rt.game.tickDivisor,
        S: rt.game.gameplaySFlag,
      };
      stepLegacyZKind2(kind2State, row, {
        onDrawRect: (rectX, rectY, width, height) => {
          rt.frameHelperCalls.push({ kind: "frame-kind2-rect", x: rectX, y: rectY, width, height });
          // #536's b(Graphics,IIII) targets Graphics[M:B] (#76), a
          // *static* field confirmed 0 at its one and only write site
          // (the class static initializer) -- same graphics[0] target
          // stepLegacyR/stepLegacyP already use for the same field.
          const bar = rt.offscreenTargets?.graphics[0];
          if (bar) {
            bar.setColor(1105252);
            bar.drawRect(rectX, rectY, width, height);
          }
        },
        onSubrecord: (index, spriteX, spriteY, phase) => {
          rt.frameHelperCalls.push({ kind: "frame-kind2-sprite", record: index, x: spriteX, y: spriteY, mode: phase });
          rt.stepZSubrecordDraw(index, spriteX, spriteY, phase, {
            onSpriteRecord: (record, drawX, drawY) => packed.drawComposite(record, drawX, drawY),
          });
        },
      });
      rt.game.gameplaySFlag = kind2State.S;
    },
    onKind4: (_row, aI, aJ, aK) => {
      rt.stepZKind4({ aI, aJ, aK }, {
        onSetClip: (clipX, clipY, width, height) => {
          const g = rt.game;
          g.bc = clipX;
          g.bd = clipY;
          g.be = width;
          g.bf = height;
          rt.offscreenTargets?.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3]?.setClip(clipX, clipY, width, height);
        },
      });
    },
    onKind3: (row, aI, aJ, aK, aFValue) => {
      rt.frameHelperCalls.push({ kind: "frame-kind3", row, mode: aI, x: aJ, y: aK, value: aFValue });
      if (!rt.packedData) return;
      const kind3State: LegacyZKind3State = {
        aI,
        aJ,
        aK,
        // f.o:B (#349): the picture index aI 10 hands to c(byte).
        o: rt.game.oByte,
        aF: aFValue,
        u0: rt.mainArrays.uBytes[0] ?? 0,
        e: rt.denseState,
        kRows: rt.mainArrays.kMatrix,
        cBytes: rt.game.frameImageSlots,
        byteRows: rt.packedData.byteTables,
        shortRows: rt.packedData.shortTables,
      };
      stepLegacyZKind3(kind3State, row, {
        // aI 10: c(byte) (#558) reads /pi8 and stores entry o in
        // a:[[Image][2][0]; then drawImage(a[2][0], x, y, anchor) into
        // Graphics[N] -- the cutscene picture. /pi8 is preloaded as
        // imageGroups[2]; a missing entry leaves the slot as it was (the
        // original's catch).
        onPalette: (value) => {
          const image = rt.imageGroups[2]?.get(value)?.image;
          if (image) rt.pi8Slot0 = image;
          rt.shownPicture = value;
        },
        onImage: (_group, _index, imageX, imageY, anchor) => {
          const image = rt.pi8Slot0 ?? rt.imageGroups[2]?.get(0)?.image;
          const target = rt.offscreenTargets?.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
          if (image && target) target.drawImage(image, imageX, imageY, anchor as AnchorValue);
        },
        // aI 11: helper #435 copies the map overview out of Image[c[1]]
        // into Graphics[M] (M:B is 0); its exception is swallowed.
        onRegion: (imageSlot, sourceX, sourceY, width, height, regionX, regionY) => {
          const image = rt.offscreenTargets?.images[imageSlot as 0 | 1 | 2 | 3];
          const target = rt.offscreenTargets?.graphics[0];
          if (!image || !target) return;
          try {
            target.drawRegion(image, sourceX, sourceY, width, height, 0, regionX, regionY, 0);
          } catch {
            // #435 returns false.
          }
        },
        onFiveIntText: (x, mode, width, record, value) => {
          rt.frameHelperCalls.push({ kind: "frame-kind3-five", x, y: mode, width, record, value });
          applyLegacyZFiveIntGeometry(rt.geometry, x, mode, width, record, value);
        },
        onSevenIntText: (x, mode, width, first, second, third, value) => {
          rt.frameHelperCalls.push({ kind: "frame-kind3-seven", x, y: mode, width, record: first, value });
          applyLegacyZSevenIntGeometry(rt.geometry, x, mode, width, first, second, third, value);
        },
      });
    },
    onKText: (textX, textY, command, mode, row, value) => {
      rt.frameHelperCalls.push({ kind: "frame-k-text", x: textX, y: textY, command, mode, row, value });
      if (!rt.offscreenTargets || !rt.imageGroups[0]) return;
      const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
      const textState = {
        aF: value,
        aI: mode + 1,
        aJ: textX,
        aK: textY,
        // f.l:B (#337), the selected unit k(int)'s advance rows and row
        // 1067 read. Was a constant 0 until 2026-10-02, so the unit panel
        // showed unit 0's fields (the "-1"s).
        l: rt.game.selectedId,
      };
      try {
        rt.stepZKText(textState, command, {
          onText: (glyphX, glyphMode, width, text, value) => {
            // c.a(aJ,aK,j[3][row]>>6,String.valueOf(aF),aI-1)
            // maps directly to the compact geometry text entry.
            if (rt.drawingVillagerPanel) rt.villagerPanelDraft.push({ asset: -1, text, x: glyphX, y: glyphMode });
            rt.geometry.queueTextWithWidth(glyphX, glyphMode, width, text, value);
          },
        });
        rt.game.frameCommandAF = textState.aF;
      } catch {
        // Preserve f.k()/c.a(String)'s broad frame exception boundary.
      }
    },
    onCompose: (record, composeX, composeY, width, height, align, font, row, compose) => {
      rt.frameHelperCalls.push({ kind: "frame-compose", record, x: composeX, y: composeY, width, height, align, font, row });
      rt.shownTextRecord = record >= 71 ? record + (rt.packedBytes[rt.packedOffsets[309] + rt.resourceTables.sectionArg] & 0xff) : record;
      // f.a(BII) offsets 962..991: a new text (w != v) starts at row 0;
      // z:I = y:I; c.a(Graphics, y) then draws from row y (the scroll).
      // CORRECTED 2026-09-30: y was never reset and rows always started at 0.
      const g = rt.game;
      if (g.resourceSectionW !== g.vInt) {
        g.resourceSectionW = g.vInt;
        g.frameGenCounterY = 0;
      }
      g.frameGenCounterZ = g.frameGenCounterY;
      if (!rt.offscreenTargets || !rt.imageGroups[0]) return;
      try {
        if (compose) composeLegacyC(
          rt.cComposition,
          rt.packedBytes,
          rt.packedOffsets,
          rt.resourceTables.byteViews,
          rt.resourceTables.offsetViews,
          composeX,
          composeY,
          width,
          height,
          record,
          align,
          font,
          rt.resourceTables.sectionArg,
          rt.zhCompose,
        );
        const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
        const extras = rt.cRenderExtras();
        const imageGroup0 = rt.imageGroups[0];
        const commands = emitLegacyCRenderRow(
          rt.cComposition,
          rt.packedBytes,
          rt.packedOffsets,
          rt.resourceTables.byteViews,
          rt.imageGroups[0],
          g.frameGenCounterY,
          undefined,
          rt.setDialogueEdges,
          {
            ...extras,
            onZhLine: (tokens, m, n, zhFont, stat) => paintZhLine(graphics,
              { ...rt.zhPaintBase(imageGroup0), onIcon: extras.onIcon, onStat: stat }, zhFont, tokens, m, n),
          },
        );
        for (const draw of commands) {
          const image = rt.imageGroups[0].get(draw.imageIndex)?.image;
          if (image) graphics.drawRegion(image, draw.sourceX, draw.sourceY, draw.width, draw.height, 0, draw.x, draw.y, draw.anchor);
        }
      } catch {
        // Preserve c/f's broad exception boundary for malformed rows.
      }
    },
    onRowCommand: (kind, row, record, rowX, rowY, stateAI, aF) => {
      rt.frameHelperCalls.push({ kind: "frame-row-command", row, mode: kind, record: record ?? -1, x: rowX ?? 0, y: rowY ?? 0 });
      if (!rt.offscreenTargets || !rt.packedData) return;
      const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
      const packed = new LegacyPackedSpriteRenderer({
        shortTables: rt.packedData.shortTables,
        byteTables: rt.packedData.byteTables,
        imageGroups: rt.imageGroups,
        graphics,
      });
      if (kind === 0) {
        // f.d(0,row) offsets 0..17: b(aI, aJ, aK) (#535), a single sprite
        // (mostly type 29/30 fills such as panel background 1737), not the
        // a(III) composite -- composite 1737 is empty.
        packed.drawSprite(record ?? 0, rowX ?? 0, rowY ?? 0);
        return;
      }
      if (kind !== 1) return;
      // f.d(1,row) calls f.j(row); aI is the independent decoded
      // b[1][row] value retained in the surrounding object state.
      rt.game.frameCommandAI = stateAI ?? rt.game.frameCommandAI;
      rt.game.frameCommandAJ = rowX ?? rt.game.frameCommandAJ;
      rt.game.frameCommandAK = rowY ?? rt.game.frameCommandAK;
      // The row loop's own aF (d[aE] for a pending row, else 0); the
      // previous command's leftover made the portrait 720 + HP.
      rt.game.frameCommandAF = aF ?? 0;
      rt.consumeFrameCommand(row, {
        onSprite: (asset, spriteX, spriteY) => {
          if (rt.drawingVillagerPanel) rt.villagerPanelDraft.push({ asset, text: "", x: spriteX, y: spriteY });
          packed.drawComposite(asset, spriteX, spriteY);
        },
        onDefaultSprite: (asset, spriteX, spriteY) => {
          if (rt.drawingVillagerPanel) rt.villagerPanelDraft.push({ asset, text: "", x: spriteX, y: spriteY });
          packed.drawComposite(asset, spriteX, spriteY);
        },
        onText: (textX, textY, style, value, mode) => {
          if (rt.drawingVillagerPanel) rt.villagerPanelDraft.push({ asset: -1, text: value, x: textX, y: textY });
          // j(int) offsets 190..246: c.a(x, y, j[3][row]>>6, text, 0).
          // Until 2026-10-01 rt passed (x, mode, text, style): every
          // cost number landed at y 0 with the alignment as its spacing.
          try {
            rt.geometry.queueTextWithWidth(textX, textY, style, value, mode);
            rt.geometryRenderer.renderTo(graphics, rt.imageGroups[0]!);
          } catch {
            // Preserve the original c/f rendering exception boundary.
          }
        },
      });
    },
    onFlush: () => {
      rt.frameHelperCalls.push({ kind: "frame-flush" });
      if (!rt.offscreenTargets || !rt.imageGroups[0]) return;
      try {
        const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
        rt.geometryRenderer.renderTo(graphics, rt.imageGroups[0]);
        rt.geometry.reset();
      } catch {
        // Preserve c.a(Graphics)'s broad frame exception boundary.
      }
    },
    onUnhandled: (kind, row, record, rowX, rowY, group) => rt.frameHelperCalls.push({ kind: "frame-unhandled", mode: kind, row, record: record ?? -1, x: rowX ?? 0, y: rowY ?? 0, group: group ?? -1 }),
  });
  if (result) {
    rt.game.frameCommandAE = result.aE;
    rt.game.frameCommandAF = result.aF;
  }
}
