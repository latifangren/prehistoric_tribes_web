import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import type { PauseItem, TouchControls } from "../TouchControls";
import type { WideScreen } from "../WideScreen";
import { originalText } from "../OriginalText";
import { createHelpDialog } from "./HelpDialog";
import type { HudTooltips } from "./Tooltips";

export interface HudPauseMenu {
  menuButton: HTMLButtonElement;
  menuList: HTMLDivElement;
  menuShade: HTMLDivElement;
  openHelp(): void;
  update(layoutVisible: boolean, choosing: boolean): boolean;
}

export function createHudPauseMenu(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
  button: (className: string, text: string, label?: string) => HTMLButtonElement,
  language: () => "zh" | "id" | "en",
  openSettings: () => void,
  notify: (text: string) => void,
  attachHoverTip: HudTooltips["attachHoverTip"],
  openAchievements?: () => void,
  openRecap?: () => void,
): HudPauseMenu {
  const game = runtime.game;
  const menuButton = button("hud-menu-button", "", "Game Menu");
  menuButton.innerHTML = '<img class="up" src="hd/ui/plate-normal.png" alt=""><img class="down" src="hd/ui/plate-pressed.png" alt=""><img class="glyph" src="hd/ui/glyph-menu.png" alt="">';
  const menuList = document.createElement("div");
  menuList.className = "hud-menu";
  menuList.hidden = true;
  const menuShade = document.createElement("div");
  menuShade.className = "hud-menu-shade";
  menuShade.hidden = true;
  const inPauseMenu = () => game.screen === 10 || game.screen === 11;
  let paused = false;
  let help: "no" | "asked" | "shown" = "no";
  let stillIsMine = false;
  const confirmBox = document.createElement("dialog");
  confirmBox.className = "settings confirm";
  confirmBox.innerHTML = '<form method="dialog"><p></p><div class="confirm-buttons"><button value="no" data-btn="no">Cancel</button><button value="yes" data-btn="yes">Confirm</button></div></form>';
  confirmBox.addEventListener("keydown", (event) => event.stopPropagation());
  app.append(confirmBox);
  const pause = () => {
    paused = true;
    stillIsMine = true;
    screen.freeze();
    touch.openPause();
  };
  const resume = () => {
    paused = false;
    menuList.hidden = true;
    if (inPauseMenu()) touch.pauseMenu("resume");
  };
  menuButton.addEventListener("click", () => (paused ? resume() : pause()));
  const ask = (text: string, then: () => void) => {
    const currentLanguage = language();
    confirmBox.querySelector("p")!.textContent = text;
    confirmBox.querySelector<HTMLElement>('[data-btn="no"]')!.textContent = currentLanguage === "zh" ? "取消" : currentLanguage === "id" ? "Batal" : "Cancel";
    confirmBox.querySelector<HTMLElement>('[data-btn="yes"]')!.textContent = currentLanguage === "zh" ? "确定" : currentLanguage === "id" ? "Konfirmasi" : "Confirm";
    confirmBox.returnValue = "no";
    confirmBox.onclose = () => { if (confirmBox.returnValue === "yes") then(); };
    confirmBox.showModal();
  };
  document.addEventListener("pointerdown", (event) => {
    const target = event.target as Node;
    if (paused && !menuList.hidden && !menuList.contains(target) && target !== menuButton && !confirmBox.open && !document.querySelector("dialog[open]")) resume();
  });

  const run = (item: PauseItem) => touch.pauseMenu(item, (record) => notify(originalText(runtime, "t", record)));
  const message = (record: number) => {
    if (language() === "id") {
      if (record === 63) return "Muat simpanan permainan ini?";
      if (record === 64) return "Simpanan saat ini akan ditimpa! Lanjutkan?";
      if (record === 65) return "Kembali ke menu utama? Kemajuan yang belum disimpan akan hilang.";
    }
    return originalText(runtime, "t", record);
  };
  const openHelp = createHelpDialog(app, runtime);
  const menuItems: { label: () => string; glyph: string; act: () => void; enabled?: () => boolean }[] = [
    { label: () => { const currentLanguage = language(); return currentLanguage === "zh" ? "保存" : currentLanguage === "id" ? "Simpan" : "Save"; }, glyph: "save", act: () => (game.screen === 10 ? ask(message(64), () => run("save")) : run("save")) },
    { label: () => { const currentLanguage = language(); return currentLanguage === "zh" ? "读取" : currentLanguage === "id" ? "Muat" : "Load"; }, glyph: "load", enabled: () => game.screen === 10, act: () => ask(message(63), () => { paused = false; menuList.hidden = true; run("load"); }) },
    { label: () => { const currentLanguage = language(); return currentLanguage === "zh" ? "战绩" : currentLanguage === "id" ? "Statistik" : "Stats"; }, glyph: "stats", act: () => { if (openRecap) openRecap(); } },
    { label: () => { const currentLanguage = language(); return currentLanguage === "zh" ? "成就" : currentLanguage === "id" ? "Trofi" : "Trophies"; }, glyph: "trophy", act: () => { if (openAchievements) openAchievements(); } },
    { label: () => { const currentLanguage = language(); return currentLanguage === "zh" ? "设置" : currentLanguage === "id" ? "Pengaturan" : "Settings"; }, glyph: "settings", act: openSettings },
    { label: () => { const currentLanguage = language(); return currentLanguage === "zh" ? "帮助" : currentLanguage === "id" ? "Panduan" : "Help"; }, glyph: "help", act: openHelp },
    { label: () => { const currentLanguage = language(); return currentLanguage === "zh" ? "退出" : currentLanguage === "id" ? "Keluar" : "Quit"; }, glyph: "quit", act: () => ask(message(65), () => { paused = false; menuList.hidden = true; run("quit"); }) },
  ];
  const menuEntries = menuItems.map((item) => {
    const entry = button("hud-menu-item", "", item.label());
    const glyphHtml = item.glyph === "trophy"
      ? '<span class="glyph hud-glyph-trophy">🏆</span>'
      : item.glyph === "stats"
      ? '<span class="glyph hud-glyph-trophy">📊</span>'
      : `<img class="glyph" src="hd/ui/glyph-${item.glyph}.png" alt="">`;
    entry.innerHTML = `<img class="up" src="hd/ui/plate-normal.png" alt=""><img class="down" src="hd/ui/plate-pressed.png" alt="">${glyphHtml}`;
    entry.addEventListener("click", item.act);
    attachHoverTip(entry, () => item.label(), "left");
    menuList.append(entry);
    return { entry, item };
  });
  attachHoverTip(menuButton, () => {
    const currentLanguage = language();
    return currentLanguage === "zh" ? "游戏菜单" : currentLanguage === "id" ? "Menu Permainan" : "Game Menu";
  }, "left");

  return {
    menuButton,
    menuList,
    menuShade,
    openHelp,
    update(layoutVisible, choosing) {
      if (paused && game.loopMode === 1 && !touch.busy) paused = false;
      if (help === "asked" && !inPauseMenu()) help = "shown";
      if (help === "shown" && inPauseMenu()) { help = "no"; screen.frozen = true; }
      if (stillIsMine && !paused && (game.loopMode === 1 || ![10, 11, 16, 21].includes(game.screen))) {
        screen.frozen = false;
        stillIsMine = false;
      }
      menuButton.hidden = !((layoutVisible || paused) && !choosing);
      menuList.hidden = !(paused && inPauseMenu() && help === "no");
      menuShade.hidden = menuList.hidden;
      menuButton.classList.toggle("open", paused);
      for (const { entry, item } of menuEntries) entry.disabled = item.enabled ? !item.enabled() : false;
      return paused;
    },
  };
}
