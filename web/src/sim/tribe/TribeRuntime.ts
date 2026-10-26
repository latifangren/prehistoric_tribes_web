import { subsystemTeamOneAiMuster } from "./TribeAiMusterRuntime";
import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import { stepLegacySubsystemEntityRevertIdle } from "./LegacySubsystemEntityRevertIdle";
import { stepLegacyClassCReset } from "../../platform/LegacyResourceTables";
import { LegacySubsystemArrays } from "../../core/LegacySubsystemArrays";
import { stepLegacyEntityGPrefix } from "../units/LegacyEntityGPrefix";
import { stepLegacyEntityHPrefix } from "../units/LegacyEntityHPrefix";
import { stepLegacyEntityHActionBranch } from "../units/LegacyEntityHActionBranch";
import { stepLegacyD as stepLegacyFD } from "../../ui/LegacyFrameProgressionScan";
import { resetLegacyZI } from "../../ui/LegacyZI";
import { enqueueLegacyEffectSlot } from "../../render/LegacyEffectSlotScan";
import { legacySubsystemDecision } from "./LegacySubsystemDecision";
import { subsystemMarkerScan } from "./TribeSignalRuntime";
import { allocateLegacySubsystemRecord } from "./LegacySubsystemRecord";
import { selectLegacyAuxiliaryCandidates, restoreLegacyAuxiliary } from "../world/LegacyAuxiliaryQueue";
import { stepLegacyEntityIUpdate } from "../units/LegacyEntityIUpdate";
import { runLegacySubsystemPrepass, type LegacySubsystemPrepassInput } from "./LegacySubsystemPrepass";
import { runLegacySubsystemEntityLoop, type LegacySubsystemEntityLoopInput } from "./LegacySubsystemEntityLoop";
import { stepLegacySubsystemI } from "./LegacySubsystemTail";
import { stepLegacySubsystemWorkerDispatch } from "./LegacySubsystemWorkerDispatch";
import { stepLegacyEntityIFinalize } from "../units/LegacyEntityIFinalize";
import { checkLegacyEntityAffordable } from "../units/LegacyEntityResourceCost";
import { stepLegacySubsystemVoidN } from "./LegacySubsystemVoidN";
import { stepLegacySubsystemAq } from "./LegacySubsystemAq";
import { stepLegacySubsystemAr } from "./LegacySubsystemAr";
import { stepLegacySubsystemAs } from "./LegacySubsystemAs";
import { stepLegacySubsystemAv } from "./LegacySubsystemAv";
import { stepLegacySubsystemAw } from "./LegacySubsystemAw";
import { stepLegacySubsystemAt, stepLegacySubsystemAu } from "./LegacySubsystemAt";
import { stepLegacySubsystemLowerO } from "./LegacySubsystemLowerO";
import { stepLegacySubsystemNearestBuilding } from "./LegacySubsystemNearestBuilding";
import { stepLegacySubsystemAk } from "./LegacySubsystemAk";
import { stepLegacySubsystemAl } from "./LegacySubsystemAl";
import { stepLegacySubsystemH } from "./LegacySubsystemH";
import { legacySubsystemNGate } from "./LegacySubsystemNGate";
import { stepLegacySubsystemNDecision, type LegacySubsystemNDecisionInput } from "./LegacySubsystemNDecision";
import { stepLegacySubsystemNOrchestrator, type LegacySubsystemNOrchestratorInput } from "./LegacySubsystemNOrchestrator";
import { stepLegacySubsystemBDecision, type LegacySubsystemBDecisionInput } from "./LegacySubsystemBDecision";
import { checkLegacyResourceNodeGate } from "../world/LegacyResourceNodeGate";
import { stepLegacyEntityOccupantCare } from "../units/LegacyEntityOccupantCare";
import { stepLegacyEntityRecordRecovery } from "../units/LegacyEntityRecordRecovery";
import { stepLegacySubsystemBBoolean } from "./LegacySubsystemBBoolean";
import { legacySubsystemBEntryGate } from "./LegacySubsystemBEntryGate";
import { stepLegacySubsystemBActivityPrefix, type LegacySubsystemBActivityPrefixInput } from "./LegacySubsystemBActivityPrefix";
import { selectLegacySubsystemBAction, type LegacySubsystemBActionSelectorInput } from "./LegacySubsystemBActionSelector";
import { stepLegacySubsystemBFinalPrefix, type LegacySubsystemBFinalPrefixInput } from "./LegacySubsystemBFinalPrefix";
import { stepLegacySubsystemB, type LegacySubsystemBInput } from "./LegacySubsystemBOrchestrator";
import { stepLegacySubsystemAj } from "./LegacySubsystemAj";
import { stepLegacySubsystemAm } from "./LegacySubsystemAm";
import { stepLegacySubsystemN } from "./LegacySubsystemN";
import { stepLegacyAnimalHitReaction } from "../units/LegacyAnimalHitReaction";
import { stepLegacyEntityScreenIndex } from "../units/LegacyEntityScreenIndex";
import { stepLegacyEntityMoodPick } from "../units/LegacyEntityMoodPick";
import { stepLegacyEntitySpotAlert } from "../units/LegacyEntitySpotAlert";
import { computeLegacySubsystemPairScore } from "./LegacySubsystemScore";
import { stepLegacySubsystemEntityUpdateTail } from "./LegacySubsystemEntityUpdateTail";
import { stepLegacySubsystemEntityMoveApply } from "./LegacySubsystemEntityMoveApply";
import { stepLegacySubsystemEntityDisplace } from "./LegacySubsystemEntityDisplace";
import { stepLegacySubsystemRecordWorkerLevel } from "./LegacySubsystemEntityMoveCancel";
import { stepLegacySubsystemEntityPaceAccum } from "./LegacySubsystemEntityPaceAccum";
import { stepLegacySubsystemUnitTraining } from "./LegacySubsystemUnitTraining";
import { stepLegacySubsystemAf } from "./LegacySubsystemAf";
import { stepLegacySubsystemAg } from "./LegacySubsystemAg";
import { stepLegacySubsystemAh } from "./LegacySubsystemAh";
import { stepLegacySubsystemAi } from "./LegacySubsystemAi";
import { stepLegacySubsystemEntityTrainingSlot } from "./LegacySubsystemEntityTrainingSlot";
import { stepLegacySubsystemO } from "./LegacySubsystemO";
import { triggerLegacyEntityMove } from "../units/LegacyEntityMoveTrigger";
import { stepLegacySubsystemT } from "./LegacySubsystemT";
import { stepLegacySubsystemNPrivateO } from "./LegacySubsystemNPrivateO";
import { stepLegacyEntityStatusGuard } from "../units/LegacyEntityStatusGuard";
import { stepLegacyEntityActionCommit } from "../units/LegacyEntityActionCommit";
import { stepLegacyEntityFollowup } from "../units/LegacyEntityFollowup";
import { checkLegacyEntityModeListed, stepLegacySubsystemEntityProbe } from "./LegacySubsystemEntityProbe";
import { stepLegacySubsystemEntityAssociationScan } from "./LegacySubsystemEntityAssociationScan";
import { stepLegacyEntityCWatch } from "../units/LegacyEntityCWatch";
import { stepLegacyEntityActionScoreGate } from "../units/LegacyEntityActionScoreGate";
import { checkLegacyEntityOccupant } from "../units/LegacyEntityOccupantCheck";
import { stepLegacySubsystemAn } from "./LegacySubsystemAn";
import { checkLegacySpiralPlacementGate } from "../world/LegacySpiralPlacementGate";
import { stepLegacySubsystemP } from "./LegacySubsystemP";
import { stepLegacySubsystemBVoidO } from "./LegacySubsystemBVoidO";
import { stepLegacySubsystemScore } from "./LegacySubsystemScore";
import { syncLegacySubsystemBCoordinate } from "./LegacySubsystemBCoordinateSync";
import { stepLegacyEntityRecordCancel } from "../units/LegacyEntityRecordCancel";
import { stepLegacyZB2 } from "../../ui/LegacyZB2";
import { allocateLegacySubsystemBTenSlot, releaseLegacySubsystemBTenSlot, releaseLegacySubsystemBTenSlotEntity, releaseLegacySubsystemBEntitySlot } from "./LegacySubsystemBTenSlot";
import { indexLegacyEntityRecord } from "../world/LegacyEntityRecordLifecycle";
import { stepLegacyEntityDPredicate } from "../units/LegacyEntityDPredicate";
import { stepLegacyEntityHousing } from "../units/LegacyEntityHousing";
import { stepLegacyEntityCrowdDecay, stepLegacyEntityCrowdSpread } from "../units/LegacyEntityCrowdStress";
import { stepLegacyEntityHappiness } from "../units/LegacyEntityHappiness";
import { stepLegacyEntityESelection } from "../units/LegacyEntityESelection";
import { checkLegacyEntityRecord } from "../units/LegacyEntityRecordCheck";
import { stepLegacyEntityAssociationCleanup } from "../units/LegacyEntityAssociationCleanup";
import { calculateLegacyEntityM } from "../units/LegacyEntityMCalculation";
import { stepLegacySubsystemEntityTransform } from "./LegacySubsystemEntityTransform";
import { filterLegacyEntityLifecycle } from "../units/LegacyEntityLifecycleFilter";
import { transferLegacyEntityAction } from "../units/LegacyEntityActionTransfer";
import { stepLegacySubsystemOLower } from "./LegacySubsystemOLower";
import { stepLegacyAj } from "../units/LegacyUnitSelection";
import { BLD_KIND, BLD_OWNER, BLD_WORK, BLD_WORKERS, BLD_WORKER_HEAD, UNIT_AGE, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_FLAGS, UNIT_HELD_ITEM, UNIT_HP, UNIT_JOB_TYPE, UNIT_MELEE_SKILL, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_ORDER, UNIT_RANGED_SKILL, UNIT_RECORD, UNIT_SCOUT_SKILL, UNIT_SLOT, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TIMER, UNIT_TYPE, UNIT_VISION, UNIT_WORK_TARGET, UNIT_Y } from "../../core/DenseLayout";
import { liveView } from "../../core/LegacyRuntimeState";
import { T_BUILDING_MAX_LEVEL, T_TYPE_JOB, T_UPGRADE_UNLOCK_KIND, T_UPGRADE_UNLOCK_RANGE, T_UPGRADE_UNLOCK_TIME } from "../../core/DataTables";

