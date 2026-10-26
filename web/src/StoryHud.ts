import { readStorage } from "./platform/Storage";
import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { OriginalKey } from "./platform/Input";
import { sfx } from "./platform/SoundEffects";
import { ID_LANGUAGE, ZH_LANGUAGE } from "./text/LegacyZhText";
import { capitalise, originalText } from "./OriginalText";
import { escapeHtml } from "./platform/Html";
import type { TouchControls } from "./TouchControls";
import type { WideScreen } from "./WideScreen";

/**
 * The story pictures and the dialogue (round 4, user 2026-10-22; design: canvas artboard
 * "剧情与对话", art: docs/hd-art-handoff.md §7). Not in the original: pages over its own screens,
 * showing what it shows in HD and an ordinary font; the original still runs the scenes.
 *
 * - Story (Q 18): the HD picture of the /pi8 entry the original chose fills the screen; below it a
 *   small box with the chapter title on its top edge, the text cut into paragraphs (no scrolling),
 *   dots for the paragraphs, ✓ at the bottom right: the next paragraph, after the last one the
 *   original's FIRE (its next picture).
 * - Dialogue (Q 17, and Q 20: a villager speaking, e.g. "nothing to do here"): the map's animation (WideScreen.dialogue); a box at the bottom with the
 *   speaker's HD face, name and words, ✓ the same way. Shown while the original shows a text (its
 *   f.a(BII) composed the current step's record: resourceSectionW == vInt); steps without one run
 *   on by themselves, as there.
 * A tap anywhere on the page does what ✓ does (one hand).
 */

const ART = "hd/story/";
// Characters per paragraph, so that one fits the box (about 4 lines of the box's width).
const STORY_LETTERS = { latin: 120, cjk: 54 };
const DIALOGUE_LETTERS = { latin: 96, cjk: 42 };

/** The text cut at sentence ends into paragraphs of at most `limit` characters (a longer sentence
 *  stays whole and the box grows; a fragment under a third of it, "it...", runs on). */
function paragraphs(text: string, limit: number): string[] {
  const sentences = text.match(/[^.!?。！？]+(?:[.!?。！？]+\s*|$)/g) ?? [text];
  const out: string[] = [];
  for (const sentence of sentences) {
    const last = out.length - 1;
    const room = last >= 0 && (out[last]!.trim().length < limit / 3 || (out[last] + sentence).trim().length <= limit);
    if (room) out[last] += sentence;
    else out.push(sentence);
  }
  return out.map((p) => p.trim()).filter(Boolean);
}

