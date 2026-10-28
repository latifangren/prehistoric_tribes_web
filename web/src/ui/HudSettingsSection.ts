import { readStorage, writeStorage } from "../platform/Storage";
import type { WideScreen } from "../WideScreen";

export const hudSettingsSectionHtml = `
            <div class="settings-select-row">
              <span data-i18n="hudStyle">HUD Style</span>
              <select name="hudStyle" class="settings-select">
                <option value="floating" data-i18n="hudFloating">Modern Floating Island</option>
                <option value="console" data-i18n="hudConsole">Classic RTS Command Console</option>
              </select>
            </div>
            <div class="settings-select-row">
              <span data-i18n="mapFit">Display Bounds</span>
              <select name="mapFit" class="settings-select">
                <option value="smart" data-i18n="mapFitSmart">Penuhi Layar Penuh (Smart Fit)</option>
                <option value="free" data-i18n="mapFitFree">Bebas (Free Zoom)</option>
              </select>
            </div>`;

export interface HudSettingsSection {
  sync(): void;
  applyI18n(lang: string, setText: (key: string, text: string) => void): void;
}

export function setupHudSettingsSection(
  form: HTMLFormElement,
  app: HTMLElement,
  screen: WideScreen,
): HudSettingsSection {
  const hudStyle = form.elements.namedItem("hudStyle") as HTMLSelectElement;
  const mapFit = form.elements.namedItem("mapFit") as HTMLSelectElement;

  hudStyle.value = readStorage("pt.hudStyle") ?? "floating";
  mapFit.value = readStorage("pt.mapFit") ?? "smart";
  app.setAttribute("data-hud-style", hudStyle.value);

  hudStyle.addEventListener("change", () => {
    app.setAttribute("data-hud-style", hudStyle.value);
    void writeStorage("pt.hudStyle", hudStyle.value);
  });
  mapFit.addEventListener("change", () => {
    screen.setMapFit(mapFit.value as "smart" | "free");
    void writeStorage("pt.mapFit", mapFit.value);
  });

  return {
    sync() {
      hudStyle.value = readStorage("pt.hudStyle") ?? "floating";
      mapFit.value = readStorage("pt.mapFit") ?? "smart";
    },
    applyI18n(lang: string, setText: (key: string, text: string) => void) {
      setText("hudStyle", lang === "zh" ? "界面风格" : lang === "id" ? "Gaya Antarmuka" : "HUD Style");
      setText("hudFloating", lang === "zh" ? "现代浮动岛" : lang === "id" ? "Modern Floating Island" : "Modern Floating Island");
      setText("hudConsole", lang === "zh" ? "经典 RTS 指挥台" : lang === "id" ? "Classic RTS Command Console" : "Classic RTS Command Console");
      setText("mapFit", lang === "zh" ? "显示范围" : lang === "id" ? "Pengisian Layar" : "Display Bounds");
      setText("mapFitSmart", lang === "zh" ? "智能铺满全屏" : lang === "id" ? "Penuhi Layar Penuh (Smart Fit)" : "Fill Screen (Smart Fit)");
      setText("mapFitFree", lang === "zh" ? "自由缩放" : lang === "id" ? "Bebas (Free Zoom)" : "Free (Free Zoom)");
    },
  };
}
