import { hdArt } from "../render/HdArt";
import { boolLayers2x3x96, byteGrid, cloneCube, cloneRows, copyCube, copyRows, toJavaByte } from "./RowUtils";
// Re-exported so existing imports from this module keep working.
export { boolLayers2x3x96, byteGrid, cloneCube, cloneRows, copyCube, copyRows, toJavaByte } from "./RowUtils";
import type { AnchorValue } from "../platform/anchors";
import type { DrawableImage } from "../platform/Image";
import { stepLegacySubsystemEntityRevertIdle } from "../sim/tribe/LegacySubsystemEntityRevertIdle";
import type { PackedData } from "../platform/PackedData";
import type { DelimitedTable } from "../platform/DelimitedResource";
import { EntityBank, F_E_LENGTH } from "../platform/EntityBank";
import { LegacyRenderTargets } from "../render/LegacyRenderTargets";
import { LegacyGameState } from "./LegacyGameState";
import { stepLegacyGameplayTick } from "./LegacyGameplayTick";
import { stepLegacyGameplayInput } from "../ui/LegacyGameplayInput";
import { stepLegacyGameplayCommand } from "../ui/LegacyGameplayCommand";
import type { ImagePack } from "../platform/ImagePack";
import type { Graphics } from "../platform/Graphics";
import { LegacyResourceTables, selectLegacyResourceSection, stepLegacyClassCReset } from "../platform/LegacyResourceTables";
import { LegacyGeometryDecoder } from "../text/LegacyGeometryDecoder";
import { LegacyGeometryRenderer } from "../text/LegacyGeometryRenderer";
import { applyLegacyZFiveIntGeometry, applyLegacyZSevenIntGeometry } from "../text/LegacyZGeometryBridge";
import { composeLegacyC, emitLegacyCRenderRow, type LegacyCRenderExtras, type LegacyCCompositionState, type LegacyCDrawCommand, type LegacyCZh } from "../text/LegacyCComposition";
import { scanLegacyZElementPrefix, type LegacyZElementScanCallbacks, type LegacyZElementScanState } from "../render/LegacyZElementScan";
import { stepLegacyZKText, type LegacyZKTextCallbacks, type LegacyZKTextState } from "../text/LegacyZKText";
import { stepLegacyZKind3, type LegacyZKind3Callbacks, type LegacyZKind3State } from "../render/LegacyZKind3";
import { stepLegacyZKind4, type LegacyZKind4Callbacks, type LegacyZKind4State } from "../render/LegacyZKind4";
import { stepLegacyZKind2, type LegacyZKind2State } from "../render/LegacyZKind2";
import { stepLegacyZSubrecordDraw, type LegacyZSubrecordDrawCallbacks } from "../render/LegacyZSubrecordDraw";
import { drawLegacyPackedSpritePrimitive, type LegacyPackedSpritePrimitiveCallbacks } from "../render/LegacyPackedSpritePrimitive";
import { LegacyInputState } from "./LegacyInputState";
import { LegacyMainArrays } from "./LegacyMainArrays";
import { LegacySubsystemArrays } from "./LegacySubsystemArrays";
import { runLegacySpatialPass, type LegacySpatialPassInput } from "../sim/world/LegacyBSpatialPass";
import { decodeLegacyMapTiles, type LegacyRawMap } from "../sim/world/LegacyMapRleDecoder";
import type { AResourceDiagnostic, AResourcePrefixReplay, MaResource } from "../platform/BinaryResource";
import { applyLegacyMapNeighborPass, buildLegacyMapOverlay, type LegacyMapOverlay } from "../render/LegacyMapOverlay";
import { projectLegacyMapGrids } from "../render/LegacyMapGridProjection";
import { allocateLegacySpecialTile, type LegacySpecialTile } from "../sim/world/LegacySpecialTileAllocator";
import { legacyOccupancyClass } from "../sim/world/LegacyOccupancyClass";
import { legacyEntityPartition } from "../sim/world/LegacyEntityPartition";
import { drawLegacyMapOverview, stepLegacyMapOverviewScroll, type LegacyMapOverviewInput } from "../render/LegacyMapOverview";
import { stepLegacyEntityGPrefix } from "../sim/units/LegacyEntityGPrefix";
import { stepLegacyEntityHPrefix } from "../sim/units/LegacyEntityHPrefix";
import { stepLegacyEntityHActionBranch } from "../sim/units/LegacyEntityHActionBranch";
import { stepLegacyD as stepLegacyFD } from "../ui/LegacyFrameProgressionScan";
import { LegacyRandom, legacyRandomRemainder } from "../platform/LegacyRandom";
import { OriginalMidiPlayer, type MidiResource } from "../platform/Audio";
import { applyLegacyTerrainAdjustment } from "../sim/world/LegacyTerrainAdjustment";
import { LegacyProgressStore } from "../save/LegacyProgressStore";
import type { RmsGameplayRecord, SparseLocationGroup } from "../save/RmsGameplayRecord";
import { acceptLegacyNumericValue, type LegacyNumericSequenceState } from "./LegacyNumericSequence";
import { allocateLegacyRecord, type LegacyRecordAllocatorInput } from "../sim/world/LegacyRecordAllocator";
import { runLegacyL, runLegacyM } from "../sim/tribe/LegacySubsystemLifecycle";
import { stepLegacyEntityBatchAllocate } from "../sim/units/LegacyEntityBatchAllocate";
import { stepLegacyFrame, type LegacyFrameStepInput } from "./LegacyFrameStep";
import { stepLegacyFrameDispatch, type LegacyFrameDispatchInput } from "../ui/LegacyFrameDispatch";
import { stepLegacyGFrame } from "../ui/LegacyGFrame";
import { LegacyOffscreenTargets } from "../render/LegacyOffscreenTargets";
import { LegacyPackedSpriteRenderer } from "../render/LegacyPackedSpriteRenderer";
import { drawLegacy1137Composition } from "../render/Legacy1137Composition";
import { ZH_LANGUAGE, ZH_LANGUAGE_NAME, ZhPainter, ZhStrings, paintZhLine, tokenizeZh, tokensWidth, wrapZh, type ZhPaint, type ZhToken, type ZhTranslationFile } from "../text/LegacyZhText";
import { prepareLegacyImageHelperInvocation } from "../render/LegacyImageHelperInvocation";
import { drawLegacyFrameCommand } from "../render/LegacyFrameCommandDraw";
import { stepLegacyFrameCommandChanged, type LegacyZAdChangeState } from "../ui/LegacyFrameCommandChanged";
import { applyLegacyFrameGeometry, deriveLegacyFrameLayout } from "../render/LegacyFrameLayout";
import { stepLegacyZTransition } from "../ui/LegacyZTransition";
import { stepLegacyZAi } from "../ui/LegacyZAi";
import { stepLegacyZAh } from "../ui/LegacyZAh";
import { stepLegacyZAj } from "../ui/LegacyZAj";
import { stepLegacyZAe } from "../ui/LegacyZAe";
import { stepLegacyZAf } from "../ui/LegacyZAf";
import { resetLegacyZI } from "../ui/LegacyZI";
import { stepLegacyZAb } from "../ui/LegacyZAb";
import { stepLegacyZAc } from "../ui/LegacyZAc";
import { stepLegacyZAd } from "../ui/LegacyZAd";
import { stepLegacyZAa } from "../ui/LegacyZAa";
import { drawLegacy1010 } from "../render/Legacy1010Renderer";
import { LEGACY_DEFAULT_MAP_VIEWPORT, renderLegacyMap, type LegacyMapRedrawRange, type LegacyMapViewport, type LegacyRenderableMap } from "../render/LegacyMapRenderer";
import { runLegacyProjectionLifecycle, type LegacyProjectionLifecycleInput } from "../render/LegacyProjectionLifecycle";
import { consumeLegacyZCommand, type LegacyZCommandConsumerCallbacks } from "../ui/LegacyZCommandConsumer";
import { dispatchLegacyZ, type LegacyZDispatchCallbacks } from "../ui/LegacyZDispatch";
import { stepLegacySimpleFrameHandler, type LegacySimpleFrameState } from "../ui/LegacySimpleFrameHandlers";
import { stepLegacyP, type LegacyPState } from "../render/LegacyGameplayPaintTriggers";
import { stepLegacyCameraFollow, type LegacyCameraFollowState } from "../render/LegacyCameraFollow";
import { stepLegacyCameraScroll, type LegacyCameraScrollState, type LegacyCameraScrollViewport } from "../render/LegacyCameraScroll";
import { stepLegacyCameraLetterbox, stepLegacyCameraCursor, classifyLegacyCameraCell, type LegacyCameraFrameLetterboxState, type LegacyCameraFrameCursorState } from "../render/LegacyCameraFrame";
import { classifyLegacyNegativeEntity, classifyLegacyPositiveEntity, isLegacyEntityIdInRange101to122, isLegacyMarkerIdInRangeMinus110to61 } from "../render/LegacyEntityClassifiers";
import { stepLegacyGameplayOuterLoop, type LegacyGameplayOuterLoopViewport, type LegacyGameplayOuterLoopState } from "../render/LegacyGameplayOuterLoop";
import { stepLegacyAnimatedSlotScan } from "../render/LegacyAnimatedSlotScan";
import { stepLegacyEffectSlotScan, isLegacyWithinViewport, enqueueLegacyEffectSlot } from "../render/LegacyEffectSlotScan";
import { stepLegacyCRect } from "../render/LegacyEffectRectMark";
import { dispatchLegacyGameplayCellBody, type LegacyGameplayCellBodyState } from "../render/LegacyGameplayCellBodyDispatch";
import { markLegacyEntityFootprint, LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS, type LegacyEntityFootprintMarkState } from "../sim/units/LegacyEntityFootprintMark";
import { drawLegacyMapMarkerPieces, prepareLegacyMapMarkerDispatch } from "../render/LegacyMapMarkerDispatch";
import { stepLegacyMapMarkerDetail } from "../render/LegacyMapMarkerDetail";
import { stepLegacyEntityAction, type LegacyEntityActionState } from "../render/LegacyEntityAction";
import { stepLegacyGameplayFramePrep, type LegacyGameplayFramePrepState } from "../render/LegacyGameplayFramePrep";
import { stepLegacySecondaryCellChain, type LegacySecondaryCellChainState } from "../render/LegacySecondaryCellChain";
import { decayLegacyMapMarkerDenseState, stepLegacyMapMarkerScan, type LegacyMapMarkerScanState } from "../render/LegacyMapMarkerScan";
import { stepLegacyMFrame, type LegacyMFrameCommand, type LegacyMFrameState } from "../ui/LegacyMFrame";
import { legacySubsystemDecision } from "../sim/tribe/LegacySubsystemDecision";
import { setLegacyEntityMode, type LegacyEntityModeInput } from "../sim/units/LegacyEntityMode";
import { canPlaceLegacyFootprint } from "../sim/world/LegacyFootprintCheck";
import { allocateLegacySubsystemRecord, type LegacySubsystemRecordInput } from "../sim/tribe/LegacySubsystemRecord";
import {
  selectLegacyAuxiliaryCandidates,
  refreshLegacyAuxiliaryTag, restoreLegacyAuxiliary,
  type LegacyAuxiliaryQueueState,
} from "../sim/world/LegacyAuxiliaryQueue";
import { stepLegacyEntityIUpdate } from "../sim/units/LegacyEntityIUpdate";
import { writeLegacyEntityLinkByte } from "../sim/units/LegacyEntityLinkByte";
import { placeLegacyAuxiliary } from "../sim/world/LegacyAuxiliaryPlacement";
import { placeLegacyEntity, type LegacyEntityPlacementInput } from "../sim/units/LegacyEntityPlacement";
import { stepLegacyZL, type LegacyZLState } from "../ui/LegacyZL";
import { selectLegacyEntityUpdateCandidates, type LegacyEntityUpdateSelectionInput } from "../sim/units/LegacyEntityUpdateSelection";
import { cleanupLegacyEntityUpdate, type LegacyEntityUpdateCleanupInput } from "../sim/units/LegacyEntityUpdateCleanup";
import { runLegacySubsystemPrepass, type LegacySubsystemPrepassInput } from "../sim/tribe/LegacySubsystemPrepass";
import { runLegacySubsystemEntityLoop, type LegacySubsystemEntityLoopInput } from "../sim/tribe/LegacySubsystemEntityLoop";
import { stepLegacySubsystemI } from "../sim/tribe/LegacySubsystemTail";
import { stepLegacySubsystemBuildingEconomy, type LegacyBuildingScratch } from "../sim/tribe/LegacySubsystemBuildingEconomy";
import { stepLegacySubsystemAa } from "../sim/tribe/LegacySubsystemAa";
import { stepLegacySubsystemAb } from "../sim/tribe/LegacySubsystemAb";
import { stepLegacySubsystemAe } from "../sim/tribe/LegacySubsystemAe";
import { stepLegacySubsystemWorkerDispatch } from "../sim/tribe/LegacySubsystemWorkerDispatch";
import { stepLegacyEntityWorkDeposit } from "../sim/units/LegacyEntityWorkDeposit";
import { stepLegacyEntityModeSelect } from "../sim/units/LegacyEntityModeSelect";
import { stepLegacyEntityIFinalize } from "../sim/units/LegacyEntityIFinalize";
import { stepLegacyEntityKPredicate } from "../sim/units/LegacyEntityKPredicate";
import { stepLegacyEntityVacate } from "../sim/units/LegacyEntityVacate";
import { stepLegacyEntityHealthDelta } from "../sim/units/LegacyEntityHealthDelta";
import { releaseLegacyEntityHome, stepLegacyEntityDeathCleanup } from "../sim/units/LegacyEntityDeathCleanup";
import { checkLegacyEntityAffordable, stepLegacyEntityPayCost } from "../sim/units/LegacyEntityResourceCost";
import { stepLegacyEntitySkillGain, stepLegacyEntitySlotSkillGain } from "../sim/units/LegacyEntitySkillGain";
import { stepLegacyEntityCourtship } from "../sim/units/LegacyEntityCourtship";
import { stepLegacyEntityMUpdate } from "../sim/units/LegacyEntityMUpdate";
import { stepLegacySubsystemTrainingCount } from "../sim/tribe/LegacySubsystemTrainingCount";
import { stepLegacySubsystemTrainingComplete } from "../sim/tribe/LegacySubsystemTrainingComplete";
import { stepLegacySubsystemVoidN } from "../sim/tribe/LegacySubsystemVoidN";
import { stepLegacySubsystemAq } from "../sim/tribe/LegacySubsystemAq";
import { stepLegacySubsystemAr } from "../sim/tribe/LegacySubsystemAr";
import { stepLegacySubsystemAs } from "../sim/tribe/LegacySubsystemAs";
import { stepLegacySubsystemAv } from "../sim/tribe/LegacySubsystemAv";
import { stepLegacySubsystemAw } from "../sim/tribe/LegacySubsystemAw";
import { stepLegacySubsystemAt, stepLegacySubsystemAu } from "../sim/tribe/LegacySubsystemAt";
import { stepLegacySubsystemLowerO } from "../sim/tribe/LegacySubsystemLowerO";
import { stepLegacySubsystemEntityOccupancyCheck } from "../sim/tribe/LegacySubsystemEntityOccupancyCheck";
import { stepLegacySubsystemNearestBuilding } from "../sim/tribe/LegacySubsystemNearestBuilding";
import { stepLegacySubsystemBM } from "../sim/tribe/LegacySubsystemBM";
import { stepLegacySubsystemAk } from "../sim/tribe/LegacySubsystemAk";
import { stepLegacySubsystemAl } from "../sim/tribe/LegacySubsystemAl";
import { stepLegacySubsystemH } from "../sim/tribe/LegacySubsystemH";
import { legacySubsystemNGate } from "../sim/tribe/LegacySubsystemNGate";
import { stepLegacySubsystemNDecision, type LegacySubsystemNDecisionInput } from "../sim/tribe/LegacySubsystemNDecision";
import { stepLegacySubsystemNOrchestrator, type LegacySubsystemNOrchestratorInput } from "../sim/tribe/LegacySubsystemNOrchestrator";
import { stepLegacySubsystemBDecision, type LegacySubsystemBDecisionInput } from "../sim/tribe/LegacySubsystemBDecision";
import { checkLegacyResourceNodeGate } from "../sim/world/LegacyResourceNodeGate";
import { stepLegacyEntityOccupantCare } from "../sim/units/LegacyEntityOccupantCare";
import { stepLegacyEntityRecordDoorRetarget } from "../sim/units/LegacyEntityRecordDoorRetarget";
import { stepLegacyEntityAo, stepLegacyEntityAp, stepLegacyEntityRecordRecovery } from "../sim/units/LegacyEntityRecordRecovery";
import { stepLegacySubsystemBBoolean } from "../sim/tribe/LegacySubsystemBBoolean";
import { legacySubsystemBEntryGate } from "../sim/tribe/LegacySubsystemBEntryGate";
import { stepLegacySubsystemBActivityPrefix, type LegacySubsystemBActivityPrefixInput } from "../sim/tribe/LegacySubsystemBActivityPrefix";
import { selectLegacySubsystemBAction, type LegacySubsystemBActionSelectorInput } from "../sim/tribe/LegacySubsystemBActionSelector";
import { stepLegacySubsystemBFinalPrefix, type LegacySubsystemBFinalPrefixInput } from "../sim/tribe/LegacySubsystemBFinalPrefix";
import { stepLegacySubsystemB, type LegacySubsystemBInput } from "../sim/tribe/LegacySubsystemBOrchestrator";
import { stepLegacySubsystemAj } from "../sim/tribe/LegacySubsystemAj";
import { stepLegacySubsystemAm } from "../sim/tribe/LegacySubsystemAm";
import { stepLegacySubsystemN } from "../sim/tribe/LegacySubsystemN";
import { stepLegacySubsystemBBoolean2 } from "../sim/tribe/LegacySubsystemBBoolean2";
import { stepLegacyEntityMarkerCommit } from "../sim/units/LegacyEntityMarkerCommit";
import { stepLegacyEntityStrikeGate } from "../sim/units/LegacyEntityStrikeGate";
import { stepLegacyAnimalHitReaction } from "../sim/units/LegacyAnimalHitReaction";
import { stepLegacyAnimalRoam } from "../sim/units/LegacyAnimalRoam";
import { stepLegacyEntityEquipIssue } from "../sim/units/LegacyEntityEquipIssue";
import { stepLegacyEntityAbduction } from "../sim/units/LegacyEntityAbduction";
import { stepLegacyEntityProduceItem } from "../sim/units/LegacyEntityProduceItem";
import { stepLegacyEntitySelectionDrop } from "../ui/LegacyEntitySelectionDrop";
import { stepLegacyEntityScreenIndex } from "../sim/units/LegacyEntityScreenIndex";
import { stepLegacyEntityMoodPick } from "../sim/units/LegacyEntityMoodPick";
import { stepLegacyEntitySpotAlert } from "../sim/units/LegacyEntitySpotAlert";
import { stepLegacySubsystemEntityTypeReaction } from "../sim/tribe/LegacySubsystemEntityTypeReaction";
import { computeLegacySubsystemPairScore } from "../sim/tribe/LegacySubsystemScore";
import { stepLegacySubsystemEntityTransformC } from "../sim/tribe/LegacySubsystemEntityTransform";
import { stepLegacySubsystemClampBounds } from "../sim/tribe/LegacySubsystemClampBounds";
import { stepLegacySubsystemNearbyMarkerLookup } from "../sim/tribe/LegacySubsystemNearbyMarkerLookup";
import { stepLegacySubsystemEntityUpdateTail } from "../sim/tribe/LegacySubsystemEntityUpdateTail";
import { stepLegacySubsystemEntityMoveApply } from "../sim/tribe/LegacySubsystemEntityMoveApply";
import { stepLegacySubsystemEntityDisplace } from "../sim/tribe/LegacySubsystemEntityDisplace";
import { stepLegacySubsystemEntityMoveCancel, stepLegacySubsystemRecordWorkerLevel } from "../sim/tribe/LegacySubsystemEntityMoveCancel";
import { stepLegacySubsystemEntityPaceAccum } from "../sim/tribe/LegacySubsystemEntityPaceAccum";
import { stepLegacySubsystemUnitTraining } from "../sim/tribe/LegacySubsystemUnitTraining";
import { stepLegacySubsystemAf } from "../sim/tribe/LegacySubsystemAf";
import { stepLegacySubsystemAg } from "../sim/tribe/LegacySubsystemAg";
import { stepLegacySubsystemAh } from "../sim/tribe/LegacySubsystemAh";
import { stepLegacySubsystemAi } from "../sim/tribe/LegacySubsystemAi";
import { stepLegacyCursorHover } from "../ui/LegacyCursorHover";
import { stepLegacySubsystemEntityTrainingSlot } from "../sim/tribe/LegacySubsystemEntityTrainingSlot";
import { stepLegacySubsystemO } from "../sim/tribe/LegacySubsystemO";
import { dispatchLegacyEntityAction } from "../sim/units/LegacyEntityActionDispatch";
import { triggerLegacyEntityMove } from "../sim/units/LegacyEntityMoveTrigger";
import { stepLegacySubsystemT } from "../sim/tribe/LegacySubsystemT";
import { stepLegacySubsystemU } from "../sim/tribe/LegacySubsystemU";
import { stepLegacySubsystemV } from "../sim/tribe/LegacySubsystemV";
import { stepLegacySubsystemNPrivateO } from "../sim/tribe/LegacySubsystemNPrivateO";
import { stepLegacyEntityStatusGuard } from "../sim/units/LegacyEntityStatusGuard";
import { readLegacyEntityModeValue } from "../sim/units/LegacyEntityModeValue";
import { stepLegacyEntityTarget, type LegacyEntityTargetStepInput } from "../sim/units/LegacyEntityTargetStep";
import { stepLegacyEntityActionCommit } from "../sim/units/LegacyEntityActionCommit";
import { finalizeLegacyEntitySelection, releaseLegacyEntitySelection } from "../ui/LegacyEntitySelectionRelease";
import { stepLegacyEntityCoordinateUpdate } from "../ui/LegacyEntityCoordinateUpdate";
import { stepLegacyEntityCoreUpdate, type LegacyEntityCoreUpdateInput } from "../sim/units/LegacyEntityCoreUpdate";
import { stepLegacyEntityFollowup } from "../sim/units/LegacyEntityFollowup";
import { checkLegacyEntityModeListed, stepLegacySubsystemEntityProbe } from "../sim/tribe/LegacySubsystemEntityProbe";
import { stepLegacySubsystemEntityAssociationScan } from "../sim/tribe/LegacySubsystemEntityAssociationScan";
import { stepLegacyEntityWUpdate, type LegacyEntityWUpdateInput } from "../sim/units/LegacyEntityWUpdate";
import { stepLegacyEntityCWatch } from "../sim/units/LegacyEntityCWatch";
import { stepLegacyEntityActionScoreGate } from "../sim/units/LegacyEntityActionScoreGate";
import { checkLegacyEntityOccupant } from "../sim/units/LegacyEntityOccupantCheck";
import { stepLegacySubsystemAn } from "../sim/tribe/LegacySubsystemAn";
import { checkLegacySpiralPlacementGate } from "../sim/world/LegacySpiralPlacementGate";
import { stepLegacySubsystemP } from "../sim/tribe/LegacySubsystemP";
import { stepLegacySubsystemBVoidO } from "../sim/tribe/LegacySubsystemBVoidO";
import { stepLegacySubsystemScore, type LegacySubsystemScoreInput } from "../sim/tribe/LegacySubsystemScore";
import { classifyLegacySubsystemB } from "../sim/tribe/LegacySubsystemBClassify";
import { syncLegacySubsystemBCoordinate } from "../sim/tribe/LegacySubsystemBCoordinateSync";
import { stepLegacyEntityRecordCancel } from "../sim/units/LegacyEntityRecordCancel";
import { stepLegacyZB2 } from "../ui/LegacyZB2";
import { allocateLegacySubsystemBTenSlot, releaseLegacySubsystemBTenSlot, releaseLegacySubsystemBTenSlotEntity, releaseLegacySubsystemBEntitySlot } from "../sim/tribe/LegacySubsystemBTenSlot";
import { findLegacyNearestCandidate } from "../sim/world/LegacyNearestCandidateSearch";
import { checkLegacyCellCompatibility } from "../sim/world/LegacyCellCompatibilityCheck";
import { initializeLegacyEntityRecord, indexLegacyEntityRecord } from "../sim/world/LegacyEntityRecordLifecycle";
import { stepLegacyEntityDPredicate } from "../sim/units/LegacyEntityDPredicate";
import { stepLegacyEntityHousing } from "../sim/units/LegacyEntityHousing";
import { stepLegacyEntityCrowdDecay, stepLegacyEntityCrowdSpread } from "../sim/units/LegacyEntityCrowdStress";
import { stepLegacyEntityHappiness } from "../sim/units/LegacyEntityHappiness";
import { stepLegacyEntityESelection } from "../sim/units/LegacyEntityESelection";
import { checkLegacyEntityRecord } from "../sim/units/LegacyEntityRecordCheck";
import { completeLegacyEntityRecord } from "../sim/units/LegacyEntityRecordCompletion";
import { stepLegacyEntityAssociationCleanup } from "../sim/units/LegacyEntityAssociationCleanup";
import { changeLegacyEntityType, stepLegacySubsystemC, type LegacyEntityTypeChangeInput } from "../sim/units/LegacyEntityTypeChange";
import { scanLegacyEntityTargets, type LegacyEntityTargetScanInput, type LegacyEntityTargetScanResult } from "../sim/units/LegacyEntityTargetScan";
import { promoteLegacyEntityMode, selectLegacyEntityTypeAfterQ } from "../sim/units/LegacyEntityModePromotion";
import { calculateLegacyEntityM, type LegacyEntityMCalculationInput } from "../sim/units/LegacyEntityMCalculation";
import { stepLegacySubsystemEntityTransform } from "../sim/tribe/LegacySubsystemEntityTransform";
import { clearLegacyEntityRecordTarget } from "../sim/units/LegacyEntityRecordTargetClear";
import { filterLegacyEntityLifecycle } from "../sim/units/LegacyEntityLifecycleFilter";
import { finalizeLegacyEntity } from "../sim/world/LegacyEntityFinalize";
import { transferLegacyEntityAction } from "../sim/units/LegacyEntityActionTransfer";
import { stepLegacyStateU, type LegacyStateUInput } from "../ui/LegacyStateU";
import { stepLegacyStateTransitionCommand, type LegacyStateTransitionCommandInput } from "../ui/LegacyStateTransitionCommand";
import { stepLegacyStateS, type LegacyStateSInput } from "../ui/LegacyStateS";
import { stepLegacyStateT, type LegacyStateTInput } from "../ui/LegacyStateT";
import { stepLegacyFPairCommand, type LegacyFPairCommandInput } from "../ui/LegacyFPairCommand";
import { markLegacySpatialRecord, markLegacySpatialRect } from "../sim/world/LegacySpatialRecordUpdate";
import { stepLegacySpriteLayerLoop } from "../render/LegacySpriteLayerLoop";
import { stepLegacySpriteLayerPredicateA, stepLegacySpriteLayerPredicateB } from "../render/LegacySpriteLayerPredicates";
import { stepLegacyEntityOverlayDraw } from "../render/LegacyEntityOverlayDraw";
import { drawLegacyCScan } from "../text/LegacyCScanDraw";
import { applyLegacyAuxiliaryModeWrites, type LegacyAuxiliaryModeWriteResult } from "../sim/world/LegacyAuxiliaryModeWrites";
import { stepLegacyAuxiliaryModes67, type LegacyAuxiliaryModes67Input } from "../sim/world/LegacyAuxiliaryModes67";
import { stepLegacyAuxiliaryMode4 } from "../sim/world/LegacyAuxiliaryMode4";
import { stepLegacySubsystemOLower } from "../sim/tribe/LegacySubsystemOLower";
import { legacyPathCellPredicate } from "../sim/world/LegacyPathCellPredicate";
import { prepareLegacyPath, type LegacyPathPreparationInput } from "../sim/world/LegacyPathPreparation";
import { setLegacyPathDirection, type LegacyPathDirectionState } from "../sim/world/LegacyPathDirection";
import { stepLegacyPathE, type LegacyPathEInput } from "../sim/world/LegacyPathE";
import { stepLegacyByteActionQueue } from "../ui/LegacyByteActionQueue";
import { stepLegacySelectionFlags } from "../ui/LegacySelectionFlags";
import { beginLegacyEntityAction, stepLegacyAk, stepLegacyAl, stepLegacyAm, stepLegacyAn, stepLegacyAo, stepLegacyAp, stepLegacyAq, stepLegacyAr, stepLegacyAs, stepLegacyAt, stepLegacyAu, stepLegacyAv, stepLegacyAw, stepLegacyAx, stepLegacyAy, stepLegacyAz, stepLegacyAA, stepLegacyAd, stepLegacyAB, stepLegacyAC, stepLegacyAe, type LegacyAkCallbacks, type LegacyAmInput, type LegacyAnInput, type LegacyAoInput, type LegacyAoState, type LegacyApInput, type LegacyApState, type LegacyAqState, type LegacyArInput, type LegacyAuInput, type LegacyAwState, type LegacyAdInput, type LegacyAbInput, type LegacyAcInput, type LegacyAbState, type LegacyAcState, type LegacyAeInput, type LegacyAeState, type LegacyAdState, type LegacyAnState } from "../ui/LegacyStateMachine";
import { stepLegacyAf, stepLegacyAg, stepLegacyAh, stepLegacyAi, stepLegacyAj, type LegacyAfInput, type LegacyAfState, type LegacyAgInput, type LegacyAhInput, type LegacyAiInput, type LegacyGroupKeyState, type LegacyAjState } from "../sim/units/LegacyUnitSelection";
import { resetLegacyAM, stepLegacyAKViewport, stepLegacyAL, stepLegacyAOMap, stepLegacyMapEntry, stepLegacyAPPrefix, type LegacyAmResetInput, type LegacyAKViewportState, type LegacyALState, type LegacyAOMapInput, type LegacyAOMapState, type LegacyAPPrefixInput, type LegacyMapEntryCallbacks } from "../sim/world/LegacyMapEntryTransitions";
import { stepLegacyAQAudio, stepLegacyASAudioWait, type LegacyAQAudioInput } from "../audio/LegacyAudioTransitions";
import { ANIMAL_HP, ANIMAL_KIND, ANIMAL_X, ANIMAL_Y, BLD_HP, BLD_KIND, BLD_OWNER, BLD_WORK, BLD_WORKERS, BLD_WORKER_HEAD, BLD_X, BLD_Y, RES_KIND, RES_X, RES_Y, UNIT_AGE, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_DIRECTION, UNIT_FLAGS, UNIT_HAPPINESS, UNIT_HELD_ITEM, UNIT_HP, UNIT_JOB_TYPE, UNIT_MELEE_SKILL, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_ORDER, UNIT_RANGED_SKILL, UNIT_RECORD, UNIT_SCOUT_SKILL, UNIT_SLOT, UNIT_SPEED, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TIMER, UNIT_TYPE, UNIT_VISION, UNIT_WORK_TARGET, UNIT_Y } from "./DenseLayout";
import { stepSubsystemFrame } from "../sim/tribe/TribeFrameRuntime";
import { runSubsystemJ, runSubsystemN, stepSubsystemN, stepSubsystemOLower, stepSubsystemP, subsystemB, subsystemBActionSelector, subsystemBActivityPrefix, subsystemBBoolean, subsystemBC, subsystemBDecision, subsystemBEntryGate, subsystemBFinalPrefix, subsystemBTeamSweep, subsystemBVoid, subsystemD, subsystemDecision, subsystemEntityTransform, subsystemG, subsystemH, subsystemK, subsystemNDecision, subsystemNGate, subsystemNOrchestrator, subsystemPrivateO, subsystemRecordRecovery, subsystemT, subsystemTenSlotAllocate, subsystemTenSlotRelease, subsystemTenSlotReleaseEntity, subsystemU } from "../sim/tribe/TribeRuntime";
import { stepSubsystemStateCommand } from "../sim/tribe/TribeStateCommandRuntime";
import { subsystemEntityAAlert, subsystemEntityJTrigger } from "../sim/tribe/TribeSignalRuntime";
import { changeEntityType, entityCourtship, entityDeathCleanup, entityHealthDelta, entityModeValue, entityMove, entityPartition, entityRecordLifecycleInput, entityTypeReaction, finalizeEntity, gainEntitySkill, gainEntitySlotSkills, placeEntity, selectEntityTypeAfterQ, selectEntityUpdateCandidates, stepEntityCoreUpdate, stepEntityDecisionCheck, stepEntityIUpdate, stepEntityKPredicate, stepEntityRemoval, stepEntityTarget, stepEntityWUpdate } from "../sim/units/UnitRuntime";
import { entityActionPrompt, entityAp, entityMoveCancel, entityProduceItem, entityStrikeGate, stepEntityAction, stepEntityActionConfirmation, stepEntityCoordinateUpdate } from "../sim/units/EntityActionRuntime";
import { drawImageHelper, drawPackedComposite, drawPackedSpritePrimitive, renderCRow, renderGameplayTo, stepGameplayFramePrep, stepGameplayPaintComposite, stepGameplayPaintHud, stepLegacyC2, stepZSubrecordDraw } from "../render/RenderRuntime"; import { drawFrameCommandPrimitive } from "../render/FrameCommandPrimitiveRuntime"; import { stepGameplayOuterLoop } from "../render/GameplayOuterLoopRuntime";
import { drawMapMarker, renderMap, stepCameraCursor, stepCameraFollow, stepCameraFrame, stepCameraScroll } from "../render/CameraRuntime";
import { acceptNumericSequence, normalizeEntityViewport, projectRawKeyPressed, projectRawKeyReleased, runSelectionFlagsRefresh, stepFrame, stepFrameSelectionTransition, stepFrameSelectionTransitionInner, stepGameplayFrame, stepGameplayZAe, stepGameplayZAf, stepLegacyC, stepLegacyExitPreparation } from "../ui/UiRuntime"; import { runByteActionQueue, stepLegacyA2, stepLegacyBL, stepLegacyBM, stepLegacyD, stepLegacyD3, stepLegacyE, stepLegacyE3, stepLegacyF, stepLegacyL, stepLegacyO, stepLegacySceneAnimatedSlotClear, stepLegacyX } from "../ui/UiGameplayCommandRuntime"; import { stepDefaultAo, stepStateAOMap, stepStateAPPrefix, stepStateAQAudio, stepStateAi, stepStateAm, stepStateMachine, stepStateMapEntry, stepStateS, stepStateT, stepStateTransitionCommand, stepStateU } from "../ui/UiStateRuntime";
import { stepFrameDispatch } from "../ui/UiFrameDispatchRuntime";
import { animalRoam, batchAllocate, buildingPlacementOptions, canPlaceFootprint, checkEntityNeeds, clearEntityRecordTarget, completeEntityRecord, decodeMap, loadMap, mapOverviewInput, nearestCandidate, payEntityCost, preparePathTables, rebuildGridAfterLoad, resetMapEntryAllocation, runAuxiliaryPlacement, runPathTables, runProjectionLifecycle, runSpatialPass, stepAuxiliaryMode4, stepBuildingEconomy, stepMapEntry, vacateEntity } from "../sim/world/WorldRuntime";
import { hydrateGameplayRecord, loadGameplayFromStore, recordOptions, saveGameplayToStore, saveOriginalResourceAction, snapshotGameplayRecord } from "../save/SaveRuntime";
import { T_MAP_SIZE } from "./DataTables";
import { applyZFiveIntGeometry as runtimeApplyZFiveIntGeometry, applyZSevenIntGeometry as runtimeApplyZSevenIntGeometry, cRenderExtras as runtimeCRenderExtras, composeC as runtimeComposeC, consumeFrameCommand as runtimeConsumeFrameCommand, debugSnapshot as runtimeDebugSnapshot, dispatchZCommand as runtimeDispatchZCommand, drawCScan as runtimeDrawCScan, occupancyClass as runtimeOccupancyClass, queueGeometryText as runtimeQueueGeometryText, randomRemainder as runtimeRandomRemainder, repaintRect as runtimeRepaintRect, scanZElement as runtimeScanZElement, spotAlertScratch as runtimeSpotAlertScratch, stepZKText as runtimeStepZKText, stepZKind3 as runtimeStepZKind3, stepZKind4 as runtimeStepZKind4, stepZSubrecordDraw as runtimeStepZSubrecordDraw } from "./LegacyRuntimeRenderWiring";
import { allocateEffectSlot as runtimeAllocateEffectSlot, allocateRecord as runtimeAllocateRecord, allocateSubsystemRecord as runtimeAllocateSubsystemRecord, aiFlagCallbacks as runtimeAiFlagCallbacks, applyAuxiliaryModeWrites as runtimeApplyAuxiliaryModeWrites, calculateEntityM as runtimeCalculateEntityM, checkSpiralPlacementGate as runtimeCheckSpiralPlacementGate, cleanupEntityUpdate as runtimeCleanupEntityUpdate, entityCostInput as runtimeEntityCostInput, filterEntityLifecycle as runtimeFilterEntityLifecycle, legacySubsystemScoreInput as runtimeLegacySubsystemScoreInput, missionScriptU as runtimeMissionScriptU, missionScriptV as runtimeMissionScriptV, occupancyCheck as runtimeOccupancyCheck, pathCellPredicate as runtimePathCellPredicate, pickAdults as runtimePickAdults, placeGroundSlot as runtimePlaceGroundSlot, preparePath as runtimePreparePath, preparePathDirection as runtimePreparePathDirection, preparePathLive as runtimePreparePathLive, promoteEntityMode as runtimePromoteEntityMode, releaseEntitySelection as runtimeReleaseEntitySelection, removeAnimal as runtimeRemoveAnimal, runAjUpper as runtimeRunAjUpper, runAP as runtimeRunAP, scanEntityTargets as runtimeScanEntityTargets, setEntityMode as runtimeSetEntityMode, stepAuxiliaryModes67 as runtimeStepAuxiliaryModes67 } from "./LegacyRuntimeEntityWiring";
import { initializeOriginalLoop as runtimeInitializeOriginalLoop, loadLanguageResource as runtimeLoadLanguageResource, loadOriginalStartupStores as runtimeLoadOriginalStartupStores, loadProgressFromStore as runtimeLoadProgressFromStore, selectLanguage as runtimeSelectLanguage, setLanguageTable as runtimeSetLanguageTable, withImageGroups as runtimeWithImageGroups, withLanguageResources as runtimeWithLanguageResources, withLanguageTables as runtimeWithLanguageTables, withMaResource as runtimeWithMaResource, withMidiResource as runtimeWithMidiResource, withPackedData as runtimeWithPackedData, withTableA as runtimeWithTableA, withZhTranslation as runtimeWithZhTranslation, zhPaintBase as runtimeZhPaintBase } from "./LegacyRuntimeBootstrapWiring";
import { applyMFrameCommand as runtimeApplyMFrameCommand, beginEntityAction as runtimeBeginEntityAction, decodeRawMap as runtimeDecodeRawMap, letterboxState as runtimeLetterboxState, runSceneDispatch as runtimeRunSceneDispatch, selectResourceSection as runtimeSelectResourceSection, selectWindowUnits as runtimeSelectWindowUnits, startOriginalAudio as runtimeStartOriginalAudio, stepAe as runtimeStepAe, stepByteActionQueueMaintenance as runtimeStepByteActionQueueMaintenance, stepDefaultAd as runtimeStepDefaultAd, stepDefaultAm as runtimeStepDefaultAm, stepDefaultAn as runtimeStepDefaultAn, stepDefaultArFromAo as runtimeStepDefaultArFromAo, stepFPairCommand as runtimeStepFPairCommand, stepGroupKey as runtimeStepGroupKey, stepOriginalJ as runtimeStepOriginalJ, stepOriginalWaitPhase as runtimeStepOriginalWaitPhase, stepSelectionE as runtimeStepSelectionE, stepZAh as runtimeStepZAh, stepZAj as runtimeStepZAj } from "./LegacyRuntimeGameplayWiring";

