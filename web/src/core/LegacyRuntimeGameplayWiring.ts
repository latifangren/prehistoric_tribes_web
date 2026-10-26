import type { LegacyRuntimeState } from "./LegacyRuntimeState";
import { LEGACY_SPATIAL_LAYER_INDEX, liveView } from "./LegacyRuntimeState";
import { stepLegacyASAudioWait } from "../audio/LegacyAudioTransitions";
import { OriginalMidiPlayer } from "../platform/Audio";
import { selectLegacyResourceSection } from "../platform/LegacyResourceTables";
import { stepCameraFollow } from "../render/CameraRuntime";
import type { LegacyCameraFrameLetterboxState } from "../render/LegacyCameraFrame";
import { subsystemDecision } from "../sim/tribe/TribeRuntime";
import {
  stepLegacyAf,
  stepLegacyAg,
  stepLegacyAh,
  stepLegacyAi,
  type LegacyAfState,
  type LegacyGroupKeyState,
} from "../sim/units/LegacyUnitSelection";
import { decodeLegacyMapTiles, type LegacyRawMap } from "../sim/world/LegacyMapRleDecoder";
import { markLegacySpatialRecord } from "../sim/world/LegacySpatialRecordUpdate";
import { stepBuildingEconomy } from "../sim/world/WorldRuntime";
import { releaseLegacyEntitySelection } from "../ui/LegacyEntitySelectionRelease";
import { stepLegacyFPairCommand, type LegacyFPairCommandInput } from "../ui/LegacyFPairCommand";
import type { LegacyMFrameCommand } from "../ui/LegacyMFrame";
import {
  beginLegacyEntityAction,
  stepLegacyAd,
  stepLegacyAe,
  stepLegacyAn,
  stepLegacyAr,
  type LegacyAmInput,
} from "../ui/LegacyStateMachine";
import { stepLegacyZAh } from "../ui/LegacyZAh";
import { stepLegacyZAj } from "../ui/LegacyZAj";
import { resetLegacyZI } from "../ui/LegacyZI";
import { stepStateAm, stepStateAQAudio } from "../ui/UiStateRuntime";

/**
 * private void j() (#613): h() runs it for v == 1, and Q() runs it during
 * cutscenes (v == 0) once aR > 0 -- which is how the world keeps moving
 * behind a dialogue. Shared by both call sites since 2026-10-08 (oracle).
 */
export function stepOriginalJ(rt: LegacyRuntimeState): void {
  rt.stepFrame({
    map: rt.gridC,
    // f.j() offset 134: f.c(int,int,int,int), the repaint of a cleared
    // -114..-116 cell. Wired 2026-09-27.
    repairCell: (x, y, width, height) => rt.repaintRect(x, y, width, height),
    // f.j() offsets 143..167: `if (P && w != 4 && w != 3) Z();`
    // (invokespecial #428). WIRED 2026-09-14: LegacyFrameStep already
    // called `flushPending?.()` and cleared P afterwards, but no caller
    // ever supplied it, so Z() never ran from here. That is what kept the
    // Build submenu empty: af()'s `r[as] == 10` branch only sets flag 6
    // and P, relying on this call to rebuild r[] from table 137.
    flushPending: () => { rt.stepFrameSelectionTransition(); },
    // b.g()/b.e()/b.h()/b.i(), all four originally wrapped in ONE
    // shared try/catch inside f.j() itself (confirmed via direct
    // bytecode read, f-javap.txt offsets 0..28 -> 31, pop) -- which
    // is exactly this stepFrame() call's own try/catch around
    // updateSubsystem(), so it doesn't need a second one here.
    // b.g() (LegacySubsystemBuildingEconomy.ts) calls b.n()
    // (LegacySubsystemVoidN.ts) whenever game.missionFrame%10===0.
    // RETRACTED (2026-09-04/05): n() is NOT a guaranteed throw (its
    // own c:[[[B]#151 field is not permanently null -- see that
    // file's own docblock); it now runs its real spatial-hash
    // rebuild every 10th tick instead of skipping e()/h()/i()
    // (stepSubsystemFrame()) for that tick. RETRACTED (2026-09-07):
    // the line that used to be here ("every other tick, g() absorbs
    // its own separate b.ax() throw internally") is also gone --
    // ax() is not a guaranteed throw (see LegacySubsystemAx.ts) and
    // now runs for real every tick.
    updateSubsystem: () => {
      stepBuildingEconomy(rt);
      rt.stepSubsystemFrame();
    },
  });
}

