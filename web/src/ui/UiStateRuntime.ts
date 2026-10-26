import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { liveView } from "../core/LegacyRuntimeState";
import { stepLegacyAk, stepLegacyAl, stepLegacyAm, stepLegacyAo, stepLegacyAq, stepLegacyAs, stepLegacyAt, stepLegacyAu, stepLegacyAv, stepLegacyAw, stepLegacyAx, stepLegacyAy, stepLegacyAz, stepLegacyAA, stepLegacyAB, stepLegacyAC, type LegacyAkCallbacks, type LegacyAmInput, type LegacyAqState } from "./LegacyStateMachine";
import { resetLegacyZI } from "./LegacyZI";
import { stepEntityActionConfirmation } from "../sim/units/EntityActionRuntime";
import { stepLegacyAi, type LegacyAiInput } from "../sim/units/LegacyUnitSelection";
import { stepLegacyAOMap, stepLegacyMapEntry, stepLegacyAPPrefix, type LegacyAOMapInput, type LegacyAPPrefixInput, type LegacyMapEntryCallbacks } from "../sim/world/LegacyMapEntryTransitions";
import { stepLegacyAQAudio, type LegacyAQAudioInput } from "../audio/LegacyAudioTransitions";
import { stepLegacyStateU, type LegacyStateUInput } from "./LegacyStateU";
import { stepLegacyStateTransitionCommand, type LegacyStateTransitionCommandInput } from "./LegacyStateTransitionCommand";
import { stepLegacyStateS, type LegacyStateSInput } from "./LegacyStateS";
import { stepLegacyStateT, type LegacyStateTInput } from "./LegacyStateT";

/** Raw f.ak() state-machine orchestration; child methods remain callbacks. */
export function stepStateMachine(rt: LegacyRuntimeState, callbacks: LegacyAkCallbacks = {}): void {
  stepLegacyAk(rt.game.stateMachineFields(), {
    ...callbacks,
    // CORRECTION 2026-08-22: stepLegacyAl's own onResetInput callback
    // (private void i() #610, offset 42 of al()) was never passed here
    // (silent no-op) -- now wired to resetLegacyZI. Also,
    // LegacyAkState/LegacyAlState's `eFlag`/`fFlag`/`vFlag` fields were
    // renamed to `inputUp`/`inputDown`/`inputV` (see LegacyAkState's own
    // docblock) since ak()'s own bytecode confirms those are the SAME
    // fields LegacyCameraFollow.ts already established, not the
    // orphaned game.eFlag/fFlag/vFlag rt structural-typing pickup
    // used to silently read instead.
    onAl: callbacks.onAl ?? (() => stepLegacyAl(rt.game, { onResetInput: () => resetLegacyZI(rt.game) })),
    onAm: callbacks.onAm ?? (() => rt.stepDefaultAm()),
    onAb: callbacks.onAb ?? (() => stepLegacyAB({
      state: rt.scrollSelectorState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
    })),
    onAc: callbacks.onAc ?? (() => stepLegacyAC({
      state: rt.scrollSelectorState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
    })),
    onAo: callbacks.onAo ?? (() => rt.stepDefaultAo()),
    onAn: callbacks.onAn ?? (() => rt.stepDefaultAn()),
    onAd: callbacks.onAd ?? (() => rt.stepDefaultAd()),
  });
}