/**
 * b.S:B (#50, byte) -- the layer selector `markLegacySpatialRecord`
 * (`LegacySpatialRecordUpdate.ts`, b's `final void a(int,int,int)`) reads to
 * pick which of `mainArrays.aInt`'s 2 layers to OR bits into. BUG FIX
 * (2026-09-04): every call site used to pass `layerIndex: this.game.S` --
 * but `game.S` is bound to a DIFFERENT field, `b.S:I` (#51, an unrelated int
 * loop counter used inside K(), see LegacyGameState.ts's own docblock) -- a
 * genuine case-variant twin collision (same pattern as `v:B`#376 vs
 * `v:I`#375 elsewhere in this codebase). Exhaustively grepped every
 * `putfield`/`getfield #50` in b-javap.txt: exactly one write anywhere in
 * the whole class (`final void a()`'s entity-slot reset, offset 25..27,
 * unconditional `S=1`) and exactly one read (inside the very method this
 * constant feeds, offset 108) -- so #50 is a true post-init constant for
 * the entire game, not live state worth threading through `game.*`. Live-
 * confirmed: forcing this to 1 on a fresh boot and re-running the spatial
 * pass flips `occupancyClass()` from 1 (explored, never-visible) to 0
 * (visible) at every tile a team-0 unit's reveal radius already covered.
 */
