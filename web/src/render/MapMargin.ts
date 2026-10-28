import type { LegacyOffscreenImage } from "./LegacyOffscreenTargets";
import type { WideWindow } from "./WideView";

/**
 * The border around the map (docs/map-edge-margin.md, user 2026-10-26; not in the original): the
 * view may go MARGIN_TILES past each edge, so a finger can reach the edge tiles; that band shows
 * scenery -- the HD map's trees, bushes and rocks on grass, picked per tile so it never changes --
 * under a grey veil that says it cannot be entered. Only drawn: the map and its logic are as before.
 */
export const MARGIN_TILES = 4;

const TILE_W = 22;
const TILE_H = 16;
const GROUND = "#4b6a2a";
const VEIL = "rgba(70, 70, 70, 0.55)";
// HD map objects (web/public/hd/objects): palms and broadleaf trees, bushes, a rock.
const TREES = [1034, 1035, 1036, 1039, 1040, 1043, 1044, 1046, 1047, 1049, 1050, 1053, 1054, 1057, 1058, 1061, 1062, 1063, 1066, 1068, 1072, 1077];
const BUSHES = [1027, 1028, 1029, 1084];
const ROCK = 1097;

const pictures = new Map<number, HTMLImageElement>();
const picture = (id: number) => {
  let image = pictures.get(id);
  if (!image) { image = new Image(); image.src = `hd/objects/${id}.png`; pictures.set(id, image); }
  return image;
};

/** A fixed pseudo-random number 0..n-1 for tile (x, y). */
const pick = (x: number, y: number, n: number, salt = 0) => {
  let h = Math.imul(x + 1013, 73856093) ^ Math.imul(y + 2029, 19349663) ^ Math.imul(salt + 7, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) % n;
};

/** Draws the border's part of `window` onto the wide view's `image` (game coordinates, the HD scale
 *  `k`: an object's picture is k times its size on the map). */
export function drawMapMargin(image: LegacyOffscreenImage, window: WideWindow, mapWidth: number, mapHeight: number, k: number): void {
  const context = image.element.getContext("2d");
  if (!context) return;
  const left = -MARGIN_TILES, top = -MARGIN_TILES, right = mapWidth + MARGIN_TILES, bottom = mapHeight + MARGIN_TILES;
  const from = { column: Math.max(window.column, left), row: Math.max(window.row, top) };
  const to = { column: Math.min(window.column + window.columns, right), row: Math.min(window.row + window.rows, bottom) };
  if (from.column >= to.column || from.row >= to.row) return;
  const x = (column: number) => 11 + (column - window.column) * TILE_W;
  const y = (row: number) => 8 + (row - window.row) * TILE_H;
  if (window.column >= 0 && window.row >= 0 && window.column + window.columns <= mapWidth && window.row + window.rows <= mapHeight) return;
  context.save();
  // Only the band: the border's outer rectangle minus the map.
  context.beginPath();
  context.rect(x(left), y(top), (right - left) * TILE_W, (bottom - top) * TILE_H);
  context.rect(x(0), y(0), mapWidth * TILE_W, mapHeight * TILE_H);
  context.clip("evenodd");
  context.fillStyle = GROUND;
  context.fillRect(x(from.column), y(from.row), (to.column - from.column) * TILE_W, (to.row - from.row) * TILE_H);
  // Row by row, so nearer things stand in front.
  for (let row = from.row; row < to.row; row += 1) {
    for (let column = from.column; column < to.column; column += 1) {
      if (column >= 0 && column < mapWidth && row >= 0 && row < mapHeight) continue;
      const roll = pick(column, row, 20);
      const id = roll < 13 ? TREES[pick(column, row, TREES.length, 1)]! : roll < 18 ? BUSHES[pick(column, row, BUSHES.length, 2)]! : ROCK;
      const art = picture(id);
      if (!art.complete || art.naturalWidth === 0) continue;
      const objectScale = art.naturalWidth > 150 ? 4 : 1;
      const w = art.naturalWidth / (k * objectScale), h = art.naturalHeight / (k * objectScale);
      context.drawImage(art, x(column) + TILE_W / 2 - w / 2 + (pick(column, row, 7, 3) - 3), y(row) + TILE_H - h, w, h);
    }
  }
  const [CLEAR_V, EDGE, CLEAR_E] = ["rgba(70, 70, 70, 0)", "rgba(0, 0, 0, 0.18)", "rgba(0, 0, 0, 0)"];
  const [vl, vt, vr, vb] = [x(from.column), y(from.row), x(to.column), y(to.row)];
  const grad = (x0: number, y0: number, x1: number, y1: number, c0: string, c1: string, l: number, t: number, r: number, b: number) => {
    if (l >= r || t >= b) return;
    const g = context.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    context.fillStyle = g; context.fillRect(l, t, r - l, b - t);
  };
  grad(0, y(top), 0, y(0), VEIL, CLEAR_V, vl, Math.max(vt, y(top)), vr, Math.min(vb, y(0)));
  grad(0, y(mapHeight), 0, y(bottom), CLEAR_V, VEIL, vl, Math.max(vt, y(mapHeight)), vr, Math.min(vb, y(bottom)));
  grad(x(left), 0, x(0), 0, VEIL, CLEAR_V, Math.max(vl, x(left)), vt, Math.min(vr, x(0)), vb);
  grad(x(mapWidth), 0, x(right), 0, CLEAR_V, VEIL, Math.max(vl, x(mapWidth)), vt, Math.min(vr, x(right)), vb);
  context.restore();
  grad(0, y(0), 0, y(1), EDGE, CLEAR_E, x(0), y(0), x(mapWidth), y(1));
  grad(0, y(mapHeight - 1), 0, y(mapHeight), CLEAR_E, EDGE, x(0), y(mapHeight - 1), x(mapWidth), y(mapHeight));
  grad(x(0), 0, x(1), 0, EDGE, CLEAR_E, x(0), y(0), x(1), y(mapHeight));
  grad(x(mapWidth - 1), 0, x(mapWidth), 0, CLEAR_E, EDGE, x(mapWidth - 1), y(0), x(mapWidth), y(mapHeight));
}