/** Apply f.ao()'s table/state branch with unresolved child helpers inert. */
export function stepDefaultAo(rt: LegacyRuntimeState): void {
  rt.aoTrace.count += 1;
  rt.aoTrace.inputQ = rt.aoState.Q;
  rt.aoTrace.inputZ = rt.aoState.Z;
  rt.aoTrace.value = rt.packedBytes[
    rt.packedOffsets[151] + rt.packedBytes[rt.packedOffsets[152] + rt.aoState.Q] + rt.aoState.Z
  ];
  stepLegacyAo({
    state: rt.aoState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    // aoState is live, so ap()'s Q = 28 sticks (it used to be undone by a
    // copy-out, leaving every Q = 20 prompt open forever).
    onAp: () => { stepEntityActionConfirmation(rt); },
    onLanguage: (language) => rt.selectLanguage(language),
    onResourceLoad: (slot) => {
      if (slot === 0 || slot === 1) rt.loadLanguageResource(slot);
    },
    onAr: () => { rt.stepDefaultArFromAo(); },
    // f.ao()'s Q===18||Q===17 branch: `rt.b(-1)` (constant-pool #541,
    // f.b(int)). Confirmed via direct bytecode read (offset 176..181 of
    // ao()) that it really is a call on `rt`, not on the c-typed
    // resource-loader field.
    //
    // BUG FIX (2026-08-31): rt used to call `runSceneDispatch`, which
    // is an INCOMPLETE second port of f.b(int) covering only offsets
    // 0..54 and opening with `if (value < 0) return;`. Since ao() always
    // passes -1 here, the call did nothing at all -- that is precisely
    // why Q=18 was a dead end. The complete port (the full offset-54
    // shared tail, its an:B dispatch, and f(int,int)) already existed as
    // stepSubsystemStateCommand; point at it instead. See that method
    // and LegacyStateTransitionCommand.ts for the duplicate-port note.
    onB: (value) => { rt.stepSubsystemStateCommand(value); },
    onAq: () => {
      // Live fields: aM() (offsets 96/298) sets c:I = 0, and the q < 5 branch leaves it there.
      // FIXED 2026-10-14 (oracle run 15, play23 frame 73824, mission 4 -> 5): a snapshot taken
      // before the call wrote the old c back afterwards.
      const state = liveView<LegacyAqState>(rt.game, {
        m: "mByte", Q: "screen", U: "U", u: "uByte", q: "mission", T: "actionT", R: "R", vInt: "vInt",
        r: "progressR", s: "sByte", V: "progressV", Z: "Z", c: "missionFrame",
      });
      stepLegacyAq({
        state,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        onAM: () => rt.resetMapEntryAllocation(state.q),
        // f.aq()'s q===6 sub-branch calls `rt.b(59)` (constant-pool
        // #541) -- the SAME f.b(int)/runSceneDispatch as onB above, not
        // a distinct "entity signal" method; confirmed via direct
        // bytecode read (offset 224..229 of aq()).
        onEntitySignal: (signalValue) => rt.runSceneDispatch(signalValue),
        onGByte: () => rt.saveOriginalResourceAction(0),
        onSound: (soundValue) => rt.selectResourceSection(soundValue),
      });
    },
    onAs: () => stepAs(rt),
    // f.at() (Q=13, difficulty) writes b:B #243 (levelBByte), c:B #265
    // (progressC) and d:B #276 (persistedDByte). FIXED 2026-09-27: b was a
    // throwaway local (the chosen difficulty was dropped), c went to the
    // frame counter c:I #260 (so f.F() ran H() instead of G() and the
    // mission-select panel was never drawn), d to the tick counter d:I.
    onAt: () => {
      const state = {
        Z: rt.aoState.Z,
        b: rt.game.difficulty,
        c: rt.game.progressC,
        q: rt.aoState.q,
        Q: rt.aoState.Q,
        d: rt.game.persistedDByte,
        r: rt.aoState.r,
        V: rt.aoState.V,
        vInt: rt.aoState.vInt,
        pByte: rt.aoState.pByte,
        s: rt.aoState.s,
        R: rt.aoState.R,
        H: rt.aoState.H,
      };
      stepLegacyAt({ state, onGByte: () => rt.saveOriginalResourceAction(0) });
      rt.aoState.Z = state.Z;
      rt.game.difficulty = state.b;
      rt.game.progressC = state.c;
      rt.aoState.q = state.q;
      rt.aoState.Q = state.Q;
      rt.game.persistedDByte = state.d;
      rt.aoState.V = state.V;
      rt.aoState.vInt = state.vInt;
      rt.aoState.pByte = state.pByte;
      rt.aoState.s = state.s;
      rt.aoState.R = state.R;
    },
    onAv: () => {
      const state = {
        Q: rt.aoState.Q,
        Z: rt.aoState.Z,
        vInt: rt.aoState.vInt,
        mByte: rt.aoState.mByte,
        aShort: rt.mainArrays.aShort,
      };
      stepLegacyAv({
        state,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        onCByte: (value) => rt.selectResourceSection(value),
      });
      rt.aoState.Q = state.Q;
      rt.aoState.Z = state.Z;
      rt.aoState.vInt = state.vInt;
      rt.aoState.mByte = state.mByte;
    },
    // f.ao()'s Q===25 branch: `f.d:[S]` (#269, already tracked as
    // game.zlDShorts) index 4, and `f.b:[Z]` (#234, already tracked as
    // game.frameFlags) index 2 -- both confirmed elsewhere in rt
    // codebase (LegacyFrameCommandChanged.ts) as the SAME two arrays.
    onDShortWrite: (index, value) => { rt.game.zlDShorts[index] = value; },
    onBooleanFlag: (index, value) => { rt.game.frameFlags[index] = value; },
    onAw: () => {
      const state = {
        q: rt.aoState.q,
        R: rt.aoState.R,
        Q: rt.aoState.Q,
        W: rt.game.actionWFlag,
        Z: rt.aoState.Z,
        r: rt.aoState.r,
        af: rt.aoState.af,
        vInt: rt.aoState.vInt,
        aaInt: rt.aoState.aaInt,
      };
      stepLegacyAw(state);
      rt.aoState.q = state.q;
      rt.aoState.R = state.R;
      rt.aoState.Q = state.Q;
      rt.aoState.Z = state.Z;
      rt.aoState.vInt = state.vInt;
      rt.aoState.aaInt = state.aaInt;
    },
    onAu: () => {
      const state = {
        Q: rt.aoState.Q,
        Z: rt.aoState.Z,
        q: rt.aoState.q,
        s: rt.aoState.s,
        vInt: rt.aoState.vInt,
        pByte: rt.aoState.pByte,
        T: rt.aoState.T,
        R: rt.aoState.R,
      };
      stepLegacyAu({
        state,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        onGByte: () => {
          rt.game.sByte = state.s;
          rt.game.persistedPByte = state.pByte;
          return rt.saveOriginalResourceAction(0);
        },
      });
      rt.aoState.Q = state.Q;
      rt.aoState.Z = state.Z;
      rt.aoState.q = state.q;
      rt.aoState.s = state.s;
      rt.aoState.vInt = state.vInt;
      rt.aoState.pByte = state.pByte;
      rt.aoState.T = state.T;
      rt.aoState.R = state.R;
    },
    onAx: () => {
      const state = {
        Z: rt.aoState.Z,
        Q: rt.aoState.Q,
        R: rt.aoState.R,
        q: rt.aoState.q,
        s: rt.aoState.s,
        V: rt.aoState.V,
        vInt: rt.aoState.vInt,
        pByte: rt.aoState.pByte,
        aaInt: rt.aoState.aaInt,
        r: rt.aoState.r,
      };
      stepLegacyAx(state);
      rt.aoState.Z = state.Z;
      rt.aoState.Q = state.Q;
      rt.aoState.R = state.R;
      rt.aoState.vInt = state.vInt;
      rt.aoState.pByte = state.pByte;
      rt.aoState.aaInt = state.aaInt;
    },
    onAy: () => {
      const state = {
        X: rt.game.XFlag,
        Q: rt.aoState.Q,
        R: rt.aoState.R,
        vInt: rt.aoState.vInt,
        U: rt.game.U,
        Z: rt.aoState.Z,
        c: rt.aoState.c,
        g: 0,
      };
      stepLegacyAy({ state, onAM: () => rt.resetMapEntryAllocation(rt.aoState.q) });
      rt.aoState.Q = state.Q;
      rt.aoState.R = state.R;
      rt.aoState.vInt = state.vInt;
      rt.aoState.Z = state.Z;
      rt.aoState.c = state.c;
    },
    onAz: () => {
      const state = {
        Q: rt.aoState.Q,
        R: rt.aoState.R,
        Z: rt.aoState.Z,
        aaInt: rt.aoState.aaInt,
        vInt: rt.aoState.vInt,
      };
      stepLegacyAz({ state, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets });
      rt.aoState.Q = state.Q;
      rt.aoState.R = state.R;
      rt.aoState.aaInt = state.aaInt;
      rt.aoState.vInt = state.vInt;
    },
    // f.ao()'s value===1/3 branches' `rt.a.a(70|74)` call, and f.av()'s
    // own `rt.a.a(75)` call above -- all the same c.a(int), see
    // selectResourceSection's docblock.
    onCByte: (value) => { rt.selectResourceSection(value); },
    // f.ao()'s value===2 branch writes two bytes directly into the same
    // packedBytes table `stepLegacyAo` already reads from -- the target
    // indices are computed inline by stepLegacyAo itself, so rt
    // callback only needs to perform the write.
    onResourceByte: (index, value) => { rt.packedBytes[index] = value; },
    // f.ao()'s value===7 branch (`onA0`, a pre-existing but misleadingly
    // named callback -- confirmed via direct bytecode read, offset
    // 901..905, that it really calls `rt.aA()`, constant-pool #482,
    // NOT some hypothetical "a0()"). aA() is already fully ported and
    // tested as stepLegacyAA (verify-state-short-helpers.mjs) but was
    // never called from anywhere in the runtime until rt wiring.
    onA0: () => {
      const state = {
        Q: rt.aoState.Q,
        R: rt.aoState.R,
        Z: rt.aoState.Z,
        aaInt: rt.aoState.aaInt,
        X: rt.game.XFlag,
        q: rt.aoState.q,
        t: rt.game.tByte,
        W: rt.game.actionWFlag,
        T: rt.aoState.T,
        vInt: rt.aoState.vInt,
      };
      stepLegacyAA(state);
      rt.aoState.Q = state.Q;
      rt.aoState.R = state.R;
      rt.aoState.aaInt = state.aaInt;
      rt.game.XFlag = state.X;
      rt.aoState.T = state.T;
      rt.aoState.vInt = state.vInt;
    },
    // f.ao()'s fabricated KFlag tail (no bytecode behind it) was deleted
    // from stepLegacyAo 2026-09-27; nothing to wire here.
    onDestroy: () => { rt.game.b = false; },
  });
  rt.aoTrace.outputQ = rt.game.screen;
}