/**
 * Exact final void b(int) (bytecode/f-javap.txt offsets 0..417, the FULL
 * method -- both signs of `value` and their shared offset-54 tail).
 *
 * UNIFICATION (2026-08-31): this method used to be a second, incomplete
 * port of `f.b(int)` -- only its own S()/T() dispatch for non-negative
 * `value` (offsets 0..~54), immediately `return`ing on negative `value`
 * with the comment "negative branch: unrelated, not ported". That was
 * itself already corrected once (see the 2026-08-31 commit routing
 * `ao()`'s `onB(-1)` to `stepSubsystemStateCommand` instead), but this
 * method's OWN body still duplicated S()/T() via a second, independently
 * bytecode-derived set of helpers (`stepLegacyS`, `stepLegacyTAi3/37/38/
 * 45/48`) that wrote into `game.*` fields, while `stepSubsystemStateCommand`
 * -- reachable only from `ao()`'s onB and from `stepStateU`'s own
 * recursive `onB` -- used `stepLegacyStateS`/`stepLegacyStateT` writing
 * into the separate `stateCommandState` bag. Same real fields (`ai:B`
 * #200, `aj:B` #202, `ak:B` #204, etc.), two storage locations that never
 * saw each other's writes: this method's own positive calls (S()'s own
 * `ak=0`/`aj=pageCount` reset) landed in `game.akByte`/`game.ajByte`,
 * while `ao()`'s negative paging calls read/wrote `stateCommandState.ak`/
 * `.aj` -- so the page counter `ao()` paged against was permanently stuck
 * at its zero default, `ak===aj-1` never held, and `U()` (which fires the
 * `Q` transition once paging completes) never ran. This is why Q=18
 * paged forever. Re-deriving `stepLegacyS` against the real bytecode
 * while investigating also turned up an independent real bug in it (an
 * inverted condition AND a missing `ao:B` field write at offsets 83..127
 * -- see the deleted method's git history), so it was not even a
 * faithful duplicate, just a duplicate.
 *
 * Now delegates entirely to `stepSubsystemStateCommand`, the complete,
 * single, bytecode-faithful port (`LegacyStateTransitionCommand.ts` +
 * `LegacyStateS.ts` + `LegacyStateT.ts` + `LegacyStateU.ts`, all writing
 * through the shared `stateCommandState` bag which `stepSubsystemStateCommand`
 * syncs in/out of `game.*` around the call) -- the exact same pattern
 * `ao()`'s onB already established. All of this method's own real
 * callers (`am()`'s `onBByte`, `i()`'s and `b.i()`'s own `onFByte`,
 * `aq()`'s `onEntitySignal`) only ever pass non-negative `value`, so this
 * change is purely additive for them (they now also get the previously-
 * missing offset-54+ shared tail and the ai===45 bugfix below), while
 * `ao()`'s own onB(-1) is unaffected (same underlying function either way).
 */
export function runSceneDispatch(rt: LegacyRuntimeState, value: number): void {
  rt.stepSubsystemStateCommand(value);
}

/** Exact f.h() maintenance call: f.a(100,0,0,0). */
export function stepByteActionQueueMaintenance(rt: LegacyRuntimeState): void {
  rt.runByteActionQueue(100, 0, 0, 0);
}

