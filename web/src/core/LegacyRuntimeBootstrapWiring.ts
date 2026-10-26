import type { LegacyRuntimeState } from "./LegacyRuntimeState";
import type { PackedData } from "../platform/PackedData";
import { applyLegacyFrameGeometry, deriveLegacyFrameLayout } from "../render/LegacyFrameLayout";
import type { ImagePack } from "../platform/ImagePack";
import type { AResourceDiagnostic, MaResource } from "../platform/BinaryResource";
import type { MidiResource } from "../platform/Audio";
import type { DelimitedTable } from "../platform/DelimitedResource";
import {
  ZH_LANGUAGE,
  ZhStrings,
  paintZhLine,
  tokenizeZh,
  tokensWidth,
  wrapZh,
  type ZhPaint,
  type ZhTranslationFile,
} from "../text/LegacyZhText";
import { resetLegacyZI } from "../ui/LegacyZI";

/** Keep the decoded /pd0 archive available without flattening unrelated tables. */
export function withPackedData(rt: LegacyRuntimeState, data: PackedData): LegacyRuntimeState {
  if (data.shortTables.length !== 11 || data.byteTables.length !== 25) {
    throw new RangeError("/pd0 table count does not match the confirmed f.g layout");
  }
  // e.c() offsets 6..110, the frame-geometry block. Applied here because
  // this is the first call in both boot chains, which matches the real
  // ordering: f.run() offset 1 calls f.f(), f.f() offset 17 does
  // `new e(this)`, and e's constructor calls e.c() at its offset 310 --
  // so e.c() is the very first thing run() causes to happen, ahead of
  // f.g() (offset 5) and the d(0)/d(1)/d(2) record loads (offsets 16..35)
  // that this chain's loadOriginalStartupStores() mirrors. Until
  // 2026-09-09 this block was never ported at all, so `viewportO`/
  // `viewportP` (f.O:B/f.P:B) sat at 0 -- see applyLegacyFrameGeometry's
  // own docblock for why grepping class f alone never turns up a writer.
  applyLegacyFrameGeometry(rt.game);
  const layout = deriveLegacyFrameLayout(data.shortTables, data.byteTables);
  rt.game.frameLayoutAV = layout.aV;
  rt.game.frameLayoutAU = layout.aU;
  return Object.assign(rt, { packedData: data });
}

/** Replay the confirmed private f.d(0) slot-0 load performed by f.run(). */
export function loadProgressFromStore(rt: LegacyRuntimeState): LegacyRuntimeState {
  const record = rt.progressStore.load();
  rt.progressStoreLoaded = record !== undefined;
  if (!record) return rt;
  // l:I (#334) is the hint toggle game.lInt; s/t/p:B are sByte/tByte/
  // persistedPByte (their progressL/S/T/P/W mirrors were removed 2026-09-24:
  // the save below wrote those never-updated copies back).
  rt.game.lInt = record.l;
  rt.game.progressR = record.r;
  rt.game.progressV = record.V;
  rt.game.progressC = record.c;
  // f.d(0) writes these same decoded values into the live fields used by
  // ao()/au(), not into a detached persistence DTO.
  rt.game.actionWFlag = record.W;
  rt.game.sByte = record.s;
  rt.game.tByte = record.t;
  rt.game.persistedPByte = record.p;
  return rt;
}

/** Mirror f.run(): d(1) only after a missing d(0), then always d(2). */
export function loadOriginalStartupStores(rt: LegacyRuntimeState): LegacyRuntimeState {
  if (!rt.progressStoreLoaded) rt.loadGameplayFromStore(1);
  rt.loadGameplayFromStore(2);
  return rt;
}

export function withImageGroups(
  rt: LegacyRuntimeState,
  pi0: ImagePack,
  pi9: ImagePack,
  pi8: ImagePack,
): LegacyRuntimeState {
  rt.imageGroups[0] = pi0;
  rt.imageGroups[1] = pi9;
  rt.imageGroups[2] = pi8;
  return rt;
}

export function withMaResource(rt: LegacyRuntimeState, resource: MaResource): LegacyRuntimeState {
  rt.maResource = resource;
  return rt;
}

export function withMidiResource(rt: LegacyRuntimeState, resource: MidiResource): LegacyRuntimeState {
  rt.midiResource = resource;
  return rt;
}

/** Keep the original c.b(0/1/2) sources available without flattening them. */
export function withLanguageResources(
  rt: LegacyRuntimeState,
  s: DelimitedTable,
  t: DelimitedTable,
  d0: DelimitedTable,
): LegacyRuntimeState {
  rt.languageResources = { s, t, d0 };
  return rt;
}

