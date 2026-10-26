import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { OriginalKey } from "./platform/Input";
import { sfx } from "./platform/SoundEffects";
import { haptic } from "./platform/Haptic";
import { ID_LANGUAGE, ZH_LANGUAGE } from "./text/LegacyZhText";
import { oldArt } from "./platform/OldArt";
import { capitalise, originalText } from "./OriginalText";
import { escapeHtml, safeAssetName } from "./platform/Html";
import { T_BUILDING } from "./core/DataTables";
import { BLD_KIND, RES_KIND, UNIT_AGE, UNIT_ENERGY, UNIT_FOOD, UNIT_GENDER, UNIT_HELD_ITEM, UNIT_HOME_X, UNIT_HOME_Y, UNIT_HP, UNIT_JOB_TYPE, UNIT_MAX_HP, UNIT_NAME, UNIT_SELECTION, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_X, UNIT_Y } from "./core/DenseLayout";
import type { PauseItem, TouchControls } from "./TouchControls";
import { attachTribeModals } from "./TribeModals";
import type { WideScreen } from "./WideScreen";
import { villagerPanelOf } from "./render/WideView";
import { hdArt } from "./render/HdArt";
import { touchAction } from "./render/RenderRuntime";
import { achievementManager } from "./Achievements";
import { renderBestiaryHtml } from "./Bestiary";
import { tribeTactics } from "./combat/TribeTactics";

/** The round-3 UI's pictures (scripts/import-hd.mjs copies them from design/). */
const UI = "hd/ui/";
const SHEET_HEIGHT = 112; // the bottom sheet's content height (styles.css .hud-sheet)

/**
 * The touch HUD (phase 3, approved by the user 2026-10-17; not in the original), replacing the row
 * of virtual buttons under the screen:
 *
 * - top right, at the resource bar's right end: the game menu. Opening it pauses the game -- it
 *   enters the original's pause menu, while the screen keeps the map -- and drops down Save, Load,
 *   Settings, Help, Quit; each runs the original's own menu item (its yes / no prompts become a
 *   confirmation box with the original's text, its "game saved." a notice). Tapping elsewhere or
 *   the icon again closes it and the game goes on (the original's RESUME);
 * - the top bar: HD counters (round 3);
 * - bottom right, for the right thumb (round 3): the build button (it opens the original's build
 *   cards, shown as the build list in the bottom sheet), the command button above it (call to arms,
 *   form up, the map -- the original's command bar items) and the squads at the right edge (the
 *   original's 7 / 9 groups); icons only, a long press shows a name;
 * - left of it, only when they apply: cancel (the right soft key until nothing is open: cancels the
 *   selection, closes a bar), left / right while a bar is open;
 * - placing a building: ✕ (back, right soft key) where the build button was, and a ghost of the
 *   building over its footprint with a tick at its top right places it (FIRE) -- green where the
 *   original allows it, red and grey where it does not (ported from upstream BOMBWCC 29e035f);
 * - a building's bar (one tap on it) as the building panel in the bottom sheet, ✓ left of its ✕
 *   when something waits for confirming; a weapon or spell for a villager is aimed by tapping one.
 * Every control only presses the original's keys, so the keyboard and the game logic are unchanged.
 */

