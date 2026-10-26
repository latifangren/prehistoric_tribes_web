import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = path.resolve(webDir, "..");
const baselinePath = path.join(webDir, "scripts/size-baseline.json");
const effectiveLimit = 800;
const physicalLimit = 1000;
const trackedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".html"]);

function sourceFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile() && trackedExtensions.has(path.extname(entry.name))) files.push(fullPath);
    }
  };
  visit(root);
  return files;
}

function countLines(file) {
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r\n|\n|\r/);
  if (lines.at(-1) === "") lines.pop();
  let effective = 0;
  let blockComment = false;
  const extension = path.extname(file);
  const blockStart = extension === ".html" ? "<!--" : "/*";
  const blockEnd = extension === ".html" ? "-->" : "*/";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (blockComment) {
      if (trimmed.includes(blockEnd)) blockComment = false;
      continue;
    }
    if (trimmed.startsWith(blockStart)) {
      if (!trimmed.includes(blockEnd, blockStart.length)) blockComment = true;
      continue;
    }
    if (extension !== ".css" && extension !== ".html" && trimmed.startsWith("//")) continue;
    effective += 1;
  }

  return { effective, physical: lines.length };
}

function allCounts() {
  const files = new Map();
  for (const root of [path.join(webDir, "src"), path.join(webDir, "scripts")]) {
    for (const file of sourceFiles(root)) {
      const relative = path.relative(repoDir, file).split(path.sep).join("/");
      files.set(relative, countLines(file));
    }
  }
  return files;
}

function baselineTemplate(counts) {
  return {
    effectiveLimit,
    physicalLimit,
    physicalExceptions: {
      "web/src/core/LegacyGameState.ts": "Legacy bytecode field catalog; preserve its documented physical-line exception.",
    },
    files: Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b))),
  };
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) throw new Error(`Missing size baseline: ${path.relative(repoDir, baselinePath)}`);
  return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
}

function main() {
  const args = process.argv.slice(2);
  const initialize = args.includes("--initialize");
  const compareIndex = args.indexOf("--compare-ref");
  const compareRef = compareIndex >= 0 ? args[compareIndex + 1] : null;
  if (compareIndex >= 0 && !compareRef) throw new Error("--compare-ref requires a git ref");

  const counts = allCounts();
  if (initialize) {
    if (fs.existsSync(baselinePath)) throw new Error("Refusing to replace an existing baseline; lower ceilings explicitly after accepted phases.");
    fs.writeFileSync(baselinePath, `${JSON.stringify(baselineTemplate(counts), null, 2)}\n`);
    console.log(`Initialized ${counts.size} file ceilings in ${path.relative(repoDir, baselinePath)}.`);
    return;
  }

  const baseline = loadBaseline();
  const failures = [];
  const baselineFiles = baseline.files ?? {};
  for (const [file, measured] of counts) {
    const ceiling = baselineFiles[file];
    const maxEffective = ceiling?.effective ?? effectiveLimit;
    const isPhysicalException = Object.hasOwn(baseline.physicalExceptions ?? {}, file);
    const maxPhysical = ceiling?.physical ?? (isPhysicalException ? physicalLimit : physicalLimit - 1);
    if (measured.effective > maxEffective || measured.physical > maxPhysical) {
      failures.push(`${file}: effective ${measured.effective}/${maxEffective}, physical ${measured.physical}/${maxPhysical}`);
    }
  }
  for (const file of Object.keys(baselineFiles)) {
    if (!counts.has(file)) failures.push(`${file}: stale baseline entry; remove it after accepting the deletion.`);
  }

  if (compareRef) {
    let previous = null;
    try {
      previous = JSON.parse(execFileSync("git", ["show", `${compareRef}:web/scripts/size-baseline.json`], { cwd: repoDir, encoding: "utf8" }));
    } catch {
      console.log(`No previous size baseline at ${compareRef}; accepting the initial ratchet after current-file checks.`);
    }
    if (previous) {
      for (const [file, ceiling] of Object.entries(baselineFiles)) {
        const prior = previous.files?.[file];
        if (!prior) {
          if (ceiling.effective > effectiveLimit || ceiling.physical >= physicalLimit) failures.push(`${file}: new baseline ceiling exceeds final limits.`);
        } else if (ceiling.effective > prior.effective || ceiling.physical > prior.physical) {
          failures.push(`${file}: ceiling increased from ${prior.effective}/${prior.physical} to ${ceiling.effective}/${ceiling.physical}.`);
        }
      }
    }
  }

  if (failures.length) {
    console.error(`File size gate failed (${failures.length} issue(s)):\n${failures.join("\n")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`File size gate passed for ${counts.size} files.`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
