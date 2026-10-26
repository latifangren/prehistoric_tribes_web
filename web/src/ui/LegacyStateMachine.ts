import { UNIT_ORDER } from "../core/DenseLayout";
/**
 * Raw fields consumed by f.ak(); field letters are intentionally retained
 * EXCEPT e:Z(#285)/f:Z(#295)/v:Z(#377), which were originally modeled as
 * `eFlag`/`fFlag`/`vFlag` here -- CORRECTION (2026-08-22): direct bytecode
 * read of ak()'s own offset 113 (`putfield #377 // Field v:Z`) and offsets
 * 140/154 (`getfield #285`/`#295`) confirm these are the SAME fields
 * `LegacyCameraFollow.ts` already established as `game.inputUp`/
 * `inputDown`/`inputV` (keyboard direction/fire state), NOT the
 * confirmed-orphaned `game.eFlag`/`fFlag`/`vFlag` (zero other real
 * citations anywhere in the codebase) this file used to read/write via
 * `stateMachineFields(): LegacyAkState { return this; }`'s structural
 * typing. Renamed to the canonical names so that pickup is correct.
 */
export type LegacyAkState = {
  screen: number;
  iFlag: boolean;
  staticL: boolean;
  jFlag: boolean;
  aR: number;
  aP: number;
  inputV: boolean;
  E: number;
  inputUp: boolean;
  inputDown: boolean;
  staticM: boolean;
};

export type LegacyAkCallbacks = {
  readonly onAl?: () => void;
  readonly onAm?: () => void;
  readonly onAn?: () => void;
  readonly onAo?: () => void;
  readonly onAb?: () => void;
  readonly onAc?: () => void;
  readonly onAd?: () => void;
};

export type LegacyAlState = Pick<LegacyAkState, "screen" | "iFlag" | "staticL" | "inputV" | "E"> & {
  R: number;
  S: number;
  H: boolean;
  x: number;
  vInt: number;
  eByte: number;
};

export type LegacyAlCallbacks = {
  readonly onResetInput?: () => void;
  readonly onAQ?: () => void;
};

export type LegacyAmState = {
  Q: number;
  R: number;
  H: boolean;
  T: number;
  q: number;
  uCounter: number;
  tByte: number;
  W: boolean;
  vInt: number;
  A: boolean;
  vByte: number;
  mByte: number;
};

export type LegacyAmInput = {
  readonly state: LegacyAmState;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** T=0 invokes private f.g(byte), whose return type is void. */
  readonly onMapEntry?: (value: number) => void;
  /** T=1 invokes f.e(int):boolean for the resource/action branch. */
  readonly onResourceAction?: (value: number) => boolean;
  /** Compatibility fallback for callers written before the two methods were separated. */
  readonly onGByte: (value: number) => boolean;
  readonly onSelectionSync?: (first: boolean, second: boolean, third: boolean, fourth: boolean) => void;
  readonly onBByte?: (value: number) => void;
  readonly onWReset?: () => void;
  readonly onN?: () => void;
  readonly onU?: () => void;
  readonly onD?: (value: number) => boolean;
};

/** Exact T=0/1/2 branches and fixed writes from f.am(). */
export function stepLegacyAm(input: LegacyAmInput): void {
  const { state } = input;
  state.Q = state.R;
  state.H = true;
  if (state.T === 0) {
    if (input.onMapEntry) input.onMapEntry(state.q);
    else input.onGByte(state.q);
    if (state.Q === 18) {
      input.onSelectionSync?.(true, true, false, false);
      state.mByte = 0;
      state.Q = 28;
      const tableBase = input.packedOffsets[303];
      input.onBByte?.(input.packedBytes[tableBase + state.q]);
      state.Q = 18;
    }
    return;
  }
  if (state.T === 1) {
    if (state.uCounter > 0 && state.uCounter < 41) state.tByte = toByte(state.tByte + 1);
    const resourceAction = input.onResourceAction ?? input.onGByte;
    const ok = resourceAction(state.q < 7 ? 1 : 2);
    if (!ok) {
      if (state.q < 7) state.tByte = -1;
      else {
        state.W = false;
        input.onWReset?.();
      }
      state.vInt = 66;
    } else {
      state.vInt = 67;
      resourceAction(0);
    }
    state.R = state.q < 7 ? (state.tByte > -1 ? 10 : 11) : (state.W ? 10 : 11);
    state.A = true;
    state.vByte = 1;
    input.onN?.();
    input.onU?.();
    state.vByte = 0;
    return;
  }
  if (state.T === 2 && input.onD && !input.onD(state.q < 7 ? 1 : 2)) {
    state.R = state.Q;
    state.T = 0;
    state.Q = 23;
  }
}

