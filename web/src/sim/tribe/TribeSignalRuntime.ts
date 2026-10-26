import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import { stepLegacySubsystemBBoolean2 } from "./LegacySubsystemBBoolean2";
import { stepLegacyEntityMarkerCommit } from "../units/LegacyEntityMarkerCommit";
import { syncLegacySubsystemBCoordinate } from "./LegacySubsystemBCoordinateSync";
import { UNIT_JOB_TYPE, UNIT_RANGED_SKILL, UNIT_TYPE, UNIT_VISION, UNIT_Y } from "../../core/DenseLayout";
import { T_TYPE_JOB } from "../../core/DataTables";
import { stepLegacySubsystemClampBounds } from "./LegacySubsystemClampBounds";
import { stepLegacySubsystemNearbyMarkerLookup } from "./LegacySubsystemNearbyMarkerLookup";
/**
 * `b.w()`'s `onJ` target: private void J() (#246), bytecode/b-javap.txt
 * offsets 0..723 (line 24999).
 *
 * RETRACTED-PREMISE (2026-09-07), FULLY PORTED (2026-09-07). The
 * 2026-08-20 throw was built on `b.b:[S]` (#132, rt port's
 * `saveOffsets`) being permanently null -- disproven the same day as
 * rt project's other "permanently null field" claims (`e.f()`
 * allocates it, `b.a(f)` copies it in; see `docs/unknowns.md`'s
 * 2026-09-04 entries). The method really is pure field arithmetic --
 * zero `invoke*` anywhere in its 723 raw offsets, confirmed -- but that
 * arithmetic is real, working per-entity scratch computation, not a
 * crash. Full instruction-by-instruction trace:
 *
 *  1. offset 0..2: `A:I`(#7, `game.subsystemA`) = 1.
 *  2. offset 5..41: `type = dense[2828+id]`; if
 *     `(packedBytes[packedOffsets[27]+type] & 32) === 0`, `A = -1`.
 *  3. offset 42..116: `t35 = packedBytes[packedOffsets[35]+type]`;
 *     `x1 = dense[saveOffsets[t35]+id]`;
 *     `t36 = packedBytes[packedOffsets[36]+type]`;
 *     `C:I`(#10) `= (x1+t36) * A`.
 *  4. offset 119..331: re-reads `x3 = packedBytes[packedOffsets[35]+type]`
 *     (index 35 again, recomputed rather than cached -- reproduced as a
 *     second read, not reused). If `x3 in [69,74]` AND `team===0`
 *     (`u:I`#222, `game.bTeam`): reads `idx17 =
 *     mainArrays.aShort[0][17]`, and if BOTH `dense[id]-dense[idx17]`
 *     and `dense[101+id]-dense[101+idx17]` are in `[-4,4]`,
 *     `C = Math.trunc(C*3/2)` (`idiv` truncates toward zero).
 *  5. offset 334..459: `x6 = packedBytes[packedOffsets[33]+type]`. If
 *     `x6 > 0`: `dense[saveOffsets[x6]+id] += C` (byte-narrowed, i2b).
 *     Else: `mainArrays.aShort[team][-x6] += C` (short-narrowed, i2s).
 *  6. offset 460..462: `A = 1` (unconditional reset).
 *  7. offset 465..499: same mask-check shape as step 2 but bit `16`
 *     against `packedOffsets[27]+type`: if the bit is 0, `A = -1`.
 *  8. offset 502..603: `x8 = packedBytes[packedOffsets[34]+type]`. If
 *     `x8 >= 0`: `C = x8`. Else: `C = dense[saveOffsets[-x8]+id]`.
 *  9. offset 606..668: `x9 = packedBytes[packedOffsets[31]+type]`;
 *     `off = saveOffsets[x9] + dense[3838+id]`;
 *     `dense[off] += C*A` (byte-narrowed).
 *  10. offset 669..723: `subsystemR`(#49, `game.subsystemR`) `=
 *      dense[off]` -- re-reads `off` the same way and picks up the
 *      value step 9 JUST wrote there.
 *
 * `C:I`(#10) is genuine cross-method scratch -- ~48 references spread
 * across ~10 other, not-yet-ported methods in rt class (confirmed via
 * `grep -n "#10 " bytecode/b-javap.txt`) -- so it's modeled as a real
 * field, `LegacySubsystemArrays.bField10`, not a local; see that file's
 * own docblock for the field. `id` stands in for the ambient `v:I`
 * (#225) rt ported method reads directly, same convention as rt
 * file's `subsystemEntityAAlert` below.
 *
 * REACHABILITY CORRECTION (2026-09-07): the 2026-08-20/29 chain
 * ("J() always throws" -> "i()'s offset 196..1028 is unreachable" ->
 * "j():Z's only call site is unreachable" -> "K() is unreachable") was
 * entirely downstream of the SAME retracted premise as rt method's
 * own old throw. With J() no longer throwing, `i()`'s call to it
 * (offset 192-195, `LegacySubsystemEntityProbe.ts`) returns normally
 * like any other call, so `i()`'s offset 196..1028 -- including
 * `j():Z`'s only call site in the class (offset 595) -- IS reachable,
 * and so is `K()` (`j()`'s only caller). Neither `j()` nor `K()` is
 * (re-)ported here: both already have complete, tested implementations
 * in `LegacySubsystemEntityAssociationScan.ts`/
 * `LegacySubsystemEntityTypeReaction.ts` ("ported anyway, fully
 * derived, for the record" per their own docblocks, written back when
 * they were believed unreachable) -- rt fix just makes those existing
 * ports actually reachable. NOTE: `LegacySubsystemEntityProbe.ts`'s own
 * docblock still asserts the old "everything past offset 196 in i() is
 * provably 100% UNREACHABLE" conclusion and needs the same correction;
 * left as-is here (out of rt file's scope) but flagged for follow-up.
 */
