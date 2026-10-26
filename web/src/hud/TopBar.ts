import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { UNIT_AGE, UNIT_HP, UNIT_JOB_TYPE, UNIT_NAME, UNIT_TYPE } from "../core/DenseLayout";
import { sfx } from "../platform/SoundEffects";
import type { TouchControls } from "../TouchControls";
import type { WideScreen } from "../WideScreen";
import { capitalise, originalText } from "../OriginalText";
import type { HudTooltips } from "./Tooltips";

interface SpeedControl {
  getSpeed(): 1 | 2 | 4;
  cycleSpeed(): 1 | 2 | 4;
}

export interface HudTopBar {
  bar: HTMLDivElement;
  speedButton: HTMLButtonElement;
  idleButton: HTMLButtonElement;
  update(showBar: boolean, showSpeed: boolean, showIdle: boolean, drawResources: boolean): void;
}

export function createHudTopBar(
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
  openRoster: () => void,
  notify: (text: string) => void,
  language: () => "zh" | "id" | "en",
  isChinese: () => boolean,
  button: (className: string, text: string, label?: string) => HTMLButtonElement,
  attachHoverTip: HudTooltips["attachHoverTip"],
  speedControl?: SpeedControl,
): HudTopBar {
  const game = runtime.game;
  const bar = document.createElement("div");
  bar.className = "hud-bar";
  bar.hidden = true;
  bar.innerHTML = '<img class="hud-bar-bg" src="hd/ui/bar-bg.png" alt=""><img class="hud-bar-deco left" src="hd/ui/deco-top-left.png" alt=""><img class="hud-bar-deco right" src="hd/ui/deco-top-right.png" alt="">';
  const counters = ([
    ["people", "人口（点击查看村民名册）", "Populasi (Daftar Penduduk)", "Population (Tap for Villager Roster)"],
    ["food", "食物", "Makanan", "Food"],
    ["wood", "木材", "Kayu", "Wood"],
    ["stone", "石头", "Batu", "Stone"],
    ["bones", "骨头", "Tulang", "Bones"],
  ] as const).map(([icon, nameZh, nameId, nameEn], index) => {
    const group = document.createElement("div");
    group.className = `hud-count ${icon}${index === 0 ? " interactive" : ""}`;
    group.setAttribute("role", index === 0 ? "button" : "img");
    group.innerHTML = `<img src="hd/ui/icon-${icon}.png" alt="">`;
    const digits = document.createElement("span");
    group.append(digits);
    if (index === 0) group.addEventListener("click", openRoster);
    bar.append(group);
    const counter = { group, digits, nameZh, nameId, nameEn, text: "" };
    attachHoverTip(group, () => {
      const currentLanguage = language();
      const name = currentLanguage === "zh" ? counter.nameZh : currentLanguage === "id" ? counter.nameId : counter.nameEn;
      return `${name}: ${counter.text}`;
    }, "bottom");
    return counter;
  });
  const drawCounts = () => {
    const row = runtime.mainArrays.aShort[0];
    const table = runtime.packedOffsets[146] ?? 0;
    const value = (index: number) => row?.[runtime.packedBytes[table + index] ?? 0] ?? 0;
    const texts = [
      `${Math.min(99, value(0))}/${Math.min(99, row?.[16] ?? 0)}`,
      ...[1, 2, 3, 4].map((index) => String(Math.min(999, Math.max(0, value(index))))),
    ];
    counters.forEach((counter, index) => {
      const text = texts[index]!;
      if (text === counter.text) return;
      counter.text = text;
      const currentLanguage = language();
      const name = currentLanguage === "zh" ? counter.nameZh : currentLanguage === "id" ? counter.nameId : counter.nameEn;
      counter.group.setAttribute("aria-label", `${name} ${text}`);
      counter.digits.innerHTML = Array.from(text, (digit) => `<img src="hd/ui/digit-${digit === "/" ? "slash" : digit}.png" alt="">`).join("");
    });
  };

  const speedButton = button("hud-speed-btn", "1x", "Game Speed: 1x");
  speedButton.hidden = true;
  const syncSpeedButton = () => {
    const speed = speedControl?.getSpeed() ?? 1;
    speedButton.textContent = `${speed}x`;
    speedButton.classList.toggle("fast", speed > 1);
    speedButton.classList.toggle("ultra", speed === 4);
    speedButton.setAttribute("aria-label", isChinese() ? `游戏速度：${speed}倍` : `Game Speed: ${speed}x`);
  };
  const toggleGameSpeed = () => {
    if (!speedControl) return;
    const speed = speedControl.cycleSpeed();
    syncSpeedButton();
    notify(isChinese() ? `游戏速度：${speed}x` : `Game Speed: ${speed}x`);
  };
  speedButton.addEventListener("click", toggleGameSpeed);
  window.addEventListener("keydown", (event) => {
    if ((event.key === "f" || event.key === "F" || event.key === "Tab") && game.loopMode === 1 && !screen.frozen && !document.querySelector("dialog[open]")) {
      event.preventDefault();
      sfx.click();
      toggleGameSpeed();
    }
  });

  const idleButton = button("hud-idle-btn", "", "Idle Villagers");
  idleButton.hidden = true;
  idleButton.innerHTML = '<span class="hud-idle-icon">💤</span><span class="hud-idle-count">0</span>';
  const idleCountSpan = idleButton.querySelector<HTMLElement>(".hud-idle-count")!;
  let lastIdleIndex = -1;
  const getIdleVillagers = () => {
    const state = runtime.denseState;
    const results: { id: number; name: string; tile: [number, number] }[] = [];
    for (let id = 1; id <= 50; id += 1) {
      const hp = state[UNIT_HP + id] ?? 0;
      if (hp <= 0) continue;
      const age = state[UNIT_AGE + id] ?? 18;
      const type = state[UNIT_TYPE + id] ?? 69;
      const job = state[UNIT_JOB_TYPE + id] ?? 69;
      const child = type === 17 || age < 12;
      const tile = touch.villagerTile(id);
      if (!child && tile !== null && (type === 69 || type === 83) && job === 69) {
        const name = capitalise(originalText(runtime, "s", 108 + (state[UNIT_NAME + id] ?? 0)));
        results.push({ id, name, tile });
      }
    }
    return results;
  };
  const cycleIdleVillagers = () => {
    if (game.loopMode !== 1 || screen.frozen) return;
    const idleVillagers = getIdleVillagers();
    if (idleVillagers.length === 0) {
      sfx.click();
      notify(isChinese() ? "所有族人均在忙碌工作中！" : "All tribe members are busy working!");
      return;
    }
    lastIdleIndex = (lastIdleIndex + 1) % idleVillagers.length;
    const target = idleVillagers[lastIdleIndex]!;
    sfx.select();
    touch.focus(target.tile[0], target.tile[1]);
    touch.selectVillager(target.id);
    notify(isChinese() ? `定位空闲族人：${target.name} (${lastIdleIndex + 1}/${idleVillagers.length})` : `Selected idle: ${target.name} (${lastIdleIndex + 1}/${idleVillagers.length})`);
  };
  idleButton.addEventListener("click", cycleIdleVillagers);
  window.addEventListener("keydown", (event) => {
    if (document.querySelector("dialog[open]")) return;
    if ((event.key === "." || event.key === "," || event.key === "i" || event.key === "I") && game.loopMode === 1 && !screen.frozen) {
      event.preventDefault();
      cycleIdleVillagers();
    }
  });

  return {
    bar,
    speedButton,
    idleButton,
    update(showBar, showSpeed, showIdle, drawResources) {
      bar.hidden = !showBar;
      speedButton.hidden = !showSpeed;
      idleButton.hidden = !showIdle;
      if (drawResources) drawCounts();
      if (showSpeed) syncSpeedButton();
      if (showIdle) {
        const count = getIdleVillagers().length;
        idleCountSpan.textContent = String(count);
        idleButton.classList.toggle("has-idle", count > 0);
        idleButton.setAttribute("aria-label", isChinese() ? `空闲族人：${count}人（点击轮流定位）` : `Idle villagers: ${count} (Tap to cycle)`);
      }
    },
  };
}
