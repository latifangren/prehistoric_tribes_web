import { touchAction } from "../render/RenderRuntime";
import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { T_BUILDING } from "../core/DataTables";
import { RES_KIND, UNIT_HOME_X, UNIT_HOME_Y, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_X, UNIT_Y } from "../core/DenseLayout";
import { OriginalKey } from "../platform/Input";
import { sfx } from "../platform/SoundEffects";
import type { TouchControls } from "../TouchControls";
import type { WideScreen } from "../WideScreen";
import { hdArt } from "../render/HdArt";

import { getActiveBuildKind, setActiveBuildKind } from "./BuildList";

export interface HudPlacementOverlay {
  setPickIcon(name: string): void;
  track(lastTouch: number, picking: boolean, pickTarget: number, orderMarkHidden: boolean): void;
}

export function createHudPlacementOverlay(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
  button: (className: string, text: string, label?: string) => HTMLButtonElement,
  image: (name: string, className?: string) => string,
): HudPlacementOverlay {
  const game = runtime.game;
  let lastBarMode = -1;
  const marker = document.createElement("img");
  marker.className = "hud-pick-marker";
  marker.alt = "";
  marker.hidden = true;
  app.append(marker);

  const ghost = document.createElement("div");
  ghost.className = "hud-ghost";
  ghost.hidden = true;
  ghost.innerHTML = '<i class="patch"><span class="door-indicator"></span></i><img alt="" draggable="false">';
  const ghostPatch = ghost.querySelector<HTMLElement>(".patch")!;
  const doorIndicator = ghost.querySelector<HTMLElement>(".door-indicator")!;
  const ghostPicture = ghost.querySelector<HTMLImageElement>("img")!;
  const placeTick = button("hud-place", "", "Place Building");
  placeTick.innerHTML = image("btn-tick");
  placeTick.hidden = true;
  app.append(ghost, placeTick);
  placeTick.addEventListener("click", () => { if (game.cRFlag) { sfx.build(); touch.pressKey(OriginalKey.FIRE); } });

  const action = document.createElement("img");
  action.className = "hud-action-icon";
  action.alt = "";
  action.hidden = true;
  app.append(action);

  const placedKind = (site: number) => {
    const table = runtime.packedOffsets[T_BUILDING] ?? 0;
    for (let kind = 0; kind < 12; kind += 1) if ((runtime.packedBytes[table + 416 + kind] ?? -1) === site) return kind;
    return -1;
  };
  const jobIcon = (id: number): { icon: number; tx: number; ty: number } | null => {
    const state = runtime.denseState;
    if ((state[UNIT_TYPE + id] ?? 0) === 17) return null;
    const cell = (x: number, y: number) => runtime.gridC[y]?.[x] ?? 0;
    const tx = state[UNIT_TARGET_X + id] ?? 0;
    const ty = state[UNIT_TARGET_Y + id] ?? 0;
    const target = cell(tx, ty);
    if (target >= 101 && target <= 122) return { icon: 43, tx, ty };
    const hx = state[UNIT_HOME_X + id] ?? 0;
    const hy = state[UNIT_HOME_Y + id] ?? 0;
    const home = cell(hx, hy);
    if (home === -124) return { icon: 44, tx: hx, ty: hy };
    if (home === -125) return { icon: 45, tx: hx, ty: hy };
    if (home <= -61 && home >= -110) return { icon: (state[RES_KIND - (home + 61)] ?? 0) === 7 ? 46 : 43, tx: hx, ty: hy };
    const away = (state[UNIT_X + id] ?? 0) !== hx || (state[UNIT_Y + id] ?? 0) !== hy;
    if (home === 0 && away && touch.villagerTile(id)) return { icon: 35, tx: hx, ty: hy };
    return null;
  };

  return {
    setPickIcon(name) {
      marker.src = `hd/ui/${name}.png`;
      marker.width = 40;
      marker.height = 40;
    },
    track(lastTouch, picking, pickTarget, orderMarkHidden) {
      const onMap = screen.touchPlay && game.loopMode === 1 && game.barMode === 1 && !screen.frozen;
      const recent = performance.now() - lastTouch < 800;
      const flash = recent && onMap ? touchAction.icon : 0;
      const job = !flash && onMap && screen.villagerSheet ? jobIcon(game.selectedId) : null;
      const icon = flash || job?.icon || 0;
      action.hidden = icon === 0;
      if (icon) {
        const frames = icon === 35 ? 5 : 1;
        const src = `hd/effects/${icon}-${frames > 1 ? Math.floor(performance.now() / 150) % frames : 0}.png`;
        if (!action.src.endsWith(src)) action.src = src;
        const at = job ? screen.tileToCss(job.tx, job.ty) : screen.tileToCss(game.cameraColumn + game.cursorColumn, game.cameraRow + game.cursorRow);
        const tile = screen.tileToCss(1, 1).x - screen.tileToCss(0, 0).x;
        const size = tile * 1.4;
        Object.assign(action.style, { left: `${at.x + tile / 2 - size / 2}px`, top: `${at.y + (tile * 16) / 22 / 2 - size / 2}px`, width: `${size}px`, height: `${size}px` });
      }

      const target = picking && pickTarget > 0 ? touch.villagerTile(pickTarget) : null;
      marker.hidden = !target || screen.frozen;
      if (target) {
        const head = screen.tileToCss(target[0], target[1]);
        const tile = screen.tileToCss(1, 1).x - screen.tileToCss(0, 0).x;
        marker.style.left = `${head.x + tile / 2}px`;
        marker.style.top = `${head.y - tile * 0.35}px`;
      }
      if (!orderMarkHidden) {
        const [tx, ty] = screen.centreTile();
        if (tx !== game.cameraColumn + game.cursorColumn || ty !== game.cameraRow + game.cursorRow) touch.aim(tx, ty);
      }
      if (lastBarMode === 3 && game.barMode !== 3) setActiveBuildKind(-1);
      lastBarMode = game.barMode;
      const activeKind = getActiveBuildKind();
      const area = touch.footprint();
      const isTrap = game.cSInt >= 20 && game.cSInt <= 22;
      const kind = area ? (isTrap ? game.cSInt : (activeKind >= 0 ? activeKind : placedKind(game.cSInt))) : -1;
      if (!area || kind < 0 || screen.frozen || picking || !orderMarkHidden) { placeTick.hidden = true; ghost.hidden = true; return; }
      const from = screen.tileToCss(area.column, area.row);
      const to = screen.tileToCss(area.column + area.columns, area.row + area.rows);
      const blocked = !game.cRFlag;
      ghost.classList.toggle("blocked", blocked);
      placeTick.classList.toggle("blocked", blocked);
      placeTick.setAttribute("aria-disabled", String(blocked));
      Object.assign(ghostPatch.style, { left: `${from.x}px`, top: `${from.y}px`, width: `${to.x - from.x}px`, height: `${to.y - from.y}px` });
      const trapName = game.cSInt === 20 ? "net-trap" : game.cSInt === 21 ? "spring-trap" : "pit-trap";
      const src = isTrap ? `hd/ui/${trapName}.png` : `hd/buildings/${kind}-1.png`;
      if (!ghostPicture.src.endsWith(src)) ghostPicture.src = src;
      const cssPerGame = (screen.tileToCss(1, 0).x - screen.tileToCss(0, 0).x) / 22;
      const scale = isTrap ? 1 : hdArt.scale(runtime);
      const width = isTrap ? 26 * cssPerGame : (ghostPicture.naturalWidth / scale) * cssPerGame;
      const height = isTrap ? 26 * cssPerGame : (ghostPicture.naturalHeight / scale) * cssPerGame;
      const left = (from.x + to.x) / 2 - width / 2;
      const top = to.y - height;
      Object.assign(ghostPicture.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
      if (doorIndicator) {
        const l = typeof localStorage !== "undefined" ? localStorage.getItem("pt.language") : "id";
        doorIndicator.textContent = isTrap ? "" : (l === "zh" ? "▼ 正门" : l === "en" ? "▼ Front" : "▼ Depan");
        doorIndicator.hidden = isTrap;
      }
      ghost.hidden = false;
      const tickSize = 40;
      const viewportWidth = screen.element.clientWidth;
      placeTick.style.left = `${Math.max(4, Math.min(viewportWidth - tickSize - 4, left + width - tickSize / 2))}px`;
      placeTick.style.top = `${Math.max(4, top - tickSize / 2)}px`;
      placeTick.hidden = false;
    },
  };
}