/**
 * f.an()'s fields (bytecode/f-javap.txt `private void an()`): P:Z #88, I:Z #61,
 * T:B #103, Z:I #120, aa:I #178, m:B #339, S:B #100, ac:Z #184, U:B #105,
 * V:B #107, and the Q=20 camera save y/z/A/B/I:B/J/K/L. `selection` is the
 * f.d:[Z] (#267) snapshot handed to a(ZZZZZZZZZ).
 */
export type LegacyAnState = {
  Q: number;
  U: number;
  H: boolean;
  P: boolean;
  I: boolean;
  vInt: number;
  T: number;
  V: number;
  Z: number;
  aaInt: number;
  mByte: number;
  R: number;
  S: number;
  ac: boolean;
  y: number; z: number; A: number; B: number;
  IByte: number; J: number; K: number; L: number;
  selection: readonly boolean[];
};

export type LegacyAnInput = {
  readonly state: LegacyAnState;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onRelease?: (value: number) => void;
  readonly onEZero?: () => void;
  /** Original f.an() Q=14 invokes f.b(), which destroys the MIDlet. */
  readonly onDestroy?: () => void;
  readonly onSelectionSync?: (values: boolean[]) => void;
};

/** Exact table-driven branch writes from f.an(); unresolved helpers stay callbacks. */
export function stepLegacyAn(input: LegacyAnInput): void {
  const { state, packedBytes, packedOffsets } = input;
  const tableBase = packedOffsets[153];
  if (state.Q === 32) {
    state.Q = state.U;
    state.H = true;
    return;
  }
  if (packedBytes[tableBase + 29 + state.Q] === 1) {
    if (state.Q === 25) {
      input.onRelease?.(-1);
      state.P = false;
      state.I = false;
    }
    state.Q = 28;
  } else if (state.Q === state.U) {
    state.R = state.Q;
    state.Q = 30;
  } else if (state.Q === 20) {
    // Offsets 110..240: the branch is taken for Q == 20 whatever the table
    // says; it only acts when t153[145 + 20] == 0. CORRECTED 2026-09-27: a
    // non-zero entry used to fall through to the later branches, and the
    // z=y/B=A/J=I/L=K camera save was missing.
    if (packedBytes[tableBase + 145 + 20] === 0) {
      state.z = state.y; state.B = state.A; state.J = state.IByte; state.L = state.K;
      state.Q = 28;
      input.onSelectionSync?.(state.selection.slice(0, 9));
    }
  } else if (state.Q === 16 && state.vInt === 60) {
    state.T = 0;
    state.Q = 22;
    state.vInt = 69;
    state.R = 18;
  } else if (state.Q === 2) {
    state.Q = state.U;
    state.Z = 0;
  } else if (state.Q === state.V || state.Q === 9) {
    state.Q = 13;
    state.Z = 1;
  } else if (state.Q === 14) {
    // f.an(): invokevirtual f.b() destroys the MIDlet, then control reaches
    // the common H=true epilogue in the original bytecode.
    input.onDestroy?.();
  } else if (packedBytes[tableBase + 58 + state.Q] === 1) {
    if (state.Q === 12) input.onEZero?.();
    state.Q = state.R;
    state.R = state.S;
    state.Z = state.aaInt;
    state.mByte = 0;
    state.ac = true;
  } else if (packedBytes[tableBase + 58 + state.Q] > 1) {
    state.Q = packedBytes[tableBase + 58 + state.Q];
    state.R = state.S;
    state.Z = state.aaInt;
    state.mByte = 0;
  }
  state.H = true;
}

export type LegacyAoState = {
  Q: number;
  R: number;
  H: boolean;
  vInt: number;
  V: number;
  r: number;
  q: number;
  T: number;
  Z: number;
  mByte: number;
  aaInt: number;
  s: number;
  eByte: number;
  lInt: number;
  af: boolean;
  y: number;
  z: number;
  A: number;
  B: number;
  I: number;
  J: number;
  K: number;
  L: number;
  c: number;
  pByte: number;
};

export type LegacyAoInput = {
  readonly state: LegacyAoState;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onAp?: () => void;
  readonly onAq?: () => void;
  readonly onAr?: () => void;
  readonly onAs?: () => void;
  readonly onAt?: () => void;
  readonly onAu?: () => void;
  readonly onAv?: () => void;
  readonly onAw?: () => void;
  readonly onAx?: () => void;
  readonly onAy?: () => void;
  readonly onAz?: () => void;
  readonly onA0?: () => void;
  readonly onB?: (value: number) => void;
  /** Retained only for other callers; f.ao()'s Q=14 branch does not invoke it. */
  readonly onDestroy?: () => void;
  readonly onCByte?: (value: number) => void;
  readonly onResourceLoad?: (slot: number) => void;
  /** Offsets 454..459: `f.a:B = (byte) Z`, the language c.b() loads from. */
  readonly onLanguage?: (language: number) => void;
  readonly onDShortWrite?: (index: number, value: number) => void;
  readonly onBooleanFlag?: (index: number, value: boolean) => void;
  readonly onResourceByte?: (index: number, value: number) => void;
};