/**
 * Default f.am() bridge used by f.ak() for Q=22/23.  The T=0 branch now
 * reaches the proven map-entry chain; the T=1 e(int) action remains an
 * explicit unresolved boundary and therefore returns false without inventing
 * resource semantics.
 */
export function stepDefaultAm(rt: LegacyRuntimeState): void {
  // Live, not a snapshot (2026-09-23): onBByte's scene dispatch and
  // onWReset write these same fields mid-method.
  const state = liveView<LegacyAmInput["state"]>(rt.game, {
    Q: "screen", R: "R", H: "H", T: "actionT", q: "mission", uCounter: "uByte", tByte: "tByte",
    W: "actionWFlag", vInt: "vInt", A: "AFlag", vByte: "loopMode", mByte: "mByte",
  });
  stepStateAm(rt, {
    state,
    onGByte: () => false,
    onMapEntry: (q) => rt.stepMapEntry(q),
    onResourceAction: (slot) => rt.saveOriginalResourceAction(slot),
    onWReset: () => { rt.game.actionWFlag = false; },
    // am() offset 240: n().
    onN: () => rt.stepCameraScroll(),
    // f.am()'s own onU (f.u()), wired 2026-08-14, same
    // stepGameplayOuterLoop() as R()'s onGameplayDraw and K()'s onU.
    // Unlike R() (which sets targetSlot=0 itself before calling), am()'s
    // bytecode reaches u() with whatever N:B (#79) currently holds --
    // no local write of its own -- so this reads the live game.targetSlot
    // instead of assuming 0 (second pass, 2026-08-14: entity draws now
    // reachable here too, not just classification).
    onU: () => rt.stepGameplayOuterLoop(rt.offscreenTargets?.graphics[rt.game.targetSlot]),
    // f.b(int), wired 2026-08-18: am()'s T===0 branch, when it lands on
    // Q===18, calls f.b(packedBytes[packedOffsets[303]+q]) -- this is
    // T()'s only real caller, and T()'s ai===37 branch is what actually
    // triggers finalizeEntity() automatically (via b.l()). See
    // docs/unknowns.md for the full traced chain.
    onBByte: (value) => { rt.runSceneDispatch(value); },
    // T == 0 landing on Q == 18: a(ZZZZ) (#434) at offset 42; wired 2026-09-27.
    onSelectionSync: (a, b, c, d) => { rt.runSelectionFlagsRefresh(a, b, c, d); },
    // T == 2 (set by aD()'s Q == 31 branch): f.d(int), load the saved
    // game from slot 1 (q < 7) or 2. WIRED 2026-09-24 -- it was missing, so
    // a saved game could never be loaded back from the menu.
    onD: (slot) => rt.loadGameplayFromStore(slot as 1 | 2),
  });
}

/**
 * Execute the exact pre-h() private f.aS() phase from run(). Browser timing
 * replaces Thread.yield/sleep; all bytecode-visible state writes remain.
 */
export function stepOriginalWaitPhase(rt: LegacyRuntimeState): void {
  const fields = rt.game.audioWaitFields();
  stepLegacyASAudioWait({
    state: fields,
    onStopWait: () => { /* repaint/yield is supplied by the browser loop */ },
    onAQ: () => rt.startOriginalAudio(),
    onSleep: () => { /* fixed loop owns pacing */ },
  });
  rt.game.applyAudioWaitFields(fields);
}

