import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { capitalise, originalText } from "../OriginalText";
import { ZH_LANGUAGE } from "../text/LegacyZhText";

export type SaveSlotIndex = 1 | 2 | 3;

export type SaveSlotSnapshot = {
  version: 1;
  slot: SaveSlotIndex;
  savedAt: number;
  isCustom: boolean;
  mission: number;
  difficulty: number;
  pop: number;
  maxPop: number;
  food: number;
  wood: number;
  stone: number;
  bones: number;
  t0: string | null;
  t1: string | null;
  t2: string | null;
};

export const ALL_STORAGE_KEYS = [
  "t0",
  "t1",
  "t2",
  "pt.slot.1",
  "pt.slot.2",
  "pt.slot.3",
  "pt.language",
  "pt.music",
  "pt.sfx",
  "pt.volume",
  "pt.zoomOut",
] as const;

function slotKey(slot: SaveSlotIndex): string {
  return `pt.slot.${slot}`;
}

export function readSaveSlot(slot: SaveSlotIndex): SaveSlotSnapshot | null {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveSlotSnapshot;
    if (!parsed || typeof parsed.mission !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function deleteSaveSlot(slot: SaveSlotIndex): void {
  try {
    localStorage.removeItem(slotKey(slot));
  } catch {
    // ignore storage errors
  }
}

export function canSaveCurrentMatch(runtime: LegacyRuntimeState): boolean {
  const g = runtime.game;
  return !!runtime.activeMap && (g.loopMode === 1 || g.screen === 10 || g.screen === 11);
}

/**
 * Saves the active match state immediately into the native RMS stores (`t0`, `t1`/`t2`)
 * and snapshots them into `pt.slot.<slot>`.
 */
export function saveToSlot(runtime: LegacyRuntimeState, slot: SaveSlotIndex): SaveSlotSnapshot | null {
  if (!canSaveCurrentMatch(runtime)) return null;
  const g = runtime.game;
  const isCustom = g.mission >= 7;
  const rmsSlot = isCustom ? 2 : 1;

  if (isCustom) {
    g.actionWFlag = true;
    g.persistedDByte = g.difficulty;
  } else {
    g.sByte = g.mission;
    g.progressC = g.difficulty;
  }

  const savedGameplay = runtime.saveOriginalResourceAction(rmsSlot);
  const savedProgress = runtime.saveOriginalResourceAction(0);
  if (!savedGameplay && !savedProgress) return null;

  // If paused on Q=11 (no prior save), upgrade to Q=10 so native Load row is active.
  if (g.screen === 11) {
    g.screen = 10;
    g.H = true;
  }

  const row = runtime.mainArrays.aShort[0];
  const table = runtime.packedOffsets[146] ?? 0;
  const val = (i: number) => row?.[runtime.packedBytes[table + i] ?? 0] ?? 0;

  const snapshot: SaveSlotSnapshot = {
    version: 1,
    slot,
    savedAt: Date.now(),
    isCustom,
    mission: g.mission,
    difficulty: g.difficulty || 1,
    pop: Math.max(0, val(0)),
    maxPop: Math.max(0, row?.[16] ?? 0),
    food: Math.max(0, val(1)),
    wood: Math.max(0, val(2)),
    stone: Math.max(0, val(3)),
    bones: Math.max(0, val(4)),
    t0: localStorage.getItem("t0"),
    t1: localStorage.getItem("t1"),
    t2: localStorage.getItem("t2"),
  };

  try {
    localStorage.setItem(slotKey(slot), JSON.stringify(snapshot));
    return snapshot;
  } catch {
    return null;
  }
}

/**
 * Restores a slot's RMS records (`t0`, `t1`, `t2`) into `localStorage` and syncs runtime progress flags.
 */
export function stageSlotForLoad(runtime: LegacyRuntimeState, slot: SaveSlotIndex): SaveSlotSnapshot | null {
  const snap = readSaveSlot(slot);
  if (!snap) return null;
  try {
    if (snap.t0 !== null) localStorage.setItem("t0", snap.t0);
    if (snap.t1 !== null) localStorage.setItem("t1", snap.t1);
    if (snap.t2 !== null) localStorage.setItem("t2", snap.t2);
  } catch {
    return null;
  }
  runtime.loadProgressFromStore();
  runtime.game.mission = snap.mission;
  if (snap.isCustom) {
    runtime.game.actionWFlag = true;
  } else {
    runtime.game.sByte = snap.mission;
  }
  return snap;
}

export function formatSlotTitle(runtime: LegacyRuntimeState, snap: SaveSlotSnapshot): string {
  const zh = runtime.language === ZH_LANGUAGE;
  if (snap.isCustom) {
    const mapIdx = Math.max(1, snap.mission - 6);
    return zh ? `自定义游戏 · 地图 ${mapIdx}` : `Custom Game · Map ${mapIdx}`;
  }
  // Campaign missions 0..6 map to chapters 1..5 via t248
  const base248 = runtime.packedOffsets[248] ?? 0;
  const chIdx = Math.max(0, Math.min(4, runtime.packedBytes[base248 + snap.mission] ?? snap.mission));
  const base151 = runtime.packedOffsets[151] ?? 0;
  const base152 = runtime.packedOffsets[152] ?? 0;
  const menuOffset = runtime.packedBytes[base152 + 8] ?? 0;
  const sRecord = runtime.packedBytes[base151 + menuOffset + chIdx] ?? (25 + chIdx);
  const chTitle = capitalise(originalText(runtime, "s", sRecord));
  return zh ? `战役第 ${chIdx + 1} 章 · ${chTitle}` : `Chapter ${chIdx + 1} · ${chTitle}`;
}