export function subsystemEntityJTrigger(rt: LegacyRuntimeState, id: number): void {
  const dense = rt.denseState;
  const { packedBytes, packedOffsets, saveOffsets } = rt;
  const arrays = rt.subsystemArrays;
  const aShort = rt.mainArrays.aShort;
  const type = dense[UNIT_TYPE + id] ?? 0;

  const g = rt.game;
  g.subsystemA = 1;
  if (((packedBytes[(packedOffsets[27] ?? 0) + type] ?? 0) & 32) === 0) g.subsystemA = -1;

  const t35 = packedBytes[(packedOffsets[35] ?? 0) + type] ?? 0;
  const x1 = dense[(saveOffsets[t35] ?? 0) + id] ?? 0;
  const t36 = packedBytes[(packedOffsets[36] ?? 0) + type] ?? 0;
  arrays.bField10 = (x1 + t36) * g.subsystemA;

  const x3 = packedBytes[(packedOffsets[35] ?? 0) + type] ?? 0;
  if (x3 >= 69 && x3 <= 74 && rt.game.bTeam === 0) {
    const idx17 = aShort[0]?.[17] ?? 0;
    const d1 = (dense[id] ?? 0) - (dense[idx17] ?? 0);
    const d2 = (dense[UNIT_Y + id] ?? 0) - (dense[UNIT_Y + idx17] ?? 0);
    if (d1 >= -4 && d1 <= 4 && d2 >= -4 && d2 <= 4) {
      arrays.bField10 = Math.trunc((arrays.bField10 * 3) / 2);
    }
  }

  const team = rt.game.bTeam;
  const x6 = packedBytes[(packedOffsets[33] ?? 0) + type] ?? 0;
  if (x6 > 0) {
    const off = (saveOffsets[x6] ?? 0) + id;
    dense[off] = (dense[off] ?? 0) + arrays.bField10;
  } else {
    const row = aShort[team];
    if (row) {
      const idx = -x6;
      row[idx] = (row[idx] ?? 0) + arrays.bField10;
    }
  }

  g.subsystemA = 1;
  if (((packedBytes[(packedOffsets[27] ?? 0) + type] ?? 0) & 16) === 0) g.subsystemA = -1;

  const x8 = packedBytes[(packedOffsets[34] ?? 0) + type] ?? 0;
  if (x8 >= 0) {
    arrays.bField10 = x8;
  } else {
    arrays.bField10 = dense[(saveOffsets[-x8] ?? 0) + id] ?? 0;
  }

  const x9 = packedBytes[(packedOffsets[31] ?? 0) + type] ?? 0;
  const off = (saveOffsets[x9] ?? 0) + (dense[3838 + id] ?? 0);
  dense[off] = (dense[off] ?? 0) + arrays.bField10 * g.subsystemA;
  g.subsystemR = dense[off] ?? 0;
}