/** Exact table value and state branches from f.ao(); private helpers remain callbacks. */
export function stepLegacyAo(input: LegacyAoInput): void {
  const { state, packedBytes, packedOffsets } = input;
  const tableBase = packedOffsets[153];
  const tableValueIndex = packedOffsets[151] + packedBytes[packedOffsets[152] + state.Q] + state.Z;
  const value = packedBytes[tableValueIndex];
  if (state.af) {
    state.V = 8;
    state.r = 4;
  }
  if (packedBytes[tableBase + 87 + state.Q] === 1) {
    state.Q = state.R;
  } else if (state.Q === 19) {
    state.z = state.y; state.B = state.A; state.J = state.I; state.L = state.K; state.Q = 28;
  } else if (state.Q === 20) {
    input.onAp?.();
  } else if (state.Q === 18 || state.Q === 17) {
    input.onB?.(-1);
  } else if (state.Q === 15) {
    input.onAq?.();
  } else if (state.Q === 16) {
    input.onAr?.();
  } else if (state.Q === 12) {
    input.onAs?.();
  } else if (state.Q === 13) {
    input.onAt?.();
  } else if (state.Q === state.V) {
    input.onAu?.();
  } else if (state.Q === 9) {
    state.q = packedBytes[packedOffsets[249] + value - 25];
    state.T = 0; state.Q = 22; state.vInt = 69; state.R = 29;
  } else if (state.Q === 24) {
    input.onAv?.();
  } else if (state.Q === 25) {
    state.Z += 1;
    if (state.Z >= packedBytes[packedOffsets[307] + state.mByte]) state.Z = 0;
    const shortIndex = packedOffsets[305] + packedBytes[packedOffsets[306] + state.mByte] + state.Z;
    input.onDShortWrite?.(4, 33 + packedBytes[shortIndex]);
    input.onBooleanFlag?.(2, true);
  } else if (state.Q === 14) {
    // Bytecode calls c.b(0) and c.b(1) here, not f.b()/MIDlet.destroy().
    // Those are the two language-resource loads needed before Q=16.
    // CORRECTED 2026-10-15: the language (f.a:B = Z, offsets 454..459) was never set, so every
    // choice loaded English.
    input.onLanguage?.(state.Z);
    input.onResourceLoad?.(0);
    input.onResourceLoad?.(1);
    state.Q = 16;
  } else if (value === 6) {
    state.Q = 28;
  } else if (value === 0) {
    state.R = state.Q; state.Q = 2; state.aaInt = state.Z;
  } else if (value === 12) {
    state.q = 0; state.R = state.Q;
    if (state.s > -1) state.Q = 3;
    else { state.Q = 13; state.Z = 1; }
    state.aaInt = 0;
  } else if (value === 13) {
    input.onAw?.();
  } else if (value === 10) {
    input.onAx?.();
  } else if (value === 11) {
    state.Q = 31;
  } else if (value === 9) {
    input.onAy?.();
  } else if (value === 5) {
    state.R = state.Q; state.Q = 30; state.aaInt = state.Z;
  } else if (value === 1) {
    input.onAz?.();
    packedBytes[tableBase + 116 + state.Q] = 4;
    state.mByte = 1;
    input.onCByte?.(70);
  } else if (value === 3) {
    input.onAz?.();
    packedBytes[tableBase + 116 + state.Q] = 2;
    state.mByte = 0;
    input.onCByte?.(74);
  } else if (value === 2) {
    state.R = state.Q; state.Q = 12; state.aaInt = state.Z; state.Z = 1;
    // Offsets 796..877: row 1 (MUSIC) gets 17 + e/2 and row 3 (HINTS) 17 + l -- the values are the
    // text records, not part of the index. CORRECTED 2026-10-16 (pixel comparison, options screen):
    // the values were added to the indices, so both rows always showed the default OFF.
    const base = packedOffsets[151] + packedBytes[packedOffsets[152] + 12] + 1;
    const firstIndex = base;
    const secondIndex = base + 2;
    input.onResourceByte?.(firstIndex, toByte(17 + Math.trunc(state.eByte / 2)));
    input.onResourceByte?.(secondIndex, toByte(17 + state.lInt));
  } else if (value === 4) {
    state.Q = 32;
  } else if (value === 7) {
    input.onA0?.();
  } else if (value === 8) {
    state.R = state.Q; state.Q = 16; state.aaInt = state.Z; state.vInt = 63;
  }
  // REMOVED 2026-09-27: a KFlag tail (Z()/l(-1)/a(Z..Z)/aj()) that the
  // 2026-08-31 read confirmed is not in f.ao()'s bytecode (0..947).
  state.H = true;
}

