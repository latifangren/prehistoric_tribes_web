/**
 * Pure row/cube helpers, extracted from LegacyRuntimeState.ts
 * (branch harden/audit-fixes, first monolith split).
 *
 * These were the only functions at the bottom of that 2,700-line file
 * with no dependence on the runtime class at all: Java byte narrowing
 * and RMS row/cube copies used by the save system. They live here now;
 * LegacyRuntimeState re-exports them so existing import paths
 * (`../core/LegacyRuntimeState`) keep working unchanged.
 *
 * The rest of LegacyRuntimeState is deliberately NOT split in the same
 * pass: its methods are faithful bytecode ports that read and write the
 * same dense arrays through `this`, and moving them one by one without
 * their verify scripts would just relocate risk. Follow the codebase's
 * existing pattern instead -- extract one function at a time into a
 * Legacy* module, with a verify-*.mjs script for it, as
 * sim/tribe/LegacySubsystem*.ts already does for TribeRuntime.
 */
export function byteGrid(rows: number, columns: number): Int8Array[] {
  return Array.from({ length: rows }, () => new Int8Array(columns));
}

export function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export function copyRows<T extends Int8Array | Int16Array | Int32Array>(
  target: T[], source: readonly T[], count: number,
): void {
  if (source.length < count || target.length < count) throw new RangeError("RMS row count mismatch");
  for (let row = 0; row < count; row += 1) {
    if (target[row].length !== source[row].length) throw new RangeError("RMS row length mismatch");
    target[row].set(source[row]);
  }
}

export function cloneRows<T extends Int8Array | Int16Array | Int32Array>(
  source: readonly T[], count: number,
): T[] {
  return source.slice(0, count).map((row) => new (row.constructor as { new (values: ArrayLike<number>): T })(row));
}

export function copyCube(
  target: readonly Int8Array[][],
  source: readonly (readonly Int8Array[])[],
  depth: number,
): void {
  if (target.length < depth || source.length < depth) throw new RangeError("RMS cube depth mismatch");
  for (let layer = 0; layer < depth; layer += 1) copyRows(target[layer], source[layer], source[layer].length);
}

export function cloneCube(
  source: readonly Int8Array[][],
  depth: number,
): Int8Array[][] {
  return source.slice(0, depth).map((layer) => layer.map((row) => new Int8Array(row)));
}

export function boolLayers2x3x96(): boolean[][][] {
  return Array.from({ length: 2 }, () =>
    Array.from({ length: 3 }, () => Array.from({ length: 96 }, () => false)),
  );
}
