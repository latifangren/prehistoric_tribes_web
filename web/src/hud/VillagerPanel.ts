import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { UNIT_ENERGY, UNIT_FOOD, UNIT_HELD_ITEM, UNIT_HP, UNIT_MAX_HP, UNIT_NAME } from "../core/DenseLayout";
import { oldArt } from "../platform/OldArt";
import { drawPageDots } from "./BuildList";

interface Options {
  sheet: HTMLElement;
  pageDots: HTMLElement;
  runtime: LegacyRuntimeState;
  image(name: string, className?: string): string;
  digits(text: string): string;
  label(record: number): string;
  portrait(id: number, kind: number): string;
  panelIcons: Record<number, string>;
  onChoose(id: number): void;
  onInspect(id: number): void;
}

export interface VillagerPanel {
  villagerBox: HTMLDivElement;
  groupRow: HTMLDivElement;
  drawVillager(id: number, cells: LegacyRuntimeState["villagerPanelDraft"]): void;
  drawGroup(ids: number[], choosing: boolean): void;
  resetVillager(): void;
  resetGroup(): void;
}

const SKILLS: Record<number, string> = {
  561: "basket", 562: "basket-wood", 563: "basket-meat", 564: "basket-ice", 565: "basket-stone", 566: "basket-mushroom",
  567: "basket-bone", 568: "hammer", 569: "chef", 570: "horseshoe", 571: "mask", 572: "hardhat", 573: "bush", 574: "spark",
  575: "spear", 576: "eyes",
};
const WEAPON_BASE = 659;
const MOOD_BASE = 674;

export function createVillagerPanel(options: Options): VillagerPanel {
  const { sheet, pageDots, runtime, image, digits, label, portrait, panelIcons, onChoose, onInspect } = options;
  const villagerBox = document.createElement("div");
  villagerBox.className = "hud-villager";
  const groupRow = document.createElement("div");
  groupRow.className = "hud-sheet-row hud-group";
  sheet.append(villagerBox, groupRow);
  const statBar = (icon: string, part: number, number = "") =>
    `<span class="hud-stat">${image(icon)}<span class="hud-meter"><i style="width:${Math.round(Math.max(0, Math.min(1, part)) * 100)}%"></i></span>${number ? `<span class="n">${digits(number)}</span>` : ""}</span>`;
  const cell = (icon: string, number = "", className = "") => `<span class="hud-cell ${className}">${icon ? image(icon) : ""}${number ? `<span class="n">${digits(number)}</span>` : ""}</span>`;
  let shownVillager = "";
  const drawVillager = (id: number, cells: LegacyRuntimeState["villagerPanelDraft"]) => {
    const state = runtime.denseState;
    const key = `${id}:${cells.map((cell) => `${cell.asset}${cell.text}@${cell.x},${cell.y}`).join(" ")}:${state[UNIT_HP + id]}:${state[UNIT_FOOD + id]}:${state[UNIT_ENERGY + id]}`;
    if (key === shownVillager) return;
    shownVillager = key;
    const textAt = (x: number, y: number) => cells.find((cell) => cell.asset < 0 && Math.abs(cell.x - x) <= 3 && Math.abs(cell.y - y) <= 3)?.text ?? "";
    const asset = (test: (asset: number) => boolean) => cells.find((cell) => cell.asset >= 0 && test(cell.asset));
    const gender = asset((value) => value === 619 || value === 620);
    const mood = asset((value) => value > MOOD_BASE && value <= MOOD_BASE + 5);
    const rest = asset((value) => value === 560 || value === 577);
    const weapon = asset((value) => value >= WEAPON_BASE && value < WEAPON_BASE + 9);
    const pouch = asset((value) => value >= 625 && value <= 629);
    const skills = cells
      .filter((cell) => cell.asset < 0 && cell.x >= 160)
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((skill) => {
        const icon = cells.find((candidate) => candidate.asset >= 0 && Math.abs(candidate.y - skill.y) <= 1 && skill.x - candidate.x >= 10 && skill.x - candidate.x <= 20);
        const base = icon ? (icon.asset >= 577 ? icon.asset - 17 : icon.asset) : -1;
        if (icon && !SKILLS[base]) oldArt.note("村民面板 技能", `组合图 ${icon.asset}`);
        return cell(icon ? `sk-${SKILLS[base] ?? "z"}` : "sk-legs", skill.text, icon && icon.asset >= 577 ? "lit" : "");
      });
    const age = gender ? textAt(gender.x + 24, gender.y + 1) : "";
    const carried = pouch ? textAt(pouch.x + 15, pouch.y) : "";
    const maxHp = Math.max(1, state[UNIT_MAX_HP + id] ?? 1);
    const row = (...items: string[]) => `<span class="hud-row">${items.join("")}</span>`;
    villagerBox.innerHTML = `${image(portrait(id, -1), "face")}<span class="hud-cols">
      <span class="hud-col">${row(cell(gender?.asset === 619 ? "male" : "female", age))}${row(cell(mood ? `mood-${MOOD_BASE + 6 - mood.asset}` : ""), rest ? cell("zzz", "", rest.asset === 577 ? "lit" : "faint") : "")}${row(cell(weapon ? panelIcons[weapon.asset - WEAPON_BASE] ?? "empty-hand" : "empty-hand"), cell("pouch", carried, pouch && pouch.asset !== 625 ? "" : "faint"))}</span>
      <span class="hud-col bars">${statBar("heart", (state[UNIT_HP + id] ?? 0) / maxHp, String(state[UNIT_HP + id] ?? 0))}${statBar("hunger", (state[UNIT_FOOD + id] ?? 0) / 99)}${statBar("sleep", (state[UNIT_ENERGY + id] ?? 0) / 99)}</span>
      <span class="hud-col skills">${skills.join("")}</span></span>`;
  };
  let shownGroup = "";
  const drawGroup = (ids: number[], choosing: boolean) => {
    const state = runtime.denseState;
    const key = `${choosing ? "chief:" : "group:"}${ids.map((id) => `${id}:${state[UNIT_HELD_ITEM + id]}`).join(",")}`;
    if (key === shownGroup) return;
    shownGroup = key;
    groupRow.replaceChildren(...ids.map((id) => {
      const entry = document.createElement("button");
      entry.type = "button";
      entry.className = "hud-item hud-member";
      entry.setAttribute("aria-label", label(108 + (state[UNIT_NAME + id] ?? 0)));
      const held = state[UNIT_HELD_ITEM + id] ?? 9;
      entry.innerHTML = `${image(portrait(id, -1))}${image(panelIcons[held] && held < 9 ? panelIcons[held]! : "empty-hand", "weapon")}`;
      entry.addEventListener("click", () => choosing ? onChoose(id) : onInspect(id));
      return entry;
    }));
  };
  groupRow.addEventListener("scroll", () => drawPageDots(groupRow, pageDots, groupRow.childElementCount, 66));
  return {
    villagerBox,
    groupRow,
    drawVillager,
    drawGroup,
    resetVillager() { shownVillager = ""; },
    resetGroup() { shownGroup = ""; },
  };
}