/**
 * LegacyRuntimeState wiring moved out of the class (phase 2 step 3): each function is the former
 * method of the same name, with `this` as the `rt` parameter.
 */



/** Raw private b.o() state writes; b(IIII)B remains an explicit callback. */
export function stepSubsystemOLower(rt: LegacyRuntimeState, input: Omit<Parameters<typeof stepLegacySubsystemOLower>[0], "dense" | "flags">): void {
  stepLegacySubsystemOLower({
    ...input,
    dense: rt.denseState,
    flags: rt.subsystemArrays.aFlags,
  });
}

/**
 * `final void c()` (bytecode/b-javap.txt offsets 0..117), class `b`'s own
 * team-1..50 sweep: reuses the shared `v:I`(#225) loop register (same
 * pattern as `subsystemBTeamSweep`), AND-masks `dense[7979+id]` with 159,
 * and conditionally calls `private void a(int,boolean)`(#278) with
 * `arg2` hardcoded `false` (offset 100, a literal `iconst_0`).
 * CORRECTION (2026-08-22): `a(int,boolean)`(#278) is now fully ported
 * (`LegacySubsystemBCoordinateSync.ts`) and called directly here -- its
 * own `arg2` branch (an inner call to the large, ~50-call-site,
 * not-yet-ported `a(int,byte)`(#275)) stays unreachable via rt call
 * site since `arg2` is always `false`, exposed only as an optional
 * `onSpawnMark` callback.
 */
export function subsystemBC(rt: LegacyRuntimeState): void {
  const dense = rt.denseState;
  for (let id = 1; id <= 50; id += 1) {
    dense[UNIT_FLAGS + id] = (dense[UNIT_FLAGS + id] ?? 0) & 159;
    if ((dense[UNIT_HP + id] ?? 0) > 0 && (dense[UNIT_TYPE + id] ?? 0) === 69 && (dense[UNIT_ORDER + id] ?? 0) === 0) {
      syncLegacySubsystemBCoordinate({
        dense,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
      }, id, false);
    }
  }
}



