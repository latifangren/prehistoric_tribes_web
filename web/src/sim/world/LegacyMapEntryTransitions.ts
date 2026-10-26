import { toJavaByte } from "../../core/RowUtils";

export type LegacyAKViewportState = {
  C: number; D: number; y: number; A: number; I: number; K: number;
  sFlag: boolean; O: number; c: number; P: number; d: number;
};

/** Exact viewport normalization from f.aK(). */
export function stepLegacyAKViewport(state: LegacyAKViewportState): void {
  state.y = state.C; state.A = state.D;
  while (state.I < 0) state.I += 1;
  while (state.K < 0) {
    if (state.sFlag) break;
    state.K += 1;
  }
  while (state.I + state.O > state.c - 1) state.I -= 1;
  while (state.K + state.P >= state.d - 1) state.K -= 1;
}

export type LegacyALState = { w: number; I: number };

/** Exact ten-step scroll decay from f.aL(). */
export function stepLegacyAL(state: LegacyALState): void {
  if (state.w !== 1) return;
  state.I += 1;
  if (state.I > 10) { state.w = 0; state.I = 0; }
}

/** `KFlag` is f.K:Z (#69, chief pick); `kFlag` is f.k:Z (#332, f.h()'s reset flag). */
export type LegacyAmResetState = {
  uFlag: boolean; tFlag: boolean; F: number; LFlag: boolean; NFlag: boolean;
  FFlag: boolean; KFlag: boolean; X: number; W: number; aL: number; uByte: number;
  ay: number; kFlag: boolean; cInt: number; h: number;
};
export type LegacyAmResetInput = {
  readonly state: LegacyAmResetState;
  readonly dense: Int8Array; readonly denseLimit: number;
  readonly aRows: Int8Array[]; readonly u: Int8Array;
  readonly c3: Int8Array[][];
  /** f.e:[[B (#280) row 0, the building-effect queue's record ids. */
  readonly entitySlots: Int8Array;
  readonly intLayers: Int32Array[]; readonly bytePlanes: Int8Array[][];
  readonly f4: Int8Array[]; readonly bPlanes: Int8Array[][];
  readonly map: Int8Array[]; readonly bMap: Int8Array[];
  readonly g: Int8Array[]; readonly gRows: number; readonly gCols: number;
  readonly shortRows: Int16Array[]; readonly sFlag: boolean;
  readonly onT?: () => void; readonly onBankReset?: () => void; readonly onInputReset?: () => void;
};

/** Exact allocation reset body from f.aM(); array meanings remain raw. */
export function resetLegacyAM(input: LegacyAmResetInput): void {
  const { state, dense, aRows, u, c3, entitySlots, intLayers, bytePlanes, f4, bPlanes, map, bMap, g, shortRows } = input;
  state.uFlag = false; state.tFlag = false; state.F = -1;
  for (let i = 0; i < input.denseLimit; i++) dense[i] = 0;
  for (let i = 0; i <= 100; i++) { dense[4040 + i] = -100; dense[4242 + i] = 1; dense[4343 + i] = -1; }
  for (const row of aRows.slice(2, 5)) row.fill(0);
  u.fill(0);
  for (let i = 0; i < 5; i++) c3[0][i][2] = -1;
  // Offsets 175..197: `e[0][i] = 0` (iconst_0; bastore). CORRECTED 2026-10-13
  // (oracle run 13, frame 200): the port wrote i, so every map entry queued
  // effects for records 1..29.
  entitySlots.fill(0);
  for (const row of intLayers) row.fill(0);
  for (const plane of bytePlanes) for (const row of plane) row.fill(0);
  for (const row of f4) row.fill(0);
  for (const plane of bPlanes) for (const row of plane) row.fill(0);
  // Bytecode 389..406: `c[i][j] = b[i][j] = 0` (iconst_0; dup_x2; bastore;
  // bastore) clears both planes; aN() loads the map afterwards. CORRECTED
  // 2026-10-10 (oracle run 7, frame 21232): this was read as a b -> c copy,
  // so quitting to the main menu kept the map in c.
  for (let i = 0; i < 96; i++) for (let j = 0; j < 96; j++) { map[i][j] = 0; bMap[i][j] = 0; }
  for (let i = 0; i < input.gRows; i++) for (let j = 0; j < input.gCols; j++) g[i][j] = 0;
  if (!input.sFlag) { shortRows[0].fill(0); shortRows[1].fill(0); }
  shortRows[0][17] = 0; shortRows[0][16] = 1;
  input.onT?.(); state.cInt = 0; state.h = 0; state.NFlag = false; state.LFlag = false; state.FFlag = false; state.KFlag = false;
  state.X = 0; state.W = 0; state.aL = 0; state.uByte = 0; state.ay = 0;
  input.onBankReset?.(); input.onInputReset?.(); state.kFlag = true;
}

export type LegacyAOMapState = { q: number; C: number; D: number; y: number; A: number; I: number; J: number; K: number; L: number; z: number; B: number };
export type LegacyAOMapInput = {
  readonly state: LegacyAOMapState;
  readonly packedBytes: Int8Array; readonly packedOffsets: Int16Array;
  /** f.a:[[S (#131) -- `mainArrays.aShort`, the 2x26 per-team short table. */
  readonly aShort: Int16Array[];
  readonly onAP?: () => void; readonly onViewportNormalize?: () => void; readonly onSpatialPass?: () => void;
};

