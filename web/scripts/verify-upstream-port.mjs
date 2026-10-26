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
const [placement, commands] = [src("src/hud/PlacementOverlay.ts"), src("src/hud/RightThumbControls.ts")];
assert(placement.includes("hud-ghost"), "PlacementOverlay must render the placing ghost");
assert(placement.includes("placedKind"), "PlacementOverlay must map a site to its building kind for the ghost");
assert(hud.includes("orderMark") && hud.includes("orderTick"), "Hud must render the order-spot UI");
assert(hud.includes("sceneFromMap"), "Hud must close bars after a scripted scene from the map");
assert(commands.includes("is-cancel"), "RightThumbControls must mark a running (cancelling) command item");

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
assert(placement.includes("hud-action-icon") && placement.includes("jobIcon"), "PlacementOverlay must render the action/job icon");
assert(placement.includes("touchAction.icon"), "PlacementOverlay must read the action icon from RenderRuntime.touchAction");
const render = src("src/render/RenderRuntime.ts");
assert(render.includes("export const touchAction"), "RenderRuntime must export touchAction for the HUD");

const legacy = src("src/core/LegacyRuntimeState.ts");
assert(!legacy.includes("villagerPanel: {"), "LegacyRuntimeState must not keep the stale villagerPanel snapshot (only villagerPanelDraft)");
assert(!render.includes("rt.villagerPanel = rt.villagerPanelDraft"), "RenderRuntime must not copy the draft into a stale villagerPanel snapshot");
assert(wideView.includes('LegacyRuntimeState["villagerPanelDraft"]'), "villagerPanelOf must return the draft form");

const cssEntry = src("src/styles.css");
const css = [...cssEntry.matchAll(/^@import "\.\/styles\/([^\"]+)";/gm)]
  .map(([, file]) => src(`src/styles/${file}`))
  .join("");
assert(css.includes(".hud-action-icon"), "feature stylesheets must style the action icon");
assert(css.includes(".hud-ghost") && css.includes(".hud-order"), "feature stylesheets must style the ghost and order-spot UI");
assert(css.includes(".hud-cmd-item.is-cancel"), "feature stylesheets must draw the cancel mark (CSS, not upstream's PNGs)");
assert(css.includes(".hud-place.blocked"), "feature stylesheets must grey the placing tick when blocked");
assert(css.includes("top: 30px"), "feature stylesheets must move the build cost badge below the sheet's corner");

console.log("verify-upstream-port: ok");