/** `private boolean o()` (#406) for unit `id` -- LegacySubsystemNPrivateO.ts. */
export function subsystemPrivateO(rt: LegacyRuntimeState, id: number): boolean {
    const jRows = rt.packedData?.byteTables;
    if (!jRows) return false;
    const arrays = rt.subsystemArrays;
    const game = rt.game;
    return stepLegacySubsystemNPrivateO({
  state: rt.denseState,
  id,
  cRows: rt.subsystemArrays.cRows,
  gridC: rt.gridC,
  jRows,
  // b.x:I (#230) lives on `game` as subsystemX, not on subsystemArrays;
  // o() writes it and at()/g()/ab()/i(int) read it, so it round-trips.
  scratch: {
    get bField10(): number { return arrays.bField10; },
    set bField10(v: number) { arrays.bField10 = v; },
    get x(): number { return game.subsystemX; },
    set x(v: number) { game.subsystemX = v; },
  },
  onAction: (rawId, action) => { rt.changeEntityType(rawId, action); },
  onN: () => rt.stepSubsystemN(id, rt.game.bTeam),
  onGroupMode: (targetId, argument) => rt.subsystemG(targetId, argument),
  onD: (targetId, argument) => rt.subsystemD(targetId, argument),
  // f's own `final void a(int,boolean)` (b's constant pool #286,
  // f-javap.txt:20621..20766) -- WIRED 2026-09-20. It was left unwired as
  // "undocumented", but it is the same method already ported as
  // `filterEntityLifecycle` (`filterLegacyEntityLifecycle` +
  // `transferLegacyEntityAction`) and wired at b.g()'s and v()'s own call
  // sites. o() calls it as `f.a(c[5][x], true)` right after the couple
  // claims the hut, to move that record's listed units out of the way.
  onEntityLinkTrigger: (record, flag) =>
    rt.filterEntityLifecycle(record, flag, (row, column) => rt.gridC[row]?.[column] ?? 0),
    });
}