export type LegacyApState = {
  ap: number; am: number; an: number; w: number; KFlag: boolean;
  Q: number; U: number; z: number; y: number; B: number; A: number;
  J: number; I: number; L: number; K: number; P: boolean; o: number;
  m: number; e: number; ac: boolean;
};

export type LegacyEntityActionStartInput = {
  readonly state: LegacyApState;
  readonly ap: number;
  readonly am: number;
  readonly an: number;
  readonly selection: readonly boolean[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onTransientReset?: () => void;
  /** f.d:[Z] (#267) = the snapshot, offsets 96..189. */
  readonly onSelectionCopy?: (values: boolean[]) => void;
  /** a(ZZZZ) (#434), offsets 192..207. */
  readonly onSelectionApply?: (first: boolean, second: boolean, third: boolean, fourth: boolean) => void;
  /** A:Z (#36) = true, offsets 210..212. */
  readonly onAFlag?: () => void;
};

/**
 * f.a(byte,byte,byte) from offset 43 on, which schedules f.ap() at Q=20.
 * `selection` is the live f.a:[Z] (#123). CORRECTED 2026-09-23: the snapshot
 * skips index 3 (`a[0,1,2,4..9]`) and a(ZZZZ) gets `(a[0], true, false,
 * a[4])`; both were read off the wrong indices, and A:Z was not set.
 */
export function beginLegacyEntityAction(input: LegacyEntityActionStartInput): void {
  const { packedBytes, packedOffsets } = input;
  input.onTransientReset?.();
  input.state.ap = input.ap;
  input.state.am = input.am;
  input.state.an = input.an;
  input.state.Q = 20;
  const a = input.selection;
  input.onSelectionCopy?.([0, 1, 2, 4, 5, 6, 7, 8, 9].map((index) => Boolean(a[index])));
  input.onSelectionApply?.(Boolean(a[0]), true, false, Boolean(a[4]));
  input.onAFlag?.();
  packedBytes[packedOffsets[153] + 145 + 20] =
    input.ap === 4 || input.ap === 5 || input.ap === 14 || input.ap === 15 ? 0 : 2;
}
export type LegacyApInput = {
  readonly state: LegacyApState;
  /** f.e:[B -- the dense bank (offset 101..113 writes e[6161 + am]). */
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onEntityPrepare?: (id: number) => void;
  readonly onEntityConfigure?: (id: number) => void;
  readonly onSubsystemCheck?: (value: number) => boolean;
  readonly onEntityFallback?: (id: number, value: number) => void;
  readonly onFinalize?: () => void;
  readonly onRelease?: (value: number) => void;
  /** ah() (#509), offset 144. */
  readonly onAh?: () => void;
  readonly onSelection?: (values: boolean[]) => void;
  /** o:I (#348) = 0, offset 320..322. */
  readonly onOReset?: () => void;
  /** P:Z (#88) = false, offset 334..336. */
  readonly onPReset?: () => void;
  /** b:[Z] (#234) [4] = true, offset 357..363. */
  readonly onFlag4?: () => void;
  /** Z() (#428), offset 365. */
  readonly onZ?: () => void;
  /** aj() (#511), offset 369. */
  readonly onAj?: () => void;
  /** f.d:[Z] (#267), the snapshot f.a(byte,byte,byte) took. */
  readonly snapshot: readonly boolean[];
};

/**
 * Exact confirmation/finalization branch from f.ap(); meanings remain raw.
 * CORRECTED 2026-09-23: offsets 150..208 and 214..272 restore the selection
 * from the f.d:[Z] snapshot (was all-false), and the flag != 0 path (offset
 * 20 -> 214) restores it without the w==3 test.
 */
export function stepLegacyAp(input: LegacyApInput): void {
  const { state, packedBytes, packedOffsets } = input;
  const usePrimary = packedBytes[packedOffsets[153] + 145 + 20] === 0;
  if (usePrimary) {
    if (state.ap === 14 || state.ap === 15) {
      input.onEntityPrepare?.(state.am);
      input.onEntityConfigure?.(state.am);
      // Offsets 58..113: b.v = am, b.u = 0, then b.a(int) (#471, the
      // nearest-building pick); on success the unit's order e[6161+am] = 2.
      // CORRECTED 2026-09-27: this wrote packedBytes (the resource table).
      if (input.onSubsystemCheck?.(state.ap === 14 ? 4 : 2)) input.dense[UNIT_ORDER + state.am] = 2;
    } else input.onEntityFallback?.(state.an, 0);
    input.onFinalize?.();
  }
  if (usePrimary && state.w === 3) {
    input.onRelease?.(-1);
    input.onAh?.();
  } else {
    input.onSelection?.(Array.from({ length: 9 }, (_, index) => Boolean(input.snapshot[index])));
  }
  state.z = state.y; state.B = state.A; state.J = state.I; state.L = state.K; state.Q = 28;
  // Offsets 313..371, K:Z set (the chief-succession prompt, b.t()): enter
  // unit-pick mode. CORRECTED 2026-09-23: offsets 357..368 set b:[Z][4] and
  // call Z(); nothing here clears K:Z (the port used to, via onReset).
  if (state.KFlag) {
    input.onOReset?.();
    input.onFinalize?.();
    input.onRelease?.(-1);
    input.onPReset?.();
    input.onSelection?.([true, false, false, false, true, false, false, false, false]);
    state.w = 2;
    input.onFlag4?.();
    input.onZ?.();
    input.onAj?.();
  }
}

export type LegacyAqState = {
  m: number; Q: number; U: number; u: number; q: number; T: number; R: number;
  vInt: number; r: number; s: number; V: number; Z: number; c: number;
};
export type LegacyAqInput = {
  readonly state: LegacyAqState;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onAM?: () => void;
  readonly onEntitySignal?: (value: number) => void;
  readonly onGByte?: (value: number) => boolean;
  readonly onSound?: (value: number) => void;
};

/** Exact m/q progression from f.aq(); helper calls remain explicit callbacks. */
export function stepLegacyAq(input: LegacyAqInput): void {
  const { state, packedBytes, packedOffsets } = input;
  if (state.m >= 4) return;
  if (state.m > 0) {
    if (state.m === 3) packedBytes[packedOffsets[153] + 116 + state.Q] = 2;
    input.onSound?.(70 + state.m);
    state.vInt = 71;
    state.m = toByte(state.m + 1);
    return;
  }
  if (state.m !== -1) return;
  if (state.u === 41) {
    input.onAM?.();
    if (state.q < 5) {
      state.q = toByte(state.q + 1); state.T = 0; state.Q = 23; state.vInt = 69; state.R = 18;
      state.s = packedBytes[packedOffsets[248] + state.q];
      if (state.r < state.s) state.r = state.s;
      state.V = toByte(4 + state.r);
      input.onGByte?.(0);
    } else if (state.q === 6) {
      state.c = -1; state.Q = state.U; input.onEntitySignal?.(59); state.q = toByte(state.q + 1); state.Q = 18;
    } else { state.c = -1; state.Q = state.U; }
    state.Z = 0;
  } else {
    if (state.q === 1 || state.q === 6) state.q = toByte(state.q - 1);
    // BUG FIX (2026-08-31): real bytecode (offset 301-308) reads field U:B
    // ("aload_0; aload_0; getfield #105 Field U:B; putfield #93 Field R:B")
    // -- `R = U`, not a literal 5. This baseline port hardcoded `R = 5`,
    // never caught before because f.aq() had never been wired to its real
    // call site (f.ao()'s Q===15 branch) until this session.
    input.onAM?.(); state.R = state.U; state.Q = 16; state.vInt = 58; state.Z = 0; state.c = -1;
  }
}

export type LegacyArState = {
  vInt: number; Q: number; U: number; Z: number; c: number; g: number;
  T: number; q: number; R: number; eByte: number; ac: boolean; pByte: number;
  s: number; t: number; H: boolean;
};
export type LegacyArInput = {
  readonly state: LegacyArState;
  readonly onDestroy?: () => void;
  readonly onAM?: () => void;
  readonly onAQ?: () => void;
  readonly onGByte?: (value: number) => boolean;
};

/** Exact terminal/continuation writes from f.ar(); unresolved private calls remain callbacks. */
export function stepLegacyAr(input: LegacyArInput): void {
  const { state } = input;
  if (state.vInt === 68) input.onDestroy?.();
  else if (state.vInt === 65) {
    input.onAM?.(); state.Q = state.U; state.Z = 0; state.c = -1; state.g = 0;
  } else if (state.vInt === 58) {
    state.T = 0; state.Q = 22; state.vInt = 69; state.R = state.q < 7 ? 18 : 29;
  } else if (state.vInt === 59) {
    state.eByte = 2; state.ac = true; input.onAQ?.(); state.Q = state.U; state.R = state.U;
  } else if (state.vInt === 64) {
    state.T = 1; state.Q = 22; state.vInt = 69; state.R = 21;
  } else if (state.vInt === 63) state.Q = 31;
  else if (state.vInt === 60) {
    state.pByte = 1; state.T = 0; state.Q = 22; state.vInt = 69; state.R = 18;
  } else if (state.vInt === 62) {
    state.s = -1; state.t = -2; state.Q = 13; state.R = 2; state.Z = 1; input.onGByte?.(0);
  }
}

export type LegacyAsState = {
  Z: number; eByte: number; lInt: number;
};
export type LegacyAsInput = {
  readonly state: LegacyAsState;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onAudio?: (value: number) => void;
  readonly onAudioStop?: () => void;
  readonly onAQ?: () => void;
};

/** Exact preference-table writes from f.as(). */
export function stepLegacyAs(input: LegacyAsInput): void {
  const { state, packedBytes, packedOffsets } = input;
  const base = packedOffsets[151] + packedBytes[packedOffsets[152] + 12] + 1;
  if (state.Z === 1) {
    state.eByte = state.eByte === 0 ? 2 : 0;
    // Offsets 24..65 / 118..157: the option rows are base (MUSIC) and base + 2 (HINTS); 17 + value
    // is what is stored, not an index offset (corrected 2026-10-16, see ao()'s option branch).
    packedBytes[base] = toByte(17 + Math.trunc(state.eByte / 2));
    if (input.onAudio) input.onAudio(state.eByte);
    else { input.onAudioStop?.(); input.onAQ?.(); }
  } else if (state.Z === 3) {
    state.lInt = state.lInt === 0 ? 1 : 0;
    packedBytes[base + 2] = toByte(17 + state.lInt);
  }
}

export type LegacyAtState = {
  Z: number; b: number; c: number; q: number; Q: number; d: number; r: number;
  V: number; vInt: number; pByte: number; s: number; R: number; H: boolean;
};
export type LegacyAtInput = { readonly state: LegacyAtState; readonly onGByte?: (value: number) => boolean };

/** Exact selector confirmation branch from f.at(). */
export function stepLegacyAt(input: LegacyAtInput): void {
  const { state } = input;
  state.b = toByte(Math.trunc(state.Z / 2));
  if (state.q >= 7) { state.Q = 9; state.d = state.b; }
  else {
    if (state.r === 0) { state.Q = 16; state.vInt = 60; state.pByte = 0; state.s = 0; }
    else state.Q = state.V;
    state.c = state.b;
    input.onGByte?.(0);
  }
  state.Z = 0;
}

export type LegacyAuState = {
  Q: number; Z: number; q: number; s: number; vInt: number; pByte: number;
  T: number; R: number;
};
export type LegacyAuInput = {
  readonly state: LegacyAuState;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onGByte?: (value: number) => boolean;
};

/** Exact option lookup and continuation from f.au(). */
export function stepLegacyAu(input: LegacyAuInput): void {
  const { state, packedBytes, packedOffsets } = input;
  const value = packedBytes[packedOffsets[151] + packedBytes[packedOffsets[152] + state.Q] + state.Z];
  state.q = packedBytes[packedOffsets[249] + value - 25];
  state.s = packedBytes[packedOffsets[248] + state.q];
  if (state.q === 0) { state.Q = 16; state.vInt = 60; state.pByte = 0; }
  else { state.T = 0; state.Q = 22; state.vInt = 69; }
  state.R = 18;
  input.onGByte?.(0);
}

export type LegacyAvState = {
  Q: number; Z: number; vInt: number; mByte: number;
  readonly aShort: Int16Array[];
};
export type LegacyAvInput = {
  readonly state: LegacyAvState;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onCByte?: (value: number) => void;
};

/** Exact table writes and two-team short accumulation from f.av(). */
export function stepLegacyAv(input: LegacyAvInput): void {
  const { state, packedBytes, packedOffsets } = input;
  state.Q = 15; state.Z = 0;
  packedBytes[packedOffsets[153] + 116 + state.Q] = 0;
  packedBytes[packedOffsets[153] + 145 + state.Q] = 2;
  packedBytes[packedOffsets[153] + 58 + state.Q] = 0;
  input.onCByte?.(75);
  state.vInt = 71; state.mByte = -1;
  for (let team = 0; team < 2; team++) for (let j = 0; j < 5; j++) {
    state.aShort[team][24] = toShort(state.aShort[team][24] +
      Math.trunc(state.aShort[team][19 + j] * packedBytes[packedOffsets[112] + j] / 10));
  }
}

export type LegacyAwState = { q: number; R: number; Q: number; W: boolean; Z: number; r: number; af: boolean; vInt: number; aaInt: number };
export function stepLegacyAw(state: LegacyAwState): void {
  state.q = 7; state.R = state.Q;
  if (state.W) { state.Q = 3; state.Z = 0; }
  else if (state.r > 0 || state.af) { state.Q = 13; state.Z = 1; }
  else { state.vInt = 70; state.Q = 21; state.Z = 0; }
  state.aaInt = 1;
}

export type LegacyAxState = { Z: number; Q: number; R: number; q: number; s: number; V: number; vInt: number; pByte: number; aaInt: number; r: number };
export function stepLegacyAx(state: LegacyAxState): void {
  state.Z = 0; state.R = state.Q;
  if (state.q < 7) {
    if (state.s > -1) { state.Q = 16; state.vInt = 62; return; }
    if (state.Q === 4) { state.Q = 16; state.vInt = 60; state.pByte = 0; return; }
    state.Q = state.V;
  } else { state.Q = 13; state.aaInt = 1; state.Z = 1; }
}

export type LegacyAyState = { X: boolean; Q: number; R: number; vInt: number; U: number; Z: number; c: number; g: number };
export type LegacyAyInput = { readonly state: LegacyAyState; readonly onAM?: () => void };
export function stepLegacyAy(input: LegacyAyInput): void {
  const { state } = input;
  if (!state.X) { state.R = state.Q; state.Q = 16; state.vInt = 65; return; }
  input.onAM?.(); state.Q = state.U; state.Z = 0; state.c = -1; state.g = 0;
}

export type LegacyAzState = { Q: number; R: number; Z: number; aaInt: number; vInt: number };
export type LegacyAzInput = { readonly state: LegacyAzState; readonly packedBytes: Int8Array; readonly packedOffsets: Int16Array };
export function stepLegacyAz(input: LegacyAzInput): void {
  const { state, packedBytes, packedOffsets } = input;
  state.R = state.Q; state.Q = 15; state.aaInt = state.Z; state.vInt = 71;
  packedBytes[packedOffsets[153] + 145 + state.Q] = 0;
  packedBytes[packedOffsets[153] + 58 + state.Q] = 1;
}

export type LegacyAABranchState = { Q: number; R: number; Z: number; aaInt: number; X: boolean; q: number; t: number; W: boolean; T: number; vInt: number };
export function stepLegacyAA(state: LegacyAABranchState): void {
  state.R = state.Q; state.aaInt = state.Z; state.X = true;
  if ((state.q < 7 && state.t > -1) || (state.q >= 7 && state.W)) { state.Q = 16; state.vInt = 64; return; }
  state.T = 1; state.Q = 22; state.vInt = 69; state.R = 21;
}

function toShort(value: number): number {
  const narrowed = value & 0xffff;
  return narrowed >= 0x8000 ? narrowed - 0x10000 : narrowed;
}

export type LegacyAdState = {
  Q: number; q: number; s: number; t: number; T: number; R: number;
  vInt: number; vByte: number; H: boolean; b: number; c: number;
  /**
   * f.A:B (#34, `game.cursorRow`) -- a BYTE, restored from `B:B` (#37) by the
   * Q=28 branch below. Was typed `boolean` and assigned a literal `true`
   * until 2026-09-09; the real bytecode (offsets 197..202,
   * `getfield #37 // B:B; putfield #34 // A:B`) copies the saved byte.
   * Distinct from `A:Z` (#36, `AFlag`) and `A:I` (#35), the other two
   * fields sharing the bare letter.
   */
  A: number;
  cFlag: boolean; y: number; z: number; B: number; I: number;
  J: number; K: number; L: number; AFlag: boolean; selection: boolean[];
};
export type LegacyAdInput = {
  readonly state: LegacyAdState;
  readonly onSelection?: (values: boolean[]) => void;
  readonly onInputReset?: () => void;
  readonly onY?: () => void;
  readonly onE?: () => void;
  readonly onFourFlags?: (values: boolean[]) => void;
};

/** Exact f.aD() exit branches; private Y/E/i/a calls remain callbacks. */
export function stepLegacyAd(input: LegacyAdInput): void {
  const { state } = input;
  if (state.Q === 31) {
    if (state.t < state.s && state.q < 7) {
      state.q = state.s;
      if (state.q >= 1) state.q = toByte(state.q + 1);
      state.T = 0; state.Q = 22; state.vInt = 69; state.R = 18;
    } else { state.T = 2; state.Q = 22; state.vInt = 69; state.R = 28; }
    state.b = state.c;
  }
  if (state.Q === 28) {
    input.onSelection?.([state.selection[0], state.selection[1], state.selection[2], state.selection[4], state.selection[5], state.selection[6], state.selection[7], state.selection[8], state.selection[9]]);
    state.cFlag = false; state.y = state.z; state.A = state.B; state.I = state.J; state.K = state.L; state.AFlag = true; state.vByte = 1;
    input.onInputReset?.();
  } else if (state.Q === 19) {
    input.onY?.(); input.onE?.();
  } else if (state.Q === 30) {
    state.Q = 16; state.vInt = 68; state.H = true;
  } else if (state.Q === 29) {
    // Offsets 290..306: `a(ZZZZ)(1,1,0,0)`, `A:Z = true`, `Q = 28`. There is
    // NO `A:B` write here -- a `state.A = true` used to sit between the
    // first two, invented (removed 2026-09-09, verified against offsets
    // 281..309: the only putfields are #36 and #90).
    input.onFourFlags?.([true, true, false, false]); state.AFlag = true; state.Q = 28;
  }
}

export type LegacyAbState = { Q: number; Z: number; y: number; ab: number; QFlag: boolean };
export type LegacyAbInput = { readonly state: LegacyAbState; readonly packedBytes: Int8Array; readonly packedOffsets: Int16Array };

/** Exact downward selector movement from f.aB(). */
export function stepLegacyAB(input: LegacyAbInput): void {
  const { state, packedBytes, packedOffsets } = input;
  if (packedBytes[packedOffsets[153] + 174 + state.Q] === 1) {
    if (!state.QFlag) state.y -= 1;
    return;
  }
  if (state.Q === 12) state.Z -= 1;
  else if (state.Q === 13 && state.Z === 1) state.Z -= 1;
  state.Z = state.Z > 0 ? state.Z - 1 : state.ab - 1;
}

export type LegacyAcState = { Q: number; Z: number; y: number; ab: number; RFlag: boolean };
export type LegacyAcInput = { readonly state: LegacyAcState; readonly packedBytes: Int8Array; readonly packedOffsets: Int16Array };

/** Exact upward selector movement from f.aC(). */
export function stepLegacyAC(input: LegacyAcInput): void {
  const { state, packedBytes, packedOffsets } = input;
  if (packedBytes[packedOffsets[153] + 174 + state.Q] === 1) {
    if (!state.RFlag) state.y += 1;
    return;
  }
  state.Z = state.Z >= state.ab - 1 ? 0 : state.Z + 1;
  if (state.Q === 12) state.Z = Math.trunc(state.Z / 2) * 2 + 1;
  else if (state.Q === 13 && state.Z === 0) state.Z = 1;
}

export type LegacyAeState = {
  /** f.F:I (#52) -- five-tick cooldown counter, local to aE()/V() only. */
  F: number;
  /**
   * f.F:B (#50) -- a WIDELY different, widely-shared field that merely
   * happens to share the source name "F" with f.F:I above; confirmed
   * distinct via constant-pool index (2026-08-14, see
   * gameplay-paint-cluster.md's "f.aE()'s F:I/F:B conflation" section).
   * An earlier revision of this function collapsed both writes into one
   * `state.F` property (`state.F = 0; state.F = 4;`), silently discarding
   * the #52 write -- fixed here, kept as its own field.
   */
  byteF: number;
  uFlag: boolean; tFlag: boolean; k: number; q: number;
  y: number; I: number; A: number; K: number; G: number; HCoord: number;
};
export type LegacyAeInput = {
  readonly state: LegacyAeState;
  readonly onFourFlags?: (values: boolean[]) => void;
  readonly onAI?: () => void;
};

/** Exact five-tick transition and coordinate accumulation from f.aE(). */
export function stepLegacyAe(input: LegacyAeInput): void {
  const { state } = input;
  state.F += 1;
  if (state.F <= 4) return;
  state.uFlag = true; state.tFlag = false; state.F = 0; state.byteF = 4; state.k = 0;
  input.onFourFlags?.([true, true, false, false]);
  state.q = 0; state.G = state.y + state.I; state.HCoord = state.A + state.K;
  input.onAI?.();
}





function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

/** Exact fixed writes and gates from f.al(). */
export function stepLegacyAl(state: LegacyAlState, callbacks: LegacyAlCallbacks = {}): void {
  if (state.screen !== 27 || (state.iFlag === false && state.staticL === false)) return;
  state.iFlag = false;
  state.staticL = false;
  state.inputV = false;
  state.E = 4;
  callbacks.onResetInput?.();
  state.screen = state.R;
  state.R = state.S;
  state.H = true;
  state.vInt = state.x;
  if (state.eByte > 0) callbacks.onAQ?.();
}

/** Direct orchestration port of f.ak(); child methods remain callbacks. */
export function stepLegacyAk(state: LegacyAkState, callbacks: LegacyAkCallbacks = {}): void {
  try {
    callbacks.onAl?.();
    if (state.screen === 22 || state.screen === 23) {
      callbacks.onAm?.();
    } else if (state.staticM) {
      state.staticM = false;
      callbacks.onAn?.();
    } else {
      if (state.iFlag || state.staticL || state.jFlag) {
        // Bytecode branches to the confirmation block when Q < 28; for
        // Q >= 28 only Q == 32 enters it (and returns before ao()).
        if (state.aR <= 0 && state.aP === 0 && (state.screen < 28 || state.screen === 32)) {
          state.jFlag = false;
          state.iFlag = false;
          state.staticL = false;
          state.inputV = false;
          state.E = 4;
          if (state.screen === 32) return;
          callbacks.onAo?.();
        }
      } else if (state.inputUp) {
        callbacks.onAb?.();
      } else if (state.inputDown) {
        callbacks.onAc?.();
      }
    }
    callbacks.onAd?.();
  } catch {
    // f.ak() catches exceptions from its first block and returns.
  }
}
