import assert from "node:assert/strict"; import { exerciseTrophyCabinet } from "./browser-smoke-trophies.mjs";

export async function exerciseHud(page) {
  const settings = page.locator("dialog.settings-dialog");
  await page.locator(".hud-menu-button").waitFor({ state: "visible", timeout: 30_000 });
  await page.locator(".hud-build-button").click();
  const firstBuilding = page.locator(".hud-sheet-list .hud-card").first();
  await firstBuilding.waitFor();
  await firstBuilding.click();
  await page.locator(".hud-ghost").waitFor({ state: "visible" });
  await page.locator(".hud-fab").click();
  await page.locator(".hud-sheet-list .hud-card").first().waitFor({ state: "visible" });
  await page.locator(".hud-sheet-list .hud-card").first().click();
  await page.locator('.hud-place[aria-disabled="false"]').click();
  await page.locator(".hud-ghost").waitFor({ state: "hidden" });

  await page.locator(".hud-count.people").click();
  const roster = page.locator("dialog.roster-dialog");
  await roster.waitFor({ state: "visible" });
  assert.ok(await roster.locator(".roster-card").count() > 0, "the villager roster must list villagers");
  await roster.locator(".roster-card").first().click();
  await page.locator(".hud-villager").waitFor({ state: "visible" });
  await page.locator(".hud-sheet-close").click();
  await page.locator(".hud-villager").waitFor({ state: "hidden" });

  await page.locator(".hud-cmd").click();
  await page.locator(".hud-cmd-item").nth(1).click();
  await page.locator(".hud-order").waitFor({ state: "visible" });
  const gameScreen = await page.locator("#app .screen").boundingBox();
  assert.ok(gameScreen, "the game map must be available for choosing an order target");
  await page.mouse.click(gameScreen.x + gameScreen.width * 0.6, gameScreen.y + gameScreen.height * 0.55);
  await page.locator(".hud-order-tick").click();
  await page.locator(".hud-order").waitFor({ state: "hidden" });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));

  await page.locator(".hud-menu-button").click();
  await page.locator(".hud-menu").waitFor({ state: "visible" });
  assert.equal(await page.locator(".hud-menu-item").count(), 7, "game menu exposes save, load, stats, trophies, settings, help, and quit"); await exerciseTrophyCabinet(page);
  await page.locator(".hud-menu-item").nth(4).click();
  await settings.waitFor({ state: "visible" });
  await settings.locator('.settings-tab[data-tab="saves"]').click();
  await settings.locator('[data-slot-save="1"]').click();
  assert.match(await settings.locator(".settings-save-status").innerText(), /Saved to Slot 1/);
  await settings.locator('[data-slot-load="1"]').click();
  await settings.waitFor({ state: "hidden" });
  await page.locator(".hud-menu-button").waitFor({ state: "visible" });
}
