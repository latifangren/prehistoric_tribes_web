import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { T_BUILDING } from "../core/DataTables";
import { escapeHtml } from "../platform/Html";
import { capitalise, originalText } from "../OriginalText";
import type { WideScreen } from "../WideScreen";
import { BUILDING_DESCRIPTIONS, BUILDING_ICONS, BUILDING_NAMES_ID } from "./BuildingCatalog";

export interface BuildListController {
  element: HTMLDivElement;
  pageDots: HTMLDivElement;
  draw(): void;
}

export function drawPageDots(list: HTMLElement, dots: HTMLElement, count: number, step: number): void {
  const perPage = Math.max(1, Math.floor(list.clientWidth / step));
  const pages = Math.ceil(count / perPage);
  const page = Math.round(list.scrollLeft / (perPage * step));
  if (dots.childElementCount !== pages) dots.replaceChildren(...Array.from({ length: pages }, () => document.createElement("i")));
  Array.from(dots.children).forEach((dot, index) => dot.classList.toggle("on", index === page));
}

export function createBuildList(
  sheet: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: Pick<WideScreen, "buildKinds">,
  language: () => "zh" | "id" | "en",
  createButton: (className: string, text: string, label?: string) => HTMLButtonElement,
  pickInBar: (index: number) => void,
  attachHoverTip: (entry: HTMLElement, name: () => string, pos?: "left" | "top" | "bottom") => void,
): BuildListController {
  const element = document.createElement("div");
  element.className = "hud-sheet-list";
  const pageDots = document.createElement("div");
  pageDots.className = "hud-sheet-dots";
  const previous = createButton("hud-sheet-nav prev", "◀", "Previous Buildings");
  const next = createButton("hud-sheet-nav next", "▶", "Next Buildings");
  previous.addEventListener("click", () => element.scrollBy({ left: -260, behavior: "smooth" }));
  next.addEventListener("click", () => element.scrollBy({ left: 260, behavior: "smooth" }));
  sheet.append(element, pageDots, previous, next);
  element.addEventListener("wheel", (event) => {
    if (event.deltaY !== 0 || event.deltaX !== 0) {
      event.preventDefault();
      element.scrollLeft += (event.deltaY || event.deltaX) * 1.5;
    }
  }, { passive: false });

  const price = (kind: number) => {
    const table = runtime.packedOffsets[T_BUILDING] ?? 0;
    return [10, 11, 12].map((row) => runtime.packedBytes[table + row * 26 + kind] ?? 0);
  };
  const resources = ["wood", "stone", "bones"];
  let shownKinds = "";
  let shownCosts = "";
  const image = (name: string, className = "") => `<img${className ? ` class="${escapeHtml(className)}"` : ""} src="hd/ui/${name}.png" alt="">`;
  const draw = () => {
    const kinds = screen.buildKinds();
    const key = kinds.join(",");
    if (key !== shownKinds) {
      shownKinds = key;
      shownCosts = "";
      element.scrollLeft = 0;
      element.replaceChildren(...kinds.map((kind, index) => {
        const entry = document.createElement("button");
        entry.type = "button";
        entry.className = "hud-card";
        const currentLanguage = language();
        const name = currentLanguage === "id" ? (BUILDING_NAMES_ID[kind] ?? capitalise(originalText(runtime, "s", kind))) : capitalise(originalText(runtime, "s", kind));
        const description = BUILDING_DESCRIPTIONS[currentLanguage][kind];
        entry.setAttribute("aria-label", name);
        entry.setAttribute("title", `${name}\n${description}`);
        entry.dataset.kind = String(kind);
        entry.innerHTML = `<span class="pic">${image(`ub-${BUILDING_ICONS[kind]}`)}</span><span class="cost"></span><span class="hud-card-name">${escapeHtml(name)}</span>`;
        entry.addEventListener("click", () => pickInBar(index));
        attachHoverTip(entry, () => `${name} — ${description}`, "top");
        return entry;
      }));
    }
    const costs = kinds.map((kind) => price(kind).join("/")).join(",");
    if (costs !== shownCosts) {
      shownCosts = costs;
      for (const entry of Array.from(element.children) as HTMLElement[]) {
        const need = price(Number(entry.dataset.kind));
        entry.querySelector(".cost")!.innerHTML = need
          .map((amount, index) => (amount > 0 ? `<span>${image(`icon-${resources[index]}`)}<span class="n">${Array.from(String(amount), (digit) => image(`digit-${digit}`)).join("")}</span></span>` : ""))
          .join("");
      }
    }
    drawPageDots(element, pageDots, kinds.length, 97);
    const maxScroll = element.scrollWidth - element.clientWidth - 4;
    previous.classList.toggle("disabled", element.scrollLeft <= 4);
    next.classList.toggle("disabled", element.scrollLeft >= maxScroll);
  };
  element.addEventListener("scroll", draw);

  return { element, pageDots, draw };
}