/** Raw f.am() branch port; caller supplies the unresolved subsystem callbacks. */
export function stepStateAm(rt: LegacyRuntimeState, input: Omit<LegacyAmInput, "packedBytes" | "packedOffsets">): void {
  stepLegacyAm({
    ...input,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

export function stepStateAi(rt: LegacyRuntimeState, input: LegacyAiInput): void { stepLegacyAi({ ...input, dense: input.dense ?? rt.denseState }); }

export function stepStateAOMap(rt: LegacyRuntimeState, input: LegacyAOMapInput): void { stepLegacyAOMap(input); }

/** Raw f.U() transition runner; unresolved owners remain callback seams. */
export function stepStateU(rt: LegacyRuntimeState, input: Omit<LegacyStateUInput, "dense" | "packedBytes" | "packedOffsets">): void {
  stepLegacyStateU({
    ...input,
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/** Raw f.b(int) command boundary; negative completion can enter f.U(). */
export function stepStateTransitionCommand(rt: LegacyRuntimeState,
  input: Omit<LegacyStateTransitionCommandInput, "packedBytes" | "packedOffsets">,
  value: number,
): void {
  stepLegacyStateTransitionCommand({
    ...input,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  }, value);
}

/** Raw f.S() transition preparation against the live packed resource. */
export function stepStateS(rt: LegacyRuntimeState, input: Omit<LegacyStateSInput, "packedBytes" | "packedOffsets">): void {
  stepLegacyStateS({
    ...input,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/** Raw f.T() selector branches against the live dense/short state banks. */
export function stepStateT(rt: LegacyRuntimeState, input: Omit<LegacyStateTInput, "dense" | "shortRows">): void {
  stepLegacyStateT({
    ...input,
    dense: rt.denseState,
    shortRows: rt.mainArrays.aShort,
    onFPairCommand: input.onFPairCommand ?? ((x, y) => {
      rt.stepFPairCommand({}, x, y);
    }),
  });
}

/** Exact f.g(byte) map-entry call chain; lower aM/aN/aO remain explicit callbacks. */
export function stepStateMapEntry(rt: LegacyRuntimeState, q: number, callbacks: LegacyMapEntryCallbacks = {}): void {
  const entryState = { q: rt.game.mission };
  stepLegacyMapEntry(entryState, q, callbacks);
  rt.game.mission = entryState.q;
}

export function stepStateAPPrefix(rt: LegacyRuntimeState, input: LegacyAPPrefixInput): void { stepLegacyAPPrefix(input); }

export function stepStateAQAudio(rt: LegacyRuntimeState, input: LegacyAQAudioInput): void { stepLegacyAQAudio(input); }

/**
 * f.as(): the OPTIONS screen's toggle of row Z (1 MUSIC, 3 HINTS). Also used by the settings panel
 * (Settings.ts), which sets Z for the call.
 */
export function stepAs(rt: LegacyRuntimeState): void {
  const state = { Z: rt.aoState.Z, eByte: rt.aoState.eByte, lInt: rt.aoState.lInt };
  stepLegacyAs({
    state,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    // f.as() offsets 66..84: with a player (f.a:La; #148, created by aQ() and cleared by aR(),
    // i.e. game.playerExists) the toggle only calls a.a(e): e == 0 stops it, otherwise it
    // restarts and sets the volume. Only without one does it run aR() + aQ(), whose track
    // pick uses the RNG. CORRECTED 2026-10-16 (oracle, options screen, frame 12253): the
    // player branch was unwired, so every MUSIC toggle re-rolled a track.
    onAudio: rt.game.playerExists
      ? (value) => { if (value === 0) rt.midiPlayer?.stop(); else rt.midiPlayer?.start(); }
      : undefined,
    onAQ: () => rt.startOriginalAudio(),
  });
  rt.aoState.Z = state.Z;
  rt.aoState.eByte = state.eByte;
  rt.aoState.lInt = state.lInt;
}