/** Raw b.k() decision; the caller supplies the original b-side fields. */
export function subsystemDecision(rt: LegacyRuntimeState, fields: {
  readonly fV: number;
  readonly fN: boolean;
  readonly fL: boolean;
  readonly bO: number;
  readonly bK: number;
  readonly bN: number;
  readonly fQ: number;
}): number {
  return legacySubsystemDecision({
    ...fields,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/** Exact deterministic prefix of b.n(); later action branches remain separate ports. */
export function subsystemNGate(rt: LegacyRuntimeState, fields: {
  readonly q: number;
  readonly N: boolean;
  readonly L: boolean;
  readonly u: number;
  readonly v: number;
}): boolean {
  return legacySubsystemNGate({ ...fields, state: rt.denseState });
}

/** Bytecode-backed b.n() decision prefix; b.c[][] lookup and private callees stay injectable. */
export function subsystemNDecision(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemNDecisionInput, "state" | "packedBytes" | "packedOffsets">,
): boolean {
  return stepLegacySubsystemNDecision({
    ...fields,
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/** Bytecode-order b.n() entry composition; private O()/a(false) remain callbacks. */
export function subsystemNOrchestrator(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemNOrchestratorInput, "state" | "packedBytes" | "packedOffsets">,
): boolean {
  return stepLegacySubsystemNOrchestrator({
    ...fields,
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/** Exact b() continuation after its private n() call; unresolved b-side callees remain callbacks. */
export function subsystemBDecision(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemBDecisionInput, "state" | "packedBytes" | "packedOffsets">,
): boolean {
  return stepLegacySubsystemBDecision({
    ...fields,
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/**
 * Exact private boolean b(boolean) -- fully rederived 2026-09-07, see
 * LegacySubsystemBBoolean.ts's own docblock. `onC` (`c(byte)` #360) is
 * left unwired -- that callee is a separate, unexamined method (see that
 * file's docblock). `onG` wires the real `g(2)` call through the
 * already-ported `subsystemG`.
 */
export function subsystemBBoolean(rt: LegacyRuntimeState, id: number, arg: boolean): boolean {
  return stepLegacySubsystemBBoolean({
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    arrays: rt.subsystemArrays,
    v: id,
    arg,
    onG: () => rt.subsystemG(id, 2),
    // private boolean c(byte) (#360), wired 2026-09-21 together with the
    // b.i() stage fix that finally gives `9933 + slot` real values: it is
    // the "does rt bush still look harvestable?" test b(boolean) asks
    // about every resource-node slot it scans. See LegacyResourceNodeGate.ts.
    onC: (value) => checkLegacyResourceNodeGate({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      tableOffsets: rt.packedOffsets,
      v: id,
    }, value),
  });
}



/**
 * Exact private void b(boolean) (bytecode/b-javap.txt offsets 0..226) --
 * a DIFFERENT method from `private boolean b(boolean)` (#339,
 * `subsystemBBoolean`/`LegacySubsystemBBoolean.ts`), distinguished only
 * by return type (void vs boolean), a real overload collision. Own
 * caller: `b.U()` (`subsystemU`, below), called unconditionally as
 * `b(true)` at its very start. Scans the current team's 30-slot
 * partition (`s:I` from `u:I*30+1` to `(u:I+1)*30`; `u:I`/#222 is the
 * SAME already-tracked `game.bTeam` field rt project's
 * `changeEntityType`/`subsystemNOrchestrator` wiring already reads as
 * "team" -- confirmed via those call sites, not re-derived), and for
 * each slot whose type matches (`dense[8749+s]===11`) or when `arg` is
 * true, walks a linked list (`dense[8993+s]`, chained via
 * `dense[4545+t]`) looking for the current entity id (`v:I`, the SAME
 * `id` rt whole call chain already threads through). On a match,
 * marks the entity as associated with that slot (dense 4444/4747) and
 * syncs its position from the raw x/y fields (dense 3131/3232 <-
 * 0/101). Fully self-contained -- no further private calls.
 */
export function subsystemBVoid(rt: LegacyRuntimeState, id: number, arg: boolean): void {
  const dense = rt.denseState;
  const team = rt.game.bTeam;
  for (let s = team * 30 + 1; s <= (team + 1) * 30; s += 1) {
    if ((dense[BLD_KIND + s] ?? 0) === 11 || arg) {
      if ((dense[BLD_WORKERS + s] ?? 0) >= 1) {
        let t = dense[BLD_WORKER_HEAD + s] ?? 0;
        while (t > 0) {
          if (t === id) {
            dense[UNIT_RECORD + id] = s;
            dense[UNIT_WORK_TARGET + id] = -s;
            dense[UNIT_TARGET_X + id] = dense[0 + id] ?? 0;
            dense[UNIT_TARGET_Y + id] = dense[UNIT_Y + id] ?? 0;
            return;
          }
          t = dense[UNIT_NEXT_WORKER + t] ?? 0;
        }
      }
    }
  }
}

/**
 * Exact private void U() (bytecode/b-javap.txt offsets 0..555) --
 * `stepLegacyEntityGPrefix`'s `onU` target (fires when `readEntityCell`
 * doesn't match the current entity). Calls `b(true)` (`subsystemBVoid`,
 * above) unconditionally, then:
 *  - offsets 5..171: a gated slot reset (`dense[4646+id]===1 &&
 *    dense[8749+assoc]===8 && dense[8627+assoc]===0`) writing type/mode/
 *    timer onto the associated slot's owner (dense 2828/2929/3030).
 *  - offsets 172..416: an UNCONDITIONAL store to `dense[2929+id]`
 *    (only the SOURCE table pair is gated, never whether the store
 *    happens) -- a three-way condition (`dense[1414+id]>=12 &&
 *    dense[8749+assoc]<12 && (dense[8627+assoc]!==0 || table41===12)`)
 *    picks packed tables 176/177, otherwise 173/174. CRITICAL: the
 *    stack-traced bytecode shows rt is a NESTED lookup, not a sum of
 *    four terms -- `packedBytes[packedOffsets[173] +
 *    packedBytes[packedOffsets[174] + dense[8749+assoc]] +
 *    dense[4646+id]]` (176/177 mirrors rt exactly), confirmed by a
 *    manual JVM-stack simulation of offsets 285..416, not assumed.
 *  - offsets 417..445: unconditional `dense[3030+id]=0`,
 *    `dense[1313+id]=-3`.
 *  - offsets 446..463: `f.d(dense[4444+id])`, already-ported as
 *    `stepLegacyFD`/`LegacyFrameProgressionScan.ts` (trivial, previously
 *    ported-but-unwired).
 *  - offsets 466..514: position-sync (dense 3131/3232 <- 0/101).
 *  - offsets 515..555: `changeEntityType(id, 59)`, gated on
 *    `packedBytes[packedOffsets[39]+dense[2828+id]] !== 2` (an
 *    `if_icmpeq 555` SKIP-when-equal branch -- the call fires on
 *    NOT-equal, the opposite of a naive reading of the comparison).
 * Fully self-contained -- no unexplored dependencies.
 */
export function subsystemU(rt: LegacyRuntimeState, id: number): void {
  const dense = rt.denseState;
  rt.subsystemBVoid(id, true);

  const assoc = dense[UNIT_RECORD + id] ?? 0;
  if ((dense[UNIT_SLOT + id] ?? 0) === 1) {
    if ((dense[BLD_KIND + assoc] ?? 0) === 8 && (dense[BLD_WORK + assoc] ?? 0) === 0) {
      const owner = dense[BLD_OWNER + assoc] ?? 0;
      dense[UNIT_TYPE + owner] = 57;
      dense[UNIT_MODE + owner] = 105;
      dense[3030 + owner] = 0;
    }
  }

  let useTable176 = false;
  if ((dense[UNIT_AGE + id] ?? 0) >= 12 && (dense[BLD_KIND + assoc] ?? 0) < 12) {
    if ((dense[BLD_WORK + assoc] ?? 0) !== 0) {
      useTable176 = true;
    } else {
      const table41 = rt.packedBytes[(rt.packedOffsets[T_TYPE_JOB] ?? 0) + (dense[UNIT_TYPE + id] ?? 0)] ?? 0;
      if (table41 === 12) useTable176 = true;
    }
  }
  if (useTable176) {
    const inner = rt.packedBytes[(rt.packedOffsets[177] ?? 0) + (dense[BLD_KIND + assoc] ?? 0)] ?? 0;
    dense[UNIT_MODE + id] = rt.packedBytes[(rt.packedOffsets[176] ?? 0) + inner + (dense[UNIT_SLOT + id] ?? 0)] ?? 0;
  } else {
    const inner = rt.packedBytes[(rt.packedOffsets[174] ?? 0) + (dense[BLD_KIND + assoc] ?? 0)] ?? 0;
    dense[UNIT_MODE + id] = rt.packedBytes[(rt.packedOffsets[173] ?? 0) + inner + (dense[UNIT_SLOT + id] ?? 0)] ?? 0;
  }

  dense[3030 + id] = 0;
  dense[UNIT_TIMER + id] = -3;

  const fDState = { w: rt.game.barMode, q: rt.game.qCounter, P: rt.game.pendingP };
  stepLegacyFD(dense[UNIT_RECORD + id] ?? 0, fDState);
  rt.game.pendingP = fDState.P;

  dense[UNIT_TARGET_X + id] = dense[0 + id] ?? 0;
  dense[UNIT_TARGET_Y + id] = dense[UNIT_Y + id] ?? 0;

  if ((rt.packedBytes[(rt.packedOffsets[39] ?? 0) + (dense[UNIT_TYPE + id] ?? 0)] ?? 0) !== 2) {
    rt.changeEntityType(id, 59);
  }
}

/**
 * Exact `final void b()` (bytecode/b-javap.txt offsets 0..251) -- a
 * team-1..50 sweep (loop variable REUSES `v:I`/#225, the SAME shared
 * "current entity" register `subsystemU`/`subsystemBVoid`/`subsystemG`
 * all thread through; safe here since the method fully overwrites it
 * for the duration of its own loop). Own callers: `f.X()`'s `s:I===100`
 * branch (`stepLegacyX`, two call sites), which sets `outerLoopNFlag`/
 * `outerLoopLFlag` (f.N:Z/#81, f.L:Z/#73) right before each call --
 * confirmed via direct bytecode read (`getfield #37`/`#33` inside rt
 * method resolve to the SAME two fields `stepLegacyX` already tracks,
 * NOT the unrelated `game.nFlag`, which turned
 * out to be a separate pre-existing misidentification -- see rt
 * method's caller-site fix and `docs/unknowns.md` for the full trace).
 * For each id 1..50, unless `!f.N`, computes a nested packed-table
 * lookup (`packedBytes[packedOffsets[100] + packedBytes[packedOffsets[41]
 * + dense[2828+id]]]` plus the same shape read at `dense[6464+id]`) and
 * gates on the sum exceeding 1, `dense[6565+id]!==9`, and at least one of
 * three per-id thresholds exceeding 4; when reached (or when `f.N` was
 * already true, skipping straight in), ORs `dense[7979+id]` with 96
 * unless `f.L` is set AND bit 64 is already present (in which case the
 * id is skipped entirely, no write).
 */
export function subsystemBTeamSweep(rt: LegacyRuntimeState): void {
  const dense = rt.denseState;
  // b.b() loops on the field v:I (offsets 1..248) and leaves it at 51 (2026-10-09).
  rt.game.bUnit = 51;
  for (let id = 1; id <= 50; id += 1) {
    let reachedLGate = rt.game.callToArmsActive;
    if (!reachedLGate) {
      const table41A = rt.packedBytes[(rt.packedOffsets[T_TYPE_JOB] ?? 0) + (dense[UNIT_TYPE + id] ?? 0)] ?? 0;
      const value1 = rt.packedBytes[(rt.packedOffsets[100] ?? 0) + table41A] ?? 0;
      const table41B = rt.packedBytes[(rt.packedOffsets[T_TYPE_JOB] ?? 0) + (dense[UNIT_JOB_TYPE + id] ?? 0)] ?? 0;
      const value2 = rt.packedBytes[(rt.packedOffsets[100] ?? 0) + table41B] ?? 0;
      reachedLGate = (value1 + value2) > 1
        && (dense[UNIT_HELD_ITEM + id] ?? 0) !== 9
        && ((dense[UNIT_MELEE_SKILL + id] ?? 0) > 4 || (dense[UNIT_RANGED_SKILL + id] ?? 0) > 4 || (dense[UNIT_SCOUT_SKILL + id] ?? 0) > 4);
    }
    if (!reachedLGate) continue;

    if (rt.game.formUpActive && ((dense[UNIT_FLAGS + id] ?? 0) & 64) !== 0) continue;
    dense[UNIT_FLAGS + id] = (dense[UNIT_FLAGS + id] ?? 0) | 96;
  }
}

/**
 * Exact private void k(int) (bytecode/b-javap.txt offsets 0..131,
 * constant pool #397). Genuinely uses `b:[[B`(#129, confirmed via the
 * constructor's `rt.b = fInstance.c:[[B`(#140) aliasing to be the
 * SAME field as `f.c:[[B`, i.e. `rt.gridC` -- correctly derived.
 * RETRACTED (2026-09-07): a 2026-08-24 note here declared rt method
 * unreachable, because its only caller `d(int,int)`(#367, `subsystemD`
 * below) was believed to throw before either of its two calls to it.
 * `d(int,int)` does not throw -- its `c:[[B]`(#143) is allocated by
 * `f.g()` (see LegacySubsystemBTenSlot.ts) -- so rt method is live, and
 * `subsystemD` now really does call it twice.
 */
export function subsystemK(rt: LegacyRuntimeState, id: number): void {
  const dense = rt.denseState;
  if (dense[UNIT_CARRY_KIND + id] === 15) dense[UNIT_CARRY_AMOUNT + id] = 0;
  // offsets 26..38: `if (dense[2828+id] < 109) goto 131 (return)` -- the rest
  // of the method only runs for a courting unit (109/110/111). CORRECTED
  // 2026-09-20: rt comparison was inverted here, so a partner leaving the
  // hut kept type 111 forever (it walks around as a permanent "zombie" and
  // never works again), while ordinary units got reset instead.
  if ((dense[UNIT_TYPE + id] ?? 0) < 109) return;
  if ((rt.gridC[dense[UNIT_Y + id] ?? 0]?.[dense[id] ?? 0] ?? 0) === id) {
    dense[UNIT_TARGET_X + id] = dense[id] ?? 0;
    dense[UNIT_TARGET_Y + id] = dense[UNIT_Y + id] ?? 0;
    rt.changeEntityType(id, 69);
  } else {
    dense[UNIT_ORDER + id] = 3;
    rt.changeEntityType(id, 87);
  }
}

/**
 * Exact private void d(int,int) (bytecode/b-javap.txt offsets 0..224,
 * constant pool #367), `b.g(int)`'s own `onD` target (fires when
 * `argument<3`).
 *
 * The 2026-08-24 correction that rt method uses `c:[[B]`(#143), NOT the
 * adjacent `k(int)`'s `b:[[B]`(#129)/`gridC`, still stands and was
 * re-verified. What did not stand is the second half of that note, which
 * concluded #143 was believed permanently null (RETRACTED 2026-09-07 -- it is not) and replaced the body with a
 * guard-then-throw: `f.g()` allocates it as `byte[6][10]`
 * (bytecode/f-javap.txt offset 590..594). Fully ported 2026-09-04 as
 * `releaseLegacySubsystemBEntitySlot`, including the `argument` parameter
 * the throwing version dropped.
 */
export function subsystemD(rt: LegacyRuntimeState, id: number, argument: number): void {
  releaseLegacySubsystemBEntitySlot(rt.subsystemArrays.cRows, rt.denseState, id, argument, {
    onK: (target) => rt.subsystemK(target),
  });
}

/**
 * `private void r()` (#412) with its `ap()` (#323) / `ao()` (#322) tail --
 * `LegacyEntityRecordRecovery.ts`, wired 2026-09-21. `q()` calls it when the
 * unit's record counter has run out; `ap()` reassigns the ambient `v:I`
 * (game.bUnit) exactly as the original does.
 */
export function subsystemRecordRecovery(rt: LegacyRuntimeState, id: number): void {
  const game = rt.game;
  const arrays = rt.subsystemArrays;
  stepLegacyEntityRecordRecovery({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    v: id,
    onGroupMode: (argument) => rt.subsystemG(id, argument),
    onQ: () => rt.selectEntityTypeAfterQ(id),
    onBVoid: (flag) => rt.subsystemBVoid(id, flag),
    onChangeType: (target, type) => { rt.changeEntityType(target, type); },
    onIUpdate: (argument) => rt.stepEntityIUpdate(id, argument, game.bTeam),
    flags: {
      get a() { return arrays.bField73; }, set a(value: boolean) { arrays.bField73 = value; },
      get b() { return arrays.bField137; }, set b(value: boolean) { arrays.bField137 = value; },
    },
    onPBoolean: () => subsystemMarkerScan(rt, id, game.bTeam),
    onAp: () => rt.entityAp(id),
  });
}


/** b's `private boolean t()` (#417) -- LegacySubsystemT.ts. */
export function subsystemT(rt: LegacyRuntimeState): boolean {
  const game = rt.game;
  const arrays = rt.subsystemArrays;
  return stepLegacySubsystemT({
    state: rt.denseState,
    gridC: rt.gridC,
    teamMarkerTable: game.teamMarkerTable,
    aShort: rt.mainArrays.aShort,
    frame: game.missionFrame,
    mapWidth: game.mapWidth,
    mapHeight: game.mapHeight,
    q: game.mission,
    fByte: game.subsystemGFFlagByte,
    uByte: game.uByte,
    bField28: arrays.bField28,
    kFlag: { get value() { return game.choosingChief; }, set value(v: boolean) { game.choosingChief = v; } },
    scratch: {
      get u() { return game.bTeam; }, set u(v: number) { game.bTeam = v; },
      get v() { return game.bUnit; }, set v(x: number) { game.bUnit = x; },
      get w() { return game.subsystemW; }, set w(v: number) { game.subsystemW = v; },
      get A() { return game.subsystemA; }, set A(v: number) { game.subsystemA = v; },
      get C() { return arrays.bField10; }, set C(v: number) { arrays.bField10 = v; },
      get D() { return arrays.bField12; }, set D(v: number) { arrays.bField12 = v; },
    },
    onPrompt: (ap, am, an) => rt.entityActionPrompt(ap, am, an),
  });
}


/** b.a(byte) (#475) over the f:[[B] table f.g() allocates as fRows (2x10). */
export function subsystemTenSlotAllocate(rt: LegacyRuntimeState, id: number): boolean {
  return allocateLegacySubsystemBTenSlot(rt.subsystemArrays.fRows, rt.denseState, id);
}

/** b.c(int) (#563) over the same fRows table. */
export function subsystemTenSlotRelease(rt: LegacyRuntimeState, id: number): void {
  releaseLegacySubsystemBTenSlot(rt.subsystemArrays.fRows, id);
}

/** b.a(int) (#476) over the c:[[B] table f.g() allocates as cRows (6x10). */
export function subsystemTenSlotReleaseEntity(rt: LegacyRuntimeState, id: number): void {
  releaseLegacySubsystemBTenSlotEntity(rt.subsystemArrays.cRows, rt.denseState, id, {
    onD: (entityIndex, argument) => rt.subsystemD(entityIndex, argument),
  });
}

/**
 * Exact private void g(int) (bytecode/b-javap.txt offsets 0..317),
 * `stepLegacySubsystemBDecision`'s `onGroupMode` target. `onD` wired for
 * real (`subsystemD`, above).
 *
 * `onCalculateM`/`readL` -- RETRACTED-PREMISE, FULLY PORTED 2026-09-07.
 * `onCalculateM` maps to `b.a(int,int,boolean)`/`subsystemEntityTransform`
 * (see that method's own docblock), previously believed a 100%-guaranteed
 * throw; it is not. Offset 204..297: `g(int)` calls `a(x,y,flag)` then
 * immediately reads `l:B`(#199), exactly what `subsystemEntityTransform`
 * now returns directly -- `onCalculateM`'s own return value is still
 * discarded (matches the real bytecode's void call), `readL` is the
 * separate follow-up field read. `g(int)` itself has its OWN exception
 * table (offsets 0..164/165..311/312..317, all -> a `pop;return` handler
 * at 318) wrapping rt entire call -- confirmed by reading the raw
 * javap output directly, not assumed. Modeled with a local try/catch
 * here to match, regardless of whether anything inside actually throws.
 *
 * `onQ` -- `private void Q()` (#253, offset 274, the SAME already-ported
 * `selectEntityTypeAfterQ` every other `onQueue` call site in rt file
 * uses) -- now wired for real too (reachable once `onCalculateM` no
 * longer throws first).
 *
 * `onAByteIntInt` (`a:(BII)V` #274) and `onH` (`private void h(int)`
 * #388, ~521 raw instructions) remain deliberately unwired: both are
 * separate, not-yet-examined methods out of scope for rt pass -- left
 * as an explicit unported boundary rather than guessed, following rt
 * codebase's convention for unported callees.
 *
 * `onU` -- `private void U()` (offsets 0..555, `subsystemU`, below) --
 * is now ALSO wired (fires when `readEntityCell` doesn't match the
 * current entity, an earlier branch unrelated to the `onCalculateM`
 * chain above).
 */
/**
 * private void N() (offsets 0..874) -- shared by both of its real
 * callers, an()'s own onN and f.am()'s own onN(id,team) (a completely
 * unrelated subsystem). Extracted 2026-08-21 to avoid a third copy when
 * wiring p()'s own onN. See LegacySubsystemN.ts's own docblock.
 */
export function stepSubsystemN(rt: LegacyRuntimeState, id: number, team: number): void {
  stepLegacySubsystemN({
    state: rt.denseState,
    id,
    team,
    gridC: rt.gridC,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    cRows: rt.subsystemArrays.cRows,
    scratch: rt.subsystemArrays,
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    onGate: (mode, scanLimit, originX, originY) => rt.checkSpiralPlacementGate(
      mode, scanLimit, originX, originY, id,
      (occupant) => checkLegacyEntityOccupant({
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        id,
      }, occupant),
    ),
    onGroupMode: (argument) => rt.subsystemG(id, argument),
    onChangeEntityType: (rawId, action) => { rt.changeEntityType(rawId, action); },
    // private void O() (#251), rewritten 2026-09-15 -- see LegacySubsystemO.ts.
    onOther: (otherId, otherTeam) => stepLegacySubsystemO({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      id: otherId,
      team: otherTeam,
      xSlots: rt.game.xSlotTable,
      orders: rt.mainArrays.aByte3,
      fRows: rt.mainArrays.f4,
      // ap() (#323), ported 2026-09-21; rt O() site was missed and still
      // threw until 2026-09-23. O()'s ambient v:I is the unit it handles.
      onAp: () => rt.entityAp(otherId),
      onA: (kind) => stepLegacySubsystemNearestBuilding({
        state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
        team: otherTeam, entityId: otherId, kind,
      }),
      onG: (argument) => rt.subsystemG(otherId, argument),
    }),
  });
}

export function stepSubsystemP(rt: LegacyRuntimeState, id: number): void {
  stepLegacySubsystemBVoidO({
    state: rt.denseState,
    id,
    localFlags: rt.game.subsystemBLocalFlags,
    // Same #332 wiring as the onO call site above; see its comment.
    onScore: (a, b, c, d) => stepLegacySubsystemScore(rt.legacySubsystemScoreInput(id), a, b, c, d),
  });
  stepLegacySubsystemP({
    state: rt.denseState,
    id,
    team: rt.game.bTeam,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    // #266's own inputs, wired 2026-09-10 when p()'s deliberate
    // guaranteed-throw stub for it was retracted -- see LegacySubsystemP.ts.
    saveOffsets: rt.saveOffsets,
    qrFields: rt.subsystemArrays,
    localFlags: rt.game.subsystemBLocalFlags,
    bThreshold: rt.subsystemArrays.bField8,
    fNFlag: rt.game.callToArmsActive,
    qByte: rt.game.subsystemBQByte,
    fQByte: rt.game.mission,
    fByte: rt.game.subsystemGFFlagByte,
    onNearestCandidate: (arg1, arg2) => rt.nearestCandidate(id, arg1, arg2),
    onN: () => rt.stepSubsystemN(id, rt.game.bTeam),
    onGate: (mode, scanLimit, originX, originY) => rt.checkSpiralPlacementGate(
      mode, scanLimit, originX, originY, id,
      (occupant) => checkLegacyEntityOccupant({
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        id,
      }, occupant),
    ),
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
  });
}

/**
 * `private void h(int)` (#388), both halves: `LegacyEntityHPrefix.ts`
 * (offsets 0..162) and `LegacyEntityHActionBranch.ts` (163..534), which have
 * been ported and tested since 2026-08-18 and never wired.
 *
 * They were left unwired on a premise that is now retracted.
 * docs/parity-checklist.md's `b.g(int)` row still records it verbatim:
 * "`onCalculateM` maps to `b.a(int,int,boolean)`, the SAME method confirmed
 * a 100%-guaranteed throw ... since rt call happens BEFORE
 * `readL`/`onQ`/`onAByteIntInt`/`onH` in the bytecode's own instruction
 * order, none of them can ever execute either ... `private void h(int)`
 * (#388, ~521 raw instructions) does not need to be derived at all --
 * provably dead code, not merely deferred."
 *
 * `b.a(int,int,boolean)` is `subsystemEntityTransform`, and its
 * guaranteed-throw premise was RETRACTED and the method fully ported on
 * 2026-09-07. So `h(int)` is not dead: it is the live movement path. The
 * 2026-09-07 sweep cleared 27 `throw` sites of rt family but not rt one,
 * because here the premise justified an unwired callback rather than a
 * throw.
 *
 * Field sources read from b.h(int)'s own bytecode rather than assumed:
 * `k1`/`k2` are `k:[B`(#196) indices 1/2, `m` is `m:B`(#202), `fN` is
 * `f.N:Z`, and `K` is `b.K:B`(#28), the entity loop's own scheduler byte.
 * CORRECTED 2026-09-14: `m` was read from `subsystemModeByte` (never
 * written, so always 0) and `fN` from the unrelated `game.nFlag`.
 */
export function subsystemH(rt: LegacyRuntimeState, id: number, argument: number): void {
  const k = rt.game.subsystemKBytes;
  // m:B (#202) has one writer, a(int,int,boolean) (subsystemEntityTransform).
  const m = rt.game.subsystemMByte;
  stepLegacyEntityHPrefix({ state: rt.denseState, entityId: id, argument, k2: k[2] ?? 0, m });
  stepLegacyEntityHActionBranch({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    entityId: id,
    argument,
    k1: k[1] ?? 0,
    k2: k[2] ?? 0,
    m,
    // f.N:Z (#81 in f) -- outerLoopNFlag, not the unrelated game.nFlag.
    fN: rt.game.callToArmsActive,
    K: rt.subsystemArrays.bField28,
    mapWidth: rt.game.mapWidth,
    readEntityCell: (row, column) => rt.gridC[row]?.[column] ?? id,
    onFC: (entityId) => rt.clearEntityRecordTarget(entityId),
    onChangeType: (entityId, type) => { rt.changeEntityType(entityId, type); },
    onNearestCandidate: (arg1, arg2) => rt.nearestCandidate(id, arg1, arg2),
  });
}

export function subsystemG(rt: LegacyRuntimeState, id: number, argument: number): void {
  try {
    stepLegacyEntityGPrefix({
      state: rt.denseState,
      entityId: id,
      argument,
      partition: rt.game.bTeam,
      currentI: rt.game.subsystemGCurrentI,
      // f.q:B (#211) is game.mission; the separate subsystemGFQByte had no writer (removed 2026-09-14).
      fQ: rt.game.mission,
      fFlag: rt.game.subsystemGFFlagByte,
      readEntityCell: (row, column) => rt.gridC[row]?.[column] ?? id,
      onD: (entityId, arg) => rt.subsystemD(entityId, arg),
      onU: () => rt.subsystemU(id),
      onCalculateM: (x, y, flag) => { rt.subsystemEntityTransform(id, x, y, flag); return 0; },
      readL: () => rt.subsystemArrays.bField199,
      onQ: () => rt.selectEntityTypeAfterQ(id),
      // Both wired 2026-09-10 -- see subsystemH's docblock for why they were
      // not. `a(byte,int,int)` (#274) is the already-ported
      // triggerLegacyEntityMove that the status guard's own onMove uses.
      onAByteIntInt: (value, entityId, second) => rt.entityMove(value, entityId, second),
      onH: (arg) => rt.subsystemH(id, arg),
    });
  } catch {
    // g(int)'s own exception table (offsets 0..317 -> 318, pop;return)
    // -- see the docblock above for the full derivation.
  }
}


/**
 * Exact private void a(int,int,boolean) (bytecode/b-javap.txt offsets
 * 0..429) -- `b.t()`'s `onPositionProbe` target (`LegacyEntityTargetStep.ts`),
 * entry point for `calculateLegacyEntityM` (offsets 54..429,
 * `LegacyEntityMCalculation.ts`).
 *
 * **RETRACTED-PREMISE (2026-08-18/08-27), FULLY PORTED (2026-09-07)**:
 * rt method was believed a 100%-unconditional guaranteed throw because
 * `e(int,int,int)` unconditionally dereferences `b:[S]` (#132), and that
 * field was believed permanently null. It is not -- `e.f()` allocates it
 * (`new short[570]`) and `b.a(f)` copies it in (bytecode/b-javap.txt:550);
 * it is rt port's `saveOffsets`, already live throughout the rest of
 * rt codebase. All three methods in the cluster (`a(int,int,boolean)`,
 * `c(int,int,int,int)` #355, `e(int,int,int)` #379) are now ported for
 * real in `LegacySubsystemEntityTransform.ts` -- see that file's own
 * docblock for the full field-identity derivation and control flow.
 *
 * Porting the entry point for real also surfaced 3 real bugs in the
 * `calculateLegacyEntityM` core itself (a wrong table base for 5 of 6
 * lookups, a swapped `currentK===4` selector, a missing `k3`-gate around
 * the second `m` assignment) -- see that file's own corrected docblock.
 * That code had never been exercised end to end before, since the entry
 * point above always threw before reaching it.
 *
 * No exception table exists in rt method, `c(IIII)`, or `e(III)`
 * (confirmed -- none of the three has a local `Exception table:` in the
 * raw javap output), so a genuinely unreachable read here (e.g. `e()`'s
 * `idiv`-by-zero) still propagates to whichever caller's own exception
 * table catches it -- same as the other four call sites rt method has
 * (`t()`, `g(int)`, `d(int)`, `stepLegacySubsystemBDecision`), each of
 * which already has (or is wrapped in) its own real exception scope.
 *
 * Returns `l:B` (#199) directly -- the two real callers that read it
 * right after calling rt method (`g(int)`'s `readL`, `t()`'s
 * `onPositionProbe`) can just use the return value instead of a second
 * field read.
 */
export function subsystemEntityTransform(rt: LegacyRuntimeState, id: number, x: number, y: number, flag: boolean): number {
  const scratch = {
    bField197: rt.subsystemArrays.bField197,
    bField199: rt.subsystemArrays.bField199,
    mByte: rt.game.subsystemMByte,
  };
  const l = stepLegacySubsystemEntityTransform({
    dense: rt.denseState,
    gridC: rt.gridC,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    visibilityBits: rt.mainArrays.aInt,
    k: rt.game.subsystemKBytes,
    id,
    x,
    y,
    flag,
    team: rt.game.bTeam,
    fQ: rt.game.mission,
    scratch,
    // b.a:[[S (#63) is f.a:[[S; read by private byte a() (#276).
    shortRows: rt.mainArrays.aShort,
  });
  rt.subsystemArrays.bField197 = scratch.bField197;
  rt.subsystemArrays.bField199 = scratch.bField199;
  rt.game.subsystemMByte = scratch.mByte;
  return l;
}


/** Exact b() offset-0 entry gate; frame/id/team are kept explicit to avoid Q-field aliasing. */
export function subsystemBEntryGate(rt: LegacyRuntimeState, frame: number, id: number, team: number): boolean {
  return legacySubsystemBEntryGate({ frame, id, team, state: rt.denseState });
}

/** Exact b() offsets 59..253 prefix; the private m()/o() calls remain callback seams. */
export function subsystemBActivityPrefix(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemBActivityPrefixInput, "state">,
): ReturnType<typeof stepLegacySubsystemBActivityPrefix> {
  return stepLegacySubsystemBActivityPrefix({ ...fields, state: rt.denseState });
}

/** Exact b() dispatch at 533..614; n()/an() remain injectable callbacks. */
export function subsystemBActionSelector(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemBActionSelectorInput, "state">,
): void {
  selectLegacySubsystemBAction({ ...fields, state: rt.denseState });
}

/** Exact b() tail gate through p(); cell and occupancy lookups remain callbacks. */
export function subsystemBFinalPrefix(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemBFinalPrefixInput, "state">,
): void {
  stepLegacySubsystemBFinalPrefix({ ...fields, state: rt.denseState });
}

/** Compose the currently ported b() segments in original bytecode order. */
export function subsystemB(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemBInput, "state" | "packedBytes" | "packedOffsets">,
): boolean {
  return stepLegacySubsystemB({
    ...fields,
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/** b.n() (LegacySubsystemVoidN.ts): rebuild the per-team zone lists. */
export function runSubsystemN(rt: LegacyRuntimeState): void {
  stepLegacySubsystemVoidN({
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    gridC: rt.gridC,
    arrays: rt.subsystemArrays,
  });
}

/** Exact b.j() post-load counter/table reconstruction. */
export function runSubsystemJ(rt: LegacyRuntimeState, q = rt.game.mission, c = rt.game.missionFrame): void {
  const table113 = rt.packedOffsets[T_BUILDING_MAX_LEVEL] + (q < 4 ? 0 : q === 4 ? 12 : 24);
  for (let index = 0; index < 12; index += 1) {
    rt.mainArrays.f[index] = rt.packedBytes[table113 + index] ?? 0;
  }
  rt.subsystemArrays.bJCursor = 0;
  if (q > 4) return;

  const rangeBase = rt.packedOffsets[T_UPGRADE_UNLOCK_RANGE] + q;
  let cursor = rt.packedBytes[rangeBase] ?? 0;
  const end = rt.packedBytes[rangeBase + 1] ?? cursor;
  while (cursor < end) {
    const threshold = rt.packedBytes[rt.packedOffsets[T_UPGRADE_UNLOCK_TIME] + cursor] ?? 0;
    if (c >= threshold * 100) {
      const index = rt.packedBytes[rt.packedOffsets[T_UPGRADE_UNLOCK_KIND] + cursor] ?? -1;
      if (index >= 0 && index < rt.mainArrays.f.length) {
        rt.mainArrays.f[index] = (rt.mainArrays.f[index] + 1) & 0xff;
      }
    } else {
      break;
    }
    cursor += 1;
  }
  rt.subsystemArrays.bJCursor = cursor;
}