/** Exact f.aO() map-entry wrapper; f.aP/aK/b.d remain explicit boundaries. */
export function stepLegacyAOMap(input: LegacyAOMapInput): void {
  const { state, packedBytes, packedOffsets } = input;
  input.onAP?.();
  // Offsets 4..25: `getfield #131 // a:[[S; iconst_0; aaload; bipush 17;
  // <q==3 ? 0 : 1>; sastore` -- i.e. `aShort[0][17]`, the SAME slot af()
  // writes at its own offsets 115..128 (see LegacyZAf.ts).
  //
  // BUG FIX (2026-09-09): this was
  // `packedBytes[packedOffsets[153] + 145 + 17] = ...`, which is not this
  // statement at all -- it wrote into the loaded /pd0 byte table (the
  // `a[a_s[153] + <sub-offset> + Q]` per-Q flag family several other methods
  // read) instead of f's own short array, corrupting resource data on every
  // map entry. The literal 17 here is an index into `a:[[S`'s 26-entry row,
  // not a Q value.
  input.aShort[0][17] = state.q === 3 ? 0 : 1;
  state.y = state.C; state.A = state.D;
  const base = packedOffsets[150] + state.q * 2;
  state.I = toJavaByte(packedBytes[base] - state.y); state.J = state.I;
  state.K = toJavaByte(packedBytes[base + 1] - state.A); state.L = state.K;
  input.onViewportNormalize?.();
  state.J = state.I; state.L = state.K; state.z = state.y; state.B = state.A;
  input.onSpatialPass?.();
}

export type LegacyMapEntryCallbacks = {
  readonly onAM?: () => void;
  readonly onAN?: () => void;
  readonly onAO?: () => void;
};

/** Exact private f.g(byte) wrapper: q assignment, aM(), aN(), then aO(). */
export function stepLegacyMapEntry(
  state: { q: number },
  q: number,
  callbacks: LegacyMapEntryCallbacks = {},
): void {
  try {
    state.q = q;
    callbacks.onAM?.();
    callbacks.onAN?.();
    callbacks.onAO?.();
  } catch {
    // f.g(byte) swallows the broad Exception boundary after the three calls.
  }
}

export type LegacyAPPrefixState = { q: number; bByte: number; awByte: number };
export type LegacyAPPrefixInput = {
  readonly state: LegacyAPPrefixState;
  readonly packedBytes: Int8Array; readonly packedOffsets: Int16Array;
  readonly shortRows: Int16Array[];
  readonly onDenseWrite?: (index: number, value: number) => void;
  readonly onPlaceFive?: (first: number, second: number, third: number, fourth: number, fifth: number, flag: boolean, value: number) => void;
  readonly onCreateRecord?: (first: number, second: number, third: number, fourth: number, fifth: number) => void;
  /** f.b(int,int,int,int) (#540), the 22-slot animal record -- not b.b(IIII). */
  readonly onAuxRecord?: (first: number, second: number, third: number, fourth: number) => void;
};

/** Complete table-decoded placement loop from f.aP(); downstream callers remain explicit. */
export function stepLegacyAPPrefix(input: LegacyAPPrefixInput): void {
  const { state, packedBytes, packedOffsets } = input;
  if (state.q === 3) state.awByte = 0;
  // BUG FIX (2026-09-09): was `packedOffsets[250] + state.q`. Offsets 13..26
  // are `getfield #138 // a:[S; sipush 250; getfield q:B; iadd; saload` --
  // the `iadd` happens BEFORE the `saload`, so `q` indexes the OFFSETS table:
  // `a_s[250 + q]`. The very next statement (offsets 27..45) uses the other
  // idiom, `a[a_s[262] + q]`, with the `iadd` after its `saload` -- and the
  // port had applied that second shape to both. The two coincide only at
  // q === 0, so every map except the first read its placement records from a
  // block a few bytes off, which is why q>=2's decoded unit x/y ranges came
  // out as each other's values.
  const recordBase = packedOffsets[250 + state.q];
  const count = packedBytes[packedOffsets[262] + state.q];
  for (let index = 0; index < count; index++) {
    const first = packedBytes[recordBase + index];
    if (first === -1) break;
    const second = packedBytes[recordBase + count + index];
    const third = packedBytes[recordBase + count * 2 + index];
    const fourth = packedBytes[recordBase + count * 3 + index];
    const fifth = packedBytes[recordBase + count * 4 + index];
    if (second >= 0) input.onPlaceFive?.(first, second, third, fourth, fifth, true, -1);
    else if (second === -1) input.onCreateRecord?.(first & 1, third, fourth, fifth, (first >> 1) + ((first & 1) !== 0 ? state.bByte : 0));
    else if (second === -2) input.onAuxRecord?.(1, third, fourth, first);
    if (index <= 10 && state.q !== 1 && state.q !== 6) {
      // Offsets 369..385 and 396..421. Row 0 uses `a_s[263] + 11*q*2 + i`;
      // row 1 uses `a_s[263] + 11*(q*2 + 1) + i` -- the `iconst_1; iadd` at
      // 415..416 lands INSIDE the multiply (`imul` at 417), not after it.
      // BUG FIX (2026-09-09): row 1 was `packedOffsets[263] * (11*q*2 + 1)`,
      // a multiplication where the bytecode adds, with the +1 outside the
      // 11* as well -- two errors in one expression.
      const shortIndex0 = packedOffsets[263] + 11 * state.q * 2 + index;
      const shortIndex1 = packedOffsets[263] + 11 * (state.q * 2 + 1) + index;
      input.shortRows[0][index] = packedBytes[shortIndex0];
      input.shortRows[1][index] = packedBytes[shortIndex1] * 20;
    }
  }
  if (state.q === 0) { input.onDenseWrite?.(7476, 4); input.onDenseWrite?.(7479, 5); }
  else if (state.q === 3) state.awByte = 2;
}