export function attachStoryHud(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
): { update(): void; covers(): boolean } {
  const game = runtime.game;
  const layer = document.createElement("div");
  layer.className = "story-hud";
  layer.hidden = true;
  app.append(layer);

  let shown = ""; // what the layer was last built for
  let parts: string[] = [];
  let part = 0;
  // When FIRE was sent (in game ticks, ported from upstream BOMBWCC 3b37af1): taps right after
  // it are dropped, so a double tap cannot skip a text (the original may also ignore a press in
  // a new text's first ticks; a later tap sends it again). Counted in ticks, not wall time, so
  // the same taps give the same game however fast it runs.
  let ticks = 0;
  let pressedTick = -Infinity;
  const PRESS_GAP_TICKS = 5; // about 0.6 s

  const next = () => {
    if (ticks - pressedTick < PRESS_GAP_TICKS) return;
    sfx.click();
    if (part < parts.length - 1) {
      part += 1;
      build();
      return;
    }
    pressedTick = ticks;
    touch.pressKey(OriginalKey.FIRE);
  };
  layer.addEventListener("click", next);

  const text = (cls: string, value: string) => {
    const element = document.createElement("div");
    element.className = cls;
    element.textContent = value;
    return element;
  };

  function buildOutcome(): void {
    const won = game.vInt === 57;
    sfx.outcome(won);
    const zh = runtime.language === ZH_LANGUAGE;
    const isId = readStorage("pt.language") === "id";
    const title = capitalise(originalText(runtime, "s", game.vInt || (won ? 57 : 56)));
    const subtitle = won
      ? (zh ? "你的部落取得了辉煌胜利！" : isId ? "Sukumu meraih kemenangan gemilang!" : "Your tribe has triumphed!")
      : (zh ? "你的部落没能挺过这一关……" : isId ? "Sukumu tumbang di babak ini..." : "Your tribe has fallen...");
    layer.innerHTML = `<img class="story-picture" src="hd/menu/bg-menu.jpg" alt="">`;
    const card = document.createElement("div");
    card.className = `story-outcome-card ${won ? "win" : "lose"}`;
    card.innerHTML = `
      <div class="story-outcome-badge">
        <img src="hd/ui/${won ? "pt-chief" : "demolish"}.png" alt="">
      </div>
      <h2 class="story-outcome-title">${escapeHtml(title)}</h2>
      <p class="story-outcome-sub">${escapeHtml(subtitle)}</p>
      <img class="story-tick" src="hd/ui/btn-tick.png" alt="">
    `;
    layer.append(card);
  }

  function buildStats(): void {
    const zh = runtime.language === ZH_LANGUAGE;
    const rawLabels = originalText(runtime, "t", 71 + 234)
      .split("&")
      .map((s: string) => s.replace(/[\u0000-\u001f]/g, "").trim())
      .filter(Boolean);
    const statIndices = [19, 20, 21, 22, 23, 24];
    const p0 = runtime.mainArrays.aShort[0];
    const p1 = runtime.mainArrays.aShort[1];
    const rowsHtml = statIndices.map((z, idx) => {
      const label = capitalise(rawLabels[idx] ?? `Stat ${idx + 1}`);
      const v0 = z === 24 ? (p0?.[z] ?? 0) * 10 : (p0?.[z] ?? 0);
      const v1 = z === 24 ? (p1?.[z] ?? 0) * 10 : (p1?.[z] ?? 0);
      const isTotal = idx === statIndices.length - 1;
      return `<div class="story-stat-row${isTotal ? " total" : ""}">
        <span class="val player">${v0}</span>
        <span class="lbl">${escapeHtml(label)}</span>
        <span class="val enemy">${v1}</span>
      </div>`;
    }).join("");
    layer.innerHTML = `<img class="story-picture" src="hd/menu/bg-menu.jpg" alt="">`;
    const card = document.createElement("div");
    card.className = "story-stats-card";
    card.innerHTML = `
      <div class="story-title">${zh ? "战果统计" : "Statistics"}</div>
      <div class="story-stat-head">
        <span class="player"><img src="hd/ui/pt-chief.png" alt=""> ${zh ? "我方部落" : "Your Tribe"}</span>
        <span class="enemy">${zh ? "敌方部落" : "Enemy"} <img src="hd/ui/club.png" alt=""></span>
      </div>
      <div class="story-stat-list">${rowsHtml}</div>
      <img class="story-tick" src="hd/ui/btn-tick.png" alt="">
    `;
    layer.append(card);
  }

  function build(): void {
    if (layer.dataset.kind === "outcome") { buildOutcome(); return; }
    if (layer.dataset.kind === "stats") { buildStats(); return; }
    const story = game.screen === 18;
    const box = document.createElement("div");
    box.className = "story-box";
    if (story) {
      box.append(text("story-text", parts[part] ?? ""));
      const dots = document.createElement("div");
      dots.className = "story-dots";
      dots.innerHTML = parts.length > 1 ? parts.map((_, i) => `<span${i === part ? ' class="on"' : ""}></span>`).join("") : "";
      box.append(dots, text("story-title", originalText(runtime, "s", game.zlDShorts[62] ?? 0)));
    } else {
      const face = `${720 + (game.zlDShorts[58] ?? 0)}`.padStart(4, "0");
      box.insertAdjacentHTML("beforeend", `<img class="story-face" src="${ART}faces/face-${face}.png" alt="">`);
      box.append(text("story-name", originalText(runtime, "s", game.zlDShorts[57] ?? 0)), text("story-text", parts[part] ?? ""));
    }
    box.insertAdjacentHTML("beforeend", '<img class="story-tick" src="hd/ui/btn-tick.png" alt="">');
    const picture = story ? `<img class="story-picture" src="${ART}story-${String(runtime.shownPicture).padStart(2, "0")}.jpg" alt="">` : "";
    layer.innerHTML = picture;
    layer.append(box);
  }

  function update(): void {
    ticks += 1;
    const offMap = game.loopMode !== 1 && !screen.frozen;
    const story = offMap && game.screen === 18;
    const talking = offMap && (game.screen === 17 || game.screen === 20) && game.resourceSectionW === game.vInt;
    const outcome = offMap && game.screen === 24;
    const stats = offMap && game.screen === 15 && game.mByte === 2;
    layer.hidden = !story && !talking && !outcome && !stats;
    layer.dataset.kind = story ? "story" : outcome ? "outcome" : stats ? "stats" : "dialogue";
    if (layer.hidden) { shown = ""; return; }
    const record = game.resourceSectionW === game.vInt ? runtime.shownTextRecord : -1;
    const key = `${game.screen}:${game.mByte}:${game.vInt}:${record}:${runtime.shownPicture}:${runtime.language}`;
    if (key === shown) return;
    shown = key;
    if (outcome || stats) {
      parts = [""];
      part = 0;
      build();
      return;
    }
    const letters = story ? STORY_LETTERS : DIALOGUE_LETTERS;
    const words = record >= 0 ? originalText(runtime, "t", record) : "";
    parts = paragraphs(words, runtime.language === ZH_LANGUAGE ? letters.cjk : letters.latin);
    part = 0;
    build();
  }

  // The story, outcome, and stats pages hide the original's screen; the dialogue box leaves its frame showing.
  return { update, covers: () => !layer.hidden && layer.dataset.kind !== "dialogue" };
}