/** Runtime bridge for the confirmed f.aQ() MIDI track/player lifecycle. */
export function startOriginalAudio(rt: LegacyRuntimeState): void {
  if (!rt.midiResource) return;
  const state = {
    h: rt.game.audioH,
    e: rt.game.eByte,
    currentTrack: rt.game.audioCurrentTrack,
    currentPlayerReady: rt.game.playerExists ? 101 : 0,
    currentPlayerTrack: rt.game.audioCurrentTrack,
  };
  stepStateAQAudio(rt, {
    state,
    // aQ() offset 4: b.k() (#618) sets f.h:B, the track pair aQ() picks
    // from. Ported but never called until 2026-09-27, so h never changed.
    onSubsystemDecision: () => {
      const g = rt.game;
      g.audioH = subsystemDecision(rt, {
        fV: g.loopMode, fN: g.callToArmsActive, fL: g.formUpActive,
        bO: rt.subsystemArrays.bO, bK: rt.subsystemArrays.bField28, bN: rt.subsystemArrays.bN,
        fQ: g.mission,
      });
      state.h = g.audioH;
    },
    audioTable: rt.audioTable,
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    onStop: () => {
      rt.midiPlayer?.stop();
      rt.midiPlayer = undefined;
      rt.game.playerExists = false;
    },
    onCreate: (path, type) => {
      const track = Number(path.slice(2));
      if (!Number.isInteger(track) || track < 0 || track >= rt.audioTable.length) return;
      rt.game.audioCurrentTrack = track;
      rt.midiPlayer = new OriginalMidiPlayer(rt.midiResource!, type, track);
      rt.midiPlayer.start();
      rt.game.playerExists = true;
    },
    onSetMode: (value) => { rt.game.eByte = value; },
  });
}

/**
 * Shared `f.a:Lc;` → `c.a(int)` trigger (constant-pool #459 at every real
 * call site), already fully ported as `selectLegacyResourceSection` and
 * wired via `stepStateS`'s own `onCSelector` (the ONLY `S()` port since
 * the 2026-08-31 duplicate-port unification -- see `runSceneDispatch`'s
 * own docblock) but never exposed as a reusable call for OTHER real
 * `c.a(int)` call sites. Confirmed via direct bytecode read
 * (bytecode/f-javap.txt) that f.ao()'s value===1/3 branches (`onCByte`),
 * f.aq()'s m>0 branch (`onSound`), and f.av() (`onCByte`) all invoke this
 * exact method with different literal arguments (70/74/70+m/75) -- same
 * target, different call sites, matching this project's established
 * "one real method, several differently-named callback call sites"
 * pattern.
 */
export function selectResourceSection(rt: LegacyRuntimeState, value: number): void {
  selectLegacyResourceSection(
    rt.resourceTables,
    rt.packedBytes,
    rt.packedOffsets,
    value,
    () => { rt.game.resourceSectionW = -1; },
    // c.b(2) skips a missing resource (null stream, offset 96), which is
    // also what a runtime without language files attached gets.
    () => { if (rt.languageResources) rt.loadLanguageResource(2); },
  );
}

export function applyMFrameCommand(rt: LegacyRuntimeState, command: LegacyMFrameCommand): void {
  if (command.kind === "primitive") {
    rt.framePrimitives.push([command.index, command.x, command.y]);
    rt.drawFrameCommandPrimitive(command.index, command.x, command.y);
    return;
  }
  if (!rt.offscreenTargets) return;
  if (command.kind === "drawImage") {
    rt.offscreenTargets.graphics[command.graphicsIndex].drawImage(
      rt.offscreenTargets.images[command.imageIndex], command.x, command.y, command.anchor,
    );
  } else if (command.kind === "drawRegion") {
    rt.offscreenTargets.graphics[command.graphicsIndex].drawRegion(
      rt.offscreenTargets.images[command.imageIndex],
      command.sx, command.sy, command.width, command.height,
      command.transform, command.x, command.y, command.anchor,
    );
  }
}