export const LEGACY_SPATIAL_LAYER_INDEX = 1;

/**
 * A state bag whose properties read and write another object's fields directly. The
 * original's fields are instance fields: a nested call's write is visible at
 * once and survives the caller. Copying them into a bag and writing the bag
 * back afterwards silently undid those nested writes (the unclosable Q=20
 * prompt, the camera snapping back, the chief-pick cursor stuck on 0), so
 * wrappers whose callbacks reach other methods use this instead.
 */
export function liveView<S, T extends object = LegacyGameState>(target: T, map: { readonly [K in keyof S]: keyof T }): S {
  const view = {} as Record<string, unknown>;
  const fields = target as unknown as Record<string, unknown>;
  for (const [key, field] of Object.entries(map) as [string, string][]) {
    Object.defineProperty(view, key, {
      get: () => fields[field],
      set: (value: unknown) => { fields[field] = value; },
      enumerable: true,
    });
  }
  return view as S;
}

/**
 * Allocation-level mirror of the arrays created by f.g().
 *
 * This class intentionally exposes original array shapes rather than semantic
 * game objects. The bytecode proves the shapes and element types, but does not
 * yet prove whether an individual field is a unit, building, resource, or AI
 * value. Keeping the raw containers here makes later method ports auditable.
 */
type StateCommandBag = {
  ai: number; ak: number; aj: number; oInt: number; oByte: number; v: number; vInt: number; q: number;
  aT: number; aS: number; aR: number; al: number; am: number; an: number; I: number; J: number; K: number;
  Q: number; H: boolean; Z: number; ao: number; JFlag: boolean; aP: number; R: number; s: boolean;
  aw: number; bF: number; u: number; pByte: number; bI: number; bG: number; bJ: number; L: number;
  A: boolean; dFlags: boolean[]; p: Int8Array;
};

/** The parameters of a moved runtime function after its leading `rt`. */
type RtArgs<F> = F extends (rt: LegacyRuntimeState, ...args: infer A) => unknown ? A : never;

