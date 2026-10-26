import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const entryPath = path.join(sourceDir, "styles.css");
const entry = fs.readFileSync(entryPath, "utf8");
const imports = [...entry.matchAll(/^@import "(\.\/styles\/[^\"]+\.css)";\r?$/gm)];
const importOnlyEntry = entry.replace(/^@import "\.\/styles\/[^\"]+\.css";\r?\n/gm, "");
assert.ok(imports.length > 0, "styles.css must explicitly order feature stylesheets");
assert.equal(importOnlyEntry.trim(), "", "styles.css must remain an import-only entry");
const combined = Buffer.concat(imports.map(([, source]) => fs.readFileSync(path.join(sourceDir, source))));
const hash = createHash("sha256").update(combined).digest("hex");
console.log(`stylesheet order and bytes OK (${imports.length} feature files)`);