/**
 * f.aD(), bytecode/f-javap.txt offsets 0..309.
 *
 * BUG FIX (2026-09-09): this bridge used to copy only 6 of
 * `LegacyAdState`'s 21 fields in and the same 6 back out
 * (`Q`/`q`/`R`/`H`/`vInt`/`vByte`). Everything the two branches actually
 * compute landed on the throwaway `this.adState` object and was silently
 * dropped:
 *
 *  - Q=28 (offsets 122..235, the real gameplay-entry branch): `A:Z`(#36)
 *    `= true`, `c:Z`(#261) `= false`, and the four saved-state restores
 *    `y:B=z:B`, `A:B=B:B`, `I:B=J:B`, `K:B=L:B`. Only `v:B = 1` survived,
 *    because `vByte` happened to be one of the six.
 *  - Q=31 (offsets 0..112): `s:B`/`t:B`/`T:B` and the shared tail
 *    `b:B(#243) = c:B(#265)`.
 *
 * `A:Z` is `f.n()`'s one-shot full-redraw trigger, so its loss is exactly
 * why entering a map never redrew the terrain window into the offscreen
 * buffer -- measured live: after `stepDefaultAd()` with Q=28,
 * `adState.AFlag === true` while `game.AFlag` stayed `false`, and
 * `game.cameraColumn`/`KByte` stayed 0 instead of taking `JByte`/
 * `cameraSavedKByte`. See docs/unknowns.md's 2026-09-09 entry.
 *
 * Field identities (constant-pool indices confirmed individually, never
 * by letter): `A:B`#34=`AByte`, `B:B`#37=`BByte`, `y:B`#387=`yByte`,
 * `z:B`#390=`zByte` (the `z=y`/`B=A` save half is at f-javap.txt offsets
 * 311..322 and four other sites), `I:B`#60=`IByte`, `J:B`#65=`JByte`,
 * `K:B`#68=`KByte`, `L:B`#72=`cameraSavedKByte` (NOT `frameLayoutL`, which is
 * the lowercase `l:B`#337 -- the trap this project has already hit once),
 * `c:Z`#261=`cFlag`, `T:B`#103=`actionT`, `s:B`#362/`t:B`#366=
 * `sByte`/`tByte`, `c:B`#265=`progressC` (written by `d(int)`'s record
 * read, only other reader is `e(int)`'s writer), `b:B`#243=`levelBByte`
 * (the byte `aP()` offset 257 reads into create-record coordinates),
 * `a:[Z`#123=`selectionFlags`.
 */
export function stepDefaultAd(rt: LegacyRuntimeState): void {
  stepLegacyAd({
    state: rt.adState,
    // f.aD()'s own call to private void i() (#610, offset 232 -- CORRECTION
    // 2026-08-22: was wired to the unrelated resetInputTransientState(),
    // whose own 17+ fields don't match #610's real 13 at all; see
    // docs/unknowns.md).
    onInputReset: () => resetLegacyZI(rt.game),
    onY: () => stepCameraFollow(rt),
    // Offset 181, `invokespecial #464 // Method a:(ZZZZZZZZZ)V` -- the
    // same 9-arg method `runSelectionFlagsRefresh` already wraps.
    onSelection: (v) => rt.runSelectionFlagsRefresh(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8]),
    // Offset 295, `invokespecial #434 // Method a:(ZZZZ)V` -- confirmed
    // (see runSelectionFlagsRefresh's own docblock) to be a trivial
    // wrapper that calls #464 with the last five arguments hardcoded
    // false, which is exactly this default-parameter call.
    onFourFlags: (v) => rt.runSelectionFlagsRefresh(v[0], v[1], v[2], v[3]),
    // Offset 250, `invokespecial #407 // Method E:()V`.
    onE: () => rt.stepLegacyExitPreparation(),
  });
}

/**
 * Raw f.aE(): the five-tick cooldown timer V()'s `inputT && wByte!==3`
 * branch triggers (see LegacyGameplayInput.ts's `onAE`). Reachable live
 * (2026-08-14) now that `onAE` calls this instead of staying inert --
 * closes out the "aE() caller timing" gap noted in parity-checklist.md.
 * `onFourFlags` (f.a(ZZZZ) #434, offset 48) and `onAI` (f.aI() #490,
 * offset 83) wired 2026-09-27; both were ported but left inert.
 */
