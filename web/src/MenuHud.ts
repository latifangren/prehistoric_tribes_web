import { readStorage } from "./platform/Storage";
import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { OriginalKey } from "./platform/Input";
import { sfx } from "./platform/SoundEffects";
import { ID_LANGUAGE, ZH_LANGUAGE } from "./text/LegacyZhText";
import type { TouchControls } from "./TouchControls";
import type { WideScreen } from "./WideScreen";

/**
 * The original's menus off the map (phase 3, user 2026-10-17; not in the original): ✓ / ✗ at the
 * parchment's lower corners, only where a screen needs them: ✓ on a yes / no question (Q 16), ✗
 * (back) on the other menus, the help pages and the map. They are the left / right soft keys; the
 * frame's own corner icons are covered (WideScreen.menuFrame). The main menu and its submenus are
 * StartMenu's own pages since round 4; the toggles moved there.
 */

export function attachMenuHud(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
): { update(): void } {
  const game = runtime.game;
  const layer = document.createElement("div");
  layer.className = "menu-hud";
  app.append(layer);
  const button = (className: string, label: string) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.setAttribute("aria-label", label);
    element.hidden = true; // until the first update()
    element.addEventListener("pointerdown", () => sfx.click());
    layer.append(element);
    return element;
  };

  const yes = button("menu-corner yes", "Confirm");
  const back = button("menu-corner back", "Back");
  yes.textContent = "✓";
  back.textContent = "✕";
  touch.bindKey(yes, OriginalKey.SOFT_LEFT);
  touch.bindKey(back, OriginalKey.SOFT_RIGHT);

  /** The parchment's lower corners (the menu box spans x 18..222, its bottom edge y 197). */
  const place = (element: HTMLElement, x: number) => {
    const point = screen.frameToCss(x, 197);
    element.style.left = `${point.x}px`;
    element.style.top = `${point.y}px`;
  };

  function update(): void {
    const zh = runtime.language === ZH_LANGUAGE;
    const isId = readStorage("pt.language") === "id";
    yes.setAttribute("aria-label", zh ? "确定" : isId ? "Konfirmasi" : "Confirm");
    back.setAttribute("aria-label", zh ? "返回" : isId ? "Kembali" : "Back");
    const offMap = game.loopMode !== 1 && !screen.frozen;
    const menu = runtime.touchMenuQ === game.screen && runtime.touchMenuRows.length > 0;
    const isStats = game.screen === 15 && game.mByte === 2;
    yes.hidden = !(offMap && (game.screen === 16 || game.screen === 19));
    back.hidden = !(offMap && !isStats && game.screen !== 0 && game.screen !== 14 && (menu || [15, 16, 19].includes(game.screen)));
    place(yes, 22);
    place(back, 218);
  }

  return { update };
}
