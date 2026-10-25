import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { capitalise, originalText } from "./OriginalText";
import { sfx } from "./platform/SoundEffects";
import { ID_LANGUAGE, ZH_LANGUAGE } from "./text/LegacyZhText";
import type { TouchControls } from "./TouchControls";
import { stepAs } from "./ui/UiRuntime";
import type { WideScreen } from "./WideScreen";

const ART = "hd/menu/";
const LANGUAGE_KEY = "pt.language";
const MUSIC_KEY = "pt.music";
/** One row per language: the stored code, the art folder (flag-<art>.png, words/<art>/), and the
 *  original's language list row. Adding a language is a row here plus its pictures. */
const LANGUAGES = [
  { code: "en", art: "en", row: 0 },
  { code: "zh", art: "cn", row: ZH_LANGUAGE },
  { code: "id", art: "id", row: 0 },
] as const;
const LOADING_MS = 1500;
const MAPS = 5; // the custom maps, q 7..11 (the original's Q 9 list)
const CHAPTERS = 5; // the 5 campaign chapters on Q = 8 (Z = 0..4)
/** Each map card's picture and, until it has loaded, its main colour (the picture's average). */
const MAP_PICTURE = (index: number) => `${ART}maps/map-${index + 1}.webp`;
const MAP_COLOURS = ["#257479", "#938412", "#449415", "#449515", "#469514"];
// The original's /t records shown on the pages: the questions after NEW GAME, the locked custom game.
const LOSE_CAMPAIGN = 62;
const LOSE_SAVE = 64;
const PASS_TUTORIAL = 70;

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* not kept */ } };

export function currentLanguageCode(): "en" | "zh" | "id" {
  const code = read(LANGUAGE_KEY);
  if (code === "zh" || code === "id") return code;
  return "en";
}

/** The original's language list row of the saved language (English the first time). */
export function savedLanguage(): number {
  return (LANGUAGES.find((l) => l.code === read(LANGUAGE_KEY)) ?? LANGUAGES[0]).row;
}

export function savedMusic(): boolean {
  return read(MUSIC_KEY) === "on";
}

type Page = "splash" | "main" | "mode" | "question" | "locked" | "difficulty" | "chapters" | "maps" | "about" | "loading";