/** Every JAR language set, so the Q14 choice (f.a:B) can switch c.b()'s source. */
export function withLanguageTables(
  rt: LegacyRuntimeState,
  tables: readonly ({ readonly s: DelimitedTable; readonly t: DelimitedTable; readonly d0: DelimitedTable } | undefined)[],
): LegacyRuntimeState {
  rt.languageTables = tables;
  return rt;
}

/**
 * Fill one language slot after the fact (background preload from
 * main.ts). Replaces the array instead of mutating it, so the
 * `readonly` table list stays honest and selectLanguage() sees the
 * new set on its next call. Out-of-range indices are ignored.
 */
export function setLanguageTable(
  rt: LegacyRuntimeState,
  index: number,
  table: { readonly s: DelimitedTable; readonly t: DelimitedTable; readonly d0: DelimitedTable },
): void {
  if (!Number.isInteger(index) || index < 0 || index >= 5) return;
  const current = rt.languageTables ?? [];
  const next = [...current];
  while (next.length < 5) next.push(undefined);
  next[index] = table;
  rt.languageTables = next;
}

export function zhPaintBase(rt: LegacyRuntimeState, imageGroup0: ImagePack): ZhPaint {
  return { packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets, imageGroup0, painter: rt.zhPainter };
}

/** The Chinese strings (docs/translation-zh-CN.json); enables Q14's sixth row. */
export function withZhTranslation(rt: LegacyRuntimeState, file: ZhTranslationFile): LegacyRuntimeState {
  rt.zhStrings = new ZhStrings(file);
  // Widths and painting are always available (Q14 shows 中文 in every language); selectLanguage()
  // decides whether records are replaced.
  rt.geometry.zh = { tokens: () => null, width: (tokens, font) => tokensWidth(rt, font, tokens, (text) => rt.zhPainter.measure(text)) };
  rt.geometryRenderer.zhPaint = (graphics, imageGroup0, font, tokens, m, n) => paintZhLine(graphics, zhPaintBase(rt, imageGroup0), font, tokens, m, n);
  return rt;
}

/**
 * f.a:B = language (ao()'s Q14 choice). 0..4 switch c.b()'s source to that JAR language;
 * ZH_LANGUAGE keeps language 0's English bytes underneath and draws the Chinese strings.
 */
export function selectLanguage(rt: LegacyRuntimeState, language: number): void {
  rt.language = language;
  const zh = language === ZH_LANGUAGE && rt.zhStrings ? rt.zhStrings : null;
  const tables = rt.languageTables?.[language >= 5 ? 0 : language];
  if (tables) rt.languageResources = tables;
  const translate = (code: number) => rt.packedBytes[rt.packedOffsets[280] + code] ?? 0;
  if (rt.geometry.zh) {
    rt.geometry.zh = {
      ...rt.geometry.zh,
      tokens: zh ? (record) => { const text = zh.label(record); return text === null ? null : tokenizeZh(text, translate); } : () => null,
    };
  }
  rt.zhCompose = zh ? {
    tokens: (record) => { const text = zh.paragraph(record); return text === null ? null : tokenizeZh(text, translate); },
    wrap: (tokens, lineWidth, font) => wrapZh(rt, font, tokens, lineWidth, (text) => rt.zhPainter.measure(text)),
  } : null;
}

/** Replay one original c.b(index) load through /a[280]'s byte translation table. */
export function loadLanguageResource(rt: LegacyRuntimeState, index: 0 | 1 | 2): LegacyRuntimeState {
  if (!rt.languageResources) throw new Error("language resources have not been attached");
  const translationOffset = rt.packedOffsets[280];
  // c.b(int) catches both IOException and the broader Exception boundary.
  // With the raw /a[280] value, its version/data copy can exceed c's byte
  // buffer; that failure is swallowed by the original and does not abort f.run().
  try {
    if (index === 0) rt.resourceTables.loadTranslatedRecords(0, rt.languageResources.s, rt.packedBytes, translationOffset, 0);
    else if (index === 1) rt.resourceTables.loadTranslatedRecords(1, rt.languageResources.t, rt.packedBytes, translationOffset, 0);
    else rt.resourceTables.loadTranslatedRecords(2, rt.languageResources.d0, rt.packedBytes, translationOffset, 71);
  } catch {
    // Preserve the original partial writes and continue the bootstrap.
  }
  return rt;
}

/** Attach the complete `/a` loader result, including f.b[S]'s 570 shorts. */
export function withTableA(rt: LegacyRuntimeState, table: AResourceDiagnostic): LegacyRuntimeState {
  rt.withTableAPrefix(table.prefix);
  rt.saveOffsets.set(table.shortTableB);
  rt.sectionOffsets.set(table.shortTableBOffsets);
  return rt;
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
export function initializeOriginalLoop(rt: LegacyRuntimeState): LegacyRuntimeState {
  rt.game.initializeOriginalLoop();
  resetLegacyZI(rt.game);
  return rt;
}
