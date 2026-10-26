import { UNIT_HP, UNIT_SELECTION } from "../../core/DenseLayout";

export type LegacyAfState = {
  /** u:Z / t:Z (#370 / #367). */
  uFlag: boolean; tFlag: boolean;
  /** F:B (#50), k:B (#333), w:B (#382). */
  F: number; k: number; w: number;
  /** B:I..E:I (#38/#40/#43/#48): the window, left/top edge minus one and its size. */
  B: number; C: number; D: number; E: number;
};
export type LegacyAfInput = {
  readonly state: LegacyAfState;
  readonly map: readonly Int8Array[];
  readonly dense: Int8Array;
  /** f.a:[[B] (#130) row 4, the "whole window" selection list. */
  readonly a4: Int8Array;
  /** aI() (#490). */
  readonly onAI?: () => void;
  /** d(byte) (#578), run for a lone unit. */
  readonly onD?: (id: number) => void;
};

/**
 * Exact f.aF() (bytecode/f-javap.txt, 0..336): select every living team-0
 * unit in the window rows C+1..C+E, columns B+1..B+D into a[4] (909 = 4).
 * None: w = k = 0, F = -1; exactly one: it is released and handed to d(byte)
 * instead; more: F = 4, w = 1. The window is then cleared. Its loop fields
 * K/J/L:I, H:B and M:I have no reader outside aF/aG/aH, so they are locals.
 * CORRECTED 2026-09-23 (first wiring): it does not call a(ZZZZ).
 */
export function stepLegacyAf(input: LegacyAfInput): void {
  const { state, map, dense, a4 } = input;
  state.uFlag = false; state.tFlag = false; input.onAI?.();
  let count = 0;
  for (let row = state.C + 1; row <= state.C + state.E; row++) {
    for (let col = state.B + 1; col <= state.B + state.D; col++) {
      const id = map[row]?.[col] ?? 0;
      if (id >= 1 && id <= 50 && (dense[UNIT_HP + id] ?? 0) > 0) {
        if (count < 50) {
          a4[count] = id;
          dense[UNIT_SELECTION + id] = 4;
        }
        count += 1;
      }
    }
  }
  if (a4[0] === 0) {
    state.w = 0; state.k = 0; state.F = -1;
  } else if (a4[1] === 0) {
    dense[UNIT_SELECTION + a4[0]!] = 0;
    input.onD?.(a4[0]!);
    a4[0] = 0;
    state.F = -1;
  } else {
    state.F = 4; state.w = 1;
  }
  state.E = 0; state.D = 0; state.C = 0; state.B = 0;
}

export type LegacyGroupKeyState = {
  /** w:Z (#381, the digit-held flag) -- NOT w:B. */
  wFlag: boolean;
  /** I:I (#63), the 7/9 hold counter. */
  I: number;
  /** i:B (#319), the digit pressed. */
  i: number;
  /** F:B (#50), k:B (#333), w:B (#382). */
  F: number; k: number; w: number;
};
export type LegacyAgInput = {
  readonly state: LegacyGroupKeyState;
  readonly a: readonly Int8Array[];
  readonly dense: Int8Array;
  /** e(int) (#590). */
  readonly onEntityTick?: (id: number) => void;
  /** a(ZZZZ) (#434). */
  readonly onFourFlags?: (values: boolean[]) => void;
};

/** Group key 7/9 held (G = 2/3): the current selection becomes group G. Exact f.aG(), 0..300. */
export function stepLegacyAg(input: LegacyAgInput): void {
  const { state, a, dense } = input;
  state.wFlag = false; state.I = 0;
  let G: number;
  if (state.i === 7) G = 2;
  else if (state.i === 9) G = 3;
  else return;
  for (let L = 0; L < 50; L += 1) {
    a[0]![L] = state.F !== -1 ? a[state.F]![L]! : (L === 0 ? state.k : 0);
    dense[UNIT_SELECTION + a[G]![L]!] = 0;
    a[G]![L] = 0;
  }
  for (let L = 0; L < 50; L += 1) {
    const id = a[0]![L]!;
    if (id === 0) continue;
    input.onEntityTick?.(id);
    a[G]![L] = id;
    dense[UNIT_SELECTION + id] = G;
  }
  state.w = 1; state.F = G; state.k = 0;
  input.onFourFlags?.([true, true, false, false]);
}

export type LegacyAhInput = {
  readonly state: LegacyGroupKeyState;
  readonly a: readonly Int8Array[];
  readonly dense: Int8Array;
  /** aI() (#490). */
  readonly onAI?: () => void;
  /** f(int,int) (#593): pressing the group already selected jumps to its first unit. */
  readonly onJump?: (id: number, offset: number) => void;
  /** a(ZZZZ) (#434). */
  readonly onFourFlags?: (values: boolean[]) => void;
};

/** Group key 7/9 tapped: recall group G, or jump to it if already selected. Exact f.aH(), 0..215. */
export function stepLegacyAh(input: LegacyAhInput): void {
  const { state, a, dense } = input;
  state.wFlag = false; state.I = 0;
  let G: number;
  if (state.i === 7) G = 2;
  else if (state.i === 9) G = 3;
  else return;
  if (state.F === G) {
    input.onJump?.(a[state.F]![0]!, 0);
    return;
  }
  if (a[G]![0] === 0) return;
  state.F = G;
  input.onAI?.();
  for (let L = 0; L < 50; L += 1) {
    const id = a[state.F]![L]!;
    if (id !== 0) dense[UNIT_SELECTION + id] = state.F;
  }
  state.w = 1; state.k = 0;
  input.onFourFlags?.([true, true, false, false]);
}

export type LegacyAiInput = { readonly a4: Int8Array; readonly dense: Int8Array };

/** Exact a[4]/909+id cleanup from f.aI(). */
export function stepLegacyAi(input: LegacyAiInput): void {
  const { a4, dense } = input;
  for (let index = 0; index < 50; index++) {
    const id = a4[index];
    if (id !== 0) { dense[UNIT_SELECTION + id] = 0; a4[index] = 0; }
  }
}
export type LegacyAjState = { uFlag: boolean; F: number; k: number; B: number; C: number; D: number; E: number };

/** Exact guarded viewport/list reset from f.aJ(). */
export function stepLegacyAj(state: LegacyAjState): void {
  if (!state.uFlag) return;
  state.uFlag = false; state.F = -1; state.k = 0;
  state.E = 0; state.D = 0; state.C = 0; state.B = 0;
}