export function attachStartMenu(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
  openSettings?: () => void,
  openHelp?: () => void,
  openAchievements?: () => void,
): { update(): void; covers(): boolean } {
  const game = runtime.game;
  const layer = document.createElement("div");
  layer.className = "start-menu";
  app.append(layer);

  let page: Page | null = "splash";
  const history: Page[] = [];
  let custom = false;
  let difficulty: 1 | 2 = 1;
  let loadingStart = 0;

  const language = () => {
    const code = read(LANGUAGE_KEY);
    return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
  };
  const picture = (name: string, cls: string) => `<img class="${cls}" src="${ART}${name}" alt="" draggable="false">`;

  const button = (cls: string, label: string, html: string, onClick: () => void) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = cls;
    element.setAttribute("aria-label", label);
    element.innerHTML = html;
    element.addEventListener("click", () => {
      sfx.click();
      onClick();
    });
    return element;
  };
  const word = (key: string, onClick: () => void) =>
    button("start-item", key, picture(`words/${language().art}/${key}.png`, "start-word"), onClick);

  const go = (next: Page) => { if (page) history.push(page); show(next); };
  const back = () => show(history.pop() ?? "main");

  const hasSave = () => (custom ? game.actionWFlag : game.sByte > -1);
  /** f.aw()'s gate: a custom save, a passed tutorial (progress r) or f.af. */
  const unlocked = () => game.actionWFlag || game.progressR > 0 || game.numericAf;
  const unlockedChapters = () => (game.numericAf ? 4 : Math.max(0, Math.min(4, game.progressR)));

  const unlockAllProgress = () => {
    game.progressR = 4;
    game.progressV = 8;
    game.numericAf = true;
    runtime.saveOriginalResourceAction(0);
  };

  const choose = (isCustom: boolean) => {
    custom = isCustom;
    if (custom && !unlocked()) go("locked");
    else go(hasSave() ? "mode" : "difficulty");
  };
  const start = (resume: boolean, map = 0, chapter = 0) => {
    history.length = 0;
    touch.startGame({ custom, resume, difficulty, map, chapter });
    loadingStart = performance.now();
    show("loading");
    requestAnimationFrame(fill);
  };

  const toggleMusic = () => {
    // f.as() for the OPTIONS row MUSIC (Z = 1), with the menu cursor it reads set for it.
    const cursor = game.Z;
    game.Z = 1;
    stepAs(runtime);
    game.Z = cursor;
    write(MUSIC_KEY, game.eByte !== 0 ? "on" : "off");
    show(page!);
  };
  const nextLanguage = () => {
    const current = language();
    const next = LANGUAGES[(LANGUAGES.indexOf(current) + 1) % LANGUAGES.length];
    write(LANGUAGE_KEY, next.code);
    runtime.selectLanguage(next.row);
    runtime.loadLanguageResource(0);
    runtime.loadLanguageResource(1);
    game.H = true; // the original's own screens lay themselves out again in the new language
    show(page!);
  };

  const message = (record: number) => {
    const text = document.createElement("p");
    text.className = "start-text";
    text.textContent = capitalise(originalText(runtime, "t", record));
    return text;
  };
  const column = (...items: HTMLElement[]) => {
    const element = document.createElement("div");
    element.className = "start-column";
    element.append(...items);
    return element;
  };
  const mapCard = (index: number) => {
    const code = language().code;
    const badge = Array.from(String(index + 1), (c) => `<img src="hd/ui/digit-${c}.png" alt="">`).join("");
    const card = button("start-map", code === "zh" ? `地图 ${index + 1}` : code === "id" ? `Peta ${index + 1}` : `Map ${index + 1}`,
      `<img class="start-map-picture" src="${MAP_PICTURE(index)}" alt="" draggable="false"><span class="start-map-number">${badge}</span>`,
      () => start(false, index));
    const shot = card.querySelector<HTMLImageElement>(".start-map-picture")!;
    if (shot.complete && shot.naturalWidth > 0) shot.classList.add("loaded");
    else shot.addEventListener("load", () => shot.classList.add("loaded"), { once: true });
    return card;
  };
  for (let i = 0; i < MAPS; i += 1) new Image().src = MAP_PICTURE(i);

  const chapterName = (index: number): string => {
    const base151 = runtime.packedOffsets[151] ?? 0;
    const base152 = runtime.packedOffsets[152] ?? 0;
    const menuOffset = runtime.packedBytes[base152 + 8] ?? 0;
    const sRecord = runtime.packedBytes[base151 + menuOffset + index] ?? (25 + index);
    return capitalise(originalText(runtime, "s", sRecord));
  };

  function show(next: Page | null): void {
    page = next;
    layer.hidden = next === null;
    layer.dataset.page = next ?? "";
    if (next === null) return;
    const code = language().code;
    const zh = code === "zh";
    const id = code === "id";
    layer.replaceChildren();
    layer.insertAdjacentHTML("beforeend", picture(next === "splash" ? "bg-splash.jpg" : "bg-menu.jpg", "start-bg"));
    layer.insertAdjacentHTML("beforeend", picture("logo.png", "start-logo"));
    if (next === "splash") {
      layer.insertAdjacentHTML("beforeend", picture("chars.png", "start-chars"));
      return;
    }
    if (next === "loading") {
      layer.insertAdjacentHTML("beforeend",
        `<div class="start-loading">${picture("loading-empty.png", "")}<div class="start-loading-fill">${picture("loading-full.png", "")}</div></div>`);
      return;
    }

    if (next === "main") layer.append(column(word("campaign", () => choose(false)), word("custom", () => choose(true)), word("about", () => go("about"))));
    else if (next === "mode") layer.append(column(word("continue", () => start(true)), word("newgame", () => go("question"))));
    else if (next === "question") {
      layer.append(column(message(custom ? LOSE_SAVE : LOSE_CAMPAIGN), word("yes", () => go("difficulty")), word("no", back)));
    } else if (next === "locked") {
      const unlockBtn = button(
        "start-chapter-unlock",
        zh ? "解锁全部章节与自定义模式" : id ? "Buka Semua Bab & Mode Kustom" : "Unlock Custom Mode & All Chapters",
        zh ? "🔓 立即解锁自定义模式与全部章节" : id ? "🔓 Buka Semua Bab & Mode Kustom" : "🔓 Unlock Custom Mode & All Chapters",
        () => {
          unlockAllProgress();
          show("difficulty");
        },
      );
      layer.append(column(message(PASS_TUTORIAL), unlockBtn));
    } else if (next === "difficulty") {
      const pick = (level: 1 | 2) => () => {
        difficulty = level;
        if (custom) go("maps");
        else go("chapters");
      };
      layer.append(column(word("easy", pick(1)), word("hard", pick(2))));
    } else if (next === "chapters") {
      const maxCh = unlockedChapters();
      const wrap = document.createElement("div");
      wrap.className = "start-chapters";
      const head = document.createElement("div");
      head.textContent = zh ? "选择战役章节" : id ? "Pilih Bab Kampanye" : "Select Campaign Chapter";
      wrap.append(head);
      const list = document.createElement("div");
      list.className = "start-chapters-list";
      for (let i = 0; i < CHAPTERS; i += 1) {
        const isUnlocked = i <= maxCh;
        const title = chapterName(i);
        const item = button(
          `start-chapter-btn${isUnlocked ? "" : " locked"}`,
          `${zh ? `第 ${i + 1} 章` : id ? `Bab ${i + 1}` : `Chapter ${i + 1}`}: ${title}`,
          `<span class="ch-num">${i + 1}</span><span class="ch-name">${title}</span><span class="ch-tag">${isUnlocked ? (zh ? "进入 ▶" : id ? "Mulai ▶" : "Play ▶") : "🔒"}</span>`,
          () => {
            if (!isUnlocked) return;
            start(false, 0, i);
          },
        );
        if (!isUnlocked) (item as HTMLButtonElement).disabled = true;
        list.append(item);
      }
      wrap.append(list);
      if (maxCh < CHAPTERS - 1) {
        const unlockBtn = button(
          "start-chapter-unlock",
          zh ? "解锁全部章节" : id ? "Buka Semua Bab" : "Unlock All Chapters",
          zh ? "🔓 解锁全部 5 个战役章节" : id ? "🔓 Buka Semua 5 Bab Kampanye" : "🔓 Unlock All 5 Campaign Chapters",
          () => {
            unlockAllProgress();
            show("chapters");
          },
        );
        wrap.append(unlockBtn);
      }
      layer.append(wrap);
    } else if (next === "maps") {
      const list = document.createElement("div");
      list.className = "start-maps";
      for (let i = 0; i < MAPS; i += 1) list.append(mapCard(i));
      layer.append(list);
    } else if (next === "about") {
      const rawAbout = originalText(runtime, "t", 71 + 233)
        .replace(/\u001f/g, "1.0.5 (Web HD)")
        .replace(/~/g, "©");
      const paragraphs = rawAbout
        .split("&&")
        .map((block) => block.split("&").map((line) => capitalise(line.trim())).filter(Boolean).join("<br>"))
        .filter(Boolean);
      const remakeNote = zh
        ? "网页高清重制版：1:1 还原原版 J2ME 游戏逻辑与关卡，重绘全套高清美术，新增单手触屏界面与简体中文支持。"
        : id
        ? "Remake Web HD: Port setia 1:1 dari simulasi & kampanye J2ME orisinal, grafis seni HD yang digambar ulang, kontrol sentuh satu tangan, dan dukungan Bahasa Indonesia."
        : "Web HD Remake: 1:1 faithful port of the original J2ME simulation and campaign, featuring remastered HD artwork, one-handed touch controls, and multilingual support.";
      const aboutWrap = document.createElement("div");
      aboutWrap.className = "start-about";
      aboutWrap.innerHTML = `
        ${picture(`words/${language().art}/about.png`, "start-word start-about-title")}
        <div class="start-about-card">
          <p class="start-about-highlight">${remakeNote}</p>
          ${paragraphs.map((p) => `<p>${p}</p>`).join("")}
        </div>`;
      layer.append(aboutWrap);
    }

    const corner = document.createElement("div");
    corner.className = "start-corner";
    if (openAchievements) {
      corner.append(
        button(
          "start-round start-util start-trophy-btn",
          zh ? "成就勋章与荣誉陈列室" : "Tribe Achievements & Trophy Cabinet",
          `<span class="start-util-trophy">🏆</span>`,
          openAchievements,
        ),
      );
    }
    if (openHelp) {
      corner.append(
        button(
          "start-round start-util",
          zh ? "部落百科与帮助" : "Tribe Guide & Help",
          `<img src="hd/ui/glyph-help.png" alt="" draggable="false">`,
          openHelp,
        ),
      );
    }
    if (openSettings) {
      corner.append(
        button(
          "start-round start-util",
          zh ? "设置与多槽位存档" : "Settings & Save Slots",
          `<img src="hd/ui/glyph-settings.png" alt="" draggable="false">`,
          openSettings,
        ),
      );
    }
    corner.append(
      button("start-round", zh ? "语言" : id ? "Bahasa" : "Language", picture(`flag-${language().art}.png`, ""), nextLanguage),
      button("start-round", game.eByte !== 0 ? (zh ? "声音：开" : id ? "Suara: Aktif" : "Sound: On") : (zh ? "声音：关" : id ? "Suara: Senyap" : "Sound: Off"), picture(game.eByte !== 0 ? "sound-on.png" : "sound-off.png", ""), toggleMusic),
    );
    layer.append(corner);
    if (next !== "main") layer.append(button("start-back", zh ? "返回" : id ? "Kembali" : "Back", picture("back.png", ""), back));
  }

  /** The loading bar: fills over LOADING_MS, waits short of the end until the game is on. */
  function fill(): void {
    if (page !== "loading") return;
    const ready = !touch.busy;
    const part = Math.min((performance.now() - loadingStart) / LOADING_MS, ready ? 1 : 0.9);
    const bar = layer.querySelector<HTMLElement>(".start-loading-fill");
    if (bar) bar.style.width = `${part * 100}%`;
    if (part >= 1) show(null);
    else requestAnimationFrame(fill);
  }

  /** Called every frame: the menu comes back whenever the original is on its main menu. */
  function update(): void {
    if (game.loopMode !== 1 && !screen.frozen && !touch.busy) {
      if (game.screen === 12 && openSettings) {
        game.screen = 0;
        game.H = true;
        show("main");
        openSettings();
        return;
      }
      if (game.screen === 15 && game.mByte === 0 && openHelp) {
        game.screen = 0;
        game.H = true;
        show("main");
        openHelp();
        return;
      }
      if (game.screen === 15 && game.mByte === 1) {
        game.screen = 0;
        game.H = true;
        show("about");
        return;
      }
    }
    const mainMenu = game.loopMode !== 1 && game.screen === 0 && !screen.frozen;
    if (page === "loading") return;
    if (page !== null && page !== "splash" && touch.busy) {
      loadingStart = performance.now();
      show("loading");
      requestAnimationFrame(fill);
      return;
    }
    if (page === null) { if (mainMenu && !touch.busy) show("main"); return; }
    if (page === "splash") { if (mainMenu) show("main"); else if (game.loopMode === 1) show(null); return; }
    if (!mainMenu) show(null); // the keyboard took the original's own menus elsewhere
  }

  show("splash");
  return { update, covers: () => page !== null };
}