export class LegacyRuntimeState {
  readonly renderTargets = new LegacyRenderTargets();
  readonly game = new LegacyGameState();
  readonly input = new LegacyInputState({
    onSelectionKey: (value) => acceptNumericSequence(this, value),
    onKeyPressed: (value) => this.projectRawKeyPressed(value),
    onKeyReleased: (value) => projectRawKeyReleased(this, value),
    // f.j:B (#325): keyPressed/keyReleased zero the idle counter h() bumps and
    // ae() reads. The input layer kept its own never-read copy until 2026-10-08.
    onIdleReset: () => { this.game.jByte = 0; },
    nFlag: () => this.game.nFlag,
    onStar: () => { this.game.staticL = true; },
    onHash: () => { this.game.staticM = true; },
    onDigitLatch: (value, holdW) => {
      this.game.digitKey = value;
      if (holdW) this.game.wFlag = true;
    },
    onDigitRelease: () => { this.game.wFlag = false; },
    // keyReleased(int) offset 226..230: p:Z(#351)=true when the repeat-guard
    // is held. stepLegacyGameplayTick's own pFlag block (already wired to
    // resetLegacyZI via onI) consumes it on the next tick -- see f.h()'s
    // offset 660..674.
    onPendingRelease: () => { this.game.pFlag = true; },
  });
  readonly progressStore = new LegacyProgressStore();
  /** f's constructor uses new java.util.Random(1). */
  readonly random = new LegacyRandom(1);
  /** Development-only trace of the latest table-driven f.ao() call. */
  readonly aoTrace = { count: 0, inputQ: -1, inputZ: -1, value: -1, outputQ: -1 };
  /** Exact f.b[6] MIDI selection table initialized by e.c(). */
  readonly audioTable = new Int8Array([0, 1, 2, 3, 4, 4]);
  midiResource?: MidiResource;
  midiPlayer?: OriginalMidiPlayer;
  progressStoreLoaded = false;
  readonly imageGroups: (ImagePack | undefined)[] = [undefined, undefined, undefined];
  readonly resourceTables = new LegacyResourceTables();
  /** Exact f.g() allocation shapes; semantics remain unresolved. */
  readonly mainArrays = new LegacyMainArrays();
  /** f.a:[[I (#136): f.G()'s int[3][4] cloud x/y/variant table. */
  // Row 0 IS game.a0 (f.a:[[I [0]): run() seeds a0[3] = -1000 to make G()'s
  // first pass roll all four clouds. MERGED 2026-10-08 (oracle): the two
  // separate arrays meant G() never saw the -1000.
  readonly gGeometry = [this.game.a0, new Int32Array(4), new Int32Array(4)];
  readonly subsystemArrays = new LegacySubsystemArrays();
  /**
   * The two fields `private void a(int,int)` (#271, `LegacyPathDirection.ts`)
   * writes and `private void e(int)` (#374, `LegacyPathE.ts`) reads back:
   * `b.a:B`(#71), the 3-bit direction mask, and `b.c:[B`(#146), the two step
   * counts (`new byte[2]`, allocated by `f.g()` at f-javap.txt offset
   * 494..497). Every one of #71's 13 and #146's 14 constant-pool references
   * across class b falls inside those two methods, so one holder per runtime
   * reproduces both exactly -- `c` is the same `Int8Array` as
   * `subsystemArrays.cByte`, not a copy. Declared after `subsystemArrays`
   * because the field initializer reads it.
   */
  readonly pathDirection: LegacyPathDirectionState = { a: 0, c: this.subsystemArrays.cByte };
  /** Raw f.m(int) sequence state; the five values come from f.g() bytecode. */
  readonly numericSequence: LegacyNumericSequenceState = {
    i: new Int32Array(6),
    j: new Int32Array([56, 55, 51, 57, 49]),
    aShort0: this.mainArrays.aShort[0],
    ae: false,
    af: false,
    ag: false,
    u: 0,
    q: 0,
  };
  /** Independent raw field bank for f.aD(); f.b is already used by loop state. */
  /**
   * f.ad()'s fields, LIVE since 2026-09-23: its Q == 19 branch calls Y() (the
   * camera pan, which writes I/K/y/A) and the copy-out used to undo it.
   */
  readonly adState: LegacyAdState = Object.assign(
    liveView<Omit<LegacyAdState, "selection">>(this.game, {
      Q: "screen", q: "mission", s: "sByte", t: "tByte", T: "actionT", R: "R", vInt: "vInt", vByte: "loopMode", H: "H",
      b: "difficulty", c: "progressC", A: "cursorRow", cFlag: "cFlag", y: "cursorColumn", z: "zByte", B: "BByte",
      I: "cameraColumn", J: "JByte", K: "cameraRow", L: "cameraSavedKByte", AFlag: "AFlag",
    }),
    { selection: this.game.selectionFlags },
  );
  /** Raw render-dispatch fields used by f.m() after f.ak(). */
  readonly frameDispatchState: LegacyFrameDispatchInput["state"] = Object.assign(
    // N is N:B (#79), the same field as game.targetSlot. CORRECTED
    // 2026-10-01: it was a private copy, so a(BII)'s target switch and
    // F()'s `N = c[1]` never reached m()/c(int,int)/u(), and vice versa.
    liveView<Pick<LegacyFrameDispatchInput["state"], "N">>(this.game, { N: "targetSlot" }),
    {
      missionFrame: -1, screen: 14, H: true, c1: 1,
      // f.b:[Z] (#234). CORRECTED 2026-09-30: this was a private array, so
      // F()'s Q 18/24/32 branches set b[11]/b[13]/b[16]/b[17] where the frame
      // command never looked, and the intro cutscene page was never drawn.
      flags: this.game.frameFlags,
    },
  );
  /** f.H/I/J/K/L/N()'s fields, LIVE since 2026-09-23 (onPrimitive writes vInt, onU writes A:Z). */
  readonly simpleFrameState: LegacySimpleFrameState = Object.assign(
    liveView<Omit<LegacySimpleFrameState, "flags" | "k">>(this.game, {
      Q: "screen", H: "H", I: "I", J: "J", ab: "abFlag", x: "xInt", vInt: "vInt", m: "mByte", aP: "aPInt", cFlag: "cFlag", AFlag: "AFlag",
    }),
    { flags: this.game.frameFlags, k: this.game.zlKBytes },
  );
  readonly mFrameState: LegacyMFrameState = {
    H: true,
    I: false,
    m: 0,
    flags: this.game.frameFlags,
    d: this.game.oElementRecordInts,
    a: new Int16Array(312),
    bytes: new Int8Array(0),
  };
  readonly framePrimitives: Array<readonly [number, number, number]> = [];
  readonly frameProjections: Array<readonly [number, number, number, number]> = [];
  readonly frameHelperCalls: Array<Readonly<Record<string, number | string>>> = [];
  /**
   * Not in the original: the rows f.c(III) last laid out (offscreen y of each, the Q they were drawn
   * for), so touch input (src/TouchControls.ts) can map a tap to a row of a vertical menu.
   */
  readonly touchMenuRows: number[] = [];
  /** Not in the original: called when the enemy or an animal lands a blow on the tribe, with the
   *  map cell (phase 3 alerts, Alerts.ts). */
  onTribeAttacked?: (x: number, y: number) => void;
  /** Not in the original: each message f.a(byte,byte,byte,byte) queues (type, cell, value), for the
   *  phase 3 notices (Alerts.ts). */
  onMessage?: (type: number, x: number, y: number, value: number) => void;
  touchMenuQ = -1;
  /** Not in the original: x of the last number the bottom bar (record 1010) drew, -1 for none. */
  touchBarNumberX = -1;
  readonly offscreenTargets = typeof document === "undefined" ? undefined : new LegacyOffscreenTargets();
  /**
   * f.an() (Back key) fields, live since 2026-09-27. Only Q/R/H/vInt used to
   * be synced: U and V were stuck at 5 and 4 (so Back on the mission-select
   * screen Q = V did nothing unless V was 4), aa:I was a private 0, and the
   * T/Z/P/I/S/m/ac writes were dropped.
   */
  readonly anState: LegacyAnState = Object.assign(
    liveView<Omit<LegacyAnState, "selection">>(this.game, {
      Q: "screen", U: "U", H: "H", P: "pendingP", I: "I", vInt: "vInt", T: "actionT", V: "progressV",
      Z: "Z", aaInt: "aaInt", mByte: "mByte", R: "R", S: "S", ac: "acFlag",
      y: "cursorColumn", z: "zByte", A: "cursorRow", B: "BByte", IByte: "cameraColumn", J: "JByte", K: "cameraRow", L: "cameraSavedKByte",
    }),
    { selection: [] as boolean[] },
  );
  /** Runtime mirror for the confirmed f.a(20,1,0) -> f.ap() path. */
  readonly entityActionState: LegacyApState = Object.assign(
    // f.a(byte,byte,byte)/f.ap() fields. Everything but ap/m/e is a
    // live game field (2026-09-23): ap()'s callees -- l(-1), ah(), the
    // selection release, f(int,int) -- write w, P, I/K and friends directly.
    // am:B (#208) / an:B (#210) are live since 2026-10-02: c()'s aD 12 reads
    // am for the prompt's portrait, so a private copy drew the previous
    // speaker's face under the prompt speaker's name.
    liveView<Omit<LegacyApState, "ap" | "m" | "e">>(this.game, {
      w: "barMode", KFlag: "choosingChief", Q: "screen", U: "U", z: "zByte", y: "cursorColumn", B: "BByte", A: "cursorRow",
      J: "JByte", I: "cameraColumn", L: "cameraSavedKByte", K: "cameraRow", P: "pendingP", o: "oInt", ac: "acFlag",
      am: "am", an: "an",
    }),
    { ap: 0, m: 0, e: 0 },
  );
  /**
   * f.ao()/f.ar()'s field bank. The synced fields are LIVE game fields since
   * 2026-09-23 (ap(), b(int) and aM() -- called from inside ao()/ar() --
   * write them, and ao()'s copy-out used to undo those writes). Every field
   * is live since 2026-09-27 (aa/l/camera were private copies).
   */
  readonly aoState: LegacyAoState = liveView<LegacyAoState>(this.game, {
    Q: "screen", R: "R", H: "H", vInt: "vInt", V: "progressV", r: "progressR", q: "mission", T: "actionT",
    Z: "Z", mByte: "mByte", s: "sByte", eByte: "eByte", af: "numericAf", c: "missionFrame", pByte: "persistedPByte",
    aaInt: "aaInt",
    // l:I (#334), the tips toggle as() flips (Z == 3); a private 0 until
    // 2026-09-27, so the Options switch never reached game.lInt or the save.
    lInt: "lInt",
    // Q=19's camera save z=y/B=A/J=I/L=K (offsets 111..136); these were
    // private zeros until 2026-09-27, so the save never reached the game.
    y: "cursorColumn", z: "zByte", A: "cursorRow", B: "BByte", I: "cameraColumn", J: "JByte", K: "cameraRow", L: "cameraSavedKByte",
  });
  maResource?: MaResource;
  languageResources?: {
    readonly s: DelimitedTable;
    readonly t: DelimitedTable;
    readonly d0: DelimitedTable;
  };
  /** All five JAR languages' /s, /t, /d0 (index = f.a:B), for the Q14 choice.
   *  Slots may be undefined until their set is background-loaded (see
   *  ResourceBootstrap); selectLanguage() already guards that case. */
  languageTables?: readonly ({ readonly s: DelimitedTable; readonly t: DelimitedTable; readonly d0: DelimitedTable } | undefined)[];
  /** f.a:B (static), the language c.b() loads from; ZH_LANGUAGE (5) is the added Chinese. */
  language = 0;
  zhStrings: ZhStrings | null = null;
  readonly zhPainter = new ZhPainter();
  /** Set while the language is Chinese: c.b(IIIIIII)'s Chinese wrap. */
  zhCompose: LegacyCZh | null = null;

