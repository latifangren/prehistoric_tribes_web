import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { denseRequire } from "./dense-layout-require.mjs";

const file = fileURLToPath(new URL("../src/sim/world/LegacyRecordAllocator.ts", import.meta.url));
const module = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math },
);
const { allocateLegacyRecord } = module.exports;

// 1. Verify baseline carry capacity allocation (scaled from legacy 2..3 to 4..5)
const state = new Int8Array(9983);
const counters = Array.from({ length: 2 }, () => new Int16Array(26));
const map = Array.from({ length: 50 }, () => new Int8Array(50));
const input1 = {
  state,
  counters,
  map,
  packedBytes: new Int8Array(100),
  packedOffsets: new Int16Array(100),
  randomRemainder: (mask, divisor) => 1,
  frameFlag: false,
  q: 0,
  aw: 0,
  suppressCounters: true,
};
const id1 = allocateLegacyRecord(input1, 0, 10, 10, 69, 0);
assert.equal(id1, 1, "first allocated unit must have id 1");

// UNIT_CARRY_CAPACITY = 3737
const cap1 = state[3737 + id1];
assert.ok(cap1 >= 4 && cap1 <= 5, `carry capacity must allocate 4 or 5, got ${cap1}`);

// 2. Verify min capacity allocation when randomRemainder returns 0
const input2 = {
  ...input1,
  randomRemainder: () => 0,
};
const id2 = allocateLegacyRecord(input2, 0, 12, 12, 69, 0);
assert.equal(id2, 2, "second allocated unit must have id 2");
const cap2 = state[3737 + id2];
assert.equal(cap2, 4, `minimum carry capacity must be 4, got ${cap2}`);

console.log("verify-gameplay-balance passed: capacity allocated =", cap1, "and", cap2);