export function stepAe(rt: LegacyRuntimeState): void {
  rt.aeState.F = rt.game.aeTimerF;
  rt.aeState.byteF = rt.game.selectionGroup;
  rt.aeState.uFlag = rt.game.boxSelecting;
  rt.aeState.tFlag = rt.game.inputT;
  rt.aeState.k = rt.game.kByte;
  rt.aeState.q = rt.game.qCounter;
  rt.aeState.y = rt.game.cursorColumn;
  rt.aeState.I = rt.game.cameraColumn;
  rt.aeState.A = rt.game.cursorRow;
  rt.aeState.K = rt.game.cameraRow;
  rt.aeState.G = rt.game.boxAnchorColumn;
  rt.aeState.HCoord = rt.game.boxAnchorRow;
  stepLegacyAe({
    state: rt.aeState,
    onFourFlags: (v) => { rt.runSelectionFlagsRefresh(v[0], v[1], v[2], v[3]); },
    onAI: () => stepLegacyAi({ a4: rt.mainArrays.aByte[4]!, dense: rt.denseState }),
  });
  rt.game.aeTimerF = rt.aeState.F;
  rt.game.selectionGroup = rt.aeState.byteF;
  rt.game.boxSelecting = rt.aeState.uFlag;
  rt.game.inputT = rt.aeState.tFlag;
  rt.game.kByte = rt.aeState.k;
  rt.game.qCounter = rt.aeState.q;
  rt.game.boxAnchorColumn = rt.aeState.G;
  rt.game.boxAnchorRow = rt.aeState.HCoord;
}

/** Apply the proven f.an() table/state branches with unresolved callbacks inert. */
export function stepDefaultAn(rt: LegacyRuntimeState): void {
  rt.anState.selection = rt.stateCommandState.dFlags; // f.d:[Z] (#267)
  stepLegacyAn({
    state: rt.anState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    onDestroy: () => { rt.game.b = false; },
    // Wired 2026-09-27 (declared but never passed): l(-1) at Q=25, e(0) at
    // Q=12, and a(ZZZZZZZZZ) restoring the selection at Q=20 -- the same
    // targets ap() uses.
    onRelease: (value) => rt.stepLegacyL(value),
    onEZero: () => { rt.saveOriginalResourceAction(0); },
    onSelectionSync: (v) => rt.runSelectionFlagsRefresh(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8]),
  });
}

/** Execute f.ar() against the live f.ao() field bank. */
export function stepDefaultArFromAo(rt: LegacyRuntimeState): void {
  // Live (2026-09-23): onAM's aM() writes these fields itself.
  const state = Object.assign(
    liveView<Omit<Parameters<typeof stepLegacyAr>[0]["state"], "g">>(rt.game, {
      vInt: "vInt", Q: "screen", U: "U", Z: "Z", c: "missionFrame", T: "actionT", q: "mission", R: "R", eByte: "eByte",
      ac: "acFlag", pByte: "persistedPByte", s: "sByte", t: "tByte", H: "H",
    }),
    { g: 0 },
  );
  stepLegacyAr({
    state,
    onDestroy: () => { rt.game.b = false; },
    onAM: () => rt.resetMapEntryAllocation(rt.game.mission),
    onAQ: () => { rt.startOriginalAudio(); },
    // v=62 (new game over a saved one: s = -1, t = -2) ends with e(0)
    // (#589, offset 260) -- the progress save, not a map load as this
    // used to say. Wired 2026-09-27, so the reset progress is written.
    onGByte: (slot) => rt.saveOriginalResourceAction(slot),
  });
}