/**
 * `subsystemB`'s own `onA` target: private void A() (bytecode/b-javap.txt
 * offsets 0..903, line 16568), fired right after `legacySubsystemBEntryGate`
 * returns true.
 *
 * RETRACTED-PREMISE (2026-09-07), FULLY PORTED (2026-09-07). The
 * 2026-08-20 throw was built on `b.b:[S]` (#132, `saveOffsets`) being
 * permanently null -- disproven (`e.f()` allocates it, `b.a(f)` copies
 * it in; see `docs/unknowns.md`'s 2026-09-04 entries). Zero `invoke*`
 * in the whole method except one static helper -- `private static int
 * b(int,int,int)` (#334, bytecode/b-javap.txt:7562..7575): `arg0<arg1 ?
 * arg1 : arg0>=arg2 ? arg2 : arg0`, i.e. `clamp(value,min,max)` --
 * inlined below rather than left a callback, matching rt file's own
 * `Math.max(min, Math.min(max, value))` idiom for the SAME helper used
 * elsewhere in rt class (e.g. `onClamp` in the `onAv`/`aq()` wiring
 * above). Full instruction-by-instruction trace:
 *
 *  1. offset 0..38 (already ported, unchanged):
 *     `dense[2222+id] = packedBytes[packedOffsets[41]+dense[6464+id]]`.
 *  2. offset 39..97: seed four scratch slots --
 *     `for (i=0;i<4;i++) dense[saveOffsets[23+i]+id] = 9 + (i>>1)`
 *     (writes 9,9,10,10 into slots 23..26).
 *  3. offset 97..329: for `i` from 2 down to 0, scans `j` in `[25,26]`
 *     (in that order) comparing
 *     `lhs = dense[saveOffsets[packedBytes[packedOffsets[107]+dense[saveOffsets[j]+id]]]+id]`
 *     against `rhs = dense[saveOffsets[packedBytes[packedOffsets[107]+i]]+id]`;
 *     on the first `j` where `lhs<=rhs`, shifts
 *     `dense[saveOffsets[26..j+1]+id]` each one slot toward 26 (evicting
 *     slot 26), writes `i` into `dense[saveOffsets[j]+id]`, and stops
 *     scanning `j` for rt `i` (bytecode jumps straight to the `i--`
 *     step, offset 316) -- if no `j` matches, `i` is silently dropped
 *     (not inserted anywhere).
 *  4. offset 329..377: `dense[1818+id] = clamp(dense[1818+id], 3 +
 *     Math.trunc(dense[1616+id]/2), 7)` (`idiv` truncates toward zero).
 *  5. offset 378..424: `dense[4949+id] = clamp(dense[4949+id],
 *     dense[1818+id]+1, 9)` -- reads the JUST-updated `dense[1818+id]`
 *     from step 4.
 *  6. offset 425..777: for `i` from 3 to 8, scans `j` in `[23,24]`. Same
 *     `lhs`/`rhs` formula as step 3 but the CONTINUE condition is
 *     inverted (`lhs<rhs` to proceed to the candidate checks below, vs
 *     step 3's `lhs<=rhs` to insert immediately) -- if `lhs>=rhs`, tries
 *     the next `j`. On a candidate `j`: if `i === dense[2525+id]` or
 *     `i === dense[2626+id]`, rt `i` is abandoned entirely (no
 *     insert, straight to `i++`). Otherwise computes `valE =
 *     packedBytes[packedOffsets[108]+i]`, `valF = dense[2222+id]`,
 *     `cmpVal = (valF<8 && valF>0) ? 7 : valF`; if `valE === cmpVal`,
 *     rt `i` is likewise abandoned. Otherwise shifts
 *     `dense[saveOffsets[24..j+1]+id]` and inserts `i` at
 *     `dense[saveOffsets[j]+id]`, then stops scanning `j` for rt `i`
 *     (mirrors step 3's insert-and-break, over slots 23..24, with the
 *     two extra exclusion checks). If `j` exhausts `[23,24]` without a
 *     match, `i` is dropped like step 3.
 *  7. offset 777..903: `for (j=23;j<=26;j++)`: `valG =
 *     dense[saveOffsets[j]+id]`; if `valG>8`, `dense[saveOffsets[j]+id]
 *     = -1`; else `dense[saveOffsets[j]+id] =
 *     packedBytes[packedOffsets[108]+valG]` (self-referential lookup,
 *     reads the SAME slot it's about to overwrite).
 *
 * `I:I`(#24)/`J:I`(#27)/`K:I`(#29) are real object fields, also
 * read/written by `private void B()` (the very next method in the
 * class, not ported -- confirmed via `grep -n "#24 "` etc spilling past
 * rt method's own line range) -- but every access within `A()` itself
 * writes each one before it's ever read, so they're modeled as ordinary
 * locals (`i`/`j`/`k`) here; `B()`'s own use of their possibly-stale
 * post-`A()` values is `B()`'s concern, not modeled by rt port.
 */