  // f's buffers aliased by b.a(f); sizes are established by e/f bytecode.
  readonly packedBytes = new Int8Array(17638);
  readonly packedOffsets = new Int16Array(312);
  readonly geometry = new LegacyGeometryDecoder(this.packedBytes, this.packedOffsets, this.resourceTables, {
    // c.a(IIIII) for record 97 calls f.a(III) (#439) twice: the tribe emblems beside SCORE.
    onRecord97: (firstRecord, firstX, secondRecord, secondX, y) => {
      if (!this.offscreenTargets || !this.packedData) return;
      const packed = new LegacyPackedSpriteRenderer({
        shortTables: this.packedData.shortTables,
        byteTables: this.packedData.byteTables,
        imageGroups: this.imageGroups,
        graphics: this.offscreenTargets.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3],
        an: this.game.anInt,
      });
      packed.drawComposite(firstRecord, firstX, y);
      packed.drawComposite(secondRecord, secondX, y);
    },
  });
  readonly geometryRenderer = new LegacyGeometryRenderer(
    this.packedBytes,
    this.packedOffsets,
    this.resourceTables,
    () => this.geometry.activeRows,
  );
  /** f.a:[[Image][2][0] after c(byte) (#558) replaced it; undefined = pi8's own entry 0. */
  pi8Slot0: DrawableImage | undefined;
  /** Not in the original: the text record the last f.a(BII) compose drew (after c.g's section
   *  offset for records >= 71), read by the HD story / dialogue pages (StoryHud). */
  shownTextRecord = -1;
  /** Not in the original: what the selected-unit panel (frame command 4) draws -- its pictures
   *  (composite ids, text "") and numbers (asset -1) at their frame positions -- collected while
   *  `drawingVillagerPanel`; WideView.villagerPanelOf reads it for the HD villager panel (Hud.ts). */
  villagerPanelDraft: { asset: number; text: string; x: number; y: number }[] = [];
  drawingVillagerPanel = false;
  /** Not in the original: the /pi8 picture the last c(byte) chose (the story picture). */
  shownPicture = 0;
  /** Raw c.b()/c.a(Graphics,int) row-composition state. */
  readonly cComposition: LegacyCCompositionState = {
    g: new Int16Array(64), h: new Int16Array(64), r: 0, s: 0, t: 0, q: 0, p: 0,
    u: 0, v: 0, w: 0, y: 0,
  };
  /** Exact f.b[S] table loaded from the five trailing /a sections. */
  readonly saveOffsets = new Int16Array(570);
  readonly sectionOffsets = new Int16Array(5);
  readonly denseState = new Int8Array(F_E_LENGTH);
  /** f.p[40], used as the scratch record by b.b(int,int,int). */
  readonly auxiliaryScratch = new Int8Array(40);
  /** Raw f.P() state, the correct/complete replacement for simpleFrameState's `case "P"`. */
  /**
   * f.P()'s fields, LIVE since 2026-09-23: its onGameplayDraw reaches
   * stepEntityAction (writes an) and stepEntityRemoval (writes A:Z), which
   * the copy-out used to undo.
   */
  readonly pFrameState: LegacyPState = Object.assign(
    liveView<Omit<LegacyPState, "entityScanFlags" | "packedBytes" | "packedOffsets" | "dense" | "p">>(this.game, {
      needsFullReset: "H", followFlag: "AFlag", an: "an", ao: "ao", aR: "aR", JFlag: "jSceneFlag", jFlag: "jFlag", aP: "aPInt",
      aQ: "aQ", aS: "aS", targetSlot: "targetSlot", bc: "bc", bd: "bd", be: "be", bf: "bf", c: "cFlag",
      am: "am", al: "al", phase: "animPhase",
    }),
    {
      entityScanFlags: this.game.frameFlags, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
      dense: this.denseState, p: this.auxiliaryScratch,
    },
  );
  /** Shared raw f.S/f.T/f.U state used by the f.b(int) command boundary. */
  /**
   * f.b(int)/S()/T()/U()'s shared field bag. LIVE since 2026-09-23: it used
   * to be a snapshot copied in and out around stepSubsystemStateCommand,
   * which U()'s recursive onB re-entered (the inner call re-read stale game
   * values into the outer's bag), which T()'s own live writes (b.f:B = 6 on
   * ai 48) were overwritten by, and whose J/H were written back without
   * ever being read in.
   */
  readonly stateCommandState: StateCommandBag = (() => {
    const bag = liveView<Omit<StateCommandBag, "bG" | "bJ" | "dFlags" | "p">, LegacyGameState>(this.game, {
      ai: "ai", ak: "akByte", aj: "ajByte", oInt: "oInt", oByte: "oByte", v: "loopMode", vInt: "vInt",
      q: "mission", aT: "aTInt", aS: "aS", aR: "aR", al: "al", am: "am", an: "an", I: "cameraColumn", J: "JByte",
      K: "cameraRow", Q: "screen", H: "H", Z: "Z", ao: "ao", JFlag: "jSceneFlag", aP: "aPInt", R: "R",
      s: "cameraSFlag", aw: "levelAwByte", bF: "subsystemGFFlagByte", u: "uByte", pByte: "persistedPByte",
      bI: "subsystemGCurrentI", L: "cameraSavedKByte", A: "AFlag",
    });
    Object.defineProperties(bag, Object.getOwnPropertyDescriptors(
      liveView<Pick<StateCommandBag, "bG" | "bJ">, LegacySubsystemArrays>(this.subsystemArrays, { bG: "bgByte", bJ: "bJByte" }),
    ));
    return Object.assign(bag as StateCommandBag, {
      dFlags: Array.from({ length: 9 }, () => false),
      p: this.auxiliaryScratch,
    });
  })();
  /** Mutable b.b(III)/b.c(boolean) shared scratch state; field names remain raw. */
  readonly auxiliaryQueueState: LegacyAuxiliaryQueueState = { O: 0, N: 0, G: 0, eFlag: false, H: 0 };
  activeMap?: LegacyRenderableMap;

  // CORRECTED (2026-09-07): these are `f.b:[[B]`/`f.c:[[B]`, allocated by
  // `e.i()` (bytecode/e-javap.txt offset 22..45, two back-to-back
  // `new byte[96][96]`), NOT `f.g()` as this comment used to say -- f.g()
  // allocates a different set of fields entirely (g:[[B]/h:[[B]/i:[[B]/
  // a:[[[I]/a:[[Z], see their own docblocks). gridB in particular is also
  // `LegacySpiralPlacementGate.ts`'s mode-4 terrain grid (b's own #133
  // reference to the same field).
  readonly gridB = byteGrid(96, 96);
  readonly gridC = byteGrid(96, 96);
  /** f.g:[[B (#300) -- distinct secondary per-cell grid f.u()'s outer loop reads/clears. */
  readonly gridG = byteGrid(96, 96);
  /**
   * f.a:[[Z] (#129) -- `new boolean[P:B + 3][O:B]`, sized from `f.P:B`/
   * `f.O:B` (#87/#83).
   *
   * ANSWERED (2026-09-09), correcting this note twice over. It used to say
   * the allocation lives in f's CONSTRUCTOR and that both sizes "default 0
   * until whatever sets the real viewport size runs, so the original's own
   * effective size at startup is unclear". Both halves were wrong:
   *  - offsets 60..75 are in `private void g()`, not the constructor
   *    (`putfield #129` appears exactly once in all of f-javap.txt, at
   *    line 1041, inside `g()` which starts at line 1004);
   *  - the viewport size is set by `e.c()` offsets 16..44 across the
   *    `a:Lf;` back-reference (`O:B = 11`, `P:B = 18` -- see
   *    `applyLegacyFrameGeometry`), and `e` is constructed by `f.f()`
   *    before `g()` runs, so `g()` reads real values, not zeros.
   * The original allocation is therefore 21x11, not an unclear size.
   * Sized generously here (64x64) rather than reproducing that exactly; `LegacyEffectRectMark.ts`'s
   * own `stepLegacyCRect` only ever writes/reads within `[originRow,
   * originRow+height)`/`[originColumn, originColumn+width)`, well inside
   * this bound for any viewport size seen so far.
   */
  readonly effectRectBoolGrid: boolean[][] = Array.from({ length: 64 }, () => new Array(64).fill(false));
  /**
   * f.g:[B] (#298) -- `new byte[11]` per the constructor (bytecode/f-javap.txt
   * offsets 132..137). Scratch buffer `private void a(int,byte)`'s
   * arg2!=0 path writes into via the `e[4545+n]`/`e[4646+n]` linked-list
   * walk; read back by the not-yet-ported `a(IBBIIB)` detail-draw method.
   * Distinct from `gridG` (f.g:[[B] #300) above -- same first letter,
   * different array shape and constant-pool index.
   */
  readonly entityMarkerG = new Int8Array(11);
  /** f.h:[B] (#307) -- `new byte[11]`, same allocation/clear site as entityMarkerG; read by `LegacyMapMarkerDetail.ts`. */
  readonly entityMarkerH = new Int8Array(11);
  /** f.i:[B] (#314) -- `new byte[11]`, same allocation/clear site as entityMarkerG; read by `LegacyMapMarkerDetail.ts`. */
  readonly entityMarkerI = new Int8Array(11);
  // f.a:[[S] (#131) is mainArrays.aShort. A second copy here (`markerStatScratch`) took the
  // building-loss, kill-count and map-marker writes until 2026-10-09 (oracle run 5, frame 12796).
  /**
   * f.h:[[B] (#308) / f.i:[[B] (#315) -- read by `LegacySecondaryCellChain.ts`
   * (f.i(int)); distinct from `entityMarkerH` (#307, a 1D array) and
   * `f.h:I` (#311, `tailHCounter`) despite sharing the letter. Sized
   * `new byte[13][101]` at their one allocation site (private void g(),
   * offset 24..47). **CORRECTED (2026-09-07)**: the 2026-08-22
   * "PROVABLY ALWAYS ZERO -- no bastore site exists anywhere" claim only
   * grepped class f's own bytecode. Class b writes both fields via its
   * `a:Lf;` back-reference (#60), under its own constant-pool indices
   * (#185/#190) -- `private void a(byte,byte,int,int)`
   * (`LegacyEntityActionScoreGate.ts`, restored 2026-09-07 from a retracted
   * "always throws" premise) writes `h[ay][id]`/`i[ay][id]` for `ay` in
   * `[0, dense[5959+id]]` every time it fires. Now wired as mutable
   * `hTable`/`iTable` params to that port.
   */
  readonly secondaryCellHTable = Array.from({ length: 13 }, () => new Int8Array(101));
  readonly secondaryCellITable = Array.from({ length: 13 }, () => new Int8Array(101));
  // BUG FIX (2026-09-04): a redundant, never-connected duplicate of
  // `mainArrays.aInt` (f.a:[[[I, #128 in f's own pool / #72 as read via b's
  // `a:Lf;` back-reference) used to live here as its own field
  // (`intLayers`), allocated separately by `intLayers2x3x96()`. Every call
  // site that touched it (`runSpatialPass`'s b.d() port,
  // `markLegacySpatialRecord`'s b.a(III) port, and
  // `legacyPathCellPredicate`'s occupancy check) has its own docblock
  // explicitly citing "f.a[2][3][96]" as the target -- the SAME array
  // `legacyOccupancyClass()`/`markLegacyEntityFootprint` already read/write
  // via `mainArrays.aInt`. Two separate JS objects meant the vision/fog
  // bitmap b.d() writes into was never the one occupancyClass() reads,
  // so no tile was ever revealed (see docs/unknowns.md's 2026-09-07 entry).
  // All former `this.intLayers` sites now read `this.mainArrays.aInt`
  // directly; the field and its allocator are deleted, not aliased.
  readonly boolLayers = boolLayers2x3x96();

  readonly packedData?: PackedData;

  // b's fixed-capacity allocation tables share the same f.e buffer.
  readonly entities = new EntityBank(this.denseState);

  /** Read-only raw state snapshot for development parity inspection. */
  debugSnapshot(): Readonly<Record<string, unknown>> {
    return runtimeDebugSnapshot(this);
  }

  /** Raw f.a(int,int) class lookup over the two confirmed bit planes. */
  occupancyClass(x: number, y: number): number {
    return runtimeOccupancyClass(this, x, y);
  }

  /**
   * Execute the proven c.a(IIIII) geometry call from a Z element callback.
   * The arguments remain raw until f.a(byte,int,int) is mapped.
   */
  applyZFiveIntGeometry(x: number, mode: number, width: number, record: number, value: number): number {
    return runtimeApplyZFiveIntGeometry(this, x, mode, width, record, value);
  }

  /** Execute the proven c.a(IIIIIII) segmented geometry call from Z. */
  applyZSevenIntGeometry(x: number, mode: number, width: number, first: number, second: number, third: number, value: number): void {
    return runtimeApplyZSevenIntGeometry(this, x, mode, width, first, second, third, value);
  }

  /** Expand one localized c.a[1]/c.b[1] record through c.b(IIIIIII). */
  composeC(x: number, y: number, width: number, height: number, record: number, align: number, value: number): void {
    return runtimeComposeC(this, x, y, width, height, record, align, value);
  }

  /** c.a(Graphics,int)'s stats numbers, RNG and icons. */
  cRenderExtras(): LegacyCRenderExtras {
    return runtimeCRenderExtras(this);
  }


  /**
   * Run the proven Z-element scan and bind its selection callbacks to c's
   * composition/render phases in the original offset-959 -> offset-1010 order.
   */
  scanZElement(
    state: Omit<LegacyZElementScanState, "packedBytes" | "packedOffsets" | "byteRows" | "shortRows">,
    aD: number,
    xOffset: number,
    yOffset: number,
    callbacks: LegacyZElementScanCallbacks = {},
    onDraw?: (command: LegacyCDrawCommand) => void,
    zCommandCallbacks: LegacyZCommandConsumerCallbacks = {},
  ): boolean {
    return runtimeScanZElement(this, state, aD, xOffset, yOffset, callbacks, onDraw, zCommandCallbacks);
  }

  /**
   * Exact f.d(int,int) dispatch boundary. Kind 1 delegates to f.j(int);
   * kind 0 only updates the proven composite-position registers. The
   * remaining kind-2 branch stays explicit through the caller callback.
   */
  dispatchZCommand(kind: number, command: number, callbacks: LegacyZCommandConsumerCallbacks & LegacyZDispatchCallbacks = {}): void {
    return runtimeDispatchZCommand(this, kind, command, callbacks);
  }

  /** Run f.k(int) with the proven /a offset and dense-state sources. */
  stepZKText(state: LegacyZKTextState, command: number, callbacks: Omit<LegacyZKTextCallbacks, "readAdvance" | "readMode" | "languageBase" | "commandStyle"> = {}): void {
    return runtimeStepZKText(this, state, command, callbacks);
  }

  /** Run f.d(3,command), binding its proven aI<=2 branch to f.k(int). */
  stepZKind3(state: LegacyZKind3State, command: number, language: number, callbacks: LegacyZKind3Callbacks = {}, onKText?: LegacyZKTextCallbacks["onText"]): void {
    return runtimeStepZKind3(this, state, command, language, callbacks, onKText);
  }

  /** f.d(4,row): a command row's clip rect (LegacyZKind4.ts). */
  stepZKind4(state: Omit<LegacyZKind4State, "byteRows">, callbacks: LegacyZKind4Callbacks = {}): void {
    return runtimeStepZKind4(this, state, callbacks);
  }

  stepZSubrecordDraw(...args: RtArgs<typeof stepZSubrecordDraw>): ReturnType<typeof stepZSubrecordDraw> {
    return runtimeStepZSubrecordDraw(this, ...args);
  }




  /**
   * Consume one original f.j(int) command using the raw f field bank. The
   * caller-owned aliases are intentional until bytecode proves the live
   * producers of `as/ad/q/aJ/aK`.
   */
  consumeFrameCommand(command: number, callbacks: LegacyZCommandConsumerCallbacks = {}): void {
    return runtimeConsumeFrameCommand(this, command, callbacks);
  }

  projectRawKeyPressed(...args: RtArgs<typeof projectRawKeyPressed>): ReturnType<typeof projectRawKeyPressed> { return projectRawKeyPressed(this, ...args); }



  /** Raw c.a(x,y,mode,String,style) text-to-geometry entry point. */
  queueGeometryText(x: number, mode: number, text: string, style: number): number {
    return runtimeQueueGeometryText(this, x, mode, text, style);
  }

  canPlaceFootprint(...args: RtArgs<typeof canPlaceFootprint>): ReturnType<typeof canPlaceFootprint> { return canPlaceFootprint(this, ...args); }

  /** Raw f.b(int,int,int,int) auxiliary 22-slot record initializer. */
  allocateSubsystemRecord(
    map: Int8Array[],
    first: number,
    x: number,
    y: number,
    counterIndex: number,
    input: Omit<LegacySubsystemRecordInput, "state" | "map" | "packedBytes" | "packedOffsets">,
  ): number {
    return runtimeAllocateSubsystemRecord(this, map, first, x, y, counterIndex, input);
  }

  /** f.aP() (#497): the q-selected placement table, with the live wiring. */
  runAP(placementCallbacks: Omit<LegacyAPPrefixInput, "state" | "packedBytes" | "packedOffsets" | "shortRows"> = {}): void {
    return runtimeRunAP(this, placementCallbacks);
  }

  stepLegacyC(...args: RtArgs<typeof stepLegacyC>): ReturnType<typeof stepLegacyC> { return stepLegacyC(this, ...args); }

  runSpatialPass(...args: RtArgs<typeof runSpatialPass>): ReturnType<typeof runSpatialPass> { return runSpatialPass(this, ...args); }

  selectEntityUpdateCandidates(...args: RtArgs<typeof selectEntityUpdateCandidates>): ReturnType<typeof selectEntityUpdateCandidates> { return selectEntityUpdateCandidates(this, ...args); }

  /** Raw b.ad() cleanup for a selected entity-update association. */
  cleanupEntityUpdate(
    id: number,
    associationIndex: number,
    callbacks: Omit<LegacyEntityUpdateCleanupInput, "state" | "subsystemG" | "id" | "associationIndex"> = {},
  ): void {
    return runtimeCleanupEntityUpdate(this, id, associationIndex, callbacks);
  }



  stepEntityTarget(...args: RtArgs<typeof stepEntityTarget>): ReturnType<typeof stepEntityTarget> { return stepEntityTarget(this, ...args); }

  stepEntityCoreUpdate(...args: RtArgs<typeof stepEntityCoreUpdate>): ReturnType<typeof stepEntityCoreUpdate> { return stepEntityCoreUpdate(this, ...args); }

  completeEntityRecord(...args: RtArgs<typeof completeEntityRecord>): ReturnType<typeof completeEntityRecord> { return completeEntityRecord(this, ...args); }

  stepEntityWUpdate(...args: RtArgs<typeof stepEntityWUpdate>): ReturnType<typeof stepEntityWUpdate> { return stepEntityWUpdate(this, ...args); }

  changeEntityType(...args: RtArgs<typeof changeEntityType>): ReturnType<typeof changeEntityType> { return changeEntityType(this, ...args); }


  /**
   * `final boolean a(int,int,int,int)` (#270, the ~1900-instruction spiral
   * placement gate) -- shared wiring for all six call sites
   * (`an()`'s onLargeGate, `h()`'s onFootprint, `af()`'s onFootprintGate,
   * `N()`'s onGate x2, `f.b(int,int)`'s onFootprintProbe). Extracted
   * 2026-09-07 when the method was restored from its retracted "every mode
   * throws" premise (see `LegacySpiralPlacementGate.ts`'s own docblock) --
   * every one of those six sites needs the same dense/packedBytes/
   * saveOffsets/gridB/gridC/cRows/entityB/ae wiring, only mode/scanLimit/
   * origin/onOccupantCheck differ per call.
   */
  checkSpiralPlacementGate(
    mode: number,
    scanLimit: number,
    originX: number,
    originY: number,
    id: number,
    onOccupantCheck?: (cellValue: number) => boolean,
  ): boolean {
    return runtimeCheckSpiralPlacementGate(this, mode, scanLimit, originX, originY, id, onOccupantCheck);
  }

  stepEntityIUpdate(...args: RtArgs<typeof stepEntityIUpdate>): ReturnType<typeof stepEntityIUpdate> { return stepEntityIUpdate(this, ...args); }

  /** Execute the proven a(int) 30-slot target scan against the live entity bank. */
  scanEntityTargets(
    id: number,
    targetType: number,
    partition: number,
    onBestTarget?: LegacyEntityTargetScanInput["onBestTarget"],
  ): LegacyEntityTargetScanResult {
    return runtimeScanEntityTargets(this, id, targetType, partition, onBestTarget);
  }

  /** Proven b.P() mode write against the live entity bank. */
  promoteEntityMode(id: number, status: number): number {
    return runtimePromoteEntityMode(this, id, status);
  }

  selectEntityTypeAfterQ(...args: RtArgs<typeof selectEntityTypeAfterQ>): ReturnType<typeof selectEntityTypeAfterQ> { return selectEntityTypeAfterQ(this, ...args); }

  /** Proven b.m calculation core; callers supply the original k[] snapshot. */
  calculateEntityM(input: Omit<LegacyEntityMCalculationInput, "state" | "packedBytes" | "packedOffsets">): number {
    return runtimeCalculateEntityM(this, input);
  }

  clearEntityRecordTarget(...args: RtArgs<typeof clearEntityRecordTarget>): ReturnType<typeof clearEntityRecordTarget> { return clearEntityRecordTarget(this, ...args); }

  /** Compose the proven f.a(int,boolean) filter with its a(IIZZ) action boundary. */
  filterEntityLifecycle(
    id: number,
    enabled: boolean,
    readEntityCell: (row: number, column: number) => number,
    callbacks: {
      readonly onRecordCompletion?: (record: number) => void;
      readonly onLifecycleReset?: (record: number, enabled: boolean) => void;
    } = {},
  ): void {
    return runtimeFilterEntityLifecycle(this, id, enabled, readEntityCell, callbacks);
  }

  finalizeEntity(...args: RtArgs<typeof finalizeEntity>): ReturnType<typeof finalizeEntity> { return finalizeEntity(this, ...args); }

  entityModeValue(...args: RtArgs<typeof entityModeValue>): ReturnType<typeof entityModeValue> { return entityModeValue(this, ...args); }

  placeEntity(...args: RtArgs<typeof placeEntity>): ReturnType<typeof placeEntity> { return placeEntity(this, ...args); }

  /** Exact f.a(int,int) RNG helper; caller supplies the original mask/divisor. */
  randomRemainder(mask: number, divisor: number): number {
    return runtimeRandomRemainder(this, mask, divisor);
  }

  /** Raw mode 1..4 coordinate-write segment of b.a(IIII). */
  applyAuxiliaryModeWrites(input: Omit<Parameters<typeof applyLegacyAuxiliaryModeWrites>[0], "dense" | "packedOffsets">): LegacyAuxiliaryModeWriteResult {
    return runtimeApplyAuxiliaryModeWrites(this, input);
  }

  /** Raw mode 6/7 gate segment of b.a(IIII), with opaque owners as callbacks. */
  stepAuxiliaryModes67(input: Omit<LegacyAuxiliaryModes67Input, "dense" | "packedBytes" | "packedOffsets">): boolean {
    return runtimeStepAuxiliaryModes67(this, input);
  }



  /** Full raw b.a(IIIII) path preparation; a(II) and a(III)B stay callbacks. */
  preparePath(input: Omit<LegacyPathPreparationInput, "f" | "g">): void {
    return runtimePreparePath(this, input);
  }

  /** Raw b.a(II) direction mask/delta helper. */
  preparePathDirection(state: LegacyPathDirectionState, dx: number, dy: number): void {
    return runtimePreparePathDirection(this, state, dx, dy);
  }

  /** Raw b.a(III):byte path-cell predicate; u/v remain explicit raw fields. */
  pathCellPredicate(x: number, y: number, mode: number, u: number, v: number): number {
    return runtimePathCellPredicate(this, x, y, mode, u, v);
  }


  /**
   * Compose the proven a(II) -> b.e(int) -> a(IIIII) path-preparation chain
   * against the live b storage.  Packed delta reads and a(III)B remain
   * explicit because their scalar owner is not yet proven at this caller.
   */
  preparePathLive(input: {
    readonly arg1: number;
    readonly arg2: number;
    readonly arg3: number;
    readonly arg4: number;
    readonly mode: number;
    readonly readPackedDelta: (offset: number) => number;
    readonly onCellValue: (x: number, y: number, mode: number) => number;
  }): { readonly directionMask: number; readonly directionDeltas: Int8Array; readonly transitionCount: number } {
    return runtimePreparePathLive(this, input);
  }

  recordOptions(...args: RtArgs<typeof recordOptions>): ReturnType<typeof recordOptions> { return recordOptions(this, ...args); }

  allocateRecord(
    map: Int8Array[],
    team: number,
    x: number,
    y: number,
    type: number,
    flags: number,
    options: Omit<LegacyRecordAllocatorInput, "state" | "map" | "packedBytes" | "packedOffsets" | "counters" | "randomRemainder">,
  ): number {
    return runtimeAllocateRecord(this, map, team, x, y, type, flags, options);
  }

  stepFrame(...args: RtArgs<typeof stepFrame>): ReturnType<typeof stepFrame> { return stepFrame(this, ...args); }

  /**
   * private void j() (#613): h() runs it for v == 1, and Q() runs it during
   * cutscenes (v == 0) once aR > 0 -- which is how the world keeps moving
   * behind a dialogue. Shared by both call sites since 2026-10-08 (oracle).
   */
  stepOriginalJ(): void {
    return runtimeStepOriginalJ(this);
  }

  stepGameplayFrame(...args: RtArgs<typeof stepGameplayFrame>): ReturnType<typeof stepGameplayFrame> { return stepGameplayFrame(this, ...args); }

  stepGameplayZAe(...args: RtArgs<typeof stepGameplayZAe>): ReturnType<typeof stepGameplayZAe> { return stepGameplayZAe(this, ...args); }

  /** `f.aJ():V` (UPPERCASE, constant-pool #491, `stepLegacyAj`), reused by `af()`'s several branches. */
  runAjUpper(): void {
    return runtimeRunAjUpper(this);
  }

  subsystemBC(...args: RtArgs<typeof subsystemBC>): ReturnType<typeof subsystemBC> { return subsystemBC(this, ...args); }

  stepGameplayZAf(...args: RtArgs<typeof stepGameplayZAf>): ReturnType<typeof stepGameplayZAf> { return stepGameplayZAf(this, ...args); }

  stepFrameSelectionTransition(...args: RtArgs<typeof stepFrameSelectionTransition>): ReturnType<typeof stepFrameSelectionTransition> { return stepFrameSelectionTransition(this, ...args); }


  /**
   * Exact `private void a(boolean×9)` (constant pool #464) -- the REAL
   * method `stepLegacySelectionFlags` models. CORRECTION (2026-08-18):
   * a docblock here previously claimed this was `a(boolean,boolean,
   * boolean,boolean)` (#434) -- that IS a real, separate method, but
   * direct bytecode read confirms it's a trivial 4-arg convenience
   * wrapper (`iload_1..4; iconst_0×5; invokespecial #464`) that just
   * calls THIS 9-arg method with the last 5 args hardcoded false. Every
   * call site through 2026-08-18 only ever passed 4 args (defaulting the
   * rest to false via the JS default params, matching the wrapper's own
   * behavior) until `f.W()`'s `staticL` branch (`onSelectionPreset`) was
   * traced and found to call the 9-arg form DIRECTLY with `fifth=true`
   * (`iconst_1,0,0,0,1,0,0,0,0`) -- a real, non-default value the 4-arg
   * wrapper can never produce, requiring this signature to actually
   * expose all 9 params, not just 4.
   */
  /**
   * f.ai()'s own a(ZZZZZZZZZ) (#464, offset 145: a villager item turns the
   * unit panel on) and a(ZZZZ) (#434, offset 170). WIRED 2026-10-08: both
   * ai() call sites passed no callbacks, so browsing VILLAGERS never showed
   * the browsed villager's panel.
   */
  aiFlagCallbacks() {
    return runtimeAiFlagCallbacks(this);
  }

  runSelectionFlagsRefresh(...args: RtArgs<typeof runSelectionFlagsRefresh>): ReturnType<typeof runSelectionFlagsRefresh> { return runSelectionFlagsRefresh(this, ...args); }

  stepLegacySceneAnimatedSlotClear(...args: RtArgs<typeof stepLegacySceneAnimatedSlotClear>): ReturnType<typeof stepLegacySceneAnimatedSlotClear> { return stepLegacySceneAnimatedSlotClear(this, ...args); }

  stepLegacyBL(...args: RtArgs<typeof stepLegacyBL>): ReturnType<typeof stepLegacyBL> { return stepLegacyBL(this, ...args); }

  stepLegacyBM(...args: RtArgs<typeof stepLegacyBM>): ReturnType<typeof stepLegacyBM> { return stepLegacyBM(this, ...args); }

  stepEntityRemoval(...args: RtArgs<typeof stepEntityRemoval>): ReturnType<typeof stepEntityRemoval> { return stepEntityRemoval(this, ...args); }

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
  runSceneDispatch(value: number): void {
    return runtimeRunSceneDispatch(this, value);
  }


  stepLegacyD3(...args: RtArgs<typeof stepLegacyD3>): ReturnType<typeof stepLegacyD3> { return stepLegacyD3(this, ...args); }

  stepLegacyO(...args: RtArgs<typeof stepLegacyO>): ReturnType<typeof stepLegacyO> { return stepLegacyO(this, ...args); }

  stepLegacyL(...args: RtArgs<typeof stepLegacyL>): ReturnType<typeof stepLegacyL> { return stepLegacyL(this, ...args); }

  stepLegacyX(...args: RtArgs<typeof stepLegacyX>): ReturnType<typeof stepLegacyX> { return stepLegacyX(this, ...args); }

  stepLegacyD(...args: RtArgs<typeof stepLegacyD>): ReturnType<typeof stepLegacyD> { return stepLegacyD(this, ...args); }

  stepLegacyE(...args: RtArgs<typeof stepLegacyE>): ReturnType<typeof stepLegacyE> { return stepLegacyE(this, ...args); }

  stepLegacyA2(...args: RtArgs<typeof stepLegacyA2>): ReturnType<typeof stepLegacyA2> { return stepLegacyA2(this, ...args); }

  stepLegacyF(...args: RtArgs<typeof stepLegacyF>): ReturnType<typeof stepLegacyF> { return stepLegacyF(this, ...args); }

  stepLegacyC2(...args: RtArgs<typeof stepLegacyC2>): ReturnType<typeof stepLegacyC2> { return stepLegacyC2(this, ...args); }


  /** Exact f.h() maintenance call: f.a(100,0,0,0). */
  stepByteActionQueueMaintenance(): void {
    return runtimeStepByteActionQueueMaintenance(this);
  }

  runByteActionQueue(...args: RtArgs<typeof runByteActionQueue>): ReturnType<typeof runByteActionQueue> { return runByteActionQueue(this, ...args); }

  stepSubsystemFrame(...args: RtArgs<typeof stepSubsystemFrame>): ReturnType<typeof stepSubsystemFrame> { return stepSubsystemFrame(this, ...args); }

  /**
   * b.e()'s decision-check step: composes the currently-ported b()
   * segments (extracted from stepSubsystemFrame's onEntityDecisionCheck
   * callback so it can be exercised directly, e.g. by
   * verify-subsystem-b-wiring.mjs).
   *
   * onRawAction/onQueue (2026-08-18): traced to b.a(int,byte) (void,
   * offset 5985..6092) and b.Q() (offset 0..39) via raw bytecode -- both
   * already ported (LegacyEntityTypeChange.ts/changeEntityType,
   * LegacyEntityModePromotion.ts/selectEntityTypeAfterQ) but never wired
   * to a live caller until now.
   *
   * onBBoolean (2026-08-18, continued; fully rederived 2026-09-07): traced
   * to b.b(boolean) (offset 0..364) -- ported as stepLegacySubsystemBBoolean,
   * a real closest-scored-candidate scan over dense's 9833/9733/9783
   * scratch table. See LegacySubsystemBBoolean.ts's own docblock for the
   * full derivation.
   *
   * onGroupMode (2026-08-18, continued): traced to b.g(int) (offset
   * 0..317) -- already ported as stepLegacyEntityGPrefix, now wired via
   * `subsystemG` (own doc below); its `onD` sub-callback is also newly
   * ported+wired for real (`subsystemD`/`subsystemK`, b.d(int,int) and
   * b.k(int)).
   *
   * onEntityTransform (2026-08-18, RETRACTED-PREMISE 2026-09-07): traced
   * to `b.a(int,int,boolean)`/`subsystemEntityTransform`, previously
   * believed a 100%-unconditional guaranteed throw -- it is not, see that
   * method's own corrected docblock. Now wired for real; args forwarded.
   */
  /**
   * `private boolean a(int,boolean,int)` (#292) with its check b(int,boolean,int)
   * (#344) -- LegacyEntityResourceCost.ts. `v` is b.v:I at the call site: the
   * record for ab(), the unit itself for i()Z. V:I/W:I are written before they
   * are read inside one call, so each call gets fresh ones.
   */
  entityCostInput(v: number) {
    return runtimeEntityCostInput(this, v);
  }

  payEntityCost(...args: RtArgs<typeof payEntityCost>): ReturnType<typeof payEntityCost> { return payEntityCost(this, ...args); }

  gainEntitySlotSkills(...args: RtArgs<typeof gainEntitySlotSkills>): ReturnType<typeof gainEntitySlotSkills> { return gainEntitySlotSkills(this, ...args); }

  gainEntitySkill(...args: RtArgs<typeof gainEntitySkill>): ReturnType<typeof gainEntitySkill> { return gainEntitySkill(this, ...args); }


  /**
   * b.l(int) (#399, bytecode/b-javap.txt 33922, offsets 0..340): take animal
   * `a` off the map -- free the step cell it reserved (-128) while less than
   * half way through a step, clear its own cell and e[9513+a], and count its
   * species f.t[e[9469+a]] down when that index is below t202[q]. Ported
   * 2026-09-27 for vacate (kind 106) and b.l()/b.m()'s 22-animal pass.
   * Offset 20 compares e[9623+a] unmasked (the load rebuild masks it).
   */
  removeAnimal(a: number): void {
    return runtimeRemoveAnimal(this, a);
  }

  /**
   * b.a(int,int,int) (#266) -- LegacySubsystemEntityOccupancyCheck.ts, with
   * its q:B/r:B (#212/#215) writes landing in subsystemArrays for d(int).
   */
  occupancyCheck(id: number, x: number, y: number, arg3: number): number {
    return runtimeOccupancyCheck(this, id, x, y, arg3);
  }

  /**
   * f.a(int,int,int,int) (#301, bytecode/f-javap.txt 6923, offsets 0..85):
   * the first free slot of f.d:[[B (row 0 == 0, 40 slots) gets row 1 = 0,
   * row 0 = frame record, row 2 = offset, row 6 = kind, row 5 = target;
   * f.r() (LegacyAnimatedSlotScan.ts) animates and draws it. Full: nothing.
   */
  allocateEffectSlot(target: number, kind: number, offset: number, frame: number): void {
    return runtimeAllocateEffectSlot(this, target, kind, offset, frame);
  }

  /** f.a(int,int,int,byte) (#299) on the live grid -- LegacySpecialTileAllocator.ts. */
  placeGroundSlot(kind: number, x: number, y: number, amount: number): number {
    return runtimePlaceGroundSlot(this, kind, x, y, amount);
  }

  vacateEntity(...args: RtArgs<typeof vacateEntity>): ReturnType<typeof vacateEntity> { return vacateEntity(this, ...args); }

  entityDeathCleanup(...args: RtArgs<typeof entityDeathCleanup>): ReturnType<typeof entityDeathCleanup> { return entityDeathCleanup(this, ...args); }

  entityHealthDelta(...args: RtArgs<typeof entityHealthDelta>): ReturnType<typeof entityHealthDelta> { return entityHealthDelta(this, ...args); }

  stepEntityKPredicate(...args: RtArgs<typeof stepEntityKPredicate>): ReturnType<typeof stepEntityKPredicate> { return stepEntityKPredicate(this, ...args); }


  checkEntityNeeds(...args: RtArgs<typeof checkEntityNeeds>): ReturnType<typeof checkEntityNeeds> { return checkEntityNeeds(this, ...args); }

  stepEntityDecisionCheck(...args: RtArgs<typeof stepEntityDecisionCheck>): ReturnType<typeof stepEntityDecisionCheck> { return stepEntityDecisionCheck(this, ...args); }









  subsystemBVoid(...args: RtArgs<typeof subsystemBVoid>): ReturnType<typeof subsystemBVoid> { return subsystemBVoid(this, ...args); }

  subsystemU(...args: RtArgs<typeof subsystemU>): ReturnType<typeof subsystemU> { return subsystemU(this, ...args); }

  subsystemBTeamSweep(...args: RtArgs<typeof subsystemBTeamSweep>): ReturnType<typeof subsystemBTeamSweep> { return subsystemBTeamSweep(this, ...args); }

  subsystemK(...args: RtArgs<typeof subsystemK>): ReturnType<typeof subsystemK> { return subsystemK(this, ...args); }

  subsystemD(...args: RtArgs<typeof subsystemD>): ReturnType<typeof subsystemD> { return subsystemD(this, ...args); }


  animalRoam(...args: RtArgs<typeof animalRoam>): ReturnType<typeof animalRoam> { return animalRoam(this, ...args); }

  runAuxiliaryPlacement(...args: RtArgs<typeof runAuxiliaryPlacement>): ReturnType<typeof runAuxiliaryPlacement> { return runAuxiliaryPlacement(this, ...args); }


  /** b.B:B (#9) / b.z:B (#235) / b.A:B (#6), live, for `h()`'s own writes. */
  spotAlertScratch(): { B: number; z: number; A: number } {
    return runtimeSpotAlertScratch(this);
  }

  entityRecordLifecycleInput(...args: RtArgs<typeof entityRecordLifecycleInput>): ReturnType<typeof entityRecordLifecycleInput> { return entityRecordLifecycleInput(this, ...args); }


  entityTypeReaction(...args: RtArgs<typeof entityTypeReaction>): ReturnType<typeof entityTypeReaction> { return entityTypeReaction(this, ...args); }

  subsystemT(...args: RtArgs<typeof subsystemT>): ReturnType<typeof subsystemT> { return subsystemT(this, ...args); }

  /**
   * f.c(int,int,int,int) (#357, LegacyEffectRectMark.ts): mark the cells of a
   * rectangle inside the viewport for redraw and set B:Z.
   */
  repaintRect(x: number, y: number, width: number, height: number): void {
    return runtimeRepaintRect(this, x, y, width, height);
  }

  /** b's `private void c(boolean)` (#361): pick team 0's best adults into e[1..3]. */
  pickAdults(flag: boolean): void {
    return runtimePickAdults(this, flag);
  }

  /** b's `private void b(int,int,int)` (#342). */
  auxiliaryCandidates(first: number, second: number, third: number): void {
    selectLegacyAuxiliaryCandidates({
      p: this.auxiliaryScratch,
      dense: this.denseState,
      shortRows: this.mainArrays.aShort,
    }, this.auxiliaryQueueState, first, second, third);
  }

  /** b's `private boolean u()` (#419) -- mission 4's script, LegacySubsystemU.ts. */
  missionScriptU(): boolean {
    return runtimeMissionScriptU(this);
  }

  /** b's `private boolean v()` (#421) -- the mission script step, LegacySubsystemV.ts. */
  missionScriptV(): boolean {
    return runtimeMissionScriptV(this);
  }

  entityMove(...args: RtArgs<typeof entityMove>): ReturnType<typeof entityMove> { return entityMove(this, ...args); }

  entityActionPrompt(...args: RtArgs<typeof entityActionPrompt>): ReturnType<typeof entityActionPrompt> { return entityActionPrompt(this, ...args); }

  batchAllocate(...args: RtArgs<typeof batchAllocate>): ReturnType<typeof batchAllocate> { return batchAllocate(this, ...args); }

  entityAp(...args: RtArgs<typeof entityAp>): ReturnType<typeof entityAp> { return entityAp(this, ...args); }

  entityProduceItem(...args: RtArgs<typeof entityProduceItem>): ReturnType<typeof entityProduceItem> { return entityProduceItem(this, ...args); }

  entityStrikeGate(...args: RtArgs<typeof entityStrikeGate>): ReturnType<typeof entityStrikeGate> { return entityStrikeGate(this, ...args); }





  stepSubsystemN(...args: RtArgs<typeof stepSubsystemN>): ReturnType<typeof stepSubsystemN> { return stepSubsystemN(this, ...args); }

  /**
   * Shared input for `stepLegacySubsystemScore` (b's `b(IIII)` #332, and its
   * four now-ported callees #267/#268/#264/#366) at both of its call sites
   * (`onO`'s inline callback above and `stepSubsystemP` below). `id` is the
   * ambient entity id (`v:I`#225) both #267 and #268 read as `entityId` --
   * passed through explicitly rather than via `game.bUnit`, see
   * LegacySubsystemScore.ts's own docblock for why. `dByte`/`gridC` are
   * #264's own storage (`LegacySubsystemPairSetup.ts`); `bThreshold` is
   * `b.B:I`(#8), #366's threshold, precomputed the same way
   * `LegacySubsystemP.ts`'s own wiring already does.
   */
  legacySubsystemScoreInput(id: number): LegacySubsystemScoreInput {
    return runtimeLegacySubsystemScoreInput(this, id);
  }


  /**
   * private void p() (offsets 0..1906). CORRECTION (2026-08-22): `o()`
   * (offset 0..3, `p()`'s own unconditional first call) was ported
   * (`stepLegacySubsystemBVoidO`) but never actually invoked anywhere --
   * the old docblock's "already wired separately" claim was aspirational,
   * not true; confirmed via grep, zero real call sites. Now called here,
   * first, matching the real bytecode order. Wired 2026-08-21 into
   * `private boolean b()`'s own real `onP` boundary. `qByte` (`b.Q:B`#46)
   * and `fByte` (`b.f:B`#167) are shared class-b singleton scratch state,
   * not individually traced beyond their confirmed default (-1/0, from
   * `final void a()`'s entity-slot reset) -- see
   * `game.subsystemBQByte`/`game.subsystemGFFlagByte`'s own docblocks.
   */
  /**
   * `private void F()` (#242) as `D()`'s `onF`, for one entity. Shared by
   * u()'s own D() call and a(byte)'s (#285) D() call for the displaced
   * occupant.
   */
  /** f.h(int) (#390): `f(id); e(id);` -- clear the unit from the player's selection. */
  releaseEntitySelection(entityId: number): void {
    return runtimeReleaseEntitySelection(this, entityId);
  }

  entityMoveCancel(...args: RtArgs<typeof entityMoveCancel>): ReturnType<typeof entityMoveCancel> { return entityMoveCancel(this, ...args); }

  stepSubsystemP(...args: RtArgs<typeof stepSubsystemP>): ReturnType<typeof stepSubsystemP> { return stepSubsystemP(this, ...args); }

  subsystemH(...args: RtArgs<typeof subsystemH>): ReturnType<typeof subsystemH> { return subsystemH(this, ...args); }

  nearestCandidate(...args: RtArgs<typeof nearestCandidate>): ReturnType<typeof nearestCandidate> { return nearestCandidate(this, ...args); }

  buildingPlacementOptions(...args: RtArgs<typeof buildingPlacementOptions>): ReturnType<typeof buildingPlacementOptions> { return buildingPlacementOptions(this, ...args); }


  subsystemG(...args: RtArgs<typeof subsystemG>): ReturnType<typeof subsystemG> { return subsystemG(this, ...args); }


  subsystemEntityTransform(...args: RtArgs<typeof subsystemEntityTransform>): ReturnType<typeof subsystemEntityTransform> { return subsystemEntityTransform(this, ...args); }

  subsystemEntityJTrigger(...args: RtArgs<typeof subsystemEntityJTrigger>): ReturnType<typeof subsystemEntityJTrigger> { return subsystemEntityJTrigger(this, ...args); }

  subsystemEntityAAlert(...args: RtArgs<typeof subsystemEntityAAlert>): ReturnType<typeof subsystemEntityAAlert> { return subsystemEntityAAlert(this, ...args); }






  /** Raw f.b(int,boolean) entity-mode entry point. */
  setEntityMode(
    id: number,
    enabled: boolean,
    callbacks: Omit<LegacyEntityModeInput, "state" | "packedBytes" | "packedOffsets"> = {},
  ): void {
    return runtimeSetEntityMode(this, id, enabled, callbacks);
  }

  /** Keep the decoded /pd0 archive available without flattening unrelated tables. */
  withPackedData(data: PackedData): LegacyRuntimeState {
    return runtimeWithPackedData(this, data);
  }

  hydrateGameplayRecord(...args: RtArgs<typeof hydrateGameplayRecord>): ReturnType<typeof hydrateGameplayRecord> { return hydrateGameplayRecord(this, ...args); }


  snapshotGameplayRecord(...args: RtArgs<typeof snapshotGameplayRecord>): ReturnType<typeof snapshotGameplayRecord> { return snapshotGameplayRecord(this, ...args); }

  loadGameplayFromStore(...args: RtArgs<typeof loadGameplayFromStore>): ReturnType<typeof loadGameplayFromStore> { return loadGameplayFromStore(this, ...args); }


  runSubsystemJ(...args: RtArgs<typeof runSubsystemJ>): ReturnType<typeof runSubsystemJ> { return runSubsystemJ(this, ...args); }

  saveGameplayToStore(...args: RtArgs<typeof saveGameplayToStore>): ReturnType<typeof saveGameplayToStore> { return saveGameplayToStore(this, ...args); }

  /** Replay the confirmed private f.d(0) slot-0 load performed by f.run(). */
  loadProgressFromStore(): LegacyRuntimeState {
    return runtimeLoadProgressFromStore(this);
  }

  /** Mirror f.run(): d(1) only after a missing d(0), then always d(2). */
  loadOriginalStartupStores(): LegacyRuntimeState {
    return runtimeLoadOriginalStartupStores(this);
  }

  withImageGroups(pi0: ImagePack, pi9: ImagePack, pi8: ImagePack): LegacyRuntimeState {
    return runtimeWithImageGroups(this, pi0, pi9, pi8);
  }

  withMaResource(resource: MaResource): LegacyRuntimeState {
    return runtimeWithMaResource(this, resource);
  }

  withMidiResource(resource: MidiResource): LegacyRuntimeState {
    return runtimeWithMidiResource(this, resource);
  }

  /** Keep the original c.b(0/1/2) sources available without flattening them. */
  withLanguageResources(s: DelimitedTable, t: DelimitedTable, d0: DelimitedTable): LegacyRuntimeState {
    return runtimeWithLanguageResources(this, s, t, d0);
  }

  /** Every JAR language set, so the Q14 choice (f.a:B) can switch c.b()'s source. */
  withLanguageTables(tables: readonly ({ readonly s: DelimitedTable; readonly t: DelimitedTable; readonly d0: DelimitedTable } | undefined)[]): LegacyRuntimeState {
    return runtimeWithLanguageTables(this, tables);
  }

  /**
   * Fill one language slot after the fact (background preload from
   * main.ts). Replaces the array instead of mutating it, so the
   * `readonly` table list stays honest and selectLanguage() sees the
   * new set on its next call. Out-of-range indices are ignored.
   */
  setLanguageTable(index: number, table: { readonly s: DelimitedTable; readonly t: DelimitedTable; readonly d0: DelimitedTable }): void {
    return runtimeSetLanguageTable(this, index, table);
  }

  /** The Chinese strings (docs/translation-zh-CN.json); enables Q14's sixth row. */
  withZhTranslation(file: ZhTranslationFile): LegacyRuntimeState {
    return runtimeWithZhTranslation(this, file);
  }

  /**
   * f.a:B = language (ao()'s Q14 choice). 0..4 switch c.b()'s source to that JAR language;
   * ZH_LANGUAGE keeps language 0's English bytes underneath and draws the Chinese strings.
   */
  selectLanguage(language: number): void {
    return runtimeSelectLanguage(this, language);
  }

  zhPaintBase(imageGroup0: ImagePack): ZhPaint {
    return runtimeZhPaintBase(this, imageGroup0);
  }

  /** Replay one original c.b(index) load through /a[280]'s byte translation table. */
  loadLanguageResource(index: 0 | 1 | 2): LegacyRuntimeState {
    return runtimeLoadLanguageResource(this, index);
  }

  /** Attach only the bytes e.f() provably copies before /a's invalid read. */
  withTableAPrefix(prefix: AResourcePrefixReplay): LegacyRuntimeState {
    this.packedBytes.set(prefix.bytes);
    this.packedOffsets.set(prefix.offsets);
    return this;
  }

  /** Attach the complete `/a` loader result, including f.b[S]'s 570 shorts. */
  withTableA(table: AResourceDiagnostic): LegacyRuntimeState {
    return runtimeWithTableA(this, table);
  }

  /**
   * Exact f.run() state writes after resource bootstrap, before the loop.
   * f.run()'s own offset-101 call to private void i() (#610) -- CORRECTION
   * (2026-08-22): used to call the bytecode-mis-bound
   * initializeLegacyTransientState (5 of its 13 fields pointed at orphaned
   * gFlag/hFlag/fFlag/eFlag/vFlag duplicates instead of the canonical
   * inputLeft/inputRight/inputDown/inputUp/inputV) -- now calls the real,
   * canonical resetLegacyZI directly.
   */
  initializeOriginalLoop(): LegacyRuntimeState {
    return runtimeInitializeOriginalLoop(this);
  }

  stepStateMachine(...args: RtArgs<typeof stepStateMachine>): ReturnType<typeof stepStateMachine> { return stepStateMachine(this, ...args); }

  /**
   * Default f.am() bridge used by f.ak() for Q=22/23.  The T=0 branch now
   * reaches the proven map-entry chain; the T=1 e(int) action remains an
   * explicit unresolved boundary and therefore returns false without inventing
   * resource semantics.
   */
  stepDefaultAm(): void {
    return runtimeStepDefaultAm(this);
  }

  saveOriginalResourceAction(...args: RtArgs<typeof saveOriginalResourceAction>): ReturnType<typeof saveOriginalResourceAction> { return saveOriginalResourceAction(this, ...args); }

  /**
   * Execute the exact pre-h() private f.aS() phase from run(). Browser timing
   * replaces Thread.yield/sleep; all bytecode-visible state writes remain.
   */
  stepOriginalWaitPhase(): void {
    return runtimeStepOriginalWaitPhase(this);
  }

  /** Runtime bridge for the confirmed f.aQ() MIDI track/player lifecycle. */
  startOriginalAudio(): void {
    return runtimeStartOriginalAudio(this);
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
  selectResourceSection(value: number): void {
    return runtimeSelectResourceSection(this, value);
  }

  /** aB()/aC(): Q, Z, ab and the dialogue scroll y:I with its Q:Z/R:Z edges. */
  readonly scrollSelectorState = liveView<LegacyAbState & LegacyAcState>(this.game, {
    Q: "screen", Z: "Z", ab: "ab", y: "frameGenCounterY", QFlag: "zAd14QFlag", RFlag: "zAd14RFlag",
  });

  /** c.a(Graphics,int) offsets 780..832: f.Q:Z (at the top) / f.R:Z (at the end). */
  readonly setDialogueEdges = (atTop: boolean, atBottom: boolean): void => {
    this.game.zAd14QFlag = atTop;
    this.game.zAd14RFlag = atBottom;
  };

  mapOverviewInput(...args: RtArgs<typeof mapOverviewInput>): ReturnType<typeof mapOverviewInput> { return mapOverviewInput(this, ...args); }

  drawFrameCommandPrimitive(...args: RtArgs<typeof drawFrameCommandPrimitive>): ReturnType<typeof drawFrameCommandPrimitive> { return drawFrameCommandPrimitive(this, ...args); }

  stepFrameDispatch(...args: RtArgs<typeof stepFrameDispatch>): ReturnType<typeof stepFrameDispatch> { return stepFrameDispatch(this, ...args); }

  applyMFrameCommand(command: LegacyMFrameCommand): void {
    return runtimeApplyMFrameCommand(this, command);
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
  stepDefaultAd(): void {
    return runtimeStepDefaultAd(this);
  }


  readonly cameraScrollState: LegacyCameraScrollState = {
    rowScrollDelta: 0, columnScrollDelta: 0, pixelColumnOffset: 0, pixelRowOffset: 0,
    scrollTargetColumn: 0, scrollTargetRow: 0, followFlag: false, cFlag: false,
    bFlag: false, dFlag: false, aiScratch: 0, sFlag: false,
  };
  // f.O:B / f.P:B (#83/#87), live: e.c() sets 11 x 18 (LegacyFrameLayout) and a(ZZZZZZZZZ) changes
  // P:B with the HUD. Was a {12, 19} placeholder until 2026-10-08 (oracle: al/am off by one).
  readonly cameraScrollViewport: LegacyCameraScrollViewport = (() => {
    const game = this.game;
    return { get columns() { return game.viewColumns; }, get rows() { return game.viewRows; } };
  })();
  readonly aeState: LegacyAeState = {
    F: 0, byteF: 0, uFlag: false, tFlag: false, k: 0, q: 0,
    y: 0, I: 0, A: 0, K: 0, G: 0, HCoord: 0,
  };
  /**
   * Raw f.aE(): the five-tick cooldown timer V()'s `inputT && wByte!==3`
   * branch triggers (see LegacyGameplayInput.ts's `onAE`). Reachable live
   * (2026-08-14) now that `onAE` calls this instead of staying inert --
   * closes out the "aE() caller timing" gap noted in parity-checklist.md.
   * `onFourFlags` (f.a(ZZZZ) #434, offset 48) and `onAI` (f.aI() #490,
   * offset 83) wired 2026-09-27; both were ported but left inert.
   */
  stepAe(): void {
    return runtimeStepAe(this);
  }
  stepCameraScroll(...args: RtArgs<typeof stepCameraScroll>): ReturnType<typeof stepCameraScroll> { return stepCameraScroll(this, ...args); }

  /** Apply the proven f.an() table/state branches with unresolved callbacks inert. */
  stepDefaultAn(): void {
    return runtimeStepDefaultAn(this);
  }

  stepDefaultAo(...args: RtArgs<typeof stepDefaultAo>): ReturnType<typeof stepDefaultAo> { return stepDefaultAo(this, ...args); }

  /** Execute f.ar() against the live f.ao() field bank. */
  stepDefaultArFromAo(): void {
    return runtimeStepDefaultArFromAo(this);
  }

  /** Enter the confirmed f.a(byte,byte,byte) prefix from the live W() path. */
  beginEntityAction(ap: number, am: number, an: number): void {
    return runtimeBeginEntityAction(this, ap, am, an);
  }

  /** f.e(int) (#590): take one unit out of the selection groups. */
  stepSelectionE(id: number): void {
    return runtimeStepSelectionE(this, id);
  }

  /**
   * f.aF() (#487): select every team-0 unit in the window B..E (d(byte)'s
   * double-tap sets it to the viewport). WIRED 2026-09-23.
   */
  selectWindowUnits(): void {
    return runtimeSelectWindowUnits(this);
  }

  /** f.aG()/f.aH() (#488/#489): keys 7/9 held store the selection as group 2/3, tapped recall it. WIRED 2026-09-23. */
  stepGroupKey(store: boolean): void {
    return runtimeStepGroupKey(this, store);
  }

  /** f.ah() (#509), LegacyZAh.ts, on the live game fields. */
  stepZAh(): void {
    return runtimeStepZAh(this);
  }

  /** f.aj() (#511), LegacyZAj.ts: park the selection cursor on the next living unit. */
  stepZAj(): void {
    return runtimeStepZAj(this);
  }


  normalizeEntityViewport(...args: RtArgs<typeof normalizeEntityViewport>): ReturnType<typeof normalizeEntityViewport> { return normalizeEntityViewport(this, ...args); }

  stepEntityCoordinateUpdate(...args: RtArgs<typeof stepEntityCoordinateUpdate>): ReturnType<typeof stepEntityCoordinateUpdate> { return stepEntityCoordinateUpdate(this, ...args); }

  stepLegacyExitPreparation(...args: RtArgs<typeof stepLegacyExitPreparation>): ReturnType<typeof stepLegacyExitPreparation> { return stepLegacyExitPreparation(this, ...args); }


  stepStateAOMap(...args: RtArgs<typeof stepStateAOMap>): ReturnType<typeof stepStateAOMap> { return stepStateAOMap(this, ...args); }

  stepStateU(...args: RtArgs<typeof stepStateU>): ReturnType<typeof stepStateU> { return stepStateU(this, ...args); }

  stepStateTransitionCommand(...args: RtArgs<typeof stepStateTransitionCommand>): ReturnType<typeof stepStateTransitionCommand> { return stepStateTransitionCommand(this, ...args); }

  /**
   * Runtime owner for the b-side f.b(int) command submission.  The state is
   * shared across calls because f.S() initializes the ai/aj/ak sequence and
   * later negative f.b() commands advance that same sequence.
   */

  stepSubsystemStateCommand(...args: RtArgs<typeof stepSubsystemStateCommand>): ReturnType<typeof stepSubsystemStateCommand> { return stepSubsystemStateCommand(this, ...args); }

  stepStateS(...args: RtArgs<typeof stepStateS>): ReturnType<typeof stepStateS> { return stepStateS(this, ...args); }

  stepStateT(...args: RtArgs<typeof stepStateT>): ReturnType<typeof stepStateT> { return stepStateT(this, ...args); }

  /** Raw final f.b(int,int) port; b.a(III) stays a callback seam. */
  stepFPairCommand(
    input: Omit<LegacyFPairCommandInput, "dense" | "map" | "subsystem" | "packedBytes" | "packedOffsets">,
    x: number,
    y: number,
  ): void {
    return runtimeStepFPairCommand(this, input, x, y);
  }


  stepMapEntry(...args: RtArgs<typeof stepMapEntry>): ReturnType<typeof stepMapEntry> { return stepMapEntry(this, ...args); }

  resetMapEntryAllocation(...args: RtArgs<typeof resetMapEntryAllocation>): ReturnType<typeof resetMapEntryAllocation> { return resetMapEntryAllocation(this, ...args); }
  // CLEANUP (2026-08-25): stepStateASAudioWait removed -- zero callers
  // anywhere (confirmed via full-repo grep); the underlying
  // stepLegacyASAudioWait is very much alive, called directly at its own
  // real call site (stepOriginalWaitPhase) rather than through this wrapper.

  /** Decode the confirmed raw `/ma` tile stream for a numeric original map index. */
  decodeRawMap(mapIndex: number): LegacyRawMap {
    return runtimeDecodeRawMap(this, mapIndex);
  }


  loadMap(...args: RtArgs<typeof loadMap>): ReturnType<typeof loadMap> { return loadMap(this, ...args); }



  renderGameplayTo(...args: RtArgs<typeof renderGameplayTo>): ReturnType<typeof renderGameplayTo> { return renderGameplayTo(this, ...args); }


  stepGameplayPaintComposite(...args: RtArgs<typeof stepGameplayPaintComposite>): ReturnType<typeof stepGameplayPaintComposite> { return stepGameplayPaintComposite(this, ...args); }


  letterboxState(): LegacyCameraFrameLetterboxState {
    return runtimeLetterboxState(this);
  }


  stepEntityAction(...args: RtArgs<typeof stepEntityAction>): ReturnType<typeof stepEntityAction> { return stepEntityAction(this, ...args); }

  /** class c's final void a(int,int,int) (#445), f.q()'s own scan/draw call. */
  drawCScan(arg1: number, x: number, y: number): void {
    return runtimeDrawCScan(this, arg1, x, y);
  }

  stepGameplayFramePrep(...args: RtArgs<typeof stepGameplayFramePrep>): ReturnType<typeof stepGameplayFramePrep> { return stepGameplayFramePrep(this, ...args); }

  stepGameplayOuterLoop(...args: RtArgs<typeof stepGameplayOuterLoop>): ReturnType<typeof stepGameplayOuterLoop> { return stepGameplayOuterLoop(this, ...args); }

}
