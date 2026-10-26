import { readStorage } from "./platform/Storage";
import { achievementManager, ACHIEVEMENTS } from "./Achievements";
import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { sfx } from "./platform/SoundEffects";
import { ZH_LANGUAGE } from "./text/LegacyZhText";
import { escapeHtml, safeAssetName } from "./platform/Html";

const UI_ART = "hd/ui/";

/** Creates and mounts the Trophy Cabinet modal dialog onto `app`. Returns the opener callback. */
export function attachAchievements(app: HTMLElement, runtime: LegacyRuntimeState): () => void {
  const dialog = document.createElement("dialog");
  dialog.className = "settings trophy-dialog";
  app.append(dialog);

  let activeFilter: "all" | "unlocked" | "locked" = "all";

  const render = () => {
    const lang: "zh" | "id" | "en" = runtime.language === ZH_LANGUAGE ? "zh" : (readStorage("pt.language") === "id" ? "id" : "en");
    const isZh = runtime.language === ZH_LANGUAGE;
    const records = achievementManager.getRecords();
    const stats = achievementManager.getStats();
    const total = ACHIEVEMENTS.length;
    const unlocked = Object.keys(records).length;
    const pct = Math.round((unlocked / total) * 100);

    const filtered = ACHIEVEMENTS.filter((def) => {
      const isDone = Boolean(records[def.id]);
      if (activeFilter === "unlocked") return isDone;
      if (activeFilter === "locked") return !isDone;
      return true;
    });

    const cardsHtml = filtered
      .map((def) => {
        const rec = records[def.id];
        const isDone = Boolean(rec);
        const title = def.title[lang] ?? def.title.en;
        const desc = def.desc[lang] ?? def.desc.en;
        const hint = def.hint[lang] ?? def.hint.en;

        const dateStr = rec
          ? new Date(rec.unlockedAt).toLocaleDateString(lang === "zh" ? "zh-CN" : lang === "id" ? "id-ID" : "en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "";

        let progressHtml = "";
        if (def.targetProgress && def.getCurrentProgress) {
          const current = Math.min(def.targetProgress, def.getCurrentProgress(stats, runtime));
          const progPct = Math.min(100, Math.round((current / def.targetProgress) * 100));
          progressHtml = `
            <div class="trophy-prog-wrap">
              <div class="trophy-prog-bar">
                <div class="trophy-prog-fill" style="width: ${progPct}%"></div>
              </div>
              <span class="trophy-prog-text">${current} / ${def.targetProgress}</span>
            </div>
          `;
        }

        const iconHtml = def.assetIcon
          ? `<img src="${UI_ART}${safeAssetName(def.assetIcon)}.png" alt="" class="trophy-card-asset">`
          : `<span class="trophy-card-glyph">${escapeHtml(def.glyph)}</span>`;

        return `
          <div class="trophy-card ${isDone ? "unlocked" : "locked"}">
            <div class="trophy-card-left">
              <div class="trophy-card-icon-frame">
                ${iconHtml}
                ${isDone ? '<span class="trophy-card-stamp">✓</span>' : '<span class="trophy-card-lock">🔒</span>'}
              </div>
            </div>
            <div class="trophy-card-body">
              <div class="trophy-card-header">
                <h3 class="trophy-card-title">${escapeHtml(title)}</h3>
                <span class="trophy-card-tag ${isDone ? "tag-done" : "tag-pending"}">
                  ${isDone ? (lang === "zh" ? `已达成 · ${dateStr}` : lang === "id" ? `TERBUKA · ${dateStr}` : `UNLOCKED · ${dateStr}`) : (lang === "zh" ? "未达成" : lang === "id" ? "TERKUNCI" : "LOCKED")}
                </span>
              </div>
              <p class="trophy-card-desc">${escapeHtml(isDone ? desc : hint)}</p>
              ${progressHtml}
            </div>
          </div>
        `;
      })
      .join("");

    dialog.innerHTML = `
      <form method="dialog">
        <div class="trophy-head">
          <div class="trophy-head-title">
            <span class="trophy-head-icon">🏆</span>
            <h2>${lang === "zh" ? "部落荣誉与成就勋章" : lang === "id" ? "Prestasi & Trofi Suku Purba" : "Tribe Achievements & Trophies"}</h2>
          </div>
          <div class="trophy-summary">
            <div class="trophy-progress-label">
              <span>${lang === "zh" ? "成就收集进度" : lang === "id" ? "Kemajuan Pengumpulan Trofi" : "Trophy Completion"}</span>
              <b>${unlocked} / ${total} (${pct}%)</b>
            </div>
            <div class="trophy-overall-bar">
              <div class="trophy-overall-fill" style="width: ${pct}%"></div>
            </div>
          </div>
          <div class="trophy-tabs">
            <button type="button" class="trophy-tab ${activeFilter === "all" ? "active" : ""}" data-filter="all">
              ${lang === "zh" ? `全部 (${total})` : lang === "id" ? `Semua (${total})` : `All (${total})`}
            </button>
            <button type="button" class="trophy-tab ${activeFilter === "unlocked" ? "active" : ""}" data-filter="unlocked">
              ${lang === "zh" ? `已达成 (${unlocked})` : lang === "id" ? `Terbuka (${unlocked})` : `Unlocked (${unlocked})`}
            </button>
            <button type="button" class="trophy-tab ${activeFilter === "locked" ? "active" : ""}" data-filter="locked">
              ${lang === "zh" ? `未达成 (${total - unlocked})` : lang === "id" ? `Terkunci (${total - unlocked})` : `Locked (${total - unlocked})`}
            </button>
          </div>
        </div>

        <div class="trophy-grid">
          ${cardsHtml.length > 0 ? cardsHtml : `<div class="trophy-empty">${lang === "zh" ? "没有匹配的成就项目" : lang === "id" ? "Tidak ada prestasi dalam kategori ini" : "No achievements in this category"}</div>`}
        </div>

        <div class="confirm-buttons trophy-actions">
          <button type="submit" class="trophy-close-btn">${lang === "zh" ? "关闭陈列室" : lang === "id" ? "Tutup Lemari Trofi" : "Close Cabinet"}</button>
        </div>
      </form>
    `;

    for (const tabBtn of Array.from(dialog.querySelectorAll<HTMLButtonElement>(".trophy-tab"))) {
      tabBtn.addEventListener("click", () => {
        sfx.click();
        activeFilter = (tabBtn.dataset.filter as typeof activeFilter) || "all";
        render();
      });
    }
  };

  const open = () => {
    sfx.select();
    achievementManager.reload();
    render();
    dialog.showModal();
  };

  return open;
}