export function subsystemEntityAAlert(rt: LegacyRuntimeState, id: number): void {
  const dense = rt.denseState;
  const { packedBytes, packedOffsets, saveOffsets } = rt;
  const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

  dense[2222 + id] = packedBytes[
    (packedOffsets[T_TYPE_JOB] ?? 0) + (dense[UNIT_JOB_TYPE + id] ?? 0)
  ] ?? 0;

  for (let i = 0; i < 4; i += 1) {
    dense[(saveOffsets[23 + i] ?? 0) + id] = 9 + (i >> 1);
  }

  for (let i = 2; i >= 0; i -= 1) {
    for (let j = 25; j <= 26; j += 1) {
      const slotType = dense[(saveOffsets[j] ?? 0) + id] ?? 0;
      const lhs = dense[(saveOffsets[packedBytes[(packedOffsets[107] ?? 0) + slotType] ?? 0] ?? 0) + id] ?? 0;
      const rhs = dense[(saveOffsets[packedBytes[(packedOffsets[107] ?? 0) + i] ?? 0] ?? 0) + id] ?? 0;
      if (lhs <= rhs) {
        for (let k = 26; k > j; k -= 1) {
          dense[(saveOffsets[k] ?? 0) + id] = dense[(saveOffsets[k - 1] ?? 0) + id] ?? 0;
        }
        dense[(saveOffsets[j] ?? 0) + id] = i;
        break;
      }
    }
  }

  dense[1818 + id] = clamp(dense[1818 + id] ?? 0, 3 + Math.trunc((dense[UNIT_RANGED_SKILL + id] ?? 0) / 2), 7);
  dense[UNIT_VISION + id] = clamp(dense[UNIT_VISION + id] ?? 0, (dense[1818 + id] ?? 0) + 1, 9);

  for (let i = 3; i < 9; i += 1) {
    for (let j = 23; j <= 24; j += 1) {
      const slotType = dense[(saveOffsets[j] ?? 0) + id] ?? 0;
      const lhs = dense[(saveOffsets[packedBytes[(packedOffsets[107] ?? 0) + slotType] ?? 0] ?? 0) + id] ?? 0;
      const rhs = dense[(saveOffsets[packedBytes[(packedOffsets[107] ?? 0) + i] ?? 0] ?? 0) + id] ?? 0;
      if (lhs >= rhs) continue;
      if (i === (dense[2525 + id] ?? 0) || i === (dense[2626 + id] ?? 0)) break;
      const valE = packedBytes[(packedOffsets[108] ?? 0) + i] ?? 0;
      const valF = dense[2222 + id] ?? 0;
      const cmpVal = valF < 8 && valF > 0 ? 7 : valF;
      if (valE === cmpVal) break;
      for (let k = 24; k > j; k -= 1) {
        dense[(saveOffsets[k] ?? 0) + id] = dense[(saveOffsets[k - 1] ?? 0) + id] ?? 0;
      }
      dense[(saveOffsets[j] ?? 0) + id] = i;
      break;
    }
  }

  for (let j = 23; j <= 26; j += 1) {
    const off = (saveOffsets[j] ?? 0) + id;
    const valG = dense[off] ?? 0;
    dense[off] = valG > 8 ? -1 : (packedBytes[(packedOffsets[108] ?? 0) + valG] ?? 0);
  }
}

/**
 * `private boolean p()` (#409, `LegacySubsystemBBoolean2.ts`) plus its
 * `H()` (#244, `LegacyEntityMarkerCommit.ts`) commit half -- shared by all
 * three of `p()`'s call sites. The original discards `p()`'s result at two
 * of them; rt returns it for the third (`r()`'s own `type <= 9 && p()`
 * short-circuit).
 */
