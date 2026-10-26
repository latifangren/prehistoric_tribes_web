import { loadDelimitedResource, type DelimitedTable } from "./platform/DelimitedResource";
import { ImagePack } from "./platform/ImagePack";
import { diagnoseTableA, loadMaResource, type AResourceDiagnostic, type MaResource } from "./platform/BinaryResource";
import { loadMidiResource, type MidiResource } from "./platform/Audio";
import { loadPackedData, type PackedData } from "./platform/PackedData";

export type OriginalResources = {
  readonly pi0: ImagePack;
  readonly pi9: ImagePack;
  readonly pi8: ImagePack;
  readonly languageS: DelimitedTable;
  readonly languageT: DelimitedTable;
  readonly languageD0: DelimitedTable;
  /**
   * The five original language table sets, in JAR language index order.
   * Boot loads only the selected set (see loadOriginalResources); the
   * other slots start undefined and are filled in the background by
   * main.ts, so a Q14 language switch before that fill simply keeps the
   * current language (selectLanguage's existing guard) instead of
   * crashing. Total tables are only ~40 KB each, so this is about
   * cutting the initial fetch burst (15 -> 3 files), not bytes.
   */
  readonly languageTables: readonly (OriginalLanguageResources | undefined)[];
  readonly ma: MaResource;
  readonly tableA: AResourceDiagnostic;
  readonly sa: MidiResource;
  readonly pd0: PackedData;
};

export type OriginalLanguageResources = {
  readonly language: number;
  readonly s: DelimitedTable;
  readonly t: DelimitedTable;
  readonly d0: DelimitedTable;
};

/** Loads only resources whose bytecode-level formats are currently confirmed. */
export async function loadOriginalResources(language = 0, version = "0.1.28"): Promise<OriginalResources> {
  if (!Number.isInteger(language) || language < 0 || language >= 5) {
    throw new RangeError(`Original language index ${language} is outside 0..4`);
  }
  // Boot used to fetch all five language sets (15 files) before the first
  // frame. Only the selected set is needed to answer the start-up
  // questions; the rest are preloaded in the background by main.ts once
  // the loop is running, via loadLanguageTables + setLanguageTable.
  const selected = await loadLanguageTables(language, version);
  const languageTables: (OriginalLanguageResources | undefined)[] = [undefined, undefined, undefined, undefined, undefined];
  languageTables[language] = selected;
  const [pi0, pi9, pi8, ma, tableA, sa, pd0] = await Promise.all([
    ImagePack.load("assets/packs/pi0", 31),
    ImagePack.load("assets/packs/pi9", 6),
    ImagePack.load("assets/packs/pi8", 12),
    loadMaResource(),
    diagnoseTableA(),
    loadMidiResource(),
    loadPackedData(),
  ]);
  return {
    pi0,
    pi9,
    pi8,
    languageS: selected.s,
    languageT: selected.t,
    languageD0: selected.d0,
    languageTables,
    ma,
    tableA,
    sa,
    pd0,
  };
}

export async function loadLanguageTables(language: number, version: string): Promise<OriginalLanguageResources> {
  const root = `assets/lang/${language}`;
  const [s, t, d0] = await Promise.all([
    loadDelimitedResource(`${root}/s`, version),
    loadDelimitedResource(`${root}/t`, version),
    loadDelimitedResource(`${root}/d0`, version),
  ]);
  return { language, s, t, d0 };
}
