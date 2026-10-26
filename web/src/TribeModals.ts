import { readStorage } from "./platform/Storage";
import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import {
  BLD_HP,
  BLD_KIND,
  BLD_X,
  BLD_Y,
  UNIT_AGE,
  UNIT_ENERGY,
  UNIT_FOOD,
  UNIT_GENDER,
  UNIT_HELD_ITEM,
  UNIT_HP,
  UNIT_JOB_TYPE,
  UNIT_MAX_HP,
  UNIT_NAME,
  UNIT_RECORD,
  UNIT_TYPE,
  UNIT_X,
  UNIT_Y,
} from "./core/DenseLayout";
import { capitalise, originalText } from "./OriginalText";
import { sfx } from "./platform/SoundEffects";
import { legacyMapOverviewColor } from "./render/LegacyMapOverview";
import { ID_LANGUAGE, ZH_LANGUAGE } from "./text/LegacyZhText";
import { escapeHtml, safeAssetName } from "./platform/Html";
import type { TouchControls } from "./TouchControls";
import type { WideScreen } from "./WideScreen";

const UI = "hd/ui/";

const WEAPON_ICONS: Record<number, string> = {
  0: "club",
  1: "stone",
  2: "spear",
  3: "stone-axe",
  4: "bone-mace",
  5: "tomahawk",
  6: "net-trap",
  7: "spring-trap",
  8: "pit-trap",
};

type RosterFilter = "all" | "idle" | "working" | "armed" | "care";

