import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { LegacyPackedSpriteRenderer } from "../render/LegacyPackedSpriteRenderer";
import { drawImageHelper } from "../render/RenderRuntime";
import { drawLegacyMapOverview } from "../render/LegacyMapOverview";
import { stepLegacyP } from "../render/LegacyGameplayPaintTriggers";
import { resetLegacyZI } from "./LegacyZI";
import { stepLegacyGFrame } from "./LegacyGFrame";
import { stepLegacyMFrame } from "./LegacyMFrame";
import { stepLegacySimpleFrameHandler } from "./LegacySimpleFrameHandlers";
import { stepLegacyFrameDispatch, type LegacyFrameDispatchInput } from "./LegacyFrameDispatch";

/** Execute the proven f.F() dispatch after the state-machine step. */
export function stepFrameDispatch(rt: LegacyRuntimeState, 
  callbacks: Omit<LegacyFrameDispatchInput, "state" | "packedBytes" | "packedOffsets" | "stateTableIndex"> = {},
): void {
  rt.framePrimitives.length = 0;
  rt.frameHelperCalls.length = 0;
  rt.frameDispatchState.missionFrame = rt.game.missionFrame;
  rt.frameDispatchState.screen = rt.game.screen;
  rt.frameDispatchState.H = rt.game.H;
  const onHandler = callbacks.onHandler ?? ((handler) => {
    if (handler === "G") {
      // `gState` is hoisted out of the call so S:I/T:I can be written back:
      // G() sets them (offsets 120..129 and 681..690) and f.a(int,byte)'s
      // >= 1000 arm reads them as its projection origin.
      const gState = {
        H: rt.game.H,
        Q: rt.game.screen,
        U: rt.game.U,
        V: 4,
        N: rt.frameDispatchState.N,
        c1: rt.frameDispatchState.c1,
        k: rt.game.zlKBytes,
        flags: rt.game.frameFlags,
        S: rt.game.projectionS,
        T: rt.game.projectionT,
      };
      stepLegacyGFrame({
        state: gState,
        onSurfaceClear: (target) => {
          if (target !== 1 || !rt.offscreenTargets) return;
          rt.offscreenTargets.clear(1, 9422847, 0, -8, 264, 304);
          rt.offscreenTargets.clear(1, 940839, 0, 232, 264, 64);
        },
        onSurfaceCopy: (target, source) => {
          if (target !== 0 || source !== 1 || !rt.offscreenTargets) return;
          rt.offscreenTargets.copy(0, 1, 0, 328, 36);
        },
        onSurfaceHeader: (target) => {
          if (target !== 0 || !rt.offscreenTargets) return;
          rt.offscreenTargets.clear(0, 9422847, 0, 0, 264, 80);
        },
        onTargetChanged: (target) => {
          rt.frameDispatchState.N = target;
        },
        onImageHelper: (resourceId, mode) => {
          rt.frameHelperCalls.push({ kind: "image", resourceId, mode });
          if (resourceId !== 1118) return;
          drawImageHelper(rt, resourceId, mode, gState.S, gState.T);
        },
        onDrawHelper: (resourceId, x, y) => {
          rt.frameHelperCalls.push({ kind: "draw", resourceId, x, y });
          if (resourceId >= 0 && rt.packedData && rt.offscreenTargets) {
            const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
            new LegacyPackedSpriteRenderer({
              shortTables: rt.packedData.shortTables,
              byteTables: rt.packedData.byteTables,
              imageGroups: rt.imageGroups,
              graphics,
            }).drawComposite(resourceId, x, y);
          }
        },
        onFrameCommand: (command, x, y) => rt.drawFrameCommandPrimitive(command, x, y),
        geometry: rt.gGeometry,
        randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
        onPrimitive: (index, x, y) => {
          rt.framePrimitives.push([index, x, y]);
          callbacks.onPrimitive?.(index, x, y);
        },
      });
      // Write S:I/T:I back: G() owns them, and c(int,int) reads/writes the
      // same two fields outside rt handler.
      rt.game.projectionS = gState.S;
      rt.game.projectionT = gState.T;
      rt.frameDispatchState.H = false;
      return;
    }
    if (handler === "P") {
      stepLegacyP(rt.pFrameState, rt.offscreenTargets?.graphics ?? [], {
        // f.n() is rt handler's onScroll below.
        // Q()'s j() (offset 487): the world update during a cutscene. Was
        // left unwired on a double-run worry, but h()'s j() only runs for
        // v == 1 and P()/Q() only for v == 0 (oracle 2026-10-08).
        onJ: () => rt.stepOriginalJ(),
        // 2026-08-22: private void i() (#610) wired -- resetLegacyZI,
        // the SAME shared reset also called from stepGameplayZAh's onI
        // and stepLegacyGameplayTick's three real call sites.
        onI: () => resetLegacyZI(rt.game),
        // R()'s n() (offsets 57, 85): the camera step that redraws the
        // terrain into Image[c[1]]. main.ts only runs it for v == 1, and a
        // dialogue over the map is v == 0 -- the terrain stayed black.
        onScroll: () => rt.stepCameraScroll(),
        // R() offsets 146..192: helper #435 copies the map band out of
        // Image[c[1]] into Graphics[c[0]]; its exception is swallowed.
        onPartialBlit: (height, destY) => {
          const slots = rt.game.frameImageSlots;
          const target = rt.offscreenTargets?.graphics[slots[0] as 0 | 1 | 2 | 3];
          const image = rt.offscreenTargets?.images[slots[1] as 0 | 1 | 2 | 3];
          if (!target || !image) return;
          try {
            target.drawRegion(image, 0, 120, 264, height, 0, 0, destY, 0);
          } catch {
            // #435 returns false.
          }
        },
        onGameplayDraw: () => rt.stepGameplayOuterLoop(rt.offscreenTargets?.graphics[rt.pFrameState.targetSlot]),
        // onPopulateItems (f.O()) -- CORRECTION (2026-08-24): the SAME
        // already-ported/wired stepLegacyO the "K"/"M" handlers' own onO
        // use (see the "M" handler's onO comment above); was previously
        // left as a stale "not yet resolved" no-op despite the target
        // already existing.
        onPopulateItems: () => rt.stepLegacyO(),
        onElementScan: (aD, x, y) => {
          rt.framePrimitives.push([aD, x, y]);
          callbacks.onPrimitive?.(aD, x, y);
          rt.drawFrameCommandPrimitive(aD, x, y);
        },
        // f.d(IIII)/LegacyZSubrecordDraw (#572), bytecode/f-javap.txt
        // offsets 292..355 of P()'s own tableA0===1 branch -- two calls,
        // records `98+tableA28` and `104`, both at (120,176), targeting
        // the SAME `graphics[targetSlot]` (field #79/N:B, written 0 two
        // instructions earlier at offset 258, exactly like R()'s own
        // established targetSlot=0-then-call pattern rt class already
        // follows for onGameplayDraw above). 2026-08-31/09-02: found
        // unwired via live trace (Q=17, al=2, the story-dialog screen) --
        // rt callback fires every frame there, and its silent drop is
        // exactly why the canvas's middle ~2/3 painted pure black: the
        // same branch clears that region two calls earlier
        // (`bar.fillRect(11, 120, 240, 128)`, LegacyGameplayPaintTriggers
        // .ts's stepLegacyP) and nothing else was left to redraw it.
        onSpriteDraw: (record, x, y, phase) => {
          rt.frameHelperCalls.push({ kind: "p-sprite", record, x, y, mode: phase });
          if (!rt.offscreenTargets || !rt.packedData || !rt.imageGroups[0]) return;
          const graphics = rt.offscreenTargets.graphics[rt.pFrameState.targetSlot];
          const packed = new LegacyPackedSpriteRenderer({
            shortTables: rt.packedData.shortTables,
            byteTables: rt.packedData.byteTables,
            imageGroups: rt.imageGroups,
            graphics,
          });
          rt.stepZSubrecordDraw(record, x, y, phase, {
            onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
          });
        },
        randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
      });
    } else if (handler === "H" || handler === "I" || handler === "J" || handler === "K" || handler === "L" || handler === "N") {
      stepLegacySimpleFrameHandler(handler, rt.simpleFrameState, {
        // L()'s C() (#405): the whole map overview, drawn once on entry.
        onC: () => drawLegacyMapOverview(rt.mapOverviewInput()),
        // 2026-08-26: confirmed via direct bytecode read (I()/J()/K()/L()/
        // N(), all `invokespecial #438 // Method a:(BII)V`) that rt is
        // the SAME f.a(byte,int,int) call onElementScan wires elsewhere --
        // now reuses the same tested drawFrameCommandPrimitive pipeline
        // instead of only tracing.
        onPrimitive: (index, x, y) => {
          rt.framePrimitives.push([index, x, y]);
          callbacks.onPrimitive?.(index, x, y);
          rt.drawFrameCommandPrimitive(index, x, y);
        },
        // f.K()'s onU (f.u(), case "K" only -- I()/J()/L()/N() don't call
        // it) wired 2026-08-14, same stepGameplayOuterLoop() as R()'s
        // onGameplayDraw (see that method's own docblock). Like am(),
        // K()'s own bytecode never writes N:B (#79) before calling u()
        // -- reads the live game.targetSlot instead of assuming 0
        // (second pass, 2026-08-14).
        onN: () => rt.stepCameraScroll(),
        onU: () => rt.stepGameplayOuterLoop(rt.offscreenTargets?.graphics[rt.game.targetSlot]),
        // onO (f.O(), offsets 0..232) -- CORRECTION 2026-08-18: rt is
        // the SAME already-ported/tested `stepLegacyO` S()'s own onO
        // callback already uses (confirmed: only one `private void O()`
        // declaration exists in the whole class; K()'s bytecode calls
        // it directly at offset 25-28, `invokespecial #417 // Method
        // O:()V`, right after n()/u() in the same order rt dispatch
        // already calls onN/onU/onO) -- was previously left as a stale
        // "remains unresolved" comment despite the target already
        // existing.
        onO: () => rt.stepLegacyO(),
        // This callback lives inside stepLegacySimpleFrameHandler's own
        // "case P" branch, which handler === "P" never reaches here (see
        // the real dispatch above -- "P" is fully handled before rt
        // call). Dead code either way, but fixed for consistency:
        // f.P()'s own i() call (#610) -- see the real, reachable stepLegacyP
        // wiring's own onI for the live equivalent.
        onInputReset: () => resetLegacyZI(rt.game),
      });
    } else if (handler === "M") {
      rt.mFrameState.a = rt.packedOffsets;
      rt.mFrameState.bytes = rt.packedBytes;
      rt.mFrameState.H = rt.game.H;
      rt.mFrameState.I = rt.game.I;
      rt.mFrameState.m = rt.game.mByte;
      stepLegacyMFrame({
        state: rt.mFrameState,
        // f.M()'s onO -- CORRECTION (2026-08-24): confirmed via direct
        // bytecode read (offset 13, `invokespecial #417 // Method
        // O:()V`) to be the SAME already-ported/wired `stepLegacyO`
        // K()'s own onO already uses (see that callback's own comment
        // above) -- was previously left as a stale empty no-op.
        onO: () => rt.stepLegacyO(),
        emit: (command) => rt.applyMFrameCommand(command),
      });
      rt.game.H = rt.mFrameState.H;
      rt.game.I = rt.mFrameState.I;
      rt.game.mByte = rt.mFrameState.m;
    }
  });
  stepLegacyFrameDispatch({
    ...callbacks,
    // The handlers write game.H directly; re-sync the copy so the write-back
    // below does not undo it. (Until 2026-10-01 it did, and every handler
    // re-ran its H:Z first-entry block each frame.)
    onHandler: (handler) => {
      onHandler(handler);
      rt.frameDispatchState.H = rt.game.H;
    },
    // 2026-08-26: the Q=18/24/32 inline branches' own onPrimitive calls
    // (bytecode-confirmed invokespecial #438 // Method a:(BII)V, same as
    // I()/J()/K()/L()/N()/onElementScan) previously only reached
    // callbacks.onPrimitive, which main.ts's zero-argument
    // stepFrameDispatch() call never supplies -- wired to the same
    // tested pipeline here.
    onPrimitive: (index, x, y) => {
      rt.framePrimitives.push([index, x, y]);
      callbacks.onPrimitive?.(index, x, y);
      rt.drawFrameCommandPrimitive(index, x, y);
    },
    state: rt.frameDispatchState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    stateTableIndex: 153,
  });
  rt.game.H = rt.frameDispatchState.H;
}