/** Enter the confirmed f.a(byte,byte,byte) prefix from the live W() path. */
export function beginEntityAction(rt: LegacyRuntimeState, ap: number, am: number, an: number): void {
  const state = rt.entityActionState;
  // Body from offset 43 on. The 0..42 entry gate is in
  // entityActionPrompt(); f.W() calls this directly with 20, which the
  // gate always passes. RETRACTED 2026-09-23: f.W() is not the only
  // caller -- b.a(byte,int,int) (#274) and b.t() (#417) call it too.
  // MERGED (2026-08-31): was `this.game.zInt = 0`, a second name for this
  // same real field (#120) -- see `game.Z`'s own docblock.
  rt.game.Z = 0; // Z:I (#120), offset 43..45
  rt.game.oInt = 0; // o:I (#348), offset 48..50
  beginLegacyEntityAction({
    state,
    ap,
    am,
    an,
    selection: rt.game.selectionFlags,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    // final void a(byte,byte,byte)'s own call to private void i() (#610,
    // offset 54), immediately followed (offset 62..83, no branch between
    // them) by v:B=0/H:Z=true/v:I=12+arg1 -- all bundled into this one
    // callback since they're one unbroken run of bytecode.
    onTransientReset: () => {
      resetLegacyZI(rt.game);
      rt.game.loopMode = 0; // v:B (#376)
      rt.game.H = true; // H:Z (#57)
      rt.game.vInt = 12 + ap; // v:I (#375)
    },
    onSelectionCopy: (values) => { rt.stateCommandState.dFlags.splice(0, 9, ...values); },
    onSelectionApply: (a, b, c, d) => rt.runSelectionFlagsRefresh(a, b, c, d),
    onAFlag: () => { rt.game.AFlag = true; },
  });
}

/** f.e(int) (#590): take one unit out of the selection groups. */
export function stepSelectionE(rt: LegacyRuntimeState, id: number): void {
  releaseLegacyEntitySelection({
    groups: rt.mainArrays.aByte,
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    id,
    F: rt.game.selectionGroup,
    w: rt.game.barMode,
    onModeReset: () => { rt.game.barMode = 0; },
    onFReset: () => { rt.game.selectionGroup = -1; },
  });
}

/**
 * f.aF() (#487): select every team-0 unit in the window B..E (d(byte)'s
 * double-tap sets it to the viewport). WIRED 2026-09-23.
 */
export function selectWindowUnits(rt: LegacyRuntimeState): void {
  const a4 = rt.mainArrays.aByte[4]!;
  stepLegacyAf({
    state: liveView<LegacyAfState>(rt.game, {
      uFlag: "boxSelecting", tFlag: "inputT", F: "selectionGroup", k: "kByte", w: "barMode",
      B: "BCounter", C: "CCounter", D: "DCounter", E: "ECounter",
    }),
    map: rt.gridC,
    dense: rt.denseState,
    a4,
    onAI: () => stepLegacyAi({ a4, dense: rt.denseState }),
    onD: (id) => rt.stepLegacyD(id),
  });
}

/** f.aG()/f.aH() (#488/#489): keys 7/9 held store the selection as group 2/3, tapped recall it. WIRED 2026-09-23. */
export function stepGroupKey(rt: LegacyRuntimeState, store: boolean): void {
  const state = liveView<LegacyGroupKeyState>(rt.game, {
    wFlag: "wFlag", I: "inputI", i: "digitKey", F: "selectionGroup", k: "kByte", w: "barMode",
  });
  const common = {
    state,
    a: rt.mainArrays.aByte,
    dense: rt.denseState,
    onFourFlags: (v: boolean[]) => rt.runSelectionFlagsRefresh(v[0]!, v[1]!, v[2]!, v[3]!),
  };
  if (store) {
    stepLegacyAg({ ...common, onEntityTick: (id) => rt.stepSelectionE(id) });
  } else {
    stepLegacyAh({
      ...common,
      onAI: () => stepLegacyAi({ a4: rt.mainArrays.aByte[4]!, dense: rt.denseState }),
      onJump: (id, offset) => rt.stepEntityCoordinateUpdate(id, offset),
    });
  }
}