export function subsystemMarkerScan(rt: LegacyRuntimeState, id: number, team: number): boolean {
  const game = rt.game;
  const arrays = rt.subsystemArrays;
  const dense = rt.denseState;
  const scratch = {
    get y() { return arrays.bField232; }, set y(value: number) { arrays.bField232 = value; },
    get z() { return arrays.bField235; }, set z(value: number) { arrays.bField235 = value; },
    get A() { return arrays.bField6; }, set A(value: number) { arrays.bField6 = value; },
    get B() { return game.subsystemB; }, set B(value: number) { game.subsystemB = value; },
    get a() { return arrays.bField73; }, set a(value: boolean) { arrays.bField73 = value; },
    get f() { return game.subsystemFFlag; }, set f(value: boolean) { game.subsystemFFlag = value; },
    get zInt() { return game.subsystemEntityZ; }, set zInt(value: number) { game.subsystemEntityZ = value; },
    get D() { return arrays.bField13; }, set D(value: number) { arrays.bField13 = value; },
    get F() { return arrays.bField17; }, set F(value: number) { arrays.bField17 = value; },
  };

  return stepLegacySubsystemBBoolean2({
    state: dense,
    entityId: id,
    sceneQ: game.mission,
    fByte: game.subsystemGFFlagByte,
    team,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    gridC: rt.gridC,
    arrays,
    bFlag: arrays.bField137,
    aFlag: { get value() { return arrays.bField73; }, set value(next: boolean) { arrays.bField73 = next; } },
    zInt: game.subsystemEntityZ,
    bValue: rt.subsystemArrays.bField8,
    bByte: { get value() { return game.subsystemB; }, set value(next: number) { game.subsystemB = next; } },
    onH: () => stepLegacyEntityMarkerCommit({
      state: dense,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      gridC: rt.gridC,
      v: id,
      team,
      sceneQ: game.mission,
      fByte: game.subsystemGFFlagByte,
      IByte: game.subsystemGCurrentI,
      bValue: () => rt.subsystemArrays.bField8,
      nFlag: game.callToArmsActive,
      dShort: arrays.dShort,
      scratch,
      onCoordinateSync: (target, flag) => syncLegacySubsystemBCoordinate({
        dense, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
        // a(int,boolean) offset 286: a(id, 69) (#275), wired 2026-09-27.
        onSpawnMark: (unit) => rt.changeEntityType(unit, 69),
      }, target, flag),
      onChangeType: (target, type) => { rt.changeEntityType(target, type); },
      onGroupMode: (argument) => rt.subsystemG(id, argument),
      onOccupancy: (x, y, mode) => rt.occupancyCheck(id, x, y, mode),
      onPVoid: () => rt.stepSubsystemP(id),
      onIUpdate: (argument) => rt.stepEntityIUpdate(id, argument, team),
      onMoveTrigger: (action, target, id2) => rt.entityMove(action, target, id2),
      onByteAction: (type, x, y, value) => rt.runByteActionQueue(type, x, y, value),
      // `private void a(byte,byte,byte)` (#291, b-javap.txt:31910): three
      // instructions -- the same bounding box b(byte,byte,byte) computes,
      // `aj:I = u:I`, then the marker scan again with D:B as its mode.
      onMarkerRescan: (x, y, range) => subsystemMarkerRescan(rt, id, x, y, range),
      onAuxRecord: (first, second, x, y) => rt.runAuxiliaryPlacement(first, second, x, y, id),
    }),
  });
}

/**
 * `private void a(byte,byte,byte)` (#291, b-javap.txt:31910) -- three
 * instructions: the bounding box `b(byte,byte,byte)` computes, `aj:I = u:I`,
 * then the marker scan again with `D:B` as its mode. Shared by `H()`'s
 * offset-1198 rescan and the strike gate's offset-609 record wake-up.
 */
export function subsystemMarkerRescan(rt: LegacyRuntimeState, id: number, x: number, y: number, range: number): void {
  const arrays = rt.subsystemArrays;
  const bounds = stepLegacySubsystemClampBounds(x, y, range);
  arrays.bField115 = bounds.an;
  stepLegacySubsystemNearbyMarkerLookup({
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    gridC: rt.gridC,
    arrays,
    bounds,
    layer: rt.game.bTeam,
    entityId: id,
    refX: x,
    refY: y,
    mode: arrays.bField13,
    threshold: range,
  });
}
