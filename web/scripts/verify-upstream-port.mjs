// Verifies the upstream port on branch harden/audit-fixes: features ported from
// BOMBWCC/Prehistoric_Tribes_Web 29e035f ("Sync from the port repository (7d55b15)")
// into this fork's Hud / TouchControls / WideScreen / WideView / styles.css.
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

const css = src("src/styles.css");
assert(css.includes(".hud-ghost") && css.includes(".hud-order"), "styles.css must style the ghost and order-spot UI");
assert(css.includes(".hud-cmd-item.is-cancel"), "styles.css must draw the cancel mark (CSS, not upstream's PNGs)");
assert(css.includes(".hud-place.blocked"), "styles.css must grey the placing tick when blocked");
assert(css.includes("top: 30px"), "styles.css must move the build cost badge below the sheet's corner");

console.log("verify-upstream-port: ok");