/** f.ah() (#509), LegacyZAh.ts, on the live game fields. */
export function stepZAh(rt: LegacyRuntimeState): void {
  const g = rt.game;
  // Live: the w == 4 path's l(-1) writes P and w itself.
  const ahState = liveView<Parameters<typeof stepLegacyZAh>[0]>(g, {
    K: "choosingChief", P: "pendingP", w: "barMode", k: "kByte", fByte: "selectionGroup",
    l: "selectedId", q: "qCounter", entityFocusFlag: "entityFocusFlag", V: "zAfCursorVFlag",
  });
  stepLegacyZAh(ahState, {
    onL: (value) => rt.stepLegacyL(value),
    onSelectionReset: (a, b, c, d) => rt.runSelectionFlagsRefresh(a, b, c, d),
    onI: () => resetLegacyZI(g),
  });
}

/** f.aj() (#511), LegacyZAj.ts: park the selection cursor on the next living unit. */
export function stepZAj(rt: LegacyRuntimeState): void {
  const g = rt.game;
  const ajState = {
    entityFocusFlag: g.entityFocusFlag, as: g.menuCursor, frameLayoutAX: g.frameLayoutAX,
    kByte: g.kByte, frameLayoutL: g.selectedId, pendingP: g.pendingP, dense: rt.denseState,
  };
  stepLegacyZAj(ajState);
  g.entityFocusFlag = ajState.entityFocusFlag;
  g.menuCursor = ajState.as;
  g.frameLayoutAX = ajState.frameLayoutAX;
  g.kByte = ajState.kByte;
  g.selectedId = ajState.frameLayoutL;
  g.pendingP = ajState.pendingP;
}

/** Raw final f.b(int,int) port; b.a(III) stays a callback seam. */
export function stepFPairCommand(
  rt: LegacyRuntimeState,
  input: Omit<LegacyFPairCommandInput, "dense" | "map" | "subsystem" | "packedBytes" | "packedOffsets">,
  x: number,
  y: number,
): void {
  const subsystem = { v: rt.game.bUnit };
  stepLegacyFPairCommand({
    // b.a(IIII)Z (#270) as b.a(1, 127, x, y) with b.v = 0 (offsets 85..102), so the gate
    // writes the shared dense[3131]/[3232]. CORRECTED 2026-10-14: mode 0 and the record id.
    onFootprintProbe: (mode, value, px, py) => rt.checkSpiralPlacementGate(mode, value, px, py, 0),
    // Offset 562: b.a(int,int,int) (#473) = markLegacySpatialRecord, the
    // vision mark for each gathered unit. Wired 2026-09-27.
    onRecordAction: (rx, ry, span) => markLegacySpatialRecord({
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      layers: rt.mainArrays.aInt,
      layerIndex: LEGACY_SPATIAL_LAYER_INDEX,
      mapHeight: rt.game.mapHeight,
    }, rx, ry, span),
    ...input,
    dense: rt.denseState,
    map: rt.gridC,
    subsystem,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  }, x, y);
  rt.game.bUnit = subsystem.v;
}

/** Decode the confirmed raw `/ma` tile stream for a numeric original map index. */
export function decodeRawMap(rt: LegacyRuntimeState, mapIndex: number): LegacyRawMap {
  if (!rt.maResource) throw new Error("/ma resource has not been attached to runtime state");
  return decodeLegacyMapTiles({
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    maBytes: rt.maResource.bytes,
    maOffsets: rt.maResource.offsets,
  }, mapIndex);
}

export function letterboxState(rt: LegacyRuntimeState): LegacyCameraFrameLetterboxState {
  return {
    letterboxFlag: rt.game.boxSelecting,
    boxAnchorColumn: rt.game.boxAnchorColumn,
    boxAnchorRow: rt.game.boxAnchorRow,
    viewportOriginI: rt.game.cameraColumn,
    viewportOriginK: rt.game.cameraRow,
    scrollY: rt.game.cursorColumn,
    scrollA: rt.game.cursorRow,
  };
}
