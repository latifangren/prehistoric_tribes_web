import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { getMasterVolume, isSfxEnabled, setMasterVolume, setSfxEnabled, sfx } from "./platform/SoundEffects";
import { isAmbienceEnabled, setAmbienceEnabled } from "./audio/AtmosphereAudio";
import { weatherSystem } from "./render/WeatherSystem";
import {
  ALL_STORAGE_KEYS,
  canSaveCurrentMatch,
  deleteSaveSlot,
  formatSlotTitle,
  readSaveSlot,
  saveToSlot,
  stageSlotForLoad,
  type SaveSlotIndex,
} from "./save/SaveSlotManager";
import { ID_LANGUAGE, ZH_LANGUAGE } from "./text/LegacyZhText";
import type { TouchControls } from "./TouchControls";
import { stepAs } from "./ui/UiRuntime";
import type { WideScreen } from "./WideScreen";

const ZOOM_KEY = "pt.zoomOut";

function readZoom(): number {
  try {
    return Math.max(0, Number(localStorage.getItem(ZOOM_KEY)) || 0);
  } catch {
    return 0;
  }
}

/** Adds the settings & multi-slot save panel; returns the function that opens it. */
export function attachSettings(
  app: HTMLElement,
  screen: WideScreen,
  runtime: LegacyRuntimeState,
  touch?: TouchControls,
): () => void {
  screen.zoomOut = readZoom();
  const game = runtime.game;

  const dialog = document.createElement("dialog");
  dialog.className = "settings";
  dialog.innerHTML = `
    <form method="dialog">
      <h2 data-i18n="title">Settings</h2>
      <div class="settings-switches">
        <label class="switch"><input type="checkbox" name="music"> <span data-i18n="music">Music</span></label>
        <label class="switch"><input type="checkbox" name="sfx"> <span data-i18n="sfx">Sound Effects</span></label>
        <label class="switch"><input type="checkbox" name="ambience"> <span data-i18n="ambience">Ambience & Drums</span></label>
        <label class="switch"><input type="checkbox" name="weather"> <span data-i18n="weather">Weather & Seasons</span></label>
        <label class="switch"><input type="checkbox" name="hints"> <span data-i18n="hints">Hints</span></label>
      </div>
      <label><span data-i18n="volume">Audio Volume</span>
        <input type="range" name="volume" min="0" max="100" step="5">
      </label>
      <output name="volumeText"></output>
      <label><span data-i18n="overhead">Overhead Info</span>
        <select name="info">
          <option value="0" data-i18n="infoAll">All Villagers</option>
          <option value="1" data-i18n="infoSelected">Selected Villager</option>
          <option value="2" data-i18n="infoNone">Hidden (Show When Hurt)</option>
        </select>
      </label>
      <label><span data-i18n="zoom">Camera Zoom</span>
        <input type="range" name="zoom" min="0" step="1">
      </label>
      <output name="zoomText"></output>
      <div class="settings-save-box">
        <span class="settings-save-title" data-i18n="slotsTitle">Save Slots (Multi-Slot Manager)</span>
        <div class="settings-slots-list" data-slots></div>
        <div class="settings-save-actions">
          <button type="button" class="settings-sub-btn" data-act="unlock" data-i18n="unlockAll">Unlock All</button>
          <button type="button" class="settings-sub-btn" data-act="export" data-i18n="exportSave">Export JSON</button>
          <button type="button" class="settings-sub-btn" data-act="import" data-i18n="importSave">Import JSON</button>
        </div>
        <input type="file" name="importFile" accept="application/json,.json" hidden>
        <small class="settings-save-status" data-status></small>
      </div>
      <button type="submit" data-i18n="done">Done</button>
    </form>`;
  const form = dialog.querySelector("form")!;
  const slider = form.elements.namedItem("zoom") as HTMLInputElement;
  const text = form.elements.namedItem("zoomText") as HTMLOutputElement;
  const volumeSlider = form.elements.namedItem("volume") as HTMLInputElement;
  const volumeText = form.elements.namedItem("volumeText") as HTMLOutputElement;
  const music = form.elements.namedItem("music") as HTMLInputElement;
  const sfxToggle = form.elements.namedItem("sfx") as HTMLInputElement;
  const ambienceToggle = form.elements.namedItem("ambience") as HTMLInputElement;
  const weatherToggle = form.elements.namedItem("weather") as HTMLInputElement;
  const hints = form.elements.namedItem("hints") as HTMLInputElement;
  const info = form.elements.namedItem("info") as HTMLSelectElement;
  const fileInput = form.elements.namedItem("importFile") as HTMLInputElement;
  const statusEl = dialog.querySelector<HTMLElement>("[data-status]")!;
  const slotsBox = dialog.querySelector<HTMLElement>("[data-slots]")!;

  const toggle = (row: number) => {
    const cursor = game.Z;
    game.Z = row;
    stepAs(runtime);
    game.Z = cursor;
    runtime.saveOriginalResourceAction(0);
  };
  music.addEventListener("change", () => {
    sfx.click();
    if (music.checked !== (game.eByte !== 0)) toggle(1);
    try { localStorage.setItem("pt.music", game.eByte !== 0 ? "on" : "off"); } catch { /* ignore */ }
  });
  sfxToggle.addEventListener("change", () => {
    setSfxEnabled(sfxToggle.checked);
    if (sfxToggle.checked) sfx.click();
  });
  ambienceToggle.addEventListener("change", () => {
    sfx.click();
    setAmbienceEnabled(ambienceToggle.checked);
  });
  weatherToggle.addEventListener("change", () => {
    sfx.click();
    weatherSystem.setEnabled(weatherToggle.checked);
  });
  hints.addEventListener("change", () => {
    sfx.click();
    if (hints.checked !== (game.lInt !== 0)) toggle(3);
  });
  info.addEventListener("change", () => {
    sfx.click();
    game.frameLayoutAq = Number(info.value);
  });

  const setText = (key: string, value: string) => {
    const el = dialog.querySelector<HTMLElement>(`[data-i18n="${key}"]`);
    if (el) el.textContent = value;
  };

  const setStatus = (msg: string) => {
    statusEl.textContent = msg;
  };

  const renderSlots = () => {
    const zh = runtime.language === ZH_LANGUAGE;
    const canSave = canSaveCurrentMatch(runtime);
    const slots: SaveSlotIndex[] = [1, 2, 3];
    slotsBox.innerHTML = slots.map((slotIdx) => {
      const snap = readSaveSlot(slotIdx);
      if (!snap) {
        return `
          <div class="settings-slot-row empty">
            <div class="slot-info">
              <b>${zh ? `存档槽 ${slotIdx}` : `Slot ${slotIdx}`}</b>
              <span>${zh ? "空槽位" : "Empty Slot"}</span>
            </div>
            <div class="slot-btns">
              ${canSave ? `<button type="button" class="slot-btn save" data-slot-save="${slotIdx}">${zh ? "保存" : "Save"}</button>` : ""}
            </div>
          </div>
        `;
      }
      const title = formatSlotTitle(runtime, snap);
      const dateStr = new Date(snap.savedAt).toLocaleString(zh ? "zh-CN" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `
        <div class="settings-slot-row">
          <div class="slot-info">
            <b>${zh ? `槽位 ${slotIdx}` : `Slot ${slotIdx}`} · ${title}</b>
            <span>👥 ${snap.pop}/${snap.maxPop} · 🍖 ${snap.food} · 🪵 ${snap.wood} · 🪨 ${snap.stone} · ${dateStr}</span>
          </div>
          <div class="slot-btns">
            ${canSave ? `<button type="button" class="slot-btn save" data-slot-save="${slotIdx}">${zh ? "覆盖" : "Save"}</button>` : ""}
            <button type="button" class="slot-btn load" data-slot-load="${slotIdx}">${zh ? "读取" : "Load"}</button>
            <button type="button" class="slot-btn del" data-slot-del="${slotIdx}" aria-label="${zh ? "删除" : "Delete"}">✕</button>
          </div>
        </div>
      `;
    }).join("");

    for (const btn of Array.from(slotsBox.querySelectorAll<HTMLButtonElement>("[data-slot-save]"))) {
      btn.addEventListener("click", () => {
        const slotIdx = Number(btn.dataset.slotSave) as SaveSlotIndex;
        const saved = saveToSlot(runtime, slotIdx);
        if (saved) {
          sfx.build();
          renderSlots();
          setStatus(zh ? `✓ 已保存到槽位 ${slotIdx}` : `✓ Saved to Slot ${slotIdx}`);
        } else {
          setStatus(zh ? "✕ 当前状态无法保存" : "✕ Cannot save right now");
        }
      });
    }

    for (const btn of Array.from(slotsBox.querySelectorAll<HTMLButtonElement>("[data-slot-load]"))) {
      btn.addEventListener("click", () => {
        const slotIdx = Number(btn.dataset.slotLoad) as SaveSlotIndex;
        const staged = stageSlotForLoad(runtime, slotIdx);
        if (!staged) {
          setStatus(zh ? "✕ 存档槽读取失败" : "✕ Failed to load slot");
          return;
        }
        sfx.order();
        dialog.close();
        if (game.screen === 10 || game.screen === 11) {
          game.screen = 10;
          game.H = true;
          touch?.pauseMenu("load");
        } else if (game.screen === 0 && touch) {
          touch.startGame({
            custom: staged.isCustom,
            resume: true,
            difficulty: staged.difficulty === 2 ? 2 : 1,
            map: Math.max(0, staged.mission - 7),
          });
        } else {
          const rmsSlot = staged.isCustom ? 2 : 1;
          runtime.loadGameplayFromStore(rmsSlot);
          game.loopMode = 1;
          game.screen = 28;
          game.AFlag = true;
          screen.frozen = false;
        }
      });
    }

    for (const btn of Array.from(slotsBox.querySelectorAll<HTMLButtonElement>("[data-slot-del]"))) {
      btn.addEventListener("click", () => {
        const slotIdx = Number(btn.dataset.slotDel) as SaveSlotIndex;
        deleteSaveSlot(slotIdx);
        sfx.click();
        renderSlots();
        const lang = runtime.language === ZH_LANGUAGE ? "zh" : (typeof localStorage !== "undefined" && localStorage.getItem("pt.language") === "id" ? "id" : "en");
        setStatus(lang === "zh" ? `已清空槽位 ${slotIdx}` : lang === "id" ? `Slot ${slotIdx} dikosongkan` : `Cleared Slot ${slotIdx}`);
      });
    }
  };

  const show = () => {
    const lang = runtime.language === ZH_LANGUAGE ? "zh" : (typeof localStorage !== "undefined" && localStorage.getItem("pt.language") === "id" ? "id" : "en");
    setText("title", lang === "zh" ? "设置与存档" : lang === "id" ? "Pengaturan & Penyimpanan" : "Settings & Saves");
    setText("music", lang === "zh" ? "背景音乐" : lang === "id" ? "Musik Latar" : "Music");
    setText("sfx", lang === "zh" ? "游戏音效" : lang === "id" ? "Efek Suara (SFX)" : "Sound Effects");
    setText("ambience", lang === "zh" ? "自然风声与战鼓" : lang === "id" ? "Suara Alam & Drum Perang" : "Nature Ambience & Drums");
    setText("weather", lang === "zh" ? "动态天气与四季" : lang === "id" ? "Cuaca Dinamis & Musim" : "Dynamic Weather & Seasons");
    setText("hints", lang === "zh" ? "新手提示" : lang === "id" ? "Petunjuk & Bantuan" : "Hints");
    setText("volume", lang === "zh" ? "音量大小" : lang === "id" ? "Volume Suara" : "Audio Volume");
    setText("overhead", lang === "zh" ? "头顶信息" : lang === "id" ? "Status Kepala Unit" : "Overhead Info");
    setText("infoAll", lang === "zh" ? "全部村民" : lang === "id" ? "Semua Penduduk" : "All Villagers");
    setText("infoSelected", lang === "zh" ? "选中的村民" : lang === "id" ? "Penduduk Terpilih" : "Selected Villager");
    setText("infoNone", lang === "zh" ? "不显示（受伤时显示）" : lang === "id" ? "Sembunyikan (Tampil Saat Terluka)" : "Hidden (Show When Hurt)");
    setText("zoom", lang === "zh" ? "视野大小（支持双指/滚轮缩放）" : lang === "id" ? "Zoom Kamera (Cubit / Roda Mouse)" : "Camera Zoom (Pinch / Scroll Wheel)");
    setText("slotsTitle", lang === "zh" ? "多槽位存档管理（槽位 1–3）" : lang === "id" ? "Manajer Slot Simpanan (Slot 1–3)" : "Save Slots (Slots 1–3)");
    setText("unlockAll", lang === "zh" ? "解锁全章节" : lang === "id" ? "Buka Semua Bab" : "Unlock All");
    setText("exportSave", lang === "zh" ? "导出备份" : lang === "id" ? "Ekspor JSON" : "Export JSON");
    setText("importSave", lang === "zh" ? "导入备份" : lang === "id" ? "Impor JSON" : "Import JSON");
    setText("done", lang === "zh" ? "完成" : lang === "id" ? "Selesai" : "Done");
    music.checked = game.eByte !== 0;
    sfxToggle.checked = isSfxEnabled();
    ambienceToggle.checked = isAmbienceEnabled();
    weatherToggle.checked = weatherSystem.isEnabled();
    hints.checked = game.lInt !== 0;
    info.value = String(game.frameLayoutAq);

    const volPct = Math.round(getMasterVolume() * 100);
    volumeSlider.value = String(volPct);
    volumeText.value = `${volPct}%`;

    const levels = screen.zoomLevels();
    slider.max = String(levels.length - 1);
    slider.value = String(Math.min(screen.zoomOut, levels.length - 1));
    const view = screen.viewTiles(levels[Number(slider.value)]!);
    text.value = lang === "zh"
      ? `可见约 ${view.columns} × ${view.rows} 格（${levels.length} 档）`
      : lang === "id"
      ? `Terlihat ~${view.columns} × ${view.rows} petak (${levels.length} tingkat)`
      : `Visible: ~${view.columns} × ${view.rows} tiles (${levels.length} levels)`;

    renderSlots();
  };

  volumeSlider.addEventListener("input", () => {
    const pct = Number(volumeSlider.value);
    setMasterVolume(pct / 100);
    volumeText.value = `${pct}%`;
  });

  slider.addEventListener("input", () => {
    screen.zoomOut = Number(slider.value);
    try { localStorage.setItem(ZOOM_KEY, slider.value); } catch { /* not saved */ }
    show();
  });

  dialog.querySelector('[data-act="unlock"]')?.addEventListener("click", () => {
    sfx.click();
    game.progressR = 4;
    game.progressV = 8;
    game.numericAf = true;
    runtime.saveOriginalResourceAction(0);
    const lang = runtime.language === ZH_LANGUAGE ? "zh" : (typeof localStorage !== "undefined" && localStorage.getItem("pt.language") === "id" ? "id" : "en");
    setStatus(lang === "zh" ? "✓ 已解锁全部 5 个战役章节与自定义模式" : lang === "id" ? "✓ Berhasil membuka semua 5 bab kampanye & mode kustom" : "✓ Unlocked all 5 Campaign chapters & Custom Mode");
  });

  dialog.querySelector('[data-act="export"]')?.addEventListener("click", () => {
    sfx.click();
    const payload: Record<string, string> = {};
    for (const key of ALL_STORAGE_KEYS) {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) payload[key] = val;
      } catch { /* ignore */ }
    }
    const blob = new Blob([JSON.stringify({ app: "PrehistoricTribesWeb", version: 2, data: payload }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prehistoric-tribes-save.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus(runtime.language === ZH_LANGUAGE ? "✓ 存档已导出为 JSON 文件" : "✓ Save backup exported");
  });

  dialog.querySelector('[data-act="import"]')?.addEventListener("click", () => {
    sfx.click();
    fileInput.value = "";
    fileInput.click();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as { data?: Record<string, string> };
      const data = parsed.data ?? (parsed as unknown as Record<string, string>);
      let count = 0;
      for (const key of ALL_STORAGE_KEYS) {
        if (typeof data[key] === "string") {
          localStorage.setItem(key, data[key]!);
          count += 1;
        }
      }
      if (count > 0) {
        runtime.loadProgressFromStore();
        runtime.loadOriginalStartupStores();
        screen.zoomOut = readZoom();
        show();
        sfx.build();
        setStatus(runtime.language === ZH_LANGUAGE ? "✓ 存档已成功导入！" : "✓ Save backup restored!");
      } else {
        setStatus(runtime.language === ZH_LANGUAGE ? "✕ 文件中未找到有效存档数据" : "✕ No valid save data found in file");
      }
    } catch {
      setStatus(runtime.language === ZH_LANGUAGE ? "✕ 无法解析该存档文件" : "✕ Failed to parse save file");
    }
  });

  dialog.addEventListener("keydown", (event) => event.stopPropagation());
  dialog.addEventListener("keyup", (event) => event.stopPropagation());

  app.append(dialog);
  return () => {
    setStatus("");
    show();
    dialog.showModal();
  };
}
