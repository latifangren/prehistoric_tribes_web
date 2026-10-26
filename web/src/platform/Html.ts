/**
 * Small, dependency-free HTML hardening helpers.
 *
 * The game's DOM layer historically built UI with `innerHTML` templates.
 * Most interpolated values are internal constants, numbers, or strings from
 * the original game's own tables -- not free-form user input. That keeps the
 * risk low today, but it is still a fragile surface: one contaminated
 * translation / game-table string would be parsed as markup.
 *
 * Rule going forward:
 * - Text that is meant to be read (names, titles, descriptions, labels)
 *   goes through `escapeHtml` before it enters an `innerHTML` template, or
 *   is assigned via `textContent` instead.
 * - Asset names that become part of an `src` attribute go through
 *   `safeAssetName`, which rejects path separators, `..`, quotes and
 *   anything outside a small allow-list. A rejected name falls back to
 *   `nothing`, the existing placeholder asset name used by the HUD.
 * - Numbers are interpolated only after an explicit `Number(...)` /
 *   integer coercion at the call site, never straight from a table.
 */
export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Alias for attribute contexts; escaping is identical for our templates. */
export const escapeAttr = escapeHtml;

const SAFE_ASSET_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Validate a bare asset file stem (no directory, no extension) for use in
 * an `<img src="...">` template. Sub-directories are handled by the caller
 * (e.g. `words/<lang>/<key>.png` in StartMenu), where each segment must
 * pass this check on its own.
 */
export function safeAssetName(name: string, fallback = "nothing"): string {
  if (name === ".." || name === "." || !SAFE_ASSET_NAME.test(name)) return fallback;
  return name;
}

/** Validate every segment of a relative asset path (no leading `/`, no `..`). */
export function safeAssetPath(path: string, fallback = "nothing.png"): string {
  const segments = path.split("/");
  if (segments.length === 0 || segments.some((segment) => segment === "" || segment === "." || segment === ".." || !SAFE_ASSET_NAME.test(segment))) {
    return fallback;
  }
  return path;
}