export function attachHud(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
  openSettings: () => void,
  notify: (text: string) => void,
  speedControl?: { getSpeed(): 1 | 2 | 4; cycleSpeed(): 1 | 2 | 4 },
  openAchievements?: () => void,
  openRecap?: () => void,
): { update(): void; track(): void; openHelp(): void } {
  const game = runtime.game;
  const hud = document.createElement("div");
  hud.className = "hud";
  app.append(hud);

  const modals = attachTribeModals(app, runtime, screen, touch);

  const button = (className: string, text: string, label?: string) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.textContent = text;
    if (label) element.setAttribute("aria-label", label);
    element.addEventListener("pointerdown", () => sfx.click());
    return element;
  };

  // ---- the top bar (round 3, user 2026-10-20): the HD bar, its resource icons and digits (people
  // up to 99 / 99, each resource up to 999) -- the original's f.a(byte,int,int) for command 0 shows
  // a:[[S row 0 at t146[0..4] (people, food, wood, stone, bones) and the living space, row 0 [16] ----
  const bar = document.createElement("div");
  bar.className = "hud-bar";
  bar.hidden = true;
  bar.innerHTML = `<img class="hud-bar-bg" src="${UI}bar-bg.png" alt=""><img class="hud-bar-deco left" src="${UI}deco-top-left.png" alt=""><img class="hud-bar-deco right" src="${UI}deco-top-right.png" alt="">`;
  const lang = () => (runtime.language === ZH_LANGUAGE ? "zh" : (typeof localStorage !== "undefined" && localStorage.getItem("pt.language") === "id" ? "id" : "en"));
  const isZh = () => runtime.language === ZH_LANGUAGE;
  const counters = ([
    ["people", "人口（点击查看村民名册）", "Populasi (Daftar Penduduk)", "Population (Tap for Villager Roster)"],
    ["food", "食物", "Makanan", "Food"],
    ["wood", "木材", "Kayu", "Wood"],
    ["stone", "石头", "Batu", "Stone"],
    ["bones", "骨头", "Tulang", "Bones"],
  ] as const).map(([icon, nameZh, nameId, nameEn], idx) => {
    const group = document.createElement("div");
    group.className = `hud-count ${icon}${idx === 0 ? " interactive" : ""}`;
    group.setAttribute("role", idx === 0 ? "button" : "img");
    group.innerHTML = `<img src="${UI}icon-${safeAssetName(icon)}.png" alt="">`;
    const digits = document.createElement("span");
    group.append(digits);
    if (idx === 0) {
      group.addEventListener("click", () => modals.openRoster());
    }
    bar.append(group);
    return { group, digits, nameZh, nameId, nameEn, text: "" };
  });
  const drawCounts = () => {
    const row = runtime.mainArrays.aShort[0];
    const table = runtime.packedOffsets[146] ?? 0;
    const value = (i: number) => row?.[runtime.packedBytes[table + i] ?? 0] ?? 0;
    const texts = [
      `${Math.min(99, value(0))}/${Math.min(99, row?.[16] ?? 0)}`,
      ...[1, 2, 3, 4].map((i) => String(Math.min(999, Math.max(0, value(i))))),
    ];
    counters.forEach((counter, i) => {
      const text = texts[i]!;
      if (text === counter.text) return;
      counter.text = text;
      const l = lang();
      const name = l === "zh" ? counter.nameZh : l === "id" ? counter.nameId : counter.nameEn;
      counter.group.setAttribute("aria-label", `${name} ${text}`);
      counter.digits.innerHTML = Array.from(text, (c) => `<img src="${UI}digit-${c === "/" ? "slash" : c}.png" alt="">`).join("");
    });
  };

  // ---- Game Speed button (1x / 2x / 4x) ----
  const speedButton = button("hud-speed-btn", "1x", "Game Speed: 1x");
  speedButton.hidden = true;
  const syncSpeedButton = () => {
    const spd = speedControl?.getSpeed() ?? 1;
    speedButton.textContent = `${spd}x`;
    speedButton.classList.toggle("fast", spd > 1);
    speedButton.classList.toggle("ultra", spd === 4);
    speedButton.setAttribute("aria-label", isZh() ? `游戏速度：${spd}倍` : `Game Speed: ${spd}x`);
  };
  const toggleGameSpeed = () => {
    if (!speedControl) return;
    const next = speedControl.cycleSpeed();
    syncSpeedButton();
    notify(isZh() ? `游戏速度：${next}x` : `Game Speed: ${next}x`);
  };
  speedButton.addEventListener("click", toggleGameSpeed);
  window.addEventListener("keydown", (event) => {
    if ((event.key === "f" || event.key === "F" || event.key === "Tab") && game.loopMode === 1 && !screen.frozen && !document.querySelector("dialog[open]")) {
      event.preventDefault();
      sfx.click();
      toggleGameSpeed();
    }
  });

  // ---- Idle Villager Finder (💤) ----
  const idleButton = button("hud-idle-btn", "", "Idle Villagers");
  idleButton.hidden = true;
  idleButton.innerHTML = `<span class="hud-idle-icon">💤</span><span class="hud-idle-count">0</span>`;
  const idleCountSpan = idleButton.querySelector<HTMLElement>(".hud-idle-count")!;
  let lastIdleIdx = -1;

  const getIdleVillagers = (): { id: number; name: string; tile: [number, number] }[] => {
    const e = runtime.denseState;
    const results: { id: number; name: string; tile: [number, number] }[] = [];
    for (let id = 1; id <= 50; id += 1) {
      const hp = e[UNIT_HP + id] ?? 0;
      if (hp <= 0) continue;
      const age = e[UNIT_AGE + id] ?? 18;
      const type = e[UNIT_TYPE + id] ?? 69;
      const job = e[UNIT_JOB_TYPE + id] ?? 69;
      const isChild = type === 17 || age < 12;
      const tile = touch.villagerTile(id);
      if (!isChild && tile !== null && (type === 69 || type === 83) && job === 69) {
        const nameIdx = e[UNIT_NAME + id] ?? 0;
        const name = capitalise(originalText(runtime, "s", 108 + nameIdx));
        results.push({ id, name, tile });
      }
    }
    return results;
  };

  const cycleIdleVillagers = () => {
    if (game.loopMode !== 1 || screen.frozen) return;
    const idleList = getIdleVillagers();
    if (idleList.length === 0) {
      sfx.click();
      notify(isZh() ? "所有族人均在忙碌工作中！" : "All tribe members are busy working!");
      return;
    }
    lastIdleIdx = (lastIdleIdx + 1) % idleList.length;
    const target = idleList[lastIdleIdx]!;
    sfx.select();
    touch.focus(target.tile[0], target.tile[1]);
    touch.selectVillager(target.id);
    notify(
      isZh()
        ? `定位空闲族人：${target.name} (${lastIdleIdx + 1}/${idleList.length})`
        : `Selected idle: ${target.name} (${lastIdleIdx + 1}/${idleList.length})`,
    );
  };

  const aMoveBanner = document.createElement("div");
  aMoveBanner.className = "hud-attack-move-banner";
  aMoveBanner.hidden = true;
  hud.append(aMoveBanner);

  const updateAttackMoveBanner = () => {
    const active = tribeTactics.isAttackMoveActive();
    aMoveBanner.hidden = !active;
    if (active) {
      const l = lang();
      const text = l === "zh"
        ? `⚔️ <b>进攻移动模式</b>：点击地图目标迎敌挺进`
        : l === "id"
        ? `⚔️ <b>Mode Gerak Tempur</b>: Ketuk peta untuk maju & serang musuh`
        : `⚔️ <b>Attack-Move Mode</b>: Tap map to march & engage enemies`;
      aMoveBanner.innerHTML = `
        <span class="a-move-text">${text}</span>
        <button type="button" class="a-move-cancel-btn" aria-label="Cancel">✕</button>
      `;
      aMoveBanner.querySelector(".a-move-cancel-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        sfx.click();
        haptic.tap();
        tribeTactics.cancelAttackMove();
        updateAttackMoveBanner();
        notify(l === "zh" ? "已取消进攻移动" : l === "id" ? "Gerak tempur dibatalkan" : "Attack-Move cancelled");
      });
    }
  };
  touch.setTileTapHandler((tx, ty) => {
    if (tribeTactics.isSettingRally()) {
      const bId = tribeTactics.getRallyBuilding();
      tribeTactics.setRallyPoint(bId, tx, ty);
      notify(isZh() ? `🚩 建筑集结点已设立在 (${tx}, ${ty})` : `🚩 Building Rally Point set at (${tx}, ${ty})`);
      return true;
    }
    if (tribeTactics.isAttackMoveActive()) {
      tribeTactics.executeAttackMove(tx, ty, runtime, touch);
      updateAttackMoveBanner();
      notify(isZh() ? `⚔️ 部队挺进目标：(${tx}, ${ty})` : `⚔️ Units marching to (${tx}, ${ty})`);
      return true;
    }
    return false;
  });

  idleButton.addEventListener("click", cycleIdleVillagers);

  window.addEventListener("keydown", (event) => {
    if (document.querySelector("dialog[open]")) return;
    if (
      (event.key === "." || event.key === "," || event.key === "i" || event.key === "I") &&
      game.loopMode === 1 &&
      !screen.frozen
    ) {
      event.preventDefault();
      cycleIdleVillagers();
    } else if (
      (event.key === "t" || event.key === "T" || (event.altKey && (event.key === "a" || event.key === "A"))) &&
      game.loopMode === 1 &&
      !screen.frozen
    ) {
      event.preventDefault();
      const on = tribeTactics.toggleAttackMove();
      updateAttackMoveBanner();
      notify(
        on
          ? isZh()
            ? "⚔️ 进攻移动已激活 [T]：点击地图目标挺进"
            : "⚔️ Attack-Move Active [T]: Tap map tile to march"
          : isZh()
          ? "已取消进攻移动"
          : "Attack-Move cancelled",
      );
    } else if (event.key === "Escape" && tribeTactics.isAttackMoveActive()) {
      tribeTactics.cancelAttackMove();
      updateAttackMoveBanner();
      notify(isZh() ? "已取消进攻移动" : "Attack-Move cancelled");
    }
  });

  // ---- top right: the game menu, which pauses the game: a stone plate (pressed while open), the
  // items as plates with glyphs dropping down under it ----
  const menuButton = button("hud-menu-button", "", "Game Menu");
  menuButton.innerHTML = `<img class="up" src="${UI}plate-normal.png" alt=""><img class="down" src="${UI}plate-pressed.png" alt=""><img class="glyph" src="${UI}glyph-menu.png" alt="">`;
  const menuList = document.createElement("div");
  menuList.className = "hud-menu";
  menuList.hidden = true;
  const menuShade = document.createElement("div");
  menuShade.className = "hud-menu-shade";
  menuShade.hidden = true;
  // The list drops from under the bar (drawn over it), the button sits on the bar.
  hud.append(menuShade, menuList, bar, idleButton, speedButton, menuButton);
  /** The pause menu's screens (Q 10 with a save, 11 without). */
  const inPauseMenu = () => game.screen === 10 || game.screen === 11;
  let paused = false;
  /** Help: "asked" until the original's help screen is up, "shown" until it is left again. */
  let help: "no" | "asked" | "shown" = "no";
  /** The still screen is the game menu's own (the start-up has one too, main.ts). */
  let stillIsMine = false;
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
  document.addEventListener("pointerdown", (event) => {
    const target = event.target as Node;
    if (paused && !menuList.hidden && !menuList.contains(target) && target !== menuButton && !confirmBox.open && !document.querySelector("dialog[open]")) resume();
  });

  // A yes / no box for the original's prompts (/t 63 load, 64 overwrite a save, 65 quit).
  const confirmBox = document.createElement("dialog");
  confirmBox.className = "settings confirm";
  confirmBox.innerHTML = '<form method="dialog"><p></p><div class="confirm-buttons"><button value="no" data-btn="no">Cancel</button><button value="yes" data-btn="yes">Confirm</button></div></form>';
  confirmBox.addEventListener("keydown", (event) => event.stopPropagation());
  app.append(confirmBox);
  const ask = (text: string, then: () => void) => {
    const l = lang();
    confirmBox.querySelector("p")!.textContent = text;
    confirmBox.querySelector<HTMLElement>('[data-btn="no"]')!.textContent = l === "zh" ? "取消" : l === "id" ? "Batal" : "Cancel";
    confirmBox.querySelector<HTMLElement>('[data-btn="yes"]')!.textContent = l === "zh" ? "确定" : l === "id" ? "Konfirmasi" : "Confirm";
    confirmBox.returnValue = "no";
    confirmBox.onclose = () => { if (confirmBox.returnValue === "yes") then(); };
    confirmBox.showModal();
  };
  const run = (item: PauseItem) => touch.pauseMenu(item, (record) => notify(originalText(runtime, "t", record)));
  const message = (record: number) => {
    const l = lang();
    if (l === "id") {
      if (record === 63) return "Muat simpanan permainan ini?";
      if (record === 64) return "Simpanan saat ini akan ditimpa! Lanjutkan?";
      if (record === 65) return "Kembali ke menu utama? Kemajuan yang belum disimpan akan hilang.";
    }
    return originalText(runtime, "t", record);
  };
  // Comprehensive 6-tab HD Tribe Guide & Encyclopedia dialog replacing the legacy 240x320 keypad help screen.
  const helpDialog = document.createElement("dialog");
  helpDialog.className = "settings help-dialog";
  helpDialog.addEventListener("keydown", (event) => event.stopPropagation());
  helpDialog.addEventListener("keyup", (event) => event.stopPropagation());
  app.append(helpDialog);
  let activeHelpTab: "controls" | "buildings" | "arsenal" | "bestiary" | "tribe" | "skills" | "keys" = "controls";
  const GUIDE_BUILDING_ICONS = ["armoury", "gym", "hut", "chiefs-hut", "kitchen", "range", "store", "disco", "sanctuary", "pia-center", "nursery", "tower"];
  const BUILDING_DESCS_EN = [
    "Crafts melee & ranged weapons and traps from wood, stone, and bone.",
    "Trains villager melee combat strength and physical resilience.",
    "Increases maximum tribe population capacity and provides rest shelter.",
    "Tribe command center where the Chief resides. Losing it is fatal.",
    "Cooks raw gathered food into nourishing meals to restore villager fullness faster.",
    "Trains villager ranged accuracy and scouting awareness.",
    "Stores crafted weapons and surplus tribe supplies for quick equipping.",
    "Boosts villager happiness and energy through music and dancing.",
    "Shaman temple capable of casting Healing, Defence, Love Potion, and Disease.",
    "Advanced prehistoric research hub unlocking higher-tier tribe structures.",
    "Cares for tribe children until they grow into productive adult villagers.",
    "Defensive lookout tower that spots and fires at approaching enemies and beasts.",
  ];
  const BUILDING_DESCS_ZH = [
    "消耗木材、石头与骨头锻造近战/远程武器与捕兽陷阱。",
    "训练村民的近战格斗能力与体魄。",
    "提升部落人口上限，供疲劳村民休息恢复精力。",
    "部落首领营帐与核心枢纽，可升级以解锁更多高级建筑。",
    "由厨师加工食物，大幅提升村民进食恢复饱食度的效率。",
    "训练村民远程投掷精准度与侦察视野。",
    "存放打造好的武器与物资，方便直接分发给村民装备。",
    "部落娱乐场所，通过音乐与舞蹈快速恢复村民心情。",
    "萨满圣所，可施展治疗、防御护盾、爱情魔药与瘟疫巫术。",
    "史前科技研究中心，解锁高阶部落建筑与能力。",
    "照料部落新出生的幼童，直至他们长大成人参与劳动。",
    "防御哨塔，提供广阔视野并自动攻击靠近的敌军或猛兽。",
  ];
  const BUILDING_DESCS_ID = [
    "Membuat senjata jarak dekat, jarak jauh, dan jebakan dari kayu, batu, dan tulang.",
    "Melatih kekuatan fisik dan kemampuan bertarung jarak dekat penduduk.",
    "Menaikkan kapasitas populasi suku dan tempat istirahat memulihkan energi.",
    "Tenda kepala suku dan pusat komando, tingkatkan untuk membuka bangunan tingkat lanjut.",
    "Tempat koki mengolah bahan mentah menjadi makanan lezat pemulih kekenyangan.",
    "Melatih akurasi lemparan jarak jauh dan jangkauan pengintaian penduduk.",
    "Menyimpan senjata dan perbekalan suku agar siap dibagikan kepada warga.",
    "Pusat hiburan suku, meningkatkan kebahagiaan dan energi melalui musik dan tarian.",
    "Kuil shaman untuk merapal mantra Penyembuhan, Perisai, Ramuan Cinta, dan Wabah.",
    "Pusat penelitian prasejarah untuk membuka bangunan dan teknologi suku tingkat tinggi.",
    "Merawat anak-anak suku hingga mereka beranjak dewasa dan siap bekerja.",
    "Menara pengawas pertahanan yang otomatis menembaki musuh atau hewan buas yang mendekat.",
  ];
  const BUILDING_NAMES_ID = [
    "Bengkel",
    "Tempat Latihan",
    "Gubuk",
    "Tenda Kepala Suku",
    "Dapur",
    "Tempat Memanah",
    "Gudang",
    "Pentas Disko",
    "Kuil Shaman",
    "Pusat Riset",
    "Penitipan Anak",
    "Menara Pengawas",
  ];
  const renderHelpDialog = () => {
    const lang = runtime.language === ZH_LANGUAGE ? "zh" : (typeof localStorage !== "undefined" && localStorage.getItem("pt.language") === "id" ? "id" : "en");
    const zh = lang === "zh";
    const tabs: { id: typeof activeHelpTab; label: string }[] = [
      { id: "controls", label: lang === "zh" ? "操作缩放" : lang === "id" ? "Kontrol & Zoom" : "Controls" },
      { id: "buildings", label: lang === "zh" ? "建筑图鉴" : lang === "id" ? "Bangunan" : "Buildings" },
      { id: "arsenal", label: lang === "zh" ? "武器巫术" : lang === "id" ? "Senjata & Sihir" : "Arsenal" },
      { id: "bestiary", label: lang === "zh" ? "远古图鉴" : lang === "id" ? "Fauna Purba" : "Bestiary" },
      { id: "tribe", label: lang === "zh" ? "资源生存" : lang === "id" ? "Kelangsungan" : "Survival" },
      { id: "skills", label: lang === "zh" ? "属性技能" : lang === "id" ? "Keahlian" : "Skills" },
      { id: "keys", label: lang === "zh" ? "快捷键" : lang === "id" ? "Pintas Keyboard" : "Keys" },
    ];
    let bodyHtml = "";
    if (activeHelpTab === "controls") {
      bodyHtml = zh ? `
        <div class="help-list">
          <div class="help-item"><img src="${UI}pt-man.png" alt=""><div><b>选中与下令</b><p>点村民选中；再点地图目标（树木、石头、猎物、工地、建筑或敌人）直接下达命令。长按空地并拖动可框选多名村民。</p></div></div>
          <div class="help-item"><img src="${UI}build-a.png" alt=""><div><b>建造与建筑面板</b><p>点右下角锤子打开建造列表，选建筑后在地图移动位置，点 ✓ 放置。点已有建筑可升级、修理、制造武器或施展法术。</p></div></div>
          <div class="help-item"><img src="${UI}cmd-horn.png" alt=""><div><b>号角、名册、倍速与缩放</b><p>右下角号角可打开全员备战、集结、高清小地图与村民名册。顶部资源栏支持点击人口查看名册、点击 1x/2x/4x 切换倍速；地图支持双指捏合或鼠标滚轮直接缩放。</p></div></div>
        </div>
      ` : `
        <div class="help-list">
          <div class="help-item"><img src="${UI}pt-man.png" alt=""><div><b>Select & Order</b><p>Tap a villager to select, then tap any map target (trees, stone, prey, sites, buildings, or enemies) to issue orders. Long-press and drag to box-select.</p></div></div>
          <div class="help-item"><img src="${UI}build-a.png" alt=""><div><b>Build & Manage</b><p>Tap the bottom-right hammer to pick a building, drag to position on the map, and tap ✓ to place. Tap any built structure to upgrade, repair, craft weapons, or cast spells.</p></div></div>
          <div class="help-item"><img src="${UI}cmd-horn.png" alt=""><div><b>Horn, Roster, Speed & Zoom</b><p>Tap the horn for Call to Arms, Form Up, HD Minimap, and Villager Roster. Tap Population on the top bar for the Roster, tap 1x/2x/4x to fast-forward, and pinch or scroll-wheel directly on the map to zoom.</p></div></div>
        </div>
      `;
    } else if (activeHelpTab === "buildings") {
      const table = runtime.packedOffsets[T_BUILDING] ?? 0;
      const cards = GUIDE_BUILDING_ICONS.map((icon, kind) => {
        const name = lang === "id" ? (BUILDING_NAMES_ID[kind] ?? capitalise(originalText(runtime, "s", kind))) : capitalise(originalText(runtime, "s", kind));
        const wCost = runtime.packedBytes[table + 10 * 26 + kind] ?? 0;
        const sCost = runtime.packedBytes[table + 11 * 26 + kind] ?? 0;
        const bCost = runtime.packedBytes[table + 12 * 26 + kind] ?? 0;
        const costParts: string[] = [];
        if (wCost > 0) costParts.push(`🪵 ${wCost}`);
        if (sCost > 0) costParts.push(`🪨 ${sCost}`);
        if (bCost > 0) costParts.push(`🦴 ${bCost}`);
        const costStr = costParts.length > 0 ? costParts.join(" · ") : (zh ? "初始核心" : "Core");
        const desc = lang === "zh" ? BUILDING_DESCS_ZH[kind] : lang === "id" ? BUILDING_DESCS_ID[kind] : BUILDING_DESCS_EN[kind];
        return `
          <div class="help-item">
            <img src="${UI}ub-${icon}.png" alt="">
            <div>
              <b>${name} <small style="color:#ffd984;font-weight:600;margin-left:6px">${costStr}</small></b>
              <p>${desc}</p>
            </div>
          </div>
        `;
      }).join("");
      bodyHtml = `<div class="help-list">${cards}</div>`;
    } else if (activeHelpTab === "arsenal") {
      const weapons: [string, number, string, string, string][] = [
        ["club", 12, "Basic wooden melee club.", "Pentungan kayu dasar untuk pertahanan jarak dekat.", "基础木棒，近战防身武器。"],
        ["stone", 13, "Thrown rock for basic ranged attacks.", "Batu lempar untuk serangan jarak jauh dasar.", "投掷石块，基础远程攻击武器。"],
        ["spear", 14, "Balanced hunting & combat spear.", "Tombak seimbang untuk berburu dan bertempur.", "长矛，兼顾狩猎与战斗的利器。"],
        ["stone-axe", 15, "Heavy stone axe for strong melee strikes.", "Kapak batu berat dengan tebasan jarak dekat kuat.", "石斧，强力近战劈砍武器。"],
        ["bone-mace", 16, "Crushing bone mace crafted from beast bones.", "Gada penghancur dari tulang belulang hewan buas.", "骨锤，用猛兽骨骼打造的重型武器。"],
        ["tomahawk", 17, "High-damage ranged throwing axe.", "Kapak lempar dengan daya hancur jarak jauh tinggi.", "飞斧，高伤害远程投掷武器。"],
        ["net-trap", 18, "Entangles approaching beasts or enemies.", "Jebakan jaring untuk menjerat hewan atau penyusup.", "捕网陷阱，困住靠近的野兽或敌人。"],
        ["spring-trap", 19, "Launches a sudden spring-loaded strike.", "Jebakan pegas dengan serangan kejutan mematikan.", "弹射陷阱，对踏入目标造成伤害。"],
        ["pit-trap", 20, "Deep concealed pit that traps intruders.", "Jebakan lubang tersembunyi yang melumpuhkan musuh.", "深坑陷阱，重创落入其中的敌人。"],
        ["healing", 30, "Sanctuary spell: restores target villager's HP.", "Mantra suci: memulihkan HP penduduk yang terluka.", "萨满巫术：恢复目标村民的生命值。"],
        ["defence", 31, "Sanctuary spell: boosts target villager's armor.", "Mantra suci: meningkatkan pertahanan penduduk.", "萨满巫术：提升目标村民的防御力。"],
        ["love-potion", 32, "Sanctuary spell: inspires villagers to start a family.", "Mantra suci: mendorong penduduk dewasa berkeluarga.", "萨满巫术：促成成年男女繁衍后代。"],
        ["disease", 33, "Sanctuary spell: weakens nearby enemy forces.", "Mantra suci: melemahkan kekuatan pasukan musuh sekitar.", "萨满巫术：削弱敌方单位战斗力。"],
      ];
      bodyHtml = `
        <div class="help-list">
          ${weapons.map(([ic, sIdx, enDesc, idDesc, zhDesc]) => `
            <div class="help-item">
              <img src="${UI}${ic}.png" alt="">
              <div>
                <b>${capitalise(originalText(runtime, "s", sIdx))}</b>
                <p>${lang === "zh" ? zhDesc : lang === "id" ? idDesc : enDesc}</p>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    } else if (activeHelpTab === "tribe") {
      const intro = capitalise(originalText(runtime, "t", 71 + 230));
      bodyHtml = `
        <p class="help-lead">${intro}</p>
        <div class="help-grid">
          <div class="help-chip"><img src="${UI}icon-people.png" alt=""><span>${lang === "zh" ? "人口 / 居住上限（建小屋增加，成人可繁衍后代）" : lang === "id" ? "Batas Populasi (Bangun Gubuk; dewasa dapat berkeluarga)" : "Population / Housing cap (build Huts; adults can raise children)"}</span></div>
          <div class="help-chip"><img src="${UI}icon-food.png" alt=""><span>${lang === "zh" ? "食物（采集浆果、打猎、厨房加工防止饥饿）" : lang === "id" ? "Makanan (Kumpulkan buah, berburu, olah di Dapur)" : "Food (forage, hunt, and cook in Kitchen to prevent starvation)"}</span></div>
          <div class="help-chip"><img src="${UI}icon-wood.png" alt=""><span>${lang === "zh" ? "木材（砍伐树木，用于建造、升级与制造武器）" : lang === "id" ? "Kayu (Tebang pohon untuk konstruksi & senjata)" : "Wood (chop trees for construction, upgrades & weapons)"}</span></div>
          <div class="help-chip"><img src="${UI}icon-stone.png" alt=""><span>${lang === "zh" ? "石头（开采石矿，加固建筑与打造石器）" : lang === "id" ? "Batu (Tambang batu untuk upgrade & peralatan batu)" : "Stone (mine rocks for advanced upgrades & stone tools)"}</span></div>
          <div class="help-chip"><img src="${UI}icon-bones.png" alt=""><span>${lang === "zh" ? "骨头（狩猎野兽获取，高级建筑与骨器材料）" : lang === "id" ? "Tulang (Diperoleh dari berburu satwa untuk senjata & bangunan)" : "Bones (harvested from hunted beasts for high-tier builds)"}</span></div>
          <div class="help-chip"><img src="${UI}pt-chief.png" alt=""><span>${lang === "zh" ? "族长传承（若族长阵亡，须立即在成年村民中推选新族长）" : lang === "id" ? "Suksesi Kepala Suku (Jika Kepala Suku gugur, pilih segera penggantinya)" : "Chief Succession (if your Chief falls, crown an adult villager immediately)"}</span></div>
        </div>
      `;
    } else if (activeHelpTab === "skills") {
      const skillsList = [
        ["heart", lang === "zh" ? "生命值" : lang === "id" ? "Kesehatan (HP)" : "Hit Points"],
        ["hunger", lang === "zh" ? "饱食度" : lang === "id" ? "Kekenyangan" : "Fullness"],
        ["sleep", lang === "zh" ? "精力值" : lang === "id" ? "Energi & Istirahat" : "Energy"],
        ["sk-spear", lang === "zh" ? "近战攻击" : lang === "id" ? "Serangan Jarak Dekat" : "Melee Attack"],
        ["sk-eyes", lang === "zh" ? "远程攻击" : lang === "id" ? "Serangan Jarak Jauh" : "Ranged Attack"],
        ["sk-bush", lang === "zh" ? "侦察隐蔽" : lang === "id" ? "Pengintaian & Kamuflase" : "Scouting"],
        ["sk-basket", lang === "zh" ? "资源采集" : lang === "id" ? "Pengumpulan Sumber Daya" : "Harvesting"],
        ["sk-hardhat", lang === "zh" ? "建造修理" : lang === "id" ? "Konstruksi & Perbaikan" : "Building"],
        ["sk-hammer", lang === "zh" ? "武器锻造" : lang === "id" ? "Penempaan Senjata" : "Weaponsmith"],
        ["sk-chef", lang === "zh" ? "烹饪料理" : lang === "id" ? "Memasak & Mengolah Makanan" : "Cooking"],
        ["sk-mask", lang === "zh" ? "萨满巫术" : lang === "id" ? "Sihir Shaman" : "Witchcraft"],
        ["sk-horseshoe", lang === "zh" ? "迪厅打碟" : lang === "id" ? "Hiburan & Tari Disko" : "DJ / Entertainment"],
      ];
      bodyHtml = `
        <p class="help-lead">${lang === "zh" ? "村民每执行一次对应工作，该项技能就会提升：" : lang === "id" ? "Keahlian penduduk meningkat setiap kali melakukan pekerjaan terkait:" : "Villagers improve their skills as they perform corresponding tasks:"}</p>
        <div class="help-skill-grid">
          ${skillsList.map(([ic, name]) => `<div class="help-skill"><img src="${UI}${ic}.png" alt=""><span>${name}</span></div>`).join("")}
        </div>
      `;
    } else if (activeHelpTab === "bestiary") {
      bodyHtml = renderBestiaryHtml(lang);
    } else {
      bodyHtml = `
        <div class="help-keys">
          <div><kbd>W A S D / ↑↓←→</kbd><span>${zh ? "移动光标 / 菜单选择" : "Move cursor / Navigate menus"}</span></div>
          <div><kbd>Enter / Space</kbd><span>${zh ? "确认 / 选择（连按两次全选屏幕单位）" : "Confirm / Select (double-press selects screen units)"}</span></div>
          <div><kbd>F / Tab</kbd><span>${zh ? "切换游戏速度（1x / 2x / 4x）" : "Cycle Game Speed (1x / 2x / 4x)"}</span></div>
          <div><kbd>. / I</kbd><span>${zh ? "轮流定位空闲族人（💤）" : "Cycle next idle villager (💤)"}</span></div>
          <div><kbd>Scroll / Pinch</kbd><span>${zh ? "鼠标滚轮或双指捏合缩放地图" : "Mouse wheel or two-finger pinch to zoom map"}</span></div>
          <div><kbd>Q</kbd><span>${zh ? "左软键（打开命令与建造栏）" : "Left Soft Key (Command & Build bar)"}</span></div>
          <div><kbd>Esc / Backspace</kbd><span>${zh ? "右软键（取消选择 / 暂停菜单）" : "Right Soft Key (Cancel / Pause menu)"}</span></div>
          <div><kbd>M / 3</kbd><span>${zh ? "打开小地图" : "Open Minimap"}</span></div>
          <div><kbd>1</kbd><span>${zh ? "跳转到最近警告位置" : "Jump to latest alert location"}</span></div>
          <div><kbd>7 / 9</kbd><span>${zh ? "长按编队，短按选中队伍" : "Hold to assign squad, tap to recall"}</span></div>
        </div>
      `;
    }
    helpDialog.innerHTML = `
      <form method="dialog">
        <div class="help-head">
          <h2>${lang === "zh" ? "部落百科与帮助" : lang === "id" ? "Ensiklopedia & Panduan Suku" : "Tribe Guide & Encyclopedia"}</h2>
          <div class="help-tabs">
            ${tabs.map((t) => `<button type="button" data-tab="${escapeHtml(t.id)}" class="help-tab${t.id === activeHelpTab ? " active" : ""}">${escapeHtml(t.label)}</button>`).join("")}
          </div>
        </div>
        <div class="help-body">${bodyHtml}</div>
        <div class="confirm-buttons"><button type="submit">${lang === "zh" ? "关闭" : lang === "id" ? "Tutup" : "Close"}</button></div>
      </form>
    `;
    for (const tabBtn of Array.from(helpDialog.querySelectorAll<HTMLButtonElement>(".help-tab"))) {
      tabBtn.addEventListener("click", () => {
        sfx.click();
        activeHelpTab = tabBtn.dataset.tab as typeof activeHelpTab;
        renderHelpDialog();
      });
    }
  };
  const openHelp = () => {
    renderHelpDialog();
    helpDialog.showModal();
  };

  const menuItems: { label: () => string; glyph: string; act: () => void; enabled?: () => boolean }[] = [
    { label: () => { const l = lang(); return l === "zh" ? "保存" : l === "id" ? "Simpan" : "Save"; }, glyph: "save", act: () => (game.screen === 10 ? ask(message(64), () => run("save")) : run("save")) },
    { label: () => { const l = lang(); return l === "zh" ? "读取" : l === "id" ? "Muat" : "Load"; }, glyph: "load", enabled: () => game.screen === 10, act: () => ask(message(63), () => { paused = false; menuList.hidden = true; run("load"); }) },
    { label: () => { const l = lang(); return l === "zh" ? "战绩" : l === "id" ? "Statistik" : "Stats"; }, glyph: "stats", act: () => { if (openRecap) openRecap(); } },
    { label: () => { const l = lang(); return l === "zh" ? "成就" : l === "id" ? "Trofi" : "Trophies"; }, glyph: "trophy", act: () => { if (openAchievements) openAchievements(); } },
    { label: () => { const l = lang(); return l === "zh" ? "设置" : l === "id" ? "Pengaturan" : "Settings"; }, glyph: "settings", act: openSettings },
    { label: () => { const l = lang(); return l === "zh" ? "帮助" : l === "id" ? "Panduan" : "Help"; }, glyph: "help", act: openHelp },
    { label: () => { const l = lang(); return l === "zh" ? "退出" : l === "id" ? "Keluar" : "Quit"; }, glyph: "quit", act: () => ask(message(65), () => { paused = false; menuList.hidden = true; run("quit"); }) },
  ];
  const menuEntries = menuItems.map((item) => {
    const entry = button("hud-menu-item", "", item.label());
    const glyphHtml = item.glyph === "trophy"
      ? `<span class="glyph hud-glyph-trophy">🏆</span>`
      : item.glyph === "stats"
      ? `<span class="glyph hud-glyph-trophy">📊</span>`
      : `<img class="glyph" src="${UI}glyph-${item.glyph}.png" alt="">`;
    entry.innerHTML = `<img class="up" src="${UI}plate-normal.png" alt=""><img class="down" src="${UI}plate-pressed.png" alt="">${glyphHtml}`;
    entry.addEventListener("click", item.act);
    menuList.append(entry);
    return { entry, item };
  });

  const tip = document.createElement("div");
  tip.className = "hud-tip";
  tip.hidden = true;
  hud.append(tip);

  const showTooltip = (el: HTMLElement, text: string, position: "left" | "top" | "bottom" = "left") => {
    if (!text) { tip.hidden = true; return; }
    const box = el.getBoundingClientRect();
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

  const attachHoverTip = (entry: HTMLElement, name: () => string, pos: "left" | "top" | "bottom" = "left") => {
    entry.addEventListener("mouseenter", () => {
      const val = name();
      entry.setAttribute("title", val);
      showTooltip(entry, val, pos);
    });
    entry.addEventListener("mouseleave", hideTooltip);
  };

  for (const { entry, item } of menuEntries) {
    attachHoverTip(entry, () => item.label(), "left");
  }
  for (const counter of counters) {
    attachHoverTip(counter.group, () => {
      const l = lang();
      return `${l === "zh" ? counter.nameZh : l === "id" ? counter.nameId : counter.nameEn}: ${counter.text}`;
    }, "bottom");
  }
  attachHoverTip(speedButton, () => (lang() === "zh" ? "游戏倍速 [F]" : lang() === "id" ? "Kecepatan Game [F]" : "Game Speed [F]"), "bottom");
  attachHoverTip(idleButton, () => (lang() === "zh" ? "空闲族人定位 [.]" : lang() === "id" ? "Cari Penduduk Menganggur [.]" : "Find Idle Villagers [.]"), "bottom");
  attachHoverTip(menuButton, () => (lang() === "zh" ? "游戏菜单" : lang() === "id" ? "Menu Permainan" : "Game Menu"), "left");

  /** A long press on `entry` shows `name` beside it (unless `hold` does something instead); the
   *  returned function tells the click that followed whether it was such a press. Also provides instant hover tooltip on desktop. */
  const longPress = (entry: HTMLElement, name: () => string, hold?: () => boolean) => {
    let timer = 0;
    let held = false;
    entry.addEventListener("mouseenter", () => {
      const val = name();
      entry.setAttribute("title", val);
      showTooltip(entry, val, "left");
    });
    entry.addEventListener("mouseleave", hideTooltip);
    entry.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
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

  // Asset names are internal constants / numeric derivations, but they still
  // pass through safeAssetName so a stray quote or path segment can never
  // break out of the src attribute (it falls back to "nothing").
  const img = (name: string, cls = "") => `<img${cls ? ` class="${escapeHtml(cls)}"` : ""} src="${UI}${safeAssetName(name)}.png" alt="">`;
  /** HD digits for a number badge. */
  const digits = (text: string) => Array.from(text, (c) => img(`digit-${c === "/" ? "slash" : c}`)).join("");

  // ---- bottom right (round 3, user 2026-10-21/22; mock-up "命令与小队"): the build button, the
  // command button above it, the squads at the right edge. Everything for the right thumb. ----
  const buildButton = button("hud-build-button", "", "Build");
  buildButton.innerHTML = img("build-a", "up") + img("build-b", "down");
  buildButton.addEventListener("click", () => touch.command([10]));
  attachHoverTip(buildButton, () => (lang() === "zh" ? "建造列表 [Q]" : lang() === "id" ? "Menu Bangun [Q]" : "Build Menu [Q]"), "left");

  // ✓ / ✕ where something waits for confirming or going back: choosing a chief, aiming a weapon or
  // spell, the building menu (select the villager), placing (back to the build list).
  const fab = button("hud-fab", "", "Confirm");
  fab.innerHTML = img("btn-tick", "tick") + img("btn-x", "back");
  fab.addEventListener("click", () => {
    if (choosing) { confirmChief(); return; }
    if (picking) { confirmPick(); return; }
    // While placing it is the way back (the right soft key: back to the build cards).
    if (game.barMode === 3) touch.pressKey(OriginalKey.SOFT_RIGHT);
  });

  // The command button: unfolds call to arms, form up, the map upwards; lit (with the running
  // command's icon at its corner) while call to arms or form up is on. The same item cancels it.
  const cmdButton = button("hud-cmd", "", "Commands");
  cmdButton.innerHTML = img("cmd-plate") + img("cmd-horn", "glyph") + img("cmd-arms", "badge");
  attachHoverTip(cmdButton, () => (lang() === "zh" ? "战术指令" : lang() === "id" ? "Perintah Suku" : "Commands"), "left");
  const cmdShade = document.createElement("div");
  cmdShade.className = "hud-cmd-shade";
  cmdShade.hidden = true;
  const cmdMenu = document.createElement("div");
  cmdMenu.className = "hud-cmd-menu";
  cmdMenu.hidden = true;
  const closeCommands = () => { cmdMenu.hidden = true; cmdShade.hidden = true; };
  cmdButton.addEventListener("click", () => { cmdMenu.hidden = !cmdMenu.hidden; cmdShade.hidden = cmdMenu.hidden; });
  cmdShade.addEventListener("click", closeCommands);
  // ---- form up (rally) and call to arms: the order's spot (ported from upstream
  // BOMBWCC/Prehistoric_Tribes_Web 29e035f, UI design "小地图、集结与备战"): the order's icon
  // stands in the middle of the screen and the cursor follows the tile under it while the map
  // is dragged (the original's w == 3 spot, f.s 100); ✓ at its top right is FIRE, then the icon
  // pops and a ring spreads. Cancelling is the same menu item, now with a cancel mark. ----
  let ordering = ""; // the order's glyph while its spot is being chosen
  const order = (glyph: string, running: boolean, codes: number[]) => {
    if (!running) ordering = glyph;
    touch.command(codes);
  };
  const orderMark = document.createElement("div");
  orderMark.className = "hud-order";
  orderMark.hidden = true;
  const orderTick = button("hud-order-tick", "", lang() === "zh" ? "确定" : lang() === "id" ? "Tentukan" : "Confirm");
  orderTick.innerHTML = img("btn-tick");
  orderTick.hidden = true;
  const orderBurst = document.createElement("div");
  orderBurst.className = "hud-order-burst";
  orderBurst.hidden = true;
  hud.append(orderMark, orderBurst, orderTick);
  let burstTimer = 0;
  orderTick.addEventListener("click", () => {
    touch.pressKey(OriginalKey.FIRE);
    orderBurst.innerHTML = `<i class="ring"></i>${img("cmd-plate", "pop")}${img(ordering, "pop glyph")}`;
    orderBurst.hidden = false;
    window.clearTimeout(burstTimer);
    burstTimer = window.setTimeout(() => { orderBurst.hidden = true; }, 900);
  });
  const commands = [
    { glyph: "cmd-arms", name: () => (game.callToArmsActive ? (isZh() ? "回去干活" : "Back to Work") : (isZh() ? "全员备战" : "Call to Arms")), active: () => game.callToArmsActive, act: () => order("cmd-arms", game.callToArmsActive, [12, 15]) },
    { glyph: "cmd-rally", name: () => (game.formUpActive ? (isZh() ? "解散" : "Dismiss") : (isZh() ? "集结" : "Form Up")), active: () => game.formUpActive, act: () => order("cmd-rally", game.formUpActive, [11, 14]) },
    {
      glyph: "spear",
      name: () => {
        const l = lang();
        if (tribeTactics.isAttackMoveActive()) {
          return l === "zh" ? "取消进攻移动" : l === "id" ? "Batal Serang" : "Cancel A-Move";
        }
        return l === "zh" ? "进攻移动 (T)" : l === "id" ? "Gerak Tempur (T)" : "Attack-Move (T)";
      },
      active: () => tribeTactics.isAttackMoveActive(),
      act: () => {
        const on = tribeTactics.toggleAttackMove();
        updateAttackMoveBanner();
        haptic.tap();
        const l = lang();
        notify(
          on
            ? l === "zh"
              ? "⚔️ 进攻移动已激活 [T]：点击地图目标挺进"
              : l === "id"
              ? "⚔️ Gerak Tempur Aktif [T]: Ketuk peta untuk maju"
              : "⚔️ Attack-Move Active [T]: Tap map tile to march"
            : l === "zh"
            ? "已取消进攻移动"
            : l === "id"
            ? "Gerak tempur dibatalkan"
            : "Attack-Move cancelled",
        );
      },
    },
    { glyph: "cmd-map", name: () => (isZh() ? "小地图" : "Minimap"), active: () => false, act: () => modals.openMinimap() },
    { glyph: "pt-man", name: () => (isZh() ? "村民名册" : "Villager Roster"), active: () => false, act: () => modals.openRoster() },
  ].map((command, index) => {
    const entry = button("hud-cmd-item", "", command.name());
    entry.innerHTML = img("cmd-plate") + img(command.glyph, "glyph");
    entry.style.setProperty("--i", String(index));
    entry.addEventListener("click", () => { closeCommands(); command.act(); });
    attachHoverTip(entry, () => command.name(), "left");
    cmdMenu.append(entry);
    return { entry, command };
  });
  const drawCommands = () => {
    const running = game.callToArmsActive ? "cmd-arms" : game.formUpActive ? "cmd-rally" : "";
    cmdButton.classList.toggle("lit", running !== "");
    const badge = cmdButton.querySelector<HTMLImageElement>(".badge")!;
    badge.hidden = running === "";
    if (running && !badge.src.endsWith(`${running}.png`)) badge.src = `${UI}${running}.png`;
    for (const { entry, command } of commands) {
      entry.setAttribute("aria-label", command.name());
      entry.classList.toggle("active", command.active());
      // Ported from upstream BOMBWCC 29e035f: a running order's item cancels it. Upstream
      // swaps the glyph for a red-cross PNG (cmd-arms-cancel / cmd-rally-cancel); this fork
      // draws the same red cross in CSS instead (styles.css .hud-cmd-item.is-cancel), so no
      // new binary asset is needed and the mark works for any cancelling command item.
      entry.classList.toggle("is-cancel", command.active());
    }
  };

  const squadCount = (row: number) => {
    const members = runtime.mainArrays.aByte[row];
    let count = 0;
    for (let i = 0; i < 50; i += 1) if ((members?.[i] ?? 0) !== 0) count += 1;
    return count;
  };
  // The squads (the original's 7 / 9 groups, f.a:[[B rows 2 / 3; user's design 2026-10-21): a head
  // with the head count at the right edge for each stored squad; a tap selects it. With villagers
  // selected and a squad free, a dashed "+" stores them there (the key held 5 ticks, which f.h()
  // counts as a hold). A long press on a squad: replace it with the selection, or disband it.
  const SQUADS = [
    { row: 2, key: OriginalKey.DIGIT_7 },
    { row: 3, key: OriginalKey.DIGIT_9 },
  ];
  type Squad = (typeof SQUADS)[number];
  const store = (squad: Squad) => touch.pressKey(squad.key, 5);
  const squadBox = document.createElement("div");
  squadBox.className = "hud-squads";
  const squadPop = document.createElement("div");
  squadPop.className = "hud-squad-pop";
  squadPop.hidden = true;
  const replaceButton = button("hud-squad-action", "", "Replace squad with selection");
  replaceButton.innerHTML = img("cmd-replace");
  const disbandButton = button("hud-squad-action", "", "Disband squad");
  disbandButton.innerHTML = img("cmd-disband");
  squadPop.append(replaceButton, disbandButton);
  let popFor: Squad | null = null;
  const closePop = () => { squadPop.hidden = true; popFor = null; };
  replaceButton.addEventListener("click", () => { if (popFor) store(popFor); closePop(); });
  // Not in the original (it only stores and recalls): the squad's member row is cleared.
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
  const squadChips = SQUADS.map((squad, index) => {
    const chip = button("hud-squad", "", `Squad ${index + 1}`);
    chip.innerHTML = `${img("pt-man", "head")}<span class="count"></span>`;
    const held = longPress(chip, () => (isZh() ? `小队${index + 1}` : `Squad ${index + 1}`), () => {
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
  plusChip.innerHTML = `${img("pt-man", "head")}<b>+</b>`;
  plusChip.addEventListener("click", () => {
    const free = SQUADS.find((squad) => squadCount(squad.row) === 0);
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
      if (text !== entry.shown) { entry.shown = text; entry.count.innerHTML = digits(text); }
    }
    plusChip.hidden = !(game.barMode === 1 && SQUADS.some((squad) => squadCount(squad.row) === 0));
  };

  hud.append(cmdShade, squadBox, squadPop, cmdMenu, cmdButton, buildButton, fab);

  // ---- left of it: the actions that apply right now ----
  const actions = document.createElement("div");
  actions.className = "hud-actions";
  hud.append(actions);
  const left = button("hud-action", "◀", "Left");
  const right = button("hud-action", "▶", "Right");
  const cancel = button("hud-action cancel", "✕", "Cancel");
  const cancelBox = button("hud-action cancel", "✕", "Cancel Box Select");
  actions.append(left, right, cancelBox, cancel);
  touch.bindKey(left, OriginalKey.LEFT);
  touch.bindKey(right, OriginalKey.RIGHT);
  // Backs out all the way: a selection, a bar, or the build cards together with the command bar
  // they were opened from (one right soft key each).
  // Aiming a weapon or spell, it goes back to the building menu only.
  cancel.addEventListener("click", () => (picking ? touch.pressKey(OriginalKey.SOFT_RIGHT) : touch.closeBars()));
  cancelBox.addEventListener("click", () => touch.cancelBox());

  // ---- the bottom sheet (round 3): one panel for the build list (and, later, the building and
  // villager panels), sliding up from the bottom, a ✕ at its top right ----
  const sheet = document.createElement("div");
  sheet.className = "hud-sheet";
  sheet.hidden = true;
  sheet.innerHTML = img("deco-grass", "deco bottom") + img("deco-vine", "deco top");
  const sheetClose = button("hud-sheet-close", "", "Close");
  sheetClose.innerHTML = img("btn-close");
  // Backs out of the build cards and the command bar they came from (right soft key, each).
  sheetClose.addEventListener("click", () => {
    if (choosing && candidate > 0) { candidate = 0; screen.candidatePanel = false; return; }
    if (picking && pickTarget > 0) { pickTarget = 0; return; }
    if (confirming) { confirming = false; return; }
    if (viewing) { viewing = 0; return; } // back to the row of several villagers
    touch.closeBars();
  });
  hud.append(sheet);

  // The build list: the original's build cards' buildings (WideScreen hides the cards), left to right
  // in their order, one size each, the price as a badge at the right (never red, ported from
  // upstream BOMBWCC 29e035f: being short does not stop the placing, user 2026-10-17, so red
  // would read as blocked), pages swiped sideways; a tap picks the card (left / right to it,
  // FIRE) and placing starts.
  const BUILDING_ICONS = ["armoury", "gym", "hut", "chiefs-hut", "kitchen", "range", "store", "disco", "sanctuary", "pia-center", "nursery", "tower"];
  const buildList = document.createElement("div");
  buildList.className = "hud-sheet-list";
  const pageDots = document.createElement("div");
  pageDots.className = "hud-sheet-dots";
  sheet.append(buildList, pageDots, sheetClose);
  /** Level-1 price of a building kind: t138 rows 10 wood, 11 stone, 12 bones (hut 15 / 5). */
  const price = (kind: number) => {
    const table = runtime.packedOffsets[T_BUILDING] ?? 0;
    return [10, 11, 12].map((row) => runtime.packedBytes[table + row * 26 + kind] ?? 0);
  };
  const RESOURCES = ["wood", "stone", "bones"];
  let shownKinds = "";
  let shownCosts = "";
  const drawBuildList = () => {
    const kinds = screen.buildKinds();
    const key = kinds.join(",");
    if (key !== shownKinds) {
      shownKinds = key;
      shownCosts = "";
      buildList.scrollLeft = 0;
      buildList.replaceChildren(...kinds.map((kind, index) => {
        const entry = document.createElement("button");
        entry.type = "button";
        entry.className = "hud-card";
        const l = lang();
        const name = l === "id" ? (BUILDING_NAMES_ID[kind] ?? capitalise(originalText(runtime, "s", kind))) : capitalise(originalText(runtime, "s", kind));
        const desc = l === "zh" ? BUILDING_DESCS_ZH[kind] : l === "id" ? BUILDING_DESCS_ID[kind] : BUILDING_DESCS_EN[kind];
        entry.setAttribute("aria-label", name);
        entry.setAttribute("title", `${name}\n${desc}`);
        entry.dataset.kind = String(kind);
        entry.innerHTML = `<span class="pic">${img(`ub-${BUILDING_ICONS[kind]}`)}</span><span class="cost"></span><span class="hud-card-name">${escapeHtml(name)}</span>`;
        entry.addEventListener("click", () => touch.pickInBar(index));
        attachHoverTip(entry, () => `${name} — ${desc}`, "top");
        return entry;
      }));
    }
    const costs = kinds.map((kind) => price(kind).join("/")).join(",");
    if (costs !== shownCosts) {
      shownCosts = costs;
      for (const entry of Array.from(buildList.children) as HTMLElement[]) {
        const need = price(Number(entry.dataset.kind));
        entry.querySelector(".cost")!.innerHTML = need
          .map((amount, i) => (amount > 0 ? `<span>${img(`icon-${RESOURCES[i]}`)}<span class="n">${digits(String(amount))}</span></span>` : ""))
          .join("");
      }
    }
    drawDots(buildList, kinds.length, 97);
  };
  /** One dot per page of a sideways list of `count` items `step` pixels apart, the shown one lit. */
  const drawDots = (list: HTMLElement, count: number, step: number) => {
    const perPage = Math.max(1, Math.floor(list.clientWidth / step));
    const pages = Math.ceil(count / perPage);
    const page = Math.round(list.scrollLeft / (perPage * step));
    if (pageDots.childElementCount !== pages) pageDots.replaceChildren(...Array.from({ length: pages }, () => document.createElement("i")));
    Array.from(pageDots.children).forEach((dot, i) => dot.classList.toggle("on", i === page));
  };
  buildList.addEventListener("scroll", () => drawBuildList());

  // ---- choosing a new chief (the original's K:Z with its row of candidates, w == 2, f.r:[B = -id):
  // HD Chief Succession Banner at the top + HD villager sheet at the bottom ----
  const chiefPrompt = document.createElement("div");
  chiefPrompt.className = "hud-chief-prompt hud-chief-banner";
  chiefPrompt.hidden = true;
  app.append(chiefPrompt);
  const candidates = () => {
    if (!game.choosingChief || game.barMode !== 2 || game.loopMode !== 1) return [];
    const row = Array.from(runtime.mainArrays.r.slice(0, game.frameLayoutAR));
    return row.length > 0 && row.every((value) => value < 0) ? row.map((value) => -value) : [];
  };
  let choosing = false;
  let candidate = 0;
  let shownChiefBanner = "";
  const focusCandidate = (villager: number) => {
    const tile = touch.villagerTile(villager);
    if (tile) touch.focus(tile[0], tile[1]);
  };
  const tapWhileChoosing = (villager: number) => {
    const list = candidates();
    const index = list.indexOf(villager);
    if (villager <= 0 || index < 0) {
      notify(runtime.language === ZH_LANGUAGE ? "只能选成年村民当族长" : "Only an adult villager can be chosen as Chief");
      return;
    }
    sfx.select();
    candidate = villager;
    viewedCells = villagerPanelOf(runtime, villager);
    viewedAt = performance.now();
    screen.candidatePanel = false;
    touch.pickInBar(index, 0);
    focusCandidate(villager);
  };
  const confirmChief = () => {
    const index = candidates().indexOf(candidate);
    if (index >= 0) {
      sfx.build();
      touch.pickInBar(index, 2);
    }
  };
  const renderChiefBanner = (list: number[]) => {
    const l = lang();
    const zh = l === "zh";
    const isId = l === "id";
    const e = runtime.denseState;
    const idx = list.indexOf(candidate);
    const key = `${zh ? 1 : isId ? 2 : 0}:${list.join(",")}:${candidate}:${candidate > 0 ? e[UNIT_HP + candidate] : 0}`;
    if (key === shownChiefBanner) return;
    shownChiefBanner = key;
    const title = isId ? "Suksesi Kepala Suku" : capitalise(originalText(runtime, "s", 41));
    if (candidate > 0 && idx >= 0) {
      const cName = capitalise(originalText(runtime, "s", 108 + (e[UNIT_NAME + candidate] ?? 0)));
      const cAge = e[UNIT_AGE + candidate] ?? 18;
      const cHp = e[UNIT_HP + candidate] ?? 0;
      const cMaxHp = Math.max(1, e[UNIT_MAX_HP + candidate] ?? 100);
      chiefPrompt.innerHTML = `
        <div class="chief-banner-top">
          <img src="${UI}pt-chief.png" alt="">
          <div class="chief-banner-meta">
            <b>${escapeHtml(title)} (${idx + 1}/${list.length})</b>
            <span>${escapeHtml(cName)} · ${zh ? `${cAge}岁` : isId ? `Usia ${cAge}` : `Age ${cAge}`} · ❤️ ${cHp}/${cMaxHp}</span>
          </div>
        </div>
        <div class="chief-banner-actions">
          <button type="button" class="chief-nav-btn" data-chief-act="prev" aria-label="${zh ? "上一位" : isId ? "Sebelumnya" : "Previous"}">◀</button>
          <button type="button" class="chief-nav-btn" data-chief-act="next" aria-label="${zh ? "下一位" : isId ? "Berikutnya" : "Next"}">▶</button>
          <button type="button" class="chief-crown-btn" data-chief-act="crown">${zh ? "👑 立为族长" : isId ? "👑 Angkat Kepala Suku" : "👑 Crown Chief"}</button>
        </div>
      `;
    } else {
      chiefPrompt.innerHTML = `
        <div class="chief-banner-top">
          <img src="${UI}pt-chief.png" alt="">
          <div class="chief-banner-meta">
            <b>${escapeHtml(title)}</b>
            <span>${zh ? `点选下方或地图上的成年村民（共 ${list.length} 人）` : isId ? `Pilih penduduk dewasa di peta (tersedia ${list.length} orang)` : `Tap an adult villager below or on the map (${list.length} eligible)`}</span>
          </div>
        </div>
        <div class="chief-banner-actions">
          <button type="button" class="chief-crown-btn" data-chief-act="best">${zh ? "👑 推选最强者" : isId ? "👑 Pilih Terkuat" : "👑 Pick Best"}</button>
        </div>
      `;
    }
    chiefPrompt.querySelector('[data-chief-act="prev"]')?.addEventListener("click", () => {
      if (list.length === 0) return;
      const nextIdx = (idx - 1 + list.length) % list.length;
      tapWhileChoosing(list[nextIdx]!);
    });
    chiefPrompt.querySelector('[data-chief-act="next"]')?.addEventListener("click", () => {
      if (list.length === 0) return;
      const nextIdx = (idx + 1) % list.length;
      tapWhileChoosing(list[nextIdx]!);
    });
    chiefPrompt.querySelector('[data-chief-act="best"]')?.addEventListener("click", () => {
      if (list.length === 0) return;
      const best = [...list].sort((a, b) => (e[UNIT_HP + b] ?? 0) - (e[UNIT_HP + a] ?? 0))[0]!;
      tapWhileChoosing(best);
    });
    chiefPrompt.querySelector('[data-chief-act="crown"]')?.addEventListener("click", () => {
      confirmChief();
    });
  };

  // ---- the building panel (round 3, user 2026-10-20/21): a building selected with one tap shows
  // its bar (f.r:[B, filled by f.Z() from aa(), ab(), ac()) in the bottom sheet, left to right:
  // demolish, repair, upgrade (or their cancels), the building's own items, the villagers inside
  // (heads whose hat shows the job). A tap does what FIRE on that item does; a villager's portrait
  // only shows them (the original's panel) and ✓ then selects them as a tap on the map does;
  // demolish turns the sheet into the question with ✓ / ✕; the armoury's weapons change their
  // count by a sideways swipe (UP / DOWN). The chief's camp shows the faint "nothing to do here". ----
  const ARMOURY = 0;
  const CHIEFS_HUT = 3;
  const label = (record: number) => capitalise(originalText(runtime, "s", record));
  const barCodes = () => Array.from(runtime.mainArrays.r.slice(0, game.frameLayoutAR));
  const buildingKind = () => runtime.denseState[BLD_KIND + game.qCounter] ?? 0;
  /** The names the bar's items have in the original's labels: weapons and traps /s 12.., the
   *  commands /s 21.. (code 10 is "build"); a villager's name /s 108 + their name index. */
  const itemName = (code: number) => (code < 0 ? label(108 + (runtime.denseState[UNIT_NAME - code] ?? 0)) : label(code <= 8 ? code + 12 : code + 11));
  /** The panel icon of a bar code (design/panels). */
  const PANEL_ICONS: Record<number, string> = {
    0: "club", 1: "stone", 2: "spear", 3: "stone-axe", 4: "bone-mace", 5: "tomahawk", 6: "net-trap", 7: "spring-trap", 8: "pit-trap",
    16: "upgrade", 17: "demolish", 19: "healing", 20: "defence", 21: "love-potion", 22: "disease",
    26: "repair", 27: "cancel-upgrade", 28: "cancel-repair", 29: "unload",
  };
  /** Left-to-right group of a bar code: demolish, repair, upgrade, own items, villagers. */
  const group = (code: number) => (code === 17 ? 0 : code === 26 || code === 28 ? 1 : code === 16 || code === 27 ? 2 : code < 0 ? 4 : 3);
  /** A villager's head in building `kind`'s panel: the chief's horns, a child; whoever works in a
   *  kitchen the cook's hat (a man's or a woman's), on a site (kinds 12..19) the builder's hard
   *  hat; else by gender (dense 1515, 0 a man). */
  const portrait = (id: number, kind: number) => {
    const e = runtime.denseState;
    if (id === (runtime.mainArrays.aShort[0]?.[17] ?? 0)) return "pt-chief";
    if ((e[UNIT_TYPE + id] ?? 0) === 17 || (e[UNIT_AGE + id] ?? 20) < 12) return "pt-child";
    const man = (e[UNIT_GENDER + id] ?? 0) === 0;
    if (kind === 4) return man ? "pt-cook" : "pt-cook-woman";
    if (kind >= 12) return "pt-builder";
    return man ? "pt-man" : "pt-woman";
  };
  const panelRow = document.createElement("div");
  panelRow.className = "hud-sheet-row";
  const confirmRow = document.createElement("div");
  confirmRow.className = "hud-sheet-confirm";
  confirmRow.innerHTML = `${img("demolish")}<span></span>`;
  const sheetTick = button("hud-sheet-tick", "", "Confirm");
  sheetTick.innerHTML = img("btn-tick");
  // An item confirming (w == 4, BUG-019): the original's own line for it ("nothing to do here" ...)
  // in the sheet, closed with its ✕.
  const noticeRow = document.createElement("div");
  noticeRow.className = "hud-sheet-confirm";
  sheet.append(panelRow, confirmRow, noticeRow, sheetTick);
  let confirming = false;
  sheetTick.addEventListener("click", () => {
    if (choosing && candidate > 0) { confirmChief(); return; }
    if (picking && pickTarget > 0) { confirmPick(); return; }
    if (confirming) {
      confirming = false;
      const at = barCodes().indexOf(17);
      if (at >= 0 && screen.buildingMenuOpen) touch.pickInBar(at, 2); // FIRE: w = 4 ... FIRE: l(-2)
      return;
    }
    selectChosen();
  });
  let shownBar = "";
  const tapBarItem = (index: number, code: number) => {
    if (code === 19) achievementManager.recordSpellCast("healing");
    else if (code === 20) achievementManager.recordSpellCast("defence");
    else if (code === 21) achievementManager.recordSpellCast("love");
    else if (code === 22) achievementManager.recordSpellCast("disease");
    if (code < 0 || (buildingKind() === ARMOURY && code <= 5)) { touch.pickInBar(index, 0); return; }
    if (code === 17) { confirming = true; return; }
    touch.pickInBar(index);
  };
  const drawBuildingMenu = () => {
    const codes = barCodes();
    const kind = buildingKind();
    const key = `${game.qCounter}:${codes.join(",")}`;
    if (key !== shownBar) {
      shownBar = key;
      confirming = false;
      const entries = codes
        .map((code, index) => ({ code, index }))
        .filter(({ code }) => !(kind === CHIEFS_HUT && code === 17))
        .sort((a, b) => group(a.code) - group(b.code) || a.index - b.index);
      const items: HTMLElement[] = [];
      if (kind === CHIEFS_HUT) {
        const nothing = document.createElement("span");
        nothing.className = "hud-item nothing";
        nothing.setAttribute("role", "img");
        nothing.setAttribute("aria-label", "这里没什么可做");
        nothing.innerHTML = img("nothing");
        items.push(nothing);
      }
      entries.forEach(({ code, index }, n) => {
        if (n > 0 && group(entries[n - 1]!.code) <= 2 && group(code) > 2) {
          const sep = document.createElement("span");
          sep.className = "hud-sep";
          items.push(sep);
        }
        const entry = document.createElement("button");
        entry.type = "button";
        entry.className = "hud-item";
        entry.dataset.index = String(index);
        entry.dataset.code = String(code);
        entry.setAttribute("aria-label", itemName(code));
        entry.innerHTML = `${img(code < 0 ? portrait(-code, kind) : PANEL_ICONS[code] ?? "nothing")}<span class="n"></span>`;
        const held = longPress(entry, () => itemName(code));
        let swiped = false;
        if (kind === ARMOURY && code >= 0 && code <= 5) {
          // A swipe to the right raises the count, to the left lowers it: one per 24 pixels.
          let start = -1;
          let applied = 0;
          entry.style.touchAction = "pan-y";
          entry.addEventListener("pointerdown", (event) => { start = event.clientX; applied = 0; swiped = false; });
          entry.addEventListener("pointermove", (event) => {
            if (start < 0) return;
            const steps = Math.trunc((event.clientX - start) / 24);
            if (steps === applied) return;
            swiped = true;
            touch.adjustInBar(index, steps - applied);
            applied = steps;
          });
          const stop = () => { start = -1; };
          entry.addEventListener("pointerup", stop);
          entry.addEventListener("pointercancel", stop);
        }
        entry.addEventListener("click", () => { if (!held() && !swiped) tapBarItem(index, code); });
        items.push(entry);
      });
      if (kind === 0 || kind === 2 || kind === 10) {
        const sep = document.createElement("span");
        sep.className = "hud-sep";
        items.push(sep);

        const currentRally = tribeTactics.getRallyPoint(game.qCounter);
        const rallyBtn = document.createElement("button");
        rallyBtn.type = "button";
        rallyBtn.className = `hud-item hud-rally-btn${currentRally ? " has-rally" : ""}`;
        const l = lang();
        rallyBtn.setAttribute("aria-label", l === "zh" ? "设置建筑集结点" : l === "id" ? "Titik Kumpul" : "Set Rally Point");
        rallyBtn.innerHTML = `<span>🚩</span><span class="rally-text">${l === "zh" ? (currentRally ? "已设点" : "集结点") : l === "id" ? (currentRally ? "Aktif" : "Kumpul") : (currentRally ? "Active" : "Rally")}</span>`;
        rallyBtn.addEventListener("click", () => {
          tribeTactics.startSettingRally(game.qCounter);
          notify(l === "zh" ? "🚩 请点击地图目标，为该建筑设定集结点位置" : l === "id" ? "🚩 Ketuk petak peta untuk memasang titik kumpul bangunan" : "🚩 Tap map tile to set Rally Point for this building");
        });
        items.push(rallyBtn);
      }
      panelRow.replaceChildren(...items);
    }
    const counts = runtime.mainArrays.s;
    for (const entry of Array.from(panelRow.querySelectorAll<HTMLElement>("button.hud-item[data-code]"))) {
      const index = Number(entry.dataset.index);
      const code = Number(entry.dataset.code);
      entry.classList.toggle("active", index === game.menuCursor && (code < 0 || (kind === ARMOURY && code <= 5)));
      const n = entry.querySelector<HTMLElement>(".n");
      if (n) {
        const text = code >= 0 && code <= 8 ? String(counts[index] ?? 0) : "";
        if (n.dataset.text !== text) { n.dataset.text = text; n.innerHTML = text ? digits(text) : ""; }
      }
    }
    const notice = game.barMode === 4 && !confirming;
    const words = notice && game.resourceSectionW === game.vInt ? capitalise(originalText(runtime, "t", runtime.shownTextRecord)) : "";
    if (noticeRow.textContent !== words) noticeRow.textContent = words;
    const confirmText = confirmRow.querySelector("span");
    if (confirmText) {
      const l = lang();
      confirmText.textContent = l === "zh" ? "是否确认拆除？" : l === "id" ? "Robohkan bangunan ini?" : "Demolish this building?";
    }
    show(panelRow, !confirming && !notice);
    show(confirmRow, confirming);
    show(noticeRow, notice);
    // ✓ left of ✕: confirming the demolish, or selecting the villager whose portrait is chosen.
    show(sheetTick, confirming || (!notice && (barCodes()[game.menuCursor] ?? 0) < 0));
  };
  /** ✓ with a villager's portrait chosen: that villager is selected. */
  const selectChosen = () => {
    const code = barCodes()[game.menuCursor] ?? 0;
    if (code < 0) touch.selectVillager(-code);
  };

  // ---- the villager panel (BUG-017; UI design "村民面板", user 2026-10-23: follow it): in the bottom
  // sheet, the portrait (hat by job, no name) and three aligned columns -- gender + age / mood + resting
  // / weapon + pouch; health, hunger, tiredness bars; the skills, two per row. What it shows is what
  // the original's panel (frame command 4) drew, read back from runtime.villagerPanel (its composites
  // and numbers by frame position), the pictures swapped for the HD ones. Several villagers: their
  // portraits in a row, each with their weapon; a tap selects that one alone. ----
  /** Skill composites (docs/hd-art-handoff.md §8): 560 + n, 577 + n the highlighted ones. */
  const SKILLS: Record<number, string> = {
    561: "basket", 562: "basket-wood", 563: "basket-meat", 564: "basket-ice", 565: "basket-stone", 566: "basket-mushroom",
    567: "basket-bone", 568: "hammer", 569: "chef", 570: "horseshoe", 571: "mask", 572: "hardhat", 573: "bush", 574: "spark",
    575: "spear", 576: "eyes",
  };
  const WEAPON_BASE = 659; // + the held item (0..8; 9 none draws nothing)
  const MOOD_BASE = 674; // 675 (angriest) .. 679 (happiest): the HD mood-5 .. mood-1
  const villagerBox = document.createElement("div");
  villagerBox.className = "hud-villager";
  const groupRow = document.createElement("div");
  groupRow.className = "hud-sheet-row hud-group";
  sheet.append(villagerBox, groupRow);
  const cellImg = (name: string, cls = "") => img(name, cls);
  const statBar = (icon: string, part: number, number = "") =>
    `<span class="hud-stat">${cellImg(icon)}<span class="hud-meter"><i style="width:${Math.round(Math.max(0, Math.min(1, part)) * 100)}%"></i></span>${number ? `<span class="n">${digits(number)}</span>` : ""}</span>`;
  const cell = (icon: string, number = "", cls = "") => `<span class="hud-cell ${cls}">${icon ? cellImg(icon) : ""}${number ? `<span class="n">${digits(number)}</span>` : ""}</span>`;
  let shownVillager = "";
  const drawVillager = (id: number, cells: typeof runtime.villagerPanel) => {
    const e = runtime.denseState;
    const key = `${id}:${cells.map((c) => `${c.asset}${c.text}@${c.x},${c.y}`).join(" ")}:${e[UNIT_HP + id]}:${e[UNIT_FOOD + id]}:${e[UNIT_ENERGY + id]}`;
    if (key === shownVillager) return;
    shownVillager = key;
    const textAt = (x: number, y: number) => cells.find((c) => c.asset < 0 && Math.abs(c.x - x) <= 3 && Math.abs(c.y - y) <= 3)?.text ?? "";
    const asset = (test: (asset: number) => boolean) => cells.find((c) => c.asset >= 0 && test(c.asset));
    const gender = asset((a) => a === 619 || a === 620);
    const mood = asset((a) => a > MOOD_BASE && a <= MOOD_BASE + 5);
    const rest = asset((a) => a === 560 || a === 577);
    const weapon = asset((a) => a >= WEAPON_BASE && a < WEAPON_BASE + 9);
    const pouch = asset((a) => a >= 625 && a <= 629);
    // The skills: each number right of the panel's middle, with the icon just left of it; the one
    // without an icon is speed (its legs are part of the panel's background).
    const skills = cells
      .filter((c) => c.asset < 0 && c.x >= 160)
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((c) => {
        const icon = cells.find((d) => d.asset >= 0 && Math.abs(d.y - c.y) <= 1 && c.x - d.x >= 10 && c.x - d.x <= 20);
        const base = icon ? (icon.asset >= 577 ? icon.asset - 17 : icon.asset) : -1;
        if (icon && !SKILLS[base]) oldArt.note("村民面板 技能", `组合图 ${icon.asset}`);
        return cell(icon ? `sk-${SKILLS[base] ?? "z"}` : "sk-legs", c.text, icon && icon.asset >= 577 ? "lit" : "");
      });
    const age = gender ? textAt(gender.x + 24, gender.y + 1) : "";
    const carried = pouch ? textAt(pouch.x + 15, pouch.y) : "";
    const maxHp = Math.max(1, e[UNIT_MAX_HP + id] ?? 1);
    const row = (...items: string[]) => `<span class="hud-row">${items.join("")}</span>`;
    villagerBox.innerHTML = `${cellImg(portrait(id, -1), "face")}<span class="hud-cols">
      <span class="hud-col">${row(cell(gender?.asset === 619 ? "male" : "female", age))}${row(cell(mood ? `mood-${MOOD_BASE + 6 - mood.asset}` : ""), rest ? cell("zzz", "", rest.asset === 577 ? "lit" : "faint") : "")}${row(cell(weapon ? PANEL_ICONS[weapon.asset - WEAPON_BASE] ?? "empty-hand" : "empty-hand"), cell("pouch", carried, pouch && pouch.asset !== 625 ? "" : "faint"))}</span>
      <span class="hud-col bars">${statBar("heart", (e[UNIT_HP + id] ?? 0) / maxHp, String(e[UNIT_HP + id] ?? 0))}${statBar("hunger", (e[UNIT_FOOD + id] ?? 0) / 99)}${statBar("sleep", (e[UNIT_ENERGY + id] ?? 0) / 99)}</span>
      <span class="hud-col skills">${skills.join("")}</span></span>`;
  };
  /** Our villagers selected together (f.e 909 + id set; f.k 0 then). */
  const groupIds = () => {
    const e = runtime.denseState;
    const ids: number[] = [];
    for (let id = 1; id <= 50; id += 1) if ((e[UNIT_SELECTION + id] ?? 0) > 0) ids.push(id);
    return ids;
  };
  let shownGroup = "";
  const drawGroup = (ids: number[]) => {
    const e = runtime.denseState;
    const key = `${choosing ? "chief:" : "group:"}${ids.map((id) => `${id}:${e[UNIT_HELD_ITEM + id]}`).join(",")}`;
    if (key === shownGroup) return;
    shownGroup = key;
    groupRow.replaceChildren(...ids.map((id) => {
      const entry = document.createElement("button");
      entry.type = "button";
      entry.className = "hud-item hud-member";
      entry.setAttribute("aria-label", label(108 + (e[UNIT_NAME + id] ?? 0)));
      const held = e[UNIT_HELD_ITEM + id] ?? 9;
      entry.innerHTML = `${img(portrait(id, -1))}${img(PANEL_ICONS[held] && held < 9 ? PANEL_ICONS[held]! : "empty-hand", "weapon")}`;
      entry.addEventListener("click", () => {
        if (choosing) {
          tapWhileChoosing(id);
          return;
        }
        viewing = id;
        viewedCells = villagerPanelOf(runtime, id);
        viewedAt = performance.now();
      });
      return entry;
    }));
  };
  groupRow.addEventListener("scroll", () => drawDots(groupRow, groupRow.childElementCount, 66));
  // One of several selected villagers shown alone (UI design "多选：看单人（返回）", 2026-10-23): the
  // selection stays as it is; their panel is the original's, drawn privately (villagerPanelOf),
  // again every few seconds while it shows; ✕ turns into back.
  let viewing = 0;
  let viewedCells: typeof runtime.villagerPanel = [];
  let viewedAt = 0;
  const VIEW_REFRESH_MS = 2000;

  // ---- aiming a building's item at a villager (w == 3 with the building's bar behind it, slot 2):
  // the store's weapons (f.s = -code - 1) and the sanctuary's healing, defence, love potion
  // (f.s 0..2). A tap on a villager marks them with the item's picture; ✓ sends the cursor there and
  // FIRE (f.x() gives the order), then back to the building menu. ----
  const prompt = document.createElement("div");
  prompt.className = "hud-chief-prompt";
  prompt.hidden = true;
  app.append(prompt);
  const marker = document.createElement("img");
  marker.className = "hud-pick-marker";
  marker.alt = "";
  marker.hidden = true;
  app.append(marker);
  /** The bar code being aimed (a weapon 0..5 or a spell 19..21), or -1. */
  const pickCode = () => {
    if (game.loopMode !== 1 || game.barMode !== 3 || !game.selectionFlags[2]) return -1;
    if (game.cSInt < 0) return -game.cSInt - 1;
    return game.cSInt <= 2 ? 19 + game.cSInt : -1;
  };
  let picking = false;
  let pickTarget = 0;
  const confirmPick = () => {
    const tile = pickTarget > 0 ? touch.villagerTile(pickTarget) : null;
    if (tile) {
      const code = pickCode();
      if (code === 19) achievementManager.recordSpellCast("healing");
      else if (code === 20) achievementManager.recordSpellCast("defence");
      else if (code === 21) achievementManager.recordSpellCast("love");
      else if (code === 22) achievementManager.recordSpellCast("disease");
      touch.fireAt(tile[0], tile[1]);
    }
    pickTarget = 0;
  };

  // ---- placing a building (ported from upstream BOMBWCC 29e035f, UI design "放置建筑"):
  // the building's level-1 HD picture as a ghost over its footprint, a green patch under it, a
  // tick at its top right; where the original does not allow it (c(int,int)'s r:Z, its "!"
  // instead of the arrow) the ghost and patch turn red and the tick grey, and a tap on it does
  // nothing. The ghost is dragged to move it (TouchControls grip); the original's own preview
  // is not drawn (render/WideView.ts). Fork difference from upstream: the tick keeps this
  // fork's "Place Building" label and only plays the build sound when the site is valid. ----
  const ghost = document.createElement("div");
  ghost.className = "hud-ghost";
  ghost.hidden = true;
  ghost.innerHTML = '<i class="patch"></i><img alt="" draggable="false">';
  const ghostPatch = ghost.querySelector<HTMLElement>(".patch")!;
  const ghostPicture = ghost.querySelector<HTMLImageElement>("img")!;
  const placeTick = button("hud-place", "", "Place Building");
  placeTick.innerHTML = img("btn-tick");
  placeTick.hidden = true;
  app.append(ghost, placeTick);
  placeTick.addEventListener("click", () => { if (game.cRFlag) { sfx.build(); touch.pressKey(OriginalKey.FIRE); } });
  /** The building kind (0..11) whose site f.s places: t138[416 + kind] (S.site's table), or -1. */
  const placedKind = (s: number) => {
    const table = runtime.packedOffsets[T_BUILDING] ?? 0;
    for (let kind = 0; kind < 12; kind += 1) if ((runtime.packedBytes[table + 416 + kind] ?? -1) === s) return kind;
    return -1;
  };
  // ---- touch play's action icon (ported from upstream BOMBWCC 3b37af1, user 2026-10-26):
  // the order a tap just gave (move, gather, attack, enter ... -- the original's icon beside its
  // hand, RenderRuntime.touchAction), in HD, centred on the cursor's tile and larger. ----
  const actionIcon = document.createElement("img");
  actionIcon.className = "hud-action-icon";
  actionIcon.alt = "";
  actionIcon.hidden = true;
  app.append(actionIcon);
  const ACTION_FRAMES: Record<number, number> = { 35: 5 }; // the move arrows' animation
  const ACTION_SIZE = 1.4; // tiles
  const ACTION_FLASH_MS = 800;
  /** One selected villager's job, for the icon that stays on it (ported from upstream 3b37af1,
   *  user 2026-10-26): his work spot -- the original's return position (6262 / 6363: the tree,
   *  rock, bush or fish he keeps going back to, or where he was sent) -- or the animal he hunts
   *  (his target, 3131 / 3232), with the icon the original's cursor shows on that cell (c(int,int):
   *  44 tree, 45 rock, 46 bones, 43 the other resources and animals); plain ground while he walks
   *  there: the move arrows. Children, idlers and work inside buildings show nothing. */
  const jobIcon = (id: number): { icon: number; tx: number; ty: number } | null => {
    const e = runtime.denseState;
    if ((e[UNIT_TYPE + id] ?? 0) === 17) return null;
    const cell = (x: number, y: number) => runtime.gridC[y]?.[x] ?? 0;
    const tx = e[UNIT_TARGET_X + id] ?? 0;
    const ty = e[UNIT_TARGET_Y + id] ?? 0;
    const target = cell(tx, ty);
    if (target >= 101 && target <= 122) return { icon: 43, tx, ty };
    const hx = e[UNIT_HOME_X + id] ?? 0;
    const hy = e[UNIT_HOME_Y + id] ?? 0;
    const home = cell(hx, hy);
    if (home === -124) return { icon: 44, tx: hx, ty: hy };
    if (home === -125) return { icon: 45, tx: hx, ty: hy };
    if (home <= -61 && home >= -110) return { icon: (e[RES_KIND - (home + 61)] ?? 0) === 7 ? 46 : 43, tx: hx, ty: hy };
    const away = (e[UNIT_X + id] ?? 0) !== hx || (e[UNIT_Y + id] ?? 0) !== hy;
    if (home === 0 && away && touch.villagerTile(id)) return { icon: 35, tx: hx, ty: hy };
    return null;
  };
  /** Every display frame: keeps the tick on the footprint while the map is dragged. */
  const track = () => {
    // Shown for a moment after a tap: the order a tap gives (one tap, user 2026-10-26); with one
    // villager selected, his job's icon stays on it.
    const onMap = screen.touchPlay && game.loopMode === 1 && game.barMode === 1 && !screen.frozen;
    const recent = performance.now() - lastTouch < ACTION_FLASH_MS;
    const flash = recent && onMap ? touchAction.icon : 0;
    const job = !flash && onMap && screen.villagerSheet ? jobIcon(game.selectedId) : null;
    const icon = flash || job?.icon || 0;
    actionIcon.hidden = icon === 0;
    if (icon) {
      const frames = ACTION_FRAMES[icon] ?? 1;
      const src = `hd/effects/${icon}-${frames > 1 ? Math.floor(performance.now() / 150) % frames : 0}.png`;
      if (!actionIcon.src.endsWith(src)) actionIcon.src = src;
      const at = job ? screen.tileToCss(job.tx, job.ty) : screen.tileToCss(game.cameraColumn + game.cursorColumn, game.cameraRow + game.cursorRow);
      const tile = screen.tileToCss(1, 1).x - screen.tileToCss(0, 0).x;
      const size = tile * ACTION_SIZE;
      Object.assign(actionIcon.style, { left: `${at.x + tile / 2 - size / 2}px`, top: `${at.y + (tile * 16) / 22 / 2 - size / 2}px`, width: `${size}px`, height: `${size}px` });
    }
    // The aimed item over the chosen villager's head.
    const tile = picking && pickTarget > 0 ? touch.villagerTile(pickTarget) : null;
    marker.hidden = !tile || screen.frozen;
    if (tile) {
      const head = screen.tileToCss(tile[0], tile[1]);
      const k = screen.tileToCss(1, 1).x - screen.tileToCss(0, 0).x; // CSS pixels per 22 game pixels
      marker.style.left = `${head.x + k / 2}px`;
      marker.style.top = `${head.y - k * 0.35}px`;
    }
    if (!orderMark.hidden) {
      const [tx, ty] = screen.centreTile();
      if (tx !== game.cameraColumn + game.cursorColumn || ty !== game.cameraRow + game.cursorRow) touch.aim(tx, ty);
    }
    const area = touch.footprint();
    const kind = area ? placedKind(game.cSInt) : -1;
    if (!area || kind < 0 || screen.frozen || picking || !orderMark.hidden) { placeTick.hidden = true; ghost.hidden = true; return; }
    const from = screen.tileToCss(area.column, area.row);
    const to = screen.tileToCss(area.column + area.columns, area.row + area.rows);
    const blocked = !game.cRFlag;
    ghost.classList.toggle("blocked", blocked);
    placeTick.classList.toggle("blocked", blocked);
    placeTick.setAttribute("aria-disabled", String(blocked));
    Object.assign(ghostPatch.style, { left: `${from.x}px`, top: `${from.y}px`, width: `${to.x - from.x}px`, height: `${to.y - from.y}px` });
    const src = `hd/buildings/${kind}-1.png`;
    if (!ghostPicture.src.endsWith(src)) ghostPicture.src = src;
    // The picture at the map's scale: its pixels / the HD scale = game pixels, standing on the footprint.
    const cssPerGame = (screen.tileToCss(1, 0).x - screen.tileToCss(0, 0).x) / 22;
    const k = hdArt.scale(runtime);
    const w = (ghostPicture.naturalWidth / k) * cssPerGame;
    const h = (ghostPicture.naturalHeight / k) * cssPerGame;
    const left = (from.x + to.x) / 2 - w / 2;
    const top = to.y - h;
    Object.assign(ghostPicture.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
    ghost.hidden = false;
    const size = 40;
    const width = screen.element.clientWidth;
    placeTick.style.left = `${Math.max(4, Math.min(width - size - 4, left + w - size / 2))}px`;
    placeTick.style.top = `${Math.max(4, top - size / 2)}px`;
    placeTick.hidden = false;
  };

  const show = (element: HTMLElement, on: boolean) => { element.hidden = !on; };
  // A scripted scene (Q 17 / 20) from the map ends what was going on there (ported from upstream
  // BOMBWCC 29e035f, BUG-010, user 2026-10-16): back on the map, placing and selections are
  // closed. Not when the player's own tap just led to it (a villager's answer, Q 20) -- the
  // original keeps them, and so does play that has not touched the screen (keys, replays).
  // Counted in game ticks, not wall time (refined in upstream BOMBWCC 3b37af1): the same taps
  // give the same game however fast it runs (a slow phone, the scenario tests).
  let lastTouch = -Infinity; // ms, for the action icon's flash only
  let ticks = 0;
  let lastTouchTick = -1;
  const SCENE_AFTER_TAP_TICKS = 12; // about 1.5 s
  document.addEventListener("pointerdown", () => { lastTouch = performance.now(); lastTouchTick = ticks; }, true);
  let sceneFromMap = false;
  let wasOnMap = false;
  // Nothing shows before the game's first frame (the splash, the start-up questions).
  for (const element of [menuButton, speedButton, idleButton, fab, actions]) element.hidden = true;

  return {
    track,
    openHelp,
    update() {
      modals.update();
      ticks += 1;
      const nowOnMap = game.loopMode === 1;
      if (wasOnMap && !nowOnMap && (game.screen === 17 || game.screen === 20) && lastTouchTick >= 0 && ticks - lastTouchTick > SCENE_AFTER_TAP_TICKS) sceneFromMap = true;
      if (nowOnMap && sceneFromMap) { sceneFromMap = false; if (game.barMode !== 0 && !game.choosingChief) touch.closeBars(); }
      wasOnMap = nowOnMap;
      // Choosing a chief: take the map taps and show the HD candidate row / HD villager panel in the bottom sheet.
      const chiefList = candidates();
      const nowChoosing = chiefList.length > 0;
      if (nowChoosing !== choosing) {
        choosing = nowChoosing;
        touch.setMapTapHandler(choosing ? tapWhileChoosing : null);
        chiefPrompt.hidden = !choosing;
        candidate = 0;
        shownChiefBanner = "";
        screen.candidatePanel = false;
      }
      if (choosing) {
        renderChiefBanner(chiefList);
      }
      const code = pickCode();
      if ((code >= 0) !== picking) {
        picking = code >= 0;
        pickTarget = 0;
        if (picking) {
          const hdIcon = PANEL_ICONS[code] ?? "nothing";
          marker.src = `${UI}${hdIcon}.png`;
          marker.width = 40;
          marker.height = 40;
          const promptSuffix = runtime.language === ZH_LANGUAGE ? "：点选目标村民" : ": Tap a target villager";
          prompt.textContent = `${itemName(code)}${promptSuffix}`;
        }
        prompt.hidden = !picking;
        touch.setMapTapHandler(picking ? (villager) => {
          if (villager > 0) {
            pickTarget = villager;
            viewedCells = villagerPanelOf(runtime, villager);
            viewedAt = performance.now();
          }
        } : null);
      }
      screen.scripting = touch.busy && game.loopMode === 1;
      const layout = screen.hudLayout();
      const onMap = layout !== null && game.loopMode === 1 && !choosing;
      if (layout) {
        hud.style.setProperty("--hud-bar-top", `${layout.barTop}px`);
        hud.style.setProperty("--hud-safe-bottom", `${layout.safeBottom}px`);
        hud.style.setProperty("--hud-bottom", `${layout.bottomPanels}px`);
        app.style.setProperty("--hud-panels-bottom", `${layout.panelsBottom}px`);
      }
      // The pause menu's screens leave the map (v:B 0); the menu shows over them.
      // Resumed another way (keys) -- not while openPause() is still backing out of a selection
      // on the map (BUG-011: that cleared the still screen and showed the original's menu).
      if (paused && game.loopMode === 1 && !touch.busy) paused = false;
      // The still screen covers the pause menu, its prompts (Q 16) and messages (Q 21); it goes once
      // the game is back on the map or elsewhere (Quit), and while the help pages are open.
      if (help === "asked" && !inPauseMenu()) help = "shown";
      if (help === "shown" && inPauseMenu()) { help = "no"; screen.frozen = true; }
      if (stillIsMine && !paused && (game.loopMode === 1 || ![10, 11, 16, 21].includes(game.screen))) {
        screen.frozen = false;
        stillIsMine = false;
      }
      // The bar stays over the game menu's still screen (the original's own bar was part of it).
      show(menuButton, (layout !== null || paused) && !choosing);
      show(speedButton, layout !== null && !paused && !choosing);
      if (layout !== null) syncSpeedButton();
      if (layout !== null && !paused && !choosing) {
        const idleList = getIdleVillagers();
        const idleCount = idleList.length;
        idleCountSpan.textContent = String(idleCount);
        idleButton.classList.toggle("has-idle", idleCount > 0);
        idleButton.setAttribute(
          "aria-label",
          isZh()
            ? `空闲族人：${idleCount}人（点击轮流定位）`
            : `Idle villagers: ${idleCount} (Tap to cycle)`,
        );
        show(idleButton, true);
      } else {
        show(idleButton, false);
      }
      menuList.hidden = !(paused && inPauseMenu() && help === "no");
      menuShade.hidden = menuList.hidden;
      menuButton.classList.toggle("open", paused);
      show(bar, layout !== null || paused);
      if (layout) drawCounts();
      for (const { entry, item } of menuEntries) entry.disabled = item.enabled ? !item.enabled() : false;
      const w = game.barMode;
      const building = onMap && screen.buildCardsOpen;
      const menu = onMap && screen.buildingMenuOpen;
      // The plain map (nothing open, at most villagers selected): build, commands, squads.
      const plain = onMap && (w === 0 || w === 1) && !picking && !menu;
      const group = plain && w === 1 && game.selectedId === 0 ? groupIds() : [];
      if (!group.includes(viewing)) viewing = 0;
      const single = plain && w === 1 && game.selectedId > 0 && !!game.selectionFlags[4] && runtime.villagerPanel.length > 0;
      const inspectedId = choosing ? candidate : picking ? pickTarget : viewing;
      const villager = single || inspectedId > 0;
      const showGroupRow = (!choosing && group.length > 1 && !viewing) || (choosing && candidate === 0 && chiefList.length > 0);
      const activeGroup = choosing ? chiefList : group;
      screen.villagerSheet = single || choosing;
      show(villagerBox, villager);
      show(groupRow, showGroupRow);
      show(pageDots, building || showGroupRow);
      if (inspectedId > 0 && performance.now() - viewedAt > VIEW_REFRESH_MS) {
        viewedCells = villagerPanelOf(runtime, inspectedId);
        viewedAt = performance.now();
      }
      if (villager) drawVillager(inspectedId || game.selectedId, inspectedId ? viewedCells : runtime.villagerPanel); else shownVillager = "";
      if (showGroupRow) { drawGroup(activeGroup); drawDots(groupRow, activeGroup.length, 66); } else shownGroup = "";
      const isBackIcon = viewing > 0 || (choosing && candidate > 0) || (picking && pickTarget > 0);
      const closeIcon = isBackIcon ? "back" : "btn-close";
      if (sheetClose.dataset.icon !== closeIcon) {
        sheetClose.dataset.icon = closeIcon;
        sheetClose.innerHTML = img(closeIcon);
        sheetClose.setAttribute("aria-label", isBackIcon ? (isZh() ? "返回" : "Back") : (isZh() ? "关闭" : "Close"));
      }
      show(sheetClose, !choosing || candidate > 0);
      // A villager panel up: no build or command button (user, 2026-10-23, as with the building
      // panel); the squads stay, above the sheet (their "+" needs the selection).
      const sheetUp = villager || showGroupRow;
      show(buildButton, plain && !sheetUp);
      show(cmdButton, plain && !sheetUp);
      show(squadBox, plain);
      if (!plain || sheetUp) closeCommands();
      if (!plain) closePop();
      if (plain) { drawCommands(); drawSquads(); }
      if (sheetUp || choosing) hud.style.setProperty("--hud-bottom", `${Math.max(layout?.bottomPanels ?? 0, SHEET_HEIGHT)}px`);
      show(sheet, building || menu || villager || showGroupRow);
      show(buildList, building);
      if (building) drawBuildList();
      if (!menu) {
        shownBar = "";
        confirming = false;
        show(panelRow, false);
        show(confirmRow, false);
        show(noticeRow, false);
        show(sheetTick, (choosing && candidate > 0) || (picking && pickTarget > 0));
      }
      // Choosing an order's spot (ported from upstream BOMBWCC 29e035f): the icon in the
      // middle, its ✓; map taps do nothing (drag instead).
      if (!touch.busy && w !== 3) ordering = "";
      const aiming = onMap && w === 3 && game.cSInt === 100 && ordering !== "";
      if (aiming !== !orderMark.hidden) {
        orderMark.hidden = !aiming;
        orderTick.hidden = !aiming;
        if (aiming) orderMark.innerHTML = img("cmd-plate") + img(ordering, "glyph");
        if (!picking && !choosing) touch.setMapTapHandler(aiming ? () => {} : null);
      }
      // ✓ / ✕: choosing a chief, aiming at a villager (✓); placing (✕, back).
      const tick = choosing || picking;
      show(fab, tick || (onMap && w === 3));
      fab.classList.toggle("is-tick", tick);
      fab.setAttribute("aria-label", choosing ? (isZh() ? "定为族长" : "Confirm Chief") : tick ? (isZh() ? "确定" : "Confirm") : (isZh() ? "返回" : "Back"));
      fab.disabled = choosing ? candidate === 0 : picking ? pickTarget === 0 : false;
      if (choosing) {
        show(actions, false);
        return;
      }
      show(actions, onMap && !building && !menu && !villager && group.length < 2 && !touch.busy);
      if (!onMap) return;
      if (menu) drawBuildingMenu();
      show(left, w === 2 && !building && !menu);
      show(right, w === 2 && !building && !menu);
      show(cancelBox, touch.boxing);
      show(cancel, !touch.boxing && ((w !== 0 && w !== 3) || picking));
      cancel.setAttribute("aria-label", w === 1 ? (isZh() ? "取消选择" : "Deselect") : (isZh() ? "取消" : "Cancel"));
    },
  };
}