export function attachTribeModals(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
): { openMinimap(): void; openRoster(): void; update(): void } {
  const game = runtime.game;
  const lang = (): "zh" | "id" | "en" =>
    runtime.language === ZH_LANGUAGE ? "zh" : (readStorage("pt.language") === "id" ? "id" : "en");
  const isZh = () => runtime.language === ZH_LANGUAGE;
  // ============================================================================
  // 1. INTERACTIVE HD MINIMAP MODAL
  // ============================================================================
  const minimapDialog = document.createElement("dialog");
  minimapDialog.className = "settings minimap-dialog";
  minimapDialog.addEventListener("keydown", (e) => e.stopPropagation());
  minimapDialog.addEventListener("keyup", (e) => e.stopPropagation());
  app.append(minimapDialog);

  const minimapCanvas = document.createElement("canvas");
  minimapCanvas.className = "minimap-canvas";
  const minimapCtx = minimapCanvas.getContext("2d")!;

  let minimapDragging = false;

  const focusFromMinimapEvent = (event: PointerEvent) => {
    const rect = minimapCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const w = Math.max(1, game.mapWidth);
    const h = Math.max(1, game.mapHeight);
    const tx = Math.max(0, Math.min(w - 1, Math.floor(((event.clientX - rect.left) / rect.width) * w)));
    const ty = Math.max(0, Math.min(h - 1, Math.floor(((event.clientY - rect.top) / rect.height) * h)));
    touch.focus(tx, ty);
    drawMinimapCanvas();
  };

  minimapCanvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    try { minimapCanvas.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    minimapDragging = true;
    sfx.click();
    focusFromMinimapEvent(event);
  });
  minimapCanvas.addEventListener("pointermove", (event) => {
    if (!minimapDragging) return;
    event.preventDefault();
    focusFromMinimapEvent(event);
  });
  const endMinimapDrag = () => { minimapDragging = false; };
  minimapCanvas.addEventListener("pointerup", endMinimapDrag);
  minimapCanvas.addEventListener("pointercancel", endMinimapDrag);

  function drawMinimapCanvas(): void {
    if (!minimapDialog.open || game.loopMode !== 1) return;
    const w = Math.max(1, game.mapWidth);
    const h = Math.max(1, game.mapHeight);
    const cellPx = 6;
    const cw = w * cellPx;
    const ch = h * cellPx;
    if (minimapCanvas.width !== cw || minimapCanvas.height !== ch) {
      minimapCanvas.width = cw;
      minimapCanvas.height = ch;
    }
    const overviewInput = runtime.mapOverviewInput();
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const color = legacyMapOverviewColor(overviewInput, x, y);
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        minimapCtx.fillStyle = `rgb(${r},${g},${b})`;
        minimapCtx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
      }
    }

    // Highlight active friendly/enemy units & Chief clearly on top
    const e = runtime.denseState;
    const chiefId = runtime.mainArrays.aShort[0]?.[17] ?? 0;
    for (let id = 1; id <= 50; id += 1) {
      if ((e[UNIT_HP + id] ?? 0) <= 0) continue;
      const tile = touch.villagerTile(id);
      if (!tile) continue;
      const [ux, uy] = tile;
      if (id === chiefId) {
        minimapCtx.fillStyle = "#00f5d4";
        minimapCtx.strokeStyle = "#000";
        minimapCtx.lineWidth = 1.5;
        minimapCtx.beginPath();
        minimapCtx.arc((ux + 0.5) * cellPx, (uy + 0.5) * cellPx, cellPx * 0.85, 0, Math.PI * 2);
        minimapCtx.fill();
        minimapCtx.stroke();
      } else {
        minimapCtx.fillStyle = "#ffe66d";
        minimapCtx.fillRect(ux * cellPx, uy * cellPx, cellPx, cellPx);
      }
    }

    // Draw camera viewport box
    const vx = Math.max(0, game.cameraColumn) * cellPx;
    const vy = Math.max(0, game.cameraRow) * cellPx;
    const vw = Math.min(w - game.cameraColumn, game.viewColumns || 11) * cellPx;
    const vh = Math.min(h - game.cameraRow, game.viewRows || 16) * cellPx;
    minimapCtx.strokeStyle = "#ffffff";
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(vx + 1, vy + 1, Math.max(8, vw - 2), Math.max(8, vh - 2));
  }

  function renderMinimapDialog(): void {
    const l = lang();
    minimapDialog.innerHTML = `
      <form method="dialog">
        <div class="help-head">
          <h2>${l === "zh" ? "部落全景地图" : l === "id" ? "Peta Area Suku" : "Tribe Minimap"}</h2>
          <button type="button" class="minimap-home-btn" data-home>${l === "zh" ? "⌖ 定位族长/营地" : l === "id" ? "⌖ Cari Kepala Suku / Kamp" : "⌖ Find Chief / Camp"}</button>
        </div>
        <p class="minimap-hint">${l === "zh" ? "点击或拖动地图任意位置即可快速移动镜头" : l === "id" ? "Ketuk atau geser peta untuk menggerakkan kamera" : "Tap or drag anywhere on the map to move the camera"}</p>
        <div class="minimap-wrap"></div>
        <div class="minimap-legend">
          <span><i style="background:#00f5d4"></i>${l === "zh" ? "族长" : l === "id" ? "Kepala Suku" : "Chief"}</span>
          <span><i style="background:#ffe66d"></i>${l === "zh" ? "我方村民" : l === "id" ? "Penduduk" : "Villagers"}</span>
          <span><i style="background:#4ecdc4"></i>${l === "zh" ? "我方建筑" : l === "id" ? "Bangunan" : "Buildings"}</span>
          <span><i style="background:#ff595e"></i>${l === "zh" ? "敌方" : l === "id" ? "Musuh" : "Enemies"}</span>
          <span><i style="background:#5c4d6d"></i>${l === "zh" ? "未探索" : l === "id" ? "Belum Terlihat" : "Unexplored"}</span>
        </div>
        <div class="confirm-buttons"><button type="submit">${l === "zh" ? "关闭" : l === "id" ? "Tutup" : "Close"}</button></div>
      </form>
    `;
    minimapDialog.querySelector(".minimap-wrap")?.append(minimapCanvas);
    minimapDialog.querySelector("[data-home]")?.addEventListener("click", () => {
      sfx.click();
      const chiefId = runtime.mainArrays.aShort[0]?.[17] ?? 0;
      const chiefTile = chiefId > 0 ? touch.villagerTile(chiefId) : null;
      if (chiefTile) {
        touch.focus(chiefTile[0], chiefTile[1]);
        drawMinimapCanvas();
        return;
      }
      const e = runtime.denseState;
      for (let b = 1; b <= 30; b += 1) {
        if ((e[BLD_HP + b] ?? 0) > 0) {
          touch.focus(e[BLD_X + b] ?? 0, e[BLD_Y + b] ?? 0);
          drawMinimapCanvas();
          return;
        }
      }
    });
    drawMinimapCanvas();
  }

  const openMinimap = () => {
    if (game.loopMode !== 1) return;
    sfx.click();
    renderMinimapDialog();
    minimapDialog.showModal();
  };

  // ============================================================================
  // 2. TRIBE ROSTER & IDLE VILLAGER FINDER MODAL
  // ============================================================================
  const rosterDialog = document.createElement("dialog");
  rosterDialog.className = "settings roster-dialog";
  rosterDialog.addEventListener("keydown", (e) => e.stopPropagation());
  rosterDialog.addEventListener("keyup", (e) => e.stopPropagation());
  app.append(rosterDialog);

  let activeFilter: RosterFilter = "all";

  type VillagerEntry = {
    id: number;
    name: string;
    age: number;
    male: boolean;
    hp: number;
    maxHp: number;
    food: number;
    energy: number;
    held: number;
    isChief: boolean;
    isChild: boolean;
    isIdle: boolean;
    isArmed: boolean;
    needsCare: boolean;
    insideBuilding: number;
    statusText: string;
    statusClass: string;
    portrait: string;
  };

  const getVillagers = (): VillagerEntry[] => {
    const zh = isZh();
    const e = runtime.denseState;
    const chiefId = runtime.mainArrays.aShort[0]?.[17] ?? 0;
    const list: VillagerEntry[] = [];

    for (let id = 1; id <= 50; id += 1) {
      const hp = e[UNIT_HP + id] ?? 0;
      if (hp <= 0) continue;
      const maxHp = Math.max(1, e[UNIT_MAX_HP + id] ?? 100);
      const age = e[UNIT_AGE + id] ?? 18;
      const male = (e[UNIT_GENDER + id] ?? 0) === 0;
      const type = e[UNIT_TYPE + id] ?? 69;
      const job = e[UNIT_JOB_TYPE + id] ?? 69;
      const held = e[UNIT_HELD_ITEM + id] ?? 9;
      const food = e[UNIT_FOOD + id] ?? 0;
      const energy = e[UNIT_ENERGY + id] ?? 0;
      const rec = e[UNIT_RECORD + id] ?? 0;
      const tile = touch.villagerTile(id);
      const isChief = id === chiefId;
      const isChild = type === 17 || age < 12;
      const isIdle = !isChild && tile !== null && (type === 69 || type === 83) && job === 69;
      const isArmed = held >= 0 && held <= 5;
      const needsCare = hp < maxHp * 0.65 || food < 30 || energy < 30;

      let portrait = male ? "pt-man" : "pt-woman";
      if (isChief) portrait = "pt-chief";
      else if (isChild) portrait = "pt-child";
      else if (rec > 0 && rec <= 30) {
        const bKind = e[BLD_KIND + rec] ?? -1;
        if (bKind === 4) portrait = male ? "pt-cook" : "pt-cook-woman";
        else if (bKind >= 12) portrait = "pt-builder";
      }

      const l = lang();
      let statusText = l === "zh" ? "工作中" : l === "id" ? "Bekerja" : "Working";
      let statusClass = "working";
      if (isChief) {
        statusText = l === "zh" ? "部落族长" : l === "id" ? "Kepala Suku" : "Tribe Chief";
        statusClass = "chief";
      } else if (isChild) {
        statusText = l === "zh" ? "幼年孩童" : l === "id" ? "Anak-anak" : "Child";
        statusClass = "child";
      } else if (!tile && rec > 0) {
        const bKind = e[BLD_KIND + rec] ?? 2;
        const bName = capitalise(originalText(runtime, "s", bKind >= 12 ? bKind - 12 : bKind));
        statusText = l === "zh" ? `驻守: ${bName}` : l === "id" ? `Di ${bName}` : `In ${bName}`;
        statusClass = "inside";
      } else if (isIdle) {
        statusText = l === "zh" ? "空闲待命" : l === "id" ? "Menganggur" : "Idle";
        statusClass = "idle";
      } else if (isArmed && (type < 10 || type > 80)) {
        statusText = l === "zh" ? "警戒/战斗" : l === "id" ? "Siaga / Tempur" : "Guard / Combat";
        statusClass = "armed";
      }

      const name = capitalise(originalText(runtime, "s", 108 + (e[UNIT_NAME + id] ?? 0)));
      list.push({
        id,
        name,
        age,
        male,
        hp,
        maxHp,
        food,
        energy,
        held,
        isChief,
        isChild,
        isIdle,
        isArmed,
        needsCare,
        insideBuilding: !tile && rec > 0 ? rec : 0,
        statusText,
        statusClass,
        portrait,
      });
    }
    return list;
  };

  function renderRosterDialog(): void {
    const l = lang();
    const all = getVillagers();
    const idleCount = all.filter((v) => v.isIdle).length;
    const workingCount = all.filter((v) => !v.isIdle && !v.isChild).length;
    const armedCount = all.filter((v) => v.isArmed).length;
    const careCount = all.filter((v) => v.needsCare).length;

    const filtered = all.filter((v) => {
      if (activeFilter === "idle") return v.isIdle;
      if (activeFilter === "working") return !v.isIdle && !v.isChild;
      if (activeFilter === "armed") return v.isArmed;
      if (activeFilter === "care") return v.needsCare;
      return true;
    });

    const tabs: { id: RosterFilter; label: string }[] = [
      { id: "all", label: `${l === "zh" ? "全部" : l === "id" ? "Semua" : "All"} (${all.length})` },
      { id: "idle", label: `${l === "zh" ? "空闲" : l === "id" ? "Menganggur" : "Idle"} (${idleCount})` },
      { id: "working", label: `${l === "zh" ? "工作" : l === "id" ? "Bekerja" : "Working"} (${workingCount})` },
      { id: "armed", label: `${l === "zh" ? "武装" : l === "id" ? "Bersenjata" : "Armed"} (${armedCount})` },
      { id: "care", label: `${l === "zh" ? "需照顾" : l === "id" ? "Perlu Rawat" : "Low Stats"} (${careCount})` },
    ];

    const cardsHtml = filtered.length === 0
      ? `<p class="roster-empty">${l === "zh" ? "当前分类下没有村民" : l === "id" ? "Tidak ada penduduk dalam kategori ini." : "No villagers in this category."}</p>`
      : filtered.map((v) => {
          const weaponIcon = WEAPON_ICONS[v.held] ?? "empty-hand";
          const hpPct = Math.round(Math.max(0, Math.min(1, v.hp / v.maxHp)) * 100);
          const foodPct = Math.round(Math.max(0, Math.min(1, v.food / 99)) * 100);
          const energyPct = Math.round(Math.max(0, Math.min(1, v.energy / 99)) * 100);
          return `
            <button type="button" class="roster-card" data-vid="${v.id}">
              <img class="roster-face" src="${UI}${v.portrait}.png" alt="">
              <div class="roster-info">
                <div class="roster-top">
                  <b>${v.name}</b>
                  <span class="roster-age"><img src="${UI}${v.male ? "male" : "female"}.png" alt="">${v.age}</span>
                  <span class="roster-badge ${v.statusClass}">${v.statusText}</span>
                </div>
                <div class="roster-bars">
                  <span title="HP"><img src="${UI}heart.png" alt=""><i><b style="width:${hpPct}%"></b></i></span>
                  <span title="Food"><img src="${UI}hunger.png" alt=""><i><b style="width:${foodPct}%"></b></i></span>
                  <span title="Energy"><img src="${UI}sleep.png" alt=""><i><b style="width:${energyPct}%"></b></i></span>
                </div>
              </div>
              <img class="roster-weapon" src="${UI}${safeAssetName(weaponIcon)}.png" alt="">
            </button>
          `;
        }).join("");

    rosterDialog.innerHTML = `
      <form method="dialog">
        <div class="help-head">
          <h2>${l === "zh" ? "部落村民名册" : l === "id" ? "Daftar Penduduk Suku" : "Tribe Villager Roster"}</h2>
          <div class="help-tabs">
            ${tabs.map((t) => `<button type="button" data-filter="${escapeHtml(t.id)}" class="help-tab${t.id === activeFilter ? " active" : ""}">${escapeHtml(t.label)}</button>`).join("")}
          </div>
        </div>
        <div class="roster-list">${cardsHtml}</div>
        <div class="confirm-buttons"><button type="submit">${l === "zh" ? "关闭" : l === "id" ? "Tutup" : "Close"}</button></div>
      </form>
    `;

    for (const tabBtn of Array.from(rosterDialog.querySelectorAll<HTMLButtonElement>("[data-filter]"))) {
      tabBtn.addEventListener("click", () => {
        sfx.click();
        activeFilter = tabBtn.dataset.filter as RosterFilter;
        renderRosterDialog();
      });
    }

    for (const card of Array.from(rosterDialog.querySelectorAll<HTMLButtonElement>("[data-vid]"))) {
      card.addEventListener("click", () => {
        const id = Number(card.dataset.vid);
        const entry = all.find((item) => item.id === id);
        if (!entry) return;
        sfx.select();
        rosterDialog.close();
        const tile = touch.villagerTile(id);
        if (tile) {
          touch.focus(tile[0], tile[1]);
          touch.selectVillager(id);
        } else if (entry.insideBuilding > 0) {
          const e = runtime.denseState;
          const bx = e[BLD_X + entry.insideBuilding] ?? (e[UNIT_X + id] ?? 0);
          const by = e[BLD_Y + entry.insideBuilding] ?? (e[UNIT_Y + id] ?? 0);
          touch.focus(bx, by);
          touch.selectVillager(id);
        }
      });
    }
  }

  const openRoster = () => {
    if (game.loopMode !== 1) return;
    sfx.click();
    renderRosterDialog();
    rosterDialog.showModal();
  };

  let lastUpdate = 0;
  const update = () => {
    const now = performance.now();
    if (now - lastUpdate < 350) return;
    lastUpdate = now;
    if (minimapDialog.open) drawMinimapCanvas();
  };

  return { openMinimap, openRoster, update };
}
