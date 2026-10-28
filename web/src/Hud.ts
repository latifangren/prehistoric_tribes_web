import { readStorage } from "./platform/Storage";
import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { OriginalKey } from "./platform/Input";
import { sfx } from "./platform/SoundEffects";
import { haptic } from "./platform/Haptic";
import { ZH_LANGUAGE } from "./text/LegacyZhText";
import { capitalise, originalText } from "./OriginalText";
import { escapeHtml, safeAssetName } from "./platform/Html";
import { T_BUILDING } from "./core/DataTables";
import { BLD_KIND, UNIT_AGE, UNIT_GENDER, UNIT_HP, UNIT_MAX_HP, UNIT_NAME, UNIT_SELECTION, UNIT_TYPE } from "./core/DenseLayout";
import type { TouchControls } from "./TouchControls";
import { attachTribeModals } from "./TribeModals";
import type { WideScreen } from "./WideScreen";
import { villagerPanelOf } from "./render/WideView";
import { achievementManager } from "./Achievements";
import { tribeTactics } from "./combat/TribeTactics";
import { createHudPlacementOverlay } from "./hud/PlacementOverlay";
import { createBuildList } from "./hud/BuildList";
import { createVillagerPanel } from "./hud/VillagerPanel";
import { createRightThumbControls } from "./hud/RightThumbControls";
import { createHudTopBar } from "./hud/TopBar";
import { createHudTooltips } from "./hud/Tooltips";
import { createHudPauseMenu } from "./hud/PauseMenu";

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
  const { attachHoverTip, longPress } = createHudTooltips(hud);

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
  const lang = () => (runtime.language === ZH_LANGUAGE ? "zh" : (readStorage("pt.language") === "id" ? "id" : "en"));
  const isZh = () => runtime.language === ZH_LANGUAGE;
  const topBar = createHudTopBar(runtime, screen, touch, () => modals.openRoster(), notify, lang, isZh, button, attachHoverTip, speedControl);
  const { bar, speedButton, idleButton } = topBar;

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


  window.addEventListener("keydown", (event) => {
    if (document.querySelector("dialog[open]")) return;
    if ((event.key === "t" || event.key === "T" || (event.altKey && (event.key === "a" || event.key === "A"))) && game.loopMode === 1 && !screen.frozen) {
      event.preventDefault();
      const on = tribeTactics.toggleAttackMove();
      updateAttackMoveBanner();
      notify(on
        ? isZh() ? "⚔️ 进攻移动已激活 [T]：点击地图目标挺进" : "⚔️ Attack-Move Active [T]: Tap map tile to march"
        : isZh() ? "已取消进攻移动" : "Attack-Move cancelled");
    } else if (event.key === "Escape" && tribeTactics.isAttackMoveActive()) {
      tribeTactics.cancelAttackMove();
      updateAttackMoveBanner();
      notify(isZh() ? "已取消进攻移动" : "Attack-Move cancelled");
    }
  });

  const pauseMenu = createHudPauseMenu(app, runtime, screen, touch, button, lang, openSettings, notify, attachHoverTip, openAchievements, openRecap);
  const { menuButton, menuList, menuShade, openHelp } = pauseMenu;
  hud.append(menuShade, menuList, bar, idleButton, speedButton, menuButton);
  attachHoverTip(speedButton, () => (lang() === "zh" ? "游戏倍速 [F]" : lang() === "id" ? "Kecepatan Game [F]" : "Game Speed [F]"), "bottom");
  attachHoverTip(idleButton, () => (lang() === "zh" ? "空闲族人定位 [.]" : lang() === "id" ? "Cari Penduduk Menganggur [.]" : "Find Idle Villagers [.]"), "bottom");

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
  attachHoverTip(buildButton, () => (lang() === "zh" ? "建造列表" : lang() === "id" ? "Menu Bangun" : "Build Menu"), "left");

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
  const rightThumb = createRightThumbControls({
    hud,
    runtime,
    touch,
    modals,
    language: lang,
    isChinese: isZh,
    notify,
    startOrder: order,
    updateAttackMoveBanner,
    button,
    image: img,
    attachHoverTip,
    longPress,
  });
  const { cmdButton, squadBox, closeCommands, closePop, drawCommands, drawSquads } = rightThumb;

  hud.append(buildButton, fab);

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
  const buildListPanel = createBuildList(sheet, runtime, screen, lang, button, (index) => touch.pickInBar(index), attachHoverTip);
  const { element: buildList, pageDots } = buildListPanel;
  sheet.append(sheetClose);

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
  panelRow.addEventListener("wheel", (event) => {
    if (event.deltaY !== 0 || event.deltaX !== 0) {
      event.preventDefault();
      panelRow.scrollLeft += (event.deltaY || event.deltaX) * 1.5;
    }
  }, { passive: false });
  let panelDown = false;
  let panelStartX = 0;
  let panelScrollX = 0;
  panelRow.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement).closest(".craft-btn")) return;
    panelDown = true;
    panelStartX = e.clientX;
    panelScrollX = panelRow.scrollLeft;
  });
  window.addEventListener("pointerup", () => { panelDown = false; });
  panelRow.addEventListener("pointermove", (e) => {
    if (!panelDown) return;
    const dx = e.clientX - panelStartX;
    if (Math.abs(dx) > 3) panelRow.scrollLeft = panelScrollX - dx;
  });
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
    if (buildingKind() === ARMOURY && code >= 6 && code <= 8) {
      const l = lang();
      notify(l === "zh" ? "🚩 请点击地图目标，然后按 ✓ 放置陷阱" : l === "id" ? "🚩 Ketuk petak peta lalu tekan ✓ untuk memasang jebakan" : "🚩 Tap map tile then press ✓ to deploy trap");
    }
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
        const isWeapon = kind === ARMOURY && code >= 0 && code <= 5;
        const entry = document.createElement("button");
        entry.type = "button";
        entry.className = `hud-item${isWeapon ? " has-stepper" : ""}`;
        entry.dataset.index = String(index);
        entry.dataset.code = String(code);
        entry.setAttribute("aria-label", itemName(code));
        entry.innerHTML = `${img(code < 0 ? portrait(-code, kind) : PANEL_ICONS[code] ?? "nothing")}<span class="n"></span>${
          isWeapon
            ? '<span class="craft-stepper"><i class="craft-btn minus" role="button" aria-label="Decrease">−</i><i class="craft-btn plus" role="button" aria-label="Increase">+</i></span>'
            : ""
        }`;
        const held = longPress(entry, () => itemName(code));
        if (isWeapon) {
          entry.addEventListener("wheel", (event) => {
            event.preventDefault();
            event.stopPropagation();
            sfx.click();
            touch.adjustInBar(index, event.deltaY < 0 ? 1 : -1);
          }, { passive: false });
        }
        entry.addEventListener("click", (event) => {
          if (held()) return;
          const target = event.target as HTMLElement;
          if (target.closest(".minus")) {
            event.stopPropagation();
            sfx.click();
            touch.adjustInBar(index, -1);
            return;
          }
          if (target.closest(".plus")) {
            event.stopPropagation();
            sfx.click();
            touch.adjustInBar(index, 1);
            return;
          }
          if (isWeapon) {
            sfx.click();
            touch.adjustInBar(index, 1);
            return;
          }
          tapBarItem(index, code);
        });
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

  let viewing = 0;
  const villagerPanel = createVillagerPanel({
    sheet,
    pageDots,
    runtime,
    image: img,
    digits,
    label,
    portrait,
    panelIcons: PANEL_ICONS,
    onChoose: (id) => tapWhileChoosing(id),
    onInspect: (id) => { viewing = id; },
  });
  const { villagerBox, groupRow, drawVillager, drawGroup } = villagerPanel;
  const groupIds = () => {
    const e = runtime.denseState;
    const ids: number[] = [];
    if (game.selectionGroup < 0) return ids;
    for (let id = 1; id <= 50; id += 1) if ((e[UNIT_SELECTION + id] ?? 0) === game.selectionGroup) ids.push(id);
    return ids;
  };
  let viewedId = 0;
  let viewedCells: typeof runtime.villagerPanelDraft = [];
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
  /** The bar code being aimed (a weapon 0..5 or a spell 19..21), or -1. */
  const pickCode = () => {
    if (game.loopMode !== 1 || game.barMode !== 3 || !game.selectionFlags[2]) return -1;
    if (game.cSInt < 0) return -game.cSInt - 1;
    return game.cSInt <= 2 ? 19 + game.cSInt : -1;
  };
  let picking = false;
  let pickTarget = 0;
  const placementOverlay = createHudPlacementOverlay(app, runtime, screen, touch, button, img);
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
    track() { placementOverlay.track(lastTouch, picking, pickTarget, orderMark.hidden); },
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
          placementOverlay.setPickIcon(hdIcon);
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
      const layout = screen.hudLayout();
      const onMap = layout !== null && game.loopMode === 1 && !choosing;
      if (layout) {
        hud.style.setProperty("--hud-bar-top", `${layout.barTop}px`);
        hud.style.setProperty("--hud-safe-bottom", `${layout.safeBottom}px`);
        hud.style.setProperty("--hud-bottom", `${layout.bottomPanels}px`);
        app.style.setProperty("--hud-panels-bottom", `${layout.panelsBottom}px`);
      }
      // PauseMenu owns pause, help, and the game menu's still-screen transitions.
      const paused = pauseMenu.update(layout !== null, choosing);
      topBar.update(layout !== null || paused, layout !== null && !paused && !choosing, layout !== null && !paused && !choosing, layout !== null);
      const w = game.barMode;
      const building = onMap && screen.buildCardsOpen;
      const menu = onMap && screen.buildingMenuOpen;
      // The plain map (nothing open, at most villagers selected): build, commands, squads.
      const plain = onMap && (w === 0 || w === 1) && !picking && !menu;
      const group = plain && w === 1 ? groupIds() : [];
      if (!group.includes(viewing)) viewing = 0;
      const single = plain && w === 1 && game.selectedId > 0 && !!game.selectionFlags[4] && group.length < 2;
      const inspectedId = choosing ? candidate : picking ? pickTarget : viewing;
      const villager = single || inspectedId > 0;
      const showGroupRow = (!choosing && group.length > 1 && !viewing) || (choosing && candidate === 0 && chiefList.length > 0);
      const activeGroup = choosing ? chiefList : group;
      screen.villagerSheet = single || choosing;
      show(villagerBox, villager);
      show(groupRow, showGroupRow);
      show(pageDots, building || showGroupRow);
      // The panel the original draws for them (all rows, drawn privately): on a new villager and every
      // few seconds -- its own redraws are only the rows that changed. The fork keeps its inspected
      // villager (chief candidate / pick target / group member) in inspectedId; a lone villager is
      // the single selection. No stale snapshot is read anywhere: the old runtime.villagerPanel
      // field is gone, every panel here comes from villagerPanelOf.
      const shownId = inspectedId || (single ? game.selectedId : 0);
      if (shownId && (shownId !== viewedId || performance.now() - viewedAt > VIEW_REFRESH_MS)) {
        viewedId = shownId;
        viewedCells = villagerPanelOf(runtime, shownId);
        viewedAt = performance.now();
      }
      if (!shownId) viewedId = 0;
      if (villager) drawVillager(shownId, viewedCells); else villagerPanel.resetVillager();
      if (showGroupRow) drawGroup(activeGroup, choosing); else villagerPanel.resetGroup();
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
      if (building) buildListPanel.draw();
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
        if (!picking && !choosing) {
          touch.setTileTapHandler(aiming ? (tx, ty) => { touch.aim(tx, ty); return true; } : null);
        }
      }
      if (aiming) {
        const pos = screen.tileToCss(game.cameraColumn + game.cursorColumn, game.cameraRow + game.cursorRow);
        orderMark.style.left = `${pos.x}px`;
        orderMark.style.top = `${pos.y}px`;
        orderTick.style.left = `${pos.x + 36}px`;
        orderTick.style.top = `${pos.y - 28}px`;
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
      show(left, false);
      show(right, false);
      show(cancelBox, touch.boxing);
      show(cancel, !touch.boxing && ((w !== 0 && w !== 3) || picking));
      cancel.setAttribute("aria-label", w === 1 ? (isZh() ? "取消选择" : "Deselect") : (isZh() ? "取消" : "Cancel"));
    },
  };
}
