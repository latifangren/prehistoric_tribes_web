import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { OriginalKey } from "../platform/Input";
import { haptic } from "../platform/Haptic";
import type { TouchControls } from "../TouchControls";
import { tribeTactics } from "../combat/TribeTactics";

export interface RightThumbControls {
  cmdButton: HTMLButtonElement;
  squadBox: HTMLDivElement;
  closeCommands(): void;
  closePop(): void;
  drawCommands(): void;
  radialActions: readonly { glyph: string; label(): string; act(): void }[];
  drawSquads(): void;
}

interface Options {
  hud: HTMLElement;
  runtime: LegacyRuntimeState;
  touch: TouchControls;
  modals: { openMinimap(): void; openRoster(): void };
  language(): "zh" | "id" | "en";
  isChinese(): boolean;
  notify(text: string): void;
  startOrder(glyph: string, running: boolean, codes: number[]): void;
  updateAttackMoveBanner(): void;
  button(className: string, text: string, label?: string): HTMLButtonElement;
  image(name: string, className?: string): string;
  attachHoverTip(entry: HTMLElement, name: () => string, pos?: "left" | "top" | "bottom"): void;
  longPress(entry: HTMLElement, name: () => string, hold?: () => boolean): () => boolean;
}

export function createRightThumbControls(options: Options): RightThumbControls {
  const { hud, runtime, touch, modals, language, isChinese, notify, startOrder, updateAttackMoveBanner, button, image, attachHoverTip, longPress } = options;
  const game = runtime.game;
  const cmdButton = button("hud-cmd", "", "Commands");
  cmdButton.innerHTML = image("cmd-plate") + image("cmd-horn", "glyph") + image("cmd-arms", "badge");
  attachHoverTip(cmdButton, () => (language() === "zh" ? "战术指令" : language() === "id" ? "Perintah Suku" : "Commands"), "left");
  const cmdShade = document.createElement("div");
  cmdShade.className = "hud-cmd-shade";
  cmdShade.hidden = true;
  const cmdMenu = document.createElement("div");
  cmdMenu.className = "hud-cmd-menu";
  cmdMenu.hidden = true;
  const closeCommands = () => { cmdMenu.hidden = true; cmdShade.hidden = true; };
  cmdButton.addEventListener("click", () => { cmdMenu.hidden = !cmdMenu.hidden; cmdShade.hidden = cmdMenu.hidden; });
  cmdShade.addEventListener("click", closeCommands);

  const commands = [
    { glyph: "cmd-arms", name: () => (game.callToArmsActive ? (isChinese() ? "回去干活" : "Back to Work") : (isChinese() ? "全员备战" : "Call to Arms")), active: () => game.callToArmsActive, act: () => startOrder("cmd-arms", game.callToArmsActive, [12, 15]) },
    { glyph: "cmd-rally", name: () => (game.formUpActive ? (isChinese() ? "解散" : "Dismiss") : (isChinese() ? "集结" : "Form Up")), active: () => game.formUpActive, act: () => startOrder("cmd-rally", game.formUpActive, [11, 14]) },
    {
      glyph: "spear",
      name: () => {
        const currentLanguage = language();
        if (tribeTactics.isAttackMoveActive()) {
          return currentLanguage === "zh" ? "取消进攻移动" : currentLanguage === "id" ? "Batal Serang" : "Cancel A-Move";
        }
        return currentLanguage === "zh" ? "进攻移动 (T)" : currentLanguage === "id" ? "Gerak Tempur (T)" : "Attack-Move (T)";
      },
      active: () => tribeTactics.isAttackMoveActive(),
      act: () => {
        const on = tribeTactics.toggleAttackMove();
        updateAttackMoveBanner();
        haptic.tap();
        const currentLanguage = language();
        notify(on
          ? currentLanguage === "zh" ? "⚔️ 进攻移动已激活 [T]：点击地图目标挺进" : currentLanguage === "id" ? "⚔️ Gerak Tempur Aktif [T]: Ketuk peta untuk maju" : "⚔️ Attack-Move Active [T]: Tap map tile to march"
          : currentLanguage === "zh" ? "已取消进攻移动" : currentLanguage === "id" ? "Gerak tempur dibatalkan" : "Attack-Move cancelled");
      },
    },
    { glyph: "cmd-map", name: () => (isChinese() ? "小地图" : "Minimap"), active: () => false, act: () => modals.openMinimap() },
    { glyph: "pt-man", name: () => (isChinese() ? "村民名册" : "Villager Roster"), active: () => false, act: () => modals.openRoster() },
  ].map((command, index) => {
    const entry = button("hud-cmd-item", "", command.name());
    entry.innerHTML = image("cmd-plate") + image(command.glyph, "glyph");
    entry.style.setProperty("--i", String(index));
    entry.addEventListener("click", () => { closeCommands(); command.act(); });
    attachHoverTip(entry, () => command.name(), "left");
    cmdMenu.append(entry);
    return { entry, command };
  });
  const radialActions = [commands[2]!.command, commands[0]!.command, commands[1]!.command, commands[3]!.command, commands[4]!.command].map((c) => ({ glyph: c.glyph, label: c.name, act: () => { closeCommands(); c.act(); } }));
  const drawCommands = () => {
    const running = game.callToArmsActive ? "cmd-arms" : game.formUpActive ? "cmd-rally" : "";
    cmdButton.classList.toggle("lit", running !== "");
    const badge = cmdButton.querySelector<HTMLImageElement>(".badge")!;
    badge.hidden = running === "";
    if (running && !badge.src.endsWith(`${running}.png`)) badge.src = `hd/ui/${running}.png`;
    for (const { entry, command } of commands) {
      entry.setAttribute("aria-label", command.name());
      entry.classList.toggle("active", command.active());
      entry.classList.toggle("is-cancel", command.active());
    }
  };

  const squads = [{ row: 2, key: OriginalKey.DIGIT_7 }, { row: 3, key: OriginalKey.DIGIT_9 }];
  type Squad = (typeof squads)[number];
  const squadCount = (row: number) => {
    const members = runtime.mainArrays.aByte[row];
    let count = 0;
    for (let index = 0; index < 50; index += 1) if ((members?.[index] ?? 0) !== 0) count += 1;
    return count;
  };
  const store = (squad: Squad) => touch.pressKey(squad.key, 5);
  const squadBox = document.createElement("div"); squadBox.className = "hud-squads";
  const squadPop = document.createElement("div"); squadPop.className = "hud-squad-pop"; squadPop.hidden = true;
  const replaceButton = button("hud-squad-action", "", "Replace squad with selection"); replaceButton.innerHTML = image("cmd-replace");
  const disbandButton = button("hud-squad-action", "", "Disband squad"); disbandButton.innerHTML = image("cmd-disband");
  let popFor: Squad | null = null;
  const closePop = () => { squadPop.hidden = true; popFor = null; };
  replaceButton.addEventListener("click", () => { if (popFor) store(popFor); closePop(); });
  disbandButton.addEventListener("click", () => {
    if (popFor) {
      runtime.mainArrays.aByte[popFor.row]?.fill(0);
      if (game.selectionGroup === popFor.row) touch.closeBars();
    }
    closePop();
  });
  document.addEventListener("pointerdown", (event) => {
    const target = event.target as Node;
    if (!squadPop.hidden && !squadPop.contains(target) && !squadBox.contains(target)) closePop();
  });
  const squadChips = squads.map((squad, index) => {
    const chip = button("hud-squad", "", `Squad ${index + 1}`);
    chip.innerHTML = `${image("pt-man", "head")}<span class="count"></span>`;
    const held = longPress(chip, () => (isChinese() ? `小队${index + 1}` : `Squad ${index + 1}`), () => {
      popFor = squad;
      replaceButton.hidden = game.barMode !== 1;
      const box = chip.getBoundingClientRect();
      const area = hud.getBoundingClientRect();
      squadPop.style.top = `${box.top - area.top + box.height / 2}px`;
      squadPop.style.right = `${area.right - box.left + 8}px`;
      squadPop.hidden = false;
      return true;
    });
    chip.addEventListener("click", () => { if (!held()) touch.pressKey(squad.key); });
    squadBox.append(chip);
    return { chip, squad, count: chip.querySelector<HTMLElement>(".count")!, shown: "" };
  });
  const plusChip = button("hud-squad plus", "", "Save selection as squad");
  plusChip.innerHTML = `${image("pt-man", "head")}<b>+</b>`;
  plusChip.addEventListener("click", () => {
    const free = squads.find((squad) => squadCount(squad.row) === 0);
    if (free && game.barMode === 1) store(free);
  });
  squadBox.append(plusChip);
  const drawSquads = () => {
    for (const entry of squadChips) {
      const count = squadCount(entry.squad.row);
      entry.chip.hidden = count === 0;
      entry.chip.classList.toggle("active", game.selectionGroup === entry.squad.row);
      entry.chip.classList.toggle("held", popFor === entry.squad);
      const text = String(count);
      if (text !== entry.shown) { entry.shown = text; entry.count.innerHTML = Array.from(text, (digit) => image(`digit-${digit}`)).join(""); }
    }
    plusChip.hidden = !(game.barMode === 1 && squads.some((squad) => squadCount(squad.row) === 0));
  };

  hud.append(cmdShade, squadBox, squadPop, cmdMenu, cmdButton);
  return { cmdButton, squadBox, closeCommands, closePop, drawCommands, radialActions, drawSquads };
}
