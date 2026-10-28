export interface HudTooltips {
  attachHoverTip(entry: HTMLElement, name: () => string, position?: "left" | "top" | "bottom"): void;
  longPress(entry: HTMLElement, name: () => string, hold?: () => boolean): () => boolean;
}

export function createHudTooltips(hud: HTMLElement): HudTooltips {
  const tip = document.createElement("div");
  tip.className = "hud-tip";
  tip.hidden = true;
  hud.append(tip);

  const showTooltip = (element: HTMLElement, text: string, position: "left" | "top" | "bottom" = "left") => {
    if (!text) { tip.hidden = true; return; }
    const box = element.getBoundingClientRect();
    const area = hud.getBoundingClientRect();
    tip.textContent = text;
    if (position === "top") {
      tip.style.top = `${box.top - area.top - 8}px`;
      tip.style.left = `${Math.max(140, Math.min(area.width - 140, box.left - area.left + box.width / 2))}px`;
      tip.style.right = "auto";
      tip.style.transform = "translate(-50%, -100%)";
    } else if (position === "bottom") {
      tip.style.top = `${box.bottom - area.top + 8}px`;
      tip.style.left = `${Math.max(80, Math.min(area.width - 80, box.left - area.left + box.width / 2))}px`;
      tip.style.right = "auto";
      tip.style.transform = "translate(-50%, 0)";
    } else {
      tip.style.top = `${box.top - area.top + box.height / 2}px`;
      tip.style.right = `${area.right - box.left + 8}px`;
      tip.style.left = "auto";
      tip.style.transform = "translateY(-50%)";
    }
    tip.hidden = false;
  };
  const hideTooltip = () => { tip.hidden = true; };
  const attachHoverTip = (entry: HTMLElement, name: () => string, position: "left" | "top" | "bottom" = "left") => {
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(hover: none)").matches) return;
    entry.addEventListener("mouseenter", () => {
      const value = name();
      entry.setAttribute("title", value);
      showTooltip(entry, value, position);
    });
    entry.addEventListener("mouseleave", hideTooltip);
  };
  const longPress = (entry: HTMLElement, name: () => string, hold?: () => boolean) => {
    let timer = 0;
    let held = false;
    entry.addEventListener("mouseenter", () => {
      const value = name();
      entry.setAttribute("title", value);
      showTooltip(entry, value, "left");
    });
    entry.addEventListener("mouseleave", hideTooltip);
    entry.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      held = false;
      timer = window.setTimeout(() => {
        held = true;
        if (hold?.()) return;
        showTooltip(entry, name(), "left");
      }, 450);
    });
    const end = () => { window.clearTimeout(timer); hideTooltip(); };
    entry.addEventListener("pointerup", end);
    entry.addEventListener("pointercancel", end);
    entry.addEventListener("pointerleave", end);
    entry.addEventListener("contextmenu", (event) => event.preventDefault());
    return () => held;
  };

  return { attachHoverTip, longPress };
}
