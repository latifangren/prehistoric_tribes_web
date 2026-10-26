// Verifies the upstream ports on branch harden/audit-fixes: features ported from
// BOMBWCC/Prehistoric_Tribes_Web 29e035f ("Sync from the port repository (7d55b15)")
// and 3b37af1 ("Sync from the port repository (ab81f96)")
// into this fork's Hud / TouchControls / WideScreen / WideView / StoryHud / styles.css.
// Run by scripts/test-all.mjs (npm test) alongside the other verify-*.mjs.
// This is a source-presence guard only: it proves the ported code is still wired in,
// not that the DOM interactions were exercised (those need a browser harness).
import { readFileSync } from "node:fs";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const hud = src("src/Hud.ts");
assert(hud.includes("hud-ghost"), "Hud must render the placing ghost");
assert(hud.includes("placedKind"), "Hud must map a site to its building kind for the ghost");
assert(hud.includes("hd/buildings/"), "Hud ghost must use the level-1 HD building picture");
assert(hud.includes("orderMark") && hud.includes("orderTick"), "Hud must render the order-spot UI");
assert(hud.includes("sceneFromMap"), "Hud must close bars after a scripted scene from the map");
assert(hud.includes("is-cancel"), "Hud must mark a running (cancelling) command item");

const touch = src("src/TouchControls.ts");
assert(touch.includes("grip"), "TouchControls must support the placing grip-drag");
assert(touch.includes("aim(tx: number, ty: number)"), "TouchControls must expose aim() for the order spot");
assert(touch.includes("code === 14 || code === 15"), "TouchControls command() must close the bar after dismiss / back-to-work");

const wide = src("src/WideScreen.ts");
assert(wide.includes("viewRect()") && wide.includes("centreTile()"), "WideScreen must expose viewRect()/centreTile()");

const wideView = src("src/render/WideView.ts");
assert(wideView.includes("g.cSInt !== 100"), "WideView must suppress the original preview while the ghost is shown");

const story = src("src/StoryHud.ts");
assert(story.includes("PRESS_GAP_TICKS") && !story.includes("pressedAt"), "StoryHud must gate double taps in game ticks, not wall time");
assert(hud.includes("SCENE_AFTER_TAP_TICKS") && hud.includes("lastTouchTick"), "Hud scene guard must count game ticks, not wall time");
assert(hud.includes("hud-action-icon") && hud.includes("jobIcon"), "Hud must render the action/job icon");
assert(hud.includes("touchAction.icon"), "Hud must read the action icon from RenderRuntime.touchAction");
const render = src("src/render/RenderRuntime.ts");
assert(render.includes("export const touchAction"), "RenderRuntime must export touchAction for the HUD");

const legacy = src("src/core/LegacyRuntimeState.ts");
assert(!legacy.includes("villagerPanel: {"), "LegacyRuntimeState must not keep the stale villagerPanel snapshot (only villagerPanelDraft)");
assert(!render.includes("rt.villagerPanel = rt.villagerPanelDraft"), "RenderRuntime must not copy the draft into a stale villagerPanel snapshot");
assert(wideView.includes('LegacyRuntimeState["villagerPanelDraft"]'), "villagerPanelOf must return the draft form");
assert(hud.includes("=== game.selectionGroup"), "Hud groupIds must match the current selection group exactly, not any stale mark");
assert(hud.includes("group.length < 2"), "Hud single panel must follow group.length < 2, not the stale snapshot");
assert(hud.includes("const shownId = inspectedId || (single ? game.selectedId : 0)"), "Hud must route every villager panel through the shownId refresh (inspected or single)");
assert(hud.includes("viewedId = shownId"), "Hud must refresh the panel immediately when the shown villager changes");

const css = src("src/styles.css");
assert(css.includes(".hud-action-icon"), "styles.css must style the action icon");
assert(css.includes(".hud-ghost") && css.includes(".hud-order"), "styles.css must style the ghost and order-spot UI");
assert(css.includes(".hud-cmd-item.is-cancel"), "styles.css must draw the cancel mark (CSS, not upstream's PNGs)");
assert(css.includes(".hud-place.blocked"), "styles.css must grey the placing tick when blocked");
assert(css.includes("top: 30px"), "styles.css must move the build cost badge below the sheet's corner");

console.log("verify-upstream-port: ok");
