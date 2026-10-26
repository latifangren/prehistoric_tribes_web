// Verifies the lazy language-table contract (branch harden/audit-fixes):
// - a runtime can start with only the selected language slot filled;
// - selectLanguage() for an unfilled slot keeps the current language
//   (its existing guard), never crashes;
// - setLanguageTable() fills a slot, after which selectLanguage()
//   switches to it.
//
// Uses the same vm/transpile loader as verify-ao-wiring.mjs, because
// LegacyRuntimeState's imports are extensionless and Node's
// --experimental-strip-types cannot resolve them directly.
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math });
const cache = new Map();

function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  if (cache.has(absPath)) return cache.get(absPath).exports;
  const module = { exports: {} };
  cache.set(absPath, module);
  const source = fs.readFileSync(absPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (spec) => loadModule(spec, path.dirname(absPath));
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, localRequire);
  return module.exports;
}

const { LegacyRuntimeState } = loadModule("./core/LegacyRuntimeState", srcDir);

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const fakeTable = (id) => ({ s: { id }, t: { id }, d0: { id } });

const rt = new LegacyRuntimeState();
rt.withLanguageTables([fakeTable(0), undefined, undefined, undefined, undefined]);
rt.withLanguageResources(fakeTable(0).s, fakeTable(0).t, fakeTable(0).d0);

// Unfilled slot: guarded, languageResources unchanged.
rt.selectLanguage(1);
assert(rt.language === 1, "selectLanguage records the requested language even when the table is missing");
assert(rt.languageResources.s.id === 0, "unfilled slot must keep the current language resources");

// Fill it, then switching works.
rt.setLanguageTable(1, fakeTable(1));
assert(rt.languageTables[1].s.id === 1, "setLanguageTable must fill the slot");
rt.selectLanguage(1);
assert(rt.languageResources.s.id === 1, "filled slot must become the active language resources");

// Out-of-range fills are ignored, not crashes.
rt.setLanguageTable(5, fakeTable(5));
rt.setLanguageTable(-1, fakeTable(-1));
assert(rt.languageTables.length === 5, "out-of-range fills must not grow the table list");

console.log("verify-language-lazy: ok");
