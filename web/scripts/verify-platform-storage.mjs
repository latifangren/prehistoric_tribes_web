import assert from "node:assert/strict";
import { flushStorage, initializeStorage, readStorage, removeStorage, writeStorage } from "../src/platform/Storage.ts";

const values = new Map([ ["pt.language", "id"] ]);
const writeReleases = [];
const adapter = {
  async getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) {
    return new Promise((resolve) => writeReleases.push(() => { values.set(key, value); resolve(); }));
  },
  removeItem(key) {
    return new Promise((resolve) => writeReleases.push(() => { values.delete(key); resolve(); }));
  },
};

await initializeStorage(adapter);
assert.equal(readStorage("not-in-catalog"), null, "uncatalogued keys cannot trigger synchronous storage reads");
assert.equal(readStorage("pt.language"), "id");
const write = writeStorage("pt.language", "zh");
assert.equal(readStorage("pt.language"), "zh", "writes update the runtime cache immediately");
let flushed = false;
const flush = flushStorage().then(() => { flushed = true; });
await Promise.resolve();
assert.equal(flushed, false, "flush waits for asynchronous adapter writes");
writeReleases.shift()();
assert.equal(await write, true);
await flush;
assert.equal(values.get("pt.language"), "zh");
const remove = removeStorage("pt.language");
assert.equal(readStorage("pt.language"), null, "deletes hide the cached value immediately");
await Promise.resolve();
writeReleases.shift()();
assert.equal(await remove, true);
assert.equal(values.has("pt.language"), false);
console.log("platform storage cache, deferred writes, flush, and delete OK");
